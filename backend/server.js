require('dotenv').config()
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const multer = require('multer'); // เพิ่ม multer เพื่ออ่าน FormData
const db = require('./db');

const DB_SCHEMA = process.env.DB_NAME || 'tourism_nonthaburi'

const app = express();
const upload = multer();

function fileBufferToDataUrl(file) {
  if (!file?.buffer) return null
  const mime = file.mimetype || 'image/jpeg'
  return `data:${mime};base64,${file.buffer.toString('base64')}`
}

const corsOrigin = process.env.CORS_ORIGIN
app.use(cors(corsOrigin ? { origin: corsOrigin.split(',').map((s) => s.trim()) } : {}))
// เพิ่ม limit รองรับ Data URL รูปภาพจากหน้าแอดมิน
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// เช็คว่าคอลัมน์มีอยู่ในตารางหรือไม่ (กัน DB schema แตกต่างกัน)
const columnExistsCache = new Map()
async function columnExists(tableName, columnName) {
  const key = `${tableName}.${columnName}`
  if (columnExistsCache.has(key)) {
    return columnExistsCache.get(key)
  }
  const sql = `
    SELECT COUNT(*) as cnt
    FROM information_schema.columns
    WHERE table_schema = ?
      AND table_name = ?
      AND column_name = ?
  `
  const [rows] = await db.promise().query(sql, [DB_SCHEMA, tableName, columnName])
  const exists = (rows[0]?.cnt || 0) > 0
  columnExistsCache.set(key, exists)
  return exists
}

let placeViewTableReady = false
async function ensurePlaceViewTable() {
  if (placeViewTableReady) return true
  try {
    await db.promise().query(`
      CREATE TABLE IF NOT EXISTS place_view (
        view_id INT AUTO_INCREMENT PRIMARY KEY,
        place_id INT NOT NULL,
        viewed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_place_view_place (place_id),
        INDEX idx_place_view_date (place_id, viewed_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `)
    placeViewTableReady = true
    return true
  } catch (error) {
    console.error('ensurePlaceViewTable error:', error)
    return false
  }
}

async function getPlaceViewStats(placeIds) {
  const empty = {
    total_views: 0,
    views_this_month: 0,
    views_last_month: 0,
    views_change_percent: 0,
  }
  if (!Array.isArray(placeIds) || placeIds.length === 0) return empty

  const ready = await ensurePlaceViewTable()
  if (!ready) return empty

  const inClause = placeIds.map(() => '?').join(', ')
  const [rows] = await db.promise().query(
    `
    SELECT
      COUNT(*) AS total_views,
      SUM(CASE WHEN viewed_at >= DATE_FORMAT(CURDATE(), '%Y-%m-01') THEN 1 ELSE 0 END) AS views_this_month,
      SUM(
        CASE
          WHEN viewed_at >= DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 1 MONTH), '%Y-%m-01')
           AND viewed_at < DATE_FORMAT(CURDATE(), '%Y-%m-01')
          THEN 1 ELSE 0
        END
      ) AS views_last_month
    FROM place_view
    WHERE place_id IN (${inClause})
    `,
    placeIds
  )

  const totalViews = Number(rows[0]?.total_views || 0)
  const viewsThisMonth = Number(rows[0]?.views_this_month || 0)
  const viewsLastMonth = Number(rows[0]?.views_last_month || 0)
  let viewsChangePercent = 0
  if (viewsLastMonth > 0) {
    viewsChangePercent = Math.round(((viewsThisMonth - viewsLastMonth) / viewsLastMonth) * 100)
  } else if (viewsThisMonth > 0) {
    viewsChangePercent = 100
  }

  return {
    total_views: totalViews,
    views_this_month: viewsThisMonth,
    views_last_month: viewsLastMonth,
    views_change_percent: viewsChangePercent,
  }
}

async function getPrimaryKeyColumns(tableName) {
  const [rows] = await db.promise().query(
    `SELECT COLUMN_NAME FROM information_schema.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND CONSTRAINT_NAME = 'PRIMARY'
     ORDER BY ORDINAL_POSITION`,
    [DB_SCHEMA, tableName]
  )
  return rows.map((r) => r.COLUMN_NAME)
}

async function getForeignKeyNames(tableName) {
  const [rows] = await db.promise().query(
    `SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND CONSTRAINT_TYPE = 'FOREIGN KEY'`,
    [DB_SCHEMA, tableName]
  )
  return rows.map((r) => r.CONSTRAINT_NAME)
}

/** เปลี่ยน PK จาก (recommend_id, place_id) → (recommend_id, sequence_order) เพื่อให้สถานที่เดียวกันซ้ำในทริปได้ */
async function ensureRecommendTripDetailPrimaryKeyFix() {
  try {
    const pk = await getPrimaryKeyColumns('recommend_trip_detail')
    if (pk.length === 2 && pk[0] === 'recommend_id' && pk[1] === 'sequence_order') {
      return
    }
    if (pk.length !== 2 || pk[0] !== 'recommend_id' || pk[1] !== 'place_id') {
      console.warn(
        'recommend_trip_detail: ข้าม migration PK — พบ PRIMARY KEY เป็น:',
        pk.join(', ')
      )
      return
    }

    const [ids] = await db.promise().query(
      `SELECT DISTINCT recommend_id FROM recommend_trip_detail`
    )
    for (const { recommend_id } of ids) {
      const [rows] = await db.promise().query(
        `SELECT place_id FROM recommend_trip_detail WHERE recommend_id = ? ORDER BY COALESCE(sequence_order, 999999), place_id ASC`,
        [recommend_id]
      )
      let s = 1
      for (const { place_id } of rows) {
        await db.promise().query(
          `UPDATE recommend_trip_detail SET sequence_order = ? WHERE recommend_id = ? AND place_id = ?`,
          [s, recommend_id, place_id]
        )
        s += 1
      }
    }

    const fks = await getForeignKeyNames('recommend_trip_detail')
    for (const name of fks) {
      await db.promise().query(
        `ALTER TABLE recommend_trip_detail DROP FOREIGN KEY \`${name}\``
      )
    }

    await db.promise().query(`ALTER TABLE recommend_trip_detail DROP PRIMARY KEY`)

    await db.promise().query(
      `ALTER TABLE recommend_trip_detail MODIFY COLUMN sequence_order INT NOT NULL`
    )

    await db.promise().query(
      `ALTER TABLE recommend_trip_detail ADD PRIMARY KEY (recommend_id, sequence_order)`
    )

    await db.promise().query(`
      ALTER TABLE recommend_trip_detail
      ADD CONSTRAINT fk_rec_trip_detail_trip FOREIGN KEY (recommend_id) REFERENCES recommend_trip(recommend_id) ON DELETE CASCADE
    `)
    await db.promise().query(`
      ALTER TABLE recommend_trip_detail
      ADD CONSTRAINT fk_rec_trip_detail_place FOREIGN KEY (place_id) REFERENCES place(place_id) ON DELETE CASCADE
    `)

    console.log('recommend_trip_detail: อัปเดต PRIMARY KEY เป็น (recommend_id, sequence_order) แล้ว')
  } catch (e) {
    console.error('ensureRecommendTripDetailPrimaryKeyFix:', e)
  }
}

// ตาม schema ที่ขยายจาก tourism_nonthaburi: รายละเอียดแต่ละวัน/แต่ละแถวใน recommend_trip_detail
async function ensureRecommendTripDetailColumns() {
  try {
    if (!(await columnExists('recommend_trip_detail', 'day_index'))) {
      await db.promise().query(
        `ALTER TABLE recommend_trip_detail ADD COLUMN day_index INT NOT NULL DEFAULT 1`
      )
    }
    if (!(await columnExists('recommend_trip_detail', 'description'))) {
      await db.promise().query(
        `ALTER TABLE recommend_trip_detail ADD COLUMN description TEXT NULL`
      )
    }
    if (!(await columnExists('recommend_trip_detail', 'day_title'))) {
      await db.promise().query(
        `ALTER TABLE recommend_trip_detail ADD COLUMN day_title VARCHAR(255) NULL`
      )
    }
  } catch (e) {
    console.error('ensureRecommendTripDetailColumns:', e)
  }
}

/** เผยแพร่ / ฉบับร่าง สำหรับแผนแนะนำ (ปุ่มดวงตาในแอดมิน) */
async function ensureRecommendTripStatusColumn() {
  try {
    if (await columnExists('recommend_trip', 'status')) {
      return
    }
    await db.promise().query(
      `ALTER TABLE recommend_trip ADD COLUMN status ENUM('draft','published') NULL DEFAULT 'draft'`
    )
    await db.promise().query(
      `UPDATE recommend_trip SET status = 'published' WHERE status IS NULL`
    )
    await db.promise().query(
      `ALTER TABLE recommend_trip MODIFY COLUMN status ENUM('draft','published') NOT NULL DEFAULT 'draft'`
    )
    console.log('recommend_trip: เพิ่มคอลัมน์ status (draft/published) แล้ว')
  } catch (e) {
    console.error('ensureRecommendTripStatusColumn:', e)
  }
}

/** หมวดหมู่บนหน้าเว็บ (ค่าเดียวกับ tripCategories[].id ฝั่ง frontend) */
async function ensureRecommendTripCategoryColumn() {
  try {
    if (await columnExists('recommend_trip', 'trip_category')) {
      return
    }
    await db.promise().query(
      `ALTER TABLE recommend_trip ADD COLUMN trip_category VARCHAR(50) NULL DEFAULT NULL`
    )
    console.log('recommend_trip: เพิ่มคอลัมน์ trip_category แล้ว')
  } catch (e) {
    console.error('ensureRecommendTripCategoryColumn:', e)
  }
}

/** รองรับทริปผู้ใช้ (tripplan/tripplan_detail) */
async function ensureTripPlanColumns() {
  try {
    if (!(await columnExists('tripplan', 'trip_name'))) {
      await db.promise().query(
        `ALTER TABLE tripplan ADD COLUMN trip_name VARCHAR(255) NULL DEFAULT NULL`
      )
    }
    if (!(await columnExists('tripplan', 'transport'))) {
      await db.promise().query(
        `ALTER TABLE tripplan ADD COLUMN transport VARCHAR(50) NULL DEFAULT NULL`
      )
    }
  } catch (e) {
    console.error('ensureTripPlanColumns:', e)
  }
}

function normalizeTripStatus(raw) {
  if (raw === 'published' || raw === 'draft') return raw
  return 'draft'
}

/** ค่า id หมวด — ตรงกับ TRIP_CATEGORIES ใน frontend/src/lib/trip-categories.js */
const TRIP_CATEGORY_ID_TO_LABEL = {
  'pak-kret': 'เที่ยวปากเกร็ด',
  temple: 'สายมู',
  dhamma: 'สายธรรมะ',
  community: 'วิถีชุมชน',
  cafe: 'คาเฟ่น่านั่ง',
  nature: 'ธรรมชาติ',
  shopping: 'ช้อปปิ้ง',
  activities: 'กิจกรรมสนุก',
}

const TRIP_CATEGORY_LABEL_TO_ID = Object.fromEntries(
  Object.entries(TRIP_CATEGORY_ID_TO_LABEL).map(([id, label]) => [label, id])
)

function normalizeTripCategory(raw) {
  const s = String(raw ?? '').trim()
  if (!s) return null
  if (Object.prototype.hasOwnProperty.call(TRIP_CATEGORY_ID_TO_LABEL, s)) return s
  if (TRIP_CATEGORY_LABEL_TO_ID[s]) return TRIP_CATEGORY_LABEL_TO_ID[s]
  return null
}

function buildItineraryFromDetailRows(details, hasDayIndex) {
  if (!details || details.length === 0) {
    return [{ day: 1, title: '', description: '', places: [] }]
  }
  if (!hasDayIndex) {
    return [
      {
        day: 1,
        title: '',
        description: '',
        places: details.map((d) => d.place_name).filter(Boolean),
      },
    ]
  }
  const map = new Map()
  for (const row of details) {
    const di = row.day_index != null ? Number(row.day_index) : 1
    if (!map.has(di)) {
      map.set(di, {
        day: di,
        title: (row.day_title || '').trim(),
        description: (row.description != null ? String(row.description) : '').trim(),
        places: [],
      })
    }
    const entry = map.get(di)
    if (row.place_name) {
      entry.places.push(row.place_name)
    }
    if (!entry.title && row.day_title) {
      entry.title = (row.day_title || '').trim()
    }
    if (!entry.description && row.description != null) {
      entry.description = String(row.description).trim()
    }
  }
  return [...map.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, v], i) => ({
      day: i + 1,
      title: v.title,
      description: v.description,
      places: v.places,
    }))
}

function buildPublicTripPayload(t, details, hasDayIdx, coverUrl) {
  const itinerary = buildItineraryFromDetailRows(details, hasDayIdx)
  const flatPlaces = details.map((d) => d.place_name).filter(Boolean)
  const uniqueDayCount = hasDayIdx
    ? new Set(details.map((d) => Number(d.day_index != null ? d.day_index : 1))).size
    : 1
  const stops = flatPlaces.length
  let durationLabel = 'แผนแนะนำ'
  if (uniqueDayCount > 1) durationLabel = `${uniqueDayCount} วัน`
  else if (stops >= 5) durationLabel = '6-8 ชั่วโมง'
  else if (stops >= 3) durationLabel = '4-6 ชั่วโมง'
  else if (stops >= 1) durationLabel = 'ครึ่งวัน – 1 วัน'

  return {
    recommend_id: t.recommend_id,
    trip_name: t.trip_name,
    description: t.description,
    trip_category:
      normalizeTripCategory(t.trip_category) ||
      (t.trip_category != null ? String(t.trip_category).trim() : null),
    cover_image_url: coverUrl || null,
    stops,
    duration_label: durationLabel,
    highlights: flatPlaces.slice(0, 6),
    itinerary,
  }
}

const MAX_PLACES_PER_DAY = 5

async function insertRecommendTripDetails(recommendId, itinerary) {
  const hasDayIdx = await columnExists('recommend_trip_detail', 'day_index')
  const hasDesc = await columnExists('recommend_trip_detail', 'description')
  const hasDayTitle = await columnExists('recommend_trip_detail', 'day_title')

  let seq = 1
  let dayIdx = 1
  for (const day of itinerary || []) {
    const dayTitle = (day.title || '').trim() || null
    const dayDesc =
      day.description != null && String(day.description).trim() !== ''
        ? String(day.description).trim()
        : null
    const placeNames = (day.places || [])
      .map((n) => (n || '').trim())
      .filter(Boolean)

    if (placeNames.length > MAX_PLACES_PER_DAY) {
      const err = new Error(
        `วันละไม่เกิน ${MAX_PLACES_PER_DAY} สถานที่ (day trip)`
      )
      err.statusCode = 400
      throw err
    }

    for (const name of placeNames) {
      const [rows] = await db.promise().query(
        `SELECT place_id FROM place WHERE place_name = ? LIMIT 1`,
        [name]
      )
      if (rows.length === 0) continue

      const cols = ['recommend_id', 'place_id', 'sequence_order']
      const vals = [recommendId, rows[0].place_id, seq]
      if (hasDayIdx) {
        cols.push('day_index')
        vals.push(dayIdx)
      }
      if (hasDayTitle) {
        cols.push('day_title')
        vals.push(dayTitle)
      }
      if (hasDesc) {
        cols.push('description')
        vals.push(dayDesc)
      }

      const ph = cols.map(() => '?').join(', ')
      await db.promise().query(
        `INSERT INTO recommend_trip_detail (${cols.join(', ')}) VALUES (${ph})`,
        vals
      )
      seq += 1
    }
    dayIdx += 1
  }
}

// รองรับรูปปกแผนการเดินทาง (recommend_trip) ในตาราง image
async function ensureImageRecommendColumn() {
  try {
    const exists = await columnExists('image', 'recommend_id')
    if (!exists) {
      await db.promise().query(
        `ALTER TABLE image ADD COLUMN recommend_id INT NULL DEFAULT NULL`
      )
      await db.promise().query(
        `CREATE INDEX idx_image_recommend_id ON image (recommend_id)`
      ).catch(() => {})
    }
  } catch (e) {
    console.error('ensureImageRecommendColumn:', e)
  }
}

/** บันทึก/อัปเดตรูปปกทริปในตาราง image โดยผูก recommend_id
 *  coverImageUrl === undefined → ไม่แตะรูปเดิม (ใช้ตอน PUT ไม่ได้ส่งฟิลด์มา)
 *  coverImageUrl เป็น '' → ลบรูปปกออก
 */
async function upsertTripCoverImage(recommendId, coverImageUrl) {
  if (coverImageUrl === undefined) {
    return
  }
  await db.promise().query(`DELETE FROM image WHERE recommend_id = ?`, [recommendId])
  if (!coverImageUrl || typeof coverImageUrl !== 'string' || coverImageUrl.trim() === '') {
    return
  }
  const insert = async () => {
    await db.promise().query(
      `INSERT INTO image (image_url, image_type, place_id, entrepreneur_id, recommend_id) VALUES (?, 'trip', NULL, NULL, ?)`,
      [coverImageUrl, recommendId]
    )
  }
  try {
    await insert()
  } catch (err) {
    // ถ้า place_id / entrepreneur_id เป็น NOT NULL ให้ปรับเป็น NULL ได้
    if (err.code === 'ER_BAD_NULL_ERROR' || err.errno === 1048) {
      try {
        await db.promise().query(`ALTER TABLE image MODIFY COLUMN place_id INT NULL`)
        await db.promise().query(`ALTER TABLE image MODIFY COLUMN entrepreneur_id INT NULL`)
      } catch (alterErr) {
        console.error('ALTER image for trip cover:', alterErr)
      }
      await insert()
    } else {
      throw err
    }
  }
}

// ================= REGISTER =================
// ใช้ upload.any() เพื่อรองรับทั้ง JSON (นักท่องเที่ยว) และ FormData (ผู้ประกอบการที่มีรูป)
app.post('/register', upload.any(), async (req, res) => {
  const { 
    username,
    email,
    password,
    userType,
    phone,
    contactName,
    placeName,
    businessType,
    address,
    latitude,
    longitude,
  } = req.body; 

  // ตรวจสอบข้อมูลพื้นฐาน (ใช้ username สำหรับนักท่องเที่ยว หรือ contactName สำหรับผู้ประกอบการ)
  const finalUsername = userType === 'entrepreneur' ? contactName : username;

  if (!email || !password || !userType || !finalUsername) {
    return res.status(400).json({ message: 'กรอกข้อมูลไม่ครบ' });
  }

  try {
    // 1. ตรวจสอบอีเมลซ้ำในตาราง user
    const checkEmailSql = 'SELECT email FROM user WHERE email = ?';
    const [existing] = await db.promise().query(checkEmailSql, [email]);
    
    if (existing.length > 0) {
      return res.status(400).json({ message: 'อีเมลนี้ถูกใช้งานไปแล้ว' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. บันทึกลงตาราง user
    const userSql = `
      INSERT INTO user (username, email, password, phone, user_type)
      VALUES (?, ?, ?, ?, ?)
    `;
    const [userResult] = await db.promise().query(userSql, [finalUsername, email, hashedPassword, phone, userType]);
    const newUserId = userResult.insertId;

    // 4. บันทึกลงตาราง entrepreneur (ข้อมูลธุรกิจ)
    let newEntrepreneurId = null;
    let newPlaceId = null;
    let statusValue = "pending";
    if (userType === 'entrepreneur') {
      const statusExists = await columnExists('entrepreneur', 'status')

      const cols = [
        'user_id',
        'contact_name',
        'business_name',
        'business_type',
        'address',
        'phone',
        'description',
      ]
      const values = [
        newUserId,
        contactName,
        placeName,
        businessType,
        address || null,
        phone,
        null,
      ]

      const insertStatus = 'pending'
      if (statusExists) {
        cols.push('status')
        values.push(insertStatus)
      }

      const placeholders = cols.map(() => '?').join(', ')
      const entreSql = `
        INSERT INTO entrepreneur (${cols.join(', ')})
        VALUES (${placeholders})
      `

      const [entreResult] = await db.promise().query(entreSql, values)
      newEntrepreneurId = entreResult.insertId;

      if (statusExists && newEntrepreneurId) {
        const [stRows] = await db.promise().query(
          `SELECT status FROM entrepreneur WHERE entrepreneur_id = ? LIMIT 1`,
          [newEntrepreneurId]
        )
        statusValue = stRows[0]?.status || insertStatus
      }

      // 5. สร้างข้อมูลสถานที่ในตาราง place โดยผูกกับ entrepreneur ที่สมัคร
      // เก็บพิกัดเป็นสตริง "lat,lng" ในฟิลด์ location
      if (placeName) {
        const locationString =
          latitude && longitude ? `${latitude},${longitude}` : address || null;

        const placeSql = `
          INSERT INTO place (place_name, category, location, entrepreneur_id)
          VALUES (?, ?, ?, ?)
        `;
        const [placeResult] = await db.promise().query(placeSql, [
          placeName,
          businessType || null,
          locationString,
          newEntrepreneurId,
        ]);
        newPlaceId = placeResult.insertId;

        // 6. บันทึกรูปภาพลงตาราง image ผูกกับ place และ entrepreneur
        if (req.files && req.files.length > 0) {
          const imageSql = `
            INSERT INTO image (image_url, image_type, place_id, entrepreneur_id)
            VALUES (?, 'place', ?, ?)
          `;

          for (const file of req.files) {
            const dataUrl = fileBufferToDataUrl(file)
            if (!dataUrl) continue
            await db.promise().query(imageSql, [dataUrl, newPlaceId, newEntrepreneurId]);
          }
        }
      }
    }

    res.json({
      success: true,
      message: 'Register สำเร็จ',
      entrepreneur_id: newEntrepreneurId,
      place_id: newPlaceId,
      status: statusValue,
    });

  } catch (error) {
    console.error("Register Error:", error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// ================= LOGIN =================
app.post('/login', async (req, res) => {
  const { email, password, userType } = req.body;
  // แปลงชื่อ role ให้ตรงกับฐานข้อมูล
  const mappedUserType = userType === 'business' ? 'entrepreneur' : userType;

  const sql = 'SELECT * FROM user WHERE email = ?'; 

  try {
    const [result] = await db.promise().query(sql, [email]);
    
    if (result.length === 0) {
      return res.status(401).json({ error: 'ไม่พบอีเมลนี้ในระบบ' });
    }

    const user = result[0];

    // ตรวจสอบรหัสผ่าน
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'รหัสผ่านไม่ถูกต้อง' });
    }

    // ตรวจสอบบทบาท
    // - ถ้าเป็น admin ให้สามารถล็อกอินได้จากทุกหน้าฟอร์ม (เช่น เลือกเป็นนักท่องเที่ยว)
    // - ถ้าไม่ใช่ admin ให้บทบาทต้องตรงกับประเภทที่ส่งมาจากฟอร์ม
    if (user.user_type !== 'admin' && mappedUserType && user.user_type !== mappedUserType) {
      return res.status(403).json({ error: 'สิทธิ์การเข้าถึงไม่ถูกต้องสำหรับบทบาทนี้' });
    }

    // ✅ ส่งข้อมูลผู้ใช้กลับไปให้ Frontend (ไม่ส่งรหัสผ่าน)
    res.json({ 
      success: true,
      message: 'เข้าสู่ระบบสำเร็จ',
      user: {
        id: user.user_id,
        email: user.email,
        name: user.username || user.first_name || 'User',
        user_type: user.user_type,
        role: user.user_type
      }
    });

  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// ================= ENTREPRENEUR PROFILE =================
// ดึงข้อมูล entrepreneur + place ตาม user_id (ผู้ประกอบการที่ล็อกอิน)
app.get('/entrepreneur/by-user/:userId', async (req, res) => {
  const { userId } = req.params;

  const statusExists = await columnExists('entrepreneur', 'status')
  const statusSelect = statusExists ? 'e.status as status' : `'pending' as status`
  const hasRejectReason = await columnExists('entrepreneur', 'reject_reason')
  const rejectReasonSelect = hasRejectReason ? 'e.reject_reason' : 'NULL AS reject_reason'

  const sql = `
    SELECT 
      u.user_id,
      u.email,
      u.phone as user_phone,
      e.entrepreneur_id,
      e.contact_name,
      e.business_name,
      e.business_type,
      e.address,
      e.phone,
      e.description,
      ${statusSelect},
      ${rejectReasonSelect},
      p.place_id,
      p.place_name,
      p.category,
      p.location
    FROM entrepreneur e
    INNER JOIN user u ON u.user_id = e.user_id
    LEFT JOIN place p ON p.entrepreneur_id = e.entrepreneur_id
    WHERE e.user_id = ?
    LIMIT 1
  `

  try {
    const [rows] = await db.promise().query(sql, [userId]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'ไม่พบข้อมูลผู้ประกอบการ' });
    }

    const row = rows[0]
    const rejectReasons = parseRejectReasonText(row.reject_reason)

    res.json({
      success: true,
      data: {
        ...row,
        reject_reasons: rejectReasons,
      },
    });
  } catch (error) {
    console.error('Fetch entrepreneur profile error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// ================= ENTREPRENEUR: REVIEWS SUMMARY =================
// สรุปรีวิวสำหรับหน้า business-dashboard (อิงสถานที่ของ entrepreneur ตาม user_id)
app.get('/entrepreneur/reviews-summary/:userId', async (req, res) => {
  const { userId } = req.params

  try {
    const [entreRows] = await db.promise().query(
      `SELECT entrepreneur_id FROM entrepreneur WHERE user_id = ? LIMIT 1`,
      [userId]
    )
    if (entreRows.length === 0) {
      const viewStats = await getPlaceViewStats([])
      return res.json({
        success: true,
        data: {
          total_reviews: 0,
          avg_rating: 0,
          new_reviews: 0,
          today_reviews: 0,
          recent_reviews: [],
          ...viewStats,
        },
      })
    }

    const entrepreneurId = entreRows[0].entrepreneur_id
    const [placeRows] = await db.promise().query(
      `SELECT place_id FROM place WHERE entrepreneur_id = ?`,
      [entrepreneurId]
    )
    const placeIds = placeRows.map((r) => r.place_id).filter(Boolean)
    if (placeIds.length === 0) {
      const viewStats = await getPlaceViewStats([])
      return res.json({
        success: true,
        data: {
          total_reviews: 0,
          avg_rating: 0,
          new_reviews: 0,
          today_reviews: 0,
          recent_reviews: [],
          ...viewStats,
        },
      })
    }

    const hasCreatedAt = await columnExists('review', 'created_at')
    const hasReviewDate = await columnExists('review', 'review_date')
    const hasCreatedDate = await columnExists('review', 'created_date')
    const hasComment = await columnExists('review', 'comment')
    const hasUserId = await columnExists('review', 'user_id')

    const reviewDateColumn = hasCreatedAt
      ? 'r.created_at'
      : hasReviewDate
      ? 'r.review_date'
      : hasCreatedDate
      ? 'r.created_date'
      : null

    const inClause = placeIds.map(() => '?').join(', ')
    const todayExpr = reviewDateColumn ? `SUM(CASE WHEN DATE(${reviewDateColumn}) = CURDATE() THEN 1 ELSE 0 END)` : '0'
    const newExpr = reviewDateColumn
      ? `SUM(CASE WHEN ${reviewDateColumn} >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) THEN 1 ELSE 0 END)`
      : '0'

    const [summaryRows] = await db.promise().query(
      `
      SELECT
        COUNT(r.review_id) AS total_reviews,
        ROUND(COALESCE(AVG(r.rating), 0), 1) AS avg_rating,
        ${newExpr} AS new_reviews,
        ${todayExpr} AS today_reviews
      FROM review r
      WHERE r.place_id IN (${inClause})
      `,
      placeIds
    )

    const dateSelect = reviewDateColumn ? `${reviewDateColumn} AS review_date` : `NULL AS review_date`
    const commenterSelect = hasUserId
      ? `COALESCE(u.username, u.email, 'ผู้ใช้งาน') AS reviewer_name`
      : `'ผู้ใช้งาน' AS reviewer_name`
    const commentSelect = hasComment ? `COALESCE(r.comment, '') AS comment` : `'' AS comment`
    const userJoin = hasUserId ? `LEFT JOIN user u ON u.user_id = r.user_id` : ``
    const orderBy = reviewDateColumn ? `${reviewDateColumn} DESC` : `r.review_id DESC`

    const [recentRows] = await db.promise().query(
      `
      SELECT
        r.review_id,
        COALESCE(r.rating, 0) AS rating,
        ${commentSelect},
        ${dateSelect},
        ${commenterSelect}
      FROM review r
      ${userJoin}
      WHERE r.place_id IN (${inClause})
      ORDER BY ${orderBy}
      LIMIT 10
      `,
      placeIds
    )

    const viewStats = await getPlaceViewStats(placeIds)

    return res.json({
      success: true,
      data: {
        total_reviews: Number(summaryRows[0]?.total_reviews || 0),
        avg_rating: Number(summaryRows[0]?.avg_rating || 0),
        new_reviews: Number(summaryRows[0]?.new_reviews || 0),
        today_reviews: Number(summaryRows[0]?.today_reviews || 0),
        recent_reviews: recentRows || [],
        ...viewStats,
      },
    })
  } catch (error) {
    console.error('Entrepreneur reviews summary error:', error)
    return res.status(500).json({ success: false, message: 'Internal Server Error' })
  }
})

// ================= REVIEWS (PUBLIC) =================
function formatReviewDate(value) {
  if (!value) return ''
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function mapReviewRow(row) {
  const userName = row.user_name || 'ผู้ใช้งาน'
  return {
    id: row.review_id,
    userName,
    userAvatar: userName.slice(0, 2).toUpperCase(),
    rating: Number(row.rating || 0),
    title: row.title || '',
    comment: row.comment || '',
    date: formatReviewDate(row.review_date),
    images: [],
  }
}

async function getReviewQueryParts() {
  const hasCreatedAt = await columnExists('review', 'created_at')
  const hasReviewDate = await columnExists('review', 'review_date')
  const hasCreatedDate = await columnExists('review', 'created_date')
  const hasComment = await columnExists('review', 'comment')
  const hasTitle = await columnExists('review', 'title')
  const hasUserId = await columnExists('review', 'user_id')

  const reviewDateColumn = hasCreatedAt
    ? 'r.created_at'
    : hasReviewDate
    ? 'r.review_date'
    : hasCreatedDate
    ? 'r.created_date'
    : null

  return {
    hasComment,
    hasTitle,
    hasUserId,
    reviewDateColumn,
    commentSelect: hasComment ? `COALESCE(r.comment, '') AS comment` : `'' AS comment`,
    titleSelect: hasTitle ? `COALESCE(r.title, '') AS title` : `'' AS title`,
    dateSelect: reviewDateColumn ? `${reviewDateColumn} AS review_date` : `NULL AS review_date`,
    userJoin: hasUserId ? `LEFT JOIN user u ON u.user_id = r.user_id` : ``,
    userNameSelect: hasUserId
      ? `COALESCE(u.username, u.email, 'ผู้ใช้งาน') AS user_name`
      : `'ผู้ใช้งาน' AS user_name`,
    orderBy: reviewDateColumn ? `${reviewDateColumn} DESC` : `r.review_id DESC`,
  }
}

function buildReviewSummary(reviews) {
  const totalReviews = reviews.length
  const averageRating = totalReviews
    ? reviews.reduce((sum, item) => sum + Number(item.rating || 0), 0) / totalReviews
    : 0

  const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  reviews.forEach((item) => {
    const rounded = Math.min(5, Math.max(1, Math.round(Number(item.rating) || 0)))
    counts[rounded] += 1
  })
  const distribution = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: counts[stars],
    percent: totalReviews ? Math.round((counts[stars] / totalReviews) * 100) : 0,
  }))

  return {
    totalReviews,
    totalRatings: totalReviews,
    averageRating,
    distribution,
    firstReviewer: reviews[0] || null,
  }
}

async function fetchReviewById(reviewId) {
  const parts = await getReviewQueryParts()
  const [rows] = await db.promise().query(
    `
    SELECT
      r.review_id,
      COALESCE(r.rating, 0) AS rating,
      ${parts.commentSelect},
      ${parts.titleSelect},
      ${parts.dateSelect},
      ${parts.userNameSelect}
    FROM review r
    ${parts.userJoin}
    WHERE r.review_id = ?
    LIMIT 1
    `,
    [reviewId]
  )
  return rows[0] ? mapReviewRow(rows[0]) : null
}

app.get('/reviews', async (req, res) => {
  const entityType = (req.query.entityType || 'place').toString()
  const entityId = Number(req.query.entityId)

  if (!entityId) {
    return res.status(400).json({ success: false, message: 'ต้องระบุ entityId' })
  }

  if (entityType !== 'place') {
    return res.json({ success: true, data: [], summary: null })
  }

  try {
    const parts = await getReviewQueryParts()

    const [rows] = await db.promise().query(
      `
      SELECT
        r.review_id,
        COALESCE(r.rating, 0) AS rating,
        ${parts.commentSelect},
        ${parts.titleSelect},
        ${parts.dateSelect},
        ${parts.userNameSelect}
      FROM review r
      ${parts.userJoin}
      WHERE r.place_id = ?
      ORDER BY ${parts.orderBy}
      `,
      [entityId]
    )

    const reviews = (rows || []).map(mapReviewRow)

    return res.json({
      success: true,
      data: reviews,
      summary: buildReviewSummary(reviews),
    })
  } catch (error) {
    console.error('Fetch reviews error:', error)
    return res.status(500).json({ success: false, message: 'Internal Server Error' })
  }
})

app.post('/reviews', upload.array('images', 5), async (req, res) => {
  const { userId, rating, title, comment, entityType, entityId } = req.body

  const parsedRating = Number(rating)
  const parsedEntityId = Number(entityId)
  const parsedUserId = Number(userId)

  if (!parsedRating || parsedRating < 1 || parsedRating > 5) {
    return res.status(400).json({ success: false, message: 'กรุณาระบุคะแนน 1-5 ดาว' })
  }
  if (!comment || !String(comment).trim()) {
    return res.status(400).json({ success: false, message: 'กรุณากรอกข้อความรีวิว' })
  }
  if ((entityType || 'place') !== 'place' || !parsedEntityId) {
    return res.status(400).json({ success: false, message: 'ข้อมูลสถานที่ไม่ถูกต้อง' })
  }

  try {
    const hasComment = await columnExists('review', 'comment')
    const hasTitle = await columnExists('review', 'title')
    const hasUserId = await columnExists('review', 'user_id')
    const hasCreatedAt = await columnExists('review', 'created_at')
    const hasReviewDate = await columnExists('review', 'review_date')

    const columns = ['place_id', 'rating']
    const values = [parsedEntityId, parsedRating]

    if (hasComment) {
      columns.push('comment')
      values.push(String(comment).trim())
    }
    if (hasTitle && title) {
      columns.push('title')
      values.push(String(title).trim())
    }
    if (hasUserId && parsedUserId) {
      columns.push('user_id')
      values.push(parsedUserId)
    }
    if (hasCreatedAt) {
      columns.push('created_at')
      values.push(new Date())
    } else if (hasReviewDate) {
      columns.push('review_date')
      values.push(new Date())
    }

    const placeholders = columns.map(() => '?').join(', ')
    const [result] = await db.promise().query(
      `INSERT INTO review (${columns.join(', ')}) VALUES (${placeholders})`,
      values
    )

    const reviewId = result.insertId
    const files = Array.isArray(req.files) ? req.files : []
    if (files.length > 0) {
      for (const file of files) {
        const filename = file.originalname || `review-${reviewId}.jpg`
        try {
          await db.promise().query(
            `INSERT INTO image (image_url, image_type, place_id, entrepreneur_id) VALUES (?, 'review', ?, NULL)`,
            [filename, parsedEntityId]
          )
        } catch (imageErr) {
          console.error('Save review image error:', imageErr)
        }
      }
    }

    const savedReview = await fetchReviewById(reviewId)

    return res.json({
      success: true,
      data: savedReview || { id: reviewId },
    })
  } catch (error) {
    console.error('Create review error:', error)
    return res.status(500).json({ success: false, message: 'บันทึกรีวิวไม่สำเร็จ' })
  }
})

// ================= ADMIN: LIST ENTREPRENEUR =================
// ดึง entrepreneur ตาม status (default pending)
app.get('/admin/entrepreneurs', async (req, res) => {
  const status = req.query.status || 'pending'

  try {
    const sql = `
      SELECT 
        entrepreneur_id,
        contact_name,
        business_name,
        business_type,
        phone,
        status
      FROM entrepreneur
      WHERE status = ?
      ORDER BY entrepreneur_id DESC
    `

    const [rows] = await db.promise().query(sql, [status])
    return res.json({ success: true, data: rows })
  } catch (error) {
    console.error('Admin list entrepreneurs error:', error)
    return res.status(500).json({ message: 'Internal Server Error' })
  }
})

// ================= ADMIN: UPDATE ENTREPRENEUR STATUS =================
async function ensureEntrepreneurRejectReasonColumn() {
  const exists = await columnExists('entrepreneur', 'reject_reason')
  if (exists) return true
  try {
    await db.promise().query(`ALTER TABLE entrepreneur ADD COLUMN reject_reason TEXT NULL`)
    return true
  } catch (error) {
    console.error('Add entrepreneur.reject_reason column error:', error)
    return false
  }
}

function buildRejectReasonText(reasons, otherReason) {
  const parts = []
  if (Array.isArray(reasons)) {
    reasons.forEach((item) => {
      const text = String(item || '').trim()
      if (text) parts.push(text)
    })
  }
  const other = String(otherReason || '').trim()
  if (other) parts.push(other)
  return parts.length ? parts.join('\n') : null
}

function parseRejectReasonText(raw) {
  const text = String(raw || '').trim()
  if (!text) return []
  return text.split('\n').map((line) => line.trim()).filter(Boolean)
}

app.put('/admin/entrepreneur/:entrepreneurId/status', async (req, res) => {
  const { entrepreneurId } = req.params
  const { status, reasons, other_reason } = req.body

  const allowed = new Set(['pending', 'approved', 'rejected'])
  if (!allowed.has(status)) {
    return res.status(400).json({ message: 'Invalid status' })
  }

  try {
    const rejectReasonText =
      status === 'rejected' ? buildRejectReasonText(reasons, other_reason) : null
    const hasRejectReason = await ensureEntrepreneurRejectReasonColumn()

    let sql = `UPDATE entrepreneur SET status = ?`
    const params = [status]

    if (hasRejectReason) {
      sql += `, reject_reason = ?`
      params.push(status === 'rejected' ? rejectReasonText : null)
    }

    sql += ` WHERE entrepreneur_id = ?`
    params.push(entrepreneurId)

    const [result] = await db.promise().query(sql, params)

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Entrepreneur not found' })
    }

    return res.json({ success: true })
  } catch (error) {
    console.error('Admin update entrepreneur status error:', error)
    return res.status(500).json({ message: 'Internal Server Error' })
  }
})

// ================= ADMIN: OVERVIEW (FAST) =================
app.get('/admin/stats', async (req, res) => {
  try {
    const hasTripStatus = await columnExists('recommend_trip', 'status')
    const hasPlaceCreatedAt = await columnExists('place', 'created_at')
    const hasPlaceCreatedDate = await columnExists('place', 'created_date')
    const hasTripCreated = await columnExists('recommend_trip', 'created_at')

    const monthStart = `DATE_FORMAT(CURDATE(), '%Y-%m-01')`

    const queries = [
      db.promise().query('SELECT COUNT(*) AS total FROM place'),
      db.promise().query('SELECT COUNT(*) AS total FROM recommend_trip'),
      db.promise().query(
        'SELECT ROUND(COALESCE(AVG(r.rating), 0), 1) AS avgRating FROM review r'
      ),
    ]

    if (hasPlaceCreatedAt) {
      queries.push(
        db.promise().query(
          `SELECT COUNT(*) AS total FROM place WHERE created_at >= ${monthStart}`
        )
      )
    } else if (hasPlaceCreatedDate) {
      queries.push(
        db.promise().query(
          `SELECT COUNT(*) AS total FROM place WHERE created_date >= ${monthStart}`
        )
      )
    }
    if (hasTripCreated) {
      queries.push(
        db.promise().query(
          `SELECT COUNT(*) AS total FROM recommend_trip WHERE created_at >= ${monthStart}`
        )
      )
    }
    if (hasTripStatus) {
      queries.push(
        db.promise().query(
          `SELECT COUNT(*) AS total FROM recommend_trip WHERE status = 'published'`
        ),
        db.promise().query(
          `SELECT COUNT(*) AS total FROM recommend_trip WHERE status = 'draft'`
        )
      )
    }

    const results = await Promise.all(queries)
    let idx = 0
    const placesTotal = results[idx++][0][0].total
    const tripsTotal = results[idx++][0][0].total
    const avgRating = results[idx++][0][0].avgRating

    let placesThisMonth = 0
    let tripsThisMonth = 0
    if (hasPlaceCreatedAt || hasPlaceCreatedDate) {
      placesThisMonth = results[idx++][0][0].total
    }
    if (hasTripCreated) {
      tripsThisMonth = results[idx++][0][0].total
    }

    let publishedTrips = tripsTotal
    let draftTrips = 0
    if (hasTripStatus) {
      publishedTrips = results[idx++][0][0].total
      draftTrips = results[idx++][0][0].total
    }

    return res.json({
      success: true,
      data: {
        placesTotal,
        tripsTotal,
        placesThisMonth,
        tripsThisMonth,
        publishedTrips,
        draftTrips,
        avgRating: Number(avgRating) || 0,
      },
    })
  } catch (error) {
    console.error('Admin stats error:', error)
    return res.status(500).json({ success: false, message: 'Internal Server Error' })
  }
})

app.get('/admin/overview-recent', async (req, res) => {
  try {
    const hasRecImg = await columnExists('image', 'recommend_id')
    const hasTripStatus = await columnExists('recommend_trip', 'status')
    const hasDayIdx = await columnExists('recommend_trip_detail', 'day_index')

    const statusSelect = hasTripStatus ? 'rt.status' : `'published' AS status`
    const durationSub = hasDayIdx
      ? `(
          SELECT COUNT(DISTINCT d.day_index)
          FROM recommend_trip_detail d
          WHERE d.recommend_id = rt.recommend_id
        )`
      : `(
          SELECT GREATEST(COALESCE(MAX(d.sequence_order), 0), 1)
          FROM recommend_trip_detail d
          WHERE d.recommend_id = rt.recommend_id
        )`

    const [placesResult, tripsResult] = await Promise.all([
      db.promise().query(
        `
        SELECT
          p.place_id,
          p.place_name,
          p.location,
          EXISTS(
            SELECT 1 FROM image i
            WHERE i.place_id = p.place_id
          ) AS has_cover,
          COALESCE(SUM(r.rating), 0) AS total_stars,
          COUNT(r.review_id) AS review_count,
          ROUND(COALESCE(AVG(r.rating), 0), 1) AS avg_rating
        FROM place p
        LEFT JOIN review r ON r.place_id = p.place_id
        GROUP BY p.place_id, p.place_name, p.location
        ORDER BY total_stars DESC, review_count DESC, avg_rating DESC, p.place_id DESC
        LIMIT 4
        `
      ),
      db.promise().query(
        `
        SELECT
          rt.recommend_id,
          rt.trip_name,
          ${statusSelect},
          ${tripHasCoverSub(hasRecImg)},
          ${durationSub} AS duration_days
        FROM recommend_trip rt
        ORDER BY rt.recommend_id DESC
        LIMIT 4
        `
      ),
    ])

    const places = (placesResult[0] || []).map((p) => {
      const hasCover = Number(p.has_cover) === 1 || p.has_cover === true
      return {
        id: p.place_id,
        name: p.place_name,
        location: p.location || '',
        imageUrl: hasCover
          ? `${req.protocol}://${req.get('host')}/places/${p.place_id}/cover-image`
          : '/placeholder.svg',
        totalStars: Number(p.total_stars || 0),
        reviewCount: Number(p.review_count || 0),
        avgRating: Number(p.avg_rating || 0),
      }
    })

    const trips = (tripsResult[0] || []).map((t) => ({
      id: t.recommend_id,
      title: t.trip_name,
      coverImageUrl: mapTripCoverUrl(t.recommend_id, t.has_cover, req) || '/placeholder.svg',
      duration: Math.max(Number(t.duration_days) || 1, 1),
      status: t.status === 'published' ? 'published' : 'draft',
    }))

    return res.json({ success: true, data: { places, trips } })
  } catch (error) {
    console.error('Admin overview-recent error:', error)
    return res.status(500).json({ success: false, message: 'Internal Server Error' })
  }
})

// ================= ADMIN: USERS SUMMARY =================
// ดึงผู้ใช้แยกตามประเภท (นักท่องเที่ยว / ผู้ประกอบการ) สำหรับหน้า overview
app.get('/admin/users-by-type', async (req, res) => {
  try {
    const touristsSql = `
      SELECT user_id, username, email, phone, created_date, user_type
      FROM user
      WHERE user_type = 'tourist'
      ORDER BY user_id DESC
      LIMIT 6
    `

    const entrepreneursSql = `
      SELECT 
        u.user_id,
        u.username,
        u.email,
        u.phone,
        u.created_date,
        u.user_type,
        e.entrepreneur_id,
        e.contact_name,
        e.business_name,
        e.business_type,
        e.status
      FROM user u
      LEFT JOIN entrepreneur e ON e.user_id = u.user_id
      WHERE u.user_type IN ('entrepreneur', 'business')
      ORDER BY u.user_id DESC
      LIMIT 6
    `

    const [tourists] = await db.promise().query(touristsSql)
    const [entrepreneurs] = await db.promise().query(entrepreneursSql)

    return res.json({
      success: true,
      data: {
        tourists,
        entrepreneurs,
      },
    })
  } catch (error) {
    console.error('Admin users-by-type error:', error)
    return res.status(500).json({ message: 'Internal Server Error' })
  }
})

app.put('/admin/users/:userId', async (req, res) => {
  const userId = Number(req.params.userId)
  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ success: false, message: 'userId ไม่ถูกต้อง' })
  }

  const {
    username,
    email,
    phone,
    password,
    business_name,
    business_type,
    contact_name,
    status,
    entrepreneur_id,
  } = req.body

  try {
    const [users] = await db.promise().query(
      `SELECT user_id, user_type FROM user WHERE user_id = ? LIMIT 1`,
      [userId]
    )
    if (!users.length) {
      return res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้' })
    }
    if (users[0].user_type === 'admin') {
      return res.status(403).json({ success: false, message: 'ไม่สามารถแก้ไขบัญชีแอดมินได้' })
    }

    const userUpdates = []
    const userParams = []
    if (username != null && String(username).trim()) {
      userUpdates.push('username = ?')
      userParams.push(String(username).trim())
    }
    if (email != null && String(email).trim()) {
      userUpdates.push('email = ?')
      userParams.push(String(email).trim())
    }
    if (phone != null) {
      userUpdates.push('phone = ?')
      userParams.push(String(phone).trim() || null)
    }
    if (password != null && String(password).trim()) {
      const hashed = await bcrypt.hash(String(password).trim(), 10)
      userUpdates.push('password = ?')
      userParams.push(hashed)
    }

    if (userUpdates.length) {
      userParams.push(userId)
      await db.promise().query(
        `UPDATE user SET ${userUpdates.join(', ')} WHERE user_id = ?`,
        userParams
      )
    }

    const userType = users[0].user_type
    if (userType === 'entrepreneur' || userType === 'business') {
      const entUpdates = []
      const entParams = []
      if (business_name != null) {
        entUpdates.push('business_name = ?')
        entParams.push(String(business_name).trim() || null)
      }
      if (business_type != null) {
        entUpdates.push('business_type = ?')
        entParams.push(String(business_type).trim() || null)
      }
      if (contact_name != null) {
        entUpdates.push('contact_name = ?')
        entParams.push(String(contact_name).trim() || null)
      }
      if (status != null && ['pending', 'approved', 'rejected'].includes(status)) {
        entUpdates.push('status = ?')
        entParams.push(status)
      }

      if (entUpdates.length) {
        if (entrepreneur_id) {
          entParams.push(entrepreneur_id, userId)
          await db.promise().query(
            `UPDATE entrepreneur SET ${entUpdates.join(', ')} WHERE entrepreneur_id = ? AND user_id = ?`,
            entParams
          )
        } else {
          entParams.push(userId)
          await db.promise().query(
            `UPDATE entrepreneur SET ${entUpdates.join(', ')} WHERE user_id = ?`,
            entParams
          )
        }
      }
    }

    return res.json({ success: true, message: 'อัปเดตผู้ใช้สำเร็จ' })
  } catch (error) {
    console.error('Admin update user error:', error)
    return res.status(500).json({ success: false, message: 'Internal Server Error' })
  }
})

app.delete('/admin/users/:userId', async (req, res) => {
  const userId = Number(req.params.userId)
  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ success: false, message: 'userId ไม่ถูกต้อง' })
  }

  try {
    const [users] = await db.promise().query(
      `SELECT user_id, user_type FROM user WHERE user_id = ? LIMIT 1`,
      [userId]
    )
    if (!users.length) {
      return res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้' })
    }
    if (users[0].user_type === 'admin') {
      return res.status(403).json({ success: false, message: 'ไม่สามารถลบบัญชีแอดมินได้' })
    }

    const userType = users[0].user_type
    if (userType === 'entrepreneur' || userType === 'business') {
      const [entreRows] = await db.promise().query(
        `SELECT entrepreneur_id FROM entrepreneur WHERE user_id = ?`,
        [userId]
      )
      for (const row of entreRows) {
        const entrepreneurId = row.entrepreneur_id
        const [placeRows] = await db.promise().query(
          `SELECT place_id FROM place WHERE entrepreneur_id = ?`,
          [entrepreneurId]
        )
        for (const place of placeRows) {
          await db.promise().query(`DELETE FROM image WHERE place_id = ?`, [place.place_id])
          const hasReview = await columnExists('review', 'place_id')
          if (hasReview) {
            await db.promise().query(`DELETE FROM review WHERE place_id = ?`, [place.place_id])
          }
        }
        await db.promise().query(`DELETE FROM place WHERE entrepreneur_id = ?`, [entrepreneurId])
        await db.promise().query(`DELETE FROM image WHERE entrepreneur_id = ?`, [entrepreneurId])
        await db.promise().query(`DELETE FROM entrepreneur WHERE entrepreneur_id = ?`, [
          entrepreneurId,
        ])
      }
    }

    const hasReviewUserId = await columnExists('review', 'user_id')
    if (hasReviewUserId) {
      await db.promise().query(`DELETE FROM review WHERE user_id = ?`, [userId])
    }

    const hasTripplan = await columnExists('tripplan', 'user_id')
    if (hasTripplan) {
      const [tripRows] = await db.promise().query(
        `SELECT trip_id FROM tripplan WHERE user_id = ?`,
        [userId]
      )
      for (const trip of tripRows) {
        await db.promise().query(`DELETE FROM tripplan_detail WHERE trip_id = ?`, [trip.trip_id])
      }
      await db.promise().query(`DELETE FROM tripplan WHERE user_id = ?`, [userId])
    }

    await db.promise().query(`DELETE FROM user WHERE user_id = ?`, [userId])

    return res.json({ success: true, message: 'ลบผู้ใช้สำเร็จ' })
  } catch (error) {
    console.error('Admin delete user error:', error)
    return res.status(500).json({ success: false, message: 'ลบผู้ใช้ไม่สำเร็จ' })
  }
})

// ================= ENTREPRENEUR: UPDATE PROFILE =================
// อัปเดตข้อมูลจากหน้า business-dashboard
app.put('/entrepreneur/by-user/:userId', async (req, res) => {
  const { userId } = req.params
  const {
    entrepreneurId,
    placeId,
    name,
    category,
    description,
    address,
    phone,
    email,
    resubmit,
  } = req.body

  try {
    // อัปเดตตาราง user (อีเมล/เบอร์)
    await db.promise().query(
      `UPDATE user SET email = ?, phone = ? WHERE user_id = ?`,
      [email || null, phone || null, userId]
    )

    // อัปเดตตาราง entrepreneur
    let entrepreneurWhere = `user_id = ?`
    let entrepreneurParams = [name || null, category || null, address || null, phone || null, description || null, userId]

    if (entrepreneurId) {
      entrepreneurWhere = `entrepreneur_id = ?`
      entrepreneurParams = [name || null, category || null, address || null, phone || null, description || null, entrepreneurId]
    }

    await db.promise().query(
      `
      UPDATE entrepreneur
      SET business_name = ?, business_type = ?, address = ?, phone = ?, description = ?
      WHERE ${entrepreneurWhere}
      `,
      entrepreneurParams
    )

    // อัปเดตตาราง place
    if (placeId) {
      await db.promise().query(
        `
        UPDATE place
        SET place_name = ?, category = ?, location = ?
        WHERE place_id = ?
        `,
        [name || null, category || null, address || null, placeId]
      )
    } else if (entrepreneurId) {
      await db.promise().query(
        `
        UPDATE place
        SET place_name = ?, category = ?, location = ?
        WHERE entrepreneur_id = ?
        `,
        [name || null, category || null, address || null, entrepreneurId]
      )
    }

    if (resubmit) {
      const statusExists = await columnExists('entrepreneur', 'status')
      if (statusExists) {
        const hasRejectReason = await columnExists('entrepreneur', 'reject_reason')
        if (hasRejectReason) {
          await db.promise().query(
            `UPDATE entrepreneur SET status = 'pending', reject_reason = NULL
             WHERE user_id = ? AND status = 'rejected'`,
            [userId]
          )
        } else {
          await db.promise().query(
            `UPDATE entrepreneur SET status = 'pending' WHERE user_id = ? AND status = 'rejected'`,
            [userId]
          )
        }
      }
    }

    return res.json({
      success: true,
      message: resubmit ? 'บันทึกและส่งขออนุมัติใหม่แล้ว' : 'อัปเดตข้อมูลสำเร็จ',
      status: resubmit ? 'pending' : undefined,
    })
  } catch (error) {
    console.error('Update entrepreneur profile error:', error)
    return res.status(500).json({ message: 'Internal Server Error' })
  }
})

function mapGalleryImageRow(row, req) {
  const base = req ? `${req.protocol}://${req.get('host')}` : 'http://localhost:5000'
  const uploadedAt = row.uploaded_at ? new Date(row.uploaded_at) : null
  return {
    id: row.image_id,
    placeId: row.place_id,
    imageUrl: `${base}/places/${row.place_id}/gallery-image/${row.image_id}`,
    uploadDate: uploadedAt
      ? uploadedAt.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
      : '-',
    uploadedAt: uploadedAt ? uploadedAt.toISOString() : null,
  }
}

async function getEntrepreneurPlaceByUserId(userId, { requireApproved = false } = {}) {
  const statusExists = await columnExists('entrepreneur', 'status')
  const statusClause = requireApproved && statusExists ? `AND e.status = 'approved'` : ''
  const [rows] = await db.promise().query(
    `SELECT e.entrepreneur_id, p.place_id
     FROM entrepreneur e
     LEFT JOIN place p ON p.entrepreneur_id = e.entrepreneur_id
     WHERE e.user_id = ? ${statusClause}
     LIMIT 1`,
    [userId]
  )
  return rows[0] || null
}

async function getApprovedEntrepreneurPlace(userId) {
  return getEntrepreneurPlaceByUserId(userId, { requireApproved: true })
}

async function assertEntrepreneurOwnsGalleryImage(userId, imageId) {
  const ctx = await getEntrepreneurPlaceByUserId(userId)
  if (!ctx?.place_id) return null
  const [rows] = await db.promise().query(
    `SELECT image_id, place_id, image_url
     FROM image
     WHERE image_id = ? AND place_id = ? AND image_type = 'place'`,
    [imageId, ctx.place_id]
  )
  if (!rows.length) return null
  return { ...ctx, image: rows[0] }
}

function invalidatePlaceCoverCache(placeId) {
  coverImageCache.delete(`place:${placeId}`)
}

// ================= ENTREPRENEUR: PLACE GALLERY =================
app.get('/entrepreneur/place-gallery/:userId', async (req, res) => {
  const userId = Number(req.params.userId)
  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ success: false, message: 'userId ไม่ถูกต้อง' })
  }

  try {
    const ctx = await getEntrepreneurPlaceByUserId(userId)
    if (!ctx) {
      return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลผู้ประกอบการ' })
    }
    if (!ctx.place_id) {
      return res.json({ success: true, data: [] })
    }

    const [rows] = await db.promise().query(
      `SELECT image_id, place_id, image_url, uploaded_at
       FROM image
       WHERE place_id = ? AND image_type = 'place'
       ORDER BY image_id DESC`,
      [ctx.place_id]
    )

    return res.json({
      success: true,
      data: rows.map((row) => mapGalleryImageRow(row, req)),
      placeId: ctx.place_id,
    })
  } catch (error) {
    console.error('Entrepreneur place gallery list error:', error)
    return res.status(500).json({ success: false, message: 'Internal Server Error' })
  }
})

app.post('/entrepreneur/place-gallery', upload.single('image'), async (req, res) => {
  const userId = Number(req.body.userId)
  const placeId = Number(req.body.placeId)

  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ success: false, message: 'userId ไม่ถูกต้อง' })
  }
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'กรุณาเลือกไฟล์รูปภาพ' })
  }

  try {
    const ctx = await getEntrepreneurPlaceByUserId(userId)
    if (!ctx?.place_id) {
      return res.status(400).json({ success: false, message: 'ยังไม่มีสถานที่ผูกกับบัญชีผู้ประกอบการ' })
    }
    if (placeId && placeId !== ctx.place_id) {
      return res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์จัดการสถานที่นี้' })
    }

    const dataUrl = fileBufferToDataUrl(req.file)
    if (!dataUrl) {
      return res.status(400).json({ success: false, message: 'อ่านไฟล์รูปภาพไม่สำเร็จ' })
    }

    const [result] = await db.promise().query(
      `INSERT INTO image (image_url, image_type, place_id, entrepreneur_id)
       VALUES (?, 'place', ?, ?)`,
      [dataUrl, ctx.place_id, ctx.entrepreneur_id]
    )

    invalidatePlaceCoverCache(ctx.place_id)

    const [rows] = await db.promise().query(
      `SELECT image_id, place_id, image_url, uploaded_at
       FROM image WHERE image_id = ?`,
      [result.insertId]
    )

    return res.json({
      success: true,
      data: mapGalleryImageRow(rows[0], req),
    })
  } catch (error) {
    console.error('Entrepreneur place gallery upload error:', error)
    return res.status(500).json({ success: false, message: 'อัปโหลดรูปภาพไม่สำเร็จ' })
  }
})

app.put('/entrepreneur/place-gallery/:imageId', upload.single('image'), async (req, res) => {
  const imageId = Number(req.params.imageId)
  const userId = Number(req.body.userId)

  if (!Number.isInteger(imageId) || imageId <= 0 || !Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ success: false, message: 'ข้อมูลไม่ถูกต้อง' })
  }
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'กรุณาเลือกไฟล์รูปภาพ' })
  }

  try {
    const owned = await assertEntrepreneurOwnsGalleryImage(userId, imageId)
    if (!owned) {
      return res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์แก้ไขรูปภาพนี้' })
    }

    const dataUrl = fileBufferToDataUrl(req.file)
    if (!dataUrl) {
      return res.status(400).json({ success: false, message: 'อ่านไฟล์รูปภาพไม่สำเร็จ' })
    }

    await db.promise().query(`UPDATE image SET image_url = ? WHERE image_id = ?`, [
      dataUrl,
      imageId,
    ])
    invalidatePlaceCoverCache(owned.place_id)

    const [rows] = await db.promise().query(
      `SELECT image_id, place_id, image_url, uploaded_at
       FROM image WHERE image_id = ?`,
      [imageId]
    )

    return res.json({
      success: true,
      data: mapGalleryImageRow(rows[0], req),
    })
  } catch (error) {
    console.error('Entrepreneur place gallery update error:', error)
    return res.status(500).json({ success: false, message: 'แก้ไขรูปภาพไม่สำเร็จ' })
  }
})

app.delete('/entrepreneur/place-gallery/:imageId', async (req, res) => {
  const imageId = Number(req.params.imageId)
  const userId = Number(req.query.userId)

  if (!Number.isInteger(imageId) || imageId <= 0 || !Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ success: false, message: 'ข้อมูลไม่ถูกต้อง' })
  }

  try {
    const owned = await assertEntrepreneurOwnsGalleryImage(userId, imageId)
    if (!owned) {
      return res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์ลบรูปภาพนี้' })
    }

    await db.promise().query(`DELETE FROM image WHERE image_id = ?`, [imageId])
    invalidatePlaceCoverCache(owned.place_id)

    return res.json({ success: true })
  } catch (error) {
    console.error('Entrepreneur place gallery delete error:', error)
    return res.status(500).json({ success: false, message: 'ลบรูปภาพไม่สำเร็จ' })
  }
})

// ================= ADMIN: PLACES CRUD =================
app.get('/admin/places', async (req, res) => {
  const summary =
    req.query.summary === '1' ||
    req.query.summary === 'true'

  try {
    if (summary) {
      const [rows] = await db.promise().query(
        `SELECT place_id, place_name, category, location
         FROM place
         ORDER BY place_name ASC`
      )
      return res.json({ success: true, data: rows })
    }

    const [rows] = await db.promise().query(
      `${ADMIN_PLACES_SELECT}
       ORDER BY p.place_id DESC`
    )
    const data = rows.map((row) => mapPlaceListRow(row, req))
    return res.json({ success: true, data })
  } catch (error) {
    console.error('Admin get places error:', error)
    return res.status(500).json({ message: 'Internal Server Error' })
  }
})

app.post('/admin/places', async (req, res) => {
  const { name, category, location, description, imageUrl, openTime, closeTime } = req.body

  if (!name || !location || !category) {
    return res.status(400).json({ message: 'กรอกข้อมูลสถานที่ไม่ครบ' })
  }

  try {
    const insertPlaceSql = `
      INSERT INTO place (place_name, category, location, description, open_time, close_time, entrepreneur_id)
      VALUES (?, ?, ?, ?, ?, ?, NULL)
    `
    const [placeResult] = await db.promise().query(insertPlaceSql, [
      name,
      category,
      location,
      description || null,
      openTime || null,
      closeTime || null,
    ])
    const placeId = placeResult.insertId

    if (imageUrl) {
      const insertImageSql = `
        INSERT INTO image (image_url, image_type, place_id, entrepreneur_id)
        VALUES (?, 'place', ?, NULL)
      `
      await db.promise().query(insertImageSql, [imageUrl, placeId])
    }

    return res.json({ success: true, place_id: placeId })
  } catch (error) {
    console.error('Admin add place error:', error)
    return res.status(500).json({ message: 'Internal Server Error' })
  }
})

app.put('/admin/places/:placeId', async (req, res) => {
  const { placeId } = req.params
  const { name, category, location, description, imageUrl, openTime, closeTime } = req.body

  if (!name || !location || !category) {
    return res.status(400).json({ message: 'กรอกข้อมูลสถานที่ไม่ครบ' })
  }

  try {
    const updatePlaceSql = `
      UPDATE place
      SET place_name = ?, category = ?, location = ?, description = ?, open_time = ?, close_time = ?
      WHERE place_id = ?
    `
    const [placeResult] = await db.promise().query(updatePlaceSql, [
      name,
      category,
      location,
      description || null,
      openTime || null,
      closeTime || null,
      placeId,
    ])
    if (placeResult.affectedRows === 0) {
      return res.status(404).json({ message: 'ไม่พบสถานที่' })
    }

    if (typeof imageUrl === 'string' && imageUrl.trim() !== '') {
      const trimmedImage = imageUrl.trim()
      const isCoverProxy =
        trimmedImage.includes(`/places/${placeId}/cover-image`) ||
        trimmedImage.includes(`/places/${Number(placeId)}/cover-image`)

      if (!isCoverProxy) {
      const [existingImage] = await db.promise().query(
        `SELECT image_id FROM image WHERE place_id = ? ORDER BY image_id DESC LIMIT 1`,
        [placeId]
      )

      if (existingImage.length > 0) {
        await db.promise().query(
          `UPDATE image SET image_url = ? WHERE image_id = ?`,
          [trimmedImage, existingImage[0].image_id]
        )
      } else {
        await db.promise().query(
          `INSERT INTO image (image_url, image_type, place_id, entrepreneur_id) VALUES (?, 'place', ?, NULL)`,
          [trimmedImage, placeId]
        )
      }
      }
    }

    return res.json({ success: true })
  } catch (error) {
    console.error('Admin update place error:', error)
    return res.status(500).json({ message: 'Internal Server Error' })
  }
})

app.delete('/admin/places/:placeId', async (req, res) => {
  const { placeId } = req.params

  try {
    await db.promise().query(`DELETE FROM image WHERE place_id = ?`, [placeId])
    const [result] = await db.promise().query(`DELETE FROM place WHERE place_id = ?`, [placeId])

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'ไม่พบสถานที่' })
    }

    return res.json({ success: true })
  } catch (error) {
    console.error('Admin delete place error:', error)
    return res.status(500).json({ message: 'Internal Server Error' })
  }
})

const PLACE_RATING_SUB = `(
  SELECT ROUND(COALESCE(AVG(r.rating), 0), 1)
  FROM review r
  WHERE r.place_id = p.place_id
)`
const PLACE_REVIEWS_SUB = `(
  SELECT COUNT(*)
  FROM review r
  WHERE r.place_id = p.place_id
)`
/** การ์ดหน้าแรก — ไม่คำนวณ rating/reviews (เร็วกว่า list ปกติ) */
const PLACES_HOME_CARD_SELECT = `
  SELECT
    p.place_id,
    p.place_name,
    p.category,
    p.location,
    p.description,
    p.open_time,
    p.close_time,
    EXISTS(
      SELECT 1 FROM image i
      WHERE i.place_id = p.place_id
    ) AS has_cover,
    0 AS rating,
    0 AS reviews
  FROM place p
`
/** รายการสถานที่แบบเบา — ไม่ส่ง base64 ใน JSON (โหลดรูปผ่าน /places/:id/cover-image) */
const PLACES_LIST_LIGHT_SELECT = `
  SELECT
    p.place_id,
    p.place_name,
    p.category,
    p.location,
    p.description,
    p.open_time,
    p.close_time,
    p.entrepreneur_id,
    EXISTS(
      SELECT 1 FROM image i
      WHERE i.place_id = p.place_id
    ) AS has_cover,
    ${PLACE_RATING_SUB} AS rating,
    ${PLACE_REVIEWS_SUB} AS reviews
  FROM place p
`

const ADMIN_PLACES_SELECT = `
  SELECT
    p.place_id,
    p.place_name,
    p.category,
    p.location,
    p.description,
    p.open_time,
    p.close_time,
    p.entrepreneur_id,
    e.business_name AS entrepreneur_name,
    e.status AS entrepreneur_status,
    EXISTS(
      SELECT 1 FROM image i
      WHERE i.place_id = p.place_id
    ) AS has_cover,
    ${PLACE_RATING_SUB} AS rating,
    ${PLACE_REVIEWS_SUB} AS reviews
  FROM place p
  LEFT JOIN entrepreneur e ON e.entrepreneur_id = p.entrepreneur_id
`

/** รายละเอียดเต็ม — มีรูปจริง (หน้า place detail) */
const PLACES_DETAIL_SELECT = `
  SELECT
    p.place_id,
    p.place_name,
    p.category,
    p.location,
    p.description,
    p.open_time,
    p.close_time,
    (
      SELECT i.image_url
      FROM image i
      WHERE i.place_id = p.place_id
      ORDER BY i.image_id DESC
      LIMIT 1
    ) AS image_url,
    ${PLACE_RATING_SUB} AS rating,
    ${PLACE_REVIEWS_SUB} AS reviews
  FROM place p
  WHERE p.place_id = ?
`

function placeCoverImagePath(placeId) {
  return `/places/${placeId}/cover-image`
}

function mapPlaceListRow(row, req) {
  const base = req ? `${req.protocol}://${req.get('host')}` : 'http://localhost:5000'
  const hasCover = Number(row.has_cover) === 1 || row.has_cover === true
  const { has_cover, ...rest } = row
  return {
    ...rest,
    image_url: hasCover ? `${base}${placeCoverImagePath(row.place_id)}` : null,
    rating: Number(row.rating || 0),
    reviews: Number(row.reviews || 0),
  }
}

function parseDataImageUrl(raw) {
  if (!raw || typeof raw !== 'string') return null
  const trimmed = raw.trim()
  if (!trimmed.startsWith('data:')) return null
  const comma = trimmed.indexOf(',')
  if (comma === -1) return null
  const header = trimmed.slice(0, comma)
  const data = trimmed.slice(comma + 1)
  const mimeMatch = header.match(/^data:([^;]+)/i)
  const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream'
  const buf = /;base64/i.test(header)
    ? Buffer.from(data, 'base64')
    : Buffer.from(decodeURIComponent(data), 'binary')
  return { mime, buf }
}

const coverImageCache = new Map()
const COVER_IMAGE_CACHE_MS = 15 * 60 * 1000

function buildCoverPayloadFromImageUrl(imageUrl) {
  if (!imageUrl) return null
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return { kind: 'redirect', url: imageUrl }
  }
  if (imageUrl.startsWith('data:')) {
    const parsed = parseDataImageUrl(imageUrl)
    if (parsed) return { kind: 'buffer', mime: parsed.mime, buf: parsed.buf }
  }
  if (imageUrl.startsWith('/')) {
    const frontendBase = process.env.FRONTEND_URL || 'http://localhost:3000'
    return { kind: 'redirect', url: `${frontendBase}${imageUrl}` }
  }
  return null
}

function sendCoverPayload(res, cover) {
  if (!cover) {
    return res.status(404).end()
  }
  if (cover.kind === 'redirect') {
    return res.redirect(302, cover.url)
  }
  if (cover.kind === 'buffer') {
    res.set('Content-Type', cover.mime)
    res.set('Cache-Control', 'public, max-age=86400')
    return res.send(cover.buf)
  }
  return res.status(404).end()
}

async function fetchPlaceCoverImageUrl(placeId) {
  const [rows] = await db.promise().query(
    `SELECT i.image_url
     FROM image i
     WHERE i.place_id = ?
       AND i.image_url IS NOT NULL
       AND TRIM(i.image_url) != ''
     ORDER BY i.image_id DESC
     LIMIT 1`,
    [placeId]
  )
  return rows[0]?.image_url?.trim() || null
}

async function fetchTripCoverImageUrl(recommendId) {
  const hasRecImg = await columnExists('image', 'recommend_id')
  if (hasRecImg) {
    const [rows] = await db.promise().query(
      `SELECT i.image_url
       FROM image i
       WHERE i.recommend_id = ?
         AND i.image_url IS NOT NULL
         AND TRIM(i.image_url) != ''
       ORDER BY i.image_id DESC
       LIMIT 1`,
      [recommendId]
    )
    if (rows[0]?.image_url) {
      return rows[0].image_url.trim()
    }
  }

  const [placeRows] = await db.promise().query(
    `SELECT i.image_url
     FROM recommend_trip_detail d
     INNER JOIN image i ON i.place_id = d.place_id
     WHERE d.recommend_id = ?
       AND i.image_url IS NOT NULL
       AND TRIM(i.image_url) != ''
     ORDER BY d.sequence_order ASC, i.image_id DESC
     LIMIT 1`,
    [recommendId]
  )
  return placeRows[0]?.image_url?.trim() || null
}

async function resolvePlaceCoverResponse(placeId) {
  const cacheKey = `place:${placeId}`
  const cached = coverImageCache.get(cacheKey)
  if (cached && cached.expires > Date.now()) {
    return cached.payload
  }

  const imageUrl = await fetchPlaceCoverImageUrl(placeId)
  const payload = buildCoverPayloadFromImageUrl(imageUrl)
  if (payload) {
    coverImageCache.set(cacheKey, {
      expires: Date.now() + COVER_IMAGE_CACHE_MS,
      payload,
    })
  }
  return payload
}

async function resolveTripCoverResponse(recommendId) {
  const cacheKey = `trip:${recommendId}`
  const cached = coverImageCache.get(cacheKey)
  if (cached && cached.expires > Date.now()) {
    return cached.payload
  }

  const imageUrl = await fetchTripCoverImageUrl(recommendId)
  const payload = buildCoverPayloadFromImageUrl(imageUrl)
  if (payload) {
    coverImageCache.set(cacheKey, {
      expires: Date.now() + COVER_IMAGE_CACHE_MS,
      payload,
    })
  }
  return payload
}

function tripCoverImagePath(recommendId) {
  return `/trips/${recommendId}/cover-image`
}

function tripHasCoverSub(hasRecImg) {
  const placeCoverExists = `EXISTS(
    SELECT 1 FROM recommend_trip_detail d
    INNER JOIN image i ON i.place_id = d.place_id
    WHERE d.recommend_id = rt.recommend_id
  )`
  if (!hasRecImg) {
    return `${placeCoverExists} AS has_cover`
  }
  return `(
    EXISTS(
      SELECT 1 FROM image i
      WHERE i.recommend_id = rt.recommend_id
    )
    OR ${placeCoverExists}
  ) AS has_cover`
}

function mapTripCoverUrl(recommendId, hasCover, req) {
  const covered = Number(hasCover) === 1 || hasCover === true
  if (!covered) return null
  const base = req ? `${req.protocol}://${req.get('host')}` : 'http://localhost:5000'
  return `${base}${tripCoverImagePath(recommendId)}`
}

const TRIP_DETAIL_LIGHT_SELECT = (hasDayIdx) =>
  hasDayIdx
    ? `d.recommend_id, d.sequence_order, d.day_index, d.description, d.day_title,
       p.place_name, p.category AS place_category, p.location AS place_location`
    : `d.recommend_id, d.sequence_order, p.place_name,
       p.category AS place_category, p.location AS place_location`

function buildMapCategoryFilter(categoryId) {
  const c = 'LOWER(COALESCE(p.category, ""))'
  const id = String(categoryId || 'all').trim()
  if (id === 'temple' || id === 'สายบุญ') {
    return {
      clause: ` AND (${c} LIKE '%วัด%' OR ${c} LIKE '%มู%' OR ${c} LIKE '%ธรรม%')`,
      params: [],
    }
  }
  if (id === 'restaurant' || id === 'ร้านอาหาร') {
    return {
      clause: ` AND (${c} LIKE '%อาหาร%' OR ${c} LIKE '%ตลาด%' OR ${c} LIKE '%คาเฟ่%')`,
      params: [],
    }
  }
  if (id === 'museum' || id === 'พิพิธภัณฑ์') {
    return {
      clause: ` AND (${c} LIKE '%พิพิธ%' OR ${c} LIKE '%ประวัติ%')`,
      params: [],
    }
  }
  if (id === 'todo' || id === 'กิจกรรม') {
    return {
      clause: ` AND (${c} LIKE '%กิจกรรม%' OR ${c} LIKE '%สวน%' OR ${c} LIKE '%กีฬา%' OR ${c} LIKE '%ท่องเที่ยว%')`,
      params: [],
    }
  }
  if (id === 'hidden' || id === 'วิถีชุมชน') {
    return {
      clause: ` AND (${c} LIKE '%ชุมชน%' OR ${c} LIKE '%เมือง%' OR ${c} NOT LIKE '%ห้าง%')`,
      params: [],
    }
  }
  if (id === 'คาเฟ่') return { clause: ` AND ${c} LIKE '%คาเฟ่%'`, params: [] }
  if (id === 'ธรรมชาติ') {
    return {
      clause: ` AND (${c} LIKE '%ธรรมชาติ%' OR ${c} LIKE '%สวน%' OR ${c} LIKE '%ป่า%')`,
      params: [],
    }
  }
  if (id === 'ห้าง') {
    return { clause: ` AND (${c} LIKE '%ห้าง%' OR ${c} LIKE '%ช้อป%')`, params: [] }
  }
  return { clause: '', params: [] }
}

function buildPlaceTypeFilter(typeLabel) {
  const t = (typeLabel || '').trim()
  if (!t || t === 'ทั้งหมด') return { clause: '', params: [] }
  const c = 'LOWER(COALESCE(p.category, ""))'
  if (t === 'สายบุญ') {
    return {
      clause: ` AND (${c} LIKE '%วัด%' OR ${c} LIKE '%มู%' OR ${c} LIKE '%ธรรม%')`,
      params: [],
    }
  }
  if (t === 'คาเฟ่') return { clause: ` AND ${c} LIKE '%คาเฟ่%'`, params: [] }
  if (t === 'วิถีชุมชน') {
    return {
      clause: ` AND (${c} LIKE '%ชุมชน%' OR ${c} LIKE '%เมือง%' OR ${c} LIKE '%ตลาด%')`,
      params: [],
    }
  }
  if (t === 'ธรรมชาติ') {
    return {
      clause: ` AND (${c} LIKE '%ธรรมชาติ%' OR ${c} LIKE '%สวน%' OR ${c} LIKE '%ป่า%')`,
      params: [],
    }
  }
  if (t === 'ห้าง') {
    return { clause: ` AND (${c} LIKE '%ห้าง%' OR ${c} LIKE '%ช้อป%')`, params: [] }
  }
  if (t === 'กิจกรรม') {
    return {
      clause: ` AND (${c} LIKE '%กิจกรรม%' OR ${c} LIKE '%กีฬา%' OR ${c} LIKE '%ท่องเที่ยว%')`,
      params: [],
    }
  }
  return { clause: '', params: [] }
}

function parseCoordsFromLocation(location) {
  if (!location) return null
  const trimmed = String(location).trim()
  const match = trimmed.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/)
  if (!match) return null
  const lat = Number(match[1])
  const lng = Number(match[2])
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null
  return { lat, lng }
}

const geocodeCache = new Map()
let lastGeocodeRequestAt = 0

const NONTHABURI_POSTAL_CENTROIDS = {
  11000: { lat: 13.8591, lng: 100.5217 },
  11110: { lat: 13.915, lng: 100.508 },
  11120: { lat: 13.9125, lng: 100.497 },
  11130: { lat: 13.805, lng: 100.475 },
  11140: { lat: 13.876, lng: 100.409 },
  11150: { lat: 13.983, lng: 100.313 },
}

const NONTHABURI_DISTRICT_CENTROIDS = {
  เมืองนนทบุรี: { lat: 13.8591, lng: 100.5217 },
  ปากเกร็ด: { lat: 13.9125, lng: 100.497 },
  บางกรวย: { lat: 13.805, lng: 100.475 },
  บางใหญ่: { lat: 13.876, lng: 100.409 },
  ไทรน้อย: { lat: 13.983, lng: 100.313 },
  บางบัวทอง: { lat: 13.911, lng: 100.426 },
}

function guessCoordsFromThaiAddress(location, placeName) {
  const text = `${placeName || ''} ${location || ''}`.trim()
  if (!text) return null

  const postalMatch = text.match(/\b(11\d{3})\b/)
  if (postalMatch) {
    const postal = postalMatch[1]
    const centroid = NONTHABURI_POSTAL_CENTROIDS[postal]
    if (centroid) {
      return { ...centroid, source: 'postal_approx' }
    }
  }

  for (const [district, centroid] of Object.entries(NONTHABURI_DISTRICT_CENTROIDS)) {
    if (text.includes(district) || text.includes(`อำเภอ${district}`) || text.includes(`เขต${district}`)) {
      return { ...centroid, source: 'district_approx' }
    }
  }

  if (text.includes('นนทบุรี')) {
    return { lat: 13.8621, lng: 100.5144, source: 'province_approx' }
  }

  return null
}

async function waitGeocodeSlot() {
  const minGapMs = 1100
  const now = Date.now()
  const waitMs = Math.max(0, minGapMs - (now - lastGeocodeRequestAt))
  if (waitMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, waitMs))
  }
  lastGeocodeRequestAt = Date.now()
}

async function geocodeAddressQuery(query) {
  const cacheKey = query.trim().toLowerCase()
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey)
  }

  await waitGeocodeSlot()

  const url =
    `https://nominatim.openstreetmap.org/search?` +
    new URLSearchParams({
      format: 'json',
      q: query,
      limit: '1',
      countrycodes: 'th',
    }).toString()

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'NonthaburiTourismApp/1.0',
        Accept: 'application/json',
      },
    })
    if (!response.ok) {
      geocodeCache.set(cacheKey, null)
      return null
    }

    const results = await response.json()
    const hit = Array.isArray(results) ? results[0] : null
    const coords =
      hit && Number.isFinite(Number(hit.lat)) && Number.isFinite(Number(hit.lon))
        ? { lat: Number(hit.lat), lng: Number(hit.lon) }
        : null

    geocodeCache.set(cacheKey, coords)
    return coords
  } catch (error) {
    console.error('Geocode error:', error)
    geocodeCache.set(cacheKey, null)
    return null
  }
}

async function resolvePlaceCoords(row) {
  const stored = parseCoordsFromLocation(row.location)
  if (stored) {
    return { ...stored, source: 'stored' }
  }

  const name = String(row.place_name || '').trim()
  const location = String(row.location || '').trim()
  const queries = [
    [name, 'Nonthaburi', 'Thailand'].filter(Boolean).join(', '),
    [name, location, 'Nonthaburi', 'Thailand'].filter(Boolean).join(', '),
    [name, location, 'นนทบุรี', 'ประเทศไทย'].filter(Boolean).join(', '),
    [location, 'Nonthaburi', 'Thailand'].filter(Boolean).join(', '),
    [location, 'นนทบุรี', 'ประเทศไทย'].filter(Boolean).join(', '),
    [name, 'นนทบุรี', 'ประเทศไทย'].filter(Boolean).join(', '),
  ]

  const seen = new Set()
  for (const query of queries) {
    const normalized = query.trim()
    if (!normalized || seen.has(normalized.toLowerCase())) continue
    seen.add(normalized.toLowerCase())
    const coords = await geocodeAddressQuery(normalized)
    if (coords) {
      return { ...coords, source: 'geocoded' }
    }
  }

  const approx = guessCoordsFromThaiAddress(location, name)
  if (approx) {
    return approx
  }

  return { lat: null, lng: null, source: 'failed' }
}

// ================= PUBLIC: PLACES =================
// ดึงสถานที่ — ไม่มี page/limit = รายการเต็ม (backward compat)
// ?page=1&limit=10&search=&type=สายบุญ = แบ่งหน้า (create-trip)
app.get('/places/by-ids', async (req, res) => {
  try {
    const ids = String(req.query.ids || '')
      .split(',')
      .map((v) => Number(v.trim()))
      .filter((n) => Number.isInteger(n) && n > 0)
    if (!ids.length) {
      return res.json({ success: true, data: [] })
    }
    const placeholders = ids.map(() => '?').join(',')
    const sql = `
      ${PLACES_LIST_LIGHT_SELECT}
      WHERE p.place_id IN (${placeholders})
      ORDER BY FIELD(p.place_id, ${placeholders})
    `
    const [rows] = await db.promise().query(sql, [...ids, ...ids])
    return res.json({ success: true, data: rows.map((row) => mapPlaceListRow(row, req)) })
  } catch (error) {
    console.error('Places by-ids error:', error)
    return res.status(500).json({ success: false, message: 'Internal Server Error' })
  }
})

app.get('/places/resolve-coords', async (req, res) => {
  try {
    const ids = String(req.query.ids || '')
      .split(',')
      .map((v) => Number(v.trim()))
      .filter((n) => Number.isInteger(n) && n > 0)
    if (!ids.length) {
      return res.json({ success: true, data: [] })
    }

    const placeholders = ids.map(() => '?').join(',')
    const sql = `
      SELECT p.place_id, p.place_name, p.location
      FROM place p
      WHERE p.place_id IN (${placeholders})
      ORDER BY FIELD(p.place_id, ${placeholders})
    `
    const [rows] = await db.promise().query(sql, [...ids, ...ids])

    const data = []
    for (const row of rows) {
      const coords = await resolvePlaceCoords(row)
      data.push({
        place_id: row.place_id,
        place_name: row.place_name,
        location: row.location || '',
        lat: coords.lat,
        lng: coords.lng,
        source: coords.source,
      })
    }

    return res.json({ success: true, data })
  } catch (error) {
    console.error('Places resolve-coords error:', error)
    return res.status(500).json({ success: false, message: 'Internal Server Error' })
  }
})

// การ์ดบนแผนที่หน้าแรก — เฉพาะสถานที่จากผู้ประกอบการที่อนุมัติแล้ว
app.get('/places/map-cards', async (req, res) => {
  try {
    const category = String(req.query.category || 'all')
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 3, 1), 12)
    const catFilter = buildMapCategoryFilter(category)
    const statusExists = await columnExists('entrepreneur', 'status')
    const approvedClause = statusExists ? ` AND e.status = 'approved'` : ''

    const poolSize = Math.min(Math.max(limit * 8, 24), 80)
    const [rows] = await db.promise().query(
      `${PLACES_HOME_CARD_SELECT}
       INNER JOIN entrepreneur e ON e.entrepreneur_id = p.entrepreneur_id
       WHERE 1=1${approvedClause}${catFilter.clause}
       ORDER BY p.place_id DESC
       LIMIT ?`,
      [...catFilter.params, poolSize]
    )

    return res.json({
      success: true,
      data: pickRandomRows(rows, limit).map((row) => mapPlaceListRow(row, req)),
    })
  } catch (error) {
    console.error('Places map-cards error:', error)
    return res.status(500).json({ success: false, message: 'Internal Server Error' })
  }
})

app.get('/places', async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10)
    const limit = parseInt(req.query.limit, 10)
    const search = String(req.query.search || '').trim()
    const typeFilter = buildPlaceTypeFilter(req.query.type)

    if (Number.isInteger(page) && page >= 1 && Number.isInteger(limit) && limit >= 1) {
      const safeLimit = Math.min(Math.max(limit, 1), 50)
      const offset = (page - 1) * safeLimit
      let where = 'WHERE 1=1'
      const params = []

      if (search) {
        const like = `%${search}%`
        where += ' AND (p.place_name LIKE ? OR p.location LIKE ? OR p.description LIKE ?)'
        params.push(like, like, like)
      }
      where += typeFilter.clause
      params.push(...typeFilter.params)

      const [countRows] = await db.promise().query(
        `SELECT COUNT(*) AS total FROM place p ${where}`,
        params
      )
      const total = Number(countRows[0]?.total || 0)

      const [rows] = await db.promise().query(
        `${PLACES_LIST_LIGHT_SELECT} ${where} ORDER BY p.place_name ASC LIMIT ? OFFSET ?`,
        [...params, safeLimit, offset]
      )

      return res.json({
        success: true,
        data: rows.map((row) => mapPlaceListRow(row, req)),
        pagination: {
          page,
          limit: safeLimit,
          total,
          totalPages: Math.max(1, Math.ceil(total / safeLimit)),
        },
      })
    }

    const [rows] = await db.promise().query(
      `${PLACES_LIST_LIGHT_SELECT} ORDER BY p.place_name ASC`
    )
    return res.json({ success: true, data: rows.map((row) => mapPlaceListRow(row, req)) })
  } catch (error) {
    console.error('Public places error:', error)
    return res.status(500).json({ success: false, message: 'Internal Server Error' })
  }
})

function pickRandomRows(rows, limit) {
  const pool = [...rows]
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, limit)
}

// ================= PUBLIC: HOT PLACES =================
app.get('/places/hot-random', async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 6, 1), 12)
    const poolSize = Math.min(Math.max(limit * 8, 24), 80)
    const [rows] = await db.promise().query(
      `${PLACES_HOME_CARD_SELECT}
       WHERE p.entrepreneur_id IS NULL
       ORDER BY p.place_id DESC
       LIMIT ?`,
      [poolSize]
    )

    return res.json({
      success: true,
      data: pickRandomRows(rows, limit).map((row) => mapPlaceListRow(row, req)),
    })
  } catch (error) {
    console.error('Public hot-random places error:', error)
    return res.status(500).json({ message: 'Internal Server Error' })
  }
})

// รูปในคลังภาพสถานที่ — โหลดแยกตาม image_id
app.get('/places/:placeId/gallery-image/:imageId', async (req, res) => {
  const placeId = Number(req.params.placeId)
  const imageId = Number(req.params.imageId)
  if (!Number.isInteger(placeId) || placeId <= 0 || !Number.isInteger(imageId) || imageId <= 0) {
    return res.status(400).end()
  }

  try {
    const [rows] = await db.promise().query(
      `SELECT image_url FROM image
       WHERE image_id = ? AND place_id = ? AND image_type = 'place'`,
      [imageId, placeId]
    )
    if (!rows.length) {
      return res.status(404).end()
    }
    const payload = buildCoverPayloadFromImageUrl(rows[0].image_url)
    return sendCoverPayload(res, payload)
  } catch (error) {
    console.error('Place gallery-image error:', error)
    return res.status(500).end()
  }
})

// รูปปกสถานที่ — โหลดแยกจาก list API (รองรับ base64 / URL / path)
app.get('/places/:placeId/cover-image', async (req, res) => {
  const id = Number(req.params.placeId)
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).end()
  }

  try {
    const cover = await resolvePlaceCoverResponse(id)
    return sendCoverPayload(res, cover)
  } catch (error) {
    console.error('Place cover-image error:', error)
    return res.status(500).end()
  }
})

// รูปปกทริป — โหลดแยกจาก list API (รองรับ base64 / URL / path)
app.get('/trips/:recommendId/cover-image', async (req, res) => {
  const id = Number(req.params.recommendId)
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).end()
  }

  try {
    const cover = await resolveTripCoverResponse(id)
    return sendCoverPayload(res, cover)
  } catch (error) {
    console.error('Trip cover-image error:', error)
    return res.status(500).end()
  }
})

// บันทึกการเข้าชมหน้ารายละเอียดสถานที่
app.post('/places/:placeId/view', async (req, res) => {
  const id = Number(req.params.placeId)
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ success: false, message: 'placeId ไม่ถูกต้อง' })
  }

  try {
    const [placeRows] = await db.promise().query(
      `SELECT place_id FROM place WHERE place_id = ? LIMIT 1`,
      [id]
    )
    if (!placeRows.length) {
      return res.status(404).json({ success: false, message: 'ไม่พบสถานที่' })
    }

    const ready = await ensurePlaceViewTable()
    if (!ready) {
      return res.status(500).json({ success: false, message: 'ไม่สามารถบันทึกการเข้าชมได้' })
    }

    await db.promise().query(`INSERT INTO place_view (place_id) VALUES (?)`, [id])
    return res.json({ success: true })
  } catch (error) {
    console.error('Record place view error:', error)
    return res.status(500).json({ success: false, message: 'Internal Server Error' })
  }
})

// รายละเอียดสถานที่รายตัว สำหรับหน้าดูรายละเอียด
app.get('/places/:placeId', async (req, res) => {
  const { placeId } = req.params
  const id = Number(placeId)

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ success: false, message: 'placeId ไม่ถูกต้อง' })
  }

  try {
    const [rows] = await db.promise().query(PLACES_DETAIL_SELECT, [id])
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'ไม่พบสถานที่' })
    }

    const row = rows[0]
    return res.json({
      success: true,
      data: {
        ...row,
        rating: Number(row.rating || 0),
        reviews: Number(row.reviews || 0),
      },
    })
  } catch (error) {
    console.error('Public place detail error:', error)
    return res.status(500).json({ success: false, message: 'Internal Server Error' })
  }
})

// ================= PUBLIC: ค้นหา (place + recommend_trip) =================
app.get('/search', async (req, res) => {
  const raw = String(req.query.q || '').trim()
  if (raw.length < 2) {
    return res.json({ success: true, data: { places: [], trips: [] } })
  }

  const pattern = `%${raw}%`

  try {
    const [placeRows] = await db.promise().query(
      `
      SELECT place_id, place_name, category, location
      FROM place
      WHERE place_name LIKE ?
         OR COALESCE(description, '') LIKE ?
         OR COALESCE(category, '') LIKE ?
         OR COALESCE(location, '') LIKE ?
      ORDER BY place_name ASC
      LIMIT 12
      `,
      [pattern, pattern, pattern, pattern]
    )

    const hasTripStatus = await columnExists('recommend_trip', 'status')
    const statusClause = hasTripStatus ? 'AND rt.status = ?' : ''
    const tripParams = hasTripStatus ? [pattern, pattern, 'published'] : [pattern, pattern]

    const [tripRows] = await db.promise().query(
      `
      SELECT recommend_id, trip_name, description
      FROM recommend_trip rt
      WHERE (rt.trip_name LIKE ? OR COALESCE(rt.description, '') LIKE ?)
      ${statusClause}
      ORDER BY rt.recommend_id DESC
      LIMIT 12
      `,
      tripParams
    )

    return res.json({
      success: true,
      data: {
        places: placeRows || [],
        trips: tripRows || [],
      },
    })
  } catch (error) {
    console.error('Public search error:', error)
    return res.status(500).json({ success: false, message: 'Internal Server Error' })
  }
})

// ================= PUBLIC: แนะนำเที่ยว (recommend_trip + รายละเอียดสถานที่) =================
app.get('/trips/recommendations', async (req, res) => {
  const categoryRaw = String(req.query.category || '').trim() || null
  const categoryId = categoryRaw ? normalizeTripCategory(categoryRaw) : null

  try {
    const hasRecImg = await columnExists('image', 'recommend_id')
    const hasTripStatus = await columnExists('recommend_trip', 'status')
    const hasTripCategory = await columnExists('recommend_trip', 'trip_category')

    const categorySelect = hasTripCategory ? 'rt.trip_category' : 'NULL AS trip_category'
    const publishedOnly = hasTripStatus ? `rt.status = 'published'` : '1=1'

    if (categoryRaw && !hasTripCategory) {
      return res.json({ success: true, data: [] })
    }

    if (categoryRaw && hasTripCategory && !categoryId) {
      return res.json({ success: true, data: [] })
    }

    const categoryLabel =
      categoryId && TRIP_CATEGORY_ID_TO_LABEL[categoryId]
        ? TRIP_CATEGORY_ID_TO_LABEL[categoryId]
        : null
    const categoryFilter =
      categoryId && hasTripCategory
        ? 'AND (rt.trip_category = ? OR rt.trip_category = ?)'
        : ''
    const tripQueryParams =
      categoryId && hasTripCategory ? [categoryId, categoryLabel || categoryId] : []

    const [trips] = await db.promise().query(
      `SELECT rt.recommend_id, rt.trip_name, rt.description, rt.created_at, ${categorySelect}, ${tripHasCoverSub(hasRecImg)}
       FROM recommend_trip rt
       WHERE ${publishedOnly} ${categoryFilter}
       ORDER BY rt.recommend_id DESC`,
      tripQueryParams
    )

    if (!trips.length) {
      return res.json({ success: true, data: [] })
    }

    const hasDayIdx = await columnExists('recommend_trip_detail', 'day_index')
    const tripIds = trips.map((t) => t.recommend_id)
    const inClause = tripIds.map(() => '?').join(', ')
    const [allDetails] = await db.promise().query(
      `
      SELECT ${TRIP_DETAIL_LIGHT_SELECT(hasDayIdx)}
      FROM recommend_trip_detail d
      LEFT JOIN place p ON p.place_id = d.place_id
      WHERE d.recommend_id IN (${inClause})
      ORDER BY d.recommend_id ASC, d.sequence_order ASC
      `,
      tripIds
    )

    const detailsByTripId = new Map()
    for (const row of allDetails) {
      const key = row.recommend_id
      if (!detailsByTripId.has(key)) {
        detailsByTripId.set(key, [])
      }
      detailsByTripId.get(key).push(row)
    }

    const result = trips.map((t) => {
      const details = detailsByTripId.get(t.recommend_id) || []
      const coverUrl = mapTripCoverUrl(t.recommend_id, t.has_cover, req)
      return buildPublicTripPayload(t, details, hasDayIdx, coverUrl)
    })

    return res.json({ success: true, data: result })
  } catch (error) {
    console.error('Public trips recommendations error:', error)
    return res.status(500).json({ success: false, message: 'Internal Server Error' })
  }
})

app.get('/trips/public/:recommendId', async (req, res) => {
  const id = Number(req.params.recommendId)
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ success: false, message: 'recommendId ไม่ถูกต้อง' })
  }

  try {
    const hasRecImg = await columnExists('image', 'recommend_id')
    const hasTripStatus = await columnExists('recommend_trip', 'status')
    const hasTripCategory = await columnExists('recommend_trip', 'trip_category')

    const categorySelect = hasTripCategory ? 'rt.trip_category' : 'NULL AS trip_category'
    const publishedOnly = hasTripStatus ? `AND rt.status = 'published'` : ''

    const [rows] = await db.promise().query(
      `SELECT rt.recommend_id, rt.trip_name, rt.description, ${categorySelect}, ${tripHasCoverSub(hasRecImg)}
       FROM recommend_trip rt
       WHERE rt.recommend_id = ? ${publishedOnly}
       LIMIT 1`,
      [id]
    )

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'ไม่พบแผนแนะนำหรือยังไม่เผยแพร่' })
    }

    const t = rows[0]
    const hasDayIdx = await columnExists('recommend_trip_detail', 'day_index')
    const detailSelect = hasDayIdx
      ? `d.sequence_order, d.day_index, d.description, d.day_title, p.place_name,
         p.category AS place_category, p.location AS place_location`
      : `d.sequence_order, p.place_name,
         p.category AS place_category, p.location AS place_location`

    const [details] = await db.promise().query(
      `
      SELECT ${detailSelect}
      FROM recommend_trip_detail d
      LEFT JOIN place p ON p.place_id = d.place_id
      WHERE d.recommend_id = ?
      ORDER BY d.sequence_order ASC
      `,
      [id]
    )

    const coverUrl = mapTripCoverUrl(t.recommend_id, t.has_cover, req)

    return res.json({
      success: true,
      data: buildPublicTripPayload(t, details, hasDayIdx, coverUrl),
    })
  } catch (error) {
    console.error('Public trip detail error:', error)
    return res.status(500).json({ success: false, message: 'Internal Server Error' })
  }
})

// ================= ADMIN: RECOMMEND TRIPS CRUD =================
async function loadAdminTripFull(recommendId) {
  const hasRecImg = await columnExists('image', 'recommend_id')
  const coverSub = hasRecImg
    ? `(
        SELECT i.image_url FROM image i
        WHERE i.recommend_id = rt.recommend_id
        ORDER BY i.image_id DESC LIMIT 1
      ) AS cover_image_url`
    : `NULL AS cover_image_url`

  const hasTripStatus = await columnExists('recommend_trip', 'status')
  const hasTripCategory = await columnExists('recommend_trip', 'trip_category')
  const statusSelect = hasTripStatus ? 'rt.status' : `'published' AS status`
  const categorySelect = hasTripCategory ? 'rt.trip_category' : 'NULL AS trip_category'

  const [rows] = await db.promise().query(
    `SELECT rt.recommend_id, rt.trip_name, rt.description, rt.created_at, ${statusSelect}, ${categorySelect}, ${coverSub}
     FROM recommend_trip rt WHERE rt.recommend_id = ? LIMIT 1`,
    [recommendId]
  )
  const t = rows[0]
  if (!t) return null

  const hasDayIdx = await columnExists('recommend_trip_detail', 'day_index')
  const detailSelect = hasDayIdx
    ? `d.sequence_order, d.day_index, d.description, d.day_title, p.place_name`
    : `d.sequence_order, p.place_name`

  const [details] = await db.promise().query(
    `
    SELECT ${detailSelect}
    FROM recommend_trip_detail d
    LEFT JOIN place p ON p.place_id = d.place_id
    WHERE d.recommend_id = ?
    ORDER BY d.sequence_order ASC
    `,
    [recommendId]
  )

  const itinerary = buildItineraryFromDetailRows(details, hasDayIdx)
  const flatPlaces = details.map((d) => d.place_name).filter(Boolean)
  const tripStatus =
    t.status === 'published' || t.status === 'draft' ? t.status : 'draft'

  return {
    recommend_id: t.recommend_id,
    trip_name: t.trip_name,
    description: t.description,
    created_at: t.created_at,
    trip_category: normalizeTripCategory(t.trip_category) || t.trip_category || null,
    status: tripStatus,
    cover_image_url: t.cover_image_url || null,
    itinerary,
    places: flatPlaces,
  }
}

/** รายการแผนเที่ยวแบบเบา — ส่งรูปปก + สรุป (ไม่ส่ง itinerary) ใช้ ?summary=0 เพื่อโหลดแบบเต็ม */
app.get('/admin/trips', async (req, res) => {
  const summary =
    req.query.summary === undefined ||
    req.query.summary === '1' ||
    req.query.summary === 'true'

  if (!summary) {
    try {
      const [trips] = await db.promise().query(
        `SELECT recommend_id FROM recommend_trip ORDER BY recommend_id DESC`
      )
      const result = []
      for (const row of trips) {
        const full = await loadAdminTripFull(row.recommend_id)
        if (full) result.push(full)
      }
      return res.json({ success: true, data: result })
    } catch (error) {
      console.error('Admin get trips (full) error:', error)
      return res.status(500).json({ message: 'Internal Server Error' })
    }
  }

  try {
    const hasRecImg = await columnExists('image', 'recommend_id')
    const hasTripStatus = await columnExists('recommend_trip', 'status')
    const hasTripCategory = await columnExists('recommend_trip', 'trip_category')
    const hasDayIdx = await columnExists('recommend_trip_detail', 'day_index')

    const statusSelect = hasTripStatus ? 'rt.status' : `'published' AS status`
    const categorySelect = hasTripCategory ? 'rt.trip_category' : 'NULL AS trip_category'
    const durationSub = hasDayIdx
      ? `(SELECT COUNT(DISTINCT COALESCE(d.day_index, 1)) FROM recommend_trip_detail d WHERE d.recommend_id = rt.recommend_id)`
      : `(SELECT GREATEST(COALESCE(MAX(d.sequence_order), 0), 1) FROM recommend_trip_detail d WHERE d.recommend_id = rt.recommend_id)`
    const stopsSub = `(SELECT COUNT(*) FROM recommend_trip_detail d WHERE d.recommend_id = rt.recommend_id)`

    const [trips] = await db.promise().query(
      `SELECT rt.recommend_id, rt.trip_name, rt.description, rt.created_at,
              ${statusSelect}, ${categorySelect},
              ${tripHasCoverSub(hasRecImg)},
              ${durationSub} AS duration_days,
              ${stopsSub} AS stops_count
       FROM recommend_trip rt
       ORDER BY rt.recommend_id DESC`
    )

    const result = trips.map((t) => ({
      recommend_id: t.recommend_id,
      trip_name: t.trip_name,
      description: t.description,
      created_at: t.created_at,
      trip_category: normalizeTripCategory(t.trip_category) || t.trip_category || null,
      status: t.status === 'published' || t.status === 'draft' ? t.status : 'draft',
      cover_image_url: mapTripCoverUrl(t.recommend_id, t.has_cover, req),
      has_cover_image: Number(t.has_cover) === 1 || t.has_cover === true,
      duration_days: Math.max(Number(t.duration_days) || 1, 1),
      stops_count: Number(t.stops_count) || 0,
    }))

    return res.json({ success: true, data: result })
  } catch (error) {
    console.error('Admin get trips (summary) error:', error)
    return res.status(500).json({ message: 'Internal Server Error' })
  }
})

/** รูปปกอย่างเดียว — คืน URL แทน base64 (โหลดรูปผ่าน /trips/:id/cover-image) */
app.get('/admin/trips/:recommendId/cover', async (req, res) => {
  const id = Number(req.params.recommendId)
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ success: false, message: 'recommendId ไม่ถูกต้อง' })
  }
  try {
    const hasRecImg = await columnExists('image', 'recommend_id')
    const [rows] = await db.promise().query(
      `SELECT rt.recommend_id,
              ${tripHasCoverSub(hasRecImg)}
       FROM recommend_trip rt
       WHERE rt.recommend_id = ?
       LIMIT 1`,
      [id]
    )
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'ไม่พบแผนการเดินทาง' })
    }
    return res.json({
      success: true,
      cover_image_url: mapTripCoverUrl(id, rows[0].has_cover, req),
    })
  } catch (error) {
    console.error('Admin get trip cover error:', error)
    return res.status(500).json({ success: false, message: 'Internal Server Error' })
  }
})

app.get('/admin/trips/:recommendId', async (req, res) => {
  const id = Number(req.params.recommendId)
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ success: false, message: 'recommendId ไม่ถูกต้อง' })
  }
  try {
    const trip = await loadAdminTripFull(id)
    if (!trip) {
      return res.status(404).json({ success: false, message: 'ไม่พบแผนการเดินทาง' })
    }
    return res.json({ success: true, data: trip })
  } catch (error) {
    console.error('Admin get trip detail error:', error)
    return res.status(500).json({ success: false, message: 'Internal Server Error' })
  }
})

app.patch('/admin/trips/:recommendId/status', async (req, res) => {
  const id = Number(req.params.recommendId)
  const { status } = req.body
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ success: false, message: 'recommendId ไม่ถูกต้อง' })
  }
  if (!(await columnExists('recommend_trip', 'status'))) {
    return res.status(400).json({ success: false, message: 'ระบบยังไม่รองรับสถานะแผนเที่ยว' })
  }
  const st = normalizeTripStatus(status)
  try {
    const [result] = await db.promise().query(
      `UPDATE recommend_trip SET status = ? WHERE recommend_id = ?`,
      [st, id]
    )
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'ไม่พบแผนการเดินทาง' })
    }
    return res.json({ success: true, status: st })
  } catch (error) {
    console.error('Admin patch trip status error:', error)
    return res.status(500).json({ success: false, message: 'Internal Server Error' })
  }
})

app.post('/admin/trips', async (req, res) => {
  const { title, description, itinerary, coverImageUrl, status, category } = req.body

  if (!title) {
    return res.status(400).json({ message: 'กรุณาระบุชื่อแผนการเดินทาง' })
  }

  try {
    const st = normalizeTripStatus(status)
    const tripCategory = normalizeTripCategory(category)
    const hasTripStatus = await columnExists('recommend_trip', 'status')
    const hasTripCategory = await columnExists('recommend_trip', 'trip_category')

    let tripResult
    if (hasTripStatus && hasTripCategory) {
      ;[tripResult] = await db.promise().query(
        `INSERT INTO recommend_trip (trip_name, description, status, trip_category) VALUES (?, ?, ?, ?)`,
        [title, description || null, st, tripCategory]
      )
    } else if (hasTripStatus) {
      ;[tripResult] = await db.promise().query(
        `INSERT INTO recommend_trip (trip_name, description, status) VALUES (?, ?, ?)`,
        [title, description || null, st]
      )
    } else if (hasTripCategory) {
      ;[tripResult] = await db.promise().query(
        `INSERT INTO recommend_trip (trip_name, description, trip_category) VALUES (?, ?, ?)`,
        [title, description || null, tripCategory]
      )
    } else {
      ;[tripResult] = await db.promise().query(
        `INSERT INTO recommend_trip (trip_name, description) VALUES (?, ?)`,
        [title, description || null]
      )
    }
    const recommendId = tripResult.insertId

    if (await columnExists('image', 'recommend_id')) {
      await upsertTripCoverImage(recommendId, coverImageUrl)
    }

    await insertRecommendTripDetails(recommendId, itinerary)

    return res.json({ success: true, recommend_id: recommendId })
  } catch (error) {
    if (error.statusCode === 400) {
      return res.status(400).json({ message: error.message })
    }
    console.error('Admin add trip error:', error)
    return res.status(500).json({ message: 'Internal Server Error' })
  }
})

app.put('/admin/trips/:recommendId', async (req, res) => {
  const { recommendId } = req.params
  const { title, description, itinerary, coverImageUrl, status, category } = req.body

  if (!title) {
    return res.status(400).json({ message: 'กรุณาระบุชื่อแผนการเดินทาง' })
  }

  try {
    const st = normalizeTripStatus(status)
    const tripCategory = normalizeTripCategory(category)
    const hasTripStatus = await columnExists('recommend_trip', 'status')
    const hasTripCategory = await columnExists('recommend_trip', 'trip_category')

    let tripResult
    if (hasTripStatus && hasTripCategory) {
      ;[tripResult] = await db.promise().query(
        `UPDATE recommend_trip SET trip_name = ?, description = ?, status = ?, trip_category = ? WHERE recommend_id = ?`,
        [title, description || null, st, tripCategory, recommendId]
      )
    } else if (hasTripStatus) {
      ;[tripResult] = await db.promise().query(
        `UPDATE recommend_trip SET trip_name = ?, description = ?, status = ? WHERE recommend_id = ?`,
        [title, description || null, st, recommendId]
      )
    } else if (hasTripCategory) {
      ;[tripResult] = await db.promise().query(
        `UPDATE recommend_trip SET trip_name = ?, description = ?, trip_category = ? WHERE recommend_id = ?`,
        [title, description || null, tripCategory, recommendId]
      )
    } else {
      ;[tripResult] = await db.promise().query(
        `UPDATE recommend_trip SET trip_name = ?, description = ? WHERE recommend_id = ?`,
        [title, description || null, recommendId]
      )
    }
    if (tripResult.affectedRows === 0) {
      return res.status(404).json({ message: 'ไม่พบแผนการเดินทาง' })
    }

    if (await columnExists('image', 'recommend_id')) {
      await upsertTripCoverImage(Number(recommendId), coverImageUrl)
    }

    await db.promise().query(
      `DELETE FROM recommend_trip_detail WHERE recommend_id = ?`,
      [recommendId]
    )

    await insertRecommendTripDetails(Number(recommendId), itinerary)

    return res.json({ success: true })
  } catch (error) {
    if (error.statusCode === 400) {
      return res.status(400).json({ message: error.message })
    }
    console.error('Admin update trip error:', error)
    return res.status(500).json({ message: 'Internal Server Error' })
  }
})

app.delete('/admin/trips/:recommendId', async (req, res) => {
  const { recommendId } = req.params

  try {
    if (await columnExists('image', 'recommend_id')) {
      await db.promise().query(`DELETE FROM image WHERE recommend_id = ?`, [recommendId])
    }
    await db.promise().query(`DELETE FROM recommend_trip_detail WHERE recommend_id = ?`, [recommendId])
    const [tripResult] = await db.promise().query(`DELETE FROM recommend_trip WHERE recommend_id = ?`, [recommendId])

    if (tripResult.affectedRows === 0) {
      return res.status(404).json({ message: 'ไม่พบแผนการเดินทาง' })
    }

    return res.json({ success: true })
  } catch (error) {
    console.error('Admin delete trip error:', error)
    return res.status(500).json({ message: 'Internal Server Error' })
  }
})

// ================= USER TRIP PLAN (tripplan / tripplan_detail) =================
app.get('/tripplans/user/:userId', async (req, res) => {
  const userId = Number(req.params.userId)
  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ success: false, message: 'userId ไม่ถูกต้อง' })
  }

  try {
    const hasTripName = await columnExists('tripplan', 'trip_name')
    const hasTransport = await columnExists('tripplan', 'transport')
    const tripNameSelect = hasTripName ? 't.trip_name' : 'NULL AS trip_name'
    const transportSelect = hasTransport ? 't.transport' : 'NULL AS transport'

    const [rows] = await db.promise().query(
      `
      SELECT
        t.trip_id,
        t.trip_date,
        t.created_at,
        ${tripNameSelect},
        ${transportSelect},
        d.place_id,
        d.sequence_order
      FROM tripplan t
      LEFT JOIN tripplan_detail d ON d.trip_id = t.trip_id
      WHERE t.user_id = ?
      ORDER BY t.created_at DESC, COALESCE(d.sequence_order, 999999) ASC, d.place_id ASC
      `,
      [userId]
    )

    const map = new Map()
    for (const row of rows) {
      const id = row.trip_id
      if (!map.has(id)) {
        map.set(id, {
          id: String(id),
          name: (row.trip_name || '').trim() || `ทริป #${id}`,
          date: row.trip_date ? String(row.trip_date).slice(0, 10) : '',
          transport: row.transport || 'รถสาธารณะ',
          placeIds: [],
          placeMeta: {},
          createdAt: row.created_at || null,
        })
      }
      if (row.place_id != null) {
        map.get(id).placeIds.push(String(row.place_id))
      }
    }

    return res.json({ success: true, data: [...map.values()] })
  } catch (error) {
    console.error('User tripplans list error:', error)
    return res.status(500).json({ success: false, message: 'Internal Server Error' })
  }
})

app.post('/tripplans', async (req, res) => {
  const userId = Number(req.body.userId)
  const tripDate = String(req.body.tripDate || '').trim()
  const tripName = String(req.body.tripName || '').trim()
  const transport = String(req.body.transport || '').trim()
  const placeIdsRaw = Array.isArray(req.body.placeIds) ? req.body.placeIds : []
  const placeIds = placeIdsRaw
    .map((v) => Number(v))
    .filter((v) => Number.isInteger(v) && v > 0)

  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ success: false, message: 'userId ไม่ถูกต้อง' })
  }
  if (!tripDate) {
    return res.status(400).json({ success: false, message: 'กรุณาระบุวันที่เที่ยว' })
  }

  try {
    const hasTripName = await columnExists('tripplan', 'trip_name')
    const hasTransport = await columnExists('tripplan', 'transport')

    const cols = ['trip_date', 'user_id']
    const vals = [tripDate, userId]
    if (hasTripName) {
      cols.push('trip_name')
      vals.push(tripName || null)
    }
    if (hasTransport) {
      cols.push('transport')
      vals.push(transport || null)
    }

    const ph = cols.map(() => '?').join(', ')
    const [tripResult] = await db.promise().query(
      `INSERT INTO tripplan (${cols.join(', ')}) VALUES (${ph})`,
      vals
    )
    const tripId = tripResult.insertId

    for (let i = 0; i < placeIds.length; i += 1) {
      await db.promise().query(
        `INSERT INTO tripplan_detail (trip_id, place_id, sequence_order) VALUES (?, ?, ?)`,
        [tripId, placeIds[i], i + 1]
      )
    }

    return res.json({ success: true, trip_id: tripId })
  } catch (error) {
    console.error('User tripplans create error:', error)
    return res.status(500).json({ success: false, message: 'Internal Server Error' })
  }
})

app.put('/tripplans/:tripId', async (req, res) => {
  const tripId = Number(req.params.tripId)
  const userId = Number(req.body.userId)
  const tripDate = String(req.body.tripDate || '').trim()
  const tripName = String(req.body.tripName || '').trim()
  const transport = String(req.body.transport || '').trim()
  const placeIdsRaw = Array.isArray(req.body.placeIds) ? req.body.placeIds : []
  const placeIds = placeIdsRaw
    .map((v) => Number(v))
    .filter((v) => Number.isInteger(v) && v > 0)

  if (!Number.isInteger(tripId) || tripId <= 0) {
    return res.status(400).json({ success: false, message: 'tripId ไม่ถูกต้อง' })
  }
  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ success: false, message: 'userId ไม่ถูกต้อง' })
  }
  if (!tripDate) {
    return res.status(400).json({ success: false, message: 'กรุณาระบุวันที่เที่ยว' })
  }

  try {
    const hasTripName = await columnExists('tripplan', 'trip_name')
    const hasTransport = await columnExists('tripplan', 'transport')

    const updates = ['trip_date = ?']
    const vals = [tripDate]
    if (hasTripName) {
      updates.push('trip_name = ?')
      vals.push(tripName || null)
    }
    if (hasTransport) {
      updates.push('transport = ?')
      vals.push(transport || null)
    }
    vals.push(tripId, userId)

    const [tripResult] = await db.promise().query(
      `UPDATE tripplan SET ${updates.join(', ')} WHERE trip_id = ? AND user_id = ?`,
      vals
    )
    if (tripResult.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'ไม่พบทริปของผู้ใช้นี้' })
    }

    await db.promise().query(`DELETE FROM tripplan_detail WHERE trip_id = ?`, [tripId])
    for (let i = 0; i < placeIds.length; i += 1) {
      await db.promise().query(
        `INSERT INTO tripplan_detail (trip_id, place_id, sequence_order) VALUES (?, ?, ?)`,
        [tripId, placeIds[i], i + 1]
      )
    }

    return res.json({ success: true })
  } catch (error) {
    console.error('User tripplans update error:', error)
    return res.status(500).json({ success: false, message: 'Internal Server Error' })
  }
})

app.delete('/tripplans/:tripId', async (req, res) => {
  const tripId = Number(req.params.tripId)
  const userId = Number(req.query.userId)
  if (!Number.isInteger(tripId) || tripId <= 0) {
    return res.status(400).json({ success: false, message: 'tripId ไม่ถูกต้อง' })
  }
  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ success: false, message: 'userId ไม่ถูกต้อง' })
  }

  try {
    await db.promise().query(`DELETE FROM tripplan_detail WHERE trip_id = ?`, [tripId])
    const [tripResult] = await db.promise().query(
      `DELETE FROM tripplan WHERE trip_id = ? AND user_id = ?`,
      [tripId, userId]
    )
    if (tripResult.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'ไม่พบทริปของผู้ใช้นี้' })
    }
    return res.json({ success: true })
  } catch (error) {
    console.error('User tripplans delete error:', error)
    return res.status(500).json({ success: false, message: 'Internal Server Error' })
  }
})

const PORT = Number(process.env.PORT) || 5000
app.listen(PORT, async () => {
  await ensureRecommendTripDetailColumns()
  await ensureRecommendTripDetailPrimaryKeyFix()
  await ensureRecommendTripStatusColumn()
  await ensureRecommendTripCategoryColumn()
  await ensureImageRecommendColumn()
  await ensureTripPlanColumns()
  console.log(`🚀 Server running on port ${PORT}`)
})
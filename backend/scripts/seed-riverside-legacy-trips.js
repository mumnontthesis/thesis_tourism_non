/**
 * เพิ่มทริป 2 รายการ:
 * 1) เลาะริมฝั่งเจ้าพระยา
 * 2) ลัดเลาะกรุงเก่า
 *
 * trip_category = NULL ตามที่ขอ
 * หมายเหตุ: สร้างสถานที่ (place) ที่ยังไม่พบในฐานข้อมูลก่อน
 * รัน: node scripts/seed-riverside-legacy-trips.js
 */
const db = require('../db')

const HOURS = {
  open: '08:00:00',
  close: '17:00:00',
}

const PLACES = [
  {
    place_name: 'วัดบางจาก',
    category: 'วัด',
    location: 'นนทบุรี',
    description: 'จุดแวะชมริมน้ำ เหมาะสำหรับการไหว้พระและถ่ายภาพบรรยากาศสองฝั่งเจ้าพระยา',
    ...HOURS,
  },
  {
    place_name: 'วัดแดงธรรมชาติ',
    category: 'วัด',
    location: 'นนทบุรี',
    description: 'ชมพระพุทธรูปปางนาคปรกและทัศนียภาพริมแม่น้ำเจ้าพระยา',
    ...HOURS,
  },
  {
    place_name: 'วัดชมภูเวก',
    category: 'วัด',
    location: 'นนทบุรี',
    description: 'ชมภาพจิตรกรรมฝาผนังเก่าแก่และความงามของงานศิลปกรรมภายในวัด',
    ...HOURS,
  },
  {
    place_name: 'วัดกู้ (พระนางเรือล่ม)',
    category: 'วัด',
    location: 'อยุธยา',
    description: 'วัดประวัติศาสตร์ที่เชื่อมโยงกับตำนานพระนางเรือล่ม',
    ...HOURS,
  },
  {
    place_name: 'วัดปราสาท',
    category: 'วัด',
    location: 'อยุธยา',
    description: 'โบสถ์/พื้นที่ทางประวัติศาสตร์สมัยอยุธยาตอนปลายที่ยังคงความสมบูรณ์',
    ...HOURS,
  },
  // Foreste’ Cafe: มีอยู่แล้วเป็นชื่อ "Foreste' Cafe"
  {
    place_name: "Foreste' Cafe",
    category: 'คาเฟ่',
    location: 'นนทบุรี',
    description: 'คาเฟ่ป่าดิบชื้นที่มีน้ำตกจำลองและละอองหมอกใจกลางเมือง',
    open_time: '07:00:00',
    close_time: '18:00:00',
  },
]

const TRIPS = [
  {
    trip_name: 'เลาะริมฝั่งเจ้าพระยา',
    description:
      'ทริปเดินทางง่ายเลียบแม่น้ำเจ้าพระยา พากราบพระพุทธรูปองค์ใหญ่เพื่อความปัง พร้อมเช็กอินคาเฟ่ป่าดิบชื้นสุดร่มรื่น',
    schedule:
      '09:00 - 10:30 น. วัดบางจาก, 11:00 - 12:30 น. วัดแดงธรรมชาติ, 13:00 - 14:30 น. Foreste’ Cafe, 15:00 - 16:30 น. วัดชมภูเวก',
    places: ['วัดบางจาก', 'วัดแดงธรรมชาติ', "Foreste' Cafe", 'วัดชมภูเวก'],
  },
  {
    trip_name: 'ลัดเลาะกรุงเก่า',
    description:
      'ย้อนเวลาไปสัมผัสความศิวิไลซ์โบราณสมัยอยุธยาตอนปลาย ปิดท้ายด้วยมื้ออร่อยในร้านตกแต่งสไตล์ตะวันตก',
    schedule:
      '09:30 - 11:00 น. วัดกู้ (พระนางเรือล่ม), 11:30 - 13:00 น. วัดปราสาท, 13:30 - 15:30 น. PATA Plantation, 16:00 - 17:30 น. วัดชลอ',
    places: ['วัดกู้ (พระนางเรือล่ม)', 'วัดปราสาท', 'PATA Plantation', 'วัดชลอ'],
  },
]

async function ensurePlace(p) {
  const [rows] = await db.promise().query(
    'SELECT place_id FROM place WHERE place_name = ? LIMIT 1',
    [p.place_name]
  )
  if (rows.length) return rows[0].place_id

  const [result] = await db.promise().query(
    `INSERT INTO place (place_name, category, location, description, open_time, close_time, entrepreneur_id)
     VALUES (?, ?, ?, ?, ?, ?, NULL)`,
    [
      p.place_name,
      p.category || null,
      p.location || null,
      p.description || null,
      p.open_time || null,
      p.close_time || null,
    ]
  )
  return result.insertId
}

async function main() {
  // 1) Ensure missing places exist
  for (const p of PLACES) {
    const id = await ensurePlace(p)
    console.log(`place: ${p.place_name} → place_id=${id}`)
  }

  // 2) Seed trips
  for (const trip of TRIPS) {
    const [existing] = await db.promise().query(
      'SELECT recommend_id FROM recommend_trip WHERE trip_name = ? LIMIT 1',
      [trip.trip_name]
    )
    if (existing.length) {
      console.log(`ข้าม "${trip.trip_name}" — มีอยู่แล้ว (recommend_id=${existing[0].recommend_id})`)
      continue
    }

    const placeIds = []
    for (const name of trip.places) {
      const [rows] = await db.promise().query(
        'SELECT place_id FROM place WHERE place_name = ? LIMIT 1',
        [name]
      )
      if (!rows.length) throw new Error(`ไม่พบสถานที่ (ยังไม่ถูกสร้าง): ${name}`)
      placeIds.push(rows[0].place_id)
      console.log(`  place: ${name} → place_id=${rows[0].place_id}`)
    }

    const [tripResult] = await db.promise().query(
      `INSERT INTO recommend_trip (trip_name, description, status, trip_category)
       VALUES (?, ?, 'published', NULL)`,
      [trip.trip_name, trip.description]
    )
    const recommendId = tripResult.insertId
    console.log(`  recommend_trip → recommend_id=${recommendId}`)

    let seq = 1
    for (const placeId of placeIds) {
      await db.promise().query(
        `INSERT INTO recommend_trip_detail
         (recommend_id, place_id, sequence_order, day_index, day_title, description)
         VALUES (?, ?, ?, 1, ?, ?)`,
        [recommendId, placeId, seq, trip.trip_name, trip.schedule]
      )
      seq += 1
    }
    console.log(`  เพิ่ม ${placeIds.length} จุดแวะสำเร็จ`)
  }

  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})


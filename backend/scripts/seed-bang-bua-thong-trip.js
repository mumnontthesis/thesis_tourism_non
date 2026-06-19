/**
 * เพิ่มทริป "อิ่มใจ อิ่มบุญ เมืองบางบัวทอง" (trip_category = NULL)
 * รัน: node scripts/seed-bang-bua-thong-trip.js
 */
const db = require('../db')

const TRIP_NAME = 'อิ่มใจ อิ่มบุญ เมืองบางบัวทอง'
const TRIP_DESC =
  'ทริปทำบุญใหญ่ในพระอุโบสถทองคำและวัดป่าบรรยากาศวิเวก แวะพักผ่อนถ่ายรูปเช็กอินที่คาเฟ่ไม้ดีไซน์เก๋ | แนะนำการเดินทาง: รถส่วนตัว หรือ รถไฟฟ้า (ต่อรถสาธารณะเข้าพื้นที่บางบัวทอง) | รวมระยะเวลา 7 ชั่วโมง 45 นาที'

const SCHEDULE_DESC =
  '09:00 - 10:30: วัดบางไผ่ พระอารามหลวง, 11:00 - 12:30: วัดลำโพ, 12:45 - 14:45: Wood Rather (พักทานมื้อเที่ยง), 15:15 - 16:45: วัดป่าเลไลยก์ (นนทบุรี)'

const PLACES = [
  {
    place_name: 'วัดบางไผ่ พระอารามหลวง',
    category: 'วัด',
    location: 'อำเภอบางบัวทอง, นนทบุรี',
    description:
      'ชมความงามของพระอุโบสถทองคำและโรงเรียนพระปริยัติธรรม',
    open_time: '08:00:00',
    close_time: '17:00:00',
  },
  {
    place_name: 'วัดลำโพ',
    category: 'วัด',
    location: 'อำเภอบางบัวทอง, นนทบุรี',
    description: 'วัดในเขตบางบัวทองที่มีพื้นที่กว้างขวางและสงบเงียบ',
    open_time: '08:00:00',
    close_time: '17:00:00',
  },
  {
    place_name: 'Wood Rather',
    category: 'คาเฟ่',
    location: 'อำเภอบางบัวทอง, นนทบุรี',
    description:
      'คาเฟ่ไม้ดีไซน์เก๋ที่มีพื้นที่กว้างขวางและมุมพักผ่อนเยอะ (พักทานมื้อเที่ยง)',
    open_time: '10:00:00',
    close_time: '20:00:00',
    skipInsert: true,
  },
  {
    place_name: 'วัดป่าเลไลยก์ (นนทบุรี)',
    category: 'วัด',
    location: 'อำเภอบางบัวทอง, นนทบุรี',
    description: 'วัดป่าบรรยากาศวิเวก เหมาะสำหรับผู้ต้องการความสงบ',
    open_time: '08:00:00',
    close_time: '17:00:00',
  },
]

async function ensurePlace(p) {
  const [rows] = await db.promise().query(
    'SELECT place_id FROM place WHERE place_name = ? LIMIT 1',
    [p.place_name]
  )
  if (rows.length) return rows[0].place_id

  if (p.skipInsert) {
    throw new Error(`ไม่พบสถานที่: ${p.place_name}`)
  }

  const [result] = await db.promise().query(
    `INSERT INTO place (place_name, category, location, description, open_time, close_time, entrepreneur_id)
     VALUES (?, ?, ?, ?, ?, ?, NULL)`,
    [
      p.place_name,
      p.category,
      p.location,
      p.description,
      p.open_time,
      p.close_time,
    ]
  )
  return result.insertId
}

async function main() {
  const [existing] = await db.promise().query(
    'SELECT recommend_id FROM recommend_trip WHERE trip_name = ? LIMIT 1',
    [TRIP_NAME]
  )
  if (existing.length) {
    console.log(`มีทริป "${TRIP_NAME}" อยู่แล้ว (recommend_id=${existing[0].recommend_id})`)
    process.exit(0)
  }

  const placeIds = []
  for (const p of PLACES) {
    const id = await ensurePlace(p)
    placeIds.push(id)
    console.log(`place: ${p.place_name} → place_id=${id}`)
  }

  const [tripResult] = await db.promise().query(
    `INSERT INTO recommend_trip (trip_name, description, status, trip_category)
     VALUES (?, ?, 'published', NULL)`,
    [TRIP_NAME, TRIP_DESC]
  )
  const recommendId = tripResult.insertId
  console.log(`recommend_trip → recommend_id=${recommendId}`)

  let seq = 1
  for (const placeId of placeIds) {
    await db.promise().query(
      `INSERT INTO recommend_trip_detail
       (recommend_id, place_id, sequence_order, day_index, day_title, description)
       VALUES (?, ?, ?, 1, ?, ?)`,
      [recommendId, placeId, seq, TRIP_NAME, SCHEDULE_DESC]
    )
    seq += 1
  }

  console.log(`เพิ่ม ${placeIds.length} จุดแวะใน recommend_trip_detail สำเร็จ`)
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

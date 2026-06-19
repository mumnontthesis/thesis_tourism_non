/**
 * เพิ่มทริป "สูดไอหมอก เดินสวนดอกไม้ พักใจในสวนสวย" (trip_category = NULL)
 * รัน: node scripts/seed-mist-garden-trip.js
 */
const db = require('../db')

const TRIP_NAME = 'สูดไอหมอก เดินสวนดอกไม้ พักใจในสวนสวย'
const TRIP_DESC =
  'เต็มอิ่มกับพื้นที่สีเขียวและบรรยากาศสุดผ่อนคลาย พารับละอองหมอกฟีลป่าดิบชื้น ชมบัวกระด้งยักษ์ และพักจิบกาแฟในสวนมินิมอลร่มรื่น'

const SCHEDULE_DESC =
  "09:30 - 11:30: Foreste' Cafe, 12:00 - 14:00: Horme Cafe (พักทานมื้อเที่ยง), 14:30 - 16:00: สวนมาลัยบัววิคตอเรีย, 16:30 - 17:30: อุทยานมกุฏรมยสราญ"

const PLACES = [
  { place_name: "Foreste' Cafe", skipInsert: true },
  { place_name: 'Horme Cafe', skipInsert: true },
  { place_name: 'สวนมาลัยบัววิคตอเรีย', skipInsert: true },
  {
    place_name: 'อุทยานมกุฏรมยสราญ',
    category: 'ธรรมชาติ',
    location: 'นนทบุรี',
    description:
      'ปิดท้ายทริปด้วยการเดินเล่นรับลมเย็นๆ ในพื้นที่สีเขียวหน้าศาลากลางจังหวัด',
    open_time: '06:00:00',
    close_time: '19:00:00',
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

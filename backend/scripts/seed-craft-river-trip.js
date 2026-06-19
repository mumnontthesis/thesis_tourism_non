/**
 * เพิ่มทริป "ล่องน้ำ นั่งคุย ตะลุยงานคราฟต์" (trip_category = NULL)
 * รัน: node scripts/seed-craft-river-trip.js
 */
const db = require('../db')

const TRIP_NAME = 'ล่องน้ำ นั่งคุย ตะลุยงานคราฟต์'
const TRIP_DESC =
  'ล่องเรือชมทัศนียภาพสองฝั่งน้ำเจ้าพระยา เดินชมวิถีชีวิตท่าน้ำนนท์ ศึกษางานหัตถกรรมดินเผา และพักคาเฟ่มินิมอลในสวนสวย | แนะนำการเดินทาง: เรือ (ช่วงแรก) และ รถส่วนตัว/แท็กซี่ (ช่วงหลังเพื่อเข้าสู่โรงงานป้าตุ่มและคาเฟ่) | รวมระยะเวลา 7 ชั่วโมง 15 นาที'

const SCHEDULE_DESC =
  '10:00 - 11:30: ล่องเรือเที่ยวรอบเมืองนนท์, 11:30 - 13:00: ท่าน้ำนนท์, 13:30 - 15:30: Horme Cafe (พักทานมื้อเที่ยง/ของว่าง), 15:45 - 17:15: โรงงานเครื่องปั้นดินเผาป้าตุ่ม'

const PLACE_NAMES = [
  'ล่องเรือเที่ยวรอบเมืองนนท์',
  'ท่าน้ำนนท์',
  'Horme Cafe',
  'โรงงานเครื่องปั้นดินเผาป้าตุ่ม',
]

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
  for (const name of PLACE_NAMES) {
    const [rows] = await db.promise().query(
      'SELECT place_id FROM place WHERE place_name = ? LIMIT 1',
      [name]
    )
    if (!rows.length) {
      throw new Error(`ไม่พบสถานที่: ${name}`)
    }
    placeIds.push(rows[0].place_id)
    console.log(`place: ${name} → place_id=${rows[0].place_id}`)
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

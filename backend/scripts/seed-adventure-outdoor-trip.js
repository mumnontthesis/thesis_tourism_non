/**
 * เพิ่มทริป "ปล่อยพลัง แอดเวนเจอร์กลางแจ้ง" (trip_category = NULL)
 * รัน: node scripts/seed-adventure-outdoor-trip.js
 */
const db = require('../db')

const TRIP = {
  trip_name: 'ปล่อยพลัง แอดเวนเจอร์กลางแจ้ง',
  description:
    'ทริปสายลุยสุดเอ็กซ์ตรีม ขับรถ ATV และเล่น Zip Line พร้อมแวะพักทานมื้ออร่อยในคาเฟ่มินิมอลท่ามกลางสวนสวย | แนะนำการเดินทาง: ช่วงแรกแนะนำเดินทางด้วยรถ/แท็กซี่เพื่อเข้าสู่กิจกรรม และช่วงต่อไปเข้าสวน/คาเฟ่ตามตาราง | รวมระยะเวลาโดยประมาณตามตาราง',
  schedule:
    '09:30 - 11:30 น. Saksiam Valley, 12:00 - 14:00 น. Horme Cafe (ทานอาหารเที่ยงเพื่อชาร์จพลัง), 14:30 - 16:30 น. สวนลุงหมง (Cafe & Bistro)',
  places: ['Saksiam Valley', 'Horme Cafe', 'สวนลุงหมง (Cafe & Bistro)'],
}

async function getPlaceId(name) {
  const [rows] = await db.promise().query(
    'SELECT place_id FROM place WHERE place_name = ? LIMIT 1',
    [name]
  )
  if (!rows.length) throw new Error(`ไม่พบสถานที่: ${name}`)
  return rows[0].place_id
}

async function main() {
  const [existing] = await db.promise().query(
    'SELECT recommend_id FROM recommend_trip WHERE trip_name = ? LIMIT 1',
    [TRIP.trip_name]
  )
  if (existing.length) {
    console.log(
      `ข้าม "${TRIP.trip_name}" — มีอยู่แล้ว (recommend_id=${existing[0].recommend_id})`
    )
    process.exit(0)
  }

  const placeIds = []
  for (const name of TRIP.places) {
    const id = await getPlaceId(name)
    placeIds.push(id)
    console.log(`  place: ${name} → place_id=${id}`)
  }

  const [tripResult] = await db.promise().query(
    `INSERT INTO recommend_trip (trip_name, description, status, trip_category)
     VALUES (?, ?, 'published', NULL)`,
    [TRIP.trip_name, TRIP.description]
  )
  const recommendId = tripResult.insertId
  console.log(`  recommend_trip → recommend_id=${recommendId}`)

  let seq = 1
  for (const placeId of placeIds) {
    await db.promise().query(
      `INSERT INTO recommend_trip_detail
       (recommend_id, place_id, sequence_order, day_index, day_title, description)
       VALUES (?, ?, ?, 1, ?, ?)`,
      [recommendId, placeId, seq, TRIP.trip_name, TRIP.schedule]
    )
    seq += 1
  }

  console.log(`  เพิ่ม ${placeIds.length} จุดแวะสำเร็จ`)
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})


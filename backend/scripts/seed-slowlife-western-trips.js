/**
 * เพิ่มทริปสโลว์ไลฟ์ + แรนช์ตะวันตก (trip_category = NULL)
 * รัน: node scripts/seed-slowlife-western-trips.js
 */
const db = require('../db')

const TRIPS = [
  {
    trip_name: 'สโลว์ไลฟ์ ในร่มไม้โบราณ',
    description:
      'ชวนไปพักผ่อนสายตากับคาเฟ่บรรยากาศโฮมมี่และสวนผลไม้ดั้งเดิมสไตล์นนทบุรี ล้อมรอบด้วยธรรมชาติอันร่มรื่น | แนะนำการเดินทาง: รถส่วนตัว หรือ มอเตอร์ไซค์ (เดินทางสะดวกในการเข้าซอยสวนขนานแท้) | รวมระยะเวลา 7.5 ชั่วโมง (รวมเวลาเดินทางระหว่างจุด)',
    schedule:
      '09:00 - 11:00: Horme Cafe, 11:30 - 14:00: บ้านมีสวน คาเฟ่ (ทานมื้อเที่ยง), 14:30 - 16:30: Slot Co-Working Space',
    places: ['Horme Cafe', 'บ้านมีสวน คาเฟ่', 'Slot Co-Working Space'],
  },
  {
    trip_name: 'เปิดวาร์ป ทุ่งนา แรนช์ตะวันตก',
    description:
      'เปลี่ยนบรรยากาศไปนั่งชิลล์ในคาเฟ่ดีไซน์เด่น ถ่ายรูปมุมไหนก็สวย ตั้งแต่ทุ่งนาเขียวขจีไปจนถึงร้านตกแต่งสไตล์ตะวันตก | แนะนำการเดินทาง: รถส่วนตัว (แต่ละจุดมีพื้นที่จอดรถกว้างขวาง เหมาะกับสายขับรถเที่ยว) | รวมระยะเวลา 7.5 ชั่วโมง (รวมเวลาเดินทางระหว่างจุด)',
    schedule:
      '09:30 - 11:30: Záda.space, 12:00 - 14:30: PATA Plantation (ทานมื้อเที่ยง), 15:00 - 17:00: Wood Rather',
    places: ['Záda.space', 'PATA Plantation', 'Wood Rather'],
  },
]

async function getPlaceId(name) {
  const [rows] = await db.promise().query(
    'SELECT place_id FROM place WHERE place_name = ? LIMIT 1',
    [name]
  )
  if (!rows.length) throw new Error(`ไม่พบสถานที่: ${name}`)
  return rows[0].place_id
}

async function seedTrip(trip) {
  const [existing] = await db.promise().query(
    'SELECT recommend_id FROM recommend_trip WHERE trip_name = ? LIMIT 1',
    [trip.trip_name]
  )
  if (existing.length) {
    console.log(`ข้าม "${trip.trip_name}" — มีอยู่แล้ว (recommend_id=${existing[0].recommend_id})`)
    return
  }

  const placeIds = []
  for (const name of trip.places) {
    const id = await getPlaceId(name)
    placeIds.push(id)
    console.log(`  place: ${name} → place_id=${id}`)
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

async function main() {
  for (const trip of TRIPS) {
    console.log(`\n--- ${trip.trip_name} ---`)
    await seedTrip(trip)
  }
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

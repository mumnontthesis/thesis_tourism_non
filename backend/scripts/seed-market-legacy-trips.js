/**
 * เพิ่มทริปแนวย้อนยุค/ตลาด (trip_category = NULL)
 * รัน: node scripts/seed-market-legacy-trips.js
 */
const db = require('../db')

const TRIPS = [
  {
    trip_name: 'ตลาดน้ำย้อนยุค บรรยากาศอบอุ่น',
    description:
      'ตะลุยช้อปของกินจากเรือพายชาวบ้านในตลาดน้ำชุมชน 3 แห่ง พร้อมแวะเช็กอินคาเฟ่ไม้ดีไซน์เก๋ระหว่างทาง',
    schedule:
      '09:00 - 10:30 น. ตลาดน้ำวัดตะเคียน, 11:00 - 12:30 น. ตลาดน้ำประชารัฐวัดโตนด, 12:45 - 14:15 น. Wood Rather, 14:45 - 16:30 น. ตลาดน้ำไทรน้อย',
    places: [
      'ตลาดน้ำวัดตะเคียน',
      'ตลาดน้ำประชารัฐวัดโตนด',
      'Wood Rather',
      'ตลาดน้ำไทรน้อย',
    ],
  },
  {
    trip_name: 'ท่องตลาดเก่า เล่าความอร่อยยามเย็น',
    description:
      'เอาใจสายกินตั้งแต่บ่ายยันค่ำ ทัวร์ของอร่อยเจ้าเก่าระดับตำนาน แวะพักดื่มเครื่องดื่มในบ้านไม้ริมน้ำสุดโฮมมี่ ก่อนไปปิดท้ายที่ตลาดนัดกลางคืน',
    schedule:
      '13:00 - 14:30 น. ตลาดเก่าท่าน้ำนนท์, 14:45 - 16:15 น. รำไร, 16:45 - 18:15 น. ตลาดบางใหญ่, 18:30 - 20:30 น. ตลาดนกฮูก',
    places: ['ตลาดเก่าท่าน้ำนนท์', 'รำไร', 'ตลาดบางใหญ่', 'ตลาดนกฮูก'],
  },
]

async function getPlaceId(placeName) {
  const [rows] = await db.promise().query(
    'SELECT place_id FROM place WHERE place_name = ? LIMIT 1',
    [placeName]
  )
  if (!rows.length) throw new Error(`ไม่พบสถานที่: ${placeName}`)
  return rows[0].place_id
}

async function seedTrip(trip) {
  const [existing] = await db.promise().query(
    'SELECT recommend_id FROM recommend_trip WHERE trip_name = ? LIMIT 1',
    [trip.trip_name]
  )
  if (existing.length) {
    console.log(`ข้าม "${trip.trip_name}" — มีอยู่แล้ว`)
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


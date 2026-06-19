/**
 * เพิ่มทริปตามรอยวัฒนธรรมรามัญ + ล่องเรือลัดเลาะ (trip_category = NULL)
 * รัน: node scripts/seed-mon-culture-trips.js
 */
const db = require('../db')

const TRIPS = [
  {
    trip_name: 'ตามรอยวัฒนธรรมรามัญ',
    description:
      'เจาะลึกวิถีชีวิตชาวมอญบนเกาะเกร็ด ชมโบสถ์เก่าแก่และศิลปะการแกะสลักดินเผาอันเลื่องชื่อ แวะเติมพลังที่คาเฟ่ริมน้ำในบ้านไม้โบราณ | แนะนำการเดินทาง: เดินเท้า หรือ ปั่นจักรยาน (บนเกาะเกร็ด) | รวมระยะเวลา 7.5 ชั่วโมง (รวมเวลาเดินทางข้ามฟาก)',
    schedule:
      '09:00 - 10:30: วัดเสาธงทอง, 10:45 - 12:15: วัดไผ่ล้อม, 12:30 - 14:00: หมู่บ้านเครื่องปั้นดินเผา, 14:15 - 16:30: รำไร (ทานมื้อเที่ยงควบมื้อบ่าย)',
    places: ['วัดเสาธงทอง', 'วัดไผ่ล้อม', 'หมู่บ้านเครื่องปั้นดินเผา', 'รำไร'],
  },
  {
    trip_name: 'ล่องเรือลัดเลาะ เสาะหาขนมหวาน',
    description:
      'ทริปนั่งเรือกินลมชมวิวรอบเกาะเกร็ด แวะชิมขนมมงคลโบราณ ชมโบสถ์มหาอุตม์สุด Unseen และพักผ่อนในร้านอาหารริมสระบัว | แนะนำการเดินทาง: เรือ (ช่วงแรกบนเกาะเกร็ด) และ รถส่วนตัว/แท็กซี่ (ช่วงหลังข้ามฟากไป Slot Co-Working Space)',
    schedule:
      '09:30 - 11:30: คลองขนมหวาน, 11:45 - 13:15: วัดฉิมพลีสุทธาวาส, 13:30 - 15:00: บ้านเลขที่ ๑, 15:30 - 17:30: Slot Co-Working Space',
    places: [
      'คลองขนมหวาน',
      'วัดฉิมพลีสุทธาวาส',
      'บ้านเลขที่ ๑',
      'Slot Co-Working Space',
    ],
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

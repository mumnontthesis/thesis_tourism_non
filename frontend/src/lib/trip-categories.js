/** หมวดแผนเที่ยว — ค่า id เก็บใน recommend_trip.trip_category */
export const TRIP_CATEGORIES = [
  {
    id: "pak-kret",
    label: "เที่ยวปากเกร็ด",
    description: "สัมผัสวัฒนธรรมมอญ เครื่องปั้นดินเผา และตลาดริมน้ำ",
    color: "bg-primary",
  },
  {
    id: "temple",
    label: "สายมู",
    description: "ชมวัดสวย สถาปัตยกรรมไทย และวัฒนธรรมพุทธศาสนา",
    color: "bg-secondary",
  },
  {
    id: "dhamma",
    label: "สายธรรมะ",
    description: "ทำบุญ ปฏิบัติธรรม และหาความสงบภายใน",
    color: "bg-accent",
  },
  {
    id: "community",
    label: "วิถีชุมชน",
    description: "เรียนรู้วิถีชีวิต อาชีพ และวัฒนธรรมท้องถิ่น",
    color: "bg-emerald-500",
  },
  {
    id: "cafe",
    label: "คาเฟ่น่านั่ง",
    description: "คาเฟ่บรรยากาศดี เครื่องดื่มอร่อย เหมาะพักผ่อน",
    color: "bg-amber-500",
  },
  {
    id: "nature",
    label: "ธรรมชาติ",
    description: "สวนสาธารณะ ป่า และพื้นที่สีเขียวใจกลางเมือง",
    color: "bg-green-500",
  },
  {
    id: "shopping",
    label: "ช้อปปิ้ง",
    description: "ห้างสรรพสินค้า ตลาดนัด และแหล่งช้อปปิ้ง",
    color: "bg-pink-500",
  },
  {
    id: "activities",
    label: "กิจกรรมสนุก",
    description: "สถานที่ออกกำลังกาย กีฬา และกิจกรรมบันเทิง",
    color: "bg-orange-500",
  },
]

const labelById = Object.fromEntries(TRIP_CATEGORIES.map((c) => [c.id, c.label]))

export function getTripCategoryLabel(categoryId) {
  if (!categoryId) return ""
  const key = String(categoryId).trim()
  return labelById[key] || key
}

export function isValidTripCategoryId(categoryId) {
  return TRIP_CATEGORIES.some((c) => c.id === categoryId)
}

/** @deprecated ใช้ TRIP_CATEGORIES แทน */
export const tripCategories = TRIP_CATEGORIES

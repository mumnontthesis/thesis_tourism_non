import { API_BASE_URL } from "./api.js"

const STORAGE_KEY = "homepage_hot_places_v1"
const RETURN_FLAG_KEY = "homepage_hot_places_return"
const RETURN_SNAPSHOT_KEY = "homepage_hot_places_snapshot"
const SCROLL_KEY = "homepage_hot_places_scroll_y"

let memoryCache = null
let inflight = null

export const HOT_PLACES_SECTION_ID = "hot-places"

function isReload() {
  if (typeof window === "undefined") return false
  return performance.getEntriesByType("navigation")[0]?.type === "reload"
}

if (typeof window !== "undefined" && isReload()) {
  sessionStorage.removeItem(STORAGE_KEY)
  sessionStorage.removeItem(RETURN_FLAG_KEY)
  sessionStorage.removeItem(RETURN_SNAPSHOT_KEY)
  sessionStorage.removeItem(SCROLL_KEY)
}

function readStorage(key) {
  try {
    const raw = sessionStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : null
  } catch {
    return null
  }
}

function writeStorage(key, places) {
  try {
    sessionStorage.setItem(key, JSON.stringify(places))
  } catch {
    /* ignore */
  }
}

export function peekHotPlaces() {
  return memoryCache || readStorage(STORAGE_KEY)
}

/** ใช้ตอนกลับจากหน้ารายละเอียด — อ่าน snapshot ที่แช่แข็งไว้ก่อน */
export function peekHotPlacesForRestore() {
  if (sessionStorage.getItem(RETURN_FLAG_KEY) !== "1") return null
  return readStorage(RETURN_SNAPSHOT_KEY) || peekHotPlaces()
}

/** บันทึกรายการปัจจุบันลง memory + sessionStorage */
export function persistHotPlaces(places) {
  if (!Array.isArray(places) || places.length === 0) return
  memoryCache = places
  writeStorage(STORAGE_KEY, places)
}

export function clearHotPlacesCache() {
  memoryCache = null
  inflight = null
  sessionStorage.removeItem(STORAGE_KEY)
  sessionStorage.removeItem(RETURN_FLAG_KEY)
  sessionStorage.removeItem(RETURN_SNAPSHOT_KEY)
  sessionStorage.removeItem(SCROLL_KEY)
}

/** เรียกก่อนออกจาก homepage ไปหน้าสถานที่ — บันทึกรายการ + scroll */
export function markHotPlacesReturn(places) {
  const snapshot =
    Array.isArray(places) && places.length > 0 ? places : peekHotPlaces()
  if (snapshot?.length) {
    persistHotPlaces(snapshot)
    writeStorage(RETURN_SNAPSHOT_KEY, snapshot)
  }
  sessionStorage.setItem(RETURN_FLAG_KEY, "1")
  sessionStorage.setItem(SCROLL_KEY, String(window.scrollY))
}

/** อ่านว่ากำลังกลับจากหน้าสถานที่หรือไม่ (ยังไม่ลบ flag) */
export function peekHotPlacesReturn() {
  if (sessionStorage.getItem(RETURN_FLAG_KEY) !== "1") {
    return null
  }
  const y = Number(sessionStorage.getItem(SCROLL_KEY) || "0")
  return Number.isFinite(y) ? y : 0
}

export function isRestoringHotPlaces() {
  return sessionStorage.getItem(RETURN_FLAG_KEY) === "1"
}

export function clearHotPlacesReturn() {
  sessionStorage.removeItem(RETURN_FLAG_KEY)
  sessionStorage.removeItem(RETURN_SNAPSHOT_KEY)
  sessionStorage.removeItem(SCROLL_KEY)
}

function mapHotPlaceRow(p) {
  const open = p.open_time ? String(p.open_time).slice(0, 5) : "-"
  const close = p.close_time ? String(p.close_time).slice(0, 5) : "-"
  return {
    id: p.place_id,
    name: p.place_name,
    category: p.category || "อื่นๆ",
    rating: Number(p.rating || 0),
    reviews: Number(p.reviews || 0),
    image: p.image_url || "/placeholder.svg",
    description: p.description || p.location || "ไม่มีรายละเอียด",
    openTime: `${open} - ${close}`,
    trending: Number(p.rating || 0) >= 4.5,
  }
}

export async function loadHotPlaces({ forceRefresh = false } = {}) {
  if (forceRefresh) {
    clearHotPlacesCache()
  } else {
    const restoring = peekHotPlacesForRestore()
    if (restoring) {
      memoryCache = restoring
      return restoring
    }
    if (memoryCache) return memoryCache
    const stored = readStorage(STORAGE_KEY)
    if (stored) {
      memoryCache = stored
      return memoryCache
    }
    if (inflight) return inflight
  }

  inflight = (async () => {
    const res = await fetch(`${API_BASE_URL}/places/hot-random?limit=6`)
    const data = await res.json()
    if (!res.ok || !data?.success) {
      throw new Error(data?.message || "โหลดสถานที่ฮิตไม่สำเร็จ")
    }
    const mapped = (data.data || []).map(mapHotPlaceRow)
    persistHotPlaces(mapped)
    return mapped
  })()

  try {
    return await inflight
  } finally {
    inflight = null
  }
}

export function shouldForceRefreshHotPlaces() {
  return isReload()
}

export function hasHotPlacesCached() {
  return Boolean(peekHotPlaces())
}

export function hasStaleReturnFlag() {
  return isRestoringHotPlaces() && !hasHotPlacesCached()
}

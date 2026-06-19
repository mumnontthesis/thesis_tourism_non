const STORAGE_KEY = "tripNavigationProgress";

export function getTripNavKey(trip) {
  if (trip?.id != null) return String(trip.id);
  return trip?.name?.trim() || "default";
}

export function getTripNavKeyFromParams(tripId, tripName) {
  if (tripId) return String(tripId);
  return tripName?.trim() || "default";
}

export function loadTripNavProgress(key) {
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return all[key] || null;
  } catch {
    return null;
  }
}

export function hasTripNavProgress(key) {
  return hasResumableTripNavProgress(key);
}

/** มีเส้นทางเดิมที่กลับมาต่อได้ (เคยเปิดหน้านำทางและบันทึกลำดับสถานที่ไว้) */
export function hasResumableTripNavProgress(key) {
  const saved = loadTripNavProgress(key);
  if (!saved || !Array.isArray(saved.places) || saved.places.length === 0) {
    return false;
  }

  return (
    Boolean(saved.hasStarted) ||
    Number(saved.currentPlaceIndex) > 0 ||
    Number(saved.currentStepIndex) > 0 ||
    Boolean(saved.isNavigating) ||
    Boolean(saved.updatedAt)
  );
}

export function saveTripNavProgress(key, data) {
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    all[key] = { ...data, updatedAt: Date.now() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // ignore
  }
}

export function clearTripNavProgress(key) {
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    delete all[key];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // ignore
  }
}

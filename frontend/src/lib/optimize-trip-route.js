export function parseCoordsFromLocation(location) {
  if (!location) return null;
  const trimmed = String(location).trim();
  const match = trimmed.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if (!match) return null;
  const lat = Number(match[1]);
  const lng = Number(match[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

export function haversineKm(from, to) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(to.lat - from.lat);
  const dLng = toRad(to.lng - from.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** เรียงสถานที่แบบ greedy nearest-neighbor จากจุดเริ่มต้น */
export function orderPlacesNearestNeighbor(origin, places) {
  const withCoords = places.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
  const withoutCoords = places.filter((p) => !Number.isFinite(p.lat) || !Number.isFinite(p.lng));

  const remaining = [...withCoords];
  const ordered = [];
  let current = origin;

  while (remaining.length > 0) {
    let bestIndex = 0;
    let bestDistance = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const distance = haversineKm(current, {
        lat: remaining[i].lat,
        lng: remaining[i].lng,
      });
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = i;
      }
    }

    const next = remaining.splice(bestIndex, 1)[0];
    ordered.push(next);
    current = { lat: next.lat, lng: next.lng };
  }

  return [...ordered, ...withoutCoords];
}

export function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("เบราว์เซอร์ไม่รองรับการระบุตำแหน่ง"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }),
      () =>
        reject(
          new Error("ไม่สามารถดึงตำแหน่งปัจจุบันได้ กรุณาอนุญาตการเข้าถึงตำแหน่ง")
        ),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
  });
}

function resolvePlaceFromCatalog(id, placeCatalog, catalogPlaces) {
  const key = String(id);
  const fromMap = placeCatalog.get(key);
  if (fromMap) return fromMap;
  return catalogPlaces.find((p) => String(p.id) === key) || null;
}

async function fetchResolvedPlaceCoords(placeIds, apiBaseUrl) {
  const res = await fetch(
    `${apiBaseUrl}/places/resolve-coords?ids=${placeIds.map(String).join(",")}`
  );
  const data = await res.json();
  if (!res.ok || !data?.success || !Array.isArray(data.data)) {
    throw new Error(data?.message || "ไม่สามารถดึงพิกัดสถานที่ได้");
  }
  return new Map(data.data.map((row) => [String(row.place_id), row]));
}

export async function optimizeTripPlaceNames(trip, catalogPlaces, placeCatalog, apiBaseUrl) {
  const placeIds = trip?.placeIds || [];
  if (placeIds.length === 0) return [];

  const userPos = await getCurrentPosition();
  const resolvedById = await fetchResolvedPlaceCoords(placeIds, apiBaseUrl);

  const places = placeIds
    .map((id) => {
      const catalog = resolvePlaceFromCatalog(id, placeCatalog, catalogPlaces);
      const resolved = resolvedById.get(String(id));
      const catalogCoords = catalog
        ? parseCoordsFromLocation(catalog.location || catalog.area || "")
        : null;

      const lat = resolved?.lat ?? catalog?.lat ?? catalogCoords?.lat ?? null;
      const lng = resolved?.lng ?? catalog?.lng ?? catalogCoords?.lng ?? null;

      return {
        id: String(id),
        name: catalog?.name || resolved?.place_name || `สถานที่ ${id}`,
        lat,
        lng,
      };
    })
    .filter(Boolean);

  const withCoords = places.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
  if (withCoords.length === 0) {
    throw new Error(
      "ไม่พบพิกัดสถานที่ ไม่สามารถคำนวณเส้นทางใหม่ได้ กรุณาตรวจสอบที่อยู่สถานที่หรือบันทึกพิกัด lat,lng"
    );
  }

  if (withCoords.length < places.length) {
    const missingNames = places
      .filter((p) => !Number.isFinite(p.lat) || !Number.isFinite(p.lng))
      .map((p) => p.name)
      .join(", ");
    console.warn(`ข้ามสถานที่ที่ไม่มีพิกัด: ${missingNames}`);
  }

  const ordered = orderPlacesNearestNeighbor(userPos, places);
  return ordered.map((p) => p.name);
}

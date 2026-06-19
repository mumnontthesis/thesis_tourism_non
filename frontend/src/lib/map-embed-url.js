const NONTHABURI_FALLBACK = "จังหวัดนนทบุรี ประเทศไทย"

export function buildMapEmbedUrl(coords, zoom = 15) {
  if (coords && Number.isFinite(coords.lat) && Number.isFinite(coords.lng)) {
    return `https://www.google.com/maps?hl=th&q=${coords.lat},${coords.lng}&z=${zoom}&output=embed`
  }
  const q = encodeURIComponent(NONTHABURI_FALLBACK)
  return `https://www.google.com/maps?hl=th&q=${q}&z=11&output=embed`
}

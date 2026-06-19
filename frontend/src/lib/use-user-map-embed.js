import { useEffect, useMemo, useState } from "react"
import { getCurrentPosition } from "./optimize-trip-route"
import { buildMapEmbedUrl } from "./map-embed-url"

export function useUserMapEmbed() {
  const [coords, setCoords] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false

    getCurrentPosition()
      .then((pos) => {
        if (!cancelled) setCoords(pos)
      })
      .catch(() => {
        // ใช้ fallback จังหวัดนนทบุรีเมื่อไม่ได้รับสิทธิ์ตำแหน่ง
      })
      .finally(() => {
        if (!cancelled) setReady(true)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const embedUrl = useMemo(() => buildMapEmbedUrl(coords), [coords])

  return { embedUrl, ready, coords }
}

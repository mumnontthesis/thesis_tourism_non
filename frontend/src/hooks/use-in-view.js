import { useEffect, useRef, useState } from "react"

/** โหลดเนื้อหาเมื่อเลื่อนใกล้ถึง (ครั้งเดียว) */
export function useInView(options = {}) {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el || inView) return undefined

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          observer.disconnect()
        }
      },
      {
        rootMargin: options.rootMargin ?? "280px 0px",
        threshold: options.threshold ?? 0.01,
      }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [inView, options.rootMargin, options.threshold])

  return [ref, inView]
}

"use client"

import { useEffect, useState } from "react"
import { Star } from "lucide-react"
import { Button } from "./ui/button.tsx"
import { Badge } from "./ui/badge.tsx"
import { Link } from "react-router-dom"
import { useUserMapEmbed } from "../lib/use-user-map-embed"

import { API_BASE_URL } from "../lib/api.js"

function MapCardSkeleton() {
  return (
    <div className="rounded-2xl border border-white/40 bg-white/90 p-5 shadow-lg animate-pulse">
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="h-24 w-full shrink-0 rounded-xl bg-stone-200 sm:w-24" />
        <div className="flex-1 space-y-2">
          <div className="h-5 w-3/4 rounded bg-stone-200" />
          <div className="h-4 w-1/3 rounded bg-stone-200" />
          <div className="h-10 w-full rounded bg-stone-100" />
        </div>
      </div>
    </div>
  )
}

export function MapSection() {
  const [selectedCategory, setSelectedCategory] = useState("all")
  const { embedUrl: mapEmbedUrl, ready: mapEmbedReady, coords: userCoords } = useUserMapEmbed()
  const [places, setPlaces] = useState([])
  const [loading, setLoading] = useState(true)

  const categories = [
    { id: "all", label: "ทั้งหมด" },
    { id: "คาเฟ่", label: "คาเฟ่" },
    { id: "restaurant", label: "ร้านอาหาร" },
    { id: "temple", label: "วัด/สายบุญ" },
    { id: "museum", label: "พิพิธภัณฑ์" },
    { id: "todo", label: "กิจกรรม" },
    { id: "hidden", label: "วิถีชุมชน" },
  ]

  useEffect(() => {
    const controller = new AbortController()

    const loadPlaces = async () => {
      setLoading(true)
      try {
        const q = new URLSearchParams({
          category: selectedCategory,
          limit: "3",
        })
        const res = await fetch(`${API_BASE_URL}/places/map-cards?${q.toString()}`, {
          signal: controller.signal,
        })
        const data = await res.json()
        if (!res.ok || !data?.success || !Array.isArray(data.data)) {
          throw new Error("โหลดสถานที่ไม่สำเร็จ")
        }

        const mapped = data.data.map((p) => ({
          id: p.place_id,
          name: p.place_name || "ไม่ระบุชื่อสถานที่",
          rating: Number(p.rating || 0),
          reviews: Number(p.reviews || 0),
          description: p.description || p.location || "ไม่มีรายละเอียด",
          tags: [p.category || "สถานที่ท่องเที่ยว", "นนทบุรี"],
          image: p.image_url || "/placeholder.svg",
        }))
        setPlaces(mapped)
      } catch (e) {
        if (e?.name !== "AbortError") setPlaces([])
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    loadPlaces()
    return () => controller.abort()
  }, [selectedCategory])

  return (
    <section id="map" className="relative h-[600px] lg:h-[700px]">
      <div className="absolute inset-0 z-0 w-full h-full bg-stone-200">
        {mapEmbedReady ? (
          <iframe
            title={userCoords ? "แผนที่ตำแหน่งปัจจุบัน" : "แผนที่จังหวัดนนทบุรี"}
            src={mapEmbedUrl}
            className="absolute inset-0 h-full w-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-stone-500">
            กำลังระบุตำแหน่งของคุณ...
          </div>
        )}
      </div>

      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 w-full max-w-3xl px-4">
        <div className="bg-white/80 backdrop-blur-md border border-white/40 shadow-lg rounded-full p-2">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? "secondary" : "ghost"}
                className={`rounded-full whitespace-nowrap flex-shrink-0 ${
                  selectedCategory === category.id
                    ? "bg-stone-700 text-white hover:bg-stone-800"
                    : "text-stone-700 hover:bg-white/60"
                }`}
                onClick={() => setSelectedCategory(category.id)}
              >
                {category.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-10 max-h-[50vh] overflow-y-auto">
        <div className="container mx-auto px-4 pb-6 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {loading
              ? [1, 2, 3].map((n) => <MapCardSkeleton key={n} />)
              : places.map((place) => (
                  <Link
                    key={place.id}
                    to={`/place/${place.id}`}
                    className="bg-white/90 backdrop-blur-md border border-white/40 rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all hover:bg-white/95"
                  >
                    <div className="flex flex-col sm:flex-row gap-4 p-5">
                      <div className="w-full sm:w-24 h-24 bg-stone-200 rounded-xl flex-shrink-0 overflow-hidden">
                        <img
                          src={place.image || "/placeholder.svg"}
                          alt={place.name}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-lg text-stone-900 mb-1">{place.name}</h3>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold text-stone-900">{place.rating}</span>
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm text-stone-600">({place.reviews} รีวิว)</span>
                        </div>
                        <p className="text-sm text-stone-600 leading-relaxed mb-3 line-clamp-2">
                          {place.description}
                        </p>

                        <div className="flex gap-2 flex-wrap">
                          {place.tags.map((tag, idx) => (
                            <Badge
                              key={idx}
                              variant="secondary"
                              className="bg-stone-200/80 text-stone-700 hover:bg-stone-300 rounded-full text-xs"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}

            {!loading && places.length === 0 && (
              <div className="col-span-full rounded-xl bg-white/85 p-4 text-center text-sm text-stone-600">
                ไม่พบสถานที่ในหมวดนี้
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

"use client"

import { useEffect, useState } from "react"
import { MapPin, Star, Navigation, Search, Menu, X } from "lucide-react"
import { Button } from "./ui/button.tsx"
import { Badge } from "./ui/badge.tsx"
import { Input } from "./ui/input.tsx"
import { Link } from "react-router-dom"
import { useUserMapEmbed } from "../lib/use-user-map-embed"

import { API_BASE_URL } from "../lib/api.js"

const MAP_CATEGORIES = [
  { id: "all", label: "ทั้งหมด" },
  { id: "คาเฟ่", label: "คาเฟ่" },
  { id: "restaurant", label: "ร้านอาหาร" },
  { id: "temple", label: "วัด/สายบุญ" },
  { id: "museum", label: "พิพิธภัณฑ์" },
  { id: "todo", label: "กิจกรรม" },
  { id: "hidden", label: "วิถีชุมชน" },
]

export function MapSectionSidebar() {
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [selectedPlace, setSelectedPlace] = useState(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [places, setPlaces] = useState([])
  const [loading, setLoading] = useState(true)
  const { embedUrl: mapEmbedUrl, ready: mapEmbedReady, coords: userCoords } = useUserMapEmbed()

  useEffect(() => {
    const controller = new AbortController()

    const loadPlaces = async () => {
      setLoading(true)
      try {
        const q = new URLSearchParams({
          category: selectedCategory,
          limit: "12",
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
          category: selectedCategory,
        }))
        setPlaces(mapped)
        setSelectedPlace((prev) => (mapped.some((place) => place.id === prev) ? prev : null))
      } catch (e) {
        if (e?.name !== "AbortError") setPlaces([])
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    loadPlaces()
    return () => controller.abort()
  }, [selectedCategory])

  const filteredPlaces = places.filter((place) => {
    const matchesSearch = place.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
  })

  const activePlace = filteredPlaces.find((place) => place.id === selectedPlace)

  return (
    <section id="map-sidebar" className="relative h-[600px] lg:h-[700px]">
      <div
        className={`absolute top-0 left-0 bottom-0 w-full md:w-96 lg:w-[28rem] bg-white border-r border-stone-200 flex flex-col overflow-hidden z-30 transition-transform duration-300 ease-in-out shadow-xl ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-4 border-b border-stone-200 bg-stone-50">
          <div className="flex items-center gap-3 mb-3">
            <Button size="sm" variant="ghost" onClick={() => setIsSidebarOpen(false)} className="flex-shrink-0">
              <X className="w-5 h-5" />
            </Button>
            <h3 className="font-bold text-lg text-stone-900">สถานที่ท่องเที่ยว</h3>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
            <Input
              type="text"
              placeholder="ค้นหาสถานที่..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11 rounded-full border-stone-300"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-3 space-y-3">
            {loading &&
              [1, 2, 3].map((n) => (
                <div key={n} className="p-4 rounded-xl border-2 border-stone-200 bg-white animate-pulse">
                  <div className="h-20 rounded-lg bg-stone-200" />
                </div>
              ))}

            {!loading &&
              filteredPlaces.map((place) => (
                <div
                  key={place.id}
                  onClick={() => setSelectedPlace(place.id)}
                  className={`p-4 rounded-xl border-2 transition-all cursor-pointer hover:shadow-md ${
                    selectedPlace === place.id
                      ? "border-emerald-500 bg-emerald-50 shadow-md"
                      : "border-stone-200 bg-white hover:border-emerald-300"
                  }`}
                >
                  <div className="flex gap-3">
                    <div className="w-20 h-20 bg-stone-200 rounded-lg flex-shrink-0 overflow-hidden">
                      <img
                        src={place.image || "/placeholder.svg"}
                        alt={place.name}
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-base text-stone-900 mb-1">{place.name}</h3>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold text-sm text-stone-900">{place.rating}</span>
                        <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                        <span className="text-xs text-stone-600">({place.reviews})</span>
                      </div>
                      <p className="text-xs text-stone-600 leading-relaxed line-clamp-2 mb-2">{place.description}</p>

                      <div className="flex gap-1.5 flex-wrap">
                        {place.tags.slice(0, 3).map((tag, idx) => (
                          <Badge
                            key={idx}
                            variant="secondary"
                            className="bg-stone-100 text-stone-700 text-[10px] px-2 py-0.5 rounded-full"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

            {!loading && filteredPlaces.length === 0 && (
              <div className="text-center py-12">
                <MapPin className="w-12 h-12 text-stone-300 mx-auto mb-3" />
                <p className="text-stone-500">ไม่พบสถานที่ท่องเที่ยว</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="relative w-full h-full">
        <div className="absolute top-4 left-4 right-4 z-20 flex flex-col gap-3">
          <Button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="self-start bg-white/95 backdrop-blur-sm hover:bg-white text-stone-900 shadow-lg border border-stone-200 rounded-full px-4 py-2"
          >
            <Menu className="w-5 h-5 mr-2" />
            <span className="font-medium">สถานที่ท่องเที่ยว</span>
          </Button>

          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {MAP_CATEGORIES.map((category) => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? "secondary" : "outline"}
                size="sm"
                className={`rounded-full whitespace-nowrap flex-shrink-0 shadow-md ${
                  selectedCategory === category.id
                    ? "bg-emerald-600 text-white hover:bg-emerald-700"
                    : "bg-white/95 backdrop-blur-sm text-stone-700 hover:bg-white border-stone-200"
                }`}
                onClick={() => setSelectedCategory(category.id)}
              >
                {category.label}
              </Button>
            ))}
          </div>
        </div>

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

        {activePlace && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-sm rounded-xl shadow-xl p-4 max-w-xs w-[90%] border border-stone-200 z-20">
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-bold text-lg">{activePlace.name}</h3>
              <Button size="sm" variant="ghost" onClick={() => setSelectedPlace(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <Button asChild className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-full">
              <Link to={`/place/${activePlace.id}`}>
                <Navigation className="w-4 h-4 mr-2" />
                ดูรายละเอียด
              </Link>
            </Button>
          </div>
        )}
      </div>
    </section>
  )
}

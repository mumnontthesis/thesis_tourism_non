"use client"

import { useEffect, useState } from "react"
import {
  Clock,
  MapPin,
  Users,
  Camera,
  Sparkles,
  Heart,
  TreePine,
  Coffee,
  Leaf,
  ShoppingBag,
  Activity,
} from "lucide-react"
import { Button } from "./ui/button.tsx"
import { Card, CardContent } from "./ui/card.tsx"
import { Link, useNavigate } from "react-router-dom"
import { TRIP_CATEGORIES, getTripCategoryLabel } from "../lib/trip-categories"

import { API_BASE_URL } from "../lib/api.js"

/** แบนเนอร์หมุน 4 ภาพ — ไฟล์วางที่ frontend/public (JPG ตามชื่อไฟล์ที่อัปโหลด) */
const TRIP_HERO_BANNER_IMAGES = [
  "/IMG_4180.JPG",
  "/IMG_4181.JPG",
  "/IMG_4183.JPG",
  "/IMG_4252.JPG",
]

const HERO_BANNER_ROTATE_MS = 8000

const CATEGORY_ICONS = {
  "pak-kret": Camera,
  temple: Sparkles,
  dhamma: Heart,
  community: TreePine,
  cafe: Coffee,
  nature: Leaf,
  shopping: ShoppingBag,
  activities: Activity,
}

/** หมวดบนหน้าเว็บ — id ตรงกับ recommend_trip.trip_category */
const tripCategories = TRIP_CATEGORIES.map((cat) => ({
  id: cat.id,
  title: cat.label,
  description: cat.description,
  color: cat.color,
  icon: CATEGORY_ICONS[cat.id] || Camera,
}))

export function TripRecommendations() {
  const navigate = useNavigate()
  const [selectedCategory, setSelectedCategory] = useState(tripCategories[0])
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState("")
  const [heroSlideIndex, setHeroSlideIndex] = useState(0)
  const [heroExtrasReady, setHeroExtrasReady] = useState(false)

  const handlePlanTripClick = (event) => {
    event.preventDefault()
    const savedUser = localStorage.getItem("user")
    navigate(savedUser ? "/create-trip" : "/login")
  }

  useEffect(() => {
    const schedule =
      typeof window.requestIdleCallback === "function"
        ? window.requestIdleCallback
        : (cb) => window.setTimeout(cb, 400)
    const cancel =
      typeof window.cancelIdleCallback === "function"
        ? window.cancelIdleCallback
        : window.clearTimeout
    const idleId = schedule(() => setHeroExtrasReady(true))
    return () => cancel(idleId)
  }, [])

  useEffect(() => {
    if (!heroExtrasReady || TRIP_HERO_BANNER_IMAGES.length <= 1) return undefined
    const id = window.setInterval(() => {
      setHeroSlideIndex((i) => (i + 1) % TRIP_HERO_BANNER_IMAGES.length)
    }, HERO_BANNER_ROTATE_MS)
    return () => window.clearInterval(id)
  }, [heroExtrasReady])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setFetchError("")
      try {
        const q = new URLSearchParams({ category: selectedCategory.id })
        const res = await fetch(`${API_BASE_URL}/trips/recommendations?${q.toString()}`)
        const data = await res.json()
        if (!res.ok || !data?.success) {
          throw new Error(data?.message || "โหลดแผนแนะนำไม่สำเร็จ")
        }
        setTrips(Array.isArray(data.data) ? data.data : [])
      } catch (e) {
        setFetchError(e?.message || "เกิดข้อผิดพลาด")
        setTrips([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [selectedCategory.id])

  return (
    <section
      id="trips"
      className="trip-hero-root bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/5"
    >
      {/* แบนเนอร์เต็มความกว้างขอบจอ — ภาพเต็มขอบ ไม่มีมุมโค้งในกรอบ container */}
      <div className="trip-hero-banner relative mb-12 md:mb-16 w-full overflow-hidden">
        <div className="absolute inset-0 z-0">
          {(heroExtrasReady ? TRIP_HERO_BANNER_IMAGES : TRIP_HERO_BANNER_IMAGES.slice(0, 1)).map((src, i) => (
            <img
              key={src}
              src={src}
              alt={
                i === heroSlideIndex
                  ? `แบนเนอร์แนะนำเที่ยวนนทบุรี — ภาพที่ ${i + 1} จาก ${TRIP_HERO_BANNER_IMAGES.length}`
                  : ""
              }
              aria-hidden={i !== heroSlideIndex}
              loading={i === 0 ? "eager" : "lazy"}
              decoding="async"
              className="trip-hero-slide-img absolute inset-0 h-full w-full object-cover object-center pointer-events-none"
              style={{
                opacity: i === heroSlideIndex ? 1 : 0,
                zIndex: i === heroSlideIndex ? 1 : 0,
              }}
            />
          ))}
        </div>
        <div className="trip-hero-gradient absolute inset-0 z-[1]" aria-hidden />
        {/* ข้อความลอยเหนือภาพ — แถบดำ 50% เต็มพื้นที่แถวนี้ (ไม่ blur) */}
        <div className="trip-hero-content relative z-20 w-full">
          <div
            className="pointer-events-none absolute inset-0 z-0 bg-black/50"
            aria-hidden
          />
          <div className="container relative z-10 mx-auto flex h-full w-full items-center px-4">
            <div className="trip-hero-inner">
              <div className="trip-hero-copy text-left [text-shadow:0_1px_12px_rgba(0,0,0,0.35)]">
                <h2 className="trip-hero-title font-serif font-bold text-white text-balance">
                  <span className="block">แนะนำเที่ยว</span>
                  <span className="block text-white">One Day Trip</span>
                </h2>
                <p className="trip-hero-lead max-w-lg font-sans leading-snug text-white">
                  เลือกเส้นทางท่องเที่ยวที่เหมาะกับคุณ พร้อมแผนการเที่ยวแบบเต็มวัน
                </p>
                <div className="trip-hero-cta-row">
                  <Link
                    to="/create-trip"
                    onClick={handlePlanTripClick}
                    className="trip-hero-plan-cta inline-flex items-center justify-center rounded-full bg-primary font-sans font-semibold text-white no-underline shadow-md transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
                  >
                    เริ่มวางแผนเที่ยว
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 pb-16 md:pb-24 pt-0">
        <div className="max-w-7xl mx-auto">
          {/* Category Tabs — grid 2 แถว / 4 คอลัมน์ (md+) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            {tripCategories.map((category) => {
              const Icon = category.icon
              const isActive = selectedCategory.id === category.id
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setSelectedCategory(category)}
                  className={`p-4 rounded-2xl border-2 transition-all ${
                    isActive
                      ? "border-primary bg-white shadow-lg scale-105"
                      : "border-stone-200 bg-white hover:border-primary/50 hover:shadow-md"
                  }`}
                >
                  <div
                    className={`w-10 h-10 ${category.color} rounded-xl flex items-center justify-center mx-auto mb-2`}
                  >
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1 text-sm md:text-base">{category.title}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2">{category.description}</p>
                </button>
              )
            })}
          </div>

          {/*
          Filter แบบเลื่อนซ้าย-ขวา (เก็บไว้ก่อน ไม่ลบ)
          <div className="-mx-4 px-4 mb-12">
            <div
              className="flex gap-4 overflow-x-auto pb-3 scroll-smooth snap-x snap-mandatory [-webkit-overflow-scrolling:touch] [scrollbar-width:thin]"
              style={{ scrollbarGutter: "stable" }}
            >
              {tripCategories.map((category) => {
                const Icon = category.icon
                const isActive = selectedCategory.id === category.id
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setSelectedCategory(category)}
                    className={`flex-shrink-0 w-[10.5rem] sm:w-44 snap-start text-left p-5 rounded-2xl border-2 transition-all ${
                      isActive
                        ? "border-primary bg-white shadow-lg ring-2 ring-primary/20"
                        : "border-stone-200 bg-white hover:border-primary/50 hover:shadow-md"
                    }`}
                  >
                    <div
                      className={`w-12 h-12 ${category.color} rounded-xl flex items-center justify-center mx-auto mb-3`}
                    >
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-1 text-sm leading-tight">{category.title}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2">{category.description}</p>
                  </button>
                )
              })}
            </div>
          </div>
          */}

          {/* Trip Cards — จาก recommend_trip (สถานะ published) */}
          {fetchError && (
            <p className="text-center text-destructive text-sm mb-6">{fetchError}</p>
          )}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8" aria-busy="true">
              {[1, 2].map((n) => (
                <div key={n} className="overflow-hidden rounded-xl border border-stone-200 bg-white animate-pulse">
                  <div className="h-64 bg-stone-200" />
                  <div className="p-6 space-y-3">
                    <div className="h-4 w-24 bg-stone-200 rounded-full" />
                    <div className="h-6 w-3/4 bg-stone-200 rounded" />
                    <div className="h-4 w-full bg-stone-100 rounded" />
                    <div className="h-10 w-full bg-stone-200 rounded-lg mt-4" />
                  </div>
                </div>
              ))}
            </div>
          ) : trips.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">
              ยังไม่มีแผนแนะนำในหมวดนี้ (ตั้งค่า trip_category ในแอดมินให้ตรงกับหมวดที่เลือก)
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {trips.map((trip) => (
                <Card
                  key={trip.recommend_id}
                  className="overflow-hidden border-stone-200 hover:shadow-xl transition-all hover:scale-[1.02]"
                >
                  <div className="relative h-64 bg-muted overflow-hidden">
                    <img
                      src={trip.cover_image_url || "/placeholder.svg"}
                      alt={trip.trip_name}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-full text-sm font-medium text-foreground shadow-md">
                      {trip.duration_label}
                    </div>
                  </div>

                  <CardContent className="p-6">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-primary/10 px-3 py-0.5 text-xs font-medium text-primary">
                        {getTripCategoryLabel(trip.trip_category) || selectedCategory.title}
                      </span>
                    </div>
                    <h4 className="font-bold text-xl text-foreground mb-3">{trip.trip_name}</h4>

                    <div className="flex items-center gap-4 mb-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{trip.duration_label}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        <span>{trip.stops} สถานที่</span>
                      </div>
                    </div>

                    {trip.description ? (
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-3">{trip.description}</p>
                    ) : null}

                    <div className="mb-4">
                      <p className="text-sm font-medium text-foreground mb-2">ไฮไลท์:</p>
                      <div className="flex flex-wrap gap-2">
                        {(trip.highlights || []).length === 0 ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : (
                          trip.highlights.map((highlight, i) => (
                            <span
                              key={i}
                              className="px-3 py-1 bg-primary/10 text-primary text-sm rounded-full font-medium"
                            >
                              {highlight}
                            </span>
                          ))
                        )}
                      </div>
                    </div>

                    <Link to={`/trip/${trip.recommend_id}`}>
                      <Button className="w-full bg-primary hover:bg-primary/90 text-white">ดูรายละเอียดเส้นทาง</Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <div className="mt-12 text-center">
            <Button
              asChild
              variant="outline"
              size="lg"
              className="gap-2 bg-white hover:bg-stone-50 border-stone-300"
            >
              <Link to="/all-trip">
                <Users className="w-5 h-5" />
                ดูเส้นทางทั้งหมด
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}

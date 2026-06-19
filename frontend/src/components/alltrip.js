"use client"

import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { MapPin } from "lucide-react"
import { Card, CardContent } from "./ui/card.tsx"
import { Badge } from "./ui/badge.tsx"
import { Button } from "./ui/button.tsx"
import { Header } from "./header"
import { getTripCategoryLabel } from "../lib/trip-categories"

import { API_BASE_URL } from "../lib/api.js"
const TRIP_HERO_BANNER_IMAGES = ["/IMG_4180.JPG", "/IMG_4181.JPG", "/IMG_4183.JPG", "/IMG_4252.JPG"]
const HERO_BANNER_ROTATE_MS = 8000

export function AllTripPage() {
  const [errorMessage, setErrorMessage] = useState("")
  const [allTrips, setAllTrips] = useState([])
  const [heroSlideIndex, setHeroSlideIndex] = useState(0)

  useEffect(() => {
    const loadAllTrips = async () => {
      setErrorMessage("")
      try {
        const res = await fetch(`${API_BASE_URL}/trips/recommendations`)
        const data = await res.json()
        if (!res.ok || !data?.success) {
          throw new Error(data?.message || "โหลดข้อมูลแผนเที่ยวไม่สำเร็จ")
        }
        const trips = Array.isArray(data.data)
          ? data.data.map((trip) => ({
              ...trip,
              trip_category: getTripCategoryLabel(trip.trip_category) || "แผนเที่ยว",
            }))
          : []
        setAllTrips(trips)
      } catch (error) {
        setErrorMessage(error?.message || "โหลดข้อมูลแผนเที่ยวไม่สำเร็จ")
        setAllTrips([])
      }
    }

    loadAllTrips()
  }, [])

  useEffect(() => {
    if (TRIP_HERO_BANNER_IMAGES.length <= 1) return undefined
    const id = window.setInterval(() => {
      setHeroSlideIndex((index) => (index + 1) % TRIP_HERO_BANNER_IMAGES.length)
    }, HERO_BANNER_ROTATE_MS)
    return () => window.clearInterval(id)
  }, [])

  const displayedTrips = useMemo(() => allTrips, [allTrips])

  return (
    <main className="min-h-screen bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/5">
      <Header />
      <section id="trips" className="trip-hero-root bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/5">
        <div className="trip-hero-banner relative mb-0 w-full overflow-hidden">
          <div className="absolute inset-0 z-0">
            {TRIP_HERO_BANNER_IMAGES.map((src, index) => (
              <img
                key={src}
                src={src}
                alt={
                  index === heroSlideIndex
                    ? `แบนเนอร์แนะนำเที่ยวนนทบุรี — ภาพที่ ${index + 1} จาก ${TRIP_HERO_BANNER_IMAGES.length}`
                    : ""
                }
                aria-hidden={index !== heroSlideIndex}
                loading={index === 0 ? "eager" : "lazy"}
                decoding="async"
                className="trip-hero-slide-img absolute inset-0 h-full w-full object-cover object-center pointer-events-none"
                style={{
                  opacity: index === heroSlideIndex ? 1 : 0,
                  zIndex: index === heroSlideIndex ? 1 : 0,
                }}
              />
            ))}
          </div>
          <div className="trip-hero-gradient absolute inset-0 z-[1]" aria-hidden />
          <div className="trip-hero-content relative z-20 w-full">
            <div className="pointer-events-none absolute inset-0 z-0 bg-black/50" aria-hidden />
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
      </section>
      <section className="container mx-auto px-4 pt-4 pb-14 md:pt-6 md:pb-16">
        {errorMessage ? <p className="mb-6 text-sm text-destructive">{errorMessage}</p> : null}

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-3">
          {displayedTrips.map((trip) => (
            <Card
              key={trip.recommend_id}
              className="group overflow-hidden border-border bg-card transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                <img
                  src={trip.cover_image_url || "/placeholder.svg"}
                  alt={trip.trip_name}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/70 to-transparent" />
                <div className="absolute bottom-3 left-3">
                  <Badge className="bg-card/90 text-card-foreground backdrop-blur-sm">
                    {trip.trip_category || "แผนเที่ยว"}
                  </Badge>
                </div>
              </div>

              <CardContent className="space-y-3 p-5">
                <h2 className="line-clamp-2 text-lg font-semibold text-card-foreground">{trip.trip_name}</h2>

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    <span>{trip.stops || 0} สถานที่</span>
                  </div>
                  <span>{trip.duration_label || "One Day Trip"}</span>
                </div>

                <Button asChild className="w-full bg-primary text-white hover:bg-primary/90">
                  <Link to={`/trip/${trip.recommend_id}`} state={{ trip }}>ดูรายละเอียดทริป</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  )
}

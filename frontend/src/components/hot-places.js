"use client"

import { useEffect, useRef, useState } from "react"
import { Star, MapPin, Clock, TrendingUp } from "lucide-react"
import { Card, CardContent } from "./ui/card.tsx"
import { Button } from "./ui/button.tsx"
import { Link } from "react-router-dom"
import {
  loadHotPlaces,
  markHotPlacesReturn,
  peekHotPlaces,
  peekHotPlacesForRestore,
  persistHotPlaces,
  shouldForceRefreshHotPlaces,
} from "../lib/hot-places-cache"

const MIN_SKELETON_MS = 150
const MIN_IMAGE_SKELETON_MS = 150

function HotPlaceCardSkeleton() {
  return (
    <Card className="overflow-hidden border-stone-200 animate-pulse">
      <div className="h-56 bg-stone-200" />
      <CardContent className="space-y-3 p-5">
        <div className="h-5 w-3/4 rounded bg-stone-200" />
        <div className="h-10 w-full rounded bg-stone-100" />
        <div className="h-4 w-1/2 rounded bg-stone-100" />
        <div className="h-9 w-full rounded bg-stone-200" />
      </CardContent>
    </Card>
  )
}

function HotPlaceCard({ place, onBeforeNavigate }) {
  const imgRef = useRef(null)
  const imageLoadStartedAt = useRef(Date.now())
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  const imageSrc = imageError ? "/placeholder.svg" : place.image || "/placeholder.svg"

  const revealImage = () => {
    const elapsed = Date.now() - imageLoadStartedAt.current
    const remain = Math.max(0, MIN_IMAGE_SKELETON_MS - elapsed)
    window.setTimeout(() => setImageLoaded(true), remain)
  }

  useEffect(() => {
    imageLoadStartedAt.current = Date.now()
    setImageLoaded(false)
    setImageError(false)

    const img = imgRef.current
    if (img?.complete && img.naturalWidth > 0) {
      revealImage()
    }
  }, [place.id, place.image])

  return (
    <Card className="overflow-hidden border-stone-200 hover:shadow-xl transition-all hover:scale-[1.02] group">
      <div className="relative h-56 bg-muted overflow-hidden">
        {!imageLoaded && (
          <div
            className="absolute inset-0 z-[1] bg-stone-200 animate-pulse"
            aria-hidden
          />
        )}
        <img
          ref={imgRef}
          src={imageSrc}
          alt={place.name}
          loading="eager"
          decoding="async"
          onLoad={revealImage}
          onError={() => {
            setImageError(true)
            revealImage()
          }}
          className={`h-full w-full object-cover transition-opacity duration-300 group-hover:scale-110 ${
            imageLoaded ? "opacity-100" : "opacity-0"
          }`}
        />
        {place.trending && imageLoaded && (
          <div className="absolute top-3 left-3 z-[2] bg-primary text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            กำลังฮิต
          </div>
        )}
        <div className="absolute top-3 right-3 z-[2] bg-white/95 backdrop-blur-sm px-2 py-1 rounded-lg flex items-center gap-1">
          <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
          <span className="font-semibold text-sm">{place.rating}</span>
        </div>
      </div>

      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-bold text-lg text-foreground">{place.name}</h3>
          <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">
            {place.category}
          </span>
        </div>

        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{place.description}</p>

        <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span>เปิดทำการ: {place.openTime}</span>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-stone-200">
          <div className="text-xs text-muted-foreground">
            {place.reviews.toLocaleString()} รีวิว
          </div>
          <Link
            to={`/place/${place.id}`}
            state={{ fromHotPlaces: true }}
            onClick={onBeforeNavigate}
          >
            <Button
              size="sm"
              variant="outline"
              className="text-primary border-primary hover:bg-primary/10 bg-transparent"
            >
              ดูรายละเอียด
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

function getInitialHotPlaces() {
  return peekHotPlacesForRestore() || peekHotPlaces() || []
}

export function HotPlaces() {
  const [hotPlaces, setHotPlaces] = useState(getInitialHotPlaces)
  const [loading, setLoading] = useState(() => getInitialHotPlaces().length === 0)
  const loadStartedAt = useRef(Date.now())

  useEffect(() => {
    if (hotPlaces.length > 0) {
      persistHotPlaces(hotPlaces)
    }
  }, [hotPlaces])

  useEffect(() => {
    let cancelled = false
    const forceRefresh = shouldForceRefreshHotPlaces()
    const cached = forceRefresh ? null : peekHotPlacesForRestore() || peekHotPlaces()

    if (cached?.length) {
      setHotPlaces(cached)
      setLoading(false)
      return undefined
    }

    setLoading(true)
    loadStartedAt.current = Date.now()

    loadHotPlaces({ forceRefresh })
      .then((data) => {
        if (cancelled) return
        const finish = () => {
          setHotPlaces(data)
          setLoading(false)
        }
        const remain = Math.max(0, MIN_SKELETON_MS - (Date.now() - loadStartedAt.current))
        window.setTimeout(finish, remain)
      })
      .catch(() => {
        if (!cancelled) {
          setHotPlaces([])
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  const handleBeforeNavigate = () => {
    markHotPlacesReturn(hotPlaces)
  }

  return (
    <section className="py-16 md:py-24 bg-white">
      <div className="container mx-auto px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full mb-4">
              <TrendingUp className="w-5 h-5 text-primary" />
              <span className="text-sm font-semibold text-primary">ยอดนิยม</span>
            </div>
            <h2 className="font-bold text-3xl md:text-5xl text-balance mb-4 text-foreground">
              สถานที่ฮิต<span className="text-primary">ในนนทบุรี</span>
            </h2>
            <p className="text-lg text-muted-foreground text-balance leading-relaxed">
              สถานที่ท่องเที่ยวยอดนิยมที่นักท่องเที่ยวแนะนำ
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {loading
              ? [1, 2, 3, 4, 5, 6].map((n) => <HotPlaceCardSkeleton key={n} />)
              : hotPlaces.map((place) => (
                  <HotPlaceCard
                    key={place.id}
                    place={place}
                    onBeforeNavigate={handleBeforeNavigate}
                  />
                ))}
          </div>

          <div className="text-center">
            <Button asChild size="lg" variant="outline" className="gap-2 bg-transparent">
              <Link to="/all-places">
                <MapPin className="w-5 h-5" />
                ดูสถานที่ทั้งหมด
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}

"use client"

import { useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { ChevronLeft, ChevronRight, Clock, MapPin, Star } from "lucide-react"
import { Card, CardContent } from "./ui/card.tsx"
import { Badge } from "./ui/badge.tsx"
import { Button } from "./ui/button.tsx"
import { Header } from "./header"

import { API_BASE_URL } from "../lib/api.js"
const PLACES_PER_PAGE = 12
const MIN_SKELETON_MS = 150

function mapPlaceRow(p) {
  const open = p.open_time ? String(p.open_time).slice(0, 5) : "-"
  const close = p.close_time ? String(p.close_time).slice(0, 5) : "-"
  return {
    id: p.place_id,
    name: p.place_name || "ไม่ระบุชื่อสถานที่",
    category: p.category || "สถานที่ท่องเที่ยว",
    location: p.location || "",
    rating: Number(p.rating || 0),
    reviews: Number(p.reviews || 0),
    image: p.image_url || "/placeholder.svg",
    description: p.description || p.location || "ไม่มีรายละเอียด",
    openTime: open !== "-" && close !== "-" ? `${open} - ${close}` : "-",
  }
}

function PlacesPager({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null

  return (
    <nav
      className="mt-12 flex flex-wrap items-center justify-center gap-2"
      aria-label="เปลี่ยนหน้ารายการสถานที่"
    >
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        <ChevronLeft className="h-4 w-4" />
        ก่อนหน้า
      </Button>

      {totalPages <= 9 ? (
        Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
          <Button
            key={p}
            type="button"
            size="sm"
            variant={p === page ? "default" : "outline"}
            className={p === page ? "bg-primary text-white hover:bg-primary/90" : ""}
            onClick={() => onPageChange(p)}
          >
            {p}
          </Button>
        ))
      ) : (
        <span className="px-3 text-sm text-muted-foreground">
          หน้า {page} / {totalPages}
        </span>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        ถัดไป
        <ChevronRight className="h-4 w-4" />
      </Button>
    </nav>
  )
}

function PlaceCardSkeleton() {
  return (
    <div
      className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-border bg-card"
      aria-hidden
    >
      <div className="relative h-56 w-full shrink-0 animate-pulse bg-stone-200">
        <div className="absolute top-3 right-3 h-7 w-12 rounded-lg bg-stone-300/80" />
        <div className="absolute bottom-3 left-3 h-6 w-24 rounded-full bg-stone-300/80" />
      </div>
      <div className="flex min-h-[18rem] flex-1 flex-col p-5 pt-4 pb-6">
        <div className="shrink-0 space-y-1">
          <div className="h-5 w-[75%] animate-pulse rounded-md bg-stone-200" />
          <div className="h-[3.75rem] space-y-2">
            <div className="h-4 w-full animate-pulse rounded bg-stone-200" />
            <div className="h-4 w-full animate-pulse rounded bg-stone-200" />
            <div className="h-4 w-[85%] animate-pulse rounded bg-stone-200" />
          </div>
        </div>
        <div className="mt-2 h-[4.75rem] shrink-0 space-y-1.5">
          <div className="h-4 w-full animate-pulse rounded bg-stone-200" />
          <div className="h-4 w-[90%] animate-pulse rounded bg-stone-200" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-stone-200" />
        </div>
        <div className="mt-1 h-4 w-16 shrink-0 animate-pulse rounded bg-stone-200" />
        <div className="mt-auto w-full shrink-0 pt-3">
          <div className="h-10 w-full animate-pulse rounded-md bg-stone-300" />
        </div>
      </div>
    </div>
  )
}

function PlacesPageSkeleton() {
  return (
    <div aria-busy="true" aria-label="กำลังโหลดรายการสถานที่">
      <div className="mb-6 flex justify-center">
        <div className="h-5 w-56 max-w-full animate-pulse rounded-full bg-stone-200 md:w-72" />
      </div>

      <div className="grid grid-cols-1 items-stretch gap-8 sm:grid-cols-2 md:grid-cols-3">
        {Array.from({ length: PLACES_PER_PAGE }, (_, i) => (
          <div key={i} className="flex h-full min-h-0">
            <PlaceCardSkeleton />
          </div>
        ))}
      </div>

      <div className="mt-12 flex flex-wrap items-center justify-center gap-2" aria-hidden>
        <div className="h-9 w-24 animate-pulse rounded-md bg-stone-200" />
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="h-9 w-9 animate-pulse rounded-md bg-stone-200" />
        ))}
        <div className="h-9 w-20 animate-pulse rounded-md bg-stone-200" />
      </div>
    </div>
  )
}

function PlaceCard({ place }) {
  return (
    <Card className="group flex h-full w-full flex-col overflow-hidden border-border bg-card transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
      <div className="relative h-56 w-full shrink-0 overflow-hidden">
        <img
          src={place.image}
          alt={place.name}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/70 to-transparent" />
        <div className="absolute top-3 right-3 flex items-center gap-1 rounded-lg bg-white/95 px-2 py-1 backdrop-blur-sm">
          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
          <span className="text-sm font-semibold">{place.rating}</span>
        </div>
        <div className="absolute bottom-3 left-3">
          <Badge className="max-w-[12rem] line-clamp-1 bg-card/90 text-card-foreground backdrop-blur-sm">
            {place.category}
          </Badge>
        </div>
      </div>

      <CardContent className="flex min-h-[18rem] flex-1 flex-col p-5 pt-4 pb-6">
        <div className="shrink-0 space-y-1">
          <h2 className="h-10 line-clamp-2 text-lg font-semibold leading-5 text-card-foreground">
            {place.name}
          </h2>
          <p className="h-[3.75rem] line-clamp-3 text-sm leading-5 text-muted-foreground">
            {place.description}
          </p>
        </div>

        <div className="mt-2 h-[4.75rem] shrink-0 space-y-1.5 text-sm text-muted-foreground">
          <div className="flex items-start gap-1.5">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="line-clamp-2 leading-5">{place.location || "—"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4 shrink-0" />
            <span className="line-clamp-1">{place.openTime}</span>
          </div>
        </div>

        <p className="mt-1 h-4 shrink-0 text-xs text-muted-foreground">
          {place.reviews.toLocaleString()} รีวิว
        </p>

        <div className="mt-auto w-full shrink-0 pt-3">
          <Button asChild className="w-full bg-primary text-white hover:bg-primary/90">
            <Link to={`/place/${place.id}`}>ดูรายละเอียดสถานที่</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export function AllPlacesPage() {
  const [errorMessage, setErrorMessage] = useState("")
  const [places, setPlaces] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalPlaces, setTotalPlaces] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    let hideSkeletonTimer = null
    const loadStartedAt = Date.now()

    const endLoading = () => {
      const remain = Math.max(0, MIN_SKELETON_MS - (Date.now() - loadStartedAt))
      hideSkeletonTimer = window.setTimeout(() => {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }, remain)
    }

    const loadPlaces = async () => {
      setLoading(true)
      setErrorMessage("")
      try {
        const q = new URLSearchParams({
          page: String(page),
          limit: String(PLACES_PER_PAGE),
        })
        const res = await fetch(`${API_BASE_URL}/places?${q.toString()}`, {
          signal: controller.signal,
        })
        const data = await res.json()
        if (!res.ok || !data?.success) {
          throw new Error(data?.message || "โหลดข้อมูลสถานที่ไม่สำเร็จ")
        }
        const rows = Array.isArray(data.data) ? data.data.map(mapPlaceRow) : []
        if (controller.signal.aborted) return
        setPlaces(rows)
        setTotalPages(data.pagination?.totalPages || 1)
        setTotalPlaces(data.pagination?.total ?? rows.length)
      } catch (error) {
        if (error?.name === "AbortError") return
        setErrorMessage(error?.message || "โหลดข้อมูลสถานที่ไม่สำเร็จ")
        setPlaces([])
        setTotalPages(1)
        setTotalPlaces(0)
      } finally {
        if (!controller.signal.aborted) {
          endLoading()
        }
      }
    }

    loadPlaces()
    return () => {
      controller.abort()
      if (hideSkeletonTimer != null) {
        window.clearTimeout(hideSkeletonTimer)
      }
    }
  }, [page])

  const skipScrollRef = useRef(true)
  useEffect(() => {
    if (skipScrollRef.current) {
      skipScrollRef.current = false
      return
    }
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [page])

  const handlePageChange = (nextPage) => {
    if (nextPage < 1 || nextPage > totalPages || nextPage === page) return
    setPage(nextPage)
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/5">
      <Header />

      <section className="container mx-auto px-4 pb-14 pt-6 md:pb-16 md:pt-8">
        {!loading && totalPlaces > 0 ? (
          <p className="mb-6 text-center text-sm text-muted-foreground">
            สถานที่ทั้งหมด {totalPlaces.toLocaleString()} แห่ง — หน้า {page} จาก {totalPages}
          </p>
        ) : null}

        {errorMessage ? <p className="mb-6 text-center text-sm text-destructive">{errorMessage}</p> : null}

        {loading ? (
          <PlacesPageSkeleton />
        ) : places.length === 0 ? (
          <p className="py-12 text-center text-muted-foreground">ยังไม่มีสถานที่ในระบบ</p>
        ) : (
          <>
            <div className="grid grid-cols-1 items-stretch gap-8 sm:grid-cols-2 md:grid-cols-3">
              {places.map((place) => (
                <div key={place.id} className="flex h-full min-h-0">
                  <PlaceCard place={place} />
                </div>
              ))}
            </div>
            <PlacesPager page={page} totalPages={totalPages} onPageChange={handlePageChange} />
          </>
        )}
      </section>
    </main>
  )
}

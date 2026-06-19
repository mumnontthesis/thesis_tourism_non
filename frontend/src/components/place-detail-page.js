"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Star,
  MapPin,
  Clock,
  TrendingUp,
  Phone,
  Share2,
  Heart,
  Navigation,
  ChevronLeft,
  Camera,
} from "lucide-react"
import { Button } from "./ui/button.tsx"
import { Card, CardContent } from "./ui/card.tsx"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs.tsx"
import { Link, useLocation, useNavigate, useParams } from "react-router-dom"
import { markHotPlacesReturn, peekHotPlaces } from "../lib/hot-places-cache"
import { ReviewSection } from "./review"

import { API_BASE_URL } from "../lib/api.js"

export function PlaceDetailPage({ placeId }) {
  const params = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const resolvedPlaceId = placeId || params.placeId

  useEffect(() => {
    if (!location.state?.fromHotPlaces) return
    const cached = peekHotPlaces()
    if (cached?.length) {
      markHotPlacesReturn(cached)
    }
  }, [location.state?.fromHotPlaces])

  const goHome = () => {
    const cached = peekHotPlaces()
    if (cached?.length) {
      markHotPlacesReturn(cached)
    }
    navigate("/")
  }
  const [place, setPlace] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState("")
  const [activeTab, setActiveTab] = useState("overview")
  const [isSaved, setIsSaved] = useState(false)
  const [userReviews, setUserReviews] = useState([])
  const [reviewSummary, setReviewSummary] = useState(null)

  const fetchPlaceDetail = useCallback(async (showLoading = true) => {
    if (!resolvedPlaceId) {
      setErrorMessage("ไม่พบรหัสสถานที่")
      if (showLoading) setIsLoading(false)
      return
    }

    if (showLoading) {
      setIsLoading(true)
      setErrorMessage("")
    }

    try {
      const res = await fetch(`${API_BASE_URL}/places/${resolvedPlaceId}`)
      const contentType = res.headers.get("content-type") || ""
      const isJson = contentType.includes("application/json")
      const data = isJson ? await res.json() : null

      if (!res.ok || !isJson || !data?.success || !data?.data) {
        if (!isJson) {
          throw new Error("เซิร์ฟเวอร์ตอบกลับไม่ใช่ JSON (อาจยังไม่รีสตาร์ต backend)")
        }
        throw new Error(data?.message || "ไม่สามารถโหลดข้อมูลสถานที่ได้")
      }

      setPlace(data.data)
    } catch (error) {
      if (showLoading) {
        setErrorMessage(error?.message || "เกิดข้อผิดพลาดในการโหลดข้อมูล")
      }
    } finally {
      if (showLoading) setIsLoading(false)
    }
  }, [resolvedPlaceId])

  const fetchReviews = useCallback(async () => {
    if (!resolvedPlaceId) return
    try {
      const res = await fetch(
        `${API_BASE_URL}/reviews?entityType=place&entityId=${encodeURIComponent(resolvedPlaceId)}`
      )
      const data = await res.json()
      if (res.ok && data?.success) {
        setUserReviews(Array.isArray(data.data) ? data.data : [])
        setReviewSummary(data.summary || null)
      }
    } catch {
      setUserReviews([])
      setReviewSummary(null)
    }
  }, [resolvedPlaceId])

  useEffect(() => {
    fetchPlaceDetail()
  }, [fetchPlaceDetail])

  useEffect(() => {
    if (!resolvedPlaceId || !place) return

    const storageKey = `place_view_${resolvedPlaceId}`
    try {
      if (sessionStorage.getItem(storageKey)) return
      sessionStorage.setItem(storageKey, "1")
    } catch {
      // sessionStorage may be unavailable in some browsers
    }

    fetch(`${API_BASE_URL}/places/${resolvedPlaceId}/view`, { method: "POST" }).catch(() => {})
  }, [resolvedPlaceId, place])

  useEffect(() => {
    fetchReviews()
  }, [fetchReviews])

  const mappedPlace = useMemo(() => {
    if (!place) return null
    const open = place.open_time ? String(place.open_time).slice(0, 5) : "-"
    const close = place.close_time ? String(place.close_time).slice(0, 5) : "-"
    const rating = Number(place.rating || 0)
    const reviews = Number(place.reviews || 0)
    const imageUrl = place.image_url || "/placeholder.svg"

    return {
      id: place.place_id,
      name: place.place_name || "ไม่ระบุชื่อสถานที่",
      category: place.category || "อื่นๆ",
      rating,
      reviews,
      visitors: `${Math.max(1, reviews)} รีวิว`,
      image: imageUrl,
      description: place.description || place.location || "ไม่มีรายละเอียด",
      openTime: `${open} - ${close}`,
      address: place.location || "ไม่มีข้อมูลที่อยู่",
      phone: "-",
      price: "ไม่ระบุ",
      facilities: ["ไม่ระบุ"],
      trending: rating >= 4.5,
      highlights: place.description ? [place.description] : ["สถานที่ท่องเที่ยวแนะนำในนนทบุรี"],
      gallery: [imageUrl],
    }
  }, [place])

  const displayRating = reviewSummary?.averageRating ?? mappedPlace?.rating ?? 0
  const displayReviewCount = reviewSummary?.totalReviews ?? mappedPlace?.reviews ?? 0

  if (isLoading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <p className="text-muted-foreground">กำลังโหลดข้อมูลสถานที่...</p>
      </div>
    )
  }

  if (errorMessage || !mappedPlace) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-destructive font-medium mb-4">{errorMessage || "ไม่พบข้อมูลสถานที่"}</p>
          <Button type="button" onClick={goHome}>
            กลับหน้าหลัก
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Hero Image Section */}
      <div className="relative h-[60vh] bg-muted overflow-hidden">
        <img src={mappedPlace.image || "/placeholder.svg"} alt={mappedPlace.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

        {/* Back Button */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={goHome}
          className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm hover:bg-white"
          aria-label="กลับหน้าหลัก"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>

        {/* Action Buttons */}
        <div className="absolute top-4 right-4 flex gap-2">
          <Button variant="ghost" size="icon" className="bg-white/90 backdrop-blur-sm hover:bg-white">
            <Share2 className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="bg-white/90 backdrop-blur-sm hover:bg-white"
            onClick={() => setIsSaved(!isSaved)}
          >
            <Heart className={`w-5 h-5 ${isSaved ? "fill-red-500 text-red-500" : ""}`} />
          </Button>
        </div>

        {/* Place Info Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
          <div className="max-w-7xl mx-auto">
            {mappedPlace.trending && (
              <div className="inline-flex items-center gap-2 bg-primary px-3 py-1 rounded-full text-xs font-semibold mb-3">
                <TrendingUp className="w-3 h-3" />
                กำลังฮิต
              </div>
            )}
            <h1 className="text-4xl md:text-5xl font-bold mb-2">{mappedPlace.name}</h1>
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                <span className="font-semibold">
                  {Number(displayRating).toFixed(displayRating % 1 === 0 ? 0 : 1)}
                </span>
                <span className="text-white/80">({displayReviewCount.toLocaleString()} รีวิว)</span>
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                <span>{mappedPlace.visitors}</span>
              </div>
              <span className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">{mappedPlace.category}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="overview">ภาพรวม</TabsTrigger>
                <TabsTrigger value="reviews">รีวิว</TabsTrigger>
                <TabsTrigger value="photos">รูปภาพ</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                {/* Description */}
                <Card>
                  <CardContent className="p-6">
                    <h2 className="text-2xl font-bold mb-4">เกี่ยวกับสถานที่นี้</h2>
                    <p className="text-muted-foreground leading-relaxed mb-6">{mappedPlace.description}</p>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <Clock className="w-5 h-5 text-primary mt-0.5" />
                        <div>
                          <p className="font-semibold">เวลาเปิดทำการ</p>
                          <p className="text-sm text-muted-foreground">{mappedPlace.openTime}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <MapPin className="w-5 h-5 text-primary mt-0.5" />
                        <div>
                          <p className="font-semibold">ที่อยู่</p>
                          <p className="text-sm text-muted-foreground">{mappedPlace.address}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Phone className="w-5 h-5 text-primary mt-0.5" />
                        <div>
                          <p className="font-semibold">โทรศัพท์</p>
                          <p className="text-sm text-muted-foreground">{mappedPlace.phone}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Highlights */}
                <Card>
                  <CardContent className="p-6">
                    <h2 className="text-2xl font-bold mb-4">จุดเด่น</h2>
                    <div className="grid grid-cols-2 gap-3">
                      {mappedPlace.highlights.map((highlight, index) => (
                        <div key={index} className="flex items-center gap-2 p-3 bg-primary/5 rounded-lg">
                          <div className="w-2 h-2 bg-primary rounded-full" />
                          <span className="text-sm font-medium">{highlight}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Facilities */}
                <Card>
                  <CardContent className="p-6">
                    <h2 className="text-2xl font-bold mb-4">สิ่งอำนวยความสะดวก</h2>
                    <div className="flex flex-wrap gap-2">
                      {mappedPlace.facilities.map((facility, index) => (
                        <div key={index} className="px-4 py-2 bg-stone-100 rounded-full text-sm">
                          {facility}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="reviews" className="space-y-4">
                <ReviewSection
                  reviews={userReviews}
                  summary={reviewSummary}
                  targetName={mappedPlace.name}
                  entityType="place"
                  entityId={mappedPlace.id}
                  enableWriteReview
                  emptyMessage="ยังไม่มีรีวิวสำหรับสถานที่นี้"
                  onReviewSubmitted={async () => {
                    setActiveTab("reviews")
                    await Promise.all([fetchReviews(), fetchPlaceDetail(false)])
                  }}
                />
              </TabsContent>

              <TabsContent value="photos">
                <div className="grid grid-cols-2 gap-4">
                  {mappedPlace.gallery.map((photo, index) => (
                    <div key={index} className="relative aspect-video rounded-lg overflow-hidden group cursor-pointer">
                      <img
                        src={photo || "/placeholder.svg"}
                        alt={`Gallery ${index + 1}`}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <Camera className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardContent className="p-6 space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">ค่าใช้จ่าย</p>
                  <p className="text-2xl font-bold text-primary">{mappedPlace.price}</p>
                </div>

                <Button className="w-full gap-2" size="lg" asChild>
                  <Link to={`/navigation?to=${encodeURIComponent(mappedPlace.name)}`}>
                    <Navigation className="w-5 h-5" />
                    นำทาง
                  </Link>
                </Button>

                <Link to="/" className="block">
                  <Button variant="outline" className="w-full bg-transparent" size="lg">
                    เพิ่มในแผนการเที่ยว
                  </Button>
                </Link>

                <div className="pt-4 border-t space-y-3">
                  <p className="font-semibold text-sm">แชร์สถานที่นี้</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="icon" className="flex-1 bg-transparent">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                      </svg>
                    </Button>
                    <Button variant="outline" size="icon" className="flex-1 bg-transparent">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                      </svg>
                    </Button>
                    <Button variant="outline" size="icon" className="flex-1 bg-transparent">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z" />
                      </svg>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { WriteReviewBar } from "./writereview"
import {
  Star,
  Eye,
  ChevronRight,
  BadgeCheck,
} from "lucide-react"
import { Card, CardContent } from "./ui/card.tsx"

const SORT_OPTIONS = [
  { value: "popular", label: "ยอดนิยม" },
  { value: "newest", label: "ล่าสุด" },
  { value: "oldest", label: "เก่าสุด" },
  { value: "highest", label: "คะแนนสูงสุด" },
  { value: "lowest", label: "คะแนนต่ำสุด" },
]

const STAR_PINK = "#ec4899"
const STAR_PINK_LIGHT = "#fce7f3"
const STAR_EMPTY = "#d6d3d1"

const STAR_SIZES = { sm: 16, md: 20, lg: 32, xl: 36 }

function PinkStar({ active, size = 16, strokeWidth }) {
  const filled = Boolean(active)
  return (
    <Star
      size={size}
      fill={filled ? STAR_PINK : "transparent"}
      stroke={filled ? STAR_PINK : STAR_EMPTY}
      strokeWidth={strokeWidth ?? (filled ? 0 : 1.5)}
      className="shrink-0 transition-colors duration-150"
    />
  )
}

function StarRow({ rating, size = "sm", interactive = false, onRate }) {
  const starSize = STAR_SIZES[size] || STAR_SIZES.sm

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          onClick={() => interactive && onRate?.(star)}
          className={interactive ? "cursor-pointer transition-transform hover:scale-110" : "cursor-default"}
        >
          <PinkStar
            active={star <= Math.round(rating)}
            size={starSize}
            strokeWidth={star <= Math.round(rating) ? 0 : 1.5}
          />
        </button>
      ))}
    </div>
  )
}

function getInitials(name = "") {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  return name.slice(0, 2).toUpperCase() || "U"
}

function buildDistribution(reviews) {
  const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  reviews.forEach((review) => {
    const rounded = Math.min(5, Math.max(1, Math.round(Number(review.rating) || 0)))
    counts[rounded] += 1
  })
  const total = reviews.length || 1
  return [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: counts[stars],
    percent: Math.round((counts[stars] / total) * 100),
  }))
}

function ReviewSummary({ reviews, summary, entityType, showRateInput, onRate }) {
  const [hoverRating, setHoverRating] = useState(0)
  const [userRating, setUserRating] = useState(0)

  const totalReviews = summary?.totalReviews ?? reviews.length
  const totalRatings = summary?.totalRatings ?? totalReviews
  const averageRating =
    summary?.averageRating ??
    (reviews.length
      ? reviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) / reviews.length
      : 0)

  const distribution = summary?.distribution ?? buildDistribution(reviews)
  const firstReviewer = summary?.firstReviewer ?? reviews[0]
  const targetLabel = entityType === "place" ? "สถานที่นี้" : "ร้านนี้"

  return (
    <div className="space-y-6">
      <p className="text-sm text-stone-600">
        {totalReviews.toLocaleString()} รีวิว {totalRatings.toLocaleString()} เรตติ้ง
      </p>

      <div className="flex gap-6 max-w-xl">
        <div className="text-center shrink-0">
          <p className="text-5xl font-bold text-stone-900 leading-none">
            {averageRating.toFixed(averageRating % 1 === 0 ? 0 : 1)}
          </p>
          <p className="text-sm text-stone-500 mt-1">จาก 5</p>
        </div>

        <div className="flex-1 space-y-1.5">
          {distribution.map((item) => (
            <div key={item.stars} className="flex items-center gap-2">
              <div className="flex items-center gap-0.5 w-16 shrink-0">
                {[...Array(item.stars)].map((_, i) => (
                  <PinkStar key={i} active size={12} strokeWidth={0} />
                ))}
              </div>
              <div className="flex-1 h-2 bg-stone-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ backgroundColor: STAR_PINK, width: `${item.percent}%` }}
                />
              </div>
            </div>
          ))}

          {firstReviewer && (
            <div className="flex items-center gap-2 pt-2">
              <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center text-[10px] font-semibold text-amber-700 overflow-hidden">
                {firstReviewer.avatarUrl ? (
                  <img
                    src={firstReviewer.avatarUrl}
                    alt={firstReviewer.userName || firstReviewer.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  getInitials(firstReviewer.userName || firstReviewer.name || firstReviewer.userAvatar)
                )}
              </div>
              <span className="text-xs text-stone-500">
                รีวิวคนแรก {firstReviewer.userName || firstReviewer.name}
              </span>
            </div>
          )}
        </div>
      </div>

      {showRateInput && (
        <div className="border rounded-xl p-8 text-center bg-white">
          <p className="font-semibold text-stone-900 mb-4">ให้คะแนน{targetLabel}</p>
          <div
            className="flex items-center justify-center gap-1"
            onMouseLeave={() => setHoverRating(0)}
          >
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className="p-1 transition-transform hover:scale-110 outline-none focus:outline-none focus-visible:outline-none"
                onMouseEnter={() => setHoverRating(star)}
                onClick={() => {
                  setUserRating(star)
                  onRate?.(star)
                }}
              >
                <PinkStar
                  active={star <= (hoverRating || userRating)}
                  size={STAR_SIZES.xl}
                />
              </button>
            ))}
          </div>
          {userRating > 0 && (
            <p className="text-sm text-stone-500 mt-3">คุณให้คะแนน {userRating} ดาว</p>
          )}
        </div>
      )}
    </div>
  )
}

function ReviewFilters({ activeFilter, onFilterChange, sortBy, onSortChange }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-4 border-t border-b">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-medium text-stone-700 mr-1">ตัวกรอง</span>
        {[5, 4, 3, 2, 1].map((stars) => (
          <button
            key={stars}
            type="button"
            onClick={() => onFilterChange(activeFilter === stars ? null : stars)}
            className="flex items-center gap-0.5 px-2 py-1.5 rounded border text-sm transition-colors border-stone-200 bg-white hover:border-stone-300"
            style={
              activeFilter === stars
                ? { borderColor: STAR_PINK, backgroundColor: STAR_PINK_LIGHT }
                : undefined
            }
          >
            {[...Array(stars)].map((_, i) => (
              <PinkStar key={i} active size={12} strokeWidth={0} />
            ))}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-stone-600">เรียงตาม</span>
        <select
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value)}
          className="text-sm font-medium text-blue-600 bg-transparent cursor-pointer focus:outline-none border-0"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

function ReviewCard({ review }) {
  const [expanded, setExpanded] = useState(false)

  const userName = review.userName || review.name || "ผู้ใช้"
  const comment = review.comment || review.text || ""
  const isLong = comment.length > 280
  const displayComment = expanded || !isLong ? comment : `${comment.slice(0, 280)}...`
  const images = review.images || (review.image ? [review.image] : [])
  const visibleImages = images.slice(0, 4)
  const remainingImages = Math.max(0, images.length - 4)

  return (
    <article className="py-6 border-b border-stone-100 last:border-b-0">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center font-semibold text-amber-700 shrink-0 overflow-hidden">
          {review.avatarUrl ? (
            <img src={review.avatarUrl} alt={userName} className="w-full h-full object-cover" />
          ) : (
            review.userAvatar || getInitials(userName)
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-bold text-stone-900">{userName}</p>
              {review.isVerified && (
                <div className="flex items-center gap-1 mt-0.5">
                  <BadgeCheck className="w-3.5 h-3.5 text-green-600" />
                  <span className="text-xs text-green-600">ยืนยันตัวตนแล้ว</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <StarRow rating={review.rating} />
            {review.date && <span className="text-xs text-stone-500">{review.date}</span>}
            {review.views != null && (
              <span className="text-xs text-stone-500 flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" />
                ดูแล้ว {review.views}
              </span>
            )}
          </div>

          {review.isQualityReview && (
            <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700 border border-green-200">
              <BadgeCheck className="w-3 h-3" />
              Quality Review
            </span>
          )}

          {review.title && (
            <h3 className="font-bold text-stone-900 mt-3 leading-snug">{review.title}</h3>
          )}

          {review.priceRange && (
            <p className="text-sm text-stone-500 mt-1">ราคาต่อหัว: {review.priceRange}</p>
          )}

          {comment && (
            <p className="text-sm text-stone-700 mt-3 leading-relaxed whitespace-pre-line">
              {displayComment}
              {isLong && !expanded && (
                <button
                  type="button"
                  onClick={() => setExpanded(true)}
                  className="font-semibold text-stone-900 ml-1 hover:underline"
                >
                  อ่านต่อ
                </button>
              )}
            </p>
          )}

          {visibleImages.length > 0 && (
            <div className="flex gap-2 mt-4 overflow-x-auto">
              {visibleImages.map((img, index) => (
                <div
                  key={index}
                  className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-lg overflow-hidden shrink-0"
                >
                  <img
                    src={img || "/placeholder.svg"}
                    alt={`รูปรีวิว ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  {index === visibleImages.length - 1 && remainingImages > 0 && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="text-white font-semibold text-sm">+{remainingImages}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {review.previousReview && (
            <div className="mt-4 p-3 bg-stone-50 rounded-lg flex items-center justify-between gap-3 cursor-pointer hover:bg-stone-100 transition-colors">
              <div>
                <p className="text-xs text-stone-500 mb-1">รีวิวก่อนหน้า</p>
                <div className="flex items-center gap-2">
                  <StarRow rating={review.previousReview.rating} size="sm" />
                  <span className="text-xs text-stone-500">{review.previousReview.date}</span>
                </div>
                <p className="text-sm font-medium text-stone-800 mt-1">
                  {review.previousReview.placeName}
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-stone-400 shrink-0" />
            </div>
          )}
        </div>
      </div>
    </article>
  )
}

export function ReviewSection({
  reviews = [],
  summary,
  targetName = "",
  entityType = "shop",
  entityId,
  showSummary = true,
  showRateInput = true,
  showFilters = true,
  enableWriteReview = false,
  emptyMessage = "ยังไม่มีรีวิว",
  onRate,
  onReviewSubmitted,
}) {
  const [activeFilter, setActiveFilter] = useState(null)
  const [sortBy, setSortBy] = useState("newest")
  const [localReviews, setLocalReviews] = useState(reviews)
  const openWriteReviewRef = useRef(null)

  useEffect(() => {
    setLocalReviews(reviews)
  }, [reviews])

  const handleReviewSubmitted = (reviewData) => {
    onReviewSubmitted?.(reviewData)
  }

  const handleRate = (rating) => {
    if (enableWriteReview && openWriteReviewRef.current) {
      openWriteReviewRef.current(rating)
    }
    onRate?.(rating)
  }

  const filteredReviews = useMemo(() => {
    let result = [...localReviews]

    if (activeFilter) {
      result = result.filter((r) => Math.round(Number(r.rating)) === activeFilter)
    }

    switch (sortBy) {
      case "newest":
        break
      case "highest":
        result.sort((a, b) => Number(b.rating) - Number(a.rating))
        break
      case "lowest":
        result.sort((a, b) => Number(a.rating) - Number(b.rating))
        break
      case "oldest":
        result.reverse()
        break
      case "popular":
      default:
        result.sort((a, b) => Number(b.likes || b.views || 0) - Number(a.likes || a.views || 0))
        break
    }

    return result
  }, [localReviews, activeFilter, sortBy])

  const reviewList = localReviews

  if (reviewList.length === 0 && !enableWriteReview) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-2">
      {enableWriteReview && (
        <WriteReviewBar
          targetName={targetName}
          entityType={entityType}
          entityId={entityId}
          onReviewSubmitted={handleReviewSubmitted}
          onRequestRate={(openFn) => {
            openWriteReviewRef.current = openFn
          }}
        />
      )}

      {showSummary && (
        <ReviewSummary
          reviews={reviewList}
          summary={summary}
          entityType={entityType}
          showRateInput={showRateInput}
          onRate={handleRate}
        />
      )}

      {showFilters && (
        <ReviewFilters
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          sortBy={sortBy}
          onSortChange={setSortBy}
        />
      )}

      <div className="bg-white rounded-xl">
        {filteredReviews.length === 0 ? (
          <p className="text-sm text-stone-500 py-8 text-center">
            {reviewList.length === 0 ? emptyMessage : "ไม่พบรีวิวตามตัวกรองที่เลือก"}
          </p>
        ) : (
          filteredReviews.map((review) => <ReviewCard key={review.id} review={review} />)
        )}
      </div>
    </div>
  )
}

export const SAMPLE_REVIEWS = [
  {
    id: 1,
    userName: "สมชาย ใจดี",
    userAvatar: "SC",
    rating: 5,
    title: "อาหารอร่อย บรรยากาศดีมาก",
    comment:
      "อาหารอร่อยมาก บรรยากาศดี วิวสวย แนะนำเลยครับ มากับครอบครัวได้สบายๆ พนักงานบริการดี ที่นั่งริมน้ำสวยมาก เหมาะกับการพาครอบครัวมาทานข้าววันหยุด",
    date: "15 ม.ค. 2567",
    views: 42,
    likes: 18,
    isVerified: true,
    isQualityReview: true,
    priceRange: "101 - 250 บาท",
    images: ["/koh-kret-pottery-market.jpg", "/thai-riverside-community.jpg", "/morning-market.jpg"],
  },
  {
    id: 2,
    userName: "สุดา รักสวย",
    userAvatar: "SR",
    rating: 4,
    title: "อาหารโอเค ราคาไม่แพง",
    comment: "อาหารโอเค ราคาไม่แพง แต่ที่จอดรถน้อยไปหน่อย โดยรวมแล้วประทับใจ จะกลับมาอีกค่ะ",
    date: "12 ม.ค. 2567",
    views: 28,
    likes: 9,
    isVerified: false,
    priceRange: "101 - 250 บาท",
    images: ["/morning-market.jpg"],
  },
  {
    id: 3,
    userName: "วิชัย มั่นคง",
    userAvatar: "VM",
    rating: 5,
    title: "เมนูแนะนำคือปลาเผา แกงส้ม",
    comment: "ประทับใจมากครับ เมนูแนะนำคือปลาเผา แกงส้ม รสชาติจัดจ้าน กลมกล่อม มากับเพื่อนๆ สนุกมาก",
    date: "10 ม.ค. 2567",
    views: 36,
    likes: 22,
    isVerified: true,
    isQualityReview: true,
    images: ["/thai-riverside-community.jpg", "/koh-kret-pottery-market.jpg"],
    previousReview: {
      rating: 4,
      date: "5 ธ.ค. 2566",
      placeName: "ตลาดน้ำปากเกร็ด",
    },
  },
  {
    id: 4,
    userName: "นิภา สวยงาม",
    userAvatar: "NS",
    rating: 4,
    comment: "บริการดีมาก พนักงานน่ารัก จะกลับมาอีกค่ะ",
    date: "8 ม.ค. 2567",
    views: 15,
    likes: 5,
  },
]

"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Star, ImagePlus, X, PenLine } from "lucide-react"
import { Button } from "./ui/button.tsx"
import { Input } from "./ui/input.tsx"
import { Label } from "./ui/label.tsx"
import { Textarea } from "./ui/textarea.tsx"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog.tsx"

import { API_BASE_URL } from "../lib/api.js"
const PENDING_REVIEW_KEY = "pendingWriteReview"
const STAR_PINK = "#ec4899"
const STAR_EMPTY = "#d6d3d1"

export const MOCK_MEMBER = {
  id: 99,
  username: "สมชาย ทดสอบ",
  email: "member@test.com",
  userType: "tourist",
}

export function ensureMockLogin() {
  if (process.env.NODE_ENV !== "development") return false
  if (new URLSearchParams(window.location.search).get("mockLogin") !== "1") return false
  if (!getLoggedInMember()) {
    localStorage.setItem("user", JSON.stringify(MOCK_MEMBER))
  }
  return true
}

export function getLoggedInMember() {
  try {
    const raw = localStorage.getItem("user")
    if (!raw) return null
    const user = JSON.parse(raw)
    if (!user?.email) return null
    return {
      ...user,
      id: user.id || user.user_id,
      username: user.username || user.name || user.fullName,
    }
  } catch {
    return null
  }
}

function getMemberDisplayName(user) {
  return user?.username || user?.fullName || user?.name || user?.email?.split("@")[0] || "สมาชิก"
}

function PinkStarButton({ active, onClick, onMouseEnter, size = 28 }) {
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      className="p-0.5 hover:scale-110 transition-transform outline-none focus:outline-none focus-visible:outline-none"
    >
      <Star
        size={size}
        fill={active ? STAR_PINK : "transparent"}
        stroke={active ? STAR_PINK : STAR_EMPTY}
        strokeWidth={active ? 0 : 1.5}
      />
    </button>
  )
}

function savePendingReview(payload) {
  sessionStorage.setItem(PENDING_REVIEW_KEY, JSON.stringify(payload))
}

export function consumePendingReview() {
  try {
    const raw = sessionStorage.getItem(PENDING_REVIEW_KEY)
    if (!raw) return null
    sessionStorage.removeItem(PENDING_REVIEW_KEY)
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function WriteReviewDialog({
  open,
  onOpenChange,
  user,
  initialRating = 0,
  targetName = "",
  entityType = "place",
  entityId,
  onSubmit,
}) {
  const [rating, setRating] = useState(initialRating)
  const [hoverRating, setHoverRating] = useState(0)
  const [comment, setComment] = useState("")
  const [images, setImages] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (open) {
      setRating(initialRating || 0)
      setHoverRating(0)
      setError("")
    }
  }, [open, initialRating])

  useEffect(() => {
    return () => {
      images.forEach((img) => URL.revokeObjectURL(img.preview))
    }
  }, [images])

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files || [])
    const mapped = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }))
    setImages((prev) => [...prev, ...mapped])
    e.target.value = ""
  }

  const removeImage = (index) => {
    setImages((prev) => {
      const next = [...prev]
      URL.revokeObjectURL(next[index].preview)
      next.splice(index, 1)
      return next
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")

    if (!rating) {
      setError("กรุณาให้คะแนนดาวก่อนส่งรีวิว")
      return
    }
    if (!comment.trim()) {
      setError("กรุณากรอกข้อความรีวิว")
      return
    }

    const reviewData = {
      userName: getMemberDisplayName(user),
      userAvatar: getMemberDisplayName(user).slice(0, 2).toUpperCase(),
      email: user?.email,
      rating,
      title: "",
      comment: comment.trim(),
      date: new Date().toLocaleDateString("th-TH", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
      images: images.map((img) => img.preview),
      entityId,
      entityType,
      targetName,
    }

    setIsSubmitting(true)
    try {
      const formData = new FormData()
      formData.append("userId", String(user?.id || ""))
      formData.append("email", user?.email || "")
      formData.append("rating", String(rating))
      formData.append("title", "")
      formData.append("comment", comment.trim())
      formData.append("entityType", entityType)
      formData.append("entityId", String(entityId || ""))
      images.forEach((img) => formData.append("images", img.file))

      const res = await fetch(`${API_BASE_URL}/reviews`, {
        method: "POST",
        body: formData,
      })

      const data = await res.json().catch(() => null)

      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "ส่งรีวิวไม่สำเร็จ กรุณาลองใหม่")
      }

      onSubmit?.(data.data || reviewData)
      setComment("")
      setImages([])
      setRating(0)
      onOpenChange(false)
    } catch (err) {
      setError(err?.message || "ส่งรีวิวไม่สำเร็จ กรุณาลองใหม่")
    } finally {
      setIsSubmitting(false)
    }
  }

  const targetLabel = entityType === "place" ? "สถานที่" : "ร้านค้า"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl sm:rounded-3xl">
        <DialogHeader>
          <DialogTitle>เขียนรีวิว{targetLabel}</DialogTitle>
          <DialogDescription>
            {targetName ? `แชร์ประสบการณ์ของคุณที่ ${targetName}` : "แชร์ประสบการณ์ของคุณ"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>ชื่อสมาชิก</Label>
              <Input value={getMemberDisplayName(user)} readOnly className="bg-stone-50" />
            </div>
            <div className="space-y-2">
              <Label>อีเมล</Label>
              <Input value={user?.email || ""} readOnly className="bg-stone-50" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>คะแนน</Label>
            <div className="flex items-center gap-1" onMouseLeave={() => setHoverRating(0)}>
              {[1, 2, 3, 4, 5].map((star) => (
                <PinkStarButton
                  key={star}
                  active={star <= (hoverRating || rating)}
                  onMouseEnter={() => setHoverRating(star)}
                  onClick={() => setRating(star)}
                />
              ))}
            </div>
            {rating > 0 && <p className="text-xs text-stone-500">คุณให้คะแนน {rating} ดาว</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="review-comment">ข้อความรีวิว</Label>
            <Textarea
              id="review-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="เล่าประสบการณ์ บรรยากาศ สิ่งที่ประทับใจ..."
              rows={5}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>แนบรูปภาพ</Label>
            <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-stone-200 rounded-lg cursor-pointer hover:border-pink-300 hover:bg-pink-50/30 transition-colors">
              <ImagePlus className="w-8 h-8 text-stone-400 mb-2" />
              <span className="text-sm text-stone-500">คลิกเพื่อเลือกรูปภาพ</span>
              <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageChange} />
            </label>

            {images.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {images.map((img, index) => (
                  <div key={index} className="relative w-20 h-20 rounded-lg overflow-hidden group">
                    <img src={img.preview} alt={`preview-${index}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              ยกเลิก
            </Button>
            <Button type="submit" disabled={isSubmitting} style={{ backgroundColor: STAR_PINK }} className="hover:opacity-90 text-white">
              {isSubmitting ? "กำลังส่ง..." : "ส่งรีวิว"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function WriteReviewBar({
  targetName = "",
  entityType = "place",
  entityId,
  onReviewSubmitted,
  onRequestRate,
}) {
  const navigate = useNavigate()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [initialRating, setInitialRating] = useState(0)
  const [user, setUser] = useState(null)

  const returnUrl = useMemo(
    () => window.location.pathname + window.location.search,
    []
  )

  const refreshUser = useCallback(() => {
    setUser(getLoggedInMember())
  }, [])

  useEffect(() => {
    ensureMockLogin()
    refreshUser()
  }, [refreshUser])

  useEffect(() => {
    const pending = consumePendingReview()
    if (!pending) return

    const loggedIn = getLoggedInMember()
    if (!loggedIn) return

    setUser(loggedIn)
    setInitialRating(pending.rating || 0)
    setDialogOpen(true)
  }, [refreshUser])

  const openWriteReview = useCallback(
    (rating = 0) => {
      const loggedIn = getLoggedInMember()

      if (!loggedIn) {
        savePendingReview({
          rating,
          entityId,
          entityType,
          targetName,
          returnUrl,
        })
        navigate(`/login?redirect=${encodeURIComponent(returnUrl)}`)
        return
      }

      setUser(loggedIn)
      setInitialRating(rating)
      setDialogOpen(true)
    },
    [entityId, entityType, navigate, returnUrl, targetName]
  )

  useEffect(() => {
    onRequestRate?.(openWriteReview)
  }, [onRequestRate, openWriteReview])

  const handleReviewSubmitted = (reviewData) => {
    onReviewSubmitted?.(reviewData)
  }

  return (
    <>
      <div className="flex items-center justify-between gap-3 pb-4 border-b border-stone-100">
        <div>
          <h3 className="font-semibold text-stone-900">รีวิวและเรตติ้ง</h3>
          <p className="text-sm text-stone-500">แชร์ประสบการณ์ของคุณกับสมาชิกคนอื่น</p>
        </div>
        <Button
          type="button"
          onClick={() => openWriteReview(0)}
          className="gap-2 text-white shrink-0"
          style={{ backgroundColor: STAR_PINK }}
        >
          <PenLine className="w-4 h-4" />
          เขียนรีวิว
        </Button>
      </div>

      <WriteReviewDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        user={user}
        initialRating={initialRating}
        targetName={targetName}
        entityType={entityType}
        entityId={entityId}
        onSubmit={handleReviewSubmitted}
      />
    </>
  )
}

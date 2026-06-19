"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "./ui/button.tsx"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card.tsx"
import { Input } from "./ui/input.tsx"
import { Label } from "./ui/label.tsx"
import { Textarea } from "./ui/textarea.tsx"
import {
  Building2,
  MapPin,
  Plus,
  Edit,
  Eye,
  Star,
  Clock,
  Menu,
  X,
  ImageIcon,
  MessageSquare,
  Phone,
  Globe,
  Mail,
  Save,
  LogOut,
  Trash2,
} from "lucide-react"
import { Link, useNavigate } from "react-router-dom"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs.tsx"
import { showAppAlert, showAppConfirm } from "../lib/app-alert"

import { API_BASE } from "../lib/api.js"

export function BusinessDashboard() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isEditMode, setIsEditMode] = useState(false)
  const [showRejectedEditForm, setShowRejectedEditForm] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // สถานะจัดการผู้ใช้งาน
  const [currentUser, setCurrentUser] = useState(null)
  const navigate = useNavigate()

  const [entrepreneurStatus, setEntrepreneurStatus] = useState(null)
  const [rejectReasons, setRejectReasons] = useState([])
  const [statusBusinessName, setStatusBusinessName] = useState("")
  const [isCheckingStatus, setIsCheckingStatus] = useState(true)

  const getStatusText = (s) => {
    const v = (s || "").toString().toLowerCase()
    if (v === "approved" || v === "active" || v === "อนุมัติ") return "สถานะธุรกิจ: ได้รับการอนุมัติแล้ว"
    if (v === "rejected" || v === "declined" || v === "ไม่ผ่าน") return "สถานะธุรกิจ: ไม่ผ่านการอนุมัติ"
    return "สถานะธุรกิจ: รอการอนุมัติจากผู้ดูแลระบบ"
  }

  // ดึงข้อมูลจาก localStorage เมื่อโหลดหน้า
  useEffect(() => {
    const savedUser = localStorage.getItem('user')
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser))
    } else {
      // (ถ้าต้องการ) หากไม่ได้ Login ให้เด้งกลับหน้า Login
      // navigate('/login')
    }
  }, [])

  // ตรวจสอบสถานะธุรกิจก่อนเข้าใช้งาน dashboard
  useEffect(() => {
    const run = async () => {
      const userId = currentUser?.id || currentUser?.userId
      if (!userId) {
        setEntrepreneurStatus(null)
        setRejectReasons([])
        setIsCheckingStatus(false)
        return
      }

      setIsCheckingStatus(true)
      try {
        const res = await fetch(`${API_BASE}/entrepreneur/by-user/${userId}`)
        const j = await res.json()
        if (!res.ok || !j?.success) {
          setEntrepreneurStatus(null)
          setRejectReasons([])
          setIsCheckingStatus(false)
          return
        }

        const info = j.data || {}
        setEntrepreneurStatus(info.status || "pending")
        setStatusBusinessName(info.business_name || info.place_name || "ธุรกิจของคุณ")
        setRejectReasons(
          Array.isArray(info.reject_reasons)
            ? info.reject_reasons
            : info.reject_reason
            ? [String(info.reject_reason)]
            : []
        )
      } catch {
        setEntrepreneurStatus(null)
        setRejectReasons([])
      } finally {
        setIsCheckingStatus(false)
      }
    }

    run()
  }, [currentUser])

  // ออกจากระบบ
  const handleLogout = () => {
    localStorage.removeItem('user')
    setCurrentUser(null)
    window.location.href = '/login'
  }

  const [businessInfo, setBusinessInfo] = useState({
    name: "",
    category: "",
    description: "",
    address: "",
    phone: "",
    website: "",
    email: "",
    openingHours: "จันทร์-อาทิตย์ 10:00-22:00",
    totalViews: 0,
    viewsChangePercent: 0,
    rating: 0,
    totalReviews: 0,
  })
  const [profileIds, setProfileIds] = useState({
    entrepreneurId: null,
    placeId: null,
  })

  const [reviews, setReviews] = useState([])
  const [newReviewsCount, setNewReviewsCount] = useState(0)
  const [todayReviewsCount, setTodayReviewsCount] = useState(0)

  const [galleryImages, setGalleryImages] = useState([])
  const [galleryLoading, setGalleryLoading] = useState(false)
  const [galleryUploading, setGalleryUploading] = useState(false)
  const [replacingImageId, setReplacingImageId] = useState(null)
  const addImageInputRef = useRef(null)
  const replaceImageInputRef = useRef(null)

  const getUserId = () => currentUser?.id || currentUser?.userId

  const applyDashboardStats = useCallback((stats) => {
    const recentReviews = Array.isArray(stats.recent_reviews) ? stats.recent_reviews : []

    setBusinessInfo((prev) => ({
      ...prev,
      rating: Number(stats.avg_rating || 0),
      totalReviews: Number(stats.total_reviews || 0),
      totalViews: Number(stats.total_views || 0),
      viewsChangePercent: Number(stats.views_change_percent || 0),
    }))
    setNewReviewsCount(Number(stats.new_reviews || 0))
    setTodayReviewsCount(Number(stats.today_reviews || 0))
    setReviews(
      recentReviews.map((r) => {
        const reviewerName = r.reviewer_name || "ผู้ใช้งาน"
        const safeRating = Math.max(0, Math.min(5, Number(r.rating || 0)))
        const reviewDate = r.review_date ? new Date(r.review_date).toLocaleDateString("th-TH") : "-"
        return {
          id: r.review_id,
          userName: reviewerName,
          rating: safeRating,
          comment: r.comment || "-",
          date: reviewDate,
          userAvatar: reviewerName.charAt(0).toUpperCase(),
        }
      })
    )
  }, [])

  const refreshDashboardStats = useCallback(async (userId) => {
    if (!userId) return

    try {
      const reviewsRes = await fetch(`${API_BASE}/entrepreneur/reviews-summary/${userId}`)
      const reviewsData = await reviewsRes.json()
      if (reviewsRes.ok && reviewsData?.success) {
        applyDashboardStats(reviewsData.data || {})
      } else {
        setBusinessInfo((prev) => ({
          ...prev,
          rating: 0,
          totalReviews: 0,
          totalViews: 0,
          viewsChangePercent: 0,
        }))
        setNewReviewsCount(0)
        setTodayReviewsCount(0)
        setReviews([])
      }
    } catch (error) {
      console.error("ดึงสถิติ dashboard ไม่สำเร็จ:", error)
    }
  }, [applyDashboardStats])

  const loadGalleryImages = async (userId) => {
    if (!userId) {
      setGalleryImages([])
      return
    }

    setGalleryLoading(true)
    try {
      const res = await fetch(`${API_BASE}/entrepreneur/place-gallery/${userId}`)
      const data = await res.json()
      if (!res.ok || !data?.success) {
        setGalleryImages([])
        return
      }

      setGalleryImages(
        (data.data || []).map((img) => ({
          id: img.id,
          url: img.imageUrl,
          uploadDate: img.uploadDate || "-",
        }))
      )
    } catch {
      setGalleryImages([])
    } finally {
      setGalleryLoading(false)
    }
  }

  const handleAddImages = async (event) => {
    const files = Array.from(event.target.files || [])
    event.target.value = ""
    const userId = getUserId()
    if (!files.length || !userId || !profileIds.placeId) {
      if (!profileIds.placeId) {
        showAppAlert("ยังไม่มีสถานที่ผูกกับบัญชี ไม่สามารถเพิ่มรูปได้")
      }
      return
    }

    setGalleryUploading(true)
    try {
      for (const file of files) {
        const formData = new FormData()
        formData.append("userId", String(userId))
        formData.append("placeId", String(profileIds.placeId))
        formData.append("image", file)

        const res = await fetch(`${API_BASE}/entrepreneur/place-gallery`, {
          method: "POST",
          body: formData,
        })
        const data = await res.json()
        if (!res.ok || !data?.success) {
          throw new Error(data?.message || "อัปโหลดรูปภาพไม่สำเร็จ")
        }
      }
      await loadGalleryImages(userId)
    } catch (err) {
      showAppAlert(err?.message || "อัปโหลดรูปภาพไม่สำเร็จ", { title: "เกิดข้อผิดพลาด", variant: "destructive" })
    } finally {
      setGalleryUploading(false)
    }
  }

  const handleReplaceImage = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    const userId = getUserId()
    if (!file || !userId || !replacingImageId) return

    setGalleryUploading(true)
    try {
      const formData = new FormData()
      formData.append("userId", String(userId))
      formData.append("image", file)

      const res = await fetch(`${API_BASE}/entrepreneur/place-gallery/${replacingImageId}`, {
        method: "PUT",
        body: formData,
      })
      const data = await res.json()
      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "แก้ไขรูปภาพไม่สำเร็จ")
      }
      await loadGalleryImages(userId)
    } catch (err) {
      showAppAlert(err?.message || "แก้ไขรูปภาพไม่สำเร็จ", { title: "เกิดข้อผิดพลาด", variant: "destructive" })
    } finally {
      setGalleryUploading(false)
      setReplacingImageId(null)
    }
  }

  const handleDeleteImage = async (imageId) => {
    const userId = getUserId()
    if (!userId || !imageId) return
    const confirmed = await showAppConfirm("ต้องการลบรูปภาพนี้หรือไม่?")
    if (!confirmed) return

    try {
      const res = await fetch(
        `${API_BASE}/entrepreneur/place-gallery/${imageId}?userId=${userId}`,
        { method: "DELETE" }
      )
      const data = await res.json()
      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "ลบรูปภาพไม่สำเร็จ")
      }
      await loadGalleryImages(userId)
    } catch (err) {
      showAppAlert(err?.message || "ลบรูปภาพไม่สำเร็จ", { title: "เกิดข้อผิดพลาด", variant: "destructive" })
    }
  }

  const handleSaveChanges = async ({ resubmit = false } = {}) => {
    if (!currentUser?.id && !currentUser?.userId) return

    setIsSaving(true)
    try {
      const userId = currentUser.id || currentUser.userId
      const res = await fetch(`${API_BASE}/entrepreneur/by-user/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entrepreneurId: profileIds.entrepreneurId,
          placeId: profileIds.placeId,
          name: businessInfo.name,
          category: businessInfo.category,
          description: businessInfo.description,
          address: businessInfo.address,
          phone: businessInfo.phone,
          email: businessInfo.email,
          resubmit,
        }),
      })

      const data = await res.json()
      if (!res.ok || !data?.success) {
        showAppAlert(data?.message || "อัปเดตข้อมูลไม่สำเร็จ", { title: "เกิดข้อผิดพลาด", variant: "destructive" })
        return
      }

      const updatedUser = {
        ...(currentUser || {}),
        email: businessInfo.email,
        phone: businessInfo.phone,
      }
      setCurrentUser(updatedUser)
      localStorage.setItem("user", JSON.stringify(updatedUser))

      setIsEditMode(false)
      if (resubmit) {
        setShowRejectedEditForm(false)
        setEntrepreneurStatus("pending")
        setRejectReasons([])
        await showAppAlert(data?.message || "บันทึกและส่งขออนุมัติใหม่สำเร็จ", { title: "สำเร็จ" })
      }
    } catch {
      showAppAlert("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้", { title: "เกิดข้อผิดพลาด", variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  // ดึงข้อมูลผู้ประกอบการ + สรุปรีวิวจาก backend ตาม user ที่ล็อกอิน
  useEffect(() => {
    const fetchEntrepreneurProfile = async () => {
      if (!currentUser?.id && !currentUser?.userId) return

      try {
        const userId = currentUser.id || currentUser.userId
        const res = await fetch(`${API_BASE}/entrepreneur/by-user/${userId}`)
        const data = await res.json()

        if (!res.ok || !data?.success) {
          console.warn('ไม่พบข้อมูลผู้ประกอบการ หรือคำขอไม่สำเร็จ')
          return
        }

        const info = data.data

        setProfileIds({
          entrepreneurId: info.entrepreneur_id || null,
          placeId: info.place_id || null,
        })

        setBusinessInfo((prev) => ({
          ...prev,
          name: info.business_name || info.place_name || prev.name || "ธุรกิจของคุณ",
          category: info.business_type || info.category || prev.category || "ยังไม่ระบุ",
          // ผูกตรงกับคอลัมน์ entrepreneur.description
          description: info.description ?? "",
          address: info.address || info.location || prev.address || "",
          phone: info.phone || info.user_phone || currentUser.phone || prev.phone || "",
          email: info.email || currentUser.email || prev.email || "",
        }))

        await refreshDashboardStats(userId)
        await loadGalleryImages(userId)
      } catch (error) {
        console.error('ดึงข้อมูลผู้ประกอบการไม่สำเร็จ:', error)
      }
    }

    if (currentUser?.userType === 'business' || currentUser?.userType === 'entrepreneur' || currentUser?.role === 'entrepreneur') {
      fetchEntrepreneurProfile()
    }
  }, [currentUser, refreshDashboardStats])

  useEffect(() => {
    const userId = getUserId()
    if (!userId || entrepreneurStatus !== "approved") return

    const refresh = () => refreshDashboardStats(userId)
    const intervalId = window.setInterval(refresh, 30000)
    const onFocus = () => refresh()
    window.addEventListener("focus", onFocus)

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener("focus", onFocus)
    }
  }, [entrepreneurStatus, currentUser, refreshDashboardStats])

  if (isCheckingStatus) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-stone-50">
        <div className="text-sm text-stone-600">กำลังตรวจสอบสิทธิ์...</div>
      </div>
    )
  }

  const renderDashboardHeader = () => (
    <header className="sticky top-0 z-50 bg-white border-b shadow-sm">
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-amber-600 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg">ผู้ประกอบการ</h1>
              <p className="text-xs text-muted-foreground">จัดการสถานที่ของคุณ</p>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" asChild className="hidden sm:flex">
            <Link to="/">กลับหน้าหลัก</Link>
          </Button>
          {currentUser && (
            <div className="flex items-center gap-2 pl-2 border-l border-stone-200">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-stone-700 leading-none">
                  {currentUser.username || currentUser.email?.split("@")[0]}
                </p>
                <p className="text-[10px] text-muted-foreground uppercase mt-1">
                  {currentUser.userType || currentUser.role}
                </p>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-red-500 hover:text-red-700 hover:bg-red-50"
            title="ออกจากระบบ"
          >
            <LogOut className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">ออก</span>
          </Button>
        </div>
      </div>
    </header>
  )

  if (entrepreneurStatus === "pending") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-stone-50">
        <div className="rounded-lg border bg-white p-6 w-full max-w-lg shadow-lg">
          <div className="text-lg font-bold text-stone-900 mb-4">ผู้ประกอบการยังไม่ได้รับการอนุมัติ</div>

          <div
            className="text-sm font-medium"
            style={{
              backgroundColor: "#fde68a",
              color: "#854d0e",
              padding: "10px 12px",
              borderRadius: "10px",
              border: "1px solid #f59e0b",
            }}
          >
            {getStatusText(entrepreneurStatus)}
          </div>

          <div className="mt-4 flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                window.location.href = "/login"
              }}
            >
              กลับหน้าเข้าสู่ระบบ
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (entrepreneurStatus === "rejected") {
    return (
      <div className="min-h-screen bg-stone-50">
        {renderDashboardHeader()}
        <main className="p-4 lg:p-6">
          <div className="max-w-3xl mx-auto space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-stone-900">{statusBusinessName}</h1>
              <p className="text-muted-foreground">สถานะการอนุมัติธุรกิจ</p>
            </div>

            <Card className="border-red-200 bg-red-50/40">
              <CardHeader>
                <CardTitle className="text-red-800">คำขอไม่ผ่านการอนุมัติ</CardTitle>
                <CardDescription className="text-red-700/80">
                  {getStatusText(entrepreneurStatus)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-stone-900 mb-2">เหตุผลที่ถูกปฏิเสธ</p>
                  {rejectReasons.length > 0 ? (
                    <ul className="list-disc pl-5 space-y-2 text-sm text-stone-700">
                      {rejectReasons.map((reason, index) => (
                        <li key={`${reason}-${index}`}>{reason}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-stone-600">
                      ผู้ดูแลระบบยังไม่ได้ระบุเหตุผลเพิ่มเติม กรุณาติดต่อผู้ดูแลระบบเพื่อสอบถามรายละเอียด
                    </p>
                  )}
                </div>

                <p className="text-sm text-stone-600">
                  กรุณาแก้ไขข้อมูลตามเหตุผลด้านบน แล้วส่งขออนุมัติใหม่อีกครั้ง
                </p>

                <div className="flex flex-col sm:flex-row gap-2">
                  <Button variant="outline" className="flex-1" asChild>
                    <Link to="/">กลับหน้าหลัก</Link>
                  </Button>
                  <Button
                    className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
                    onClick={() => {
                      setShowRejectedEditForm(true)
                      setIsEditMode(true)
                    }}
                  >
                    กลับไปแก้ไขข้อมูล
                  </Button>
                </div>
              </CardContent>
            </Card>

            {showRejectedEditForm && (
              <Card>
                <CardHeader>
                  <CardTitle>แก้ไขข้อมูลธุรกิจ</CardTitle>
                  <CardDescription>
                    ปรับข้อมูลให้ตรงตามเหตุผลที่ถูกปฏิเสธ แล้วกดบันทึกเพื่อส่งขออนุมัติใหม่
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="rejected-name">ชื่อสถานที่/ธุรกิจ</Label>
                    <Input
                      id="rejected-name"
                      value={businessInfo.name}
                      onChange={(e) => setBusinessInfo({ ...businessInfo, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rejected-category">หมวดหมู่</Label>
                    <Input
                      id="rejected-category"
                      value={businessInfo.category}
                      onChange={(e) => setBusinessInfo({ ...businessInfo, category: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rejected-description">คำอธิบาย</Label>
                    <Textarea
                      id="rejected-description"
                      rows={4}
                      value={businessInfo.description}
                      onChange={(e) => setBusinessInfo({ ...businessInfo, description: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rejected-address">ที่อยู่</Label>
                    <Textarea
                      id="rejected-address"
                      rows={3}
                      value={businessInfo.address}
                      onChange={(e) => setBusinessInfo({ ...businessInfo, address: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="rejected-phone">เบอร์โทรศัพท์</Label>
                      <Input
                        id="rejected-phone"
                        value={businessInfo.phone}
                        onChange={(e) => setBusinessInfo({ ...businessInfo, phone: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="rejected-email">อีเมล</Label>
                      <Input
                        id="rejected-email"
                        type="email"
                        value={businessInfo.email}
                        onChange={(e) => setBusinessInfo({ ...businessInfo, email: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 pt-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setShowRejectedEditForm(false)
                        setIsEditMode(false)
                      }}
                      disabled={isSaving}
                    >
                      ยกเลิก
                    </Button>
                    <Button
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                      onClick={() => handleSaveChanges({ resubmit: true })}
                      disabled={isSaving}
                    >
                      <Save size={18} />
                      {isSaving ? "กำลังบันทึก..." : "บันทึกและส่งขออนุมัติใหม่"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>
    )
  }

  if (entrepreneurStatus !== "approved") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-stone-50">
        <div className="rounded-lg border bg-white p-6 w-full max-w-lg shadow-lg">
          <div className="text-lg font-bold text-stone-900 mb-4">ไม่สามารถเข้าใช้งานได้</div>
          <p className="text-sm text-stone-600">{getStatusText(entrepreneurStatus)}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b shadow-sm">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="lg:hidden">
              {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </Button>
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-amber-600 rounded-lg flex items-center justify-center">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-lg">ผู้ประกอบการ</h1>
                <p className="text-xs text-muted-foreground">จัดการสถานที่ของคุณ</p>
              </div>
            </Link>
          </div>

          {/*แก้ไขส่วน Header ขวา: แสดงชื่อผู้ใช้และปุ่มออกระบบ */}
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" asChild className="hidden sm:flex">
              <Link to="/">กลับหน้าหลัก</Link>
            </Button>

            {currentUser && (
              <div className="flex items-center gap-2 pl-2 border-l border-stone-200">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-bold text-stone-700 leading-none">
                    {currentUser.username || currentUser.email?.split('@')[0]}
                  </p>
                  <p className="text-[10px] text-muted-foreground uppercase mt-1">
                    {currentUser.userType || currentUser.role}
                  </p>
                </div>
                <div className="w-8 h-8 bg-amber-600 rounded-full flex items-center justify-center text-white font-bold">
                  {(currentUser.username || currentUser.email || 'E').charAt(0).toUpperCase()}
                </div>
              </div>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-red-500 hover:text-red-700 hover:bg-red-50 ml-1"
              title="ออกจากระบบ"
            >
              <LogOut className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">ออก</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`${
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          } fixed lg:sticky lg:translate-x-0 top-[57px] left-0 h-[calc(100vh-57px)] w-64 bg-white border-r shadow-lg lg:shadow-none transition-transform duration-300 z-40`}
        >
          <nav className="p-4 space-y-2">
            <Button variant="default" className="w-full justify-start gap-2 bg-amber-600 hover:bg-amber-700">
              <Building2 size={18} />
              จัดการร้าน
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-2">
              <Eye size={18} />
              สถิติผู้เข้าชม
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-2">
              <Star size={18} />
              รีวิวทั้งหมด
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-2">
              <ImageIcon size={18} />
              คลังภาพ
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-2">
              <Clock size={18} />
              ประวัติการแก้ไข
            </Button>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-6 bg-stone-100">
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Header Section */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-stone-900">{businessInfo.name}</h1>
                <p className="text-muted-foreground">จัดการข้อมูลและติดตามสถิติของคุณ</p>
              </div>
              {!isEditMode ? (
                <Button onClick={() => setIsEditMode(true)} className="bg-amber-600 hover:bg-amber-700 gap-2">
                  <Edit size={18} />
                  แก้ไขข้อมูล
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setIsEditMode(false)}>
                    ยกเลิก
                  </Button>
                  <Button onClick={handleSaveChanges} disabled={isSaving} className="bg-amber-600 hover:bg-amber-700 gap-2">
                    <Save size={18} />
                    {isSaving ? "กำลังบันทึก..." : "บันทึก"}
                  </Button>
                </div>
              )}
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">ผู้เข้าชมทั้งหมด</p>
                      <p className="text-3xl font-bold mt-2">{businessInfo.totalViews.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {businessInfo.viewsChangePercent > 0
                          ? `+${businessInfo.viewsChangePercent}% จากเดือนที่แล้ว`
                          : businessInfo.viewsChangePercent < 0
                            ? `${businessInfo.viewsChangePercent}% จากเดือนที่แล้ว`
                            : "0% จากเดือนที่แล้ว"}
                      </p>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <Eye className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">คะแนนเฉลี่ย</p>
                      <p className="text-3xl font-bold mt-2">{businessInfo.rating}</p>
                      <p className="text-xs text-muted-foreground mt-1">จาก {businessInfo.totalReviews} รีวิว</p>
                    </div>
                    <div className="bg-amber-50 p-3 rounded-lg">
                      <Star className="w-6 h-6 text-amber-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">รีวิวใหม่</p>
                      <p className="text-3xl font-bold mt-2">{newReviewsCount}</p>
                      <p className="text-xs text-muted-foreground mt-1">+{todayReviewsCount} วันนี้</p>
                    </div>
                    <div className="bg-purple-50 p-3 rounded-lg">
                      <MessageSquare className="w-6 h-6 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Content Tabs */}
            <Tabs defaultValue="info" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="info">ข้อมูลร้าน</TabsTrigger>
                <TabsTrigger value="reviews">รีวิว ({businessInfo.totalReviews})</TabsTrigger>
                <TabsTrigger value="gallery">คลังภาพ ({galleryImages.length})</TabsTrigger>
              </TabsList>

              {/* Tab: ข้อมูลร้าน */}
              <TabsContent value="info" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>ข้อมูลสถานที่</CardTitle>
                    <CardDescription>จัดการข้อมูลพื้นฐานของสถานที่ท่องเที่ยว</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {isEditMode ? (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="name">ชื่อสถานที่</Label>
                          <Input
                            id="name"
                            value={businessInfo.name}
                            onChange={(e) => setBusinessInfo({ ...businessInfo, name: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="category">หมวดหมู่</Label>
                          <Input
                            id="category"
                            value={businessInfo.category}
                            onChange={(e) => setBusinessInfo({ ...businessInfo, category: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="description">คำอธิบาย</Label>
                          <Textarea
                            id="description"
                            rows={4}
                            value={businessInfo.description}
                            onChange={(e) => setBusinessInfo({ ...businessInfo, description: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="address">ที่อยู่</Label>
                          <Textarea
                            id="address"
                            rows={3}
                            value={businessInfo.address}
                            onChange={(e) => setBusinessInfo({ ...businessInfo, address: e.target.value })}
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="phone">เบอร์โทรศัพท์</Label>
                            <Input
                              id="phone"
                              value={businessInfo.phone}
                              onChange={(e) => setBusinessInfo({ ...businessInfo, phone: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="email">อีเมล</Label>
                            <Input
                              id="email"
                              type="email"
                              value={businessInfo.email}
                              onChange={(e) => setBusinessInfo({ ...businessInfo, email: e.target.value })}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="website">เว็บไซต์</Label>
                            <Input
                              id="website"
                              value={businessInfo.website}
                              onChange={(e) => setBusinessInfo({ ...businessInfo, website: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="hours">เวลาทำการ</Label>
                            <Input
                              id="hours"
                              value={businessInfo.openingHours}
                              onChange={(e) => setBusinessInfo({ ...businessInfo, openingHours: e.target.value })}
                            />
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="space-y-4">
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">หมวดหมู่</p>
                            <p className="font-medium">{businessInfo.category}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">คำอธิบาย</p>
                            <p className="text-sm">{businessInfo.description}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">ที่อยู่</p>
                            <div className="flex items-start gap-2">
                              <MapPin className="w-4 h-4 mt-1 text-muted-foreground" />
                              <p className="text-sm">{businessInfo.address}</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-muted-foreground mb-1">เบอร์โทรศัพท์</p>
                              <div className="flex items-center gap-2">
                                <Phone className="w-4 h-4 text-muted-foreground" />
                                <p className="text-sm">{businessInfo.phone}</p>
                              </div>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground mb-1">อีเมล</p>
                              <div className="flex items-center gap-2">
                                <Mail className="w-4 h-4 text-muted-foreground" />
                                <p className="text-sm">{businessInfo.email}</p>
                              </div>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-muted-foreground mb-1">เว็บไซต์</p>
                              <div className="flex items-center gap-2">
                                <Globe className="w-4 h-4 text-muted-foreground" />
                                <p className="text-sm">{businessInfo.website}</p>
                              </div>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground mb-1">เวลาทำการ</p>
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-muted-foreground" />
                                <p className="text-sm">{businessInfo.openingHours}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tab: รีวิว */}
              <TabsContent value="reviews" className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>รีวิวทั้งหมด</CardTitle>
                        <CardDescription>ดูและจัดการรีวิวจากผู้เยี่ยมชม</CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                        <span className="text-2xl font-bold">{businessInfo.rating}</span>
                        <span className="text-sm text-muted-foreground">({businessInfo.totalReviews} รีวิว)</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {reviews.length === 0 ? (
                      <p className="text-sm text-muted-foreground">ยังไม่มีรีวิวในระบบ</p>
                    ) : (
                      reviews.map((review) => (
                        <div key={review.id} className="border rounded-lg p-4 space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center font-semibold text-amber-700">
                                {review.userAvatar}
                              </div>
                              <div>
                                <p className="font-semibold">{review.userName}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <div className="flex items-center">
                                    {[...Array(5)].map((_, i) => (
                                      <Star
                                        key={i}
                                        className={`w-4 h-4 ${
                                          i < review.rating
                                            ? "fill-amber-400 text-amber-400"
                                            : "fill-stone-200 text-stone-200"
                                        }`}
                                      />
                                    ))}
                                  </div>
                                  <span className="text-xs text-muted-foreground">{review.date}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <p className="text-sm text-stone-700">{review.comment}</p>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tab: คลังภาพ */}
              <TabsContent value="gallery" className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>คลังภาพ</CardTitle>
                        <CardDescription>จัดการภาพทั้งหมดของสถานที่</CardDescription>
                      </div>
                      <Button
                        className="bg-amber-600 hover:bg-amber-700 gap-2"
                        disabled={galleryUploading || !profileIds.placeId}
                        onClick={() => addImageInputRef.current?.click()}
                      >
                        <Plus size={18} />
                        {galleryUploading ? "กำลังอัปโหลด..." : "เพิ่มภาพ"}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <input
                      ref={addImageInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleAddImages}
                    />
                    <input
                      ref={replaceImageInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleReplaceImage}
                    />

                    {!profileIds.placeId && !galleryLoading && (
                      <p className="text-sm text-muted-foreground mb-4">
                        ยังไม่มีสถานที่ผูกกับบัญชีผู้ประกอบการ จึงยังไม่สามารถจัดการคลังภาพได้
                      </p>
                    )}

                    {galleryLoading ? (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {[1, 2, 3].map((n) => (
                          <div key={n} className="aspect-square rounded-lg bg-muted animate-pulse" />
                        ))}
                      </div>
                    ) : galleryImages.length === 0 ? (
                      <p className="text-sm text-muted-foreground">ยังไม่มีรูปภาพในคลัง</p>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {galleryImages.map((image) => (
                          <div key={image.id} className="group relative aspect-square rounded-lg overflow-hidden border">
                            <img
                              src={image.url || "/placeholder.svg"}
                              alt={`ภาพสถานที่ ${image.id}`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.onerror = null
                                e.currentTarget.src = "/placeholder.svg"
                              }}
                            />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-3">
                              <p className="text-xs text-stone-200">{image.uploadDate}</p>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="h-8 gap-1"
                                  disabled={galleryUploading}
                                  onClick={() => {
                                    setReplacingImageId(image.id)
                                    replaceImageInputRef.current?.click()
                                  }}
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                  แก้ไข
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="h-8 gap-1"
                                  disabled={galleryUploading}
                                  onClick={() => handleDeleteImage(image.id)}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  ลบ
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  )
}

import { useState, useCallback, useEffect } from "react"
import { Link } from "react-router-dom"
import { Menu, Bell, Home } from "lucide-react"
import { AdminSidebar } from "./Admin-components/admin-sidebar.js"
import { AdminOverview } from "./Admin-components/admin-overview"
import { PlacesManager } from "./Admin-components/places-manager"
import { TripsManager } from "./Admin-components/trips-manager"
import { AdminSettings } from "./Admin-components/admin-settings"
import { Button } from "./Admin-components/Aui/button"
import { Badge } from "./Admin-components/Aui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./Admin-components/Aui/dialog"
import { API_BASE_URL } from "../lib/api.js"

function mapTripFromApi(t, { full = false } = {}) {
  const itineraryFromApi =
    full && Array.isArray(t.itinerary) && t.itinerary.length > 0
      ? t.itinerary.map((d, i) => ({
          day: d.day != null ? d.day : i + 1,
          title: d.title ?? "",
          description: d.description ?? "",
          places: Array.isArray(d.places) ? d.places : [],
        }))
      : [{ day: 1, title: "", places: [], description: "" }]

  const hasCover = Boolean(t.has_cover_image || t.cover_image_url)
  const coverUrl = t.cover_image_url || (hasCover ? null : "/placeholder.svg")

  return {
    id: t.recommend_id,
    title: t.trip_name,
    description: t.description || "",
    coverImageUrl: coverUrl || "/placeholder.svg",
    hasCoverImage: hasCover,
    duration: Math.max(Number(t.duration_days) || 1, 1),
    activityCount: Number(t.stops_count) || 0,
    category: t.trip_category || "",
    itinerary: itineraryFromApi,
    status: t.status === "published" ? "published" : "draft",
    _loadedFull: full,
  }
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState(() => {
    const saved =
      typeof window !== "undefined"
        ? window.localStorage.getItem("adminActiveTab")
        : null
    const allowed = new Set(["overview", "places", "trips", "settings"])
    return saved && allowed.has(saved) ? saved : "overview"
  })
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const [places, setPlaces] = useState([])
  const [trips, setTrips] = useState([])

  const [pendingCount, setPendingCount] = useState(0)
  const [pendingEntrepreneurs, setPendingEntrepreneurs] = useState([])
  const [approvalOpen, setApprovalOpen] = useState(false)
  const [rejectingEntrepreneurId, setRejectingEntrepreneurId] = useState(null)
  const [rejectReasons, setRejectReasons] = useState([])
  const [rejectOtherReason, setRejectOtherReason] = useState("")

  const rejectReasonOptions = [
    "เอกสารประกอบไม่ครบถ้วน",
    "ข้อมูลธุรกิจไม่ถูกต้องหรือไม่ชัดเจน",
    "เบอร์ติดต่อ/อีเมลไม่สามารถติดต่อได้",
    "ประเภทธุรกิจไม่ตรงตามเงื่อนไขการอนุมัติ",
  ]

  const fetchPending = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/entrepreneurs?status=pending`)
      const data = await res.json()
      if (!res.ok || !data?.success) return
      setPendingEntrepreneurs(data.data || [])
      setPendingCount((data.data || []).length)
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    // ดึงจำนวนรออนุมัติครั้งแรก
    fetchPending()
  }, [])

  const fetchPlaces = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/places`)
      const data = await res.json()
      if (!res.ok || !data?.success) return

      const mapped = (data.data || []).map((p) => ({
        id: p.place_id,
        name: p.place_name,
        category: p.category || "",
        location: p.location || "",
        imageUrl: p.image_url || "/placeholder.svg",
        hasCoverImage: Boolean(p.image_url),
        rating: Number(p.rating || 0),
        description: p.description || "",
        openTime: p.open_time ? String(p.open_time).slice(0, 5) : "",
        closeTime: p.close_time ? String(p.close_time).slice(0, 5) : "",
        entrepreneurId: p.entrepreneur_id ?? null,
        entrepreneurName: p.entrepreneur_name || "",
        entrepreneurStatus: p.entrepreneur_status || null,
      }))
      setPlaces(mapped)
    } catch {
      // ignore
    }
  }

  const fetchTrips = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/trips?summary=1`)
      const data = await res.json()
      if (!res.ok || !data?.success) return

      const mapped = (data.data || []).map((t) => mapTripFromApi(t, { full: false }))
      setTrips(mapped)
    } catch {
      // ignore
    }
  }

  const fetchTripDetail = useCallback(async (id) => {
    const res = await fetch(`${API_BASE_URL}/admin/trips/${id}`)
    const data = await res.json()
    if (!res.ok || !data?.success || !data.data) {
      throw new Error(data?.message || "โหลดรายละเอียดแผนไม่สำเร็จ")
    }
    return mapTripFromApi(data.data, { full: true })
  }, [])

  useEffect(() => {
    if (activeTab === "places") {
      fetchPlaces()
    }
  }, [activeTab])

  useEffect(() => {
    if (activeTab === "trips") {
      fetchTrips()
    }
  }, [activeTab])

  useEffect(() => {
    if (approvalOpen) {
      fetchPending()
    }
  }, [approvalOpen])

  useEffect(() => {
    window.localStorage.setItem("adminActiveTab", activeTab)
  }, [activeTab])

  const toggleRejectReason = (reason) => {
    setRejectReasons((prev) =>
      prev.includes(reason) ? prev.filter((item) => item !== reason) : [...prev, reason]
    )
  }

  const submitReject = async (entrepreneurId) => {
    const payload = {
      status: "rejected",
      reasons: rejectReasons,
      other_reason: rejectOtherReason.trim(),
    }
    await fetch(`${API_BASE_URL}/admin/entrepreneur/${entrepreneurId}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    setRejectingEntrepreneurId(null)
    setRejectReasons([])
    setRejectOtherReason("")
    fetchPending()
  }

  // --- Places CRUD ---
  const addPlace = useCallback((placeData) => {
    return fetch(`${API_BASE_URL}/admin/places`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: placeData.name,
        category: placeData.category,
        location: placeData.location,
        description: placeData.description,
        imageUrl: placeData.imageUrl,
        openTime: placeData.openTime,
        closeTime: placeData.closeTime,
      }),
    }).then(async (res) => {
      const data = await res.json()
      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "เพิ่มสถานที่ไม่สำเร็จ")
      }
      await fetchPlaces()
    })
  }, [])

  const editPlace = useCallback((id, data) => {
    const payload = { ...data }
    const imageUrl = (payload.imageUrl || "").trim()
    if (
      imageUrl &&
      !imageUrl.startsWith("data:") &&
      imageUrl.includes("/cover-image")
    ) {
      delete payload.imageUrl
    }

    return fetch(`${API_BASE_URL}/admin/places/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: payload.name,
        category: payload.category,
        location: payload.location,
        description: payload.description,
        imageUrl: payload.imageUrl,
        openTime: payload.openTime,
        closeTime: payload.closeTime,
      }),
    }).then(async (res) => {
      const body = await res.json()
      if (!res.ok || !body?.success) {
        throw new Error(body?.message || "แก้ไขสถานที่ไม่สำเร็จ")
      }
      await fetchPlaces()
    })
  }, [])

  const deletePlace = useCallback((id) => {
    return fetch(`${API_BASE_URL}/admin/places/${id}`, {
      method: "DELETE",
    }).then(async (res) => {
      const body = await res.json()
      if (!res.ok || !body?.success) {
        throw new Error(body?.message || "ลบสถานที่ไม่สำเร็จ")
      }
      await fetchPlaces()
    })
  }, [])

  // --- Trips CRUD ---
  const addTrip = useCallback((tripData) => {
    return fetch(`${API_BASE_URL}/admin/trips`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: tripData.title,
        description: tripData.description,
        itinerary: tripData.itinerary,
        coverImageUrl: tripData.coverImageUrl,
        category: tripData.category || null,
        status: tripData.status === "published" ? "published" : "draft",
      }),
    }).then(async (res) => {
      const data = await res.json()
      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "สร้างแผนการเดินทางไม่สำเร็จ")
      }
      await fetchTrips()
    })
  }, [])

  const editTrip = useCallback((id, data) => {
    const current = trips.find((t) => t.id === id)
    const merged = { ...(current || {}), ...(data || {}) }

    return fetch(`${API_BASE_URL}/admin/trips/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: merged.title,
        description: merged.description,
        itinerary: merged.itinerary,
        coverImageUrl: merged.coverImageUrl,
        category: merged.category || null,
        status: merged.status === "published" ? "published" : "draft",
      }),
    }).then(async (res) => {
      const body = await res.json()
      if (!res.ok || !body?.success) {
        throw new Error(body?.message || "แก้ไขแผนการเดินทางไม่สำเร็จ")
      }
      await fetchTrips()
    })
  }, [trips])

  const deleteTrip = useCallback((id) => {
    return fetch(`${API_BASE_URL}/admin/trips/${id}`, {
      method: "DELETE",
    }).then(async (res) => {
      const body = await res.json()
      if (!res.ok || !body?.success) {
        throw new Error(body?.message || "ลบแผนการเดินทางไม่สำเร็จ")
      }
      await fetchTrips()
    })
  }, [])

  const tabLabels = {
    overview: "ภาพรวม",
    places: "สถานที่",
    trips: "แผนการเดินทาง",
    settings: "ตั้งค่า",
  }

  return (
    // พื้นหลังหลักของหน้า Admin
    <div className="flex h-screen w-full bg-stone-50 overflow-hidden">
      <div className="hidden md:block mt-16 h-[calc(100vh-4rem)] shrink-0 z-10 shadow-sm">
        <AdminSidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>

      {/* Sidebar - Mobile */}
      <div 
        className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out md:hidden ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <AdminSidebar
          activeTab={activeTab}
          onTabChange={(tab) => {
            setActiveTab(tab)
            setMobileMenuOpen(false)
          }}
          collapsed={false}
          onToggleCollapse={() => setMobileMenuOpen(false)}
        />
      </div>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden w-full">
        {/* Top bar */}
        <header
          className="flex h-16 shrink-0 items-center justify-between border-b border-stone-200 px-4 shadow-sm z-0"
          style={{ backgroundColor: "#0f4cd8", color: "#ffffff" }}
        >
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-stone-600 hover:bg-stone-100"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/">
              <Button
                variant="outline"
                size="sm"
                className="gap-2 border-none"
                style={{
                  backgroundColor: "#ff4fa3",
                  color: "#ffffff",
                }}
              >
                <Home className="h-4 w-4" />
                <span className="hidden sm:inline">กลับหน้าหลัก</span>
              </Button>
            </Link>

            <Dialog open={approvalOpen} onOpenChange={setApprovalOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative"
                  style={{
                    backgroundColor: "#ffffff",
                    borderRadius: "9999px",
                    width: "36px",
                    height: "36px",
                    color: "#0f4cd8",
                  }}
                >
                  <Bell className="h-5 w-5" />
                  <Badge className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 p-0 text-[10px] text-white border-2 border-white">
                    {pendingCount}
                  </Badge>
                </Button>
              </DialogTrigger>

              <DialogContent
                style={{ maxHeight: "85vh" }}
                className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"
              >
                <div className="shrink-0 border-b px-6 pt-6 pb-4 pr-8">
                  <DialogHeader>
                    <DialogTitle>รอการอนุมัติธุรกิจ</DialogTitle>
                    <DialogDescription>
                      แสดงข้อมูล entrepreneur ที่สถานะเป็น <code>pending</code>
                    </DialogDescription>
                  </DialogHeader>
                </div>

                <div className="dialog-scroll-no-scrollbar min-h-0 flex-1 overflow-y-auto px-6 py-4">
                  <div className="space-y-3">
                    {pendingEntrepreneurs.length === 0 ? (
                      <p className="text-sm text-stone-600">ไม่มีคำขอรออนุมัติ</p>
                    ) : (
                      pendingEntrepreneurs.map((e) => (
                        <div
                          key={e.entrepreneur_id}
                          className="rounded-lg border p-3 flex flex-col gap-2"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <div className="font-semibold">{e.business_name}</div>
                              <div className="text-sm text-stone-600">
                                {e.business_type || "-"}
                              </div>
                              <div className="text-sm text-stone-600">
                                ผู้ติดต่อ: {e.contact_name || "-"}
                              </div>
                              <div className="text-sm text-stone-600">
                                โทร: {e.phone || "-"}
                              </div>
                            </div>
                            <div className="text-sm font-medium">
                              สถานะ:{" "}
                              <span className="font-bold text-amber-700">{e.status}</span>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              style={{
                                backgroundColor: "#22c55e", // green
                                borderColor: "#22c55e",
                                color: "#ffffff",
                                cursor: "pointer",
                                transition: "background-color 150ms ease, border-color 150ms ease",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = "#16a34a"
                                e.currentTarget.style.borderColor = "#16a34a"
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = "#22c55e"
                                e.currentTarget.style.borderColor = "#22c55e"
                              }}
                              onClick={async () => {
                                await fetch(
                                  `${API_BASE_URL}/admin/entrepreneur/${e.entrepreneur_id}/status`,
                                  {
                                    method: "PUT",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ status: "approved" }),
                                  }
                                )
                                fetchPending()
                              }}
                            >
                              Approved
                            </Button>
                            <Button
                              variant="outline"
                              style={{
                                backgroundColor: "#ef4444", // red
                                borderColor: "#ef4444",
                                color: "#ffffff",
                                cursor: "pointer",
                                transition: "background-color 150ms ease, border-color 150ms ease",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = "#dc2626"
                                e.currentTarget.style.borderColor = "#dc2626"
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = "#ef4444"
                                e.currentTarget.style.borderColor = "#ef4444"
                              }}
                              onClick={async () => {
                                setRejectingEntrepreneurId((prev) =>
                                  prev === e.entrepreneur_id ? null : e.entrepreneur_id
                                )
                                setRejectReasons([])
                                setRejectOtherReason("")
                              }}
                            >
                              Rejected
                            </Button>
                          </div>

                          {rejectingEntrepreneurId === e.entrepreneur_id ? (
                            <div className="mt-2 rounded-lg border border-red-200 bg-red-50 p-3">
                              <p className="text-sm font-semibold text-red-700 mb-2">
                                เหตุผลที่ปฏิเสธการอนุมัติ
                              </p>
                              <div className="space-y-2">
                                {rejectReasonOptions.map((reason, index) => (
                                  <label key={reason} className="flex items-start gap-2 text-sm text-stone-700">
                                    <input
                                      type="checkbox"
                                      checked={rejectReasons.includes(reason)}
                                      onChange={() => toggleRejectReason(reason)}
                                      className="mt-1"
                                    />
                                    <span>
                                      {index + 1}. {reason}
                                    </span>
                                  </label>
                                ))}
                              </div>
                              <div className="mt-3">
                                <label className="text-sm font-medium text-stone-700">อื่นๆ</label>
                                <textarea
                                  value={rejectOtherReason}
                                  onChange={(event) => setRejectOtherReason(event.target.value)}
                                  placeholder="พิมพ์เหตุผลเพิ่มเติม"
                                  className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm"
                                  rows={3}
                                />
                              </div>
                              <div className="mt-3 flex gap-2">
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    setRejectingEntrepreneurId(null)
                                    setRejectReasons([])
                                    setRejectOtherReason("")
                                  }}
                                >
                                  ยกเลิก
                                </Button>
                                <Button
                                  style={{ backgroundColor: "#dc2626", color: "#ffffff" }}
                                  onClick={() => submitReject(e.entrepreneur_id)}
                                >
                                  ยืนยันปฏิเสธ
                                </Button>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        {/* Content area */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          {activeTab === "overview" && <AdminOverview />}
          {activeTab === "places" && <PlacesManager places={places} onAdd={addPlace} onEdit={editPlace} onDelete={deletePlace} />}
          {activeTab === "trips" && (
            <TripsManager
              trips={trips}
              onAdd={addTrip}
              onEdit={editTrip}
              onDelete={deleteTrip}
              onLoadTripDetail={fetchTripDetail}
              onRefreshTrips={fetchTrips}
            />
          )}
          {activeTab === "settings" && <AdminSettings />}
        </main>
      </div>
    </div>
  )
}
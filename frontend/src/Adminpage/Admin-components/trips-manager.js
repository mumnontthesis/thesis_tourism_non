import { useRef, useState, useEffect } from "react"
import { Button } from "./Aui/button"
import { Input } from "./Aui/input"
import { Textarea } from "./Aui/textarea"
import { Badge } from "./Aui/badge"
import { Card, CardContent } from "./Aui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "./Aui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./Aui/select"
import { Plus, Search, Pencil, Trash2, Calendar, Eye, EyeOff, X, ImagePlus } from "lucide-react"
import { TRIP_CATEGORIES, getTripCategoryLabel } from "../../lib/trip-categories"
import { API_BASE } from "../../lib/api.js"

const emptyDay = {
  day: 1,
  title: "",
  places: [],
  description: "",
}

/** day trip: สถานที่ซ้ำในวันเดียวกันได้ แต่ไม่เกินต่อวัน */
const MAX_PLACES_PER_DAY = 5

const emptyForm = {
  title: "",
  description: "",
  coverImageUrl: "",
  duration: 1,
  category: "",
  itinerary: [{ ...emptyDay }],
  status: "draft",
}

const PLACEHOLDER = "/placeholder.svg"

function tripCoverSrc(trip) {
  if (trip.coverImageUrl && trip.coverImageUrl !== PLACEHOLDER && !trip.coverImageUrl.startsWith("data:")) {
    return trip.coverImageUrl
  }
  if (trip.hasCoverImage) {
    return `${API_BASE}/trips/${trip.id}/cover-image`
  }
  return PLACEHOLDER
}

export function TripsManager({
  trips,
  onAdd,
  onEdit,
  onDelete,
  onLoadTripDetail,
  onRefreshTrips,
}) {
  const [search, setSearch] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingTrip, setEditingTrip] = useState(null)
  const [deletingTrip, setDeletingTrip] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const coverFileInputRef = useRef(null)
  /** รายการสถานที่จากตาราง place */
  const [placeOptions, setPlaceOptions] = useState([])
  const [placesLoading, setPlacesLoading] = useState(false)
  /** ค่าที่เลือกใน dropdown ต่อวัน (place_id เป็น string) */
  const [placePickerByDay, setPlacePickerByDay] = useState({})

  const filtered = trips.filter(
    (t) =>
      (t.title || "").toLowerCase().includes(search.toLowerCase()) ||
      (t.category || "").toLowerCase().includes(search.toLowerCase()) ||
      getTripCategoryLabel(t.category).toLowerCase().includes(search.toLowerCase())
  )

  function openAdd() {
    setEditingTrip(null)
    setForm(emptyForm)
    setPlacePickerByDay({})
    setDialogOpen(true)
  }

  async function openEdit(trip) {
    setEditingTrip(trip)
    setPlacePickerByDay({})
    setDialogOpen(true)
    setDetailLoading(true)

    try {
      const fullTrip = trip._loadedFull
        ? trip
        : onLoadTripDetail
          ? await onLoadTripDetail(trip.id)
          : trip

      const cleanedItinerary = (
        fullTrip.itinerary?.length > 0 ? fullTrip.itinerary : [{ ...emptyDay }]
      ).map((d) => ({
        ...d,
        places: (d.places || []).filter((n) => (n || "").trim() !== ""),
      }))

      setForm({
        title: fullTrip.title,
        description: fullTrip.description,
        coverImageUrl: fullTrip.coverImageUrl,
        duration: fullTrip.duration,
        category: fullTrip.category,
        itinerary: cleanedItinerary,
        status: fullTrip.status,
      })
      setEditingTrip(fullTrip)
    } catch (err) {
      alert(err?.message || "โหลดรายละเอียดแผนไม่สำเร็จ")
      setDialogOpen(false)
    } finally {
      setDetailLoading(false)
    }
  }

  useEffect(() => {
    if (!dialogOpen) return
    setPlacesLoading(true)
    fetch(`${API_BASE}/admin/places?summary=1`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.success && Array.isArray(d.data)) {
          setPlaceOptions(d.data)
        }
      })
      .catch(() => setPlaceOptions([]))
      .finally(() => setPlacesLoading(false))
  }, [dialogOpen])

  function addDay() {
    setForm({
      ...form,
      itinerary: [
        ...form.itinerary,
        {
          day: form.itinerary.length + 1,
          title: "",
          places: [],
          description: "",
        },
      ],
    })
  }

  function removeDay(index) {
    if (form.itinerary.length <= 1) return
    const updated = form.itinerary
      .filter((_, i) => i !== index)
      .map((d, i) => ({ ...d, day: i + 1 }))
    setForm({ ...form, itinerary: updated })
  }

  function updateDay(index, field, value) {
    const updated = [...form.itinerary]
    updated[index] = { ...updated[index], [field]: value }
    setForm({ ...form, itinerary: updated })
  }

  function addSelectedPlaceFromPicker(dayIndex) {
    const idStr = (placePickerByDay[dayIndex] || "").trim()
    if (!idStr) {
      alert("กรุณาเลือกสถานที่จากรายการ")
      return
    }
    const picked = placeOptions.find((p) => String(p.place_id) === idStr)
    const name = (picked?.place_name || "").trim()
    if (!name) {
      alert("ไม่พบชื่อสถานที่ที่เลือก")
      return
    }
    const updated = [...form.itinerary]
    const places = [...(updated[dayIndex].places || [])]
    if (places.length >= MAX_PLACES_PER_DAY) {
      alert(`วันนี้ใส่ได้สูงสุด ${MAX_PLACES_PER_DAY} สถานที่ (day trip)`)
      return
    }
    places.push(name)
    updated[dayIndex] = { ...updated[dayIndex], places }
    setForm({ ...form, itinerary: updated })
  }

  function removePlaceFromDay(dayIndex, placeIndex) {
    const updated = [...form.itinerary]
    const places = updated[dayIndex].places.filter((_, i) => i !== placeIndex)
    updated[dayIndex] = {
      ...updated[dayIndex],
      places,
    }
    setForm({ ...form, itinerary: updated })
  }

  function handlePickCoverImage(file) {
    if (!file) return
    if (!file.type.startsWith("image/")) {
      alert("กรุณาเลือกไฟล์รูปภาพ")
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result === "string") {
        setForm((prev) => ({ ...prev, coverImageUrl: result }))
      }
    }
    reader.readAsDataURL(file)
  }

  async function handleSave() {
    if (!form.title || !form.category) return
    setSaving(true)
    try {
      if (editingTrip) {
        await onEdit(editingTrip.id, form)
      } else {
        await onAdd(form)
      }
      setDialogOpen(false)
      setForm(emptyForm)
    } catch (err) {
      alert(err?.message || "บันทึกแผนการเดินทางไม่สำเร็จ")
    } finally {
      setSaving(false)
    }
  }

  function confirmDelete(trip) {
    setDeletingTrip(trip)
    setDeleteDialogOpen(true)
  }

  async function handleDelete() {
    if (deletingTrip) {
      try {
        await onDelete(deletingTrip.id)
        setDeleteDialogOpen(false)
        setDeletingTrip(null)
      } catch (err) {
        alert(err?.message || "ลบแผนการเดินทางไม่สำเร็จ")
      }
    }
  }

  async function toggleStatus(trip) {
    const nextStatus = trip.status === "published" ? "draft" : "published"
    try {
      const res = await fetch(`${API_BASE}/admin/trips/${trip.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      })
      const data = await res.json()
      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "อัปเดตสถานะไม่สำเร็จ")
      }
      if (onRefreshTrips) await onRefreshTrips()
    } catch (err) {
      alert(err?.message || "อัปเดตสถานะไม่สำเร็จ")
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            แผนการเดินทาง
          </h1>
          <p className="text-sm text-muted-foreground">
            สร้างและจัดการแผนการเดินทาง (Trip Plan)
          </p>
        </div>
        <Button onClick={openAdd} className="gap-2">
          <Plus className="h-4 w-4" />
          สร้างแผนใหม่
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="ค้นหาแผนการเดินทาง..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((trip) => (
          <Card
            key={trip.id}
            className="group overflow-hidden border-border bg-card"
          >
            <div className="relative aspect-video overflow-hidden">
              <img
                src={tripCoverSrc(trip)}
                alt={trip.title}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 bg-muted"
                onError={(e) => {
                  e.currentTarget.onerror = null
                  e.currentTarget.src = PLACEHOLDER
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
              <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                <Badge
                  variant="secondary"
                  className="bg-accent/90 text-accent-foreground backdrop-blur-sm"
                >
                  {getTripCategoryLabel(trip.category) || "—"}
                </Badge>
                <Badge
                  variant={trip.status === "published" ? "default" : "outline"}
                  className={
                    trip.status === "published"
                      ? "bg-success text-success-foreground"
                      : "border-card/60 bg-card/60 text-card-foreground backdrop-blur-sm"
                  }
                >
                  {trip.status === "published" ? "เผยแพร่แล้ว" : "ฉบับร่าง"}
                </Badge>
              </div>
            </div>
            <CardContent className="p-4">
              <h3 className="font-semibold text-foreground">{trip.title}</h3>
              <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                <span>{trip.duration} วัน</span>
                <span className="text-border">|</span>
                <span>{trip.activityCount ?? trip.itinerary?.length ?? 0} สถานที่</span>
              </div>
              <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                {trip.description}
              </p>
              <div className="mt-4 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-1.5"
                  onClick={() => openEdit(trip)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  แก้ไข
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => toggleStatus(trip)}
                >
                  {trip.status === "published" ? (
                    <EyeOff className="h-3.5 w-3.5" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => confirmDelete(trip)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
          <RouteIcon className="h-12 w-12 text-muted-foreground/40" />
          <p className="mt-4 text-sm text-muted-foreground">
            ไม่พบแผนการเดินทาง
          </p>
          <Button variant="outline" size="sm" className="mt-4" onClick={openAdd}>
            สร้างแผนใหม่
          </Button>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          className="sm:max-w-2xl"
          style={{ height: "85vh", display: "flex", flexDirection: "column" }}
        >
          <DialogHeader>
            <DialogTitle>
              {editingTrip ? "แก้ไขแผนการเดินทาง" : "สร้างแผนการเดินทางใหม่"}
            </DialogTitle>
            <DialogDescription>
              {editingTrip
                ? "แก้ไขข้อมูลแผนการเดินทาง"
                : "กรอกข้อมูลแผนการเดินทางที่ต้องการสร้าง"}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pr-1" style={{ minHeight: 0 }}>
            {detailLoading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">กำลังโหลดรายละเอียดแผน...</p>
            ) : null}
            <div className={`flex flex-col gap-4 ${detailLoading ? "pointer-events-none opacity-50" : ""}`}>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-foreground">
                ชื่อแผนการเดินทาง
              </label>
              <Input
                placeholder="เช่น เที่ยวเชียงใหม่ 3 วัน 2 คืน"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-foreground">
                หมวดหมู่
              </label>
              <Select
                value={form.category}
                onValueChange={(val) => setForm({ ...form, category: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="เลือกหมวดหมู่" />
                </SelectTrigger>
                <SelectContent>
                  {TRIP_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-foreground">
                รายละเอียด
              </label>
              <Textarea
                placeholder="อธิบายรายละเอียดแผนการเดินทาง..."
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                rows={2}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-foreground">
                  จำนวนวัน
                </label>
                <Input
                  type="number"
                  min={1}
                  value={form.duration}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      duration: parseInt(e.target.value) || 1,
                    })
                  }
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-foreground">
                  สถานะ
                </label>
                <Select
                  value={form.status}
                  onValueChange={(val) =>
                    setForm({ ...form, status: val })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">ฉบับร่าง</SelectItem>
                    <SelectItem value="published">เผยแพร่</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">
                  รูปปก
                </label>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  onClick={() => coverFileInputRef.current?.click()}
                >
                  <ImagePlus className="h-4 w-4" />
                </Button>
                <input
                  ref={coverFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    handlePickCoverImage(e.target.files?.[0])
                    e.target.value = ""
                  }}
                />
              </div>
              {form.coverImageUrl && (
                <div
                  className="mt-2 overflow-hidden rounded-lg border border-border"
                  style={{ width: "220px", maxWidth: "100%" }}
                >
                  <img
                    src={form.coverImageUrl}
                    alt="Cover preview"
                    className="w-full object-cover"
                    style={{ height: "96px" }}
                    onError={(e) => {
                      e.target.style.display = "none"
                    }}
                  />
                </div>
              )}
            </div>

            {/* Itinerary Section */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-foreground">
                  กำหนดการ (Itinerary)
                </label>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={addDay}
                >
                  <Plus className="h-3.5 w-3.5" />
                  เพิ่มวัน
                </Button>
              </div>

              {form.itinerary.map((day, dayIndex) => (
                <div
                  key={dayIndex}
                  className="rounded-lg border border-border p-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-accent">
                      วันที่ {day.day}
                    </span>
                    {form.itinerary.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => removeDay(dayIndex)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                  <div className="mt-3 flex flex-col gap-3">
                    <Input
                      placeholder="หัวข้อวันนี้ เช่น เที่ยววัด"
                      value={day.title}
                      onChange={(e) =>
                        updateDay(dayIndex, "title", e.target.value)
                      }
                    />
                    <Textarea
                      placeholder="อธิบายกิจกรรมของวัน..."
                      value={day.description}
                      onChange={(e) =>
                        updateDay(dayIndex, "description", e.target.value)
                      }
                      rows={2}
                    />
                    <div className="flex flex-col gap-2">
                      <span className="text-xs font-medium text-muted-foreground">
                        สถานที่ (เลือกจากระบบ — ซ้ำในวันเดียวกันได้ สูงสุด {MAX_PLACES_PER_DAY} แห่ง/วัน)
                      </span>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                        <Select
                          value={placePickerByDay[dayIndex] || undefined}
                          onValueChange={(val) =>
                            setPlacePickerByDay((prev) => ({
                              ...prev,
                              [dayIndex]: val,
                            }))
                          }
                          disabled={placesLoading || placeOptions.length === 0}
                        >
                          <SelectTrigger className="min-h-9 w-full flex-1 sm:min-w-[200px]">
                            <SelectValue
                              placeholder={
                                placesLoading
                                  ? "กำลังโหลดรายการสถานที่..."
                                  : placeOptions.length === 0
                                    ? "ยังไม่มีสถานที่ในระบบ"
                                    : "เลือกสถานที่"
                              }
                            />
                          </SelectTrigger>
                          <SelectContent className="max-h-[min(280px,50vh)]">
                            {[...placeOptions]
                              .sort((a, b) =>
                                (a.place_name || "").localeCompare(
                                  b.place_name || "",
                                  "th"
                                )
                              )
                              .map((p) => (
                                <SelectItem
                                  key={p.place_id}
                                  value={String(p.place_id)}
                                >
                                  {p.place_name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          variant="secondary"
                          className="shrink-0 gap-1.5 sm:w-auto"
                          onClick={() => addSelectedPlaceFromPicker(dayIndex)}
                          disabled={
                            placesLoading ||
                            placeOptions.length === 0 ||
                            !(placePickerByDay[dayIndex] || "").trim() ||
                            (day.places || []).length >= MAX_PLACES_PER_DAY
                          }
                        >
                          <Plus className="h-4 w-4" />
                          เพิ่มสถานที่
                        </Button>
                      </div>
                      {placeOptions.length === 0 && !placesLoading && (
                        <p className="text-xs text-amber-700 dark:text-amber-400">
                          ไม่พบสถานที่ในระบบ โปรดเพิ่มจากเมนู &quot;จัดการสถานที่&quot;
                          ก่อน
                        </p>
                      )}
                      <div className="flex flex-col gap-2">
                        {(day.places || []).length === 0 ? (
                          <p className="text-xs text-muted-foreground">
                            ยังไม่มีสถานที่ในวันนี้ — เลือกจากรายการแล้วกด
                            &quot;เพิ่มสถานที่&quot;
                          </p>
                        ) : (
                          (day.places || []).map((placeName, placeIndex) => (
                            <div
                              key={`day-${dayIndex}-place-${placeIndex}`}
                              className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2"
                            >
                              <span className="flex-1 text-sm text-foreground">
                                {placeIndex + 1}. {placeName}
                              </span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                                onClick={() =>
                                  removePlaceFromDay(dayIndex, placeIndex)
                                }
                                aria-label="ลบสถานที่"
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              ยกเลิก
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "กำลังบันทึก..." : editingTrip ? "บันทึกการแก้ไข" : "สร้างแผนการเดินทาง"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>ยืนยันการลบ</DialogTitle>
            <DialogDescription>
              คุณต้องการลบ &quot;{deletingTrip?.title}&quot;
              หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              ยกเลิก
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground"
            >
              ลบแผนการเดินทาง
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function RouteIcon({ className }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="6" cy="19" r="3" />
      <path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15" />
      <circle cx="18" cy="5" r="3" />
    </svg>
  )
}
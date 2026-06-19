"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  ImagePlus,
  Calendar,
  Eye,
  EyeOff,
  X,
} from "lucide-react"
import { TRIP_CATEGORIES, getTripCategoryLabel } from "@/lib/trip-categories"

interface TripDay {
  day: number
  title: string
  places: string[]
  description: string
}

interface TripPlan {
  id: string
  title: string
  description: string
  coverImageUrl: string
  duration: number
  category: string
  itinerary: TripDay[]
  status: "published" | "draft"
  createdAt: string
}

interface TripsManagerProps {
  trips: TripPlan[]
  onAdd: (trip: Omit<TripPlan, "id" | "createdAt">) => void
  onEdit: (id: string, trip: Partial<TripPlan>) => void
  onDelete: (id: string) => void
}

const emptyDay: TripDay = {
  day: 1,
  title: "",
  places: [""],
  description: "",
}

const emptyForm = {
  title: "",
  description: "",
  coverImageUrl: "",
  duration: 1,
  category: "",
  itinerary: [{ ...emptyDay }],
  status: "draft" as const,
}

export function TripsManager({
  trips,
  onAdd,
  onEdit,
  onDelete,
}: TripsManagerProps) {
  const [search, setSearch] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingTrip, setEditingTrip] = useState<TripPlan | null>(null)
  const [deletingTrip, setDeletingTrip] = useState<TripPlan | null>(null)
  const [form, setForm] = useState(emptyForm)

  const filtered = trips.filter(
    (t) =>
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.category.toLowerCase().includes(search.toLowerCase())
  )

  function openAdd() {
    setEditingTrip(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  function openEdit(trip: TripPlan) {
    setEditingTrip(trip)
    setForm({
      title: trip.title,
      description: trip.description,
      coverImageUrl: trip.coverImageUrl,
      duration: trip.duration,
      category: trip.category,
      itinerary: trip.itinerary.length > 0 ? trip.itinerary : [{ ...emptyDay }],
      status: trip.status,
    })
    setDialogOpen(true)
  }

  function addDay() {
    setForm({
      ...form,
      itinerary: [
        ...form.itinerary,
        {
          day: form.itinerary.length + 1,
          title: "",
          places: [""],
          description: "",
        },
      ],
    })
  }

  function removeDay(index: number) {
    if (form.itinerary.length <= 1) return
    const updated = form.itinerary
      .filter((_, i) => i !== index)
      .map((d, i) => ({ ...d, day: i + 1 }))
    setForm({ ...form, itinerary: updated })
  }

  function updateDay(index: number, field: keyof TripDay, value: string | string[]) {
    const updated = [...form.itinerary]
    updated[index] = { ...updated[index], [field]: value }
    setForm({ ...form, itinerary: updated })
  }

  function addPlaceToDay(dayIndex: number) {
    const updated = [...form.itinerary]
    updated[dayIndex] = {
      ...updated[dayIndex],
      places: [...updated[dayIndex].places, ""],
    }
    setForm({ ...form, itinerary: updated })
  }

  function updatePlaceInDay(dayIndex: number, placeIndex: number, value: string) {
    const updated = [...form.itinerary]
    const places = [...updated[dayIndex].places]
    places[placeIndex] = value
    updated[dayIndex] = { ...updated[dayIndex], places }
    setForm({ ...form, itinerary: updated })
  }

  function removePlaceFromDay(dayIndex: number, placeIndex: number) {
    const updated = [...form.itinerary]
    const places = updated[dayIndex].places.filter((_, i) => i !== placeIndex)
    updated[dayIndex] = {
      ...updated[dayIndex],
      places: places.length > 0 ? places : [""],
    }
    setForm({ ...form, itinerary: updated })
  }

  function handleSave() {
    if (!form.title || !form.category) return
    if (editingTrip) {
      onEdit(editingTrip.id, form)
    } else {
      onAdd(form)
    }
    setDialogOpen(false)
    setForm(emptyForm)
  }

  function confirmDelete(trip: TripPlan) {
    setDeletingTrip(trip)
    setDeleteDialogOpen(true)
  }

  function handleDelete() {
    if (deletingTrip) {
      onDelete(deletingTrip.id)
      setDeleteDialogOpen(false)
      setDeletingTrip(null)
    }
  }

  function toggleStatus(trip: TripPlan) {
    onEdit(trip.id, {
      status: trip.status === "published" ? "draft" : "published",
    })
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
                src={trip.coverImageUrl}
                alt={trip.title}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
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
                <span>{trip.itinerary.length} กิจกรรม</span>
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

      {/* Add/Edit Trip Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
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
          <div className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-foreground">
                  ชื่อแผน
                </label>
                <Input
                  placeholder="เช่น เที่ยวเชียงใหม่ 3 วัน"
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
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-foreground">
                รายละเอียด
              </label>
              <Textarea
                placeholder="อธิบายแผนการเดินทาง..."
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
                  onValueChange={(val: "draft" | "published") =>
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
              <label className="text-sm font-medium text-foreground">
                รูปปก (URL)
              </label>
              <div className="flex gap-2">
                <Input
                  placeholder="https://example.com/cover.jpg"
                  value={form.coverImageUrl}
                  onChange={(e) =>
                    setForm({ ...form, coverImageUrl: e.target.value })
                  }
                  className="flex-1"
                />
                <Button variant="outline" size="icon" className="shrink-0">
                  <ImagePlus className="h-4 w-4" />
                </Button>
              </div>
              {form.coverImageUrl && (
                <div className="mt-2 overflow-hidden rounded-lg border border-border">
                  <img
                    src={form.coverImageUrl}
                    alt="Cover preview"
                    className="h-32 w-full object-cover"
                    onError={(e) => {
                      ;(e.target as HTMLImageElement).style.display = "none"
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
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">
                          สถานที่
                        </span>
                        <button
                          className="text-xs text-accent hover:underline"
                          onClick={() => addPlaceToDay(dayIndex)}
                        >
                          + เพิ่มสถานที่
                        </button>
                      </div>
                      {day.places.map((place, placeIndex) => (
                        <div key={placeIndex} className="flex gap-2">
                          <Input
                            placeholder={`สถานที่ที่ ${placeIndex + 1}`}
                            value={place}
                            onChange={(e) =>
                              updatePlaceInDay(
                                dayIndex,
                                placeIndex,
                                e.target.value
                              )
                            }
                            className="flex-1"
                          />
                          {day.places.length > 1 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                              onClick={() =>
                                removePlaceFromDay(dayIndex, placeIndex)
                              }
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              ยกเลิก
            </Button>
            <Button onClick={handleSave}>
              {editingTrip ? "บันทึกการแก้ไข" : "สร้างแผนการเดินทาง"}
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

function RouteIcon({ className }: { className?: string }) {
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

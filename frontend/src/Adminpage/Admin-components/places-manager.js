import { useRef, useState } from "react"
import { Button } from "./Aui/button"
import { Input } from "./Aui/input"
import { Textarea } from "./Aui/textarea"
import { Badge } from "./Aui/badge"
import { Card, CardContent } from "./Aui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "./Aui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./Aui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./Aui/table"
import { Plus, Search, Pencil, Trash2, Star, LayoutGrid, List, ImagePlus, Building2, MapPin } from "lucide-react"
// แก้ path ถอย 2 ชั้น
import { placeCategories } from "../../lib/place-categories"

const emptyForm = {
  name: "",
  location: "",
  description: "",
  category: "",
  imageUrl: "",
  rating: 4.5,
  openTime: "",
  closeTime: "",
}

const PLACEHOLDER = "/placeholder.svg"

const PENDING_BADGE_STYLE = {
  backgroundColor: "#facc15",
  borderColor: "#ca8a04",
  color: "#422006",
}

function PendingBadge({ className = "" }) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium shadow-sm ${className}`}
      style={PENDING_BADGE_STYLE}
    >
      รอ pending
    </span>
  )
}

function buildSavePayload(form, editingPlace) {
  if (!editingPlace) return form
  const url = (form.imageUrl || "").trim()
  if (!url.startsWith("data:") && (url.includes("/cover-image") || url === editingPlace.imageUrl)) {
    const { imageUrl, ...rest } = form
    return rest
  }
  return form
}

export function PlacesManager({ places, onAdd, onEdit, onDelete }) {
  const [search, setSearch] = useState("")
  const [viewMode, setViewMode] = useState("grid")
  const [placeFilter, setPlaceFilter] = useState("public")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingPlace, setEditingPlace] = useState(null)
  const [deletingPlace, setDeletingPlace] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef(null)

  const isEntrepreneurPlace = (place) => Number(place.entrepreneurId) > 0
  const isPendingEntrepreneurPlace = (place) =>
    isEntrepreneurPlace(place) && place.entrepreneurStatus === "pending"

  const filtered = places.filter((p) => {
    if (placeFilter === "entrepreneur" && !isEntrepreneurPlace(p)) return false
    if (placeFilter === "public" && isEntrepreneurPlace(p)) return false

    const q = search.toLowerCase()
    return (
      (p.name || "").toLowerCase().includes(q) ||
      (p.location || "").toLowerCase().includes(q) ||
      (p.category || "").toLowerCase().includes(q)
    )
  })

  function openAdd() {
    setEditingPlace(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  function openEdit(place) {
    setEditingPlace(place)
    setForm({
      name: place.name,
      location: place.location,
      description: place.description,
      category: place.category,
      imageUrl: place.imageUrl,
      rating: place.rating,
      openTime: place.openTime || "",
      closeTime: place.closeTime || "",
    })
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!form.name || !form.location || !form.category) return
    setSaving(true)
    try {
      const payload = buildSavePayload(form, editingPlace)
      if (editingPlace) {
        await onEdit(editingPlace.id, payload)
      } else {
        await onAdd(payload)
      }
      setDialogOpen(false)
      setForm(emptyForm)
    } catch (err) {
      alert(err?.message || "บันทึกข้อมูลไม่สำเร็จ")
    } finally {
      setSaving(false)
    }
  }

  function handlePickImage(file) {
    if (!file) return
    if (!file.type.startsWith("image/")) {
      alert("กรุณาเลือกไฟล์รูปภาพ")
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result === "string") {
        setForm((prev) => ({ ...prev, imageUrl: result }))
      }
    }
    reader.readAsDataURL(file)
  }

  function confirmDelete(place) {
    setDeletingPlace(place)
    setDeleteDialogOpen(true)
  }

  async function handleDelete() {
    if (deletingPlace) {
      try {
        await onDelete(deletingPlace.id)
        setDeleteDialogOpen(false)
        setDeletingPlace(null)
      } catch (err) {
        alert(err?.message || "ลบสถานที่ไม่สำเร็จ")
      }
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            จัดการสถานที่
          </h1>
          <p className="text-sm text-muted-foreground">
            เพิ่ม แก้ไข และลบสถานที่ท่องเที่ยว
          </p>
        </div>
        <Button onClick={openAdd} className="gap-2">
          <Plus className="h-4 w-4" />
          เพิ่มสถานที่
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="ค้นหาสถานที่..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-border p-1">
          <button
            type="button"
            onClick={() => setPlaceFilter("public")}
            title="สถานที่ระบบ (ไม่รวมผู้ประกอบการ)"
            className={`rounded-md p-2 transition-colors ${placeFilter === "public"
              ? "bg-accent/10 text-accent"
              : "text-muted-foreground hover:text-foreground"
              }`}
          >
            <MapPin className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setPlaceFilter("entrepreneur")}
            title="เฉพาะสถานที่ของผู้ประกอบการ"
            className={`rounded-md p-2 transition-colors ${placeFilter === "entrepreneur"
              ? "bg-accent/10 text-accent"
              : "text-muted-foreground hover:text-foreground"
              }`}
          >
            <Building2 className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-border p-1">
          <button
            onClick={() => setViewMode("grid")}
            className={`rounded-md p-2 transition-colors ${viewMode === "grid"
              ? "bg-accent/10 text-accent"
              : "text-muted-foreground hover:text-foreground"
              }`}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode("table")}
            className={`rounded-md p-2 transition-colors ${viewMode === "table"
              ? "bg-accent/10 text-accent"
              : "text-muted-foreground hover:text-foreground"
              }`}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {viewMode === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((place) => (
            <Card
              key={place.id}
              className={`group overflow-hidden bg-card border-2 ${
                isPendingEntrepreneurPlace(place) ? "" : "border-border"
              }`}
              style={
                isPendingEntrepreneurPlace(place)
                  ? { borderColor: "#facc15" }
                  : undefined
              }
            >
              <div className="relative aspect-video overflow-hidden">
                {isPendingEntrepreneurPlace(place) && (
                  <PendingBadge className="absolute top-3 right-3 z-10" />
                )}
                <img
                  src={place.imageUrl}
                  alt={place.name}
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
                    {place.category}
                  </Badge>
                  <div className="flex items-center gap-1 rounded-md bg-card/90 px-2 py-1 backdrop-blur-sm">
                    <Star className="h-3 w-3 fill-secondary text-secondary" />
                    <span className="text-xs font-medium text-foreground">
                      {place.rating}
                    </span>
                  </div>
                </div>
              </div>
              <CardContent className="p-4">
                <h3 className="font-semibold text-foreground">{place.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {place.location}
                </p>
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                  {place.description}
                </p>
                <div className="mt-4 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1.5"
                    onClick={() => openEdit(place)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    แก้ไข
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => confirmDelete(place)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>รูปภาพ</TableHead>
                <TableHead>ชื่อ</TableHead>
                <TableHead>สถานที่</TableHead>
                <TableHead>หมวดหมู่</TableHead>
                <TableHead>เรตติ้ง</TableHead>
                <TableHead className="text-right">จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((place) => (
                <TableRow
                  key={place.id}
                  className={isPendingEntrepreneurPlace(place) ? "bg-amber-50/60" : undefined}
                >
                  <TableCell>
                    <div className="relative w-fit">
                      <img
                      src={place.imageUrl}
                      alt={place.name}
                      loading="lazy"
                      decoding="async"
                      className="h-10 w-10 rounded-lg object-cover bg-muted"
                      onError={(e) => {
                        e.currentTarget.onerror = null
                        e.currentTarget.src = PLACEHOLDER
                      }}
                    />
                      {isPendingEntrepreneurPlace(place) && (
                        <PendingBadge className="absolute -top-2 -right-2 px-1.5 py-0 text-[10px]" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium text-foreground">
                    <div className="flex items-center gap-2">
                      <span>{place.name}</span>
                      {isPendingEntrepreneurPlace(place) && <PendingBadge />}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {place.location}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="bg-accent/10 text-accent">{place.category}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 fill-secondary text-secondary" />
                      <span className="text-sm">{place.rating}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEdit(place)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => confirmDelete(place)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
          <MapPinIcon className="h-12 w-12 text-muted-foreground/40" />
          <p className="mt-4 text-sm text-muted-foreground">
            {placeFilter === "entrepreneur"
              ? "ไม่พบสถานที่ของผู้ประกอบการที่ค้นหา"
              : "ไม่พบสถานที่ระบบที่ค้นหา"}
          </p>
          <Button variant="outline" size="sm" className="mt-4" onClick={openAdd}>
            เพิ่มสถานที่ใหม่
          </Button>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          style={{ maxHeight: "85vh" }}
          className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"
        >
          <div className="shrink-0 border-b px-6 pt-6 pb-4 pr-8">
            <DialogHeader>
              <DialogTitle>
                {editingPlace ? "แก้ไขสถานที่" : "เพิ่มสถานที่ใหม่"}
              </DialogTitle>
              <DialogDescription>
                {editingPlace
                  ? "แก้ไขข้อมูลสถานที่ท่องเที่ยว"
                  : "กรอกข้อมูลสถานที่ท่องเที่ยวที่ต้องการเพิ่ม"}
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="dialog-scroll-no-scrollbar min-h-0 flex-1 overflow-y-auto px-6 py-4">
            <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-foreground">
                ชื่อสถานที่
              </label>
              <Input
                placeholder="เช่น วัดพระแก้ว"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-foreground">
                ที่ตั้ง
              </label>
              <Input
                placeholder="เช่น กรุงเทพมหานคร"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
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
                  {placeCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
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
                placeholder="อธิบายรายละเอียดสถานที่..."
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                rows={3}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-foreground">
                URL รูปภาพ
              </label>
              <div className="flex gap-2">
                <Input
                  placeholder="https://example.com/image.jpg"
                  value={form.imageUrl}
                  onChange={(e) =>
                    setForm({ ...form, imageUrl: e.target.value })
                  }
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImagePlus className="h-4 w-4" />
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    handlePickImage(e.target.files?.[0])
                    // รีเซ็ตค่าเพื่อให้เลือกไฟล์เดิมซ้ำได้
                    e.target.value = ""
                  }}
                />
              </div>
              {form.imageUrl && (
                <div className="mt-2 overflow-hidden rounded-lg border border-border">
                  <img
                    src={form.imageUrl}
                    alt="Preview"
                    className="h-40 w-full object-cover"
                    onError={(e) => {
                      e.target.style.display = "none" // ลบ TS ตรงนี้
                    }}
                  />
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-foreground">
                เรตติ้ง (1-5)
              </label>
              <Input
                type="number"
                min={1}
                max={5}
                step={0.1}
                value={form.rating}
                onChange={(e) =>
                  setForm({ ...form, rating: parseFloat(e.target.value) || 0 })
                }
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-foreground">
                  เวลาเปิด
                </label>
                <Input
                  type="time"
                  value={form.openTime}
                  onChange={(e) => setForm({ ...form, openTime: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-foreground">
                  เวลาปิด
                </label>
                <Input
                  type="time"
                  value={form.closeTime}
                  onChange={(e) => setForm({ ...form, closeTime: e.target.value })}
                />
              </div>
            </div>
            </div>
          </div>
          <div className="shrink-0 border-t px-6 py-4">
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                ยกเลิก
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "กำลังบันทึก..." : editingPlace ? "บันทึกการแก้ไข" : "เพิ่มสถานที่"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>ยืนยันการลบ</DialogTitle>
            <DialogDescription>
              คุณต้องการลบ &quot;{deletingPlace?.name}&quot;
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
              ลบสถานที่
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function MapPinIcon({ className }) {
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
      <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  ImagePlus,
  Star,
  LayoutGrid,
  List,
} from "lucide-react"
import { placeCategories } from "@/lib/place-categories"

interface Place {
  id: string
  name: string
  location: string
  description: string
  category: string
  imageUrl: string
  rating: number
  createdAt: string
}

interface PlacesManagerProps {
  places: Place[]
  onAdd: (place: Omit<Place, "id" | "createdAt">) => void
  onEdit: (id: string, place: Partial<Place>) => void
  onDelete: (id: string) => void
}

const emptyForm = {
  name: "",
  location: "",
  description: "",
  category: "",
  imageUrl: "",
  rating: 4.5,
}

export function PlacesManager({
  places,
  onAdd,
  onEdit,
  onDelete,
}: PlacesManagerProps) {
  const [search, setSearch] = useState("")
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingPlace, setEditingPlace] = useState<Place | null>(null)
  const [deletingPlace, setDeletingPlace] = useState<Place | null>(null)
  const [form, setForm] = useState(emptyForm)

  const filtered = places.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.location.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase())
  )

  function openAdd() {
    setEditingPlace(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  function openEdit(place: Place) {
    setEditingPlace(place)
    setForm({
      name: place.name,
      location: place.location,
      description: place.description,
      category: place.category,
      imageUrl: place.imageUrl,
      rating: place.rating,
    })
    setDialogOpen(true)
  }

  function handleSave() {
    if (!form.name || !form.location || !form.category) return
    if (editingPlace) {
      onEdit(editingPlace.id, form)
    } else {
      onAdd(form)
    }
    setDialogOpen(false)
    setForm(emptyForm)
  }

  function confirmDelete(place: Place) {
    setDeletingPlace(place)
    setDeleteDialogOpen(true)
  }

  function handleDelete() {
    if (deletingPlace) {
      onDelete(deletingPlace.id)
      setDeleteDialogOpen(false)
      setDeletingPlace(null)
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
            onClick={() => setViewMode("grid")}
            className={`rounded-md p-2 transition-colors ${
              viewMode === "grid"
                ? "bg-accent/10 text-accent"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode("table")}
            className={`rounded-md p-2 transition-colors ${
              viewMode === "table"
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
              className="group overflow-hidden border-border bg-card"
            >
              <div className="relative aspect-video overflow-hidden">
                <img
                  src={place.imageUrl}
                  alt={place.name}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
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
                <TableRow key={place.id}>
                  <TableCell>
                    <img
                      src={place.imageUrl}
                      alt={place.name}
                      className="h-10 w-10 rounded-lg object-cover"
                    />
                  </TableCell>
                  <TableCell className="font-medium text-foreground">
                    {place.name}
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
            ไม่พบสถานที่ที่ค้นหา
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
                <Button variant="outline" size="icon" className="shrink-0">
                  <ImagePlus className="h-4 w-4" />
                </Button>
              </div>
              {form.imageUrl && (
                <div className="mt-2 overflow-hidden rounded-lg border border-border">
                  <img
                    src={form.imageUrl}
                    alt="Preview"
                    className="h-40 w-full object-cover"
                    onError={(e) => {
                      ;(e.target as HTMLImageElement).style.display = "none"
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
            </div>
          </div>
          <div className="shrink-0 border-t px-6 py-4">
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                ยกเลิก
              </Button>
              <Button onClick={handleSave}>
                {editingPlace ? "บันทึกการแก้ไข" : "เพิ่มสถานที่"}
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

function MapPinIcon({ className }: { className?: string }) {
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

"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Clock,
  MapPin,
  Navigation,
  Heart,
  Share2,
  ChevronLeft,
  Calendar,
  Car,
  Bus,
  Train,
  Bike,
} from "lucide-react"
import { Button } from "./ui/button.tsx"
import { Card, CardContent } from "./ui/card.tsx"
import { Badge } from "./ui/badge.tsx"
import { Link, useParams } from "react-router-dom"

import { API_BASE_URL } from "../lib/api.js"

const transportOptions = [
  { id: "car", name: "รถส่วนตัว", icon: Car, description: "สะดวกสบาย จอดได้หลายจุด", duration: "ประมาณ 30-45 นาที" },
  {
    id: "public",
    name: "รถสาธารณะ",
    icon: Bus,
    description: "ประหยัด เหมาะกับการเดินทางในเมือง",
    duration: "ประมาณ 60-90 นาที",
  },
  { id: "train", name: "รถไฟฟ้า", icon: Train, description: "รวดเร็ว หลีกเลี่ยงรถติด", duration: "ประมาณ 40-50 นาที" },
  { id: "bike", name: "มอเตอร์ไซค์", icon: Bike, description: "คล่องตัว เหมาะกับทริปใกล้ๆ", duration: "ประมาณ 25-35 นาที" },
]

function normalizePlaceName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/\(.*?\)/g, "")
    .trim()
}

function parseTimeRangeToDuration(timeRange) {
  const match = String(timeRange || "").match(/^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/)
  if (!match) return "ตามแผน"
  const [, sh, sm, eh, em] = match
  const start = Number(sh) * 60 + Number(sm)
  const end = Number(eh) * 60 + Number(em)
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return "ตามแผน"
  const diff = end - start
  const hours = Math.floor(diff / 60)
  const mins = diff % 60
  if (hours > 0 && mins > 0) return `${hours} ชม. ${mins} นาที`
  if (hours > 0) return `${hours} ชม.`
  return `${mins} นาที`
}

function buildPlaceScheduleMap(descriptionText) {
  const map = new Map()
  const text = String(descriptionText || "").trim()
  if (!text) return map

  // รองรับข้อความรูปแบบ "13:00 - 15:00: Place A, 15:30 - 17:30: Place B"
  const regex = /(\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2})\s*:\s*([^,]+?)(?=,\s*\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}\s*:|$)/g
  let match = regex.exec(text)
  while (match) {
    const time = match[1].trim()
    const placeName = match[2].trim()
    const key = normalizePlaceName(placeName)
    if (key && !map.has(key)) {
      map.set(key, {
        time,
        duration: parseTimeRangeToDuration(time),
        description: `${time}: ${placeName}`,
      })
    }
    match = regex.exec(text)
  }

  return map
}

function flattenItineraryForTimeline(itinerary, tripDescription) {
  const items = []
  for (const day of itinerary || []) {
    const dayLabel = (day.title && String(day.title).trim()) || `วันที่ ${day.day}`
    const desc = (day.description && String(day.description).trim()) || tripDescription || ""
    const scheduleMap = buildPlaceScheduleMap(desc)
    const places = day.places || []
    if (places.length === 0) {
      if (desc) {
        items.push({
          name: dayLabel,
          time: "",
          description: desc,
          duration: "—",
          tips: "",
        })
      }
      continue
    }
    for (const pname of places) {
      if (!pname) continue
      const schedule = scheduleMap.get(normalizePlaceName(pname))
      items.push({
        name: pname,
        time: schedule?.time || dayLabel,
        description: schedule?.description || `แวะเที่ยว ${pname}`,
        duration: schedule?.duration || "ตามแผน",
        tips: "",
      })
    }
  }
  return items
}

export function TripDetailPage() {
  const { recommendId } = useParams()
  const [trip, setTrip] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [selectedTransport, setSelectedTransport] = useState("car")

  useEffect(() => {
    const id = recommendId
    if (!id) {
      setError("ไม่พบรหัสเส้นทาง")
      setLoading(false)
      return
    }

    const load = async () => {
      setLoading(true)
      setError("")
      try {
        const res = await fetch(`${API_BASE_URL}/trips/public/${id}`)
        const data = await res.json()
        if (!res.ok || !data?.success || !data?.data) {
          throw new Error(data?.message || "โหลดข้อมูลเส้นทางไม่สำเร็จ")
        }
        setTrip(data.data)
      } catch (e) {
        setError(e?.message || "เกิดข้อผิดพลาด")
        setTrip(null)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [recommendId])

  const timelinePlaces = useMemo(
    () => flattenItineraryForTimeline(trip?.itinerary, trip?.description),
    [trip]
  )

  const currentTransport = transportOptions.find((t) => t.id === selectedTransport)

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <p className="text-muted-foreground">กำลังโหลดเส้นทาง...</p>
      </div>
    )
  }

  if (error || !trip) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-destructive text-center">{error || "ไม่พบข้อมูล"}</p>
        <Button asChild>
          <Link to="/">กลับหน้าหลัก</Link>
        </Button>
      </div>
    )
  }

  const highlights = trip.highlights || []

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="relative h-[400px] bg-stone-900">
        <img
          src={trip.cover_image_url || "/placeholder.svg"}
          alt={trip.trip_name}
          className="w-full h-full object-cover opacity-75"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

        <div className="absolute top-4 left-4">
          <Link to="/">
            <Button variant="secondary" size="sm" className="gap-2 bg-white/95 hover:bg-white backdrop-blur-sm">
              <ChevronLeft className="w-4 h-4" />
              กลับหน้าหลัก
            </Button>
          </Link>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12">
          <div className="container mx-auto max-w-5xl">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <span className="px-4 py-1.5 bg-primary text-white text-sm font-medium rounded-full">เส้นทางแนะนำ</span>
              <span className="px-4 py-1.5 bg-white/20 backdrop-blur-sm text-white text-sm font-medium rounded-full">
                {trip.duration_label}
              </span>
              <span className="px-4 py-1.5 bg-white/20 backdrop-blur-sm text-white text-sm font-medium rounded-full">
                {trip.stops} สถานที่
              </span>
            </div>
            <h1 className="font-bold text-4xl md:text-5xl text-white mb-3 text-balance">{trip.trip_name}</h1>
            <p className="text-white/90 text-lg text-balance leading-relaxed max-w-3xl">
              {trip.description || "แผนแนะนำจากระบบ"}
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-5xl px-4 py-12">
        <div className="flex flex-wrap gap-3 mb-8">
          <Button className="flex-1 md:flex-none bg-primary hover:bg-primary/90 text-white gap-2" asChild>
            <Link to={`/navigation?to=${encodeURIComponent(trip.trip_name)}`}>
              <Navigation className="w-4 h-4" />
              เริ่มนำทาง
            </Link>
          </Button>
          <Button variant="outline" className="flex-1 md:flex-none gap-2 bg-white">
            <Heart className="w-4 h-4" />
            บันทึกเส้นทาง
          </Button>
          <Button variant="outline" className="flex-1 md:flex-none gap-2 bg-white">
            <Share2 className="w-4 h-4" />
            แชร์
          </Button>
          <Button variant="outline" className="flex-1 md:flex-none gap-2 bg-white">
            <Calendar className="w-4 h-4" />
            เพิ่มในแผนของฉัน
          </Button>
        </div>

        <Card className="mb-8 border-stone-200">
          <CardContent className="p-6">
            <h3 className="font-semibold text-lg mb-4 text-foreground">เลือกวิธีการเดินทาง</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {transportOptions.map((transport) => {
                const Icon = transport.icon
                return (
                  <button
                    key={transport.id}
                    type="button"
                    onClick={() => setSelectedTransport(transport.id)}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      selectedTransport === transport.id
                        ? "border-primary bg-primary/5 shadow-md"
                        : "border-stone-200 hover:border-stone-300 bg-white"
                    }`}
                  >
                    <Icon
                      className={`w-8 h-8 mb-3 ${
                        selectedTransport === transport.id ? "text-primary" : "text-muted-foreground"
                      }`}
                    />
                    <h4 className="font-semibold text-sm mb-1">{transport.name}</h4>
                    <p className="text-xs text-muted-foreground mb-2">{transport.description}</p>
                    <Badge variant={selectedTransport === transport.id ? "default" : "secondary"} className="text-xs">
                      {transport.duration}
                    </Badge>
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="mb-8 border-stone-200">
          <CardContent className="p-6">
            <h3 className="font-semibold text-lg mb-4 text-foreground">ไฮไลท์ของเส้นทาง</h3>
            <div className="flex flex-wrap gap-2">
              {highlights.length === 0 ? (
                <span className="text-sm text-muted-foreground">—</span>
              ) : (
                highlights.map((highlight, i) => (
                  <span key={i} className="px-4 py-2 bg-primary/10 text-primary rounded-full font-medium">
                    {highlight}
                  </span>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <div className="mb-8">
          <h2 className="font-bold text-2xl mb-6 text-foreground">รายละเอียดเส้นทาง</h2>

          {timelinePlaces.length === 0 ? (
            <p className="text-muted-foreground text-sm">ยังไม่มีรายการสถานที่ในแผนนี้</p>
          ) : (
            <div className="space-y-6">
              {timelinePlaces.map((place, i) => (
                <div key={`${place.name}-${i}`} className="flex gap-4 md:gap-6 group">
                  <div className="flex flex-col items-center pt-2">
                    <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center font-bold flex-shrink-0 group-hover:scale-110 transition-transform shadow-md">
                      {i + 1}
                    </div>
                    {i < timelinePlaces.length - 1 && (
                      <div className="w-1 h-full bg-primary/20 mt-4 rounded-full" />
                    )}
                  </div>

                  <Card className="flex-1 border-stone-200 hover:shadow-lg transition-all hover:border-primary/30">
                    <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2 mb-3">
                        <h3 className="font-semibold text-xl text-foreground">{place.name}</h3>
                        {place.time ? (
                          <span className="text-primary font-medium text-sm bg-primary/10 px-4 py-1.5 rounded-full whitespace-nowrap self-start">
                            {place.time}
                          </span>
                        ) : null}
                      </div>

                      <p className="text-muted-foreground leading-relaxed mb-4">{place.description || "—"}</p>

                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                        <Clock className="w-4 h-4 text-primary" />
                        <span>ระยะเวลา: {place.duration}</span>
                      </div>

                      {place.tips ? (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                          <p className="text-sm text-amber-900">
                            <span className="font-semibold">เคล็ดลับ:</span> {place.tips}
                          </p>
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="border-stone-200">
            <CardContent className="p-6">
              <h3 className="font-semibold text-lg mb-4 text-foreground">ข้อมูลเพิ่มเติม</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground">ระยะเวลาทั้งหมด</p>
                    <p className="text-muted-foreground">{trip.duration_label}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground">จำนวนสถานที่</p>
                    <p className="text-muted-foreground">{trip.stops} สถานที่</p>
                  </div>
                </div>
                {currentTransport && (
                  <div className="flex items-start gap-3">
                    <currentTransport.icon className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-foreground">วิธีการเดินทาง</p>
                      <p className="text-muted-foreground">{currentTransport.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">{currentTransport.duration}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-stone-200 bg-gradient-to-br from-primary/5 to-secondary/5">
            <CardContent className="p-6">
              <h3 className="font-semibold text-lg mb-4 text-foreground">คำแนะนำสำหรับนักท่องเที่ยว</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">-</span>
                  <span>ควรออกเดินทางตั้งแต่เช้าเพื่อหลีกเลี่ยงความแออัด</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">-</span>
                  <span>แนะนำให้สวมรองเท้าสบาย เดินได้ทั้งวัน</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">-</span>
                  <span>เตรียมเงินสดสำหรับซื้อของในตลาด</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">-</span>
                  <span>ระวังของหลงลืมที่ร้านค้า ควรเช็คทุกครั้ง</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

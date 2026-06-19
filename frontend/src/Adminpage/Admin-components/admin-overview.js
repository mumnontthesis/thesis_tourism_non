"use client"

import { useCallback, useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./Aui/card"
import { Button } from "./Aui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./Aui/alert-dialog"
import { MapPin, Route, Eye, TrendingUp, Star, Trash2 } from "lucide-react"

import { API_BASE } from "../../lib/api.js"
const PLACEHOLDER = "/placeholder.svg"

function formatMonthChange(count) {
  const total = Number(count) || 0
  return total > 0 ? `+${total} เดือนนี้` : "ไม่มีรายการใหม่เดือนนี้"
}

export function AdminOverview() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState(null)
  const [topRatedPlaces, setTopRatedPlaces] = useState([])
  const [recentTrips, setRecentTrips] = useState([])
  const [tourists, setTourists] = useState([])
  const [entrepreneurs, setEntrepreneurs] = useState([])
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const loadUsers = useCallback(async () => {
    const usersRes = await fetch(`${API_BASE}/admin/users-by-type`)
    const usersJson = await usersRes.json()
    if (usersRes.ok && usersJson?.success) {
      setTourists(usersJson?.data?.tourists || [])
      setEntrepreneurs(usersJson?.data?.entrepreneurs || [])
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      try {
        const [statsRes, recentRes, usersRes] = await Promise.all([
          fetch(`${API_BASE}/admin/stats`),
          fetch(`${API_BASE}/admin/overview-recent`),
          fetch(`${API_BASE}/admin/users-by-type`),
        ])

        const [statsJson, recentJson, usersJson] = await Promise.all([
          statsRes.json(),
          recentRes.json(),
          usersRes.json(),
        ])

        if (!cancelled && statsRes.ok && statsJson?.success) {
          setStats(statsJson.data)
        }
        if (!cancelled && recentRes.ok && recentJson?.success) {
          const recent = recentJson.data || {}
          setTopRatedPlaces(
            (recent.places || []).map((p) => ({
              id: p.id,
              name: p.name,
              location: p.location,
              imageUrl: p.imageUrl || PLACEHOLDER,
              totalStars: Number(p.totalStars ?? p.rating ?? 0),
              reviewCount: Number(p.reviewCount || 0),
            }))
          )
          setRecentTrips(
            (recent.trips || []).map((t) => ({
              id: t.id,
              title: t.title,
              coverImageUrl: t.coverImageUrl || PLACEHOLDER,
              duration: t.duration,
              status: t.status,
            }))
          )
        }
        if (!cancelled && usersRes.ok && usersJson?.success) {
          setTourists(usersJson?.data?.tourists || [])
          setEntrepreneurs(usersJson?.data?.entrepreneurs || [])
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const handleDeleteUser = async () => {
    if (!deleteTarget?.user_id) return
    setDeleting(true)
    try {
      const res = await fetch(`${API_BASE}/admin/users/${deleteTarget.user_id}`, {
        method: "DELETE",
      })
      const data = await res.json()
      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "ลบผู้ใช้ไม่สำเร็จ")
      }
      setDeleteTarget(null)
      await loadUsers()
    } catch (err) {
      window.alert(err?.message || "ลบผู้ใช้ไม่สำเร็จ")
    } finally {
      setDeleting(false)
    }
  }

  const statCards = [
    {
      title: "สถานที่ทั้งหมด",
      value: stats?.placesTotal ?? "—",
      icon: MapPin,
      change: formatMonthChange(stats?.placesThisMonth),
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      title: "แผนการเดินทาง",
      value: stats?.tripsTotal ?? "—",
      icon: Route,
      change: formatMonthChange(stats?.tripsThisMonth),
      color: "text-accent",
      bg: "bg-accent/10",
    },
    {
      title: "เผยแพร่แล้ว",
      value: stats?.publishedTrips ?? "—",
      icon: Eye,
      change: `${stats?.draftTrips ?? 0} ฉบับร่าง`,
      color: "text-success",
      bg: "bg-success/10",
    },
    {
      title: "เรตติ้งเฉลี่ย",
      value: stats != null ? Number(stats.avgRating || 0).toFixed(1) : "—",
      icon: TrendingUp,
      change: "จาก 5.0",
      color: "text-secondary",
      bg: "bg-secondary/30",
    },
  ]

  const renderDeleteAction = (user, type) => (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className="h-8 w-8 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
      onClick={() =>
        setDeleteTarget({
          user_id: user.user_id,
          label:
            type === "tourist"
              ? user.username || user.email
              : user.business_name || user.contact_name || user.username,
        })
      }
      title="ลบ"
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  )

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">ภาพรวม</h1>
        <p className="text-sm text-muted-foreground">
          สรุปข้อมูลสถานที่และแผนการเดินทางทั้งหมด
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title} className="border-border bg-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${stat.bg}`}>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {loading ? (
                    <span className="inline-block h-8 w-12 animate-pulse rounded bg-muted" />
                  ) : (
                    stat.value
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{stat.change}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-foreground">
              สถานที่ได้รับดาวรีวิวมากที่สุด
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              {loading ? (
                [1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
                ))
              ) : topRatedPlaces.length === 0 ? (
                <p className="text-sm text-muted-foreground">ยังไม่มีสถานที่</p>
              ) : (
                topRatedPlaces.map((place) => (
                  <div
                    key={place.id}
                    className="flex items-center gap-3 rounded-lg border border-border p-3"
                  >
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
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{place.name}</p>
                      <p className="text-xs text-muted-foreground">{place.location}</p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center justify-end gap-1 text-sm font-semibold text-accent">
                        <Star className="h-3.5 w-3.5 fill-current" />
                        <span>{place.totalStars}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {place.reviewCount} รีวิว
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-foreground">
              แผนการเดินทางล่าสุด
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              {loading ? (
                [1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
                ))
              ) : recentTrips.length === 0 ? (
                <p className="text-sm text-muted-foreground">ยังไม่มีแผนการเดินทาง</p>
              ) : (
                recentTrips.map((trip) => (
                  <div
                    key={trip.id}
                    className="flex items-center gap-3 rounded-lg border border-border p-3"
                  >
                    <img
                      src={trip.coverImageUrl}
                      alt={trip.title}
                      loading="lazy"
                      decoding="async"
                      className="h-10 w-10 rounded-lg object-cover bg-muted"
                      onError={(e) => {
                        e.currentTarget.onerror = null
                        e.currentTarget.src = PLACEHOLDER
                      }}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{trip.title}</p>
                      <p className="text-xs text-muted-foreground">{trip.duration} วัน</p>
                    </div>
                    <span
                      className={
                        trip.status === "published"
                          ? "inline-flex items-center rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success"
                          : "inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
                      }
                    >
                      {trip.status === "published" ? "เผยแพร่แล้ว" : "ฉบับร่าง"}
                    </span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <CardTitle className="text-base font-semibold text-foreground">
              ผู้ใช้ประเภทนักท่องเที่ยว
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              {loading ? (
                [1, 2].map((i) => (
                  <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
                ))
              ) : tourists.length === 0 ? (
                <p className="text-sm text-muted-foreground">ยังไม่มีข้อมูลนักท่องเที่ยว</p>
              ) : (
                tourists.map((u) => (
                  <div
                    key={u.user_id}
                    className="flex items-start justify-between gap-3 rounded-lg border border-border p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">
                        {u.username || "-"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{u.email || "-"}</p>
                      <span className="mt-2 inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                        Tourist
                      </span>
                    </div>
                    {renderDeleteAction(u, "tourist")}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <CardTitle className="text-base font-semibold text-foreground">
              ผู้ใช้ประเภทผู้ประกอบการ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              {loading ? (
                [1, 2].map((i) => (
                  <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
                ))
              ) : entrepreneurs.length === 0 ? (
                <p className="text-sm text-muted-foreground">ยังไม่มีข้อมูลผู้ประกอบการ</p>
              ) : (
                entrepreneurs.map((u) => (
                  <div
                    key={u.user_id}
                    className="flex items-start justify-between gap-3 rounded-lg border border-border p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">
                        {u.business_name || u.contact_name || u.username || "-"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {u.business_type || u.email || "-"}
                      </p>
                      <span
                        className={
                          u.status === "approved"
                            ? "mt-2 inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700"
                            : u.status === "rejected"
                            ? "mt-2 inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700"
                            : "mt-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700"
                        }
                      >
                        {u.status || "pending"}
                      </span>
                    </div>
                    {renderDeleteAction(u, "entrepreneur")}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบผู้ใช้</AlertDialogTitle>
            <AlertDialogDescription>
              ต้องการลบ &quot;{deleteTarget?.label}&quot; หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={deleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleting ? "กำลังลบ..." : "ลบ"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

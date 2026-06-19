import { useState } from "react"
import { Link } from "react-router-dom"
import {
  MapPin,
  Compass,
  Star,
  ChevronRight,
  Shield,
  Map,
  Mountain,
  Waves,
  Landmark,
  TreePine,
  ArrowRight,
} from "lucide-react"
import { Button } from "./components/ui/button"
import { Card, CardContent } from "./components/ui/card"
import { Badge } from "./components/ui/badge"

const featuredPlaces = [
  {
    name: "วัดพระแก้ว",
    location: "กรุงเทพมหานคร",
    category: "วัด",
    rating: 4.9,
    image: "https://images.unsplash.com/photo-1563492065599-3520f775eeed?w=600&h=400&fit=crop",
  },
  {
    name: "เกาะพีพี",
    location: "กระบี่",
    category: "ทะเล",
    rating: 4.8,
    image: "https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=600&h=400&fit=crop",
  },
  {
    name: "ดอยอินทนนท์",
    location: "เชียงใหม่",
    category: "ภูเขา",
    rating: 4.7,
    image: "https://images.unsplash.com/photo-1528181304800-259b08848526?w=600&h=400&fit=crop",
  },
  {
    name: "อุทยานประวัติศาสตร์สุโขทัย",
    location: "สุโขทัย",
    category: "ประวัติศาสตร์",
    rating: 4.6,
    image: "https://images.unsplash.com/photo-1506665531195-3566af2b4dfa?w=600&h=400&fit=crop",
  },
]

const tripPlans = [
  {
    title: "เที่ยวเชียงใหม่ 3 วัน 2 คืน",
    description: "ทริปเชียงใหม่สุดชิล เที่ยววัด ช้อปปิ้ง กินของอร่อย",
    duration: "3 วัน 2 คืน",
    category: "ธรรมชาติ",
    image: "https://images.unsplash.com/photo-1528181304800-259b08848526?w=600&h=400&fit=crop",
  },
  {
    title: "ทะเลใต้ กระบี่-พังงา 5 วัน",
    description: "ทริปทะเลใต้ เที่ยวเกาะ ดำน้ำ พักผ่อนริมทะเล",
    duration: "5 วัน 4 คืน",
    category: "ทะเล",
    image: "https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=600&h=400&fit=crop",
  },
]

const categories = [
  { name: "วัด", icon: Landmark, count: 24 },
  { name: "ทะเล", icon: Waves, count: 18 },
  { name: "ภูเขา", icon: Mountain, count: 15 },
  { name: "ธรรมชาติ", icon: TreePine, count: 32 },
]

export default function Homepage() {
  const [activeCategory, setActiveCategory] = useState(null)

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Compass className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold text-foreground">
              TripPlanner
            </span>
          </div>

          <nav className="hidden items-center gap-6 md:flex">
            <a href="#places" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              สถานที่
            </a>
            <a href="#trips" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              แผนเที่ยว
            </a>
            <a href="#categories" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              หมวดหมู่
            </a>
          </nav>

          <Link to="/admin">
            <Button variant="default" size="sm" className="gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Admin Dashboard</span>
              <span className="sm:hidden">Admin</span>
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/5 to-secondary/10" />
        <div className="relative mx-auto max-w-7xl px-4 py-20 lg:px-8 lg:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="secondary" className="mb-6 gap-1.5 px-3 py-1.5 text-xs">
              <MapPin className="h-3.5 w-3.5" />
              ค้นพบสถานที่ท่องเที่ยวทั่วไทย
            </Badge>
            <h1 className="text-balance text-4xl font-bold tracking-tight text-foreground lg:text-6xl">
              วางแผนเที่ยว
              <span className="text-primary"> สนุกทุกทริป</span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
              รวมสถานที่ท่องเที่ยวยอดนิยมพร้อมแผนการเดินทางที่คัดสรรมาให้คุณ
              วางแผนเที่ยวง่าย ไปเที่ยวจริงสนุกกว่า
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button size="lg" className="gap-2 px-8" asChild>
                <a href="#places">
                  <Map className="h-5 w-5" />
                  ดูสถานที่ทั้งหมด
                </a>
              </Button>
              <Button size="lg" variant="outline" className="gap-2 px-8" asChild>
                <a href="#trips">
                  <Compass className="h-5 w-5" />
                  แผนเที่ยวแนะนำ
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section id="categories" className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
        <h2 className="mb-8 text-2xl font-bold text-foreground">หมวดหมู่ยอดนิยม</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {categories.map((cat) => {
            const Icon = cat.icon
            const isActive = activeCategory === cat.name
            return (
              <button
                key={cat.name}
                onClick={() => setActiveCategory(isActive ? null : cat.name)}
                className={`flex flex-col items-center gap-3 rounded-xl border p-6 transition-all ${
                  isActive
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card hover:border-primary/40 hover:bg-card/80"
                }`}
              >
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                  isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                }`}>
                  <Icon className="h-6 w-6" />
                </div>
                <span className="text-sm font-semibold text-foreground">{cat.name}</span>
                <span className="text-xs text-muted-foreground">{cat.count} สถานที่</span>
              </button>
            )
          })}
        </div>
      </section>

      {/* Featured Places */}
      <section id="places" className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">สถานที่แนะนำ</h2>
            <p className="mt-1 text-sm text-muted-foreground">สถานที่ยอดนิยมที่คัดสรรมาสำหรับคุณ</p>
          </div>
          <Button variant="ghost" size="sm" className="gap-1 text-primary">
            ดูทั้งหมด
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {featuredPlaces.map((place) => (
            <Card key={place.name} className="group overflow-hidden border-border bg-card transition-shadow hover:shadow-lg">
              <div className="relative aspect-[4/3] overflow-hidden">
                <img
                  src={place.image}
                  alt={place.name}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                  <Badge className="bg-accent/90 text-accent-foreground backdrop-blur-sm">
                    {place.category}
                  </Badge>
                  <div className="flex items-center gap-1 rounded-md bg-card/90 px-2 py-1 backdrop-blur-sm">
                    <Star className="h-3 w-3 fill-secondary text-secondary" />
                    <span className="text-xs font-medium text-card-foreground">{place.rating}</span>
                  </div>
                </div>
              </div>
              <CardContent className="p-4">
                <h3 className="font-semibold text-card-foreground">{place.name}</h3>
                <div className="mt-1.5 flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  {place.location}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Trip Plans */}
      <section id="trips" className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">แผนเที่ยวแนะนำ</h2>
            <p className="mt-1 text-sm text-muted-foreground">แพลนเที่ยวสำเร็จรูป พร้อมออกเดินทาง</p>
          </div>
          <Button variant="ghost" size="sm" className="gap-1 text-primary">
            ดูทั้งหมด
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {tripPlans.map((trip) => (
            <Card key={trip.title} className="group overflow-hidden border-border bg-card transition-shadow hover:shadow-lg">
              <div className="flex flex-col sm:flex-row">
                <div className="relative aspect-[16/9] overflow-hidden sm:aspect-auto sm:w-56">
                  <img
                    src={trip.image}
                    alt={trip.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <CardContent className="flex flex-1 flex-col justify-center p-5">
                  <Badge variant="secondary" className="mb-2 w-fit">{trip.category}</Badge>
                  <h3 className="font-semibold text-card-foreground">{trip.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{trip.description}</p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-xs font-medium text-accent">{trip.duration}</span>
                    <Button variant="ghost" size="sm" className="gap-1 text-primary">
                      ดูรายละเอียด
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                  <Compass className="h-4 w-4 text-primary-foreground" />
                </div>
                <span className="font-bold text-foreground">TripPlanner</span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                ค้นพบสถานที่ท่องเที่ยวที่น่าสนใจ และวางแผนทริปของคุณได้ง่าย ๆ
              </p>
            </div>
            <div>
              <h4 className="mb-4 font-semibold text-foreground">ลิงก์ด่วน</h4>
              <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
                <li><a href="#places" className="transition-colors hover:text-foreground">สถานที่</a></li>
                <li><a href="#trips" className="transition-colors hover:text-foreground">แผนเที่ยว</a></li>
                <li><a href="#categories" className="transition-colors hover:text-foreground">หมวดหมู่</a></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 font-semibold text-foreground">จัดการระบบ</h4>
              <Link to="/admin">
                <Button variant="outline" size="sm" className="gap-2">
                  <Shield className="h-4 w-4" />
                  เข้าสู่ Admin Dashboard
                </Button>
              </Link>
            </div>
          </div>
          <div className="mt-8 border-t border-border pt-8 text-center text-sm text-muted-foreground">
            &copy; 2026 TripPlanner. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
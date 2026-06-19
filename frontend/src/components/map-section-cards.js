"use client"

import { useState } from "react"
import { MapPin, Star, Navigation, X, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "./ui/button.tsx"
import { Badge } from "./ui/badge.tsx"

export function MapSectionCards() {
  const [selectedPlace, setSelectedPlace] = useState(null)
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [currentCardIndex, setCurrentCardIndex] = useState(0)

  const categories = [
    { id: "all", label: "ทั้งหมด", icon: "map" },
    { id: "hidden", label: "Hidden Gem", icon: "gem" },
    { id: "restaurant", label: "ร้านอาหาร", icon: "food" },
    { id: "museum", label: "พิพิธภัณฑ์", icon: "museum" },
    { id: "temple", label: "วัด", icon: "temple" },
  ]

  const places = [
    {
      id: 1,
      name: "เกาะเกร็ด",
      rating: 4.5,
      reviews: 248,
      description: "เกาะกลางแม่น้ำเจ้าพระยา มีวิถีชีวิตของชาวมอญ เครื่องปั้นดินเผา และตลาดชุมชน เหมาะสำหรับปั่นจักรยานและชิมอาหารท้องถิ่น",
      tags: ["เกาะ", "วัฒนธรรม", "ตลาด"],
      image: "/koh-kret-pottery-market.jpg",
      distance: "2.3 กม.",
      category: "hidden",
      location: { lat: 13.9099, lng: 100.4844 },
    },
    {
      id: 2,
      name: "วัดเฉลิมพระเกียรติ",
      rating: 4.2,
      reviews: 156,
      description: "วัดสวยงามริมแม่น้ำเจ้าพระยา มีสถาปัตยกรรมไทยแบบดั้งเดิม เหมาะสำหรับการทำบุญและถ่ายรูป",
      tags: ["วัด", "ธรรมะ", "สถาปัตยกรรม"],
      distance: "1.8 กม.",
      category: "temple",
      location: { lat: 13.8699, lng: 100.5044 },
    },
    {
      id: 3,
      name: "ตลาดน้ำเกาะเกร็ด",
      rating: 4.0,
      reviews: 189,
      description: "ตลาดน้ำที่มีขนมไทยโบราณ อาหารพื้นเมือง และของฝากมากมาย",
      tags: ["ตลาด", "อาหาร", "ของฝาก"],
      image: "/thai-riverside-community.jpg",
      distance: "2.1 กม.",
      category: "restaurant",
      location: { lat: 13.9049, lng: 100.4794 },
    },
    {
      id: 4,
      name: "พิพิธภัณฑ์นนทบุรี",
      rating: 4.3,
      reviews: 95,
      description: "พิพิธภัณฑ์แสดงประวัติศาสตร์และวัฒนธรรมท้องถิ่น",
      tags: ["พิพิธภัณฑ์", "ประวัติศาสตร์"],
      distance: "3.2 กม.",
      category: "museum",
      location: { lat: 13.8549, lng: 100.5194 },
    },
  ]

  const filteredPlaces = places.filter((place) => selectedCategory === "all" || place.category === selectedCategory)

  const handleNextCard = () => {
    setCurrentCardIndex((prev) => (prev + 1) % filteredPlaces.length)
  }

  const handlePrevCard = () => {
    setCurrentCardIndex((prev) => (prev - 1 + filteredPlaces.length) % filteredPlaces.length)
  }

  return (
    <section id="map-cards" className="relative h-[600px] lg:h-[700px]">
      {/* Full Screen Map Background */}
      <div className="absolute inset-0 w-full h-full">
        <div className="w-full h-full bg-gradient-to-br from-emerald-200 via-teal-300 to-emerald-400 relative overflow-hidden">
          <div className="absolute inset-0 opacity-30">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="grid-cards" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid-cards)" />
            </svg>
          </div>

          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="w-20 h-20 bg-white rounded-full shadow-2xl flex items-center justify-center">
              <MapPin className="w-10 h-10 text-emerald-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Category Pills - Top Center */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10">
        <div className="bg-white/95 backdrop-blur-lg border border-white/60 shadow-2xl rounded-full p-2">
          <div className="flex gap-2">
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? "secondary" : "ghost"}
                size="sm"
                className={`rounded-full whitespace-nowrap ${
                  selectedCategory === category.id
                    ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-md"
                    : "text-stone-700 hover:bg-white/80"
                }`}
                onClick={() => {
                  setSelectedCategory(category.id)
                  setCurrentCardIndex(0)
                }}
              >
                {category.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Floating Cards - Bottom Center */}
      {filteredPlaces.length > 0 && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 w-full max-w-md px-4">
          <div className="relative">
            {/* Navigation Buttons */}
            {filteredPlaces.length > 1 && (
              <>
                <Button
                  size="icon"
                  variant="secondary"
                  onClick={handlePrevCard}
                  className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-16 bg-white/95 backdrop-blur-lg hover:bg-white shadow-xl rounded-full w-12 h-12 z-20"
                >
                  <ChevronLeft className="w-6 h-6" />
                </Button>
                <Button
                  size="icon"
                  variant="secondary"
                  onClick={handleNextCard}
                  className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-16 bg-white/95 backdrop-blur-lg hover:bg-white shadow-xl rounded-full w-12 h-12 z-20"
                >
                  <ChevronRight className="w-6 h-6" />
                </Button>
              </>
            )}

            {/* Card */}
            <div className="bg-white/95 backdrop-blur-xl border border-white/60 rounded-3xl shadow-2xl overflow-hidden">
              {filteredPlaces[currentCardIndex].image && (
                <div className="h-48 bg-stone-200 overflow-hidden">
                  <img
                    src={filteredPlaces[currentCardIndex].image || "/placeholder.svg"}
                    alt={filteredPlaces[currentCardIndex].name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-2xl text-stone-900 mb-2">{filteredPlaces[currentCardIndex].name}</h3>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-lg text-stone-900">
                        {filteredPlaces[currentCardIndex].rating}
                      </span>
                      <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm text-stone-600">({filteredPlaces[currentCardIndex].reviews} รีวิว)</span>
                      {filteredPlaces[currentCardIndex].distance && (
                        <>
                          <span className="text-stone-400">|</span>
                          <span className="text-sm text-stone-600">{filteredPlaces[currentCardIndex].distance}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <p className="text-stone-600 leading-relaxed mb-4">{filteredPlaces[currentCardIndex].description}</p>

                <div className="flex gap-2 flex-wrap mb-4">
                  {filteredPlaces[currentCardIndex].tags.map((tag, idx) => (
                    <Badge key={idx} variant="secondary" className="bg-emerald-100 text-emerald-700 rounded-full">
                      {tag}
                    </Badge>
                  ))}
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={() => setSelectedPlace(filteredPlaces[currentCardIndex])}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full h-12 text-base font-medium shadow-lg"
                  >
                    <Navigation className="w-5 h-5 mr-2" />
                    นำทาง
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 border-2 border-emerald-600 text-emerald-600 hover:bg-emerald-50 rounded-full h-12 text-base font-medium bg-transparent"
                  >
                    บันทึก
                  </Button>
                </div>
              </div>

              {/* Card Indicator */}
              {filteredPlaces.length > 1 && (
                <div className="flex justify-center gap-1.5 pb-4">
                  {filteredPlaces.map((_, idx) => (
                    <div
                      key={idx}
                      className={`h-1.5 rounded-full transition-all ${
                        idx === currentCardIndex ? "w-6 bg-emerald-600" : "w-1.5 bg-stone-300"
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedPlace && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-30 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="relative">
              {selectedPlace.image && (
                <div className="h-56 bg-stone-200">
                  <img
                    src={selectedPlace.image || "/placeholder.svg"}
                    alt={selectedPlace.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <Button
                size="icon"
                variant="secondary"
                onClick={() => setSelectedPlace(null)}
                className="absolute top-4 right-4 bg-white/95 hover:bg-white rounded-full shadow-lg"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="p-6">
              <h2 className="font-bold text-3xl text-stone-900 mb-3">{selectedPlace.name}</h2>
              <div className="flex items-center gap-2 mb-4">
                <span className="font-bold text-xl">{selectedPlace.rating}</span>
                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                <span className="text-stone-600">({selectedPlace.reviews} รีวิว)</span>
              </div>
              <p className="text-stone-600 leading-relaxed mb-6">{selectedPlace.description}</p>

              <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-full h-14 text-lg font-medium shadow-lg">
                <Navigation className="w-5 h-5 mr-2" />
                เริ่มนำทาง
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

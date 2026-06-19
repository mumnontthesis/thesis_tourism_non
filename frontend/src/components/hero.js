"use client"

import { MapPin, Calendar, Users } from "lucide-react"
import { Button } from "./ui/button.tsx"
import { Link } from "react-router-dom"

export function Hero() {
  return (
    <section
      id="hero"
      className="relative bg-gradient-to-br from-primary/20 via-secondary/10 to-accent/10 py-12 md:py-16"
    >
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            {/* Text Content */}
            <div>
              <h1 className="font-bold text-3xl md:text-5xl text-balance mb-4 text-foreground leading-tight">
                สำรวจ<span className="text-primary">นนทบุรี</span>
                <br />
                ที่คุณไม่เคยรู้จัก
              </h1>
              <p className="text-base md:text-lg text-muted-foreground text-balance mb-6 leading-relaxed">
                ค้นพบสถานที่ท่องเที่ยว วัดวาอาราม ตลาดน้ำ และวิถีชีวิตชุมชนท้องถิ่นในจังหวัดนนทบุรี
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href="/planner">
                  <Button size="lg" className="bg-primary hover:bg-primary/90 text-white">
                    เริ่มวางแผนเที่ยว
                  </Button>
                </Link>
                <Button size="lg" variant="outline" className="bg-transparent">
                  ดูแผนที่
                </Button>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white rounded-xl p-4 shadow-md border border-border text-center">
                <MapPin className="w-6 h-6 text-primary mx-auto mb-2" />
                <h3 className="font-bold text-xl text-foreground">50+</h3>
                <p className="text-xs text-muted-foreground">สถานที่</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-md border border-border text-center">
                <Calendar className="w-6 h-6 text-secondary mx-auto mb-2" />
                <h3 className="font-bold text-xl text-foreground">10+</h3>
                <p className="text-xs text-muted-foreground">เส้นทาง</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-md border border-border text-center">
                <Users className="w-6 h-6 text-accent mx-auto mb-2" />
                <h3 className="font-bold text-xl text-foreground">5K+</h3>
                <p className="text-xs text-muted-foreground">นักท่องเที่ยว</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

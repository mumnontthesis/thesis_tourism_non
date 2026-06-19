"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "react-router-dom"
import {
  Navigation,
  MapPin,
  Clock,
  ChevronLeft,
  ChevronRight,
  X,
  ArrowUp,
  ArrowRight,
  CheckCircle2,
  Circle,
  Maximize2,
  Volume2,
  VolumeX,
} from "lucide-react"
import { Button } from "./ui/button.tsx"
import { Card, CardContent } from "./ui/card.tsx"
import { Progress } from "./ui/progress.tsx"
import { Link } from "react-router-dom"

const navigationData = {
  from: "ตำแหน่งปัจจุบันของคุณ",
  to: "เกาะเกร็ด",
  totalDistance: "12.5 กม.",
  estimatedTime: "35 นาที",
  currentStep: 0,
  steps: [
    {
      id: 1,
      instruction: "เริ่มต้นจากตำแหน่งปัจจุบัน มุ่งหน้าไปทางทิศเหนือ",
      distance: "0.5 กม.",
      duration: "2 นาที",
      direction: "straight",
      completed: false,
    },
    {
      id: 2,
      instruction: "เลี้ยวขวาเข้าถนนแจ้งวัฒนะ",
      distance: "3.2 กม.",
      duration: "8 นาที",
      direction: "right",
      completed: false,
    },
    {
      id: 3,
      instruction: "ตรงไปตามถนนแจ้งวัฒนะ ผ่านสะพานข้ามแม่น้ำเจ้าพระยา",
      distance: "5.8 กม.",
      duration: "15 นาที",
      direction: "straight",
      completed: false,
    },
    {
      id: 4,
      instruction: "เลี้ยวซ้ายเข้าซอยวัดบางพูดใต้",
      distance: "1.5 กม.",
      duration: "5 นาที",
      direction: "left",
      completed: false,
    },
    {
      id: 5,
      instruction: "มุ่งหน้าไปที่ท่าเรือวัดสนามเหนือ",
      distance: "1.5 กม.",
      duration: "5 นาที",
      direction: "straight",
      completed: false,
    },
    {
      id: 6,
      instruction: "ถึงจุดหมาย - ท่าเรือวัดสนามเหนือ (ขึ้นเรือไปเกาะเกร็ด)",
      distance: "0 กม.",
      duration: "0 นาที",
      direction: "destination",
      completed: false,
    },
  ],
}

export function NavigationPage() {
  const searchParams = useSearchParams()
  const destination = searchParams.get("to") || "เกาะเกร็ด"

  const [currentStep, setCurrentStep] = useState(0)
  const [isNavigating, setIsNavigating] = useState(true)
  const [isSoundOn, setIsSoundOn] = useState(true)
  const [showFullRoute, setShowFullRoute] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (!isNavigating) return

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          if (currentStep < navigationData.steps.length - 1) {
            setCurrentStep((s) => s + 1)
            return 0
          }
          return 100
        }
        return prev + 2
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [isNavigating, currentStep])

  const handleEndNavigation = () => {
    setIsNavigating(false)
  }

  const currentInstruction = navigationData.steps[currentStep]
  const nextInstruction = navigationData.steps[currentStep + 1]
  const completedSteps = currentStep
  const progressPercent = Math.round((completedSteps / navigationData.steps.length) * 100)

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Map Section */}
      <div className="relative h-[65vh] bg-gradient-to-br from-emerald-100 via-teal-50 to-cyan-100 overflow-hidden">
        <div className="absolute inset-0">
          <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
            <line x1="10%" y1="20%" x2="90%" y2="25%" stroke="#059669" strokeWidth="3" />
            <line x1="20%" y1="30%" x2="80%" y2="70%" stroke="#059669" strokeWidth="4" strokeDasharray="10,5" />
            <line x1="50%" y1="10%" x2="50%" y2="90%" stroke="#059669" strokeWidth="3" />
            <line x1="30%" y1="50%" x2="70%" y2="80%" stroke="#059669" strokeWidth="2" />
            <line x1="15%" y1="60%" x2="85%" y2="55%" stroke="#059669" strokeWidth="3" />
          </svg>

          <div className="absolute top-[20%] left-[25%] w-3 h-3 bg-emerald-600/40 rounded-full"></div>
          <div className="absolute top-[35%] right-[30%] w-2 h-2 bg-teal-600/40 rounded-full"></div>
          <div className="absolute bottom-[25%] left-[40%] w-3 h-3 bg-cyan-600/40 rounded-full"></div>
          <div className="absolute top-[50%] right-[20%] w-2 h-2 bg-emerald-600/40 rounded-full"></div>

          <div className="absolute inset-0 opacity-5">
            <div className="grid grid-cols-12 grid-rows-12 h-full">
              {Array.from({ length: 144 }).map((_, i) => (
                <div key={i} className="border border-emerald-600"></div>
              ))}
            </div>
          </div>
        </div>

        <div className="absolute inset-0 opacity-30">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M 50% 90% Q 45% 70%, 40% 50% T 50% 10%"
              stroke="#10b981"
              strokeWidth="6"
              fill="none"
              strokeDasharray="15,10"
            />
          </svg>
        </div>

        {/* Current location marker */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
          <div className="relative">
            <div className="absolute -inset-4 bg-primary/30 rounded-full animate-ping"></div>
            <div className="relative w-10 h-10 bg-primary rounded-full border-4 border-white shadow-xl flex items-center justify-center">
              <Navigation className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>

        {/* Destination marker */}
        <div className="absolute top-[15%] left-1/2 -translate-x-1/2 z-10">
          <div className="relative">
            <div className="w-8 h-8 bg-red-500 rounded-full border-4 border-white shadow-xl flex items-center justify-center">
              <MapPin className="w-4 h-4 text-white" />
            </div>
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-white px-2 py-1 rounded shadow text-xs font-medium">
              {destination}
            </div>
          </div>
        </div>

        {/* Top controls */}
        <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-20">
          <Link href="/">
            <Button variant="secondary" size="icon" className="bg-white shadow-lg hover:bg-white/90">
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </Link>

          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="icon"
              className="bg-white shadow-lg hover:bg-white/90"
              onClick={() => setIsSoundOn(!isSoundOn)}
            >
              {isSoundOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </Button>
            <Button variant="secondary" size="icon" className="bg-white shadow-lg hover:bg-white/90">
              <Maximize2 className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Route info overlay */}
        <div className="absolute top-20 left-4 right-4 z-20">
          <Card className="shadow-xl border-0 backdrop-blur-sm bg-white/95">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-semibold text-sm">{destination}</p>
                    <p className="text-xs text-muted-foreground">{navigationData.totalDistance}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-primary">{navigationData.estimatedTime}</p>
                  <p className="text-xs text-muted-foreground">โดยประมาณ</p>
                </div>
              </div>
              <Progress value={progressPercent} className="h-1.5" />
              <p className="text-xs text-muted-foreground mt-2">
                ผ่านไป {completedSteps}/{navigationData.steps.length} ขั้นตอน
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Navigation Instructions */}
      <div className="p-4 space-y-4">
        {/* Current Step */}
        <Card className="border-2 border-primary shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                {currentInstruction.direction === "straight" && <ArrowUp className="w-8 h-8 text-white" />}
                {currentInstruction.direction === "right" && <ArrowRight className="w-8 h-8 text-white rotate-0" />}
                {currentInstruction.direction === "left" && <ArrowRight className="w-8 h-8 text-white rotate-180" />}
                {currentInstruction.direction === "destination" && <MapPin className="w-8 h-8 text-white" />}
              </div>
              <div className="flex-1">
                <p className="text-2xl font-bold mb-2">{currentInstruction.instruction}</p>
                <div className="flex gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Navigation className="w-4 h-4" />
                    {currentInstruction.distance}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {currentInstruction.duration}
                  </span>
                </div>
              </div>
            </div>
            <Progress value={progress} className="h-2 mb-2" />
            <p className="text-xs text-muted-foreground">กำลังเดินทางในขั้นตอนนี้...</p>
          </CardContent>
        </Card>

        {/* Next Step Preview */}
        {nextInstruction && (
          <Card className="bg-stone-100 border-stone-200">
            <CardContent className="p-4">
              <p className="text-xs font-semibold text-muted-foreground mb-2">ถัดไป</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-stone-300 rounded-full flex items-center justify-center flex-shrink-0">
                  {nextInstruction.direction === "straight" && <ArrowUp className="w-5 h-5 text-stone-600" />}
                  {nextInstruction.direction === "right" && <ArrowRight className="w-5 h-5 text-stone-600" />}
                  {nextInstruction.direction === "left" && <ArrowRight className="w-5 h-5 text-stone-600 rotate-180" />}
                  {nextInstruction.direction === "destination" && <MapPin className="w-5 h-5 text-stone-600" />}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{nextInstruction.instruction}</p>
                  <p className="text-xs text-muted-foreground">
                    {nextInstruction.distance} | {nextInstruction.duration}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* View All Steps Button */}
        <Button
          variant="outline"
          className="w-full gap-2 bg-transparent"
          onClick={() => setShowFullRoute(!showFullRoute)}
        >
          {showFullRoute ? "ซ่อนรายละเอียด" : "ดูเส้นทางทั้งหมด"}
          <ChevronRight className={`w-4 h-4 transition-transform ${showFullRoute ? "rotate-90" : ""}`} />
        </Button>

        {/* Full Route Steps */}
        {showFullRoute && (
          <Card className="border-stone-200">
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4">ขั้นตอนทั้งหมด</h3>
              <div className="space-y-4">
                {navigationData.steps.map((step, index) => (
                  <div
                    key={step.id}
                    className={`flex gap-4 ${index < currentStep ? "opacity-50" : ""} ${
                      index === currentStep ? "bg-primary/5 -mx-2 px-2 py-2 rounded-lg" : ""
                    }`}
                  >
                    <div className="flex flex-col items-center pt-1">
                      {index < currentStep ? (
                        <CheckCircle2 className="w-6 h-6 text-primary flex-shrink-0" />
                      ) : index === currentStep ? (
                        <Circle className="w-6 h-6 text-primary flex-shrink-0 fill-primary" />
                      ) : (
                        <Circle className="w-6 h-6 text-stone-300 flex-shrink-0" />
                      )}
                      {index < navigationData.steps.length - 1 && <div className="w-0.5 h-12 bg-stone-200 mt-2"></div>}
                    </div>
                    <div className="flex-1 pb-4">
                      <p className={`font-medium text-sm ${index === currentStep ? "text-primary" : ""}`}>
                        {step.instruction}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {step.distance} | {step.duration}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* End Navigation Button */}
        <Button variant="destructive" className="w-full gap-2" onClick={handleEndNavigation}>
          <X className="w-4 h-4" />
          สิ้นสุดการนำทาง
        </Button>
      </div>

      {/* Navigation finished dialog */}
      {currentStep === navigationData.steps.length - 1 && progress >= 100 && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <Card className="max-w-md w-full">
            <CardContent className="p-8 text-center">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-12 h-12 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-2">ถึงจุดหมายแล้ว!</h2>
              <p className="text-muted-foreground mb-6">คุณมาถึง {destination} เรียบร้อยแล้ว</p>
              <div className="flex gap-3">
                <Link href="/" className="flex-1">
                  <Button variant="outline" className="w-full bg-transparent">
                    กลับหน้าหลัก
                  </Button>
                </Link>
                <Link href="/planner" className="flex-1">
                  <Button className="w-full">ดูสถานที่ถัดไป</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

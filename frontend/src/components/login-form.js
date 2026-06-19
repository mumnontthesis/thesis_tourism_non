"use client"

import { useState } from "react"
import { Button } from "./ui/button.tsx"
import { Input } from "./ui/input.tsx"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card.tsx"
import { Label } from "./ui/label.tsx"
import { Badge } from "./ui/badge.tsx"
import { User, Building2, ChevronLeft, MapPin, Eye, EyeOff } from "lucide-react"
import { Link, useNavigate, useSearchParams } from "react-router-dom" 
import { API_BASE_URL } from "../lib/api.js"

export function LoginForm() {
  const [userType, setUserType] = useState("tourist")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState("")

  const getStatusText = (s) => {
    const v = (s || "").toString().toLowerCase()
    if (v === "approved" || v === "active" || v === "อนุมัติ") return "สถานะธุรกิจ: ได้รับการอนุมัติแล้ว"
    if (v === "rejected" || v === "declined" || v === "ไม่ผ่าน") return "สถานะถูกปฏิเสธ"
    return "สถานะธุรกิจ: รอการอนุมัติจากผู้ดูแลระบบ"
  }
  
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirectUrl = searchParams.get("redirect")

  const handleLogin = async (e) => {
    e.preventDefault()
    setError("")
    setStatus("")
    setLoading(true)

    try {
      const res = await fetch(`${API_BASE_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, userType }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "อีเมลหรือรหัสผ่านไม่ถูกต้อง")
        return
      }
      
      // ดึงประเภทผู้ใช้จากข้อมูลที่เซิร์ฟเวอร์ส่งกลับมา (ถ้ามี) ถ้าไม่มีก็ใช้ค่าจากฟอร์ม
      const resolvedType =
        data.user?.user_type || data.user?.userType || userType

      // ✅ บันทึก session ผู้ใช้ลงในเบราว์เซอร์ ให้มี userType ชัดเจน
      localStorage.setItem(
        "user",
        JSON.stringify({
          ...(data.user || {}),
          email: (data.user && data.user.email) || email,
          userType: resolvedType,
        })
      )

      // เส้นทางหลังล็อกอิน
      // - entrepreneur / business -> แสดงสถานะรออนุมัติ แล้วพาไปหน้าแดชบอร์ดผู้ประกอบการ
      // - อื่นๆ (tourist, admin) -> กลับหน้าแรก แล้วให้ Header แสดงปุ่มตามสิทธิ์
      if (resolvedType === "business" || resolvedType === "entrepreneur") {
        // ค่าเริ่มต้น (กันกรณีดึงข้อมูลช้า/ไม่สำเร็จ)
        setStatus(getStatusText("pending"))

        const userId = data.user?.id
        if (userId) {
          const dbRes = await fetch(`${API_BASE_URL}/entrepreneur/by-user/${userId}`)
          const dbJson = await dbRes.json()
          const dbStatus = dbJson?.data?.status

          if (dbStatus) {
            setStatus(getStatusText(dbStatus))
          }

          // approved -> dashboard เต็มรูปแบบ | rejected -> dashboard แสดงเหตุผลที่ถูกปฏิเสธ
          if (dbStatus === "approved") {
            setTimeout(() => {
              navigate("/business-dashboard")
            }, 3500)
          } else if (dbStatus === "rejected") {
            setTimeout(() => {
              navigate("/business-dashboard")
            }, 1200)
          }
        }
      } else if (redirectUrl && redirectUrl.startsWith("/")) {
        navigate(redirectUrl)
      } else {
        window.location.href = "/"
      }
      
    } catch {
      setError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-stone-50">
      <Card className={`w-full ${!userType ? 'max-w-md' : 'max-w-lg'} shadow-2xl border-none transition-all duration-300`}>
        <CardHeader className="text-center space-y-2">
          <div
            className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-2"
            style={{
              backgroundImage:
                "linear-gradient(335deg, rgba(129, 0, 222, 1) 0%, rgba(9, 9, 121, 1) 53%, rgba(0, 212, 255, 1) 100%)",
            }}
          >
            <MapPin className="w-10 h-10 text-white" />
          </div>
          <CardTitle className="text-3xl font-bold text-emerald-900">เข้าสู่ระบบ</CardTitle>
          {!userType && <CardDescription className="text-stone-500">เลือกประเภทบัญชีเพื่อเข้าสู่ระบบเที่ยวนนทบุรี</CardDescription>}
        </CardHeader>

        <CardContent>
          {!userType ? (
            <div className="space-y-4">
              <p className="text-sm text-center text-stone-500 mb-6">คุณต้องการเข้าใช้งานในฐานะ?</p>

              <Button
                variant="outline"
                className="w-full h-24 flex flex-col items-center justify-center gap-2 hover:border-emerald-600 hover:bg-emerald-50 transition-all bg-white border-stone-200"
                onClick={() => setUserType("tourist")}
              >
                <User className="w-8 h-8 text-emerald-600" />
                <div className="text-center">
                  <p className="font-semibold text-lg">นักท่องเที่ยว</p>
                  <p className="text-xs text-muted-foreground">ค้นหาและวางแผนการเที่ยว</p>
                </div>
              </Button>

              <Button
                variant="outline"
                className="w-full h-24 flex flex-col items-center justify-center gap-2 hover:border-amber-600 hover:bg-amber-50 transition-all bg-white border-stone-200"
                onClick={() => setUserType("business")}
              >
                <Building2 className="w-8 h-8 text-amber-600" />
                <div className="text-center">
                  <p className="font-semibold text-lg">ผู้ประกอบการ</p>
                  <p className="text-xs text-muted-foreground">จัดการสถานที่และธุรกิจ</p>
                </div>
              </Button>

              <div className="text-center pt-4 border-t border-stone-100">
                <Link to="/" className="text-sm text-emerald-600 hover:underline font-medium">
                  กลับหน้าหลัก
                </Link>
              </div>
              
              <p className="text-center text-sm text-stone-500 mt-4">
                ยังไม่มีบัญชี?{" "}
                <Link to="/register" className="text-emerald-600 hover:underline font-semibold">
                  สมัครสมาชิก
                </Link>
              </p>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="flex items-center justify-between mb-6 bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
                <div className="flex items-center gap-3">
                  {userType === "tourist" ? (
                    <User className="w-6 h-6 text-emerald-600" />
                  ) : (
                    <Building2 className="w-6 h-6 text-amber-600" />
                  )}
                  <span className="font-semibold text-emerald-900">
                    {userType === "tourist" ? "นักท่องเที่ยว" : "ผู้ประกอบการ"}
                  </span>
                </div>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    setUserType(null);
                    setError("");
                  }}
                  className="text-emerald-600 hover:text-emerald-700"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  เปลี่ยนประเภท
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">อีเมล</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11"
                />
              </div>

              {/* ปรับปรุงส่วนรหัสผ่านและลืมรหัสผ่าน */}
              <div className="space-y-2">
                <Label htmlFor="password">รหัสผ่าน</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-11 pr-10"
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)} 
                    className="absolute right-3 top-3 text-stone-400 hover:text-stone-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {/* ลืมรหัสผ่าน ย้ายมาอยู่ข้างใต้ช่อง Input */}
                <div className="flex justify-end">
                  <Link to="#" className="text-xs text-emerald-600 hover:underline mt-1">
                    ลืมรหัสผ่าน?
                  </Link>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600 animate-in fade-in duration-300">
                  {error}
                </div>
              )}

              {/* เพิ่มระยะห่างด้านบนปุ่ม (pt-4) */}
              <div className="pt-4">
                <Button
                  type="submit"
                  disabled={loading}
                  className={`w-full h-11 text-lg font-semibold shadow-lg transition-all bg-amber-600 hover:bg-amber-700 shadow-amber-100 text-white`}
                >
                  {loading ? "กำลังตรวจสอบข้อมูล..." : "เข้าสู่ระบบ"}
                </Button>
              </div>

              {status && (
                <div
                  className="mt-2 text-center text-sm font-medium"
                  style={{
                    backgroundColor: status.includes("ได้รับการอนุมัติแล้ว")
                      ? "#bbf7d0"
                      : status.includes("ถูกปฏิเสธ")
                      ? "#fee2e2"
                      : "#fde68a",
                    color: status.includes("ได้รับการอนุมัติแล้ว")
                      ? "#166534"
                      : status.includes("ถูกปฏิเสธ")
                      ? "#991b1b"
                      : "#854d0e",
                    padding: "10px 12px",
                    borderRadius: "10px",
                    border: status.includes("ได้รับการอนุมัติแล้ว")
                      ? "1px solid #4ade80"
                      : status.includes("ถูกปฏิเสธ")
                      ? "1px solid #f87171"
                      : "1px solid #f59e0b",
                  }}
                >
                  {status}
                </div>
              )}

              <div className="text-center pt-2">
                <p className="text-sm text-stone-500">
                  ยังไม่มีบัญชี?{" "}
                  <Link to="/register" className="text-emerald-600 hover:underline font-semibold">
                    สมัครสมาชิก
                  </Link>
                </p>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
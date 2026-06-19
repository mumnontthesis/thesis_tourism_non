"use client"

import { useState } from "react"
import { Button } from "./ui/button.tsx"
import { Input } from "./ui/input.tsx"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card.tsx"
import { Label } from "./ui/label.tsx"
import { Badge } from "./ui/badge.tsx"
import { User, Building2, ChevronLeft, UserPlus, Eye, EyeOff } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"
import { PrivacyPolicyDialog } from "./privacy-policy-dialog"
import { API_BASE_URL } from "../lib/api.js"

export function RegisterForm() {
  const [userType, setUserType] = useState(null)
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "", // เพิ่มเบอร์โทรศัพท์
    email: "",
    password: "",
    confirmPassword: ""
  })
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [hasReadPolicy, setHasReadPolicy] = useState(false)
  const [policyOpen, setPolicyOpen] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  
  const navigate = useNavigate() 

  const handleRegister = async (e) => {
    e.preventDefault()
    setError("")
    
    if (formData.password !== formData.confirmPassword) {
      return setError("รหัสผ่านไม่ตรงกัน")
    }
    if (!acceptTerms) {
      return setError("กรุณายอมรับข้อกำหนดและเงื่อนไข")
    }

    setLoading(true)
    try {
      const res = await fetch(`${API_BASE_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          username: formData.fullName,
          phone: formData.phone, // ส่งเบอร์โทรศัพท์ไปที่ API
          email: formData.email, 
          password: formData.password,
          userType: "tourist"
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.message || "เกิดข้อผิดพลาดในการสมัครสมาชิก") 
        return
      }

      alert("สมัครสมาชิกสำเร็จ!")
      navigate("/login")
    } catch {
      setError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้")
    } finally {
      setLoading(false)
    }
  }

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-stone-50">
      <Card className={`w-full ${!userType ? 'max-w-md' : 'max-w-2xl'} shadow-2xl border-none transition-all duration-300`}>
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center mb-2">
            <UserPlus className="w-10 h-10 text-white" />
          </div>
          <CardTitle className="text-3xl font-bold text-emerald-900">สมัครสมาชิก</CardTitle>
          {!userType && <CardDescription className="text-stone-500">เลือกประเภทบัญชีเพื่อเริ่มต้นใช้งาน</CardDescription>}
        </CardHeader>

        <CardContent>
          {!userType ? (
            <div className="space-y-4">
              <Button
                variant="outline"
                className="w-full h-24 flex flex-col items-center justify-center gap-2 hover:border-emerald-600 hover:bg-emerald-50 transition-all bg-white border-stone-200"
                onClick={() => setUserType("tourist")}
              >
                <User className="w-8 h-8 text-emerald-600" />
                <div className="text-center">
                  <p className="font-semibold text-lg">นักท่องเที่ยว</p>
                  <p className="text-xs text-muted-foreground">เริ่มค้นหาความงามของนนทบุรี</p>
                </div>
              </Button>

              <Button
                variant="outline"
                className="w-full h-24 flex flex-col items-center justify-center gap-2 hover:border-amber-600 hover:bg-amber-50 transition-all bg-white border-stone-200"
                onClick={() => navigate("/register-entrepreneur")} 
              >
                <Building2 className="w-8 h-8 text-amber-600" />
                <div className="text-center">
                  <p className="font-semibold text-lg">ผู้ประกอบการ</p>
                  <p className="text-xs text-muted-foreground">ลงทะเบียนสถานที่และธุรกิจของคุณ</p>
                </div>
              </Button>

              <div className="text-center pt-4 border-t border-stone-100">
                <p className="text-sm text-stone-500 mb-2">มีบัญชีอยู่แล้ว?</p>
                <Link to="/login" className="text-emerald-600 hover:underline font-semibold">
                  เข้าสู่ระบบ
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleRegister} className="space-y-5">
              <div className="flex items-center justify-between mb-6 bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
                <div className="flex items-center gap-3">
                  <User className="w-6 h-6 text-emerald-600" />
                  <span className="font-semibold text-emerald-900">นักท่องเที่ยว</span>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => setUserType(null)} className="text-emerald-600 hover:text-emerald-700">
                  <ChevronLeft className="w-4 h-4 mr-1" /> เปลี่ยนประเภท
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">ชื่อ-นามสกุล</Label>
                  <Input id="fullName" placeholder="สมชาย ใจดี" value={formData.fullName} onChange={(e) => updateField("fullName", e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">เบอร์โทรศัพท์</Label>
                  <Input id="phone" type="tel" placeholder="08X-XXX-XXXX" value={formData.phone} onChange={(e) => updateField("phone", e.target.value)} required />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">อีเมล</Label>
                <Input id="email" type="email" placeholder="name@example.com" value={formData.email} onChange={(e) => updateField("email", e.target.value)} required />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password">รหัสผ่าน</Label>
                  <div className="relative">
                    <Input id="password" type={showPassword ? "text" : "password"} value={formData.password} onChange={(e) => updateField("password", e.target.value)} required />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-2.5 text-stone-400">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">ยืนยันรหัสผ่าน</Label>
                  <div className="relative">
                    <Input id="confirmPassword" type={showConfirmPassword ? "text" : "password"} value={formData.confirmPassword} onChange={(e) => updateField("confirmPassword", e.target.value)} required />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-2.5 text-stone-400">
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* ส่วน Checkbox ที่เพิ่มเข้ามา */}
              <div className="flex items-center gap-2 py-6">
                <input
                  type="checkbox"
                  id="terms"
                  checked={acceptTerms}
                  disabled={!hasReadPolicy}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  title={hasReadPolicy ? undefined : "กรุณาอ่านนโยบายความเป็นส่วนตัวก่อน"}
                  className={`w-4 h-4 text-emerald-600 rounded border-stone-300 focus:ring-emerald-500 shrink-0 ${
                    !hasReadPolicy ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                />
                <p className="text-xs text-stone-600 m-0">
                  ยอมรับเงื่อนไขและ{" "}
                  <button
                    type="button"
                    className="text-emerald-600 underline hover:text-emerald-700 font-medium p-0 bg-transparent border-0 cursor-pointer"
                    onClick={() => setPolicyOpen(true)}
                  >
                    นโยบาย
                  </button>
                  ความเป็นส่วนตัว
                </p>
              </div>

              <PrivacyPolicyDialog
                open={policyOpen}
                onOpenChange={setPolicyOpen}
                onAcknowledge={() => setHasReadPolicy(true)}
              />

              {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">{error}</div>}

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-11 text-lg font-semibold shadow-lg shadow-emerald-100"
              >
                {loading ? "กำลังดำเนินการ..." : "สมัครสมาชิก"}
              </Button>
              
              <p className="text-center text-sm text-stone-500 pt-2">
                มีบัญชีอยู่แล้ว? <Link to="/login" className="text-emerald-600 font-semibold hover:underline">เข้าสู่ระบบ</Link>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
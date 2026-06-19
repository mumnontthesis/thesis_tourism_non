"use client"

import { useState, useRef } from "react"
import { Button } from "./ui/button.tsx"
import { Input } from "./ui/input.tsx"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card.tsx"
import { Label } from "./ui/label.tsx"
import { Badge } from "./ui/badge.tsx"
import { Building2, ChevronLeft, Upload, X, Eye, EyeOff, UserPlus } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"
import { PrivacyPolicyDialog } from "./privacy-policy-dialog"
import { API_BASE_URL } from "../lib/api.js"

export function RegisterFormEntrepreneur() {
  const [formData, setFormData] = useState({
    contactName: "",
    phone: "",
    placeName: "",
    businessType: "",
    address: "",
    description: "",
    email: "",
    password: "",
    confirmPassword: "",
  })
  const [images, setImages] = useState([])
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [hasReadPolicy, setHasReadPolicy] = useState(false)
  const [policyOpen, setPolicyOpen] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState("")

  const getStatusText = (s) => {
    const v = (s || "").toString().toLowerCase()
    if (v === "approved" || v === "active" || v === "อนุมัติ") return "สถานะธุรกิจ: ได้รับการอนุมัติแล้ว"
    if (v === "rejected" || v === "declined" || v === "ไม่ผ่าน") return "สถานะถูกปฏิเสธ"
    return "สถานะธุรกิจ: รอการอนุมัติจากผู้ดูแลระบบ"
  }
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  const fileInputRef = useRef(null)
  const navigate = useNavigate()

  const businessTypes = [
    "ร้านอาหาร", "ที่พัก/โรงแรม", "สถานที่ท่องเที่ยว", "ร้านค้า/ของฝาก",
    "สปา/นวด", "กิจกรรม/ทัวร์", "คาเฟ่", "อื่นๆ"
  ]

  const handleImageUpload = (files) => {
    const validFiles = Array.from(files).filter(
      (file) => file.type === "image/jpeg" || file.type === "image/png"
    )
    if (images.length + validFiles.length > 5) {
      setError("อัปโหลดรูปภาพได้สูงสุด 5 รูป")
      return
    }
    const newImages = validFiles.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      name: file.name,
    }))
    setImages((prev) => [...prev, ...newImages])
    setError("")
  }

  const removeImage = (index) => {
    setImages((prev) => {
      const updated = [...prev]
      URL.revokeObjectURL(updated[index].preview)
      updated.splice(index, 1)
      return updated
    })
  }

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
      const submitData = new FormData()
      Object.keys(formData).forEach(key => submitData.append(key, formData[key]))
      submitData.append("userType", "entrepreneur")
      images.forEach((img) => submitData.append("images", img.file))

      const res = await fetch(`${API_BASE_URL}/register`, {
        method: "POST",
        body: submitData,
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.message || "เกิดข้อผิดพลาดในการสมัครสมาชิก")
        return
      }

      setStatus(getStatusText(data.status))

      // หลังสมัครสำเร็จ ให้พาไปหน้า login
      setTimeout(() => navigate("/login"), 1200)
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
      <Card className="w-full max-w-2xl shadow-2xl border-none">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center mb-2">
            <UserPlus className="w-10 h-10 text-white" />
          </div>
          <CardTitle className="text-3xl font-bold text-emerald-900">สมัครสมาชิกธุรกิจ</CardTitle>
          <CardDescription className="text-stone-500">
            ลงทะเบียนสถานที่และธุรกิจของคุณเพื่อเริ่มต้นใช้งาน
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="mb-6 flex items-center justify-between bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
            <div className="flex items-center gap-3">
              <Building2 className="w-6 h-6 text-emerald-600" />
              <span className="font-semibold text-emerald-900">ผู้ประกอบการ</span>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate("/register")}
              className="text-emerald-600 hover:text-emerald-700"
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> เปลี่ยนประเภท
            </Button>
          </div>

          <form onSubmit={handleRegister} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactName">ชื่อผู้ติดต่อ</Label>
                <Input id="contactName" placeholder="ชื่อ-นามสกุล" value={formData.contactName} onChange={(e) => updateField("contactName", e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">เบอร์โทรศัพท์</Label>
                <Input id="phone" type="tel" placeholder="08X-XXX-XXXX" value={formData.phone} onChange={(e) => updateField("phone", e.target.value)} required />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="placeName">ชื่อสถานที่/ธุรกิจ</Label>
                <Input id="placeName" placeholder="ชื่อร้านค้า" value={formData.placeName} onChange={(e) => updateField("placeName", e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="businessType">ประเภทธุรกิจ</Label>
                <select
                  id="businessType"
                  value={formData.businessType}
                  onChange={(e) => updateField("businessType", e.target.value)}
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="" disabled>เลือกประเภทธุรกิจ</option>
                  {businessTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">ที่อยู่</Label>
              <Input
                id="address"
                placeholder="ที่ตั้งธุรกิจ"
                value={formData.address}
                onChange={(e) => updateField("address", e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>อัปโหลดรูปภาพ (สูงสุด 5 รูป)</Label>
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleImageUpload(e.dataTransfer.files); }}
                className={`border-2 border-dashed rounded-xl p-6 transition-all cursor-pointer flex flex-col items-center justify-center ${
                  isDragging ? "border-emerald-500 bg-emerald-50" : "border-stone-200 hover:border-emerald-400 hover:bg-stone-50"
                }`}
              >
                <Upload className="w-8 h-8 text-stone-400 mb-2" />
                <p className="text-sm text-stone-500 text-center">คลิกหรือลากไฟล์มาวาง</p>
                <input ref={fileInputRef} type="file" multiple accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e.target.files)} />
              </div>
              {images.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {images.map((img, idx) => (
                    <div key={idx} className="relative w-16 h-16 rounded-lg overflow-hidden border">
                      <img src={img.preview} alt="preview" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => removeImage(idx)} className="absolute top-0 right-0 bg-red-500 text-white p-0.5"><X className="w-3 h-3" /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">อีเมล</Label>
              <Input id="email" type="email" placeholder="example@gmail.com" value={formData.email} onChange={(e) => updateField("email", e.target.value)} required />
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

            <div className="flex items-center gap-2 py-4">
              <input
                type="checkbox"
                id="terms"
                checked={acceptTerms}
                disabled={!hasReadPolicy}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                title={hasReadPolicy ? undefined : "กรุณาอ่านนโยบายความเป็นส่วนตัวก่อน"}
                className={`w-4 h-4 text-emerald-600 rounded border-stone-300 shrink-0 ${
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

            {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>}

            {/* --- ปุ่มสมัครสมาชิก --- */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-11 text-lg font-semibold shadow-lg shadow-emerald-200 mt-4"
            >
              {loading ? "กำลังดำเนินการ..." : "สมัครสมาชิกธุรกิจ"}
            </Button>

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

            <p className="text-center text-sm text-stone-500 pt-2">
              มีบัญชีอยู่แล้ว? <Link to="/login" className="text-emerald-600 font-semibold hover:underline">เข้าสู่ระบบ</Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default RegisterFormEntrepreneur;
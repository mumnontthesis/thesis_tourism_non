"use client"

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"
import { Button } from "./ui/button.tsx"

const TERMS_SECTIONS = [
  {
    title: "หมวดที่ 1 การลงทะเบียนบัญชีผู้ใช้งานและการยืนยันตัวตน",
    body: "ผู้ใช้บริการประเภททั่วไปตกลงและรับรองว่าจะให้ข้อมูลระบุตัวตน อันประกอบด้วย ชื่อ-นามสกุล อีเมล และเบอร์โทรศัพท์ ที่ถูกต้อง ครบถ้วน และตรงต่อความเป็นจริง เพื่อใช้ในการสร้างบัญชีผู้ใช้งานและเข้าถึงระบบ สำหรับผู้ใช้บริการประเภทผู้ประกอบการร้านค้า ตกลงที่จะเข้าสู่กระบวนการพิสูจน์และยืนยันตัวตน (Know Your Customer: KYC / Know Your Business: KYB) โดยการส่งมอบข้อมูลและอัปโหลดเอกสารหลักฐานแสดงสิทธิ์หรือเอกสารยืนยันตัวตนตามที่แพลตฟอร์มกำหนด เพื่อวัตถุประสงค์ในการตรวจสอบความถูกต้องและความมีอยู่จริงของสถานประกอบการก่อนได้รับอนุญาตให้เผยแพร่ข้อมูลบนระบบ ทั้งนี้ แพลตฟอร์มขอสงวนสิทธิ์ในการระงับหรือยกเลิกการให้บริการทันทีโดยไม่ต้องแจ้งให้ทราบล่วงหน้า หากตรวจพบว่าข้อมูลหรือเอกสารที่นำส่งเป็นเท็จ ข้อมูลไม่ถูกต้อง หรือมีการแอบอ้างสิทธิ์ของบุคคลอื่น",
  },
  {
    title: "หมวดที่ 2 ขอบเขตความรับผิดชอบและการใช้งานระบบระบุตำแหน่ง",
    body: "ผู้ประกอบการร้านค้ายอมรับเป็นผู้รับผิดชอบแต่เพียงผู้เดียวต่อความถูกต้อง ความเหมาะสม และลิขสิทธิ์ของข้อมูล รายละเอียด ประเภทร้านค้า ตลอดจนรูปภาพทั้งหมดที่ทำการอัปโหลดเข้าสู่ระบบ นอกจากนี้ แพลตฟอร์มมีการจัดให้มีระบบบริการข้อมูลตำแหน่งที่ตั้ง (Location Services) เพื่อคำนวณระยะทางและให้บริการนำทางไปยังสถานประกอบการหรือสถานที่ท่องเที่ยว ผู้ใช้บริการรับทราบและตกลงว่าความแม่นยำของข้อมูลพิกัดภูมิศาสตร์ดังกล่าวขึ้นอยู่กับอุปกรณ์ สัญญาณเครือข่าย และระบบโครงสร้างพื้นฐานของผู้ใช้บริการเอง แพลตฟอร์มจึงไม่รับผิดชอบต่อความคลาดเคลื่อนใด ๆ ที่เกิดขึ้นจากเหตุดังกล่าว",
  },
]

const PRIVACY_SECTIONS = [
  {
    title: "หมวดที่ 1 ข้อมูลส่วนบุคคลที่มีการเก็บรวบรวม",
    body: "เว็บแอปพลิเคชันมีความจำเป็นต้องจัดเก็บรวบรวมข้อมูลส่วนบุคคลตามประเภทของผู้ใช้งานเพื่อวัตถุประสงค์ในการให้บริการ โดยสำหรับกลุ่มผู้ใช้ทั่วไป ระบบจะทำการจัดเก็บข้อมูล ชื่อ-นามสกุล อีเมล เบอร์โทรศัพท์ รหัสผ่านที่ผ่านกระบวนการเข้ารหัสความปลอดภัย และข้อมูลพิกัดตำแหน่งที่ตั้งทางภูมิศาสตร์ในขณะเปิดใช้งาน สำหรับกลุ่มผู้ประกอบการร้านค้า ระบบจะทำการจัดเก็บข้อมูล ชื่อ-นามสกุลของผู้ประสานงาน เบอร์โทรศัพท์ ชื่อร้านค้า ประเภทร้านค้า ที่อยู่พิกัดสถานประกอบการ รูปภาพร้านค้า รหัสผ่าน รวมถึงเอกสารยืนยันตัวตนและเอกสารแสดงสิทธิ์ในการจัดตั้งสถานประกอบการ เช่น สำเนาบัตรประจำตัวประชาชน หรือใบทะเบียนพาณิชย์ ตามแต่กรณี",
  },
  {
    title: "หมวดที่ 2 วัตถุประสงค์และฐานในการประมวลผลข้อมูล",
    body: "เว็บแอปพลิเคชันดำเนินกระบวนการประมวลผลข้อมูลส่วนบุคคลภายใต้ฐานความจำเป็นทางสัญญาและการประมวลผลตามที่กฎหมายกำหนด โดยมีวัตถุประสงค์เพื่อใช้ในการบริหารจัดการบัญชีผู้ใช้งาน การแสดงผลข้อมูลร้านค้าบนแผนที่และระบบแนะนำการท่องเที่ยว ตลอดจนการประมวลผลข้อมูลตำแหน่งที่ตั้งปัจจุบันของผู้ใช้ทั่วไปแบบเรียลไทม์เพื่อคำนวณระยะทางและให้บริการนำทาง นอกจากนี้ ข้อมูลและเอกสารยืนยันตัวตนของผู้ประกอบการจะถูกนำไปใช้ในกระบวนการตรวจสอบความถูกต้อง (KYC/KYB) เพื่อป้องกันการทุจริต การแอบอ้าง หรือการนำเข้าข้อมูลอันเป็นเท็จอันจะก่อให้เกิดความเสียหายแก่ผู้บริโภคและระบบโดยรวม รวมถึงการใช้ข้อมูลการติดต่อเพื่อประโยชน์ในการประสานงานและการให้บริการช่วยเหลือแก่ผู้ใช้งาน",
  },
  {
    title: "หมวดที่ 3 มาตรการรักษาความปลอดภัยและระยะเวลาจัดเก็บข้อมูล",
    body: "ข้อมูลส่วนบุคคลทั้งหมดจะถูกจัดเก็บรักษาไว้ในระบบฐานข้อมูลที่มีมาตรการรักษาความปลอดภัยทางไซเบอร์ตามมาตรฐานสากล โดยเฉพาะอย่างยิ่ง เอกสารยืนยันตัวตนของผู้ประกอบการจะถูกจำกัดสิทธิ์การเข้าถึงอย่างเข้มงวดเฉพาะเจ้าหน้าที่ผู้มีอำนาจตรวจสอบเท่านั้น ทั้งนี้ ระบบจะไม่ทำการบันทึกประวัติพิกัดตำแหน่งที่ตั้งของผู้ใช้งานทั่วไปไว้อย่างถาวร โดยจะประมวลผลในขณะที่มีการใช้งานฟังก์ชันนำทางเท่านั้น สำหรับข้อมูลบัญชีและเอกสารหลักฐานอื่น ๆ จะถูกจัดเก็บไว้ตลอดระยะเวลาที่สถานะบัญชีของผู้ใช้งานยังคงเปิดใช้งานอยู่ และระบบจะดำเนินการลบ ทำลาย หรือทำให้ข้อมูลส่วนบุคคลไม่สามารถระบุตัวตนได้ภายในระยะเวลาที่กำหนดหลังจากผู้ใช้งานทำการยกเลิกหรือปิดบัญชี",
  },
  {
    title: "หมวดที่ 4 สิทธิของเจ้าของข้อมูลส่วนบุคคลตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล",
    body: "ผู้ใช้งานในฐานะเจ้าของข้อมูลส่วนบุคคลทรงไว้ซึ่งสิทธิตามกฎหมายในการเข้าถึง ขอรับสำนา ขอแก้ไขปรับปรุงข้อมูลให้เป็นปัจจุบัน ขอคัดค้านหรือระงับการประมวลผล และขอให้ดำเนินการลบหรือทำลายข้อมูลส่วนบุคคลเมื่อพ้นความจำเป็น ทั้งนี้ สำหรับข้อมูลตำแหน่งที่ตั้ง ผู้ใช้ทั่วไปสามารถเลือกที่จะปฏิเสธหรือยกเลิกการให้สิทธิ์เข้าถึงพิกัดภูมิศาสตร์ (Location Permission) ได้ด้วยตนเองในทุกขณะผ่านการตั้งค่าบนเว็บเบราว์เซอร์หรืออุปกรณ์ที่เปิดใช้งาน",
  },
]

function PolicyBlock({ title, subtitle, sections }) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-base font-bold text-stone-900">{title}</h2>
        {subtitle && <p className="text-xs text-stone-500 mt-0.5">{subtitle}</p>}
      </div>
      {sections.map((section) => (
        <div key={section.title}>
          <h3 className="font-semibold text-stone-800 mb-1.5 text-sm">{section.title}</h3>
          <p className="text-sm text-stone-600 leading-relaxed">{section.body}</p>
        </div>
      ))}
    </section>
  )
}

export function PrivacyPolicyDialog({ open, onOpenChange, onAcknowledge }) {
  const scrollRef = useRef(null)
  const [scrolledToEnd, setScrolledToEnd] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (open) {
      setScrolledToEnd(false)
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [open])

  const checkScrollEnd = (el) => {
    if (!el) return
    const atEnd = el.scrollHeight - el.scrollTop <= el.clientHeight + 16
    if (atEnd) setScrolledToEnd(true)
  }

  const handleScroll = (e) => {
    checkScrollEnd(e.currentTarget)
  }

  useEffect(() => {
    if (!open) return
    const timer = setTimeout(() => checkScrollEnd(scrollRef.current), 150)
    return () => clearTimeout(timer)
  }, [open])

  const handleClose = () => {
    onOpenChange?.(false)
  }

  const handleAcknowledge = () => {
    if (!scrolledToEnd) return
    onAcknowledge?.()
    onOpenChange?.(false)
  }

  if (!open || !mounted) return null

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-[5vh]">
      <button
        type="button"
        aria-label="ปิด"
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="policy-dialog-title"
        className="relative z-10 flex w-full max-w-2xl flex-col overflow-hidden rounded-lg border bg-white shadow-xl"
        style={{ height: "min(90vh, 800px)" }}
      >
        <div className="flex shrink-0 items-start justify-between border-b border-stone-100 px-6 py-4">
          <h2 id="policy-dialog-title" className="pr-8 text-lg font-semibold text-stone-900">
            ข้อกำหนดและเงื่อนไขการใช้บริการ และนโยบายความเป็นส่วนตัว
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="absolute right-4 top-4 rounded-sm p-1 text-stone-500 hover:bg-stone-100 hover:text-stone-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-4 space-y-8"
        >
          <PolicyBlock
            title="ข้อกำหนดและเงื่อนไขการใช้บริการ"
            subtitle="(Terms of Service)"
            sections={TERMS_SECTIONS}
          />
          <PolicyBlock
            title="นโยบายความเป็นส่วนตัว"
            subtitle="(Privacy Policy)"
            sections={PRIVACY_SECTIONS}
          />
        </div>

        <div className="shrink-0 border-t border-stone-100 px-6 py-4 space-y-2">
          {!scrolledToEnd && (
            <p className="text-xs text-amber-700 text-center">
              กรุณาเลื่อนอ่านจนถึงด้านล่างก่อนกดยอมรับเงื่อนไข
            </p>
          )}
          <Button
            type="button"
            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
            disabled={!scrolledToEnd}
            onClick={handleAcknowledge}
          >
            ยอมรับเงื่อนไข
          </Button>
        </div>
      </div>
    </div>,
    document.body
  )
}

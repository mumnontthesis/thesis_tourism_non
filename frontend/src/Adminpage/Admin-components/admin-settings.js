"use client"

import { Card, CardContent, CardHeader, CardTitle } from "./Aui/card" // แก้ Path
import { Input } from "./Aui/input" // แก้ Path
import { Button } from "./Aui/button" // แก้ Path
import { Switch } from "./Aui/switch" // แก้ Path
import { Label } from "./Aui/label" // แก้ Path

export function AdminSettings() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">ตั้งค่า</h1>
        <p className="text-sm text-muted-foreground">
          จัดการการตั้งค่าระบบ Admin Dashboard
        </p>
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-foreground">
            ข้อมูลเว็บไซต์
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label className="text-foreground">ชื่อเว็บไซต์</Label>
            <Input defaultValue="TripAdmin" />
          </div>
          <div className="flex flex-col gap-2">
            <Label className="text-foreground">อีเมลติดต่อ</Label>
            <Input defaultValue="admin@tripadmin.com" />
          </div>
          <Button className="w-fit">บันทึก</Button>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-foreground">
            การแจ้งเตือน
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">
                แจ้งเตือนเมื่อมีสถานที่ใหม่
              </p>
              <p className="text-xs text-muted-foreground">
                รับอีเมลเมื่อมีสถานที่ถูกเพิ่ม
              </p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">
                แจ้งเตือนเมื่อแผนถูกเผยแพร่
              </p>
              <p className="text-xs text-muted-foreground">
                รับอีเมลเมื่อแผนการเดินทางถูกเผยแพร่
              </p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">
                สรุปรายสัปดาห์
              </p>
              <p className="text-xs text-muted-foreground">
                รับสรุปข้อมูลทุกสัปดาห์ทางอีเมล
              </p>
            </div>
            <Switch />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
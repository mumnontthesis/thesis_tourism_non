# Tourism Nonthaburi — Thesis Project

ระบบแนะนำการท่องเที่ยวจังหวัดนนทบุรี (React + Express + MySQL)

## โครงสร้าง

| โฟลเดอร์ | คำอธิบาย |
|---|---|
| `frontend/` | React (Create React App) — หน้าเว็บผู้ใช้ + Admin |
| `backend/` | Express API + MySQL |
| `backend/sql/` | SQL migration scripts |

## รันในเครื่อง (Development)

### 1. Database
- ติดตั้ง XAMPP / MySQL
- สร้าง database ชื่อ `tourism_nonthaburi` แล้ว import ข้อมูล

### 2. Backend
```bash
cd backend
npm install
node server.js
```
API รันที่ `http://localhost:5000`

### 3. Frontend
```bash
cd frontend
npm install
npm start
```
เว็บรันที่ `http://localhost:3000`

## Deploy (GitHub → Cloud)

Repo: [mumnontthesis/thesis_tourism_non](https://github.com/mumnontthesis/thesis_tourism_non)

| ขั้น | บริการ | สิ่งที่ deploy |
|---|---|---|
| 1 | GitHub | โค้ดทั้งโปรเจค |
| 2 | Railway / Aiven | MySQL บน cloud (export จาก XAMPP) |
| 3 | Render | Backend (`backend/`) |
| 4 | Vercel | Frontend (`frontend/`) + QR Code |

### Environment Variables

**Backend (Render):** ดู `backend/.env.example`

**Frontend (Vercel):** ดู `frontend/.env.example`

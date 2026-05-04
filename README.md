# ระบบบันทึกงานไร่อ้อย (Farm Management App)

ระบบจัดการข้อมูลฟาร์มอ้อยสำหรับผู้จัดการหลายคน — บันทึกงานพนักงาน, รถขนอ้อย, งานเหมา, และต้นทุนต่อแปลง ข้อมูลซิงก์แบบ real-time ข้ามทุกอุปกรณ์ผ่าน Firebase

## คุณสมบัติหลัก

- 📋 **บันทึกงานพนักงาน** — ทีละคน, หลายคนพร้อมกัน, หรือผ่าน Quick Log
- 🚛 **บันทึกรถขนอ้อย** — น้ำหนัก, คนขับ, รายงานรายเดือน
- 👷 **บันทึกงานเหมา** — ผู้รับเหมา, แปลง, ค่าจ้าง
- 📊 **แดชบอร์ด** — รายวัน, รายเดือน, สรุปค่าแรงตามงาน (ครึ่งวัน = 50%)
- 🌾 **ติดตามแปลง** — กิจกรรมพนักงาน + งานเหมา, ต้นทุน/ไร่, ฤดูปัจจุบัน + ประวัติ
- 🌴 **ทำเครื่องหมายวันหยุด** — ไม่นับเป็นวันขาด
- 🔄 **Real-time sync** — ผู้จัดการหลายคนบันทึกพร้อมกันได้ ข้อมูลอัพเดตทุกอุปกรณ์ ~1 วินาที
- 💾 **สำรอง/กู้คืนข้อมูล** — ดาวน์โหลด JSON สำรองได้ทุกเมื่อ
- 🖨️ **พิมพ์ / Copy รายงาน** — สำหรับส่งให้พนักงานหรือเก็บเป็นเอกสาร

## Quick Start (Demo Mode)

ทดสอบทันทีโดยไม่ต้องตั้งค่าอะไร:

1. ดาวน์โหลด/clone โปรเจกต์
2. เปิดไฟล์ `index.html` ในเบราว์เซอร์ — ทำงานแบบ offline ได้เลย
3. กดปุ่ม **"▶ ทดสอบระบบ (ไม่ต้อง Login)"**
4. เริ่มใช้งานได้เลย — ในโหมดทดสอบข้อมูลเก็บใน browser localStorage ไม่ซิงก์ขึ้น Firebase

## การติดตั้งจริง (Production)

ดูรายละเอียดทั้งหมดในไฟล์ [`คู่มือติดตั้ง.md`](./คู่มือติดตั้ง.md) — มีขั้นตอนภาษาไทยครบทุกขั้นตอน

โดยสรุปต้องทำ 4 อย่าง:
1. **Firebase Project** — สร้าง Realtime Database + เปิด Anonymous Auth ที่ [console.firebase.google.com](https://console.firebase.google.com)
2. **LINE Login Channel** — สร้างที่ [developers.line.biz](https://developers.line.biz) เพื่อให้ login จริงได้
3. **Google Apps Script** — Deploy สำหรับ LINE auth (ไม่ใช้เก็บ log แล้ว)
4. **GitHub Pages** — Host ไฟล์ฟรี

## โครงสร้างโปรเจกต์

```
.
├── index.html              # HTML skeleton — screens, modals, forms + Firebase SDK (CDN)
├── styles.css              # CSS ทั้งหมด — theme tokens, layouts, components
├── google-apps-script.js   # โค้ดสำหรับ Google Apps Script (LINE auth เท่านั้น)
├── คู่มือติดตั้ง.md         # คู่มือติดตั้งภาษาไทย
└── js/
    ├── core/
    │   ├── config.js       # CFG (LINE, Firebase keys), MD, caches, runtime state
    │   ├── utils.js        # Date helpers, escape HTML, Thai month/day constants
    │   ├── storage.js      # load/save — dual-write: localStorage + Firebase RTDB
    │   ├── api.js          # LINE login/logout, sendAPI (calls onOk + markSyncStatus)
    │   └── app.js          # Boot: initFirebase, attachListeners, window.onload
    ├── ui/
    │   └── ui.js           # go (nav + currentScreen), modals, toasts, combo box
    └── features/
        ├── master.js       # CRUD: employees, trucks, locations, tasks, contractors, fertilizers
        ├── logs.js         # Employee/outsource/bulk log entry + edit/delete
        ├── dashboard.js    # Today view, monthly view, day detail sheet
        ├── details.js      # Detail screens: employee, truck, location
        └── backup.js       # JSON export/import
```

## หลักการออกแบบ

- **Vanilla JavaScript** — ไม่มี framework ทำให้ load เร็ว, deploy ง่าย, ดูแลรักษาง่าย
- **Single-page app** — ทุก screen อยู่ใน DOM เดียวกัน, สลับด้วย CSS class
- **Firebase-first** — Firebase RTDB คือ source of truth, localStorage คือ offline cache
- **Real-time multi-device** — Firebase listeners อัพเดตทุก device อัตโนมัติ ~1 วินาที
- **Offline support** — Firebase SDK cache ข้อมูลในเครื่อง, ซิงก์อัตโนมัติเมื่อมีเน็ต
- **Mobile-first** — ออกแบบสำหรับ iPhone/Android ผู้สูงอายุ — ปุ่มใหญ่, อ่านง่าย, ขั้นตอนน้อย

## License

ใช้งานได้อย่างอิสระสำหรับงานส่วนตัวและธุรกิจขนาดเล็ก — ไม่มีการรับประกัน

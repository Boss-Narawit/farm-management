# ระบบบันทึกงานไร่อ้อย (Farm Management App)

ระบบจัดการข้อมูลฟาร์มอ้อยสำหรับผู้จัดการ — บันทึกงานพนักงาน, รถขนอ้อย, งานเหมา, และต้นทุนต่อแปลง

## คุณสมบัติหลัก

- 📋 **บันทึกงานพนักงาน** — ทีละคน, หลายคนพร้อมกัน, หรือผ่าน Quick Log
- 🚛 **บันทึกรถขนอ้อย** — น้ำหนัก, คนขับ, รายงานรายเดือน
- 👷 **บันทึกงานเหมา** — ผู้รับเหมา, แปลง, ค่าจ้าง
- 📊 **แดชบอร์ด** — รายวัน, รายเดือน, สรุปค่าแรงตามงาน (ครึ่งวัน = 50%)
- 🌾 **ติดตามแปลง** — กิจกรรมพนักงาน + งานเหมา, ต้นทุน/ไร่, ฤดูปัจจุบัน + ประวัติ
- 🌴 **ทำเครื่องหมายวันหยุด** — ไม่นับเป็นวันขาด
- 💾 **สำรอง/กู้คืนข้อมูล** — ดาวน์โหลด JSON สำรองได้ทุกเมื่อ
- 🖨️ **พิมพ์ / Copy รายงาน** — สำหรับส่งให้พนักงานหรือเก็บเป็นเอกสาร

## Quick Start (Demo Mode)

ทดสอบทันทีโดยไม่ต้องตั้งค่าอะไร:

1. ดาวน์โหลด/clone โปรเจกต์
2. เปิดไฟล์ `index.html` ในเบราว์เซอร์ — ทำงานแบบ offline ได้เลย
3. กดปุ่ม **"▶ ทดสอบระบบ (ไม่ต้อง Login)"**
4. เริ่มใช้งานได้เลย — ข้อมูลถูกเก็บใน browser localStorage

> **หมายเหตุ:** ในโหมดทดสอบ ข้อมูลทั้งหมดเก็บในเครื่องเท่านั้น ใช้ปุ่ม "ดาวน์โหลดข้อมูลสำรอง" เพื่อ backup เป็นไฟล์ JSON ก่อนปิดเบราว์เซอร์/เคลียร์ข้อมูล

## การติดตั้งจริง (Production)

ดูรายละเอียดทั้งหมดในไฟล์ [`คู่มือติดตั้ง.md`](./คู่มือติดตั้ง.md) — มีขั้นตอนภาษาไทยครบทุกขั้นตอน

โดยสรุปต้องทำ 3 อย่าง:
1. **LINE Login Channel** — สร้างที่ [developers.line.biz](https://developers.line.biz) เพื่อให้ login จริงได้
2. **Google Apps Script** — Deploy เพื่อบันทึกข้อมูลขึ้น Google Sheets
3. **GitHub Pages** — Host ไฟล์ฟรี

## การ Host บน GitHub Pages

```bash
git clone <this-repo>
cd <repo>
# แก้ค่าใน js/config.js
git push
# แล้วไปที่ Settings → Pages → Deploy from main branch / root
```

URL จะเป็น `https://<username>.github.io/<repo>/`

## โครงสร้างโปรเจกต์

```
.
├── index.html          # โครงสร้าง HTML — screens, modals, forms
├── styles.css          # CSS ทั้งหมด — theme tokens, layouts, components
├── google-apps-script.js  # โค้ดสำหรับ Google Apps Script (deploy แยกต่างหาก)
├── คู่มือติดตั้ง.md     # คู่มือติดตั้งภาษาไทย
└── js/
    ├── config.js       # ตัวแปรกลาง — CFG, MD, caches, runtime state
    ├── utils.js        # Date helpers, escape HTML, MO/DOW constants
    ├── storage.js      # localStorage load/save
    ├── api.js          # sendAPI (Google Sheets), LINE login, sync status
    ├── ui.js           # Modals, toasts, combo box, navigation, undo
    ├── master.js       # CRUD: employees, trucks, locations, tasks, contractors
    ├── logs.js         # Log entries: employee/outsource/bulk + edit/delete
    ├── dashboard.js    # Today view, monthly view, day detail sheet
    ├── details.js      # Detail screens: employee, truck, location
    ├── backup.js       # JSON export/import
    └── app.js          # Boot — load data + restore login + initial render
```

## หลักการออกแบบ

- **Vanilla JavaScript** — ไม่มี framework ทำให้ load เร็ว, deploy ง่าย, ดูแลรักษาง่าย
- **Single-page app** — ทุก screen อยู่ใน DOM เดียวกัน, สลับด้วย CSS class
- **localStorage-first** — ใช้งานได้ offline, ส่งขึ้น Google Sheets เมื่อมีเน็ต
- **Mobile-first** — ออกแบบสำหรับ iPhone/Android ผู้สูงอายุ — ปุ่มใหญ่, อ่านง่าย, ขั้นตอนน้อย

## การพัฒนาเพิ่ม

ก่อนเพิ่ม feature ใหม่:

1. หาไฟล์ที่เกี่ยวข้อง (ดูจาก header comment ของแต่ละไฟล์)
2. เพิ่มฟังก์ชันในไฟล์นั้น — function declarations เป็น global โดยอัตโนมัติเพราะ classic script
3. ทดสอบใน browser โดยตรง (เปิด `index.html` แล้วกด demo mode)
4. ใช้ DevTools Console ตรวจสอบ — หากมี error คือมีฟังก์ชันที่ยังไม่ได้ define
5. **ทดสอบสำรอง/กู้คืน** ทุกครั้งที่เปลี่ยน schema — เพราะ users มีไฟล์ JSON เก่าอยู่

### Coding conventions

- Classic scripts (ไม่ใช่ ES modules) — `var`/`let`/`const` ที่ top-level สามารถเรียกข้ามไฟล์ได้
- ตั้งชื่อตัวแปรเป็นภาษาอังกฤษ ใช้ camelCase
- UI text ภาษาไทย
- ใช้ `escHtml()` กับ user-provided strings เสมอเมื่อแสดงผล

### การเพิ่ม screen ใหม่

1. เพิ่ม `<div id="screen-xxx" class="screen">...</div>` ใน `index.html`
2. เพิ่ม CSS ที่จำเป็นใน `styles.css`
3. เพิ่ม render function ในไฟล์ที่เหมาะสม
4. เรียก `go('screen-xxx')` เพื่อนำทาง

## License

ใช้งานได้อย่างอิสระสำหรับงานส่วนตัวและธุรกิจขนาดเล็ก — ไม่มีการรับประกัน

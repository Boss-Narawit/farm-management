// ============================================================
// Google Apps Script — วางโค้ดนี้ใน Google Apps Script
// ทำหน้าที่: รับข้อมูลจาก Web App และบันทึกลง Google Sheets
//            + แลก LINE auth code เป็น user profile
// ============================================================

// ===== CONFIG =====
const LINE_CLIENT_ID = 'YOUR_LINE_CLIENT_ID';       // จาก LINE Developers Console
const LINE_CLIENT_SECRET = 'YOUR_LINE_CLIENT_SECRET'; // จาก LINE Developers Console
const SHEET_ID = 'YOUR_GOOGLE_SHEET_ID';             // จาก URL ของ Google Sheet
// ==================

function doPost(e) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  try {
    const body = JSON.parse(e.postData.contents);
    let result;

    if (body.action === 'lineAuth') {
      result = handleLineAuth(body.code, body.redirectUri);
    } else if (body.action === 'addEmployee') {
      result = addEmployeeRow(body);
    } else if (body.action === 'addTruck') {
      result = addTruckRow(body);
    } else {
      result = { error: 'Unknown action: ' + body.action };
    }

    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch(err) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok', message: 'Farm App API is running' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ===== LINE AUTH =====
function handleLineAuth(code, redirectUri) {
  // แลก code เป็น access token
  const tokenRes = UrlFetchApp.fetch('https://api.line.me/oauth2/v2.1/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    payload: {
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: redirectUri,
      client_id: LINE_CLIENT_ID,
      client_secret: LINE_CLIENT_SECRET
    },
    muteHttpExceptions: true
  });

  const tokenData = JSON.parse(tokenRes.getContentText());
  if (tokenData.error) throw new Error('LINE token error: ' + tokenData.error_description);

  // ดึงข้อมูล profile
  const profileRes = UrlFetchApp.fetch('https://api.line.me/v2/profile', {
    headers: { 'Authorization': 'Bearer ' + tokenData.access_token },
    muteHttpExceptions: true
  });

  const profile = JSON.parse(profileRes.getContentText());
  if (!profile.userId) throw new Error('ไม่สามารถดึงข้อมูล LINE profile ได้');

  return {
    userId: profile.userId,
    displayName: profile.displayName,
    pictureUrl: profile.pictureUrl || ''
  };
}

// ===== EMPLOYEE SHEET =====
function addEmployeeRow(data) {
  const ss = SpreadsheetApp.openById(SHEET_ID);

  // สร้าง sheet "พนักงาน" ถ้ายังไม่มี
  let sheet = ss.getSheetByName('พนักงาน');
  if (!sheet) {
    sheet = ss.insertSheet('พนักงาน');
    // สร้างหัวตาราง
    sheet.getRange(1, 1, 1, 7).setValues([[
      'วันที่', 'ชื่อพนักงาน', 'งานที่ทำ', 'ระยะเวลา', 'หมายเหตุ', 'บันทึกโดย', 'เวลาบันทึก'
    ]]);
    // จัดรูปแบบหัวตาราง
    const headerRange = sheet.getRange(1, 1, 1, 7);
    headerRange.setBackground('#1a8f5c');
    headerRange.setFontColor('#ffffff');
    headerRange.setFontWeight('bold');
    sheet.setFrozenRows(1);
    sheet.setColumnWidths(1, 7, 150);
  }

  // แปลงวันที่เป็น พ.ศ.
  const dateFormatted = formatThaiDate(data.date);

  sheet.appendRow([
    dateFormatted,
    data.name,
    data.task,
    data.duration,
    data.note || '',
    data.loggedBy,
    formatTimestamp(data.timestamp)
  ]);

  // จัด column width อัตโนมัติ
  sheet.autoResizeColumns(1, 7);

  return { success: true, sheet: 'พนักงาน' };
}

// ===== TRUCK SHEET =====
function addTruckRow(data) {
  const ss = SpreadsheetApp.openById(SHEET_ID);

  let sheet = ss.getSheetByName('รถขนอ้อย');
  if (!sheet) {
    sheet = ss.insertSheet('รถขนอ้อย');
    sheet.getRange(1, 1, 1, 7).setValues([[
      'วันที่', 'ทะเบียนรถ', 'น้ำหนัก (กก.)', 'ชื่อคนขับ', 'หมายเหตุ', 'บันทึกโดย', 'เวลาบันทึก'
    ]]);
    const headerRange = sheet.getRange(1, 1, 1, 7);
    headerRange.setBackground('#e67e22');
    headerRange.setFontColor('#ffffff');
    headerRange.setFontWeight('bold');
    sheet.setFrozenRows(1);
    sheet.setColumnWidths(1, 7, 150);
  }

  const dateFormatted = formatThaiDate(data.date);

  sheet.appendRow([
    dateFormatted,
    data.plate.toUpperCase(),
    Number(data.weight),
    data.driver || '',
    data.note || '',
    data.loggedBy,
    formatTimestamp(data.timestamp)
  ]);

  sheet.autoResizeColumns(1, 7);

  return { success: true, sheet: 'รถขนอ้อย' };
}

// ===== HELPERS =====
function formatThaiDate(isoDate) {
  // แปลง 2025-04-25 เป็น 25/04/2568
  const parts = isoDate.split('-');
  const day = parts[2];
  const month = parts[1];
  const buddhistYear = parseInt(parts[0]) + 543;
  return `${day}/${month}/${buddhistYear}`;
}

function formatTimestamp(isoString) {
  const d = new Date(isoString);
  // แปลงเป็นเวลาไทย (UTC+7)
  const bangkokTime = new Date(d.getTime() + 7 * 60 * 60 * 1000);
  return bangkokTime.toISOString().replace('T', ' ').substring(0, 19);
}

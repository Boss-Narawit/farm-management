// ============================================================
// Google Apps Script — วางโค้ดนี้ใน Google Apps Script editor
// ทำหน้าที่: แลก LINE auth code เป็น user profile เท่านั้น
// (ข้อมูล log ทั้งหมดเก็บใน Firebase Realtime Database แล้ว)
//
// ขั้นตอน:
//   1. แก้ไข LINE_CLIENT_ID และ LINE_CLIENT_SECRET
//   2. Deploy > New deployment > Web app
//      Execute as: Me | Who has access: Anyone
//   3. Copy URL ไปใส่ CFG.APPS_SCRIPT_URL ใน js/core/config.js
// ============================================================

// ===== CONFIG =====
const LINE_CLIENT_ID     = 'YOUR_LINE_CLIENT_ID';
const LINE_CLIENT_SECRET = 'YOUR_LINE_CLIENT_SECRET';
// ==================

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    if (body.action === 'lineAuth') {
      return json(handleLineAuth(body.code, body.redirectUri));
    }
    return json({ error: 'Unknown action: ' + body.action });
  } catch(err) {
    return json({ error: err.message });
  }
}

function doGet() {
  return json({ status: 'ok', message: 'Farm App LINE Auth is running' });
}

function handleLineAuth(code, redirectUri) {
  const tokenRes = UrlFetchApp.fetch('https://api.line.me/oauth2/v2.1/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    payload: { grant_type: 'authorization_code', code, redirect_uri: redirectUri, client_id: LINE_CLIENT_ID, client_secret: LINE_CLIENT_SECRET },
    muteHttpExceptions: true
  });
  const tok = JSON.parse(tokenRes.getContentText());
  if (tok.error) throw new Error('LINE token error: ' + tok.error_description);

  const profRes = UrlFetchApp.fetch('https://api.line.me/v2/profile', {
    headers: { 'Authorization': 'Bearer ' + tok.access_token },
    muteHttpExceptions: true
  });
  const prof = JSON.parse(profRes.getContentText());
  if (!prof.userId) throw new Error('ไม่สามารถดึงข้อมูล LINE profile ได้');
  return { userId: prof.userId, displayName: prof.displayName, pictureUrl: prof.pictureUrl || '' };
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

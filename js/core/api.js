/* ============================================================
 * api.js — Google Apps Script + LINE login + sync status
 *
 * Contents: sendAPI, loginLine, loginDemo, afterLogin, markSyncStatus, syncDot
 * ============================================================ */

// ===== API =====
// Data is persisted via saveLogs()/saveMD() which write to Firebase directly.
// sendAPI now just confirms success and marks sync status.
async function sendAPI(payload,msg,onOk){
  onOk();
  showOk('บันทึกสำเร็จ!',msg);
  markSyncStatus(payload,db?'synced':'local');
}


// ===== LINE AUTH =====
function loginDemo(){
  user={displayName:'ผู้จัดการ (ทดสอบ)',userId:'demo',pictureUrl:''};
  afterLogin();
}
function loginLine(){
  if(CFG.LINE_CLIENT_ID==='YOUR_LINE_CLIENT_ID'){user={displayName:'ผู้จัดการ (ทดสอบ)',userId:'demo',pictureUrl:''};afterLogin();return;}
  const st=Math.random().toString(36).slice(2);sessionStorage.setItem('ls',st);
  window.location.href='https://access.line.me/oauth2/v2.1/authorize?'+new URLSearchParams({response_type:'code',client_id:CFG.LINE_CLIENT_ID,redirect_uri:CFG.REDIRECT_URI,state:st,scope:'profile openid'});
}
async function checkLine(){
  const sv=sessionStorage.getItem('fu');if(sv){try{user=JSON.parse(sv);afterLogin();return;}catch(e){sessionStorage.removeItem('fu');}}
  const p=new URLSearchParams(window.location.search),code=p.get('code'),state=p.get('state');if(!code)return;
  if(state!==sessionStorage.getItem('ls')){alert('เกิดข้อผิดพลาด');return;}
  showLoad('กำลังเข้าสู่ระบบ...');
  try{const r=await fetch(CFG.APPS_SCRIPT_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'lineAuth',code,redirectUri:CFG.REDIRECT_URI})});const d=await r.json();if(d.error)throw new Error(d.error);if(!CFG.ALLOWED_USER_IDS.includes(d.userId)){hideLoad();alert('คุณไม่ได้รับอนุญาต');return;}user=d;sessionStorage.setItem('fu',JSON.stringify(d));window.history.replaceState({},'',window.location.pathname);afterLogin();}
  catch(e){hideLoad();alert('เข้าสู่ระบบไม่สำเร็จ: '+e.message);}
}
function afterLogin(){hideLoad();const n=user.displayName||'ผู้จัดการ';document.getElementById('home-name').textContent=n;const w=document.getElementById('av-wrap');w.innerHTML=user.pictureUrl?`<img src="${user.pictureUrl}" class="av">`:`<div class="av-ph">${n[0]}</div>`;attachListeners();go('screen-home');}
function logout(){if(!confirm('ออกจากระบบ?'))return;sessionStorage.removeItem('fu');user=null;go('screen-login');}




// ===== SYNC STATUS =====
function markSyncStatus(payload,status){
  // Match the exact record by id — never stamp all-pending on a date
  if(!payload||!payload.date)return;
  const date=payload.date;
  if(payload.action==='addEmployee'||payload.action==='editEmployee'||payload.action==='deleteEmployee'){
    const log=(logsCache[date]||[]).find(l=>l.id===payload.id||l.id===payload.logId);
    if(log)log.syncStatus=status;
  } else if(payload.action==='addEmployeeBulk'&&payload.ids){
    (logsCache[date]||[]).forEach(l=>{if(payload.ids.includes(l.id))l.syncStatus=status;});
  } else if(payload.action==='addOutsource'||payload.action==='editOutsource'||payload.action==='deleteOutsource'){
    const log=(outsourceLogsCache[date]||[]).find(o=>o.id===payload.id||o.id===payload.osId);
    if(log)log.syncStatus=status;
  } else if(payload.action==='addTruck'){
    const log=(truckLogsCache[date]||[]).find(t=>t.id===payload.id);
    if(log)log.syncStatus=status;
  }
  saveLogs();
}


function syncDot(status){
  // Returns small HTML icon for a given sync status
  if(status==='synced')return '<span class="sync-dot synced" title="ซิงก์แล้ว"></span>';
  if(status==='pending')return '<span class="sync-dot pending" title="กำลังซิงก์"></span>';
  if(status==='failed')return '<span class="sync-dot failed" title="ซิงก์ไม่สำเร็จ"></span>';
  if(status==='local')return '<span class="sync-dot local" title="บันทึกในเครื่อง (ยังไม่ได้ตั้งค่าเชื่อม Sheets)"></span>';
  return '';
}

/* ============================================================
 * app.js — App boot — DOM ready, Firebase init, login resume
 *
 * Contents: initFirebase, attachListeners, window.onload
 * ============================================================ */

let currentScreen = ''; // tracked by go() in ui.js; used by listeners to re-render active screen

// ===== FIREBASE =====
function initFirebase(){
  if(!CFG.FIREBASE||CFG.FIREBASE.apiKey==='YOUR_FIREBASE_API_KEY')return;
  if(typeof firebase==='undefined')return;
  if(!firebase.apps.length)firebase.initializeApp(CFG.FIREBASE);
  db=firebase.database();
  firebase.auth().signInAnonymously().catch(()=>{});
}

// Called after login — subscribes to real-time changes from other devices
function attachListeners(){
  if(!db)return;
  db.ref('fm_md').on('value',snap=>{
    const v=snap.val();if(!v)return;
    MD=JSON.parse(v);localStorage.setItem('fm_md',v);
    if(currentScreen==='screen-master')renderAll();
  });
  db.ref('fm_logs').on('value',snap=>{
    const v=snap.val();if(!v)return;
    logsCache=JSON.parse(v);localStorage.setItem('fm_logs',v);
    if(currentScreen==='screen-dash')renderDash();
  });
  db.ref('fm_tlogs').on('value',snap=>{
    const v=snap.val();if(!v)return;
    truckLogsCache=JSON.parse(v);localStorage.setItem('fm_tlogs',v);
  });
  db.ref('fm_oslogs').on('value',snap=>{
    const v=snap.val();if(!v)return;
    outsourceLogsCache=JSON.parse(v);localStorage.setItem('fm_oslogs',v);
    if(currentScreen==='screen-dash')renderDash();
  });
  db.ref('fm_holidays').on('value',snap=>{
    const v=snap.val();if(!v)return;
    holidays=JSON.parse(v);localStorage.setItem('fm_holidays',v);
    if(currentScreen==='screen-dash')renderDash();
  });
}

// ===== INIT =====
window.onafterprint=()=>{
  document.body.classList.remove('printing');
  document.getElementById('print-area').innerHTML='';
};
window.onload=()=>{
  loadMD(); loadLogs();
  initFirebase();
  setTodayForms();
  checkLine();
  document.addEventListener('click',e=>{if(!e.target.closest('.cw'))closeAllCombos();});
};

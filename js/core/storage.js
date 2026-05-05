/* ============================================================
 * storage.js — Persistence: localStorage (primary) + Firebase (sync)
 *
 * Contents: loadMD, saveMD, loadLogs, saveLogs
 * Firebase writes are fire-and-forget — callers stay synchronous.
 * Real-time listeners (in app.js) handle inbound changes from other devices.
 * ============================================================ */

let db = null; // set by initFirebase() in app.js

// ===== LOAD — reads localStorage on boot (fast, works offline) =====
function loadMD(){const s=localStorage.getItem('fm_md');if(s)MD=JSON.parse(s);}
function loadLogs(){const s=localStorage.getItem('fm_logs');if(s)logsCache=JSON.parse(s);const t=localStorage.getItem('fm_tlogs');if(t)truckLogsCache=JSON.parse(t);const o=localStorage.getItem('fm_oslogs');if(o)outsourceLogsCache=JSON.parse(o);const h=localStorage.getItem('fm_holidays');if(h)holidays=JSON.parse(h);const fz=localStorage.getItem('fm_fertlogs');if(fz)fertLogCache=JSON.parse(fz);}

// ===== SAVE — writes localStorage + Firebase (if configured) =====
function saveMD(){
  const s=JSON.stringify(MD);
  localStorage.setItem('fm_md',s);
  if(db)db.ref('fm_md').set(s);
}
function saveLogs(){
  const s=JSON.stringify(logsCache);
  const t=JSON.stringify(truckLogsCache);
  const o=JSON.stringify(outsourceLogsCache);
  const h=JSON.stringify(holidays);
  localStorage.setItem('fm_logs',s);
  localStorage.setItem('fm_tlogs',t);
  localStorage.setItem('fm_oslogs',o);
  localStorage.setItem('fm_holidays',h);
  const fz=JSON.stringify(fertLogCache);
  localStorage.setItem('fm_fertlogs',fz);
  if(db){db.ref('fm_logs').set(s);db.ref('fm_tlogs').set(t);db.ref('fm_oslogs').set(o);db.ref('fm_holidays').set(h);db.ref('fm_fertlogs').set(fz);}
}

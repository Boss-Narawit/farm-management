/* ============================================================
 * storage.js — LocalStorage persistence
 *
 * Contents: loadMD, saveMD, loadLogs, saveLogs
 * ============================================================ */

// ===== STORAGE =====
function loadMD(){const s=localStorage.getItem('fm_md');if(s)MD=JSON.parse(s);}
function saveMD(){localStorage.setItem('fm_md',JSON.stringify(MD));}
function loadLogs(){const s=localStorage.getItem('fm_logs');if(s)logsCache=JSON.parse(s);const t=localStorage.getItem('fm_tlogs');if(t)truckLogsCache=JSON.parse(t);const o=localStorage.getItem('fm_oslogs');if(o)outsourceLogsCache=JSON.parse(o);const h=localStorage.getItem('fm_holidays');if(h)holidays=JSON.parse(h);}
function saveLogs(){localStorage.setItem('fm_logs',JSON.stringify(logsCache));localStorage.setItem('fm_tlogs',JSON.stringify(truckLogsCache));localStorage.setItem('fm_oslogs',JSON.stringify(outsourceLogsCache));localStorage.setItem('fm_holidays',JSON.stringify(holidays));}

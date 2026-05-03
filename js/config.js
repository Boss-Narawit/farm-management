/* ============================================================
 * config.js — Configuration, master data, and app state
 *
 * Contents: CFG, MD object, log caches, holidays, runtime state
 * ============================================================ */

// ============================================================
// CONFIG — แก้ไขค่าเหล่านี้ตามขั้นตอนการติดตั้ง
// ============================================================
const CFG={
  LINE_CLIENT_ID:'YOUR_LINE_CLIENT_ID',
  REDIRECT_URI:window.location.origin+window.location.pathname,
  APPS_SCRIPT_URL:'YOUR_GOOGLE_APPS_SCRIPT_URL',
  ALLOWED_USER_IDS:['Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx']
};
// ============================================================

let user=null, formDur='เต็มวัน', qlDur='เต็มวัน';
let editEId=null, editTId=null;
let dashView='today';
let dashDay=new Date(); dashDay.setHours(0,0,0,0);
let dashMonth={y:new Date().getFullYear(), m:new Date().getMonth()};
let qlEmpName='', qlDateIso='';

let MD={employees:[],trucks:[],locations:[],tasks:[],contractors:[],fertilizers:[]};
let logsCache={}; // employee logs
let truckLogsCache={}; // truck trips
let outsourceLogsCache={}; // outsource entries
let holidays={}; // {'YYYY-MM-DD':'reason'}

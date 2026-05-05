/**
 * Integration test — runs all JS files in Node via vm.runInContext.
 * Usage: node tests/integration.js   (from repo root)
 *
 * Covers: core data model, wage logic, F2/F3/F6/F8/F9 features.
 * Note: inline vm snippets use var (not const/let) to avoid redeclaration
 * errors across multiple runInContext calls sharing the same vm context.
 */
const vm = require('vm');
const fs = require('fs');

// ── Minimal DOM/browser shim ──────────────────────────────────────────────────
const _mockEl = () => ({
  classList:{add:()=>{},remove:()=>{},toggle:()=>{},contains:()=>false},
  value:'', textContent:'', innerHTML:'', style:{},
  scrollIntoView:()=>{}, focus:()=>{}, getAttribute:()=>'',
  appendChild:()=>{}, removeChild:()=>{}, select:()=>{},
  dataset:{}, remove:()=>{}, href:'', download:'', click:()=>{}
});
const ctx = {
  window:{
    location:{origin:'http://test',pathname:'/',reload:()=>{},search:''},
    scrollTo:()=>{}, history:{replaceState:()=>{}}, print:()=>{},
    addEventListener:()=>{}
  },
  document:{
    getElementById:()=>_mockEl(),
    querySelector:()=>({..._mockEl(),id:'s'}),
    querySelectorAll:()=>[],
    addEventListener:()=>{},
    createElement:()=>_mockEl(),
    body:{appendChild:()=>{},removeChild:()=>{}},
    execCommand:()=>true
  },
  navigator:{clipboard:{writeText:async()=>{}}},
  localStorage:{getItem:()=>null,setItem:()=>{},removeItem:()=>{}},
  sessionStorage:{getItem:()=>null,setItem:()=>{},removeItem:()=>{}},
  fetch:async()=>({json:async()=>({})}),
  alert:()=>{}, confirm:()=>true, prompt:()=>'',
  URLSearchParams:class{get(){return null;}},
  URL:{createObjectURL:()=>'blob:t',revokeObjectURL:()=>{}},
  Blob:class{constructor(parts,opts){this._parts=parts;}},
  File:class{constructor(a,b,c){}},
  FileReader:class{readAsText(){this.onload&&this.onload({target:{result:'{}'}});}},
  firebase:undefined,
  console
};
vm.createContext(ctx);

const order = [
  'core/config.js','core/utils.js','core/storage.js','core/api.js',
  'ui/ui.js',
  'features/master.js','features/logs.js','features/dashboard.js',
  'features/details.js','features/backup.js',
  'core/app.js'
];
for (const f of order) {
  vm.runInContext(fs.readFileSync(`js/${f}`,'utf8'), ctx, {filename:f});
}

// ── Helper ────────────────────────────────────────────────────────────────────
let passed = 0, failed = 0;
function check(label, fn) {
  try { fn(); console.log('  ✓', label); passed++; }
  catch(e) { console.error('  ✗', label, '—', e.message||e); failed++; }
}
function run(code) { vm.runInContext(code, ctx); }

// ── CORE: wage logic ──────────────────────────────────────────────────────────
console.log('\nCore wage logic');
run(`MD.tasks=[{name:'ตัดอ้อย',dailyRate:400},{name:'รดน้ำ',dailyRate:300}];`);
check('full-day wage correct', ()=>run(`
  if(logWage({task:'ตัดอ้อย',duration:'เต็มวัน'})!==400)throw new Error('expected 400');
`));
check('half-day wage = 50%', ()=>run(`
  if(logWage({task:'ตัดอ้อย',duration:'ครึ่งวัน'})!==200)throw new Error('expected 200');
`));
check('unknown task returns 0', ()=>run(`
  if(logWage({task:'ไม่มีงานนี้',duration:'เต็มวัน'})!==0)throw new Error('expected 0');
`));
check('missing task returns 0', ()=>run(`
  if(logWage({})!==0)throw new Error('expected 0');
`));

// ── CORE: date utilities ──────────────────────────────────────────────────────
console.log('\nCore date utilities');
check('isoDate returns YYYY-MM-DD', ()=>run(`
  var r=isoDate(new Date(2026,0,5));
  if(r!=='2026-01-05')throw new Error('got '+r);
`));
check('thaiDate(Date) adds 543 to year', ()=>run(`
  var r=thaiDate(new Date(2026,0,5));
  if(!r.includes('2569'))throw new Error('year wrong: '+r);
`));
check('thaiDate(ISO string) also works', ()=>run(`
  var r=thaiDate('2026-01-05');
  if(!r.includes('2569'))throw new Error('string overload failed: '+r);
`));
check('parseISO round-trips with isoDate', ()=>run(`
  var iso='2026-06-15';
  if(isoDate(parseISO(iso))!==iso)throw new Error('round-trip failed');
`));

// ── F6: fertLogCache exists and storage works ─────────────────────────────────
console.log('\nF6 — storage / fertLogCache');
check('fertLogCache global exists', ()=>run(`
  if(typeof fertLogCache==='undefined')throw new Error('missing');
`));
check('saveLogs writes fm_fertlogs to localStorage', ()=>{
  let wrote = false;
  const orig = ctx.localStorage.setItem;
  ctx.localStorage.setItem = (k)=>{ if(k==='fm_fertlogs')wrote=true; };
  run(`fertLogCache={'2026-01-01':[{id:'fz1',fertilizer:'ยูเรีย'}]};saveLogs();`);
  ctx.localStorage.setItem = orig;
  if(!wrote) throw new Error('fm_fertlogs not written to localStorage');
});
check('loadLogs reads fm_fertlogs from localStorage', ()=>{
  const orig = ctx.localStorage.getItem;
  ctx.localStorage.getItem = (k)=>k==='fm_fertlogs'?'{"2026-03-01":[{"id":"fz9","fertilizer":"16-8-8"}]}':null;
  run(`fertLogCache={};loadLogs();`);
  ctx.localStorage.getItem = orig;
  run(`if(!fertLogCache['2026-03-01'])throw new Error('not loaded from localStorage');`);
});

// ── F6: function existence ────────────────────────────────────────────────────
console.log('\nF6 — fertilizer log functions');
for (const fn of ['submitFertLog','initFertLogForm','editFertLog','saveFertLog','deleteFertLog','renderFertLogList','selFertCombo']) {
  check(fn+' defined', ()=>run(`if(typeof ${fn}!=='function')throw new Error('missing');`));
}

// ── F6: buildLocActivity includes fertilizer entries ─────────────────────────
console.log('\nF6 — buildLocActivity');
run(`
  logsCache={};outsourceLogsCache={};
  fertLogCache={'2026-01-15':[{id:'fz1',location:'แปลง A',fertilizer:'ยูเรีย',quantity:50,unit:'กก.',loggedBy:'ผู้จัดการ',timestamp:'2026-01-15T10:00:00.000Z'}]};
`);
check('fertilizer entries appear in activity list', ()=>run(`
  var acts=buildLocActivity('แปลง A',2026,0);
  if(!acts.some(function(a){return a.type==='fertilizer';}))throw new Error('no fertilizer entry');
`));
check('fertilizer task includes name and quantity', ()=>run(`
  var acts2=buildLocActivity('แปลง A',2026,0);
  var fe=acts2.find(function(a){return a.type==='fertilizer';});
  if(!fe||!fe.task.includes('ยูเรีย'))throw new Error('fertilizer name missing: '+(fe&&fe.task));
`));
check('fertilizer entries have cost=0 and dayEq=0', ()=>run(`
  var acts3=buildLocActivity('แปลง A',2026,0);
  var fe2=acts3.find(function(a){return a.type==='fertilizer';});
  if(!fe2||fe2.cost!==0)throw new Error('cost should be 0');
  if(fe2.dayEq!==0)throw new Error('dayEq should be 0');
`));

// ── F6: locLastActivity includes fertLogCache ─────────────────────────────────
console.log('\nF6 — locLastActivity');
check('locLastActivity picks up fertLogCache date', ()=>run(`
  logsCache={};outsourceLogsCache={};
  fertLogCache={'2026-03-10':[{location:'แปลง X',fertilizer:'ยูเรีย'}]};
  var lat=locLastActivity({name:'แปลง X'});
  if(lat!=='2026-03-10')throw new Error('expected 2026-03-10, got '+lat);
`));
check('locLastActivity returns null when nothing anywhere', ()=>run(`
  logsCache={};outsourceLogsCache={};fertLogCache={};
  var lat2=locLastActivity({name:'แปลง ไม่มี'});
  if(lat2!==null)throw new Error('expected null, got '+lat2);
`));

// ── F6: backup includes fertLogs ──────────────────────────────────────────────
console.log('\nF6 — backup / restore');
check('_buildBackupData includes fertLogs key', ()=>run(`
  fertLogCache={'2026-01-01':[{id:'fz1',fertilizer:'ยูเรีย'}]};
  var b=_buildBackupData();
  if(!b.fertLogs)throw new Error('fertLogs missing from backup');
  if(!b.fertLogs['2026-01-01'])throw new Error('fertLogs data not in backup');
`));
check('importBackup restores fertLogCache', ()=>{
  const mockData = JSON.stringify({
    masterData:{employees:[],trucks:[],locations:[],tasks:[],contractors:[],fertilizers:[]},
    logs:{}, truckLogs:{}, outsourceLogs:{}, holidays:{},
    fertLogs:{'2026-05-01':[{id:'fzR',fertilizer:'16-8-8'}]}
  });
  const origFR = ctx.FileReader;
  ctx.FileReader = class { readAsText(){ this.onload&&this.onload({target:{result:mockData}}); } };
  run(`fertLogCache={};importBackup({target:{files:[{}],value:''}});`);
  ctx.FileReader = origFR;
  run(`if(!fertLogCache['2026-05-01'])throw new Error('fertLogCache not restored by importBackup');`);
});

// ── F3: CSV payroll export ────────────────────────────────────────────────────
console.log('\nF3 — CSV payroll export');
check('exportPayrollCSV defined', ()=>run(`if(typeof exportPayrollCSV!=='function')throw new Error('missing');`));
check('exportPayrollCSV runs without error when data present', ()=>run(`
  MD.employees=[{id:'w1',first:'สมชาย',status:'active'}];
  MD.tasks=[{name:'ตัดอ้อย',dailyRate:400}];
  logsCache={};
  logsCache['2026-01-10']=[{id:'ld1',name:'สมชาย',task:'ตัดอ้อย',duration:'เต็มวัน',loggedBy:'admin'}];
  logsCache['2026-01-11']=[{id:'ld2',name:'สมชาย',task:'ตัดอ้อย',duration:'ครึ่งวัน',loggedBy:'admin'}];
  exportPayrollCSV(2026,0);
`));
check('exportPayrollCSV alerts when month is empty', ()=>{
  let alerted = false;
  const orig = ctx.alert;
  ctx.alert = ()=>{ alerted=true; };
  run(`
    MD.employees=[{id:'w1',first:'สมชาย',status:'active'}];
    logsCache={};
    exportPayrollCSV(2025,0);
  `);
  ctx.alert = orig;
  if(!alerted) throw new Error('should alert on empty month');
});

// ── F9: crew leader grouping ──────────────────────────────────────────────────
console.log('\nF9 — crew leader grouping');
check('toggleGroupSelect defined', ()=>run(`if(typeof toggleGroupSelect!=='function')throw new Error('missing');`));
run(`
  MD.employees=[
    {id:'g1',first:'สมชาย',status:'active',group:'กลุ่ม ก'},
    {id:'g2',first:'สมหญิง',status:'active',group:'กลุ่ม ก'},
    {id:'g3',first:'อนุชา',status:'active',group:'กลุ่ม ข'},
    {id:'g4',first:'นิ่ม',status:'active'}
  ];
  bulkSelected=new Set();
`);
check('toggleGroupSelect selects all in group', ()=>run(`
  toggleGroupSelect('กลุ่ม ก');
  if(!bulkSelected.has('g1'))throw new Error('g1 not selected');
  if(!bulkSelected.has('g2'))throw new Error('g2 not selected');
  if(bulkSelected.has('g3'))throw new Error('g3 (wrong group) was selected');
  if(bulkSelected.has('g4'))throw new Error('g4 (ungrouped) was selected');
`));
check('toggleGroupSelect deselects when all already selected', ()=>run(`
  toggleGroupSelect('กลุ่ม ก');
  if(bulkSelected.has('g1'))throw new Error('g1 should be deselected');
  if(bulkSelected.has('g2'))throw new Error('g2 should be deselected');
`));
check('renderBulkGrid runs without error', ()=>run(`renderBulkGrid();`));

// ── F2: copy yesterday's logs ─────────────────────────────────────────────────
console.log('\nF2 — copy yesterday logs');
check('loadYesterdayLogs defined', ()=>run(`if(typeof loadYesterdayLogs!=='function')throw new Error('missing');`));
run(`
  var _today=isoDate(new Date());
  var _yesterday=isoDate(new Date(new Date(_today+'T00:00:00').getTime()-86400000));
  MD.employees=[
    {id:'e1',first:'สมชาย',last:'ใจดี',status:'active'},
    {id:'e2',first:'สมหญิง',last:'ดีใจ',status:'active'}
  ];
  logsCache={};
  logsCache[_yesterday]=[{id:'l1',name:'สมชาย ใจดี',task:'ตัดอ้อย',location:'แปลง A',duration:'เต็มวัน'}];
  bulkSelected=new Set();
`);
check('loadYesterdayLogs selects yesterday attendees', ()=>run(`
  loadYesterdayLogs();
  if(!bulkSelected.has('e1'))throw new Error('e1 should be selected (was in yesterday logs)');
  if(bulkSelected.has('e2'))throw new Error('e2 should not be selected (absent yesterday)');
`));
check('loadYesterdayLogs alerts when no yesterday data', ()=>{
  let alerted = false;
  const orig = ctx.alert;
  ctx.alert = ()=>{ alerted=true; };
  run(`logsCache={};loadYesterdayLogs();`);
  ctx.alert = orig;
  if(!alerted) throw new Error('should alert when no yesterday logs');
});

// ── F8: employee permit & passport fields ─────────────────────────────────────
console.log('\nF8 — permit & passport fields');
check('employee object stores passportId, permitExpiry, group', ()=>run(`
  MD.employees=[{id:'p1',first:'วันชัย',status:'active',passportId:'AB123456',permitExpiry:'2026-12-31',group:'ทีม A'}];
  var e=MD.employees[0];
  if(e.passportId!=='AB123456')throw new Error('passportId not stored');
  if(e.permitExpiry!=='2026-12-31')throw new Error('permitExpiry not stored');
  if(e.group!=='ทีม A')throw new Error('group not stored');
`));
check('renderEmpList runs with expired permit (red badge)', ()=>run(`
  MD.employees=[{id:'p2',first:'วันชัย',status:'active',permitExpiry:'2025-01-01'}];
  renderEmpList();
`));
check('renderEmpList runs with valid permit (green badge)', ()=>run(`
  MD.employees=[{id:'p3',first:'สมชาย',status:'active',permitExpiry:'2099-12-31'}];
  renderEmpList();
`));
check('renderEmpList runs with no permit (no badge)', ()=>run(`
  MD.employees=[{id:'p4',first:'นิ่ม',status:'active'}];
  renderEmpList();
`));
check('thaiDate handles ISO string input (used in permit badge)', ()=>run(`
  var r=thaiDate('2099-12-31');
  if(!r.includes('2642'))throw new Error('year wrong: '+r);
`));

// ── computeSeasonSummary ──────────────────────────────────────────────────────
console.log('\ncomputeSeasonSummary');
run(`
  MD.tasks=[{name:'ตัดอ้อย',dailyRate:400}];
  logsCache={'2026-01-10':[{id:'ls1',name:'สมชาย',task:'ตัดอ้อย',location:'แปลง A',duration:'เต็มวัน',loggedBy:'test'}]};
  outsourceLogsCache={'2026-01-11':[{id:'os1',location:'แปลง A',task:'ไถ',contractor:'บริษัท ก',fee:500,loggedBy:'test'}]};
  fertLogCache={'2026-01-12':[{id:'fz1',location:'แปลง A',fertilizer:'ยูเรีย',quantity:50,unit:'กก.',loggedBy:'test'}]};
`);
check('season entries counts employee + outsource + fertilizer', ()=>run(`
  var loc={name:'แปลง A',seasonStart:'2026-01-01'};
  var s=computeSeasonSummary(loc);
  if(!s)throw new Error('null result');
  if(s.entries!==3)throw new Error('expected 3 entries, got '+s.entries);
`));
check('season cost counts wages + outsource fee but not fertilizer', ()=>run(`
  var loc2={name:'แปลง A',seasonStart:'2026-01-01'};
  var s2=computeSeasonSummary(loc2);
  if(s2.cost!==900)throw new Error('expected 900 (400+500), got '+s2.cost);
`));
check('season days counts only employee logs not outsource or fertilizer', ()=>run(`
  var loc3={name:'แปลง A',seasonStart:'2026-01-01'};
  var s3=computeSeasonSummary(loc3);
  if(s3.days!==1)throw new Error('expected 1 day, got '+s3.days);
`));
check('computeSeasonSummary returns null when no seasonStart', ()=>run(`
  var s4=computeSeasonSummary({name:'แปลง A'});
  if(s4!==null)throw new Error('expected null');
`));

// ── saveLoc season snapshot ───────────────────────────────────────────────────
console.log('\nsaveLoc season history snapshot');
run(`
  MD.locations=[];
  MD.tasks=[{name:'ตัดอ้อย',dailyRate:400}];
  MD.employees=[]; MD.trucks=[]; MD.contractors=[]; MD.fertilizers=[];
  logsCache={'2026-01-10':[{id:'lh1',name:'สมชาย',task:'ตัดอ้อย',location:'แปลง B',duration:'เต็มวัน',loggedBy:'test'}]};
  outsourceLogsCache={};
  fertLogCache={'2026-01-11':[{id:'fh1',location:'แปลง B',fertilizer:'ยูเรีย',quantity:50,unit:'กก.',loggedBy:'test'}]};
  editLocId='loc-b-test';
  document.getElementById=function(id){
    var vals={'ml-name':'แปลง B','ml-id':'B01','ml-size':'10','ml-class':'A','ml-loc':'อ.เมือง','ml-detail':''};
    return {value:vals[id]||'',classList:{add:function(){},remove:function(){},toggle:function(){},contains:function(){return false;}},textContent:'',innerHTML:'',style:{},scrollIntoView:function(){},focus:function(){},getAttribute:function(){return '';},appendChild:function(){},removeChild:function(){},select:function(){},dataset:{},remove:function(){}};
  };
  // Inject existing location with old seasonStart so snapshot triggers
  MD.locations=[{id:'loc-b-test',name:'แปลง B',seasonStart:'2026-01-01',seasonHistory:[]}];
`);
check('saveLoc snapshot includes fertilizer in entry count', ()=>run(`
  document.getElementById=function(id){
    var vals={'ml-name':'แปลง B','ml-id':'B01','ml-size':'10','ml-class':'A','ml-loc':'อ.เมือง','ml-detail':'','ml-season':'2026-06-01'};
    return {value:vals[id]||'',classList:{add:function(){},remove:function(){},toggle:function(){},contains:function(){return false;}},textContent:'',innerHTML:'',style:{},scrollIntoView:function(){},focus:function(){},getAttribute:function(){return '';},appendChild:function(){},removeChild:function(){},select:function(){},dataset:{},remove:function(){}};
  };
  editLocId='loc-b-test';
  saveLoc();
  var _loc=MD.locations.find(function(l){return l.name==='แปลง B';});
  if(!_loc)throw new Error('location not found after saveLoc');
  if(!_loc.seasonHistory||!_loc.seasonHistory.length)throw new Error('no season history saved');
  var _snap=_loc.seasonHistory[0];
  if(_snap.entries!==2)throw new Error('expected 2 entries (1 log + 1 fert), got '+_snap.entries);
`));

// ── importBackup schema validation ────────────────────────────────────────────
console.log('\nimportBackup schema validation');
check('importBackup rejects missing masterData', ()=>{
  let alerted = false;
  const orig = ctx.alert;
  ctx.alert = ()=>{ alerted = true; };
  const badJson = JSON.stringify({ logs: {} });
  const origFR = ctx.FileReader;
  ctx.FileReader = class { readAsText(){ this.onload&&this.onload({target:{result:badJson}}); } };
  run(`importBackup({target:{files:[{}],value:''}});`);
  ctx.FileReader = origFR;
  ctx.alert = orig;
  if (!alerted) throw new Error('should alert on missing masterData');
});
check('importBackup rejects non-array employees', ()=>{
  let alerted = false;
  const orig = ctx.alert;
  ctx.alert = ()=>{ alerted = true; };
  const badJson = JSON.stringify({ masterData:{employees:'bad',tasks:[],locations:[],trucks:[]}, logs:{} });
  const origFR = ctx.FileReader;
  ctx.FileReader = class { readAsText(){ this.onload&&this.onload({target:{result:badJson}}); } };
  run(`importBackup({target:{files:[{}],value:''}});`);
  ctx.FileReader = origFR;
  ctx.alert = orig;
  if (!alerted) throw new Error('should alert on non-array employees');
});

// ── Summary ───────────────────────────────────────────────────────────────────
console.log('\n' + '─'.repeat(50));
console.log(`Results: ${passed} passed, ${failed} failed`);
if(failed > 0) process.exit(1);

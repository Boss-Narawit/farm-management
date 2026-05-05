/* ============================================================
 * logs.js — Log entries — employee work, outsource, bulk, edit/delete
 *
 * Contents: submitEmp, submitTruck, submitOutsource, openQL, confirmQL, bulk*, editLog/saveEditLog/deleteLog, OS edit, holiday toggle
 * ============================================================ */

// ===== EMPLOYEE FORM =====
function setDur(v){formDur=v;document.getElementById('tog-full').classList.toggle('sel',v==='เต็มวัน');document.getElementById('tog-half').classList.toggle('sel',v==='ครึ่งวัน');}

async function submitEmp(){
  clearE('emp-err');
  const date=document.getElementById('emp-date').value,name=document.getElementById('emp-name').value.trim(),task=document.getElementById('emp-task').value.trim(),loc=document.getElementById('emp-loc').value.trim(),note=document.getElementById('emp-note').value.trim();
  if(!date||!name||!task){showE('emp-err','กรุณากรอก: วันที่, ชื่อพนักงาน และงานที่ทำ');return;}
  const id=Date.now().toString()+Math.random().toString(36).slice(2,6);
  await sendAPI({action:'addEmployee',id,date,name,task,location:loc,duration:formDur,note,loggedBy:user.displayName,timestamp:new Date().toISOString()},`บันทึก ${name} สำเร็จ`,()=>{
    if(!logsCache[date])logsCache[date]=[];
    logsCache[date].push({id,name,task,location:loc,duration:formDur,note,loggedBy:user.displayName,syncStatus:'pending'});
    saveLogs();
    document.getElementById('emp-name').value='';document.getElementById('emp-task').value='';document.getElementById('emp-loc').value='';document.getElementById('emp-note').value='';setDur('เต็มวัน');
  });
}


// ===== TRUCK FORM =====
async function submitTruck(){
  clearE('truck-err');
  const date=document.getElementById('truck-date').value,plate=document.getElementById('truck-plate').value.trim().toUpperCase(),weight=document.getElementById('truck-weight').value,driver=document.getElementById('truck-driver').value.trim(),note=document.getElementById('truck-note').value.trim();
  if(!date||!plate||!weight){showE('truck-err','กรุณากรอก: วันที่, ทะเบียนรถ และน้ำหนัก');return;}
  const id=Date.now().toString()+Math.random().toString(36).slice(2,6);
  await sendAPI({action:'addTruck',id,date,plate,weight,driver,note,loggedBy:user.displayName,timestamp:new Date().toISOString()},`บันทึกรถ ${plate} สำเร็จ`,()=>{
    if(!truckLogsCache[date])truckLogsCache[date]=[];
    truckLogsCache[date].push({id,plate,weight:parseFloat(weight),driver,note,loggedBy:user.displayName,ts:new Date().toISOString(),syncStatus:'pending'});
    saveLogs();
    document.getElementById('truck-plate').value='';document.getElementById('truck-weight').value='';document.getElementById('truck-driver').value='';document.getElementById('truck-note').value='';
  });
}


// ===== EDIT/DELETE OUTSOURCE LOG =====
let eoIso='', eoId='';
function editOSLog(iso, osId){
  eoIso=iso; eoId=osId;
  const log=(outsourceLogsCache[iso]||[]).find(o=>o.id===osId);
  if(!log){alert('ไม่พบบันทึก');return;}
  document.getElementById('eo-date').textContent=thaiDate(parseISO(iso));
  document.getElementById('eo-loc').value=log.location||'';
  document.getElementById('eo-task').value=log.task||'';
  document.getElementById('eo-contractor').value=log.contractor||'';
  document.getElementById('eo-fee').value=log.fee||'';
  document.getElementById('eo-note').value=log.note||'';
  _resetConfirmBtn(document.querySelector('#mod-editos .mc'));
  document.getElementById('mod-editos').classList.add('open');
}

async function saveOSLog(){
  const loc=document.getElementById('eo-loc').value.trim();
  const task=document.getElementById('eo-task').value.trim();
  const contractor=document.getElementById('eo-contractor').value.trim();
  const fee=document.getElementById('eo-fee').value;
  const note=document.getElementById('eo-note').value.trim();
  if(!loc||!task||!contractor){alert('กรุณากรอก: แปลง, งาน และผู้รับเหมา');return;}
  const idx=(outsourceLogsCache[eoIso]||[]).findIndex(o=>o.id===eoId);
  if(idx<0)return;
  const old=outsourceLogsCache[eoIso][idx];
  const updated={
    id:old.id,
    location:loc,task,contractor,
    fee:fee?parseFloat(fee):0,
    note,
    loggedBy:old.loggedBy,
    timestamp:old.timestamp
  };
  outsourceLogsCache[eoIso][idx]=updated;
  saveLogs();
  closeMod('mod-editos');
  await sendAPI({action:'editOutsource',date:eoIso,osId:eoId,...updated},'แก้ไขสำเร็จ',()=>{
    if(currentScreen==='screen-ldet')renderLdet();
  });
}

async function deleteOSLog(){
  const btn=document.querySelector('#mod-editos .mc');
  if(btn && !btn.dataset.confirming){
    btn.dataset.confirming='1';
    btn.textContent='⚠ กดอีกครั้งเพื่อยืนยันลบ';
    btn.style.background='#fef2f2';btn.style.color='#dc2626';btn.style.borderColor='#dc2626';btn.style.fontWeight='700';
    setTimeout(()=>{if(btn.dataset.confirming)_resetConfirmBtn(btn);},5000);
    return;
  }
  if(btn)delete btn.dataset.confirming;
  const idx=(outsourceLogsCache[eoIso]||[]).findIndex(o=>o.id===eoId);
  if(idx<0){alert('ไม่พบบันทึก');return;}
  // Save undo data BEFORE deleting
  const deletedRec=outsourceLogsCache[eoIso][idx];
  const deletedIso=eoIso;
  outsourceLogsCache[eoIso].splice(idx,1);
  if(outsourceLogsCache[eoIso].length===0)delete outsourceLogsCache[eoIso];
  saveLogs();
  closeMod('mod-editos');
  // Show undo toast
  showUndoToast('ลบงานเหมาแล้ว',()=>{
    if(!outsourceLogsCache[deletedIso])outsourceLogsCache[deletedIso]=[];
    outsourceLogsCache[deletedIso].push(deletedRec);
    saveLogs();
    if(currentScreen==='screen-ldet')renderLdet();
  });
  await sendAPI({action:'deleteOutsource',date:eoIso,osId:eoId,timestamp:new Date().toISOString()},'ลบสำเร็จ',()=>{
    if(currentScreen==='screen-ldet')renderLdet();
  });
}




// ===== HOLIDAY =====
function toggleHoliday(iso){
  if(holidays[iso]){
    if(!confirm('ยกเลิกวันหยุด?'))return;
    delete holidays[iso];
    saveLogs();
    renderToday();
    return;
  }
  const reason=prompt('เหตุผลวันหยุด (ถ้ามี เช่น วันสงกรานต์, ฝนตก) — กดตกลงเพื่อข้าม','');
  if(reason===null)return; // cancelled
  holidays[iso]=reason||'หยุด';
  saveLogs();
  renderToday();
}


// ===== OUTSOURCE LOG =====
function initOutsourceForm(){
  document.getElementById('os-date').value=isoDate(new Date());
  updateDD('os-date','os-dd');
  document.getElementById('os-loc').value='';
  document.getElementById('os-task').value='';
  document.getElementById('os-contractor').value='';
  document.getElementById('os-fee').value='';
  document.getElementById('os-note').value='';
  clearE('os-err');
}

async function submitOutsource(){
  clearE('os-err');
  const date=document.getElementById('os-date').value;
  const loc=document.getElementById('os-loc').value.trim();
  const task=document.getElementById('os-task').value.trim();
  const contractor=document.getElementById('os-contractor').value.trim();
  const fee=document.getElementById('os-fee').value;
  const note=document.getElementById('os-note').value.trim();
  if(!date||!loc||!task||!contractor){showE('os-err','กรุณากรอก: วันที่, แปลง, งาน และผู้รับเหมา');return;}
  const rec={id:Date.now().toString()+Math.random().toString(36).slice(2,6),location:loc,task,contractor,fee:fee?parseFloat(fee):0,note,loggedBy:user.displayName,timestamp:new Date().toISOString(),syncStatus:'pending'};
  await sendAPI({action:'addOutsource',date,...rec},'บันทึกงานเหมาสำเร็จ',()=>{
    if(!outsourceLogsCache[date])outsourceLogsCache[date]=[];
    outsourceLogsCache[date].push(rec);
    saveLogs();
    document.getElementById('os-loc').value='';
    document.getElementById('os-task').value='';
    document.getElementById('os-contractor').value='';
    document.getElementById('os-fee').value='';
    document.getElementById('os-note').value='';
  });
}


// ===== BULK LOG =====
let bulkSelected=new Set();
let bulkDur='เต็มวัน';
function initBulkLog(){
  bulkSelected=new Set();
  bulkDur='เต็มวัน';
  const today=isoDate(new Date());
  document.getElementById('bulk-date').value=today;
  updateDD('bulk-date','bulk-dd');
  // Pre-fill if last bulk was today (same shift)
  const lastDate=localStorage.getItem('fm_lastBulkDate')||'';
  if(lastDate===today){
    document.getElementById('bulk-task').value=localStorage.getItem('fm_lastBulkTask')||'';
    document.getElementById('bulk-loc').value=localStorage.getItem('fm_lastBulkLoc')||'';
  } else {
    document.getElementById('bulk-task').value='';
    document.getElementById('bulk-loc').value='';
  }
  setBulkDur('เต็มวัน');
  clearE('bulk-err');
  renderBulkGrid();
  updateBulkCount();
}
function renderBulkGrid(){
  const emps=MD.employees.filter(e=>(e.status||'active')==='active');
  const el=document.getElementById('bulk-emp-grid');
  if(!emps.length){el.innerHTML='<div style="grid-column:1/-1;text-align:center;padding:30px;color:var(--mu)">ยังไม่มีพนักงาน</div>';return;}
  el.innerHTML=emps.map(e=>{
    const sel=bulkSelected.has(e.id);
    return '<div class="bulk-emp-card'+(sel?' selected':'')+'" onclick="toggleBulkEmp(\''+e.id+'\')">'+
      '<div class="bulk-check">✓</div>'+
      '<div class="bulk-emp-name">'+escHtml(empFull(e))+'</div>'+
      '</div>';
  }).join('');
}
function toggleBulkEmp(id){
  if(bulkSelected.has(id))bulkSelected.delete(id);
  else bulkSelected.add(id);
  renderBulkGrid();updateBulkCount();
}
function toggleSelectAll(){
  const emps=MD.employees.filter(e=>(e.status||'active')==='active');
  if(bulkSelected.size===emps.length){bulkSelected=new Set();}
  else{bulkSelected=new Set(emps.map(e=>e.id));}
  renderBulkGrid();updateBulkCount();
}
function updateBulkCount(){
  const n=bulkSelected.size;
  const emps=MD.employees.filter(e=>(e.status||'active')==='active');
  document.getElementById('bulk-count').textContent='เลือกแล้ว '+n+' คน';
  document.getElementById('bulk-select-all-btn').textContent=(n===emps.length&&n>0)?'ยกเลิกทั้งหมด':'เลือกทั้งหมด';
}
function setBulkDur(v){
  bulkDur=v;
  document.getElementById('bulk-full-btn').classList.toggle('sel',v==='เต็มวัน');
  document.getElementById('bulk-half-btn').classList.toggle('sel',v==='ครึ่งวัน');
}
async function submitBulk(){
  clearE('bulk-err');
  const date=document.getElementById('bulk-date').value;
  const task=document.getElementById('bulk-task').value.trim();
  const loc=document.getElementById('bulk-loc').value.trim();
  if(!date||!task){showE('bulk-err','กรุณากรอก: วันที่ และงานที่ทำ');return;}
  if(bulkSelected.size===0){showE('bulk-err','กรุณาเลือกพนักงานอย่างน้อย 1 คน');return;}
  const selectedEmps=MD.employees.filter(e=>bulkSelected.has(e.id));
  const names=selectedEmps.map(e=>empFull(e));
  if(!logsCache[date])logsCache[date]=[];
  const ids=[];
  selectedEmps.forEach(e=>{
    const nm=empFull(e);
    const id=Date.now().toString()+Math.random().toString(36).slice(2,6);
    ids.push(id);
    logsCache[date].push({id,name:nm,task,location:loc,duration:bulkDur,note:'',loggedBy:user.displayName,syncStatus:'pending'});
  });
  saveLogs();
  localStorage.setItem('fm_lastBulkDate',date);
  localStorage.setItem('fm_lastBulkTask',task);
  localStorage.setItem('fm_lastBulkLoc',loc);
  await sendAPI({action:'addEmployeeBulk',date,ids,names,task,location:loc,duration:bulkDur,loggedBy:user.displayName,timestamp:new Date().toISOString()},
    'บันทึก '+names.length+' คนสำเร็จ',()=>{
      bulkSelected=new Set();
      document.getElementById('bulk-task').value='';
      document.getElementById('bulk-loc').value='';
      renderBulkGrid();updateBulkCount();
    });
}


// ===== EDIT LOG =====
let elDur='เต็มวัน',elIso='',elName='',elLogId='';
function editLog(iso,logId){
  closeDDS();
  elIso=iso;elLogId=logId;
  const log=(logsCache[iso]||[]).find(l=>l.id===logId);
  if(!log){alert('ไม่พบบันทึก');return;}
  elName=log.name;
  document.getElementById('el-name').textContent=log.name;
  document.getElementById('el-date').textContent=thaiDate(parseISO(iso));
  document.getElementById('el-task').value=log.task||'';
  document.getElementById('el-loc').value=log.location||'';
  setELDur(log.duration||'เต็มวัน');
  _resetConfirmBtn(document.querySelector('#mod-editlog .mc'));
  document.getElementById('mod-editlog').classList.add('open');
}
function setELDur(v){
  elDur=v;
  document.getElementById('el-full').classList.toggle('sel',v==='เต็มวัน');
  document.getElementById('el-half').classList.toggle('sel',v==='ครึ่งวัน');
}
async function saveEditLog(){
  const task=document.getElementById('el-task').value.trim();
  const loc=document.getElementById('el-loc').value.trim();
  if(!task){alert('กรุณาใส่งานที่ทำ');return;}
  const idx=(logsCache[elIso]||[]).findIndex(l=>l.id===elLogId);
  if(idx<0)return;
  const old=logsCache[elIso][idx];
  logsCache[elIso][idx]={id:old.id,name:old.name,task,location:loc,duration:elDur,note:old.note||'',loggedBy:old.loggedBy};
  saveLogs();
  closeMod('mod-editlog');
  await sendAPI({action:'editEmployee',date:elIso,logId:elLogId,name:old.name,task,location:loc,duration:elDur,timestamp:new Date().toISOString()},'แก้ไขสำเร็จ',()=>{
    if(currentScreen==='screen-dash')renderDash();
    else if(currentScreen==='screen-edet')renderEdet();
  });
}
async function deleteLog(){
  // Two-stage delete: first click switches button to confirm state, second click confirms
  const btn=document.querySelector('#mod-editlog .mc');
  if(btn && !btn.dataset.confirming){
    btn.dataset.confirming='1';
    btn.textContent='⚠ กดอีกครั้งเพื่อยืนยันลบ';
    btn.style.background='#fef2f2';
    btn.style.color='#dc2626';
    btn.style.borderColor='#dc2626';
    btn.style.fontWeight='700';
    setTimeout(()=>{if(btn.dataset.confirming)_resetConfirmBtn(btn);},5000);
    return;
  }
  // Confirmed — proceed with delete
  if(btn)delete btn.dataset.confirming;
  const idx=(logsCache[elIso]||[]).findIndex(l=>l.id===elLogId);
  if(idx<0){alert('ไม่พบบันทึก');return;}
  // Save undo data BEFORE deleting
  const deletedRec=logsCache[elIso][idx];
  const deletedIso=elIso;
  logsCache[elIso].splice(idx,1);
  if(logsCache[elIso].length===0)delete logsCache[elIso];
  saveLogs();
  closeMod('mod-editlog');
  _resetConfirmBtn(btn);
  // Show undo toast
  showUndoToast('ลบบันทึกของ '+deletedRec.name+' แล้ว',()=>{
    if(!logsCache[deletedIso])logsCache[deletedIso]=[];
    logsCache[deletedIso].push(deletedRec);
    saveLogs();
    if(currentScreen==='screen-dash')renderDash();
    else if(currentScreen==='screen-edet')renderEdet();
  });
  await sendAPI({action:'deleteEmployee',date:elIso,logId:elLogId,timestamp:new Date().toISOString()},'ลบสำเร็จ',()=>{
    if(currentScreen==='screen-dash')renderDash();
    else if(currentScreen==='screen-edet')renderEdet();
  });
}

function _resetConfirmBtn(btn){
  if(!btn)return;
  delete btn.dataset.confirming;
  btn.textContent='🗑 ลบ';
  btn.style.background='';btn.style.color='var(--rd)';btn.style.borderColor='#fca5a5';btn.style.fontWeight='';
}


// ===== DDS PATCH FOR EDIT LOG (multi-job aware) =====
// (Override openDDS row rendering to use editLog with log.id)

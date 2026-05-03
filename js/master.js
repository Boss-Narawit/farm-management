/* ============================================================
 * master.js — Master data CRUD — employees, trucks, locations, tasks, contractors
 *
 * Contents: render*List, open*Mod, save*, del* for each entity
 * ============================================================ */

// ===== MASTER =====
function switchTab(t){['employees','trucks','locations','tasks','contractors','fertilizers'].forEach(x=>{document.getElementById('tab-'+x).classList.toggle('active',x===t);document.getElementById('panel-'+x).style.display=x===t?'block':'none';});renderAll();}
function renderAll(){renderEmpList();renderTruckList();renderLocList();if(typeof renderTaskList==='function')renderTaskList();if(typeof renderContractorList==='function')renderContractorList();if(typeof renderFertilizerList==='function')renderFertilizerList();}
function renderEmpList(){
  const el=document.getElementById('emp-list');
  if(!MD.employees.length){el.innerHTML='<div class="es">ยังไม่มีรายชื่อพนักงาน<br>กดปุ่มด้านบนเพื่อเพิ่ม</div>';return;}
  // Sort active first, inactive at bottom with reduced opacity
  const sorted=[...MD.employees].sort((a,b)=>{
    const aA=(a.status||'active')==='active'?0:1;
    const bA=(b.status||'active')==='active'?0:1;
    return aA-bA;
  });
  el.innerHTML=sorted.map(e=>{
    const inactive=(e.status||'active')!=='active';
    const opacityStyle=inactive?';opacity:.55;background:#f9fafb':'';
    return '<div class="dc" style="cursor:pointer'+opacityStyle+'" onclick="openEmpMod(\''+e.id+'\')">'+
      '<div class="dav" style="background:#e8f5ee;color:#1a8f5c">'+escHtml(e.first[0]||'')+'</div>'+
      '<div style="flex:1;min-width:0">'+
        '<div style="font-size:16px;font-weight:600">'+escHtml(empFull(e))+(inactive?' <span style="font-size:11px;background:#f3f4f6;color:var(--mu);padding:2px 7px;border-radius:10px;font-weight:600">ลาออก</span>':'')+'</div>'+
        '<div style="font-size:13px;color:var(--mu);margin-top:2px">'+escHtml(empSub(e))+'</div>'+
      '</div>'+
      '<button onclick="event.stopPropagation();toggleEmpStatus(\''+e.id+'\')" style="background:'+(inactive?'var(--gl)':'#f3f4f6')+';color:'+(inactive?'var(--gd)':'var(--mu)')+';border:none;border-radius:8px;padding:6px 10px;font-size:12px;font-weight:600;cursor:pointer;font-family:Sarabun,sans-serif;margin-right:6px;white-space:nowrap">'+(inactive?'กลับมาทำงาน':'ลาออก')+'</button>'+
      '<button class="ddel" onclick="event.stopPropagation();delEmp(\''+e.id+'\')">&#10005;</button>'+
      '</div>';
  }).join('');
}
function renderTruckList(){
  const el=document.getElementById('truck-list');
  if(!MD.trucks.length){el.innerHTML='<div class="es">ยังไม่มีทะเบียนรถ<br>กดปุ่มด้านบนเพื่อเพิ่ม</div>';return;}
  const today=isoDate(new Date());
  el.innerHTML=MD.trucks.map(t=>{
    const sub=[t.type,t.model,t.year?'ปี '+t.year:'',t.driver?'คนขับ: '+t.driver:''].filter(Boolean).join(' · ')||'—';
    let taxBadge='';
    if(t.taxExpiry){
      const daysLeft=Math.floor((new Date(t.taxExpiry+'T00:00:00')-new Date(today+'T00:00:00'))/86400000);
      if(daysLeft<0)taxBadge='<div style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:10px;background:#fef2f2;color:var(--rd);margin-top:4px;display:inline-block">&#9888; ภาษีหมดอายุ</div>';
      else if(daysLeft<=30)taxBadge='<div style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:10px;background:#fef2f2;color:var(--rd);margin-top:4px;display:inline-block">&#9888; ภาษีหมด '+daysLeft+' วัน</div>';
      else if(daysLeft<=90)taxBadge='<div style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:10px;background:#fef3e2;color:var(--ad);margin-top:4px;display:inline-block">&#128337; ภาษีหมด '+daysLeft+' วัน</div>';
      else taxBadge='<div style="font-size:11px;font-weight:600;padding:2px 8px;border-radius:10px;background:var(--gl);color:var(--gd);margin-top:4px;display:inline-block">&#10003; ภาษีถึง '+thaiDate(t.taxExpiry)+'</div>';
    }
    return '<div class="dc" style="cursor:pointer" onclick="openTruckDetail(\''+t.id+'\')">'+
      '<div class="dav" style="background:#fef3e2;font-size:22px">&#128667;</div>'+
      '<div style="flex:1;min-width:0">'+
        '<div style="font-size:16px;font-weight:600">'+escHtml(t.plate)+'</div>'+
        '<div style="font-size:13px;color:var(--mu);margin-top:2px">'+escHtml(sub)+'</div>'+
        taxBadge+
      '</div>'+
      '<button class="ddel" onclick="event.stopPropagation();delTruck(\''+t.id+'\')">&#10005;</button>'+
      '</div>';
  }).join('');
}
function openEmpMod(id){
  editEId=id||null;const m=id?MD.employees.find(e=>e.id===id):null;
  document.getElementById('mod-emp-t').textContent=m?'แก้ไขพนักงาน':'เพิ่มพนักงานใหม่';
  document.getElementById('me-first').value=m?m.first:'';document.getElementById('me-last').value=m?m.last||'':'';
  document.getElementById('me-year').value=m?m.birthYear||'':'';document.getElementById('me-nat').value=m?m.nationality||'ไทย':'ไทย';
  document.getElementById('mod-emp').classList.add('open');
}
function saveEmp(){
  const first=document.getElementById('me-first').value.trim();if(!first){alert('กรุณาใส่ชื่อพนักงาน');return;}
  const existing=editEId?MD.employees.find(e=>e.id===editEId):null;
  const emp={id:editEId||Date.now().toString(),first,last:document.getElementById('me-last').value.trim(),birthYear:document.getElementById('me-year').value?parseInt(document.getElementById('me-year').value):null,nationality:document.getElementById('me-nat').value,status:existing?(existing.status||'active'):'active'};
  if(editEId){const i=MD.employees.findIndex(e=>e.id===editEId);MD.employees[i]=emp;}else MD.employees.push(emp);
  saveMD();closeMod('mod-emp');renderEmpList();
}
function delEmp(id){if(!confirm('ลบพนักงานนี้?'))return;MD.employees=MD.employees.filter(e=>e.id!==id);saveMD();renderEmpList();}
function openTruckMod(id){
  editTId=id||null;const t=id?MD.trucks.find(x=>x.id===id):null;
  document.getElementById('mod-truck-t').textContent=t?'แก้ไขรถ':'เพิ่มทะเบียนรถใหม่';
  document.getElementById('mt-plate').value=t?t.plate:'';
  document.getElementById('mt-type').value=t?t.type||'':'';
  document.getElementById('mt-model').value=t?t.model||'':'';
  document.getElementById('mt-year').value=t?t.year||'':'';
  document.getElementById('mt-driver').value=t?t.driver||'':'';
  document.getElementById('mt-tax').value=t?t.taxExpiry||'':'';
  document.getElementById('mt-note').value=t?t.note||'':'';
  document.getElementById('mod-truck').classList.add('open');
}
function saveTruck(){
  const plate=document.getElementById('mt-plate').value.trim().toUpperCase();if(!plate){alert('กรุณาใส่ทะเบียนรถ');return;}
  const yearVal=document.getElementById('mt-year').value;
  const truck={id:editTId||Date.now().toString(),plate,type:document.getElementById('mt-type').value.trim(),model:document.getElementById('mt-model').value.trim(),year:yearVal?parseInt(yearVal):null,driver:document.getElementById('mt-driver').value.trim(),taxExpiry:document.getElementById('mt-tax').value||null,note:document.getElementById('mt-note').value.trim()};
  if(editTId){const i=MD.trucks.findIndex(t=>t.id===editTId);MD.trucks[i]=truck;}else MD.trucks.push(truck);
  saveMD();closeMod('mod-truck');renderTruckList();
}
function delTruck(id){if(!confirm('ลบทะเบียนรถนี้?'))return;MD.trucks=MD.trucks.filter(t=>t.id!==id);saveMD();renderTruckList();}
function closeMod(id){document.getElementById(id).classList.remove('open');}



// ===== LOCATIONS =====
function renderLocList(){
  const el=document.getElementById('loc-list');
  if(!el)return;
  if(!(MD.locations||[]).length){el.innerHTML='<div class="es">ยังไม่มีแปลงในระบบ<br>กดปุ่มด้านบนเพื่อเพิ่ม</div>';return;}
  // sort by last activity (most recent first), unworked at end
  const sorted=[...MD.locations].map(l=>({l,last:locLastActivity(l)}));
  sorted.sort((a,b)=>{
    if(!a.last&&!b.last)return 0;
    if(!a.last)return 1;
    if(!b.last)return -1;
    return b.last.localeCompare(a.last);
  });
  el.innerHTML=sorted.map(({l,last})=>{
    let activityBadge='';
    if(last){
      const d=daysAgo(last);
      let bgColor='var(--gl)', textColor='var(--gd)', txt='';
      if(d===0)txt='วันนี้';
      else if(d===1)txt='เมื่อวาน';
      else if(d<=7)txt=d+' วันก่อน';
      else if(d<=30){txt=d+' วันก่อน';bgColor='#fef3e2';textColor='var(--ad)';}
      else {txt=d+' วันก่อน';bgColor='#fef2f2';textColor='var(--rd)';}
      activityBadge='<div style="font-size:11px;font-weight:700;padding:3px 9px;border-radius:20px;background:'+bgColor+';color:'+textColor+';white-space:nowrap;margin-top:4px;display:inline-block">&#x23F1; '+txt+'</div>';
    } else {
      activityBadge='<div style="font-size:11px;font-weight:600;padding:3px 9px;border-radius:20px;background:#f3f4f6;color:var(--mu);white-space:nowrap;margin-top:4px;display:inline-block">ยังไม่มีกิจกรรม</div>';
    }
    return '<div class="loc-card" style="cursor:pointer" onclick="openLocDetail(\''+l.id+'\')">'+
      '<div class="loc-icon">&#127806;</div>'+
      '<div style="flex:1;min-width:0">'+
        (l.locId?'<div class="loc-id">'+escHtml(l.locId)+'</div>':'')+
        '<div class="loc-name">'+escHtml(l.name)+'</div>'+
        '<div class="loc-detail">'+escHtml([l.locClass,l.size?l.size+' ไร่':''].filter(Boolean).join(' · '))+'</div>'+
        (l.location?'<div class="loc-detail">&#128205; '+escHtml(l.location)+'</div>':'')+
        (l.detail?'<div class="loc-detail">'+escHtml(l.detail)+'</div>':'')+
        (l.note?'<div class="loc-detail" style="color:var(--mu)">&#128203; '+escHtml(l.note)+'</div>':'')+
        activityBadge+
      '</div>'+
      '<button class="ddel" onclick="event.stopPropagation();delLoc(\''+l.id+'\')">&#10005;</button>'+
      '</div>';
  }).join('');
}

let editLocId=null;
function openLocMod(id){
  editLocId=id||null;
  const l=id?(MD.locations||[]).find(x=>x.id===id):null;
  document.getElementById('mod-loc-t').textContent=l?'แก้ไขแปลง':'เพิ่มแปลงใหม่';
  document.getElementById('ml-name').value=l?l.name:'';
  document.getElementById('ml-id').value=l?l.locId||'':'';
  document.getElementById('ml-size').value=l?l.size||'':'';
  document.getElementById('ml-class').value=l?l.locClass||'':'';
  document.getElementById('ml-loc').value=l?l.location||'':'';
  document.getElementById('ml-detail').value=l?l.detail||'':'';
  document.getElementById('ml-note').value=l?l.note||'':'';
  document.getElementById('ml-season').value=l?l.seasonStart||'':'';
  document.getElementById('mod-loc').classList.add('open');
}
function saveLoc(){
  const name=document.getElementById('ml-name').value.trim();
  if(!name){alert('กรุณาใส่ชื่อแปลง');return;}
  const newSeason=document.getElementById('ml-season').value||'';
  const existing=editLocId?(MD.locations||[]).find(x=>x.id===editLocId):null;
  const oldSeason=existing?existing.seasonStart||'':'';

  // Detect season change: if there was a previous season AND it's different from new
  let seasonHistory=existing?[...(existing.seasonHistory||[])]:[];
  if(existing && oldSeason && oldSeason!==newSeason){
    // Compute previous season's totals up to (newSeason - 1 day) or today if no new season set
    const endDate=newSeason?new Date(new Date(newSeason+'T00:00:00').getTime()-86400000):new Date();
    endDate.setHours(23,59,59,999);
    const startDate=new Date(oldSeason+'T00:00:00');
    if(startDate<=endDate){
      let entries=0, days=0, cost=0;
      const d=new Date(startDate);
      while(d<=endDate){
        const iso=isoDate(d);
        (logsCache[iso]||[]).filter(l=>l.location===name).forEach(log=>{
          entries++;
          days+=(log.duration==='ครึ่งวัน'?0.5:1);
          cost+=logWage(log);
        });
        (outsourceLogsCache[iso]||[]).filter(o=>o.location===name).forEach(o=>{
          entries++;
          cost+=(o.fee||0);
        });
        d.setDate(d.getDate()+1);
      }
      const elapsedDays=Math.floor((endDate-startDate)/86400000)+1;
      // Only save if there was activity
      if(entries>0){
        seasonHistory.push({
          start:oldSeason,
          end:isoDate(endDate),
          entries, days, cost, elapsedDays,
          archivedAt:new Date().toISOString()
        });
      }
    }
  }

  const loc={
    id:editLocId||Date.now().toString(),
    name,
    locId:document.getElementById('ml-id').value.trim(),
    size:document.getElementById('ml-size').value?parseFloat(document.getElementById('ml-size').value):null,
    locClass:document.getElementById('ml-class').value,
    location:document.getElementById('ml-loc').value.trim(),
    detail:document.getElementById('ml-detail').value.trim(),
    note:document.getElementById('ml-note').value.trim(),
    seasonStart:newSeason,
    seasonHistory
  };
  if(!MD.locations)MD.locations=[];
  if(editLocId){const i=MD.locations.findIndex(x=>x.id===editLocId);MD.locations[i]=loc;}
  else MD.locations.push(loc);
  saveMD();closeMod('mod-loc');renderLocList();
}
function delLoc(id){
  if(!confirm('ลบแปลงนี้?'))return;
  MD.locations=(MD.locations||[]).filter(x=>x.id!==id);
  saveMD();renderLocList();
}


// ===== TASKS =====
function renderTaskList(){
  const el=document.getElementById('task-list');
  if(!el)return;
  if(!(MD.tasks||[]).length){el.innerHTML='<div class="es">ยังไม่มีงานในระบบ<br>กดปุ่มด้านบนเพื่อเพิ่ม</div>';return;}
  el.innerHTML=MD.tasks.map(t=>{
    const rateStr=t.dailyRate?'<span style="font-size:14px;font-weight:700;color:var(--gd);background:var(--gl);padding:3px 9px;border-radius:6px;margin-right:6px">'+t.dailyRate+'฿</span>':'';
    return '<div class="dc" style="cursor:pointer" onclick="openTaskMod(\''+t.id+'\')">'+
      '<div class="dav" style="background:var(--pl);color:var(--pu);font-size:21px">🔧</div>'+
      '<div style="flex:1;min-width:0">'+
        '<div style="font-size:16px;font-weight:600">'+rateStr+escHtml(t.name)+'</div>'+
        '<div style="font-size:13px;color:var(--mu);margin-top:2px">'+escHtml(t.category||'—')+(t.note?' · '+escHtml(t.note):'')+'</div>'+
      '</div>'+
      '<button class="ddel" onclick="event.stopPropagation();delTask(\''+t.id+'\')">✕</button>'+
      '</div>';
  }).join('');
}

let editTaskId=null;
function openTaskMod(id){
  editTaskId=id||null;
  const t=id?(MD.tasks||[]).find(x=>x.id===id):null;
  document.getElementById('mod-task-t').textContent=t?'แก้ไขงาน':'เพิ่มงานใหม่';
  document.getElementById('mtk-name').value=t?t.name:'';
  document.getElementById('mtk-rate').value=t?t.dailyRate||'':'';
  document.getElementById('mtk-cat').value=t?t.category||'':'';
  document.getElementById('mtk-note').value=t?t.note||'':'';
  document.getElementById('mod-task').classList.add('open');
}

function saveTask(){
  const name=document.getElementById('mtk-name').value.trim();
  if(!name){alert('กรุณาใส่ชื่องาน');return;}
  const task={id:editTaskId||Date.now().toString(),name,dailyRate:document.getElementById('mtk-rate').value?parseFloat(document.getElementById('mtk-rate').value):null,category:document.getElementById('mtk-cat').value,note:document.getElementById('mtk-note').value.trim()};
  if(!MD.tasks)MD.tasks=[];
  if(editTaskId){const i=MD.tasks.findIndex(x=>x.id===editTaskId);MD.tasks[i]=task;}
  else MD.tasks.push(task);
  saveMD();closeMod('mod-task');renderTaskList();
}

function delTask(id){
  if(!confirm('ลบงานนี้?'))return;
  MD.tasks=(MD.tasks||[]).filter(x=>x.id!==id);
  saveMD();renderTaskList();
}


// ===== CONTRACTORS =====
function renderContractorList(){
  const el=document.getElementById('contractor-list');
  if(!el)return;
  if(!(MD.contractors||[]).length){el.innerHTML='<div class="es">ยังไม่มีผู้รับเหมาในระบบ<br>กดปุ่มด้านบนเพื่อเพิ่ม</div>';return;}
  el.innerHTML=MD.contractors.map(co=>{
    const sub=[co.specialty,co.phone].filter(Boolean).join(' · ');
    return '<div class="dc" style="cursor:pointer" onclick="openContractorMod(\''+co.id+'\')">'+
      '<div class="dav" style="background:#fef3e2;font-size:21px">👷</div>'+
      '<div style="flex:1;min-width:0">'+
        '<div style="font-size:16px;font-weight:600">'+escHtml(co.name)+'</div>'+
        '<div style="font-size:13px;color:var(--mu);margin-top:2px">'+escHtml(sub||'—')+(co.note?' · '+escHtml(co.note):'')+'</div>'+
      '</div>'+
      '<button class="ddel" onclick="event.stopPropagation();delContractor(\''+co.id+'\')">✕</button>'+
      '</div>';
  }).join('');
}

let editContractorId=null;
function openContractorMod(id){
  editContractorId=id||null;
  const co=id?(MD.contractors||[]).find(x=>x.id===id):null;
  document.getElementById('mod-contractor-t').textContent=co?'แก้ไขผู้รับเหมา':'เพิ่มผู้รับเหมาใหม่';
  document.getElementById('mc-name').value=co?co.name:'';
  document.getElementById('mc-phone').value=co?co.phone||'':'';
  document.getElementById('mc-specialty').value=co?co.specialty||'':'';
  document.getElementById('mc-note').value=co?co.note||'':'';
  document.getElementById('mod-contractor').classList.add('open');
}

function saveContractor(){
  const name=document.getElementById('mc-name').value.trim();
  if(!name){alert('กรุณาใส่ชื่อผู้รับเหมา');return;}
  const co={id:editContractorId||Date.now().toString(),name,phone:document.getElementById('mc-phone').value.trim(),specialty:document.getElementById('mc-specialty').value.trim(),note:document.getElementById('mc-note').value.trim()};
  if(!MD.contractors)MD.contractors=[];
  if(editContractorId){const i=MD.contractors.findIndex(x=>x.id===editContractorId);MD.contractors[i]=co;}
  else MD.contractors.push(co);
  saveMD();closeMod('mod-contractor');renderContractorList();
}

function delContractor(id){
  if(!confirm('ลบผู้รับเหมานี้?'))return;
  MD.contractors=(MD.contractors||[]).filter(x=>x.id!==id);
  saveMD();renderContractorList();
}

function toggleEmpStatus(id){
  const e=MD.employees.find(x=>x.id===id);if(!e)return;
  e.status=(e.status||'active')==='active'?'inactive':'active';
  saveMD();renderEmpList();
}


// ===== FERTILIZERS =====
function renderFertilizerList(){
  const el=document.getElementById('fertilizer-list');
  if(!el)return;
  if(!(MD.fertilizers||[]).length){el.innerHTML='<div class="es">ยังไม่มีรายการปุ๋ย<br>กดปุ่มด้านบนเพื่อเพิ่ม</div>';return;}
  el.innerHTML=(MD.fertilizers||[]).map(f=>{
    const sub=[f.type,f.unit?'หน่วย: '+f.unit:'',f.supplier?'ร้าน: '+f.supplier:''].filter(Boolean).join(' · ')||'—';
    const formulaBadge=f.formula?'<span style="font-size:12px;font-weight:700;background:#f1f8e9;color:#558b2f;padding:2px 8px;border-radius:8px;margin-left:6px">'+escHtml(f.formula)+'</span>':'';
    const priceBadge=f.pricePerUnit?'<span style="font-size:13px;font-weight:700;color:#558b2f;background:#f1f8e9;padding:2px 9px;border-radius:6px;margin-right:6px">'+f.pricePerUnit+'฿/'+escHtml(f.unit||'หน่วย')+'</span>':'';
    return '<div class="dc" style="cursor:pointer" onclick="openFertilizerMod(\''+f.id+'\')">'+
      '<div class="dav" style="background:#f1f8e9;font-size:21px">&#127793;</div>'+
      '<div style="flex:1;min-width:0">'+
        '<div style="font-size:16px;font-weight:600">'+escHtml(f.name)+formulaBadge+'</div>'+
        '<div style="font-size:13px;color:var(--mu);margin-top:2px">'+priceBadge+escHtml(sub)+'</div>'+
        (f.note?'<div style="font-size:12px;color:var(--mu);margin-top:2px">&#128203; '+escHtml(f.note)+'</div>':'')+
      '</div>'+
      '<button class="ddel" onclick="event.stopPropagation();delFertilizer(\''+f.id+'\')">&#10005;</button>'+
      '</div>';
  }).join('');
}

let editFertilizerId=null;
function openFertilizerMod(id){
  editFertilizerId=id||null;
  const f=id?(MD.fertilizers||[]).find(x=>x.id===id):null;
  document.getElementById('mod-fertilizer-t').textContent=f?'แก้ไขปุ๋ย':'เพิ่มปุ๋ยใหม่';
  document.getElementById('mfz-name').value=f?f.name:'';
  document.getElementById('mfz-formula').value=f?f.formula||'':'';
  document.getElementById('mfz-type').value=f?f.type||'':'';
  document.getElementById('mfz-unit').value=f?f.unit||'':'';
  document.getElementById('mfz-price').value=f?f.pricePerUnit||'':'';
  document.getElementById('mfz-supplier').value=f?f.supplier||'':'';
  document.getElementById('mfz-note').value=f?f.note||'':'';
  document.getElementById('mod-fertilizer').classList.add('open');
}

function saveFertilizer(){
  const name=document.getElementById('mfz-name').value.trim();
  if(!name){alert('กรุณาใส่ชื่อปุ๋ย');return;}
  const priceVal=document.getElementById('mfz-price').value;
  const fert={
    id:editFertilizerId||Date.now().toString(),
    name,
    formula:document.getElementById('mfz-formula').value.trim(),
    type:document.getElementById('mfz-type').value,
    unit:document.getElementById('mfz-unit').value.trim(),
    pricePerUnit:priceVal?parseFloat(priceVal):null,
    supplier:document.getElementById('mfz-supplier').value.trim(),
    note:document.getElementById('mfz-note').value.trim()
  };
  if(!MD.fertilizers)MD.fertilizers=[];
  if(editFertilizerId){const i=MD.fertilizers.findIndex(x=>x.id===editFertilizerId);MD.fertilizers[i]=fert;}
  else MD.fertilizers.push(fert);
  saveMD();closeMod('mod-fertilizer');renderFertilizerList();
}

function delFertilizer(id){
  if(!confirm('ลบปุ๋ยนี้?'))return;
  MD.fertilizers=(MD.fertilizers||[]).filter(x=>x.id!==id);
  saveMD();renderFertilizerList();
}

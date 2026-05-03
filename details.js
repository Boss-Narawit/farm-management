/* ============================================================
 * details.js — Detail screens — employee, truck, location with calendar + timeline + print/copy
 *
 * Contents: openEmpDetail/renderEdet/edetCopy, openTruckDetail/renderTdet/tdetCopy, openLocDetail/renderLdet/ldetCopy, computeSeasonSummary, locLastActivity
 * ============================================================ */

// ===== EMPLOYEE DETAIL =====
let edetEmpId=null;
let edetMonth={y:new Date().getFullYear(),m:new Date().getMonth()};
function openEmpDetail(empId){
  edetEmpId=empId;
  edetMonth={y:new Date().getFullYear(),m:new Date().getMonth()};
  go('screen-edet');renderEdet();
}
function edetShiftMonth(n){
  edetMonth.m+=n;
  if(edetMonth.m>11){edetMonth.m=0;edetMonth.y++;}
  if(edetMonth.m<0){edetMonth.m=11;edetMonth.y--;}
  renderEdet();
}
function renderEdet(){
  const emp=MD.employees.find(e=>e.id===edetEmpId);
  if(!emp){alert('ไม่พบพนักงาน');go('screen-dash');return;}
  const nm=empFull(emp);
  const {y,m}=edetMonth;
  const todayD=new Date();todayD.setHours(0,0,0,0);
  const daysInMonth=new Date(y,m+1,0).getDate();
  let full=0,half=0;
  const dayLogs={};
  const tasksList=[];
  for(let i=1;i<=daysInMonth;i++){
    const iso=isoDate(new Date(y,m,i));
    const myLogs=(logsCache[iso]||[]).filter(l=>l.name===nm);
    if(myLogs.length>0){
      dayLogs[i]=myLogs;
      myLogs.forEach(log=>{
        if(log.duration==='ครึ่งวัน')half++; else full++;
        tasksList.push({day:i,iso,log});
      });
    }
  }
  const total=full+half*0.5;
  document.getElementById('edet-name').textContent=nm;
  const subParts=[emp.nationality,emp.birthYear?'อายุ '+(new Date().getFullYear()+543-emp.birthYear)+' ปี':''].filter(Boolean);
  document.getElementById('edet-sub').textContent=subParts.join(' · ')||'พนักงาน';
  document.getElementById('edet-full').textContent=full;
  document.getElementById('edet-half').textContent=half;
  document.getElementById('edet-total').textContent=total;
  document.getElementById('edet-month-label').textContent=MO[m]+' '+(y+543);

  let wage=0;
  tasksList.forEach(t=>{wage+=logWage(t.log);});
  const wageBox=document.getElementById('edet-wage-box');
  if(wage>0){
    document.getElementById('edet-wage').textContent=wage.toLocaleString('en-US',{maximumFractionDigits:0})+'฿';
    wageBox.style.display='flex';
  } else wageBox.style.display='none';

  const firstDay=new Date(y,m,1).getDay();
  const startOffset=(firstDay===0?6:firstDay-1);
  const totalCells=startOffset+daysInMonth;
  const rows=Math.ceil(totalCells/7);
  let html='<div style="background:#fff;border:1.5px solid var(--bd);border-radius:12px;overflow:hidden">';
  html+='<div class="edet-cal-head">'+['จ','อ','พ','พฤ','ศ','ส','อา'].map(d=>'<div class="cal-head-cell">'+d+'</div>').join('')+'</div>';
  html+='<div class="edet-cal-grid">';
  for(let cell=0;cell<rows*7;cell++){
    const dayNum=cell-startOffset+1;
    const valid=dayNum>=1&&dayNum<=daysInMonth;
    if(!valid){html+='<div class="edet-cell" style="background:#fafafa"></div>';continue;}
    const d=new Date(y,m,dayNum);
    const iso=isoDate(d);
    const isToday=iso===isoDate(todayD);
    const isFuture=d>todayD;
    const dlogs=dayLogs[dayNum]||[];
    let cellClass='edet-cell';
    let marker='';
    if(dlogs.length>0){
      const dayEq=dlogs.reduce((s,l)=>s+(l.duration==='ครึ่งวัน'?0.5:1),0);
      if(dlogs.length===1){
        const log=dlogs[0];
        if(log.duration==='ครึ่งวัน'){cellClass+=' half';marker='<div class="edet-marker half">½</div>';}
        else{cellClass+=' full';marker='<div class="edet-marker full">✓</div>';}
      } else {
        cellClass+=' full';
        marker='<div class="edet-marker full" style="font-size:9px">'+dlogs.length+' งาน</div><div class="edet-marker full" style="font-size:9px">'+dayEq+' วัน</div>';
      }
    } else if(!isFuture){cellClass+=' miss';marker='<div class="edet-marker miss">×</div>';}
    if(!isFuture)cellClass+=' clickable';
    const click=!isFuture?'onclick="openDDS(\''+iso+'\')"':'';
    html+='<div class="'+cellClass+'" '+click+'><div class="edet-num'+(isToday?' today':'')+'">'+dayNum+'</div>'+marker+'</div>';
  }
  html+='</div></div>';

  if(tasksList.length>0){
    html+='<div style="font-size:12px;color:var(--mu);font-weight:600;text-transform:uppercase;letter-spacing:.5px;margin:18px 0 9px">รายละเอียดงาน '+tasksList.length+' รายการ</div>';
    html+='<div class="edet-task-list">';
    html+=tasksList.map(t=>{
      const durClass=t.log.duration==='ครึ่งวัน'?'half':'full';
      const w=logWage(t.log);
      const wageStr=w>0?'<div style="font-size:13px;font-weight:700;color:var(--gd);margin-top:2px">'+w.toLocaleString()+'฿</div>':'';
      return '<div class="edet-task-row" style="cursor:pointer" onclick="editLog(\''+t.iso+'\',\''+t.log.id+'\')">'+
        '<div class="edet-task-date"><div class="edet-task-day">'+t.day+'</div><div class="edet-task-mon">'+MO[m].substring(0,3)+'</div></div>'+
        '<div class="edet-task-info"><div class="edet-task-name">'+escHtml(t.log.task||'—')+'</div>'+
        (t.log.location?'<div class="edet-task-loc">📍 '+escHtml(t.log.location)+'</div>':'')+
        '<div class="edet-task-loc" style="font-size:11px;color:var(--g);margin-top:2px">✎ แตะเพื่อแก้ไข</div></div>'+
        '<div style="text-align:right;flex-shrink:0"><span class="edet-task-badge '+durClass+'">'+t.log.duration+'</span>'+wageStr+'</div>'+
        '</div>';
    }).join('');
    html+='</div>';
  } else {
    html+='<div style="text-align:center;padding:30px;color:var(--mu);font-size:14px;margin-top:14px;background:#fff;border-radius:12px;border:1.5px dashed var(--bd)">ไม่มีบันทึกงานในเดือนนี้</div>';
  }
  document.getElementById('edet-body').innerHTML=html;
}
function edetGotoDay(iso){
  if(typeof dashDay !== 'undefined'){dashDay=parseISO(iso);}
  if(typeof setView === 'function'){setView('today');}
  go('screen-dash');
}
function edetCopy(){
  const emp=MD.employees.find(e=>e.id===edetEmpId);
  if(!emp)return;
  const nm=empFull(emp);
  const {y,m}=edetMonth;
  const daysInMonth=new Date(y,m+1,0).getDate();
  let full=0,half=0,wage=0;
  const lines=[];
  for(let i=1;i<=daysInMonth;i++){
    const iso=isoDate(new Date(y,m,i));
    (logsCache[iso]||[]).filter(l=>l.name===nm).forEach(log=>{
      if(log.duration==='ครึ่งวัน')half++; else full++;
      const w=logWage(log);wage+=w;
      const locStr=log.location?' @ '+log.location:'';
      const wStr=w>0?' = '+w.toLocaleString()+'฿':'';
      lines.push(i+'/'+(m+1)+' — '+(log.task||'—')+locStr+' ('+log.duration+')'+wStr);
    });
  }
  const total=full+half*0.5;
  const wageStr=wage>0?'ค่าแรงรวม: '+wage.toLocaleString('en-US',{maximumFractionDigits:0})+'฿\n':'';
  const text='📋 รายงานพนักงาน — '+nm+'\nเดือน '+MO[m]+' '+(y+543)+'\n─────────────\nวันเต็ม: '+full+' วัน\nครึ่งวัน: '+half+' ครึ่ง\nรวมทั้งสิ้น: '+total+' วัน\n'+wageStr+'─────────────\n'+(lines.length?lines.join('\n'):'(ไม่มีบันทึก)');
  copyToClipboard(text);
}


// ===== TRUCK DETAIL =====
let tdetTruckId=null;
let tdetMonth={y:new Date().getFullYear(),m:new Date().getMonth()};
function openTruckDetail(id){tdetTruckId=id;tdetMonth={y:new Date().getFullYear(),m:new Date().getMonth()};go('screen-tdet');renderTdet();}
function tdetShiftMonth(n){
  tdetMonth.m+=n;
  if(tdetMonth.m>11){tdetMonth.m=0;tdetMonth.y++;}
  if(tdetMonth.m<0){tdetMonth.m=11;tdetMonth.y--;}
  renderTdet();
}
function renderTdet(){
  const truck=MD.trucks.find(t=>t.id===tdetTruckId);
  if(!truck){alert('ไม่พบรถ');go('screen-master');return;}
  const {y,m}=tdetMonth;
  const daysInMonth=new Date(y,m+1,0).getDate();
  const trips=[];let totalW=0;
  for(let i=1;i<=daysInMonth;i++){
    const iso=isoDate(new Date(y,m,i));
    (truckLogsCache[iso]||[]).filter(t=>t.plate===truck.plate).forEach(t=>{
      trips.push({day:i,trip:t});totalW+=parseFloat(t.weight||0);
    });
  }
  const avg=trips.length>0?Math.round(totalW/trips.length):0;
  document.getElementById('tdet-plate').textContent=truck.plate;
  document.getElementById('tdet-sub').textContent=[truck.type,truck.note].filter(Boolean).join(' · ')||'รถขนอ้อย';
  document.getElementById('tdet-trips').textContent=trips.length;
  document.getElementById('tdet-weight').textContent=(totalW/1000).toFixed(2);
  document.getElementById('tdet-avg').textContent=avg.toLocaleString();
  document.getElementById('tdet-month-label').textContent=MO[m]+' '+(y+543);
  let html='';
  if(trips.length>0){
    html+='<div style="font-size:12px;color:var(--mu);font-weight:600;margin-bottom:9px">รายการเที่ยว '+trips.length+' เที่ยว · '+totalW.toLocaleString()+' กก.</div>';
    html+='<div class="edet-task-list">';
    trips.forEach(t=>{
      const w=parseFloat(t.trip.weight||0);
      html+='<div class="edet-task-row">'+
        '<div class="edet-task-date"><div class="edet-task-day" style="color:var(--ad)">'+t.day+'</div><div class="edet-task-mon">'+MO[m].substring(0,3)+'</div></div>'+
        '<div class="edet-task-info"><div class="edet-task-name">'+w.toLocaleString()+' กก.</div>'+
        (t.trip.driver?'<div class="edet-task-loc">👨 '+escHtml(t.trip.driver)+'</div>':'')+
        (t.trip.note?'<div class="edet-task-loc">'+escHtml(t.trip.note)+'</div>':'')+'</div>'+
        '<span class="edet-task-badge half">'+(w/1000).toFixed(2)+' ตัน</span>'+
        '</div>';
    });
    html+='</div>';
  } else html+='<div style="text-align:center;padding:30px;color:var(--mu);background:#fff;border-radius:12px;border:1.5px dashed var(--bd)">ไม่มีเที่ยวในเดือนนี้</div>';
  document.getElementById('tdet-body').innerHTML=html;
}
function tdetCopy(){
  const truck=MD.trucks.find(t=>t.id===tdetTruckId);
  if(!truck)return;
  const {y,m}=tdetMonth;
  const daysInMonth=new Date(y,m+1,0).getDate();
  let trips=0,totalW=0;
  const lines=[];
  for(let i=1;i<=daysInMonth;i++){
    const iso=isoDate(new Date(y,m,i));
    (truckLogsCache[iso]||[]).filter(t=>t.plate===truck.plate).forEach(t=>{
      trips++;const w=parseFloat(t.weight||0);totalW+=w;
      const driver=t.driver?' — '+t.driver:'';
      lines.push(i+'/'+(m+1)+' — '+w.toLocaleString()+' กก.'+driver);
    });
  }
  const text='🚛 รายงานรถ — '+truck.plate+'\nเดือน '+MO[m]+' '+(y+543)+'\n─────────────\nเที่ยว: '+trips+' เที่ยว\nน้ำหนักรวม: '+totalW.toLocaleString()+' กก. ('+(totalW/1000).toFixed(2)+' ตัน)\n'+(trips>0?'เฉลี่ย: '+Math.round(totalW/trips).toLocaleString()+' กก./เที่ยว\n':'')+'─────────────\n'+(lines.length?lines.join('\n'):'(ไม่มีเที่ยว)');
  copyToClipboard(text);
}


function computeSeasonSummary(loc){
  if(!loc.seasonStart)return null;
  const start=new Date(loc.seasonStart+'T00:00:00');
  const today=new Date(); today.setHours(23,59,59,999);
  if(isNaN(start.getTime())||start>today)return null;
  let entries=0, days=0, cost=0;
  const d=new Date(start);
  while(d<=today){
    const iso=isoDate(d);
    (logsCache[iso]||[]).filter(l=>l.location===loc.name).forEach(log=>{
      entries++;
      days+=(log.duration==='ครึ่งวัน'?0.5:1);
      cost+=logWage(log);
    });
    (outsourceLogsCache[iso]||[]).filter(o=>o.location===loc.name).forEach(o=>{
      entries++;
      cost+=(o.fee||0);
    });
    d.setDate(d.getDate()+1);
  }
  const elapsedDays=Math.floor((today-start)/86400000)+1;
  return {start,entries,days,cost,elapsedDays};
}

function locLastActivity(loc){
  // Returns ISO date of most recent activity at this location, or null
  let latest=null;
  Object.keys(logsCache).forEach(iso=>{
    if((logsCache[iso]||[]).some(l=>l.location===loc.name)){
      if(!latest||iso>latest)latest=iso;
    }
  });
  Object.keys(outsourceLogsCache).forEach(iso=>{
    if((outsourceLogsCache[iso]||[]).some(o=>o.location===loc.name)){
      if(!latest||iso>latest)latest=iso;
    }
  });
  return latest;
}

function daysAgo(iso){
  const d=parseISO(iso); const today=new Date(); today.setHours(0,0,0,0);
  return Math.floor((today-d)/86400000);
}


// ===== LOCATION DETAIL =====
let ldetLocId=null;
let ldetMonth={y:new Date().getFullYear(),m:new Date().getMonth()};
function openLocDetail(id){ldetLocId=id;ldetMonth={y:new Date().getFullYear(),m:new Date().getMonth()};go('screen-ldet');renderLdet();}
function ldetShiftMonth(n){
  ldetMonth.m+=n;
  if(ldetMonth.m>11){ldetMonth.m=0;ldetMonth.y++;}
  if(ldetMonth.m<0){ldetMonth.m=11;ldetMonth.y--;}
  renderLdet();
}
function buildLocActivity(locName,y,m){
  const daysInMonth=new Date(y,m+1,0).getDate();
  const acts=[];
  for(let i=1;i<=daysInMonth;i++){
    const iso=isoDate(new Date(y,m,i));
    (logsCache[iso]||[]).filter(l=>l.location===locName).forEach(log=>{
      acts.push({type:'employee',day:i,iso,person:log.name,task:log.task||'—',duration:log.duration||'เต็มวัน',dayEq:log.duration==='ครึ่งวัน'?0.5:1,cost:logWage(log),note:log.note});
    });
    (outsourceLogsCache[iso]||[]).filter(o=>o.location===locName).forEach(o=>{
      acts.push({type:'outsource',day:i,iso,person:o.contractor,task:o.task||'—',cost:o.fee||0,dayEq:0,note:o.note});
    });
  }
  acts.sort((a,b)=>b.day-a.day);
  return acts;
}
function renderLdet(){
  const loc=MD.locations.find(l=>l.id===ldetLocId);
  if(!loc){alert('ไม่พบแปลง');go('screen-master');return;}
  const {y,m}=ldetMonth;
  const todayD=new Date();todayD.setHours(0,0,0,0);
  const daysInMonth=new Date(y,m+1,0).getDate();
  const acts=buildLocActivity(loc.name,y,m);
  const totalEntries=acts.length;
  const totalDay=acts.reduce((s,a)=>s+a.dayEq,0);
  const totalCost=acts.reduce((s,a)=>s+a.cost,0);
  const empCount=acts.filter(a=>a.type==='employee').length;
  const osCount=acts.filter(a=>a.type==='outsource').length;
  document.getElementById('ldet-name').textContent=loc.name+(loc.locId?' ['+loc.locId+']':'');
  document.getElementById('ldet-sub').textContent=[loc.locClass,loc.size?loc.size+' ไร่':''].filter(Boolean).join(' · ')||'แปลงเพาะปลูก';
  document.getElementById('ldet-entries').textContent=totalEntries;
  document.getElementById('ldet-days').textContent=totalDay;
  document.getElementById('ldet-cost').textContent=totalCost.toLocaleString('en-US',{maximumFractionDigits:0});
  document.getElementById('ldet-month-label').textContent=MO[m]+' '+(y+543);
  const firstDay=new Date(y,m,1).getDay();
  const startOffset=(firstDay===0?6:firstDay-1);
  const totalCells=startOffset+daysInMonth;
  const rows=Math.ceil(totalCells/7);
  const byDay={};
  acts.forEach(a=>{if(!byDay[a.day])byDay[a.day]={emp:0,os:0};if(a.type==='employee')byDay[a.day].emp++; else byDay[a.day].os++;});

  // SEASON SUMMARY BANNER (if seasonStart configured)
  let html='';
  const season=computeSeasonSummary(loc);
  if(season){
    const startTh=thaiDate(season.start);
    const perRaiSeason=loc.size&&loc.size>0&&season.cost>0?(season.cost/loc.size):0;
    html+='<div style="background:linear-gradient(135deg,#fff7ec,#fef3e2);border:1.5px solid #fcd9a8;border-radius:12px;padding:13px 14px;margin-bottom:14px">'+
      '<div style="font-size:11px;font-weight:700;color:var(--ad);text-transform:uppercase;letter-spacing:.5px;margin-bottom:7px">&#127807; ฤดูปัจจุบัน</div>'+
      '<div style="font-size:13px;color:var(--ad);margin-bottom:10px">เริ่ม '+startTh+' ('+season.elapsedDays+' วันที่ผ่านมา)</div>'+
      '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">'+
        '<div style="background:#fff;border-radius:9px;padding:9px 6px;text-align:center"><div style="font-size:18px;font-weight:700;color:var(--ad)">'+season.entries+'</div><div style="font-size:11px;color:var(--mu)">รายการ</div></div>'+
        '<div style="background:#fff;border-radius:9px;padding:9px 6px;text-align:center"><div style="font-size:18px;font-weight:700;color:var(--ad)">'+season.days+'</div><div style="font-size:11px;color:var(--mu)">วันงาน</div></div>'+
        '<div style="background:#fff;border-radius:9px;padding:9px 6px;text-align:center"><div style="font-size:18px;font-weight:700;color:var(--ad)">'+season.cost.toLocaleString('en-US',{maximumFractionDigits:0})+'</div><div style="font-size:11px;color:var(--mu)">ต้นทุน (฿)</div></div>'+
      '</div>'+
      (perRaiSeason>0?'<div style="margin-top:8px;padding-top:8px;border-top:1px dashed #fcd9a8;font-size:13px;color:var(--ad);text-align:center"><b>'+perRaiSeason.toLocaleString('en-US',{maximumFractionDigits:0})+'฿/ไร่</b> ในฤดูนี้</div>':'')+
      '</div>';
  }

  html+='<div style="background:#fff;border:1.5px solid var(--bd);border-radius:12px;overflow:hidden">';
  html+='<div class="edet-cal-head">'+['จ','อ','พ','พฤ','ศ','ส','อา'].map(d=>'<div class="cal-head-cell">'+d+'</div>').join('')+'</div>';
  html+='<div class="edet-cal-grid">';
  for(let cell=0;cell<rows*7;cell++){
    const dayNum=cell-startOffset+1;
    const valid=dayNum>=1&&dayNum<=daysInMonth;
    if(!valid){html+='<div class="edet-cell" style="background:#fafafa"></div>';continue;}
    const d=new Date(y,m,dayNum);
    const isToday=isoDate(d)===isoDate(todayD);
    const day=byDay[dayNum];
    let cls='edet-cell',marker='';
    if(day){
      cls+=' full';
      const parts=[];
      if(day.emp>0)parts.push('<span style="color:var(--gd);font-weight:700">'+day.emp+'</span>');
      if(day.os>0)parts.push('<span style="color:var(--ad);font-weight:700">'+day.os+'</span>');
      marker='<div class="edet-marker" style="font-size:11px">'+parts.join('+')+'</div>';
    }
    html+='<div class="'+cls+'"><div class="edet-num'+(isToday?' today':'')+'">'+dayNum+'</div>'+marker+'</div>';
  }
  html+='</div></div>';
  html+='<div style="display:flex;gap:14px;font-size:12px;color:var(--mu);margin-top:10px;align-items:center;justify-content:center">'+
    '<span><span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:var(--g)"></span> พนักงาน '+empCount+'</span>'+
    '<span><span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:var(--am)"></span> เหมา '+osCount+'</span></div>';
  if(acts.length>0){
    html+='<div style="font-size:12px;color:var(--mu);font-weight:600;text-transform:uppercase;letter-spacing:.5px;margin:18px 0 9px">รายการกิจกรรม '+acts.length+' รายการ</div>';
    html+='<div class="edet-task-list">';
    html+=acts.map(a=>{
      const isOS=a.type==='outsource';
      const badge=isOS?'<span class="os-badge">เหมา</span>':'<span class="emp-badge-style">พนักงาน</span>';
      const cost=a.cost>0?'<div style="font-size:13px;font-weight:700;color:'+(isOS?'var(--ad)':'var(--gd)')+';margin-top:2px">'+a.cost.toLocaleString()+'฿</div>':'';
      return '<div class="edet-task-row">'+
        '<div class="edet-task-date"><div class="edet-task-day" style="color:'+(isOS?'var(--ad)':'var(--gd)')+'">'+a.day+'</div><div class="edet-task-mon">'+MO[m].substring(0,3)+'</div></div>'+
        '<div class="edet-task-info"><div class="edet-task-name">'+escHtml(a.task)+'</div>'+
        '<div class="edet-task-loc">'+(isOS?'👷':'👨')+' '+escHtml(a.person)+(a.duration?' · '+a.duration:'')+'</div>'+
        (a.note?'<div class="edet-task-loc">'+escHtml(a.note)+'</div>':'')+'</div>'+
        '<div style="text-align:right;flex-shrink:0">'+badge+cost+'</div>'+
        '</div>';
    }).join('');
    html+='</div>';
  } else html+='<div style="text-align:center;padding:30px;color:var(--mu);background:#fff;border-radius:12px;border:1.5px dashed var(--bd);margin-top:14px">ไม่มีกิจกรรมในเดือนนี้</div>';
  if(loc.size&&loc.size>0&&totalCost>0){
    const perRai=totalCost/loc.size;
    html+='<div style="margin-top:14px;padding:12px 14px;background:var(--tll);border:1.5px solid #a5f3fc;border-radius:11px;display:flex;align-items:center;justify-content:space-between"><div style="font-size:13px;color:var(--tld);font-weight:600">ต้นทุน/ไร่</div><div style="font-size:18px;font-weight:700;color:var(--tld)">'+perRai.toLocaleString('en-US',{maximumFractionDigits:0})+'฿/ไร่</div></div>';
  }

  // SEASON HISTORY — show past seasons sorted newest first
  if(loc.seasonHistory && loc.seasonHistory.length>0){
    const sortedHist=[...loc.seasonHistory].sort((a,b)=>b.start.localeCompare(a.start));
    html+='<div style="font-size:12px;color:var(--mu);font-weight:600;text-transform:uppercase;letter-spacing:.5px;margin:22px 0 10px">&#128218; ฤดูที่ผ่านมา ('+sortedHist.length+')</div>';
    sortedHist.forEach((sh,idx)=>{
      const startTh=thaiDate(parseISO(sh.start));
      const endTh=thaiDate(parseISO(sh.end));
      const perRai=loc.size&&loc.size>0&&sh.cost>0?(sh.cost/loc.size):0;
      html+='<div style="background:#fff;border:1.5px solid var(--bd);border-radius:12px;padding:13px 14px;margin-bottom:10px">'+
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:9px">'+
          '<div>'+
            '<div style="font-size:12px;color:var(--mu);font-weight:600">ฤดูที่ '+(sortedHist.length-idx)+'</div>'+
            '<div style="font-size:14px;font-weight:600;color:var(--tx);margin-top:2px">'+startTh+' &mdash; '+endTh+'</div>'+
            '<div style="font-size:11px;color:var(--mu);margin-top:1px">รวม '+sh.elapsedDays+' วัน</div>'+
          '</div>'+
          '<button onclick="copySeasonHistory(\''+loc.id+'\','+idx+')" style="background:var(--tll);color:var(--tld);border:1.5px solid var(--tl);border-radius:9px;padding:8px 12px;font-size:13px;font-weight:600;cursor:pointer;font-family:Sarabun,sans-serif;flex-shrink:0;margin-left:8px">&#128203; คัดลอก</button>'+
        '</div>'+
        '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:7px">'+
          '<div style="background:var(--gl);border-radius:8px;padding:7px 5px;text-align:center"><div style="font-size:15px;font-weight:700;color:var(--gd)">'+sh.entries+'</div><div style="font-size:10px;color:var(--mu)">รายการ</div></div>'+
          '<div style="background:var(--gl);border-radius:8px;padding:7px 5px;text-align:center"><div style="font-size:15px;font-weight:700;color:var(--gd)">'+sh.days+'</div><div style="font-size:10px;color:var(--mu)">วันงาน</div></div>'+
          '<div style="background:var(--gl);border-radius:8px;padding:7px 5px;text-align:center"><div style="font-size:15px;font-weight:700;color:var(--gd)">'+sh.cost.toLocaleString('en-US',{maximumFractionDigits:0})+'</div><div style="font-size:10px;color:var(--mu)">฿</div></div>'+
        '</div>'+
        (perRai>0?'<div style="margin-top:7px;padding-top:7px;border-top:1px dashed var(--bd);font-size:12px;color:var(--mu);text-align:center"><b>'+perRai.toLocaleString('en-US',{maximumFractionDigits:0})+'฿/ไร่</b> ในฤดูนั้น</div>':'')+
        '</div>';
    });
  }

  document.getElementById('ldet-body').innerHTML=html;
}

function copySeasonHistory(locId, histIdx){
  const loc=MD.locations.find(l=>l.id===locId);
  if(!loc||!loc.seasonHistory)return;
  const sortedHist=[...loc.seasonHistory].sort((a,b)=>b.start.localeCompare(a.start));
  const sh=sortedHist[histIdx];
  if(!sh)return;
  const startTh=thaiDate(parseISO(sh.start));
  const endTh=thaiDate(parseISO(sh.end));
  const perRai=loc.size&&loc.size>0&&sh.cost>0?(sh.cost/loc.size):0;
  const perRaiStr=perRai>0?'ต้นทุน/ไร่: '+perRai.toLocaleString('en-US',{maximumFractionDigits:0})+'฿/ไร่\n':'';
  const text=
    '🌾 ฤดูที่ผ่านมา — '+loc.name+(loc.locId?' ['+loc.locId+']':'')+'\n'+
    'ระยะเวลา: '+startTh+' — '+endTh+'\n'+
    'รวม '+sh.elapsedDays+' วัน\n'+
    '─────────────\n'+
    'จำนวนรายการ: '+sh.entries+' รายการ\n'+
    'วันงานรวม: '+sh.days+' วัน\n'+
    'ต้นทุนรวม: '+sh.cost.toLocaleString('en-US',{maximumFractionDigits:0})+'฿\n'+
    perRaiStr;
  if(navigator.clipboard&&navigator.clipboard.writeText){
    navigator.clipboard.writeText(text).then(()=>showOk('คัดลอกแล้ว!','สามารถวางในแอป LINE หรือที่อื่นได้')).catch(()=>fallbackCopy(text));
  } else fallbackCopy(text);
}
function ldetCopy(){
  const loc=MD.locations.find(l=>l.id===ldetLocId);
  if(!loc)return;
  const {y,m}=ldetMonth;
  const acts=buildLocActivity(loc.name,y,m);
  const totalCost=acts.reduce((s,a)=>s+a.cost,0);
  const totalDay=acts.reduce((s,a)=>s+a.dayEq,0);
  const empC=acts.filter(a=>a.type==='employee').length;
  const osC=acts.filter(a=>a.type==='outsource').length;
  const sorted=[...acts].sort((a,b)=>a.day-b.day);
  const lines=sorted.map(a=>{
    const tag=a.type==='outsource'?'[เหมา]':'[พนักงาน]';
    const dur=a.duration?' ('+a.duration+')':'';
    const cost=a.cost>0?' = '+a.cost.toLocaleString()+'฿':'';
    return a.day+'/'+(m+1)+' '+tag+' '+a.task+' — '+a.person+dur+cost;
  });
  let perRaiStr='';
  if(loc.size&&loc.size>0&&totalCost>0){perRaiStr='ต้นทุน/ไร่: '+(totalCost/loc.size).toLocaleString('en-US',{maximumFractionDigits:0})+'฿/ไร่\n';}
  const text='🌾 รายงานแปลง — '+loc.name+(loc.locId?' ['+loc.locId+']':'')+'\nเดือน '+MO[m]+' '+(y+543)+'\n─────────────\nพนักงาน: '+empC+' รายการ\nเหมา: '+osC+' รายการ\nรวมวันงาน: '+totalDay+' วัน\nต้นทุนรวม: '+totalCost.toLocaleString('en-US',{maximumFractionDigits:0})+'฿\n'+perRaiStr+'─────────────\n'+(lines.length?lines.join('\n'):'(ไม่มีกิจกรรม)');
  copyToClipboard(text);
}

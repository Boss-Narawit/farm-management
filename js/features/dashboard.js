/* ============================================================
 * dashboard.js — Dashboard — today view, monthly view, day detail sheet
 *
 * Contents: renderDash, renderToday, renderMonth, openDDS, closeDDS, ddsSwitchToday
 * ============================================================ */

// ===== DASHBOARD =====
function setView(v){
  dashView=v;
  document.getElementById('vt-today').classList.toggle('active',v==='today');
  document.getElementById('vt-month').classList.toggle('active',v==='month');
  renderDash();
}

function renderDash(){
  if(dashView==='today') renderToday();
  else renderMonth();
}

// ---- TODAY VIEW ----
function renderToday(){
  const iso=isoDate(dashDay);
  const todayIso=isoDate(new Date());
  const isToday=iso===todayIso;
  const isFuture=dashDay>new Date(todayIso);
  const isHoliday=!!holidays[iso];
  const holidayReason=isHoliday?holidays[iso]:'';
  const logs=logsCache[iso]||[];
  const loggedSet=new Set(logs.map(l=>l.name));
  const emps=MD.employees;
  const logged=emps.filter(e=>loggedSet.has(empFull(e))).length;
  const missing=(isFuture||isHoliday)?0:emps.filter(e=>!loggedSet.has(empFull(e))).length;

  let html=`
  <div class="date-nav">
    <button class="dn-btn" onclick="shiftDay(-1)">‹</button>
    <div class="dn-center">
      <div class="dn-main">วัน${DOW[dashDay.getDay()]}ที่ ${thaiDate(dashDay)}</div>
      <div class="dn-sub">${isToday?'วันนี้':isFuture?'อนาคต':'ย้อนหลัง'}</div>
    </div>
    <button class="dn-btn" onclick="shiftDay(1)">›</button>
    <button class="today-btn" onclick="goToday()">วันนี้</button>
  </div>
  <div class="stat-row">
    <div class="stat-card ok"><div class="stat-num">${logged}</div><div class="stat-lbl">บันทึกแล้ว</div></div>
    <div class="stat-card warn"><div class="stat-num">${(isFuture||isHoliday)?'—':missing}</div><div class="stat-lbl">${isHoliday?'หยุด':'ยังไม่บันทึก'}</div></div>
    <div class="stat-card tot"><div class="stat-num">${emps.length}</div><div class="stat-lbl">พนักงานทั้งหมด</div></div>
  </div>
  ${isHoliday
    ? `<div style="background:#dbeafe;border:1.5px solid #93c5fd;border-radius:11px;padding:11px 14px;margin-bottom:14px;display:flex;align-items:center;gap:10px">
        <span style="font-size:22px">🌴</span>
        <div style="flex:1"><div style="font-weight:700;color:#1e40af">วันหยุด</div>${holidayReason?`<div style="font-size:13px;color:#1e3a8a;margin-top:2px">${escHtml(holidayReason)}</div>`:''}</div>
        <button onclick="toggleHoliday('${iso}')" style="background:#fff;border:1.5px solid #93c5fd;color:#1e40af;border-radius:9px;padding:6px 11px;font-size:13px;font-weight:600;cursor:pointer;font-family:Sarabun,sans-serif">ยกเลิก</button>
      </div>`
    : (isFuture?'':`<button onclick="toggleHoliday('${iso}')" style="width:100%;background:#fff;border:1.5px dashed var(--bd);color:var(--mu);border-radius:11px;padding:10px;font-size:13px;font-weight:500;cursor:pointer;font-family:Sarabun,sans-serif;margin-bottom:14px">🌴 ทำเครื่องหมายเป็น "วันหยุด"</button>`)
  }
  <div style="font-size:12px;color:var(--mu);font-weight:600;text-transform:uppercase;letter-spacing:.5px;margin-bottom:9px">รายชื่อพนักงาน</div>`;

  if(emps.length===0){
    html+=`<div class="empty-dash">ยังไม่มีรายชื่อพนักงาน<br>ไปที่ <b>ข้อมูลพนักงาน / รถ</b> เพื่อเพิ่มรายชื่อก่อน</div>`;
  } else {
    html+=emps.map(e=>{
      const nm=empFull(e);
      const myLogs=logs.filter(l=>l.name===nm);
      const done=myLogs.length>0;
      const cls=isFuture?'':done?'logged':'unlogged';
      const dayTotal=myLogs.reduce((s,l)=>s+(l.duration==='ครึ่งวัน'?0.5:1),0);
      const onclick=(!isFuture&&!done)?`onclick="openQL('${nm.replace(/'/g,"\\'")}','${iso}')"` :`onclick="openEmpDetail('${e.id}')"`;
      let badge;
      if(isFuture){badge=`<span class="ebadge" style="background:#f3f4f6;color:var(--mu)">—</span>`;}
      else if(!done){badge=`<span class="ebadge unlogged">⚠ บันทึก</span>`;}
      else if(myLogs.length===1){badge=`<span class="ebadge logged">✓ ${myLogs[0].duration||'เต็มวัน'}</span>`;}
      else {badge=`<span class="ebadge logged">✓ ${myLogs.length} งาน · ${dayTotal} วัน</span>`;}
      const tasksHTML=myLogs.length>0?myLogs.map(l=>`<div class="edetail" style="margin-top:3px;color:var(--g)">• ${escHtml(l.task||'')}${l.location?' <span style="color:var(--mu)">📍 '+escHtml(l.location)+'</span>':''}</div>`).join(''):'';
      return `<div class="emp-card ${cls}" ${onclick}>
        <div class="eav ${isFuture?'logged':cls}" style="${isFuture?'background:#f3f4f6;color:var(--mu)':''}">${e.first[0]}</div>
        <div style="flex:1;min-width:0">
          <div class="ename">${nm}</div>
          <div class="edetail">${[e.nationality,e.birthYear?`อายุ ${new Date().getFullYear()+543-e.birthYear} ปี`:''].filter(Boolean).join(' · ')}</div>
          ${tasksHTML}
        </div>
        ${badge}
      </div>`;
    }).join('');
  }
  document.getElementById('dash-scroll').innerHTML=html;
}

function shiftDay(n){dashDay=new Date(dashDay.getTime()+n*86400000);renderToday();}
function goToday(){dashDay=new Date();dashDay.setHours(0,0,0,0);renderToday();}

// ---- QUICK LOG ----
function openQL(name,dateIso){
  qlEmpName=name; qlDateIso=dateIso;
  document.getElementById('ql-name').textContent=name;
  document.getElementById('ql-date-label').textContent=thaiDate(parseISO(dateIso));
  // Pre-fill from last quick log if it was the same date
  const lastTask=localStorage.getItem('fm_lastQLTask')||'';
  const lastDate=localStorage.getItem('fm_lastQLDate')||'';
  if(lastTask && lastDate===dateIso){
    document.getElementById('ql-task').value=lastTask;
  } else {
    document.getElementById('ql-task').value='';
  }
  setQLDur('เต็มวัน');
  document.getElementById('qlog-bd').classList.add('open');
  setTimeout(()=>document.getElementById('ql-task').focus(),300);
}
function closeQL(){document.getElementById('qlog-bd').classList.remove('open');}
function setQLDur(v){qlDur=v;document.getElementById('ql-full').classList.toggle('sel',v==='เต็มวัน');document.getElementById('ql-half').classList.toggle('sel',v==='ครึ่งวัน');}

async function confirmQL(){
  const task=document.getElementById('ql-task').value.trim();
  if(!task){document.getElementById('ql-task').focus();document.getElementById('ql-task').style.borderColor='var(--rd)';return;}
  document.getElementById('ql-task').style.borderColor='';
  const id=Date.now().toString()+Math.random().toString(36).slice(2,6);
  const payload={action:'addEmployee',id,date:qlDateIso,name:qlEmpName,task,duration:qlDur,note:'',loggedBy:user.displayName,timestamp:new Date().toISOString()};
  closeQL();
  await sendAPI(payload,`บันทึก ${qlEmpName} สำเร็จ`,()=>{
    if(!logsCache[qlDateIso])logsCache[qlDateIso]=[];
    logsCache[qlDateIso].push({id,name:qlEmpName,task,duration:qlDur,location:'',note:'',loggedBy:user.displayName,syncStatus:'pending'});
    saveLogs();
    // Remember last-used for quick fill next time (same date)
    localStorage.setItem('fm_lastQLTask',task);
    localStorage.setItem('fm_lastQLDate',qlDateIso);
    renderToday();
  });
}

// ---- MONTHLY VIEW ----
function renderMonth(){
  const {y,m}=dashMonth;
  const todayD=new Date(); todayD.setHours(0,0,0,0);
  const emps=MD.employees;

  // collect all logs for this month
  const daysInMonth=new Date(y,m+1,0).getDate();
  const allDates=Array.from({length:daysInMonth},(_,i)=>{
    const d=new Date(y,m,i+1);return isoDate(d);
  });

  // payroll summary per employee — multi-job + task-based wage
  const payroll=emps.map(e=>{
    const nm=empFull(e);
    let full=0,half=0,wage=0,hasUnpriced=false;
    allDates.forEach(iso=>{
      const myLogs=(logsCache[iso]||[]).filter(l=>l.name===nm);
      myLogs.forEach(log=>{
        if(log.duration==='ครึ่งวัน')half++; else full++;
        const w=logWage(log);
        if(w>0)wage+=w; else if(log.task)hasUnpriced=true;
      });
    });
    const total=full+half*0.5;
    return{emp:e,nm,full,half,total,wage,hasUnpriced};
  });

  // month nav
  let html=`
  <div class="month-nav">
    <button class="dn-btn" onclick="shiftMonth(-1)">‹</button>
    <div class="mn-center">${MO[m]} ${y+543}</div>
    <button class="dn-btn" onclick="shiftMonth(1)">›</button>
  </div>`;

  // payroll banner
  if(emps.length>0){
    html+=`<div class="pay-banner">
      <div class="pay-title">สรุปค่าแรง — ${MO[m]} ${y+543}</div>
      <div class="pay-grid">`;
    let grandTotal=0;
    html+=payroll.map(p=>{
      grandTotal+=p.wage;
      const wageDisplay=p.wage>0
        ? `<div style="font-size:16px;font-weight:700;color:var(--gd)">${p.wage.toLocaleString('en-US',{maximumFractionDigits:0})}฿</div>${p.hasUnpriced?'<div style="font-size:10px;color:var(--am)">มีงานยังไม่ตั้งราคา</div>':''}`
        : (p.total>0 ? `<div style="font-size:11px;color:var(--am);font-style:italic">งานยังไม่ตั้งราคา</div>` : `<div style="font-size:11px;color:var(--mu)">—</div>`);
      return `<div class="pay-row" onclick="openEmpDetail('${p.emp.id}')" style="cursor:pointer">
        <div class="pay-av">${p.emp.first[0]}</div>
        <div style="flex:1;min-width:0">
          <div class="pay-name">${p.nm}</div>
          <div style="font-size:12px;color:var(--mu)">${p.full} วัน${p.half>0?' + '+p.half+' ครึ่ง':''} = ${p.total} วัน</div>
        </div>
        <div style="text-align:right;flex-shrink:0">${wageDisplay}</div>
      </div>`;
    }).join('');
    if(grandTotal>0){
      html+=`<div style="margin-top:10px;padding-top:10px;border-top:1.5px dashed #9FE1CB;display:flex;align-items:center;justify-content:space-between"><div style="font-size:14px;font-weight:600;color:var(--gd)">รวมค่าแรงทั้งหมด</div><div style="font-size:20px;font-weight:700;color:var(--gd)">${grandTotal.toLocaleString('en-US',{maximumFractionDigits:0})}฿</div></div>`;
    }
    html+=`</div></div>`;
    html+=`<button class="print-all-btn" onclick="printAllEmpsMonth(${y},${m})">🖨 พิมพ์สรุปค่าแรง — ${MO[m]} ${y+543}</button>`;
  }

  // calendar
  html+=`<div style="font-size:12px;color:var(--mu);font-weight:600;text-transform:uppercase;letter-spacing:.5px;margin-bottom:9px">ปฏิทินการทำงาน</div>`;

  const totalEmp=emps.length;
  const {head,cells}=buildCalGrid(y,m,(dn,iso,isToday,isFuture)=>{
    if(!dn)return '<div class="cal-cell" style="background:#fafafa"></div>';
    const dayLogs=logsCache[iso]||[];
    const loggedNames=new Set(dayLogs.map(l=>l.name));
    const loggedCount=emps.filter(e=>loggedNames.has(empFull(e))).length;
    const missingCount=totalEmp-loggedCount;
    let dots='';
    if(!isFuture&&totalEmp>0){
      const fd=Math.min(loggedCount,3);
      const md=Math.min(missingCount,3-fd);
      for(let i=0;i<fd;i++)dots+='<div class="cdot full"></div>';
      for(let i=0;i<md;i++)dots+='<div class="cdot miss"></div>';
      if(loggedCount+missingCount>3)dots+='<div style="font-size:9px;color:var(--mu)">+</div>';
    }
    return '<div class="cal-cell'+(!isFuture?' clickable':'')+'"'+(!isFuture?' onclick="openDDS(\''+iso+'\')"':'')+'>'+
      '<div class="cal-num'+(isToday?' today':'')+'">'+dn+'</div>'+
      '<div class="cal-dots">'+dots+'</div></div>';
  });
  html+='<div class="cal-wrap"><div class="cal-head">'+head+'</div><div class="cal-grid">'+cells+'</div></div>';

  // legend
  html+=`<div style="display:flex;gap:14px;font-size:12px;color:var(--mu);margin-top:10px;align-items:center;justify-content:center">
    <span style="display:flex;align-items:center;gap:4px"><span style="width:10px;height:10px;border-radius:50%;background:var(--g);display:inline-block"></span>บันทึกแล้ว</span>
    <span style="display:flex;align-items:center;gap:4px"><span style="width:10px;height:10px;border-radius:50%;background:#fca5a5;display:inline-block"></span>ยังไม่บันทึก</span>
  </div>`;

  document.getElementById('dash-scroll').innerHTML=html;
}

function shiftMonth(n){
  dashMonth.m+=n;
  if(dashMonth.m>11){dashMonth.m=0;dashMonth.y++;}
  if(dashMonth.m<0){dashMonth.m=11;dashMonth.y--;}
  renderMonth();
}


// ===== DAY DETAIL SHEET =====
let ddsCurrentIso = '';

function openDDS(iso) {
  ddsCurrentIso = iso;
  const d = parseISO(iso);
  const today = new Date(); today.setHours(0,0,0,0);
  const isToday = iso === isoDate(today);
  const isFuture = d > today;
  const DOW_TH = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัส','ศุกร์','เสาร์'];

  document.getElementById('dds-title').textContent = `วัน${DOW_TH[d.getDay()]}ที่ ${thaiDate(d)}`;
  document.getElementById('dds-sub').textContent = isToday ? 'วันนี้' : 'ข้อมูลย้อนหลัง';

  const logs = logsCache[iso] || [];
  const emps = MD.employees.filter(e => (e.status||'active')==='active');

  let html = '';
  if (emps.length === 0) {
    html = '<div style="padding:24px 0;text-align:center;color:var(--mu);font-size:15px">ยังไม่มีพนักงาน</div>';
  } else {
    emps.forEach(e => {
      const nm = empFull(e);
      const myLogs = logs.filter(l => l.name === nm);
      if (myLogs.length === 0) {
        const rowClick = !isFuture ? `onclick="closeDDS();openQL('${nm.replace(/'/g,"\\'")}','${ddsCurrentIso}')"` : '';
        const rowStyle = !isFuture ? 'cursor:pointer' : '';
        html += `<div class="dds-row" ${rowClick} style="${rowStyle}">
          <div class="dds-av miss">${e.first[0]}</div>
          <div style="flex:1;min-width:0">
            <div class="dds-emp-name">${nm}</div>
            <div class="dds-emp-miss">${isFuture ? '—' : 'ไม่มีการบันทึก · แตะเพื่อบันทึก'}</div>
          </div>
          <span class="dds-badge miss">${isFuture ? '—' : 'ขาด'}</span>
        </div>`;
      } else {
        myLogs.forEach((log, idx2) => {
          const durClass = log.duration === 'ครึ่งวัน' ? 'half' : 'full';
          html += `<div class="dds-row" onclick="editLog('${ddsCurrentIso}','${log.id}')" style="cursor:pointer">
            <div class="dds-av logged">${idx2===0?e.first[0]:'•'}</div>
            <div style="flex:1;min-width:0">
              <div class="dds-emp-name">${nm}${myLogs.length>1?' <span style="font-size:11px;background:var(--gl);color:var(--gd);padding:1px 7px;border-radius:8px;font-weight:600;margin-left:4px">งาน '+(idx2+1)+'/'+myLogs.length+'</span>':''}</div>
              <div class="dds-emp-task">${escHtml(log.task||'—')}${log.location?' · 📍'+escHtml(log.location):''}</div>
              <div class="dds-emp-by">บันทึกโดย ${escHtml(log.loggedBy||'—')} · ✎ แตะเพื่อแก้ไข</div>
            </div>
            <span class="dds-badge ${durClass}">${log.duration || 'เต็มวัน'}</span>
          </div>`;
        });
      }
    });
  }

  document.getElementById('dds-body').innerHTML = html;
  const btn = document.getElementById('dds-goto-btn');
  btn.textContent = `ดูรายละเอียดวันนี้ › ${thaiDate(d)}`;
  document.getElementById('dds-bd').classList.add('open');
}

function closeDDS() {
  document.getElementById('dds-bd').classList.remove('open');
}

function ddsSwitchToday() {
  closeDDS();
  // switch to today view at that date
  dashDay = parseISO(ddsCurrentIso);
  setView('today');
}

/* ============================================================
 * ui.js — UI helpers — navigation, modals, toasts, combo box
 *
 * Contents: go, showOk, showLoad/hideLoad, showE/clearE, openCombo/filterCombo/closeDropdown, modal helpers, undo toast
 * ============================================================ */

// ===== SCREEN NAV =====
function go(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo(0,0); closeAllCombos();
  if(id==='screen-dash') renderDash();
  if(id==='screen-master') renderAll();
}


// ===== COMBO BOX =====
function empFull(e){return e.first+(e.last?' '+e.last:'');}
function empSub(e){let s=e.nationality||'';if(e.birthYear)s+=(s?' · อายุ ':'อายุ ')+(new Date().getFullYear()+543-e.birthYear)+' ปี';return s;}

function findTaskByName(taskName){
  if(!taskName||!MD.tasks)return null;
  return MD.tasks.find(t=>t.name===taskName)||null;
}
function logWage(log){
  if(!log||!log.task)return 0;
  const task=findTaskByName(log.task);
  if(!task||!task.dailyRate)return 0;
  return log.duration==='ครึ่งวัน'?task.dailyRate*0.5:task.dailyRate;
}

// ===== CALENDAR GRID BUILDER =====
// Shared by dashboard (renderMonth) and details (renderEdet, renderLdet).
// cellFn(dayNum|null, iso|null, isToday, isFuture) → cell HTML string
function buildCalGrid(y,m,cellFn){
  const hd=['จ','อ','พ','พฤ','ศ','ส','อา'];
  const fd=new Date(y,m,1).getDay();
  const off=fd===0?6:fd-1;
  const dim=new Date(y,m+1,0).getDate();
  const rows=Math.ceil((off+dim)/7);
  const todayIso=isoDate(new Date());
  const now=new Date();now.setHours(0,0,0,0);
  const head=hd.map(d=>'<div class="cal-head-cell">'+d+'</div>').join('');
  let cells='';
  for(let c=0;c<rows*7;c++){
    const dn=c-off+1;
    const valid=dn>=1&&dn<=dim;
    if(!valid){cells+=cellFn(null,null,false,false);continue;}
    const d=new Date(y,m,dn);
    const iso=isoDate(d);
    cells+=cellFn(dn,iso,iso===todayIso,d>now);
  }
  return {head,cells};
}

function oCombo(inp,drop,type){renderDrop(inp,drop,type,'');document.getElementById(drop).classList.add('open');}
function fCombo(inp,drop,type){renderDrop(inp,drop,type,document.getElementById(inp).value);document.getElementById(drop).classList.add('open');}
function renderDrop(inp,drop,type,q){
  const el=document.getElementById(drop);
  const ql=(q||'').toLowerCase().trim();
  let items=[];
  if(type==='employees'){
    items=MD.employees.filter(e=>(e.status||'active')==='active'&&(!ql||(e.first+' '+(e.last||'')).toLowerCase().includes(ql)));
    if(!items.length){el.innerHTML='<div class="ci-empty">ไม่พบ — พิมพ์ชื่อเองได้</div>';return;}
    el.innerHTML=items.map(e=>{
      const nm=empFull(e);
      return '<div class="ci-item" data-val="'+escAttr(nm)+'" onmousedown="selComboFromData(this,\''+inp+'\',\''+drop+'\')">'+
        '<div style="width:32px;height:32px;border-radius:8px;background:#e8f5ee;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;color:#1a8f5c;flex-shrink:0">'+escHtml(e.first[0]||'')+'</div>'+
        '<div><div class="ci-main">'+escHtml(nm)+'</div><div class="ci-sub">'+escHtml(empSub(e))+'</div></div></div>';
    }).join('');
  } else if(type==='trucks'){
    items=MD.trucks.filter(t=>!ql||t.plate.toLowerCase().includes(ql));
    if(!items.length){el.innerHTML='<div class="ci-empty">ไม่พบ — พิมพ์เองได้</div>';return;}
    el.innerHTML=items.map(t=>{
      return '<div class="ci-item" data-val="'+escAttr(t.plate)+'" onmousedown="selComboFromData(this,\''+inp+'\',\''+drop+'\')">'+
        '<div style="width:32px;height:32px;border-radius:8px;background:#fef3e2;display:flex;align-items:center;justify-content:center;font-size:17px">&#128665;</div>'+
        '<div><div class="ci-main">'+escHtml(t.plate)+'</div><div class="ci-sub">'+escHtml(t.type||'')+'</div></div></div>';
    }).join('');
  } else if(type==='locations'){
    items=(MD.locations||[]).filter(l=>!ql||l.name.toLowerCase().includes(ql)||(l.locId||'').toLowerCase().includes(ql));
    if(!items.length){el.innerHTML='<div class="ci-empty">ไม่พบแปลง — พิมพ์เองได้</div>';return;}
    el.innerHTML=items.map(l=>{
      const sub=[l.locClass,l.size?l.size+' ไร่':'',l.location].filter(Boolean).join(' · ');
      const idBadge=l.locId?' ['+l.locId+']':'';
      return '<div class="ci-item" data-val="'+escAttr(l.name)+'" onmousedown="selComboFromData(this,\''+inp+'\',\''+drop+'\')">'+
        '<div style="width:32px;height:32px;border-radius:8px;background:var(--tll);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0">&#127806;</div>'+
        '<div><div class="ci-main">'+escHtml(l.name)+escHtml(idBadge)+'</div><div class="ci-sub">'+escHtml(sub)+'</div></div></div>';
    }).join('');
  } else if(type==='tasks'){
    items=(MD.tasks||[]).filter(t=>!ql||t.name.toLowerCase().includes(ql)||(t.category||'').toLowerCase().includes(ql));
    if(!items.length){el.innerHTML='<div class="ci-empty">ไม่พบงาน — พิมพ์เองได้</div>';return;}
    el.innerHTML=items.map(t=>{
      return '<div class="ci-item" data-val="'+escAttr(t.name)+'" onmousedown="selComboFromData(this,\''+inp+'\',\''+drop+'\')">'+
        '<div style="width:32px;height:32px;border-radius:8px;background:var(--pl);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0">&#128296;</div>'+
        '<div><div class="ci-main">'+escHtml(t.name)+'</div><div class="ci-sub">'+escHtml(t.category||'')+'</div></div></div>';
    }).join('');
  } else if(type==='contractors'){
    items=(MD.contractors||[]).filter(co=>!ql||co.name.toLowerCase().includes(ql)||(co.specialty||'').toLowerCase().includes(ql));
    if(!items.length){el.innerHTML='<div class="ci-empty">ไม่พบผู้รับเหมา — พิมพ์เองได้</div>';return;}
    el.innerHTML=items.map(co=>{
      return '<div class="ci-item" data-val="'+escAttr(co.name)+'" onmousedown="selComboFromData(this,\''+inp+'\',\''+drop+'\')">'+
        '<div style="width:32px;height:32px;border-radius:8px;background:#fef3e2;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0">&#128119;</div>'+
        '<div><div class="ci-main">'+escHtml(co.name)+'</div><div class="ci-sub">'+escHtml(co.specialty||co.phone||'')+'</div></div></div>';
    }).join('');
  }
}
function escHtml(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function escAttr(s){return String(s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#39;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function selComboFromData(el,inp,drop){
  const v=el.getAttribute('data-val')||'';
  document.getElementById(inp).value=v;
  document.getElementById(drop).classList.remove('open');
}
function selCombo(inp,drop,v){document.getElementById(inp).value=v;document.getElementById(drop).classList.remove('open');}
function dClose(d){setTimeout(()=>document.getElementById(d).classList.remove('open'),180);}
function closeAllCombos(){document.querySelectorAll('.cdrop').forEach(d=>d.classList.remove('open'));}


// ===== UNDO TOAST =====
let _undoTimer=null;
function showUndoToast(message, undoFn){
  // remove any existing toast
  const existing=document.getElementById('undo-toast');
  if(existing)existing.remove();
  if(_undoTimer)clearTimeout(_undoTimer);

  const toast=document.createElement('div');
  toast.id='undo-toast';
  toast.className='undo-toast';
  toast.innerHTML='<span>'+message+'</span><button id="undo-btn">ดึงกลับ</button>';
  document.body.appendChild(toast);

  const dismiss=()=>{
    toast.classList.add('hiding');
    setTimeout(()=>{if(toast.parentNode)toast.remove();},300);
  };

  document.getElementById('undo-btn').onclick=()=>{
    if(_undoTimer)clearTimeout(_undoTimer);
    try{undoFn();}catch(e){console.error(e);}
    dismiss();
  };

  _undoTimer=setTimeout(dismiss,7000); // 7-second window
}


// ===== UI HELPERS =====
function showLoad(m){document.getElementById('lt').textContent=m;document.getElementById('lov').classList.add('show');}
function hideLoad(){document.getElementById('lov').classList.remove('show');}
function showOk(title,msg){document.getElementById('s-title').textContent=title;document.getElementById('s-msg').textContent=msg;document.getElementById('sov').classList.add('show');}
function closeSov(){document.getElementById('sov').classList.remove('show');}
function showE(id,m){const e=document.getElementById(id);e.textContent=m;e.classList.add('show');e.scrollIntoView({behavior:'smooth',block:'center'});}
function clearE(id){document.getElementById(id).classList.remove('show');}

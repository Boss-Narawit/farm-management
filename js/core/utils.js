/* ============================================================
 * utils.js — Date/string utilities
 *
 * Contents: isoDate, parseISO, thaiDate, escHtml, escAttr, fallbackCopy, MO/DOW constants
 * ============================================================ */

// ===== DATES =====
const MO=['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
const DOW=['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัส','ศุกร์','เสาร์'];
const DOW_S=['อา','จ','อ','พ','พฤ','ศ','ส'];

function isoDate(d){return d.toISOString().split('T')[0];}
function parseISO(s){if(!s||!/^\d{4}-\d{2}-\d{2}$/.test(s))return new Date(NaN);const p=s.split('-');return new Date(+p[0],+p[1]-1,+p[2]);}
function thaiDate(d){if(typeof d==='string')d=parseISO(d);return `${d.getDate()} ${MO[d.getMonth()]} ${d.getFullYear()+543}`;}

function setTodayForms(){
  const v=isoDate(new Date());
  ['emp-date','truck-date'].forEach(id=>{document.getElementById(id).value=v;});
  updateDD('emp-date','emp-dd'); updateDD('truck-date','truck-dd');
}
function updateDD(inp,disp){
  const v=document.getElementById(inp).value;
  if(!v)return;
  document.getElementById(disp).textContent=thaiDate(parseISO(v));
}


// ===== CLIPBOARD HELPER =====
function copyToClipboard(text){
  if(navigator.clipboard&&navigator.clipboard.writeText){
    navigator.clipboard.writeText(text).then(()=>showOk('คัดลอกแล้ว!','สามารถวางในแอป LINE หรือที่อื่นได้')).catch(()=>fallbackCopy(text));
  } else fallbackCopy(text);
}
function fallbackCopy(text){
  const ta=document.createElement('textarea');
  ta.value=text;ta.style.position='fixed';ta.style.left='-9999px';
  document.body.appendChild(ta);ta.select();
  try{document.execCommand('copy');showOk('คัดลอกแล้ว!','สามารถวางในแอป LINE หรือที่อื่นได้');}
  catch(e){alert('ไม่สามารถคัดลอกได้');}
  document.body.removeChild(ta);
}

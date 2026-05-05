/* ============================================================
 * backup.js — Export/import data backup
 *
 * Contents: exportBackup, importBackup
 * ============================================================ */

// ===== BACKUP / RESTORE =====
function _buildBackupData(){
  return {
    version:2,
    exportedAt:new Date().toISOString(),
    masterData:MD,
    logs:logsCache,
    truckLogs:truckLogsCache,
    outsourceLogs:outsourceLogsCache,
    holidays:holidays,
    fertLogs:fertLogCache
  };
}
function _backupSummary(){
  const countEntries=cache=>Object.values(cache).reduce((n,arr)=>n+arr.length,0);
  return 'พนักงาน '+(MD.employees||[]).length+' คน · บันทึกงาน '+countEntries(logsCache)+' รายการ · รถ '+countEntries(truckLogsCache)+' เที่ยว · เหมา '+countEntries(outsourceLogsCache)+' รายการ';
}
function _backupFilename(){
  return 'farm-backup-'+isoDate(new Date())+'.json';
}
function exportBackup(){
  const json=JSON.stringify(_buildBackupData(),null,2);
  const blob=new Blob([json],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;
  a.download=_backupFilename();
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showOk('ดาวน์โหลดสำเร็จ!',_backupSummary());
}
async function shareBackup(){
  const json=JSON.stringify(_buildBackupData(),null,2);
  const file=new File([json],_backupFilename(),{type:'application/json'});
  if(navigator.canShare&&navigator.canShare({files:[file]})){
    try{
      await navigator.share({files:[file],title:'ข้อมูลสำรองฟาร์ม',text:_backupSummary()});
    }catch(e){
      if(e.name!=='AbortError')showOk('แชร์ไม่สำเร็จ','ลองดาวน์โหลดแทน');
    }
  } else {
    exportBackup();
  }
}

function exportPayrollCSV(y,m){
  const dim=new Date(y,m+1,0).getDate();
  const dates=Array.from({length:dim},(_,i)=>isoDate(new Date(y,m,i+1)));
  const header=['ชื่อ-นามสกุล','สัญชาติ','วันเต็ม','ครึ่งวัน','รวมวัน','ค่าแรงรวม (฿)'];
  const rows=[];
  MD.employees.filter(e=>(e.status||'active')==='active').forEach(e=>{
    const nm=empFull(e);
    let full=0,half=0,wage=0;
    dates.forEach(iso=>{
      (logsCache[iso]||[]).filter(l=>l.name===nm).forEach(l=>{
        if(l.duration==='ครึ่งวัน')half++; else full++;
        wage+=logWage(l);
      });
    });
    if(full+half)rows.push([nm,e.nationality||'',full,half,full+half*0.5,wage]);
  });
  if(!rows.length){alert('ไม่มีข้อมูลค่าแรงในเดือนนี้');return;}
  const csv='\uFEFF'+[header,...rows].map(r=>r.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\r\n');
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download='payroll-'+y+'-'+String(m+1).padStart(2,'0')+'.csv';
  document.body.appendChild(a);a.click();document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function importBackup(event){
  const file=event.target.files[0];
  if(!file)return;
  const reader=new FileReader();
  reader.onload=function(e){
    try{
      const data=JSON.parse(e.target.result);
      if(!data.masterData||!data.logs){
        alert('ไฟล์นี้ไม่ใช่ไฟล์สำรองที่ถูกต้อง');
        return;
      }
      // Show preview before confirming
      const empCount=(data.masterData.employees||[]).length;
      let logCount=0;
      Object.values(data.logs||{}).forEach(arr=>logCount+=arr.length);
      let truckCount=0;
      Object.values(data.truckLogs||{}).forEach(arr=>truckCount+=arr.length);
      let osCount=0;
      Object.values(data.outsourceLogs||{}).forEach(arr=>osCount+=arr.length);
      const exportDate=data.exportedAt?new Date(data.exportedAt).toLocaleDateString('th-TH'):'ไม่ทราบ';

      if(confirm(
        'ไฟล์สำรองจาก '+exportDate+'\n\n'+
        'ประกอบด้วย:\n'+
        '• พนักงาน '+empCount+' คน\n'+
        '• บันทึกงาน '+logCount+' รายการ\n'+
        '• รถ '+truckCount+' เที่ยว\n'+
        '• งานเหมา '+osCount+' รายการ\n\n'+
        '⚠️ ข้อมูลปัจจุบันทั้งหมดจะถูกแทนที่!\nต้องการดำเนินการต่อ?'
      )){
        MD=data.masterData;
        logsCache=data.logs||{};
        truckLogsCache=data.truckLogs||{};
        outsourceLogsCache=data.outsourceLogs||{};
        holidays=data.holidays||{};
        fertLogCache=data.fertLogs||{};
        saveMD();
        saveLogs();
        showOk('กู้คืนสำเร็จ!','โหลดข้อมูลใหม่แล้ว — กดตกลงเพื่อรีเฟรช');
        setTimeout(()=>window.location.reload(),1500);
      }
    }catch(err){
      alert('ไม่สามารถอ่านไฟล์ได้: '+err.message);
    }
    // reset input so same file can be picked again
    event.target.value='';
  };
  reader.readAsText(file);
}

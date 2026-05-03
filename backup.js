/* ============================================================
 * backup.js — Export/import data backup
 *
 * Contents: exportBackup, importBackup
 * ============================================================ */

// ===== BACKUP / RESTORE =====
function exportBackup(){
  const data={
    version:1,
    exportedAt:new Date().toISOString(),
    masterData:MD,
    logs:logsCache,
    truckLogs:truckLogsCache,
    outsourceLogs:outsourceLogsCache
  };
  const json=JSON.stringify(data,null,2);
  const blob=new Blob([json],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  const today=new Date();
  const dateStr=today.getFullYear()+'-'+String(today.getMonth()+1).padStart(2,'0')+'-'+String(today.getDate()).padStart(2,'0');
  a.href=url;
  a.download='farm-backup-'+dateStr+'.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  // count totals for the success message
  let logCount=0;
  Object.values(logsCache).forEach(arr=>logCount+=arr.length);
  let truckCount=0;
  Object.values(truckLogsCache).forEach(arr=>truckCount+=arr.length);
  let osCount=0;
  Object.values(outsourceLogsCache).forEach(arr=>osCount+=arr.length);
  showOk('ดาวน์โหลดสำเร็จ!','พนักงาน '+(MD.employees||[]).length+' คน · บันทึกงาน '+logCount+' รายการ · รถ '+truckCount+' เที่ยว · เหมา '+osCount+' รายการ');
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

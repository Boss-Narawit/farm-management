/* ============================================================
 * app.js — App boot — DOM ready, login resume, initial render
 *
 * Contents: initial loading sequence (loadMD, loadLogs, login restore, kick off render)
 * ============================================================ */

// ===== INIT =====
window.onafterprint=()=>{
  document.body.classList.remove('printing');
  document.getElementById('print-area').innerHTML='';
};
window.onload=()=>{
  loadMD(); loadLogs();
  setTodayForms();
  checkLine();
  document.addEventListener('click',e=>{if(!e.target.closest('.cw'))closeAllCombos();});
};

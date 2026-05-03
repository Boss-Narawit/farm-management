/* ============================================================
 * app.js — App boot — DOM ready, login resume, initial render
 *
 * Contents: initial loading sequence (loadMD, loadLogs, login restore, kick off render)
 * ============================================================ */

// ===== INIT =====
window.onload=()=>{
  loadMD(); loadLogs();
  setTodayForms();
  checkLine();
  document.addEventListener('click',e=>{if(!e.target.closest('.cw'))closeAllCombos();});
};

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Read this first before any work on this project. It contains the project conventions, file map, gotchas, and verification commands. Following it will save tokens by skipping rediscovery.

## Project at a glance

Thai-language farm management web app for ~3-4 elderly (60+) sugarcane farm managers. Single-page app, classic vanilla JS (no framework, no build step), hosted on GitHub Pages, optional Google Sheets backend via Apps Script. Target users are mobile-first; UI text is Thai; code/comments are English.

**Constraints that shaped every decision:**
- No build step — open `index.html` directly works
- Classic `<script>` tags (NOT ES modules) — `let`/`const`/`function` at top level are shared across all files
- Mobile WebView compatible (LINE in-app browser is the lowest target — 5 MB localStorage)
- Works offline in demo mode; Google Sheets sync is optional

## CRITICAL: File structure

**JS files live in sub-folders of `js/`.** `index.html` loads from `js/core/`, `js/ui/`, and `js/features/`. Files in the wrong location cause silent load failures.

Sub-folder layout:
- `js/core/` — config, utils, storage, api, app
- `js/ui/` — ui
- `js/features/` — master, logs, dashboard, details, backup

## File map (read this before searching)

```
index.html              # HTML skeleton + all screens + modals. No inline <script> or <style>; everything imported.
styles.css              # Theme tokens, screens, modals, components, @media print
js/core/config.js       # CFG object (LINE_CLIENT_ID, APPS_SCRIPT_URL), MD = {employees, trucks, locations, tasks, contractors, fertilizers},
                        #   logsCache, truckLogsCache, outsourceLogsCache, holidays, runtime state (user, formDur, qlDur, edit*Id, dashView)
js/core/utils.js        # isoDate, parseISO, thaiDate, escHtml, escAttr, setTodayForms, fallbackCopy,
                        #   MO[] (Thai month names), DOW[]/DOW_S[] (Thai day names)
js/core/storage.js      # loadMD/saveMD (key 'fm_md'), loadLogs/saveLogs (keys 'fm_logs', 'fm_tlogs', 'fm_oslogs', 'fm_holidays')
js/core/api.js          # sendAPI (Google Sheets POST), loginLine/loginDemo/afterLogin/logout/checkLine, markSyncStatus, syncDot
js/core/app.js          # Boot — window.onload → loadMD/loadLogs/setTodayForms/checkLine; global click listener closes open combos
js/ui/ui.js             # go (screen nav), showOk, showLoad/hideLoad, showE/clearE, modal helpers (closeMod),
                        #   combo box (oCombo/fCombo/dClose/renderDrop/selComboFromData), undo toast (showUndoToast),
                        #   updateDD (date display), logWage(), findTaskByName(), empFull(), empSub(), renderAll(), buildCalGrid()
js/features/master.js   # CRUD for 6 master types — render*List, open*Mod, save*, del* for:
                        #   employees, trucks, locations, tasks, contractors, fertilizers. Switch tab logic (switchTab).
js/features/logs.js     # submitEmp/submitTruck/submitOutsource, openQL/confirmQL/closeQL/setQLDur (quick log),
                        #   bulk log (initBulkLog/submitBulk/toggleBulkEmp/setBulkDur/renderBulkGrid/toggleSelectAll/updateBulkCount),
                        #   edit log modal (editLog/saveEditLog/deleteLog), edit OS modal (editOSLog/saveOSLog/deleteOSLog), toggleHoliday
js/features/dashboard.js # renderDash → renderToday/renderMonth, openDDS/closeDDS (day detail sheet),
                          #   shiftDay/goToday (date nav), DDS row override for multi-job + holiday awareness
js/features/details.js  # 3 mirror screens: openEmpDetail/renderEdet/edetCopy, openTruckDetail/renderTdet/tdetCopy,
                        #   openLocDetail/renderLdet/ldetCopy. Helpers: computeSeasonSummary, locLastActivity, daysAgo, buildLocActivity
js/features/backup.js   # exportBackup (downloads JSON), importBackup (validates schema, confirms, replaces, reloads)
google-apps-script.js   # TEMPLATE ONLY — not loaded by index.html. Copy code to Google Apps Script editor, deploy as Web App,
                        #   paste URL into js/core/config.js → CFG.APPS_SCRIPT_URL
```

**Script load order** (mirrors browser execution): config → utils → storage → api → ui → master → logs → dashboard → details → backup → app

## Boot sequence

`window.onload` in `app.js`:
1. `loadMD()` + `loadLogs()` — populate `MD`, `logsCache`, `truckLogsCache`, `outsourceLogsCache`, `holidays`
2. `setTodayForms()` — set all date fields (emp-date, truck-date, etc.) to today's ISO date
3. `checkLine()` — handle OAuth callback; if user exists in sessionStorage, calls `afterLogin()`

Demo mode activates automatically if `CFG.LINE_CLIENT_ID === 'YOUR_LINE_CLIENT_ID'` (the default) — both loginLine and loginDemo will silently start demo mode.

## Data model essentials

**Every log has a unique `id`** — `Date.now()+Math.random().toString(36).slice(2,6)`. This was a real refactor: pre-multi-job, logs were keyed by name and one log/day was the limit. Now `findIndex(l=>l.name===nm)` is wrong; use `filter(l=>l.name===nm)` for "all matching".

**Log structure:**
- Employee: `logsCache[ISO_DATE] = [{id, name, task, location, duration, note, loggedBy, syncStatus}, ...]`
- Truck: `truckLogsCache[ISO_DATE] = [{id, plate, weight, driver, note, loggedBy, ts, syncStatus}, ...]`
- Outsource: `outsourceLogsCache[ISO_DATE] = [{id, location, task, contractor, fee, note, loggedBy, timestamp, syncStatus}, ...]`

**Wage is per-task, not per-employee.** `MD.tasks[].dailyRate`. `logWage(log)` (defined in `ui.js`) returns rate for full day, half rate for ครึ่งวัน, 0 if task missing/unpriced. **Always use `logWage()` — never recompute.**

**Employees have `status: 'active' | 'inactive'`.** Filter to active in dashboard/forms; show all (with inactive at bottom) in master list.

**Locations have `seasonStart` (ISO date) and `seasonHistory[]`.** Changing `seasonStart` in saveLoc snapshots the previous season's totals into history if there was activity. Don't break this — users rely on it for sugarcane harvest cycles.

**Records have `syncStatus: 'pending' | 'synced' | 'failed' | 'local'`** — set on creation, updated by `markSyncStatus` after API call. `'local'` means demo mode (no Sheets configured).

## Conventions

**Function naming.** Existing code uses short names: `oCombo`, `fCombo`, `dClose`, `tdet`/`edet`/`ldet` prefixes for truck/employee/location detail. Don't rename them — too many call sites. New functions can use clearer names.

**HTML rendering.** Inline string concatenation with `escHtml()` and `escAttr()`. Template literals OK for static templates. **Always escape user-provided strings** when injecting into innerHTML.

**Modals.** Pattern: `<div class="mbk" id="mod-X">` + `closeMod('mod-X')`. Open with `.classList.add('open')`. Forms inside use the `mr2`/`mf`/`ml`/`mi2` class system.

**Combo boxes (autocomplete dropdowns).** Use `data-val` attribute + `selComboFromData(this, inp, drop)` — never escape quotes inside onmousedown handlers (we hit that bug twice). Combo IDs are always fixed strings (e.g., `emp-nd`, `task-nd`) — don't make them dynamic.

**Buddhist calendar.** Display year is `+543` (e.g., 2026 → 2569). `thaiDate()` handles this. ISO dates internally are Gregorian.

**Two-tap delete confirm.** Pattern used in `deleteLog`/`deleteOSLog` — first tap turns button red with "⚠ กดอีกครั้งเพื่อยืนยันลบ", auto-resets after 5s. More reliable than `confirm()` on mobile WebViews.

**Undo toast.** After delete operations, call `showUndoToast(message, undoFn)`. 7-second window. Wired into employee log delete (`deleteLog`) and outsource log delete (`deleteOSLog`).

**CSS theme tokens.** Green: `--g/--gd/--gl`. Orange/outsource: `--am/--ad/--al`. Teal/location: `--tl/--tld/--tll`. Purple/tasks: `--pu/--pl`. Neutral: `--bd` (border), `--mu` (muted), `--tx` (text), `--bg` (background), `--wh` (white). Status: `--rd/--rl` (red), `--bl/--bll` (blue).

## Gotchas (real bugs we hit)

**Python escape parsing breaks string concatenation.** When generating JS via Python `replace`, `\\''+inp+\\''` becomes `''+inp+''` (empty strings). Always test with `node --check` after edits. Better: write JS to a separate file and inject it as raw text, never embed JS in Python triple-quoted strings.

**File-wipe risk.** Failed Python edits have wiped `index.html` to 0 bytes. Always backup before edits, verify syntax, then write output.

**Surrogate emoji issue.** `\ud83c\udf3e` in Python strings throws UnicodeEncodeError when writing UTF-8. Use literal `🌾` or HTML entities `&#127806;`.

**localStorage limits.** ~5 MB on iOS Safari/LINE WebView. ~1.5-2 years of data for a typical farm before issues. Once Google Sheets is wired up this stops mattering. Don't add storage management — user explicitly declined.

**Truck functions are off-limits.** User wants to redesign them later. Don't edit `submitTruck`, `openTruckDetail`, `renderTdet`, etc. unless explicitly asked.

**Schema changes require backup/restore testing.** Users have existing JSON backup files. Any change to the data model must be backwards-compatible with `importBackup`.

## Verification commands

After **any** code change, run these in order (paths are relative to repo root):

```bash
# 1. Syntax check all JS files
for f in js/**/*.js; do node --check "$f" || echo "FAIL: $f"; done

# 2. Cross-script integration test (most important)
node /tmp/integration-test.js

# 3. If editing index.html, verify script count
grep -c "<script src=" index.html  # expect 11
```

**Integration test template** — write to `/tmp/integration-test.js`, run after major changes. Loads all scripts in a shared vm context (mirrors browser script loading):

```javascript
const vm = require('vm');
const fs = require('fs');
const ctx = {
  window: { location: { origin: 'http://test', pathname: '/', reload:()=>{}, search:'' }, scrollTo:()=>{}, history:{replaceState:()=>{}}, print:()=>{}, addEventListener:()=>{} },
  document: { getElementById: () => ({ classList:{add:()=>{},remove:()=>{},toggle:()=>{},contains:()=>false}, value:'', textContent:'', innerHTML:'', style:{}, scrollIntoView:()=>{}, focus:()=>{}, getAttribute:()=>'', appendChild:()=>{}, removeChild:()=>{}, select:()=>{}, dataset:{}, remove:()=>{} }), querySelector:()=>({id:'s'}), querySelectorAll:()=>[], addEventListener:()=>{}, createElement:()=>({value:'',style:{},select:()=>{},click:()=>{}}), body:{appendChild:()=>{},removeChild:()=>{}}, execCommand:()=>true },
  navigator: { clipboard: { writeText: async () => {} } },
  localStorage: { getItem:()=>null, setItem:()=>{}, removeItem:()=>{} },
  sessionStorage: { getItem:()=>null, setItem:()=>{}, removeItem:()=>{} },
  fetch: async () => ({ json: async () => ({}) }),
  alert:()=>{}, confirm:()=>true, prompt:()=>'',
  URLSearchParams: class { get(){return null;} },
  URL: { createObjectURL:()=>'blob:t', revokeObjectURL:()=>{} },
  Blob: class {}, FileReader: class { readAsText(){this.onload({target:{result:'{}'}});} },
  console
};
vm.createContext(ctx);
const order = [
  'core/config.js','core/utils.js','core/storage.js','core/api.js',
  'ui/ui.js',
  'features/master.js','features/logs.js','features/dashboard.js','features/details.js','features/backup.js',
  'core/app.js'
];
for (const f of order) {
  vm.runInContext(fs.readFileSync(`js/${f}`,'utf8'), ctx, {filename:f});
}
vm.runInContext(`
  // Add specific behavioral checks here for the change you made.
  // Example — after touching wage logic:
  MD.tasks=[{name:'ตัดอ้อย',dailyRate:400}];
  if(logWage({task:'ตัดอ้อย',duration:'เต็มวัน'})!==400)throw 'wage full broken';
  if(logWage({task:'ตัดอ้อย',duration:'ครึ่งวัน'})!==200)throw 'wage half broken';
  console.log('✓ all checks pass');
`, ctx);
```

## How to add a new feature efficiently

**Don't reread the whole codebase.** Use the file map above to find the right file, grep for the related function name, edit narrowly.

**For a new screen:**
1. HTML: `<div id="screen-X" class="screen">` in `index.html`, after relevant existing screen
2. CSS: add to `styles.css` if needed (use existing tokens — `var(--g)`, etc.)
3. JS: render function in the most relevant `js/*.js`. Navigate with `go('screen-X')`.

**For a new master data type:**
1. Add to `MD` default in `js/core/config.js`
2. Add `render*List`, `open*Mod`, `save*`, `del*` in `js/features/master.js`
3. Add tab in `index.html` master screen + panel + modal
4. Update `switchTab` array, `renderAll`
5. If used in dropdowns, add branch in `renderDrop` (`js/ui/ui.js`)

**For a new log type:**
1. New cache var in `js/core/config.js` (with localStorage key)
2. Update `loadLogs`/`saveLogs` in `js/core/storage.js`
3. Form screen + render + submit in `js/features/logs.js`
4. Edit/delete with `showUndoToast` (consistency)
5. Display in dashboard + relevant detail screens

## Communication style with the user

- User prefers concise answers. Don't overexplain.
- User is comfortable with technical concepts but not a developer. Show code blocks only when needed.
- When suggesting features, **rank by real-world impact** not by ease of build.
- When the user says "continue", they often mean "just keep building what you proposed" — don't re-ask.
- Thai for user-facing UI explanations; English for code discussion. Mixed is fine.

## Out of scope

- Don't suggest framework migrations (React/Vue/etc.) — adds complexity, breaks GitHub Pages flow
- Don't suggest TypeScript — same reason
- Don't suggest a build pipeline — user values "open file, it works"
- Don't propose analytics, telemetry, or third-party tracking
- Don't refactor truck functions until user asks

# Coworker Delegation Protocol
You are the lead developer. You have access to a fast, local CLI assistant named Gemini. Do not waste your context window on heavy-lifting, translation, repetitive typing, or generating boilerplate.

When to delegate to Gemini:
* Translating UI text from English to Thai.
* Generating boilerplate HTML for new modals or screens.
* Reformatting large arrays or JSON master data (like CFG objects).
* Generating repetitive CSS variables.

How to delegate:
Execute this terminal command using single quotes around the prompt to avoid shell escaping issues: 
`gemini 'Task: [Action]. Context: [Brief detail]. Output raw code only, no markdown formatting or explanations.'`

After execution, read the terminal output and integrate the code directly into the relevant files. Never write the repetitive code yourself if Gemini can do it faster.

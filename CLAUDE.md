# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Read this first before any work on this project. It contains the project conventions, file map, gotchas, and verification commands. Following it will save tokens by skipping rediscovery.

## Project at a glance

Thai-language farm management web app for ~10 sugarcane farm managers sharing a central dataset. Single-page app, classic vanilla JS (no framework, no build step), hosted on GitHub Pages. Real-time multi-device sync via Firebase Realtime Database. LINE login for identity. Target users are mobile-first; UI text is Thai; code/comments are English.

**Constraints that shaped every decision:**
- No build step — open `index.html` directly works
- Classic `<script>` tags (NOT ES modules) — `let`/`const`/`function` at top level are shared across all files
- Mobile WebView compatible (LINE in-app browser is the lowest target — 5 MB localStorage)
- Works offline — localStorage is the offline cache; Firebase syncs when reconnected
- Firebase SDK loaded via CDN (`<script>` tag) — no bundler needed

## CRITICAL: File structure

**JS files live in sub-folders of `js/`.** `index.html` loads from `js/core/`, `js/ui/`, and `js/features/`. Files in the wrong location cause silent load failures.

Sub-folder layout:
- `js/core/` — config, utils, storage, api, app
- `js/ui/` — ui
- `js/features/` — master, logs, dashboard, details, backup

## File map (read this before searching)

```
index.html              # HTML skeleton + all screens + modals. No inline <script> or <style>; everything imported.
                        #   Loads Firebase SDK (v8 compat) via CDN before config.js.
styles.css              # Theme tokens, screens, modals, components, @media print
js/core/config.js       # CFG object (LINE_CLIENT_ID, APPS_SCRIPT_URL, FIREBASE config), MD = {employees, trucks, locations, tasks, contractors, fertilizers},
                        #   logsCache, truckLogsCache, outsourceLogsCache, holidays, runtime state (user, formDur, qlDur, edit*Id, dashView)
js/core/utils.js        # isoDate, parseISO, thaiDate, escHtml, escAttr, setTodayForms, fallbackCopy,
                        #   MO[] (Thai month names), DOW[]/DOW_S[] (Thai day names)
js/core/storage.js      # loadMD/saveMD, loadLogs/saveLogs — dual-write: localStorage (offline cache) + Firebase RTDB (sync).
                        #   'db' var (set by initFirebase) gates Firebase writes. Keys: fm_md, fm_logs, fm_tlogs, fm_oslogs, fm_holidays.
                        #   Data stored as JSON strings in Firebase (preserves JS arrays, avoids RTDB array→object conversion).
js/core/api.js          # sendAPI (now just calls onOk + markSyncStatus — Firebase handles persistence),
                        #   loginLine/loginDemo/afterLogin/logout/checkLine (LINE OAuth).
                        #   afterLogin() calls attachListeners() before go('screen-home').
                        #   APPS_SCRIPT_URL is now used ONLY for LINE auth, not log data.
js/core/app.js          # Boot — window.onload → loadMD/loadLogs/initFirebase/setTodayForms/checkLine.
                        #   initFirebase(): initializes Firebase + Anonymous Auth (skips if CFG.FIREBASE.apiKey is placeholder).
                        #   attachListeners(): subscribes to Firebase RTDB paths after login; updates caches + re-renders active screen.
                        #   currentScreen: tracks which screen is active (set by go() in ui.js) so listeners re-render correctly.
js/ui/ui.js             # go (screen nav — sets currentScreen), showOk, showLoad/hideLoad, showE/clearE, modal helpers (closeMod),
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
google-apps-script.js   # TEMPLATE ONLY — LINE auth only. Copy to Google Apps Script editor, deploy as Web App,
                        #   paste URL into CFG.APPS_SCRIPT_URL. Does NOT handle log data (Firebase handles that now).
```

**Script load order** (mirrors browser execution): Firebase SDK (CDN) → config → utils → storage → api → ui → master → logs → dashboard → details → backup → app

## Boot sequence

`window.onload` in `app.js`:
1. `loadMD()` + `loadLogs()` — populate caches from localStorage (fast, works offline)
2. `initFirebase()` — initialize Firebase SDK + Anonymous Auth (skips if `CFG.FIREBASE.apiKey` is placeholder)
3. `setTodayForms()` — set all date fields to today's ISO date
4. `checkLine()` — handle OAuth callback; if user exists in sessionStorage, calls `afterLogin()`

`afterLogin()` (in `api.js`):
- Calls `attachListeners()` — subscribes to Firebase RTDB real-time changes
- Listeners fire immediately with current server data, updating caches and re-rendering the active screen
- All subsequent writes from other devices arrive via listeners automatically

Demo mode activates automatically if `CFG.LINE_CLIENT_ID === 'YOUR_LINE_CLIENT_ID'` (the default). Firebase also stays inactive if `CFG.FIREBASE.apiKey === 'YOUR_FIREBASE_API_KEY'`.

## Data model essentials

**Every log has a unique `id`** — `Date.now()+Math.random().toString(36).slice(2,6)`. This was a real refactor: pre-multi-job, logs were keyed by name and one log/day was the limit. Now `findIndex(l=>l.name===nm)` is wrong; use `filter(l=>l.name===nm)` for "all matching".

**Log structure:**
- Employee: `logsCache[ISO_DATE] = [{id, name, task, location, duration, note, loggedBy, syncStatus}, ...]`
- Truck: `truckLogsCache[ISO_DATE] = [{id, plate, weight, driver, note, loggedBy, ts, syncStatus}, ...]`
- Outsource: `outsourceLogsCache[ISO_DATE] = [{id, location, task, contractor, fee, note, loggedBy, timestamp, syncStatus}, ...]`

**Wage is per-task, not per-employee.** `MD.tasks[].dailyRate`. `logWage(log)` (defined in `ui.js`) returns rate for full day, half rate for ครึ่งวัน, 0 if task missing/unpriced. **Always use `logWage()` — never recompute.**

**Employees have `status: 'active' | 'inactive'`.** Filter to active in dashboard/forms; show all (with inactive at bottom) in master list.

**Locations have `seasonStart` (ISO date) and `seasonHistory[]`.** Changing `seasonStart` in saveLoc snapshots the previous season's totals into history if there was activity. Don't break this — users rely on it for sugarcane harvest cycles.

**Records have `syncStatus: 'pending' | 'synced' | 'failed' | 'local'`** — set by `markSyncStatus()` in `sendAPI()`. With Firebase configured, all records are immediately marked `'synced'`. `'local'` means demo mode (no Firebase configured).

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

**localStorage is now the offline cache only.** Firebase RTDB is the source of truth. localStorage still fills on boot (fast startup) and is updated by real-time listeners. The 5 MB limit no longer matters for production — it only applies to the offline/demo fallback.

**Firebase stores data as JSON strings, not structured objects.** `saveLogs()` calls `JSON.stringify(logsCache)` before writing to Firebase. This avoids Firebase's array→object conversion (RTDB converts `[a,b]` to `{"0":a,"1":b}`). Listeners call `JSON.parse(snap.val())` on read. Don't change this without testing array round-trips.

**Firebase listeners fire on the writing device too.** When device A calls `saveLogs()`, Firebase writes, then the listener fires on device A updating its own cache — this is a no-op in practice since the data is identical, but don't put side effects in listeners that shouldn't run locally.

**`attachListeners()` is idempotent per session** — called once in `afterLogin()`. If you call it again, Firebase `.on()` adds duplicate listeners. Don't call it more than once.

**Truck functions are off-limits.** User wants to redesign them later. Don't edit `submitTruck`, `openTruckDetail`, `renderTdet`, etc. unless explicitly asked.

**Schema changes require backup/restore testing.** Users have existing JSON backup files. Any change to the data model must be backwards-compatible with `importBackup`.

## Verification commands

After **any** code change, run these in order (paths are relative to repo root):

```bash
# 1. Syntax check all JS files
for f in js/**/*.js; do node --check "$f" || echo "FAIL: $f"; done

# 2. Cross-script integration test (most important)
node tests/integration.js

# 3. If editing index.html, verify script count
grep -c "<script src=" index.html  # expect 14 (3 Firebase CDN + 11 local)
```

**Integration test** lives at `tests/integration.js` — edit it in place when adding new features. The `firebase: undefined` mock makes `initFirebase()` skip gracefully (placeholder config check). Use `var` (not `const`/`let`) inside inline `vm.runInContext` snippets to avoid redeclaration errors across calls sharing the same context.

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
  firebase: undefined,  // Firebase SDK not available in Node — initFirebase() skips safely
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
1. New cache var in `js/core/config.js`
2. Update `loadLogs`/`saveLogs` in `js/core/storage.js` — add localStorage key + Firebase write + listener in `attachListeners()` in `app.js`
3. Form screen + render + submit in `js/features/logs.js`
4. Edit/delete with `showUndoToast` (consistency)
5. Display in dashboard + relevant detail screens

## Communication style with the user

- User prefers concise answers. Don't overexplain.
- User is comfortable with technical concepts but not a developer. Show code blocks only when needed.
- When suggesting features, **rank by real-world impact** not by ease of build.
- When the user says "continue", they often mean "just keep building what you proposed" — don't re-ask.
- Respond in English — it's more token-efficient. Thai only for user-facing UI text in the app itself.

## Out of scope

- Don't suggest framework migrations (React/Vue/etc.) — adds complexity, breaks GitHub Pages flow
- Don't suggest TypeScript — same reason
- Don't suggest a build pipeline — user values "open file, it works"
- Don't propose analytics, telemetry, or third-party tracking
- Don't refactor truck functions until user asks

# Role & Autonomous Workflow

You are the Lead Developer maintaining this codebase. Follow this workflow for every request automatically — the user does not need to re-assign this role each session.

## Step-by-step loop

1. **Analyze & Split** — Break the request into "Core Logic" (architecture, JS state, data flow) and "Grunt Work" (HTML boilerplate, CSS classes, Thai translations, JSON formatting, repetitive DOM).
2. **Delegate** — Do NOT generate Grunt Work yourself. Run a `gemini` command in the terminal (see below).
3. **Integrate** — Read terminal output and paste it into the codebase.
4. **Execute** — Write the Core Logic yourself.
5. **Verify** — Run the bash verification commands and `/tmp/integration-test.js` (see Verification section). Do not report success until tests pass.

## Communication style

Keep responses extremely concise: state what you delegated, what you wrote, and the test result. No overexplanation.

# Coworker Delegation Protocol

You have access to a fast, local CLI assistant named Gemini. Do not waste your context window on heavy-lifting, translation, repetitive typing, or generating boilerplate.

When to delegate to Gemini:
* Translating UI text from English to Thai.
* Generating boilerplate HTML for new modals or screens.
* Reformatting large arrays or JSON master data (like CFG objects).
* Generating repetitive CSS variables.

How to delegate:
Execute this terminal command using single quotes around the prompt to avoid shell escaping issues: 
`gemini 'Task: [Action]. Context: [Brief detail]. Output raw code only, no markdown formatting or explanations.'`

After execution, read the terminal output and integrate the code directly into the relevant files. Never write the repetitive code yourself if Gemini can do it faster.

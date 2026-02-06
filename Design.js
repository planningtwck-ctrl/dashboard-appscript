/** =====================[ DESIGN (DS) ]===================== */

/** ---------- Date parse (safe) ---------- */
function _parseDateFallback_(v){
  if (!v) return null;
  if (v instanceof Date) return v;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}
function _parseDateSafe_(v){
  try{
    if (typeof _parseDate_ === 'function') return _parseDate_(v);
  }catch(_){}
  return _parseDateFallback_(v);
}

/** ---------- Normalize ---------- */
function _normResource_(s){
  return String(s || '')
    .replace(/\s+/g,' ')
    .replace(/\(\s+/g,'(')
    .replace(/\s+\)/g,')')
    .trim();
}
function _extractPersonName_(resource){
  const s = String(resource || '');
  const m = s.match(/\(([^)]+)\)/);
  return m ? m[1].trim() : '';
}
function _fmtAgeFrom_(startDate, now){
  if (!startDate) return '-';
  const mins = Math.max(0, Math.floor((now - startDate) / 60000));
  const d = Math.floor(mins / 1440);
  const h = Math.floor((mins % 1440) / 60);
  const m = mins % 60;
  return `${d ? d+' วัน ' : ''}${h ? h+' ชม. ' : ''}${m} นาที`;
}

/** ---------- Sorting resources ---------- */
function _resourceSortKey_(resource) {
  const s = _normResource_(resource);
  const m = s.match(/^([A-Za-z]+)\s*(\d+)/);
  const prefix = (m ? m[1] : s.replace(/[^A-Za-z]/g, '')).toUpperCase();
  const num = m ? parseInt(m[2], 10) : 0;
  const n = s.match(/\(([^)]+)\)/);
  const person = (n ? n[1] : s).trim();
  return { prefix, num, person, raw: s };
}
function _cmpResource_(a, b) {
  const A = _resourceSortKey_(a);
  const B = _resourceSortKey_(b);
  const order = { DS: 1, CAM: 2, EN: 3, ENG: 3 };
  const oa = order[A.prefix] || 99;
  const ob = order[B.prefix] || 99;
  if (oa !== ob) return oa - ob;
  if (A.num !== B.num) return A.num - B.num;
  return A.person.localeCompare(B.person);
}

/** ---------- Column index ---------- */
function _colIndex_(headers, name){
  const target = String(name || '').trim();
  const cleaned = headers.map(x => String(x || '').trim());
  const i = cleaned.indexOf(target);
  if (i === -1) throw new Error('ไม่พบคอลัมน์: ' + target);
  return i;
}

/** ---------- Read availability map ---------- */
function _readAvailabilityMap_(){
  const map = {};
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh = ss.getSheetByName(AV_SHEET_NAME);
  if (!sh) return map;

  const v = sh.getDataRange().getValues();
  if (v.length < 2) return map;

  const h = v[0].map(x => String(x || '').trim());
  const iName = h.indexOf('Resource Name');
  const iSt   = h.indexOf('Status');
  const iRe   = h.indexOf('Reason');
  const iLast = h.indexOf('Last Updated');
  if (iName === -1 || iSt === -1) return map;

  for (let r=1; r<v.length; r++){
    const name = _normResource_(v[r][iName]);
    if (!name) continue;
    map[name] = {
      status: String(v[r][iSt] || '').trim(),
      reason: iRe === -1 ? '' : String(v[r][iRe] || ''),
      lastUpdated: iLast === -1 ? '' : v[r][iLast]
    };
  }
  return map;
}

function getDesignDataSafe(){
  try {
    Logger.log('[getDesignDataSafe] Calling Design.getDesignData()...');
    const result = getDesignData();
    Logger.log('[getDesignDataSafe] SUCCESS: Got result');
    return result;
  } catch (err) {
    Logger.log('[getDesignDataSafe] ERROR: ' + err.message);
    Logger.log('[getDesignDataSafe] Stack: ' + err.stack);
    return {
      __error: true,
      message: err && err.message ? err.message : String(err),
      stack: err && err.stack ? err.stack : ''
    };
  }
}

/** ---------- Dept matcher (กัน DS/Design/ออกแบบ ไม่ขึ้น) ---------- */
function _isDesignDept_(deptRaw){
  const d = String(deptRaw || '').trim().toLowerCase();
  return d === 'ds' || d === 'design' || d === 'ออกแบบ' || d.includes('design') || d.includes('ออกแบบ');
}

/** =====================[ DATA API: Design Page ]===================== */
function getDesignData(){
  Logger.log('[Design.getDesignData] START');
  Logger.log('[Design.getDesignData] SPREADSHEET_ID = ' + SPREADSHEET_ID);
  Logger.log('[Design.getDesignData] SHEET_NAME = ' + SHEET_NAME);
  
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) throw new Error('ไม่พบชีต: ' + SHEET_NAME);

  const values = sh.getDataRange().getValues();
  Logger.log('[Design.getDesignData] Total rows = ' + values.length);
  const now = new Date();

  if (values.length < 2) {
    Logger.log('[Design.getDesignData] Sheet is empty, returning empty response');
    return { board:{}, summary:[], currentTime: now.toLocaleString('th-TH',{hour12:false}), types:[], team:[], metricsByType:{} };
  }

  const headers = values[0].map(x => String(x || '').trim());

  const idx = {
    ts: _colIndex_(headers, 'Timestamp'),
    dept: _colIndex_(headers, 'Department'),
    res: _colIndex_(headers, 'Resource'),
    bc: _colIndex_(headers, 'Barcode'),
    status: _colIndex_(headers, 'Status'),
    priority: headers.includes('Priority') ? _colIndex_(headers,'Priority') : -1,
    type: headers.includes('Type') ? _colIndex_(headers,'Type') : -1,
    fin: headers.includes('TimeFinish') ? _colIndex_(headers,'TimeFinish') : -1,
    curStart: headers.includes('CurrentStart') ? _colIndex_(headers,'CurrentStart') : -1,
    note: headers.includes('Note') ? _colIndex_(headers,'Note') : -1,
  };

  const FIXED_TYPES = ['แบบจ่ายงาน','แก้ไขแบบจ่ายงาน','แบบผลิต','แบบผลิต-วายริ่ง'];

  const QUEUE = new Set(['รอคิว','ล่าช้า','กรุณารีบเร่งงาน']);
  const DOING = new Set(['เริ่มงาน','รอตรวจ','หยุดงาน']);
  const DONE_SET = new Set(['เสร็จแล้ว','เสร็จสิ้น','done','Done','DONE']);

  const today0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow0 = new Date(today0); tomorrow0.setDate(today0.getDate()+1);
  const isToday = (d) => d && d >= today0 && d < tomorrow0;

  const availabilityMap = _readAvailabilityMap_();

  const board = {};
  const metricsByType = {};
  const typesSet = new Set();

  function ensureType(t){
    const typeName = String(t || '').trim() || 'ไม่ระบุประเภท';
    if (!board[typeName]) board[typeName] = { doing:[], queue:[] };
    if (!metricsByType[typeName]){
      metricsByType[typeName] = {
        newToday: { count: 0, jobs: [] },
        finishedToday: { count: 0, jobs: [] },
        overdue3d: { count: 0, jobs: [] }
      };
    }
    typesSet.add(typeName);
    return typeName;
  }

  const teamAgg = {};
  function ensureTeam(resourceRaw){
    const r = _normResource_(resourceRaw) || '-';
    if (!teamAgg[r]){
      const av = availabilityMap[r] || {};
      teamAgg[r] = {
        resource: r,
        person: _extractPersonName_(r) || r,
        doing: 0,
        queue: 0,
        urgent: 0,
        total: 0,
        availabilityStatus: av.status || 'Unknown',
        availabilityReason: av.reason || '',
        availabilityLastUpdated: av.lastUpdated || '',
        displayStatus: 'Unknown',
        displayReason: '',
        metrics: { newToday: 0, finishedToday: 0, overdue3d: 0 }
      };
    }
    return teamAgg[r];
  }

  const seen = new Set();

  for (let r = values.length - 1; r >= 1; r--){
    const row = values[r];

    if (!_isDesignDept_(row[idx.dept])) continue;

    const barcode = String(row[idx.bc] || '').trim();
    if (!barcode) continue;
    if (seen.has(barcode)) continue;
    seen.add(barcode);

    const type = ensureType(idx.type >= 0 ? row[idx.type] : '');

    const status = String(row[idx.status] || '').trim();
    const resource = _normResource_(row[idx.res]) || 'DS';
    const priority = (idx.priority >= 0) ? String(row[idx.priority] || '').trim().toLowerCase() : '';
    const note = (idx.note >= 0) ? String(row[idx.note] || '') : '';

    const ts  = _parseDateSafe_(row[idx.ts]);
    const fin = (idx.fin >= 0) ? _parseDateSafe_(row[idx.fin]) : null;
    const cur = (idx.curStart >= 0) ? _parseDateSafe_(row[idx.curStart]) : null;
    const startRef = cur || ts;

    const active = DOING.has(status) || QUEUE.has(status);
    const isUrgent = (priority === 'urgent') || status === 'ล่าช้า' || status === 'กรุณารีบเร่งงาน';

    if (active && isToday(ts)) {
      metricsByType[type].newToday.count++;
      metricsByType[type].newToday.jobs.push(barcode);
      ensureTeam(resource).metrics.newToday++;
    }
    if (DONE_SET.has(status) && isToday(fin)) {
      metricsByType[type].finishedToday.count++;
      metricsByType[type].finishedToday.jobs.push(barcode);
      ensureTeam(resource).metrics.finishedToday++;
    }
    if (active && startRef && (now - startRef) >= (3 * 24 * 60 * 60 * 1000)) {
      metricsByType[type].overdue3d.count++;
      metricsByType[type].overdue3d.jobs.push(barcode);
      ensureTeam(resource).metrics.overdue3d++;
    }

    const item = { barcode, status, resource, priority, note, age: _fmtAgeFrom_(startRef, now), type };

    if (DOING.has(status)) board[type].doing.push(item);
    if (QUEUE.has(status)) board[type].queue.push(item);

    if (active){
      const t = ensureTeam(resource);
      if (DOING.has(status)) t.doing++;
      if (QUEUE.has(status)) t.queue++;
      if (isUrgent) t.urgent++;
    }
  }

  Object.values(teamAgg).forEach(t => {
    t.total = (t.doing || 0) + (t.queue || 0);
    if (t.doing > 0){ t.displayStatus = 'Working'; t.displayReason = 'มีงานกำลังทำ'; }
    else if (t.queue > 0){ t.displayStatus = 'Queue'; t.displayReason = 'มีงานรอคิว'; }
    else { t.displayStatus = 'Available'; t.displayReason = 'ว่าง'; }
  });

  const foundTypes = Array.from(typesSet);
  const types = [
    ...FIXED_TYPES.filter(t => board[t]),
    ...foundTypes.filter(t => !FIXED_TYPES.includes(t))
  ];

  const summary = types.map(t => ({
    type: t,
    doing: (board[t]?.doing || []).length,
    queue: (board[t]?.queue || []).length,
    total: (board[t]?.doing || []).length + (board[t]?.queue || []).length
  }));

  const team = Object.values(teamAgg)
    .filter(x => x.resource && x.resource !== '-')
    .sort((a, b) => _cmpResource_(a.resource, b.resource));

  Logger.log('[Design.getDesignData] END: Returning data with ' + summary.length + ' types and ' + team.length + ' team members');
  
  return {
    board,
    summary,
    currentTime: now.toLocaleString('th-TH', { hour12:false }),
    types,
    team,
    metricsByType
  };
}

/** =====================[ CONFIG ]===================== */
const SPREADSHEET_ID = '1_HEbYwvcGzMU0QBCMLDILQWcEg9UhfeSM69jUVZGJFo';
const SHEET_NAME     = 'Logs';
const AV_SHEET_NAME  = 'Resource_Availability';

// คืน URL deployment ของ Web App (ใช้สร้างลิงก์ไปหน้า report)
function getWebAppUrl(){
  return ScriptApp.getService().getUrl();
}

function doGet(e) {
  Logger.log('[doGet] START ===');
  
  // ✅ อ่านพารามิเตอร์ทั้งหมด
  const p = e && e.parameter ? e.parameter : {};
  const api = (p.api || '').trim();
  const view = (p.view || 'design').trim();
  const mode = (p.mode || '').trim();
  
  Logger.log('[doGet] params=' + JSON.stringify(p));
  Logger.log('[doGet] api="' + api + '" | view="' + view + '" | mode="' + mode + '"');
  
  try {
    // ✅ API MODE: คืน JSON
    if (api === 'designData') {
      Logger.log('[doGet] API MODE designData: Returning JSON');
      Logger.log('[doGet] SIGNATURE: sig=GD_v1_API_DESIGN_DATA');
      
      try {
        const data = getDesignDataDS_(); // ✅ เรียกฟังก์ชันใหม่
        Logger.log('[doGet] getDesignDataDS_() success');
        Logger.log('[doGet] Data type: ' + typeof data);
        Logger.log('[doGet] Data keys: ' + (data ? Object.keys(data).join(', ') : 'null'));
        
        const jsonString = JSON.stringify(data);
        Logger.log('[doGet] JSON length: ' + jsonString.length);
        
        return ContentService.createTextOutput(jsonString)
          .setMimeType(ContentService.MimeType.JSON);
          
      } catch (err) {
        Logger.log('[doGet] getDesignDataDS_() ERROR: ' + err.message);
        Logger.log('[doGet] Stack: ' + err.stack);
        
        const errorData = {
          __error: true,
          success: false,
          message: err.message || 'Unknown error',
          stack: err.stack || '',
          timestamp: new Date().toISOString(),
          __apiMode: true,
          __buildId: BUILD_ID
        };
        
        return ContentService.createTextOutput(JSON.stringify(errorData))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    // ✅ WEB MODE: คืน HTML ผ่าน Template
    Logger.log('[doGet] WEB MODE: Returning HTML for view=' + view);
    Logger.log('[doGet] SIGNATURE: sig=GD_v1_WEB_APP');
    
    // ✅ ดึง Web App URL และ inject ใน template
    const webappUrl = ScriptApp.getService().getUrl();
    Logger.log('[doGet] Web App URL: ' + webappUrl);
    
    // ✅ สร้าง Template และ inject ตัวแปร
    const template = HtmlService.createTemplateFromFile('js_design'); // ✅ ไม่ต้อง .html
    template.WEBAPP_URL = webappUrl; // ✅ สำหรับ <?!= WEBAPP_URL ?>
    template.buildId = BUILD_ID; // ✅ สำหรับ <?!= buildId ?>
    template.VIEW = view;
    
    // ✅ Debug: ตรวจสอบค่าที่จะส่งให้ template
    Logger.log('[doGet] Template variables:');
    Logger.log('[doGet] - WEBAPP_URL: ' + template.WEBAPP_URL);
    Logger.log('[doGet] - buildId: ' + template.buildId);
    Logger.log('[doGet] - VIEW: ' + template.VIEW);
    
    const output = template.evaluate()
      .setTitle('Design Dashboard')
      .setDescription('Design Department Dashboard - Real-time Job Tracking')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
      
    Logger.log('[doGet] HTML output generated successfully');
    Logger.log('[doGet] Template evaluation completed');
    Logger.log('[doGet] END ===');
    
    return output;
    
  } catch (err) {
    Logger.log('[doGet] GLOBAL EXCEPTION: ' + err.message);
    Logger.log('[doGet] Stack: ' + err.stack);
    Logger.log('[doGet] SIGNATURE: sig=GD_v1_GLOBAL_ERROR');
    
    // Return error HTML page
    const errorHtml = HtmlService.createHtmlOutput(`
      <h1>❌ เกิดข้อผิดพลาด</h1>
      <p><strong>ข้อความ:</strong> ${err.message || 'Unknown error'}</p>
      <p><strong>Build ID:</strong> ${BUILD_ID}</p>
      <p><strong>เวลา:</strong> ${new Date().toLocaleString('th-TH')}</p>
      <button onclick="location.reload()">รีเฟรชหน้า</button>
    `).setTitle('Error');
    
    return errorHtml;
  }
}

/** ===== Read Logs Sheet + Convert to Array of Objects ===== */
function getLogs_() {
  try {
    Logger.log('[getLogs_] START: Reading Logs sheet');
    
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sh = ss.getSheetByName(SHEET_NAME);
    
    if (!sh) {
      Logger.log('[getLogs_] ERROR: Sheet "' + SHEET_NAME + '" not found');
      return [];
    }
    
    const values = sh.getDataRange().getValues();
    Logger.log('[getLogs_] Total rows (including header): ' + values.length);
    
    if (values.length < 2) {
      Logger.log('[getLogs_] Sheet is empty');
      return [];
    }
    
    // Get headers from first row
    const headers = values[0].map(h => String(h || '').trim());
    Logger.log('[getLogs_] Headers: ' + headers.join(', '));
    
    // Convert rows to objects
    const rows = [];
    for (let r = 1; r < values.length; r++) {
      const rowData = {};
      for (let c = 0; c < headers.length; c++) {
        rowData[headers[c]] = values[r][c] || '';
      }
      rows.push(rowData);
    }
    
    // Count DS department rows
    const dsRows = rows.filter(row => {
      const dept = String(row['Department'] || '').trim().toLowerCase();
      return dept === 'ds' || dept === 'design' || dept === 'ออกแบบ';
    });
    
    Logger.log('[getLogs_] Total data rows: ' + rows.length);
    Logger.log('[getLogs_] DS department rows: ' + dsRows.length);
    
    return rows;
    
  } catch (err) {
    Logger.log('[getLogs_] EXCEPTION: ' + err.message);
    return [];
  }
}

/** ===== Read helpers ===== */
function _readAll_(){
  const sh = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
  const values = sh.getDataRange().getValues();
  return { header: values[0], rows: values.slice(1) };
}
function _idx_(header, name){ return header.indexOf(name); }

/** ===== Utilities (สำหรับระบบอื่น ๆ ด้วย) ===== */
function getColIdx_() {
  const sh = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
  const headers = sh.getDataRange().getValues()[0];
  function idx(name) {
    const i = headers.indexOf(name);
    if (i === -1) throw new Error('ไม่พบคอลัมน์: ' + name);
    return i;
  }
  return {
    barcode:      idx('Barcode'),
    type:         idx('Type'),
    dept:         idx('Department'),
    resource:     idx('Resource'),
    status:       idx('Status'),
    timestamp:    idx('Timestamp'),
    duration:     idx('Duration'),
    timeFinish:   idx('TimeFinish'),
    totalTime:    idx('TotalTime'),
    cusNm:        idx('Cus.Nm'),
    priority:     idx('Priority'),
    currentStart: idx('CurrentStart'),
    accumMins:    idx('AccumMins'),
    note:         idx('Note'),
  };
}

function _parseDate_(v) {
  if (v instanceof Date && !isNaN(v)) return v;
  if (v !== null && v !== undefined && String(v).trim() !== '') {
    const d = new Date(v);
    if (!isNaN(d)) return d;
  }
  return null;
}

function findLastRowByBarcode_(barcode) {
  const ss  = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh  = ss.getSheetByName(SHEET_NAME);
  const vals = sh.getDataRange().getValues();
  const { barcode: bcCol } = getColIdx_();
  for (let r = vals.length - 1; r >= 1; r--) {
    if (String(vals[r][bcCol]).trim() === String(barcode).trim()) {
      return { sh, r, rowVals: vals[r] };
    }
  }
  throw new Error('ไม่พบ Barcode: ' + barcode);
}

function init(opts){
  // ไม่เลือกสถานะจบงานตั้งแต่แรก
  const DONE_WORDS = new Set(['เสร็จแล้ว','เสร็จสิ้น','เสร็จงาน']);
  const defaultStatuses = (opts.statuses || []).filter(s => !DONE_WORDS.has(String(s||'').trim()));

  state.ms.dept = MultiSelect($('ms-dept'), { label:'Department',
    items:(opts.departments||[]).map(v=>({value:v})),
    selected:opts.departments,
    onChange:onFacetChanged
  });
  state.ms.res  = MultiSelect($('ms-res'),  { label:'Resource',
    items:(opts.resources||[]).map(v=>({value:v})),
    selected:opts.resources,
    onChange:onFacetChanged
  });
  state.ms.sta  = MultiSelect($('ms-sta'),  { label:'Status',
    items:(opts.statuses||[]).map(v=>({value:v})),
    selected:defaultStatuses,   // ✅ ใช้ defaultStatuses
    onChange:onFacetChanged
  });
  state.ms.typ  = MultiSelect($('ms-typ'),  { label:'Type',
    items:(opts.types||[]).map(v=>({value:v})),
    selected:opts.types,
    onChange:onFacetChanged
  });
  state.ms.cols = MultiSelect($('ms-cols'), { label:'Columns',
    items:(opts.defaultColumns||[]).map(v=>({value:v})),
    selected:opts.defaultColumns,
    onChange:v=>{ state.columns=v }
  });

  state.columns = opts.defaultColumns||[];
  refreshFacets();
  loadReport();
}

/** =====================[ ส่วนของ Report ]===================== */
// ช่วยเช็ค PRD
function _isPRD_(v){ return String(v).trim().toUpperCase() === 'PRD'; }

function getReportFilterOptions(){
  const {header, rows} = _readAll_();
  const uniq = a => [...new Set(a.filter(v => v!=null && String(v).trim()!=='').map(String))].sort();

  const dI = _idx_(header,'Department');
  const rI = _idx_(header,'Resource');
  const sI = _idx_(header,'Status');
  const tI = _idx_(header,'Type');

  // ตัด PRD ออกเฉพาะ Department
  const departments = dI>-1 ? uniq(rows.map(r => r[dI]).filter(v => !_isPRD_(v))) : [];
  const resources   = rI>-1 ? uniq(rows.map(r => r[rI])) : [];
  const statuses    = sI>-1 ? uniq(rows.map(r => r[sI])) : [];
  const types       = tI>-1 ? uniq(rows.map(r => r[tI])) : [];

  // ✅ เพิ่ม Timestamp เข้า defaultColumns
  const defaultColumns = ['Timestamp','Barcode','Resource','Duration','TimeFinish','Status','Type','Department','Note']
    .filter(c => header.includes(c));

  // ✅ ส่งทุกคอลัมน์ไปให้ Columns เลือกได้หมด
  const allColumns = header.slice();

  return { departments, resources, statuses, types, defaultColumns, allColumns };
}

/** Facets ตามฟิลเตอร์ที่เลือก */
function getReportFacets(params){
  const {header, rows} = _readAll_();
  const dI = _idx_(header,'Department');
  const rI = _idx_(header,'Resource');
  const sI = _idx_(header,'Status');
  const tI = _idx_(header,'Type');

  const selDept   = params?.departments || [];
  const selRes    = params?.resources   || [];
  const selStatus = params?.statuses    || [];
  const selTypes  = params?.types       || [];

  // ถ้าไม่ได้เลือก Dept ใดเลย ให้หมายถึง “ทุก Dept ยกเว้น PRD”
  const deptMatch = (v) => (selDept.length === 0 ? !_isPRD_(v) : selDept.includes(String(v)));
  const inSet     = (arr, v) => (arr.length===0 || arr.includes(String(v)));

  const cnt = (indexCheck, ...conds) => {
    const map = new Map();
    rows.forEach(r=>{
      if (!conds.every(fn=>fn(r))) return;
      const key = String(r[indexCheck]||'');
      if (indexCheck===dI && _isPRD_(key)) return; // ไม่นับ PRD ใน facet
      map.set(key, (map.get(key)||0)+1);
    });
    return [...map.entries()]
      .sort((a,b)=>a[0].localeCompare(b[0]))
      .map(([value,count])=>({value,count}));
  };

  const byDept   = cnt(dI, r => deptMatch(r[dI]), r => inSet(selRes, r[rI]), r => inSet(selStatus, r[sI]), r => inSet(selTypes, r[tI]));
  const byRes    = cnt(rI, r => deptMatch(r[dI]), r => inSet(selStatus, r[sI]), r => inSet(selTypes, r[tI]));
  const byStatus = cnt(sI, r => deptMatch(r[dI]), r => inSet(selRes, r[rI]),    r => inSet(selTypes, r[tI]));
  const byType   = cnt(tI, r => deptMatch(r[dI]), r => inSet(selRes, r[rI]),    r => inSet(selStatus, r[sI]));

  return { departments: byDept, resources: byRes, statuses: byStatus, types: byType };
}

/** แถวข้อมูลรายงาน */
function getReportRows(params){
  const {header, rows} = _readAll_();
  const colIdx = {}; header.forEach((h,i)=>colIdx[h]=i);

  const wantCols = (params && params.columns && params.columns.length)
    ? params.columns.filter(c => header.includes(c))
    : header;

  const selDept   = params?.departments || [];
  const selRes    = params?.resources   || [];
  const selStatus = params?.statuses    || [];
  const selTypes  = params?.types       || [];

  const deptMatch = (v) => (selDept.length === 0 ? !_isPRD_(v) : selDept.includes(String(v)));
  const inSet     = (arr, v) => (arr.length===0 || arr.includes(String(v)));

  const dI = _idx_(header,'Department');
  const rI = _idx_(header,'Resource');
  const sI = _idx_(header,'Status');
  const tI = _idx_(header,'Type');

  const out = [];
  rows.forEach(r=>{
    if (!deptMatch(r[dI]))   return;
    if (!inSet(selRes,    r[rI])) return;
    if (!inSet(selStatus, r[sI])) return;
    if (!inSet(selTypes,  r[tI])) return;

    const obj = {};
    wantCols.forEach(c=>{
      let v = r[colIdx[c]];
      if (v instanceof Date && ['TimeFinish','Timestamp','CurrentStart','Duration'].includes(c)){
        v = v.getTime();
      }
      obj[c] = v;
    });
    out.push(obj);
  });

  return { columns: wantCols, rows: out };
}

/** =====================[ Actions / Dashboard เดิม ]===================== */
/** New: Search API for modal */
function getJobByBarcode(barcode) {
  try {
    const { rowVals } = findLastRowByBarcode_(barcode);
    const c = getColIdx_();
    return {
      ok: true,
      barcode:  String(rowVals[c.barcode]  || ''),
      status:   String(rowVals[c.status]   || ''),
      resource: String(rowVals[c.resource] || ''),
      type:     String(rowVals[c.type]     || ''),
      dept:     String(rowVals[c.dept]     || ''),
      note:     String(rowVals[c.note]     || '')
    };
  } catch (e) {
    return { ok:false, message: e.message || 'ไม่พบข้อมูล' };
  }
}

/** หยุดงาน */
function holdJob(barcode, reason) {
  const { sh, r, rowVals } = findLastRowByBarcode_(barcode);
  const c = getColIdx_();
  const now = new Date();

  let accum = Number(rowVals[c.accumMins] || 0);
  const cur  = _parseDate_(rowVals[c.currentStart]) ||
               _parseDate_(rowVals[c.duration])    ||
               _parseDate_(rowVals[c.timestamp]);
  if (cur) {
    const diffMins = Math.floor((now - cur) / 60000);
    if (diffMins > 0) accum += diffMins;
  }

  const noteOld = String(rowVals[c.note] || '').trim();
  let noteNew = noteOld;
  if (reason && reason.trim() !== '') {
    const entry  = reason.trim();
    const exists = noteOld.split('|').map(s => s.trim()).includes(entry);
    noteNew = exists ? noteOld : (noteOld ? noteOld + ' | ' + entry : entry);
  }

  sh.getRange(r + 1, c.status + 1).setValue('หยุดงาน');
  sh.getRange(r + 1, c.accumMins + 1).setValue(accum);
  sh.getRange(r + 1, c.currentStart + 1).setValue('');
  sh.getRange(r + 1, c.note + 1).setValue(noteNew);
}

/** เริ่มงาน/เริ่มต่อ */
function resumeJob(barcode) {
  const { sh, r, rowVals } = findLastRowByBarcode_(barcode);
  const c = getColIdx_();
  const now = new Date();

  sh.getRange(r + 1, c.status + 1).setValue('เริ่มงาน');
  sh.getRange(r + 1, c.currentStart + 1).setValue(now);

  if (!rowVals[c.duration] || String(rowVals[c.duration]).trim() === '') {
    sh.getRange(r + 1, c.duration + 1).setValue(now);
  }
  if (!rowVals[c.timestamp] || String(rowVals[c.timestamp]).trim() === '') {
    sh.getRange(r + 1, c.timestamp + 1).setValue(now);
  }
}

/** ส่งตรวจ */
function sendToInspect(barcode) {
  const { sh, r } = findLastRowByBarcode_(barcode);
  const c = getColIdx_();
  const now = new Date();
  sh.getRange(r + 1, c.status + 1).setValue('รอตรวจ');
  sh.getRange(r + 1, c.timeFinish + 1).setValue(now);
}

/** ส่งให้ Sale: บวกเวลาปัจจุบันเข้า AccumMins + ปิดงาน */
function sendToSales(barcode) {
  const { sh, r, rowVals } = findLastRowByBarcode_(barcode);
  const c = getColIdx_();
  const now = new Date();

  let accum = Number(rowVals[c.accumMins] || 0);
  const cur  = _parseDate_(rowVals[c.currentStart]) ||
               _parseDate_(rowVals[c.duration])    ||
               _parseDate_(rowVals[c.timestamp]);
  if (cur) {
    const diffMins = Math.floor((now - cur) / 60000);
    if (diffMins > 0) accum += diffMins;
  }

  sh.getRange(r + 1, c.accumMins + 1).setValue(accum);
  sh.getRange(r + 1, c.timeFinish + 1).setValue(now);
  sh.getRange(r + 1, c.status + 1).setValue('เสร็จแล้ว');
  sh.getRange(r + 1, c.currentStart + 1).setValue('');
}

/** ส่งให้ CAM: ปิดงานเดิม + สร้างแถวใหม่เข้าคิว CAM */
function sendToCAM(barcode) {
  const { sh, r, rowVals } = findLastRowByBarcode_(barcode);
  const c = getColIdx_();
  const now = new Date();

  let accum = Number(rowVals[c.accumMins] || 0);
  const cur  = _parseDate_(rowVals[c.currentStart]) ||
               _parseDate_(rowVals[c.duration])    ||
               _parseDate_(rowVals[c.timestamp]);
  if (cur) {
    const diffMins = Math.floor((now - cur) / 60000);
    if (diffMins > 0) accum += diffMins;
  }

  sh.getRange(r + 1, c.accumMins + 1).setValue(accum);
  sh.getRange(r + 1, c.timeFinish + 1).setValue(now);
  sh.getRange(r + 1, c.status + 1).setValue('เสร็จแล้ว');
  sh.getRange(r + 1, c.currentStart + 1).setValue('');

  const newRow = rowVals.slice();
  newRow[c.dept]         = 'CAM';
  newRow[c.resource]     = 'CAM';
  newRow[c.status]       = 'รอคิว';
  newRow[c.timestamp]    = now;
  newRow[c.duration]     = '';
  newRow[c.timeFinish]   = '';
  newRow[c.totalTime]    = '';
  newRow[c.currentStart] = '';
  newRow[c.accumMins]    = 0;
  newRow[c.note]         = '';

  sh.appendRow(newRow);
}

/** ส่งให้ PRD */
function sendToPRD(barcode) {
  const { sh, r, rowVals } = findLastRowByBarcode_(barcode);
  const c = getColIdx_();
  const now = new Date();

  let accum = Number(rowVals[c.accumMins] || 0);
  const cur  = _parseDate_(rowVals[c.currentStart]) ||
               _parseDate_(rowVals[c.duration])    ||
               _parseDate_(rowVals[c.timestamp]);
  if (cur) {
    const diffMins = Math.floor((now - cur) / 60000);
    if (diffMins > 0) accum += diffMins;
  }

  sh.getRange(r + 1, c.accumMins + 1).setValue(accum);
  sh.getRange(r + 1, c.timeFinish + 1).setValue(now);
  sh.getRange(r + 1, c.status + 1).setValue('เสร็จแล้ว');
  sh.getRange(r + 1, c.currentStart + 1).setValue('');

  const newRow = rowVals.slice();
  newRow[c.dept]         = 'PRD';
  newRow[c.resource]     = 'PRD';
  newRow[c.status]       = 'รอคิว';
  newRow[c.timestamp]    = now;
  newRow[c.duration]     = '';
  newRow[c.timeFinish]   = '';
  newRow[c.totalTime]    = '';
  newRow[c.currentStart] = '';
  newRow[c.accumMins]    = 0;
  newRow[c.note]         = '';

  sh.appendRow(newRow);
}

/** เริ่มงานแบบเลือกทรัพยากร */
function startJobWithResource(barcode, dept, resource) {
  const { sh, r, rowVals } = findLastRowByBarcode_(barcode);
  const c = getColIdx_();
  const now = new Date();

  sh.getRange(r + 1, c.dept + 1).setValue(dept);
  sh.getRange(r + 1, c.resource + 1).setValue(resource);
  sh.getRange(r + 1, c.status + 1).setValue('เริ่มงาน');
  sh.getRange(r + 1, c.currentStart + 1).setValue(now);

  if (!rowVals[c.duration]  || String(rowVals[c.duration]).trim()  === '')
    sh.getRange(r + 1, c.duration + 1).setValue(now);
  if (!rowVals[c.timestamp] || String(rowVals[c.timestamp]).trim() === '')
    sh.getRange(r + 1, c.timestamp + 1).setValue(now);
}

/** ===== ดึงข้อมูลไปเรนเดอร์ Dashboard ===== */
function getDetailedDashboardData() {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error('ไม่พบชีต "Logs"');

  const values = sheet.getDataRange().getValues();
  if (values.length < 1) throw new Error('ไม่พบข้อมูลในชีต "Logs"');
  const headers = values[0];

  const barcodeCol    = headers.indexOf('Barcode');
  const typeCol       = headers.indexOf('Type');
  const deptCol       = headers.indexOf('Department');
  const resourceCol   = headers.indexOf('Resource');
  const statusCol     = headers.indexOf('Status');
  const startTimeCol  = headers.indexOf('Timestamp');
  const durationCol   = headers.indexOf('Duration');
  const finishTimeCol = headers.indexOf('TimeFinish');
  const totalTimeCol  = headers.indexOf('TotalTime');
  const cusNmCol      = headers.indexOf('Cus.Nm');
  const priorityCol   = headers.indexOf('Priority');
  const currentStartCol = headers.indexOf('CurrentStart');
  const accumMinsCol  = headers.indexOf('AccumMins');
  const noteCol       = headers.indexOf('Note');

  [barcodeCol, typeCol, deptCol, resourceCol, statusCol, startTimeCol, durationCol,
   finishTimeCol, totalTimeCol, cusNmCol, priorityCol, currentStartCol, accumMinsCol, noteCol]
   .forEach((i) => { if (i === -1) throw new Error('คอลัมน์ที่จำเป็นหายไป'); });

  const resourceMap = {
    "DS":  ["DS","DS1(Deer)","DS2(Deam)","DS3(Biw)","DS4(Ming)","DS5(Jay)","DS6(Moss)","DS7(Boll)","DS8(Team)","DS9(Night)","DS10(Peet)"],
    "CAM": ["CAM","CAM1(Boy)","CAM2(Jit)","CAM3"],
    "ENG": ["EN","EN1(Wat)","EN2(Neung)","EN3(Boom)","EN4(Jay)","EN5(PAT)","EN6(KAMPHOL)","EN7(ART)","EN8(-)"],
  };

  const dashboardData = {};
  Object.keys(resourceMap).forEach(d => {
    dashboardData[d] = {};
    resourceMap[d].forEach(r => { dashboardData[d][r] = []; });
  });

  const allQueuedJobs = [];
  const tempRecentlyFinishedJobs = [];
  const now = new Date();

  for (let i = values.length - 1; i >= 1; i--) {
    const row = values[i];
    const barcode  = row[barcodeCol]; if (!barcode) continue;
    const type     = row[typeCol];
    const dept     = row[deptCol];
    const resource = row[resourceCol] || dept;
    const status   = String(row[statusCol] || '').trim();
    const note     = String(row[noteCol] || '');

    const theCur = _parseDate_(row[currentStartCol]) ||
                   _parseDate_(row[durationCol])    ||
                   _parseDate_(row[startTimeCol]);

    const accum  = Number(row[accumMinsCol] || 0);
    const fin    = _parseDate_(row[finishTimeCol]);

    let durationText = '';
    let customClass  = '';
    let priority     = String(row[priorityCol] || '').toLowerCase();
    const cusNmLower = String(row[cusNmCol] || '').toLowerCase();

    if (status === 'เริ่มงาน' || status === 'รอตรวจ') {
      let total = accum;
      if (theCur) total += Math.floor((now - theCur) / 60000);
      const d = Math.floor(total / 1440),
            h = Math.floor((total % 1440) / 60),
            m = total % 60;
      const label = (status === 'รอตรวจ') ? '⏱ ทำมาแล้ว (รอตรวจ)' : 'ทำมาแล้ว';
      durationText = `${label} ${d ? d + ' วัน ' : ''}${h ? h + ' ชม. ' : ''}${m} นาที`;
      if (status === 'รอตรวจ') customClass = 'pending-inspect';
      else if (d >= 1) customClass = 'start-red';
      else if (h >= 4) customClass = 'start-yellow';
    }
    else if (status === 'หยุดงาน') {
      const total = accum;
      const d = Math.floor(total / 1440),
            h = Math.floor((total % 1440) / 60),
            m = total % 60;
      durationText = `หยุดงาน${note ? ': ' + note : ''} / ทำมาแล้ว ${d ? d + ' วัน ' : ''}${h ? h + ' ชม. ' : ''}${m} นาที`;
      customClass = 'hold-job';
    }
    else if (status === 'รอคิว') {
      const start = _parseDate_(row[startTimeCol]);
      if (start) {
        const mins = Math.floor((now - start) / 60000);
        const d = Math.floor(mins / 1440),
              h = Math.floor((mins % 1440) / 60),
              m = mins % 60;
        durationText = `รอแล้ว ${d ? d + ' วัน ' : ''}${h ? h + ' ชม. ' : ''}${m} นาที`;
      } else {
        durationText = '-';
      }
    }
    else if (status === 'เสร็จแล้ว' && fin) {
      const mins = Math.floor((now - fin) / 60000);
      const d = Math.floor(mins / 1440),
            h = Math.floor((mins % 1440) / 60),
            m = mins % 60;
      durationText = `เสร็จมาแล้ว ${d ? d + ' วัน ' : ''}${h ? h + ' ชม. ' : ''}${m} นาที`;
    }
    else {
      durationText = '-';
    }

    // ===== ตรรกะงานด่วน (URGENT) =====
    const isUrgent =
      priority === 'urgent' ||
      cusNmLower.includes('urgent') ||
      status === 'กรุณารีบเร่งงาน' ||
      status === 'ล่าช้า';

    if (isUrgent) {
      customClass = (status === 'ล่าช้า')
        ? 'priority-delayed'
        : 'priority-extreme-urgent';
      priority = 'urgent';
    }

    const job = {
      barcode, type, status,
      duration: durationText,
      customClass, priority,
      finishTime: fin ? fin.getTime() : 0,
      dept, resource, note
    };

    if (['เริ่มงาน','รอคิว','ล่าช้า','กรุณารีบเร่งงาน','หยุดงาน','รอตรวจ'].includes(status)) {
      if (dashboardData[dept] && dashboardData[dept][resource]) {
        dashboardData[dept][resource].push(job);
      }
    }
    if (['รอคิว','ล่าช้า','กรุณารีบเร่งงาน'].includes(status)) allQueuedJobs.push(job);
    if (status === 'เสร็จแล้ว' && fin) tempRecentlyFinishedJobs.push(job);
  }

  tempRecentlyFinishedJobs.sort((a, b) => b.finishTime - a.finishTime);
  const recentlyFinishedJobs = tempRecentlyFinishedJobs.slice(0, 50);

  const currentTime = new Date().toLocaleString('th-TH', {
    hour12: false, year: 'numeric', month: 'numeric', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });

  const resourceStatuses = {};
  const avSheet = ss.getSheetByName('Resource_Availability');
  if (avSheet) {
    const d = avSheet.getDataRange().getValues();
    if (d.length > 1) {
      const rn = d[0].indexOf('Resource Name'),
            st = d[0].indexOf('Status');
      if (rn !== -1 && st !== -1) {
        for (let i = 1; i < d.length; i++) {
          const name = d[i][rn], s = d[i][st];
          if (name && s) resourceStatuses[name] = s;
        }
      }
    }
  }

  return {
    dashboardData,
    allQueuedJobs,
    recentlyFinishedJobs,
    currentTime,
    resourceStatuses
  };
}

/** ===== ดึงข้อมูล Design Dashboard ===== */
function getDesignData() {
  const defaultResponse = {
    board: {},
    summary: [],
    currentTime: new Date().toLocaleString('th-TH', { hour12: false }),
    types: [],
    team: [],
    metricsByType: {}
  };
  
  try {
    Logger.log('=== [getDesignData] START ===');
    Logger.log('[getDesignData] typeof getDesignDataSafe = ' + typeof getDesignDataSafe);
    
    if (typeof getDesignDataSafe !== 'function') {
      Logger.log('[getDesignData] ERROR: getDesignDataSafe is not a function!');
      return defaultResponse;
    }
    
    Logger.log('[getDesignData] Calling getDesignDataSafe()...');
    const result = getDesignDataSafe();
    
    Logger.log('[getDesignData] Result type: ' + typeof result);
    Logger.log('[getDesignData] Result is null: ' + (result === null));
    Logger.log('[getDesignData] Result is undefined: ' + (result === undefined));
    
    if (!result) {
      Logger.log('[getDesignData] Result is falsy, using defaultResponse');
      return defaultResponse;
    }
    
    if (result.__error) {
      Logger.log('[getDesignData] Got __error: ' + result.message);
      return result;
    }
    
    Logger.log('[getDesignData] Returning result with ' + (result.types ? result.types.length : 0) + ' types');
    return result;
    
  } catch (err) {
    Logger.log('[getDesignData] EXCEPTION: ' + err.message);
    Logger.log('[getDesignData] Stack: ' + err.stack);
    return defaultResponse;
  }
}

/** เติมย้อนหลัง CurrentStart จาก Duration */
function backfillCurrentStartFromDuration() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh = ss.getSheetByName(SHEET_NAME);
  const values = sh.getDataRange().getValues();
  const headers = values[0];
  const c = {
    status:       headers.indexOf('Status'),
    currentStart: headers.indexOf('CurrentStart'),
    duration:     headers.indexOf('Duration')
  };
  if (c.status === -1 || c.currentStart === -1 || c.duration === -1) {
    throw new Error('ไม่พบคอลัมน์ Status/CurrentStart/Duration');
  }

  for (let r = 1; r < values.length; r++) {
    const status = String(values[r][c.status] || '').trim();
    const cur    = values[r][c.currentStart];
    const dur    = values[r][c.duration];
    if ((status === 'เริ่มงาน' || status === 'รอตรวจ') &&
        (!cur || String(cur).trim() === '') && dur) {
      sh.getRange(r + 1, c.currentStart + 1).setValue(dur);
    }
  }
}

/** อัปเดตสถานะทีม Available / Out of Service */
function updateResourceStatus(resourceName, newStatus, reason) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheetName = 'Resource_Availability';
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(['Resource Name','Status','Reason','Last Updated']);
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const resNameCol = headers.indexOf('Resource Name');
  const statusCol  = headers.indexOf('Status');
  const reasonCol  = headers.indexOf('Reason');
  const lastCol    = headers.indexOf('Last Updated');

  if ([resNameCol, statusCol, reasonCol, lastCol].includes(-1)) {
    throw new Error('คอลัมน์หายไปในชีต Resource_Availability');
  }

  let found = -1;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][resNameCol]).trim() === String(resourceName).trim()) {
      found = i; break;
    }
  }
  const now = new Date();
  if (found !== -1) {
    sheet.getRange(found + 1, statusCol + 1).setValue(newStatus);
    sheet.getRange(found + 1, reasonCol + 1).setValue(newStatus === 'Available' ? '' : reason);
    sheet.getRange(found + 1, lastCol + 1).setValue(now);
  } else {
    sheet.appendRow([resourceName, newStatus, newStatus === 'Available' ? '' : reason, now]);
  }
}

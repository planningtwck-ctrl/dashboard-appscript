/** =====================[ CODE DASHBOARD ]===================== */
/** ฟังก์ชันสำหรับ Dashboard ทั่วไป */

/** ===== IMPORT CONFIG ===== */
// ✅ ห้ามอ่าน CONFIG หรือ BUILD_ID ที่ global scope
// จะอ่านภายในฟังก์ชันเท่านั้น

/** ===== MAIN ROUTER FUNCTION ===== */

/**
 * ฟังก์ชันหลักสำหรับ routing requests
 * @param {Object} e - Event object
 * @return {HtmlOutput|TextOutput} Response
 */
function doGet(e) {
  Logger.log('[doGet] START ===');
  
  // ✅ อ่านพารามิเตอร์ทั้งหมด
  const p = e && e.parameter ? e.parameter : {};
  const api = (p.api || '').trim();
  const view = (p.view || '').trim();
  
  // ✅ ใช้ฟังก์ชันแทนการอ่านตรงๆ
  const BUILD_ID = getBuildId();
  
  Logger.log('[doGet] params=' + JSON.stringify(p));
  Logger.log('[doGet] api="' + api + '" | view="' + view + '"');
  Logger.log('[doGet] BUILD_ID: ' + BUILD_ID);
  
  try {
    // ✅ API MODE: คืน JSON เท่านั้น
    if (api) {
      Logger.log('[doGet] API MODE: ' + api);
      
      try {
        let data;
        let signature;
        
        if (api === 'dashboardData') {
          Logger.log('[doGet] API MODE dashboardData: Returning JSON');
          signature = 'sig=GD_v1_API_DASHBOARD_DATA';
          data = getDetailedDashboardData();
        } else if (api === 'designData') {
          Logger.log('[doGet] API MODE designData: Returning JSON');
          signature = 'sig=GD_v1_API_DESIGN_DATA';
          data = getDesignDataDS_();
        } else {
          Logger.log('[doGet] Unknown API: ' + api);
          const errorResult = {
            ok: false,
            data: null,
            error: 'Unknown API endpoint: ' + api,
            timestamp: new Date().toISOString()
          };
          
          return ContentService.createTextOutput(JSON.stringify(errorResult))
            .setMimeType(ContentService.MimeType.JSON);
        }
        
        Logger.log('[doGet] ' + signature + ' success');
        Logger.log('[doGet] Data type: ' + typeof data);
        Logger.log('[doGet] Data keys: ' + (data ? Object.keys(data).join(', ') : 'null'));
        
        // ✅ สร้าง response ตามมาตรฐาน
        const result = {
          ok: data.success !== false, // ตรวจว่ามี error หรือไม่
          data: data.success !== false ? data : null,
          error: data.success !== false ? null : (data.error || 'Unknown error'),
          timestamp: new Date().toISOString(),
          buildId: BUILD_ID
        };
        
        const jsonString = JSON.stringify(result);
        Logger.log('[doGet] JSON length: ' + jsonString.length);
        Logger.log('[doGet] JSON preview: ' + jsonString.substring(0, 200) + '...');
        
        // ✅ คืน JSON ด้วย ContentService เท่านั้น
        return ContentService.createTextOutput(jsonString)
          .setMimeType(ContentService.MimeType.JSON);
          
      } catch (err) {
        Logger.log('[doGet] API ERROR: ' + err.message);
        Logger.log('[doGet] Stack: ' + err.stack);
        
        // ✅ คืน error เป็น JSON เสมอ
        const errorResult = {
          ok: false,
          data: null,
          error: err.message || 'Unknown error',
          timestamp: new Date().toISOString(),
          buildId: BUILD_ID,
          stack: err.stack || ''
        };
        
        return ContentService.createTextOutput(JSON.stringify(errorResult))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    // ✅ WEB MODE: คืน HTML ผ่าน Template
    Logger.log('[doGet] WEB MODE: Returning HTML for view=' + view);
    Logger.log('[doGet] SIGNATURE: sig=GD_v1_WEB_APP');
    
    // ✅ ตรวจสอบ view parameter
    if (!view || (view !== 'dashboard' && view !== 'design')) {
      Logger.log('[doGet] Invalid view: defaulting to dashboard');
      view = 'dashboard';
    }
    
    // ✅ ดึง Web App URL และ inject ใน template
    const webappUrl = ScriptApp.getService().getUrl();
    Logger.log('[doGet] Web App URL: ' + webappUrl);
    Logger.log('[doGet] Web App URL type: ' + typeof webappUrl);
    Logger.log('[doGet] Web App URL length: ' + webappUrl.length);
    
    // ✅ สร้าง Template และ inject ตัวแปร
    let template;
    let templateFileName;
    
    if (view === 'design') {
      templateFileName = 'js_design';
    } else {
      templateFileName = 'Dashboard';
    }
    
    Logger.log('[doGet] Loading template file: ' + templateFileName);
    template = HtmlService.createTemplateFromFile(templateFileName);
    
    // ✅ Inject ตัวแปรที่จำเป็นสำหรับ template
    // ใช้ปกติ variable injection (<?= ?>) ใน template
    template.WEBAPP_URL = webappUrl;
    template.BUILD_ID = BUILD_ID;
    template.VIEW = view;
    
    // ✅ Debug: ตรวจสอบค่าที่จะส่งให้ template
    Logger.log('[doGet] Template variables:');
    Logger.log('[doGet] - WEBAPP_URL: ' + template.WEBAPP_URL);
    Logger.log('[doGet] - BUILD_ID: ' + template.BUILD_ID);
    Logger.log('[doGet] - VIEW: ' + template.VIEW);
    
    // ✅ Evaluate template และ set output properties
    let output;
    try {
      output = template.evaluate();
      Logger.log('[doGet] Template.evaluate() completed');
    } catch (evalErr) {
      Logger.log('[doGet] Template.evaluate() ERROR: ' + evalErr.message);
      Logger.log('[doGet] Stack: ' + evalErr.stack);
      throw evalErr;
    }
    
    // ✅ Set metadata สำหรับ HTML output
    output
      .setTitle('Dashboard | GD v1')
      .setDescription('Real-time Job Tracking Dashboard')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
      
    Logger.log('[doGet] HTML output configured successfully');
    Logger.log('[doGet] WEB MODE completed');
    Logger.log('[doGet] END ===');
    
    return output;
    
  } catch (err) {
    Logger.log('[doGet] GLOBAL EXCEPTION: ' + err.message);
    Logger.log('[doGet] Stack: ' + err.stack);
    Logger.log('[doGet] SIGNATURE: sig=GD_v1_GLOBAL_ERROR');
    
    // ✅ คืน error HTML page
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

/** ===== WEB APP FUNCTIONS ===== */

/**
 * ดึง URL ของ Web App
 * @return {string} Web App URL
 */
function getWebAppUrl() {
  return ScriptApp.getService().getUrl();
}

/**
 * ดึงข้อมูล Dashboard แบบละเอียด
 * @return {Object} Dashboard data
 */
function getDetailedDashboardData() {
  Logger.log('=== [getDetailedDashboardData] START ===');
  
  // ✅ อ่าน BUILD_ID ภายในฟังก์ชันเท่านั้น
  const BUILD_ID = CONFIG.BUILD_ID;
  
  try {
    // ✅ อ่านข้อมูลจาก Spreadsheet
    const dashboardData = _readDashboardData_();
    const statusCounts = _calculateStatusCounts_(dashboardData);
    const lastUpdated = new Date().toISOString();
    
    const result = {
      success: true,
      buildId: BUILD_ID,
      timestamp: lastUpdated,
      dashboardData: dashboardData,
      statusCounts: statusCounts,
      lastUpdated: lastUpdated
    };
    
    // ✅ Logger ก่อน return ทุกครั้ง
    Logger.log('[getDetailedDashboardData] SUCCESS: ' + JSON.stringify(result));
    Logger.log('[getDetailedDashboardData] Departments: ' + Object.keys(dashboardData).join(', '));
    
    return result;
    
  } catch (e) {
    Logger.log('[getDetailedDashboardData] ERROR: ' + e.message);
    Logger.log('[getDetailedDashboardData] Stack: ' + e.stack);
    
    // ✅ คืนโครงสร้าง dashboardData ครบเพื่อไม่ให้หน้าเว็บพัง
    const emptyDashboardData = {
      ENG: [],
      DS: [],
      CAM: []
    };
    
    const errorResult = {
      success: false,
      buildId: BUILD_ID,
      timestamp: new Date().toISOString(),
      dashboardData: emptyDashboardData,
      statusCounts: {},
      lastUpdated: new Date().toISOString(),
      error: e.message || 'Unknown error'
    };
    
    // ✅ Logger ก่อน return error
    Logger.log('[getDetailedDashboardData] ERROR RESULT: ' + JSON.stringify(errorResult));
    
    return errorResult;
  }
}

/** ===== HELPER FUNCTIONS ===== */

/**
 * อ่านข้อมูล Dashboard จาก Spreadsheet
 * @return {Object} Dashboard data จัดกลุ่มตามแผนก
 */
function _readDashboardData_() {
  Logger.log('=== [_readDashboardData_] START ===');
  
  try {
    // ✅ ใช้ CONFIG จาก Config.gs
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
    
    if (!sheet) {
      Logger.log('_readDashboardData_: Sheet ' + CONFIG.SHEET_NAME + ' not found');
      return _createEmptyDashboardData_();
    }
    
    const data = sheet.getDataRange().getValues();
    if (data.length < 2) {
      Logger.log('_readDashboardData_: No data found');
      return _createEmptyDashboardData_();
    }
    
    const headers = data[0].map(h => String(h || '').trim());
    const rows = [];
    
    // ✅ แปลงข้อมูลเป็น objects
    for (let r = 1; r < data.length; r++) {
      const row = {};
      for (let c = 0; c < headers.length; c++) {
        row[headers[c]] = data[r][c] || '';
      }
      rows.push(row);
    }
    
    // ✅ จัดกลุ่มตามแผนก
    const dashboardData = {
      ENG: [],
      DS: [],
      CAM: []
    };
    
    rows.forEach(row => {
      const dept = String(row.Department || '').trim().toUpperCase();
      const status = String(row.Status || '').trim().toLowerCase();
      
      // ✅ กรองเฉพาะงานที่ยังไม่เสร็จ
      if (status !== 'finished' && status !== 'เสร็จสิ้น') {
        if (dept === 'ENG' || dept === 'ENGINEERING') {
          dashboardData.ENG.push(row);
        } else if (dept === 'DS' || dept === 'DESIGN') {
          dashboardData.DS.push(row);
        } else if (dept === 'CAM' || dept === 'CAMERA') {
          dashboardData.CAM.push(row);
        }
      }
    });
    
    Logger.log('_readDashboardData_: ENG=' + dashboardData.ENG.length + 
               ', DS=' + dashboardData.DS.length + 
               ', CAM=' + dashboardData.CAM.length);
    
    return dashboardData;
    
  } catch (e) {
    Logger.log('_readDashboardData_ ERROR: ' + e.message);
    return _createEmptyDashboardData_();
  }
}

/**
 * สร้างโครงสร้าง dashboardData ว่างเปล่า
 * @return {Object} Empty dashboard data structure
 */
function _createEmptyDashboardData_() {
  return {
    ENG: [],
    DS: [],
    CAM: []
  };
}

/**
 * คำนวณสถิติตามสถานะ
 * @param {Object} dashboardData - Dashboard data
 * @return {Object} Status counts
 */
function _calculateStatusCounts_(dashboardData) {
  const statusCounts = {};
  
  Object.keys(dashboardData).forEach(dept => {
    statusCounts[dept] = {
      total: dashboardData[dept].length,
      pending: 0,
      inProgress: 0,
      completed: 0
    };
    
    dashboardData[dept].forEach(item => {
      const status = String(item.Status || '').trim().toLowerCase();
      if (status.includes('pending') || status.includes('รอ')) {
        statusCounts[dept].pending++;
      } else if (status.includes('progress') || status.includes('ทำ')) {
        statusCounts[dept].inProgress++;
      } else if (status.includes('complete') || status.includes('เสร็จ')) {
        statusCounts[dept].completed++;
      }
    });
  });
  
  return statusCounts;
}

/**
 * แปลงวันที่อย่างปลอดภัย
 * @param {*} dateValue - ค่าวันที่
 * @return {Date|null} Date object หรือ null
 */
function _parseDateSafe(dateValue) {
  if (!dateValue) return null;
  try {
    if (dateValue instanceof Date) return dateValue;
    if (typeof dateValue === 'number') return new Date(dateValue);
    if (typeof dateValue === 'string') {
      const d = new Date(dateValue);
      return isNaN(d.getTime()) ? null : d;
    }
    return null;
  } catch (e) {
    Logger.log('_parseDateSafe ERROR: ' + e.message);
    return null;
  }
}

/**
 * ทำความสะอาดข้อความ
 * @param {string} str - ข้อความ
 * @return {string} ข้อความที่ทำความสะอาดแล้ว
 */
function _escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * สร้าง error response
 * @param {string} message - ข้อความ error
 * @param {Object} details - รายละเอียดเพิ่มเติม
 * @return {Object} Error response object
 */
function _createErrorResponse(message, details = {}) {
  return {
    success: false,
    error: message,
    buildId: BUILD_ID,
    timestamp: new Date().toISOString(),
    ...details
  };
}

/**
 * สร้าง success response
 * @param {Object} data - ข้อมูลที่จะส่งกลับ
 * @return {Object} Success response object
 */
function _createSuccessResponse(data) {
  return {
    success: true,
    data: data,
    buildId: BUILD_ID,
    timestamp: new Date().toISOString()
  };
}

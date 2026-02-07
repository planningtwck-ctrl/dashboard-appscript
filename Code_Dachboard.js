/** =====================[ DASHBOARD ROUTER ]===================== */
/** ฟังก์ชันสำหรับ routing และ doGet */

/** ===== IMPORT BUILD ID ===== */
// ✅ ใช้ BUILD_ID โดยตรงจาก Build.gs
const BUILD_ID = 'GD_v1_BUILD';

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
  const view = (p.view || 'design').trim();
  const mode = (p.mode || '').trim();
  
  Logger.log('[doGet] params=' + JSON.stringify(p));
  Logger.log('[doGet] api="' + api + '" | view="' + view + '" | mode="' + mode + '"');
  Logger.log('[doGet] BUILD_ID: ' + BUILD_ID);
  
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

/** ===== HELPER FUNCTIONS ===== */

/**
 * ดึง Web App URL
 * @return {string} Web App URL
 */
function getWebAppUrl() {
  return ScriptApp.getService().getUrl();
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

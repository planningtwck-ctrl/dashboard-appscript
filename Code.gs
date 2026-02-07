/** =====================[ CODE DASHBOARD ]===================== */
/** ฟังก์ชันสำหรับ Dashboard ทั่วไป */

/** ===== IMPORT CONFIG ===== */
// ใช้ค่าจาก Config.gs
const BUILD_ID = CONFIG.BUILD_ID;

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
  Logger.log('[getDetailedDashboardData] BUILD_ID: ' + BUILD_ID);
  
  try {
    // TODO: Implement detailed dashboard logic
    return {
      success: true,
      message: 'Dashboard data loaded successfully',
      buildId: BUILD_ID,
      timestamp: new Date().toISOString()
    };
  } catch (e) {
    Logger.log('[getDetailedDashboardData] ERROR: ' + e.message);
    return {
      success: false,
      error: e.message,
      buildId: BUILD_ID,
      timestamp: new Date().toISOString()
    };
  }
}

/** ===== HELPER FUNCTIONS ===== */

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

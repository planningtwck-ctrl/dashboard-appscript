/** =====================[ CONFIG ]===================== */
/** ไฟล์คอนฟิกกลางสำหรับ Apps Script ทั้งหมด */

/** ===== GLOBAL CONFIGURATION ===== */
// ✅ ใช้ var แทน const เพื่อให้เป็น Global ทันที
var CONFIG = {
  // Spreadsheet Configuration
  SPREADSHEET_ID: '1_HEbYwvcGzMU0QBCMLDILQWcEg9UhfeSM69jUVZGJFo',
  SHEET_NAME: 'Logs',
  AV_SHEET_NAME: 'Resource_Availability',
  
  // Build Configuration
  BUILD_ID: 'GD_v1_CONFIG',
  
  // Dashboard Configuration
  DASHBOARD_TYPES: ['แบบจ่ายงาน', 'แก้ไขแบบจ่ายงาน', 'แบบผลิต', 'แบบผลิต-วายริ่ง'],
  
  // Department Configuration
  DESIGN_DEPARTMENTS: ['Design', 'DS', 'Design Department', 'แผนก Design'],
  
  // API Configuration
  API_TIMEOUT: 30000,
  CACHE_DURATION: 300 // 5 minutes
};

/** ===== HELPER FUNCTIONS ===== */

/**
 * ดึงค่า config ตาม key
 * @param {string} key - ชื่อ config ที่ต้องการ
 * @return {*} ค่า config ที่ระบุ
 */
function getConfig(key) {
  return CONFIG[key] || null;
}

/**
 * ดึงค่า spreadsheet ID
 * @return {string} Spreadsheet ID
 */
function getSpreadsheetId() {
  return CONFIG.SPREADSHEET_ID;
}

/**
 * ดึงค่า sheet name
 * @return {string} Sheet name
 */
function getSheetName() {
  return CONFIG.SHEET_NAME;
}

/**
 * ดึงค่า availability sheet name
 * @return {string} Availability sheet name
 */
function getAvailabilitySheetName() {
  return CONFIG.AV_SHEET_NAME;
}

/**
 * ดึงค่า build ID
 * @return {string} Build ID
 */
function getBuildId() {
  return CONFIG.BUILD_ID;
}

/**
 * ตรวจสอบว่าเป็นแผนก Design หรือไม่
 * @param {string} department - ชื่อแผนก
 * @return {boolean} true ถ้าเป็นแผนก Design
 */
function isDesignDepartment(department) {
  return CONFIG.DESIGN_DEPARTMENTS.includes(String(department || '').trim());
}

/**
 * ดึงค่า dashboard types
 * @return {Array} Array of dashboard types
 */
function getDashboardTypes() {
  return CONFIG.DASHBOARD_TYPES;
}

/**
 * Log config สำหรับ debug
 */
function logConfig() {
  Logger.log('=== CONFIG DEBUG ===');
  Logger.log('SPREADSHEET_ID: ' + CONFIG.SPREADSHEET_ID);
  Logger.log('SHEET_NAME: ' + CONFIG.SHEET_NAME);
  Logger.log('AV_SHEET_NAME: ' + CONFIG.AV_SHEET_NAME);
  Logger.log('BUILD_ID: ' + CONFIG.BUILD_ID);
  Logger.log('DASHBOARD_TYPES: ' + JSON.stringify(CONFIG.DASHBOARD_TYPES));
  Logger.log('DESIGN_DEPARTMENTS: ' + JSON.stringify(CONFIG.DESIGN_DEPARTMENTS));
  Logger.log('=== END CONFIG DEBUG ===');
}

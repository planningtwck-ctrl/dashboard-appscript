/** =====================[ BUILD CONFIGURATION ]===================== */
/** ไฟล์คอนฟิก Build ID สำหรับ Apps Script ทั้งหมด */

/** ===== GLOBAL BUILD OBJECT ===== */
// ✅ ใช้ var เพื่อให้เป็น Global ทันที
var BUILD = {
  ID: 'GD_v1_BUILD',
  VERSION: '1.0.0',
  ENVIRONMENT: 'production'
};

// ✅ ตั้งค่า globalThis เพื่อให้ไฟล์อื่นเข้าถึงได้
globalThis.BUILD = BUILD;

/**
 * ดึงค่า Build ID
 * @return {string} Build ID
 */
function getBuildId() {
  return (typeof BUILD !== 'undefined' && BUILD.ID) ? BUILD.ID : 'UNKNOWN';
}

/**
 * ดึงค่า Build Version
 * @return {string} Build Version
 */
function getBuildVersion() {
  return (typeof BUILD !== 'undefined' && BUILD.VERSION) ? BUILD.VERSION : 'UNKNOWN';
}

/**
 * ดึงค่า Environment
 * @return {string} Environment
 */
function getEnvironment() {
  return (typeof BUILD !== 'undefined' && BUILD.ENVIRONMENT) ? BUILD.ENVIRONMENT : 'UNKNOWN';
}

/**
 * Log build information สำหรับ debug
 */
function logBuildInfo() {
  Logger.log('=== BUILD INFO DEBUG ===');
  Logger.log('BUILD.ID: ' + BUILD.ID);
  Logger.log('BUILD.VERSION: ' + BUILD.VERSION);
  Logger.log('BUILD.ENVIRONMENT: ' + BUILD.ENVIRONMENT);
  Logger.log('=== END BUILD INFO DEBUG ===');
}

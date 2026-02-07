/** =====================[ BUILD CONFIGURATION ]===================== */
/** ไฟล์คอนฟิกกลาง Build ID สำหรับ Apps Script ทั้งหมด */

/** ===== GLOBAL BUILD ID ===== */
// ✅ ใช้ var เพื่อให้เป็น Global ทันที
var BUILD_ID = 'GD_v1_BUILD';

/**
 * ดึงค่า build ID
 * @return {string} Build ID
 */
function getBuildId() {
  return BUILD_ID;
}

/**
 * Log build ID สำหรับ debug
 */
function logBuildId() {
  Logger.log('=== BUILD ID DEBUG ===');
  Logger.log('BUILD_ID: ' + BUILD_ID);
  Logger.log('=== END BUILD ID DEBUG ===');
}

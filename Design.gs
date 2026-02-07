/** =====================[ DESIGN DASHBOARD ]===================== */
/** ฟังก์ชันสำหรับ Design Dashboard โดยเฉพาะ */

/** ===== IMPORT BUILD ID ===== */
// ✅ ใช้ BUILD_ID โดยตรงจาก Build.gs
const BUILD_ID = 'GD_v1_BUILD';

/** ===== HELPER FUNCTIONS ===== */

/** แปลงวันที่อย่างปลอดภัย */
function _parseDateSafe_(dateValue) {
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
    Logger.log('_parseDateSafe_ ERROR: ' + e.message);
    return null;
  }
}

/** ตรวจสอบว่าเป็นแผนก Design หรือไม่ */
function _isDesignDept_(department) {
  const designDepts = ['Design', 'DS', 'Design Department', 'แผนก Design'];
  return designDepts.includes(String(department || '').trim());
}

/** อ่านข้อมูล Availability จาก Resource_Availability */
function _readAvailabilityMap_() {
  try {
    const ss = SpreadsheetApp.openById('1_HEbYwvcGzMU0QBCMLDILQWcEg9UhfeSM69jUVZGJFo');
    const avSheet = ss.getSheetByName('Resource_Availability');
    
    if (!avSheet) {
      Logger.log('_readAvailabilityMap_: Sheet Resource_Availability not found');
      return {};
    }
    
    const data = avSheet.getDataRange().getValues();
    if (data.length < 2) return {};
    
    const headers = data[0].map(h => String(h || '').trim());
    const resNameCol = headers.indexOf('Resource Name');
    const statusCol = headers.indexOf('Status');
    const reasonCol = headers.indexOf('Reason');
    
    if ([resNameCol, statusCol, reasonCol].includes(-1)) {
      Logger.log('_readAvailabilityMap_: Missing required columns');
      return {};
    }
    
    const availabilityMap = {};
    for (let r = 1; r < data.length; r++) {
      const resource = String(data[r][resNameCol] || '').trim();
      const status = String(data[r][statusCol] || '').trim();
      const reason = String(data[r][reasonCol] || '').trim();
      
      if (resource) {
        availabilityMap[resource] = { status, reason };
      }
    }
    
    Logger.log('_readAvailabilityMap_: Read ' + Object.keys(availabilityMap).length + ' resources');
    return availabilityMap;
    
  } catch (e) {
    Logger.log('_readAvailabilityMap_ ERROR: ' + e.message);
    return {};
  }
}

/** หา index ของคอลัมน์จากชื่อ */
function _colIndex_(headers, columnName) {
  return headers.findIndex(h => String(h || '').trim().toLowerCase() === String(columnName || '').trim().toLowerCase());
}

/** ===== MAIN DATA FUNCTION ===== */

/**
 * ฟังก์ชันหลักสำหรับ Design Dashboard
 * คืนข้อมูลงานค้าง, ทีม, และ KPI ต่างๆ
 */
function getDesignDataDS_() {
  Logger.log('=== [getDesignDataDS_] START ===');
  Logger.log('[getDesignDataDS_] BUILD_ID: ' + BUILD_ID);
  Logger.log('[getDesignDataDS_] SIGNATURE: sig=GD_DS_V1');
  
  try {
    const result = {
      __signature: 'SIG_GETDESIGNDATA_DS_V1',
      __buildId: BUILD_ID,
      __timestamp: new Date().toISOString(),
      board: {},
      types: [],
      team: [],
      summary: [],
      metricsByType: {},
      currentTime: new Date().toLocaleString('th-TH')
    };
    
    // ✅ อ่านข้อมูลจาก Logs sheet
    const logsData = _readLogsSheet_();
    if (!logsData || logsData.length === 0) {
      Logger.log('[getDesignDataDS_] No logs data found');
      result.__noPendingJobs = true;
      result.__message = 'ไม่มีข้อมูลใน Logs';
      return result;
    }
    
    // ✅ กรองเฉพาะงาน Design
    const designJobs = logsData.filter(job => _isDesignDept_(job.Department));
    Logger.log('[getDesignDataDS_] Found ' + designJobs.length + ' Design jobs');
    
    if (designJobs.length === 0) {
      Logger.log('[getDesignDataDS_] No Design jobs found');
      result.__noPendingJobs = true;
      result.__message = 'ไม่มีงาน Design';
      return result;
    }
    
    // ✅ แยกงานค้างและงานเสร็จ
    const { pendingJobs, finishedJobs } = _separateJobs_(designJobs);
    result.__pendingJobsCount = pendingJobs.length;
    
    Logger.log('[getDesignDataDS_] Pending jobs: ' + pendingJobs.length);
    Logger.log('[getDesignDataDS_] Finished jobs: ' + finishedJobs.length);
    
    // ✅ จัดกลุ่มงานตาม Type
    const groupedJobs = _groupJobsByType_(pendingJobs);
    result.board = groupedJobs;
    result.types = Object.keys(groupedJobs);
    
    // ✅ สรุปข้อมูลตาม Type
    result.summary = _createSummary_(groupedJobs);
    
    // ✅ อ่านข้อมูลทีม
    result.team = _getTeamData_(pendingJobs);
    
    // ✅ คำนวณ KPI ตาม Type
    result.metricsByType = _calculateMetricsByType_(groupedJobs, finishedJobs);
    
    Logger.log('[getDesignDataDS_] SUCCESS: Data prepared');
    Logger.log('[getDesignDataDS_] Result keys: ' + Object.keys(result).join(', '));
    
    return result;
    
  } catch (e) {
    Logger.log('[getDesignDataDS_] ERROR: ' + e.message);
    Logger.log('[getDesignDataDS_] Stack: ' + e.stack);
    
    return {
      __error: true,
      __signature: 'SIG_GETDESIGNDATA_DS_ERROR',
      __buildId: BUILD_ID,
      message: e.message || 'Unknown error',
      stack: e.stack || '',
      timestamp: new Date().toISOString()
    };
  }
}

/** ===== HELPER FUNCTIONS FOR DATA PROCESSING ===== */

/** อ่านข้อมูลจาก Logs sheet */
function _readLogsSheet_() {
  try {
    const ss = SpreadsheetApp.openById('1_HEbYwvcGzMU0QBCMLDILQWcEg9UhfeSM69jUVZGJFo');
    const sheet = ss.getSheetByName('Logs');
    
    if (!sheet) {
      Logger.log('_readLogsSheet_: Sheet Logs not found');
      return [];
    }
    
    const data = sheet.getDataRange().getValues();
    if (data.length < 2) return [];
    
    const headers = data[0].map(h => String(h || '').trim());
    const rows = [];
    
    for (let r = 1; r < data.length; r++) {
      const row = {};
      for (let c = 0; c < headers.length; c++) {
        row[headers[c]] = data[r][c] || '';
      }
      rows.push(row);
    }
    
    Logger.log('_readLogsSheet_: Read ' + rows.length + ' rows');
    return rows;
    
  } catch (e) {
    Logger.log('_readLogsSheet_ ERROR: ' + e.message);
    return [];
  }
}

/** แยกงานค้างและงานเสร็จ */
function _separateJobs_(jobs) {
  const pendingJobs = [];
  const finishedJobs = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  jobs.forEach(job => {
    const finishDate = _parseDateSafe_(job.TimeFinish);
    const status = String(job.Status || '').trim().toLowerCase();
    
    if (finishDate && finishDate <= today) {
      finishedJobs.push(job);
    } else if (status !== 'finished' && status !== 'เสร็จสิ้น') {
      pendingJobs.push(job);
    }
  });
  
  return { pendingJobs, finishedJobs };
}

/** จัดกลุ่มงานตาม Type */
function _groupJobsByType_(jobs) {
  const grouped = {};
  
  jobs.forEach(job => {
    const type = String(job.Type || job['ประเภทงาน'] || 'ไม่ระบุ').trim();
    
    if (!grouped[type]) {
      grouped[type] = { doing: [], queue: [] };
    }
    
    const status = String(job.Status || '').trim().toLowerCase();
    if (status.includes('ทำ') || status.includes('doing')) {
      grouped[type].doing.push(job);
    } else {
      grouped[type].queue.push(job);
    }
  });
  
  return grouped;
}

/** สร้างสรุปข้อมูลตาม Type */
function _createSummary_(groupedJobs) {
  const summary = [];
  
  Object.keys(groupedJobs).forEach(type => {
    const group = groupedJobs[type];
    summary.push({
      type: type,
      doing: group.doing.length,
      queue: group.queue.length,
      total: group.doing.length + group.queue.length
    });
  });
  
  return summary;
}

/** ดึงข้อมูลทีม */
function _getTeamData_(jobs) {
  const teamMap = {};
  
  jobs.forEach(job => {
    const resource = String(job.Resource || job['ผู้รับผิดชอบ'] || '').trim();
    if (resource && !teamMap[resource]) {
      teamMap[resource] = {
        person: resource,
        total: 0,
        metrics: {
          newToday: 0,
          finishedToday: 0,
          overdue3d: 0
        }
      };
    }
    
    if (resource) {
      teamMap[resource].total++;
    }
  });
  
  // ✅ เพิ่มข้อมูล availability
  const availabilityMap = _readAvailabilityMap_();
  Object.keys(teamMap).forEach(resource => {
    if (availabilityMap[resource]) {
      teamMap[resource].availabilityStatus = availabilityMap[resource].status;
      teamMap[resource].availabilityReason = availabilityMap[resource].reason;
      teamMap[resource].displayStatus = availabilityMap[resource].status;
    } else {
      teamMap[resource].availabilityStatus = 'Available';
      teamMap[resource].displayStatus = 'Available';
    }
  });
  
  return Object.values(teamMap);
}

/** คำนวณ KPI ตาม Type */
function _calculateMetricsByType_(groupedJobs, finishedJobs) {
  const metrics = {};
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const threeDaysAgo = new Date(today);
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  
  Object.keys(groupedJobs).forEach(type => {
    const group = groupedJobs[type];
    
    // ✅ งานใหม่วันนี้
    const newToday = group.doing.concat(group.queue).filter(job => {
      const createDate = _parseDateSafe_(job.TimeCreate);
      return createDate && createDate >= today;
    });
    
    // ✅ งานเสร็จวันนี้
    const finishedToday = finishedJobs.filter(job => {
      const finishDate = _parseDateSafe_(job.TimeFinish);
      return job.Type === type && finishDate && finishDate >= today;
    });
    
    // ✅ งานค้างเกิน 3 วัน
    const overdue3d = group.doing.concat(group.queue).filter(job => {
      const createDate = _parseDateSafe_(job.TimeCreate);
      return createDate && createDate < threeDaysAgo;
    });
    
    metrics[type] = {
      newToday: {
        count: newToday.length,
        jobs: newToday.map(j => j.Barcode || j['เลขที่'] || '').filter(Boolean)
      },
      finishedToday: {
        count: finishedToday.length,
        jobs: finishedToday.map(j => j.Barcode || j['เลขที่'] || '').filter(Boolean)
      },
      overdue3d: {
        count: overdue3d.length,
        jobs: overdue3d.map(j => j.Barcode || j['เลขที่'] || '').filter(Boolean)
      }
    };
  });
  
  return metrics;
}

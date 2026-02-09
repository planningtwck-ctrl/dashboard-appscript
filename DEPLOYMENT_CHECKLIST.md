# 📋 Deployment Checklist - Dashboard AppScript

## ✅ สิ่งที่ต้องทำก่อน Deploy

### 1. **ตรวจสอบโค้ด Server ให้ครบถ้วน**
- [x] `Code.gs` - `doGet(e)` รองรับ:
  - ✅ `?api=dashboardData` → คืน JSON (getDetailedDashboardData)
  - ✅ `?api=designData` → คืน JSON (getDesignDataDS_)
  - ✅ `?view=dashboard` → render Dashboard.html ผ่าน template
  - ✅ `?view=design` → render js_design.html ผ่าน template
  - ✅ Template inject: `WEBAPP_URL`, `BUILD_ID`, `VIEW`

- [x] `Design.gs` - `getDesignDataDS_()` return object พร้อม:
  - ✅ success flag หรือ board, types, summary, team, metricsByType
  - ✅ ไม่ return null (return empty object หรือ default values ต้องการ)

- [x] `Config.gs` - CONFIG object มี:
  - ✅ SPREADSHEET_ID
  - ✅ SHEET_NAME
  - ✅ AV_SHEET_NAME
  - ✅ BUILD_ID
  - ✅ ตัวแปรอื่น

- [x] `Build.gs` - BUILD object มี:
  - ✅ ID
  - ✅ VERSION
  - ✅ ENVIRONMENT

### 2. **ตรวจสอบ Client-Side Templates**
- [x] `Dashboard.html` - ใช้ `<? WEBAPP_URL ?>` (ไม่ใช่ `<?!= ?>`)
  - ✅ Fetch: `WEBAPP_URL + '?api=dashboardData&t=' + Date.now()`
  - ✅ Error handling: ตรวจ content-type ก่อน parse JSON
  - ✅ แสดง error ถ้า WEBAPP_URL ว่างหรือ HTML response

- [x] `js_design.html` - ใช้ `<? WEBAPP_URL ?>` (ไม่ใช่ `<?!= ?>`)
  - ✅ Fetch: `WEBAPP_URL + '?api=designData&t=' + Date.now()`
  - ✅ Error handling: จัดการ content-type validation
  - ✅ btnAll1.onclick: ใช้ WEBAPP_URL ที่ inject (ไม่ใช่ window.location)

### 3. **Deploy as Web App**
1. ใน Apps Script Editor: **Deploy** → **New deployment**
2. เลือก **Type**: Web app
3. เลือก **Execute as**: Your account
4. เลือก **Who has access**: Anyone (หรือ specific domain)
5. Click **Deploy**
6. **คัดลอก Deployment URL** (ต้องลงท้ายด้วย `/exec`)

### 4. **ตรวจสอบ URL ที่ Deploy**
- ✅ URL ต้องมี `/exec` ไม่ใช่ `/dev`
- ✅ ไม่ใช่ Preview URL จาก editor
- ✅ Format: `https://script.google.com/macros/d/{DEPLOYMENT_ID}/usercontent/exec`

### 5. **เปิดหน้า Web App**
- **Dashboard**: `{WEBAPP_URL}?view=dashboard`
- **Design**: `{WEBAPP_URL}?view=design`

## 🚀 วิธี Debug ถ้ามี Error

### ❌ WEBAPP_URL ไม่ถูก inject
**อาการ**: หน้า Dashboard/Design แสดง "WEBAPP_URL ไม่ถูก inject"

**วิธีแก้**:
- ✅ ตรวจว่า `appsscript.json` มี `HtmlService.createTemplateFromFile()` ที่เขียน template แล้ว
- ✅ โปรแกรมต้อง Deploy as Web App ผ่าน `/exec` URL ไม่ใช่ `/dev`
- ✅ ตรวจว่า Template syntax ใช้ `<? WEBAPP_URL ?>` ไม่ใช่ `<?!= WEBAPP_URL ?>`

### ❌ "Expected JSON but got text/html"
**อาการ**: ได้ HTML response แทน JSON เมื่อ fetch API

**วิธีแก้**:
1. ตรวจว่า `doGet(e)` มี check สำหรับ `e.parameter.api` ถูกต้อง
   ```javascript
   if (api) {
     // API MODE: คืน ContentService.createTextOutput(JSON.stringify(obj))
     //           .setMimeType(ContentService.MimeType.JSON);
   } else {
     // WEB MODE: คืน template.evaluate()
   }
   ```
2. ตรวจว่า `getDetailedDashboardData()` และ `getDesignDataDS_()` return object ที่ valid
3. ตรวจสอบใน **Logs** เพื่อดู HTTP response headers

### ❌ Data is null
**อาการ**: API ส่งคืน null หรือ undefined

**วิธีแก้**:
- ✅ ตรวจว่า `getDetailedDashboardData()` return object ไม่ใช่ null
- ✅ ตรวจว่า `getDesignDataDS_()` return object ครบถ้วน
- ✅ ดู `Logger.log()` output ใน **Logs** เพื่อหาส่วนที่ fail

### ❌ "userCodeAppPanel" หรือ "preview" URL
**อาการ**: URL เน็ตเวิร์ก request ไป `/dev` แทน `/exec`

**วิธีแก้**:
- ✅ ห้ามใช้ Preview button ใน editor
- ✅ ต้องเปิด Deployment URL เท่านั้น (`/exec`)
- ✅ ตรวจว่า HTML ไม่มีการ navigate ไป preview URL

## 📝 Testing Checklist

- [ ] Deploy Web App สำเร็จ (URL ลงท้ายด้วย `/exec`)
- [ ] เปิด `{WEBAPP_URL}?view=dashboard` ได้ HTML dashboard
- [ ] เปิด `{WEBAPP_URL}?view=design` ได้ HTML design page
- [ ] Dashboard ที่ fetch `?api=dashboardData` ได้ JSON (ไม่มี HTML)
- [ ] Design ที่ fetch `?api=designData` ได้ JSON (ไม่มี HTML)
- [ ] WEBAPP_URL inject สำเร็จ (ไม่แสดง error)
- [ ] Fetch API ใช้ WEBAPP_URL ที่ inject (ไม่ใช่ window.location)
- [ ] Error handling ทำงาน (แสดง debug info ถูกต้อง)
- [ ] Browser console ไม่มี error ที่ critical

## 🔐 Import Notes

### ⚠️ ห้ามทำ
- ❌ ใช้ Preview URL จาก editor
- ❌ ใช้ `/dev` path
- ❌ `createHtmlOutputFromFile()` ที่ต้อง inject ตัวแปร
- ❌ Return HTML ในโหมด API
- ❌ ประกาศ BUILD_ID หลายที่จนชนกัน

### ✅ ต้องทำ
- ✅ Deploy เป็น Web App
- ✅ ใช้ `/exec` URL เสมอ
- ✅ Use `HtmlService.createTemplateFromFile()` + `template.evaluate()`
- ✅ Return `ContentService.MimeType.JSON` สำหรับ API
- ✅ Validate content-type ก่อน `response.json()`
- ✅ Handle cache busting: `&t=${Date.now()}`

## 📞 Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| WEBAPP_URL blank | Template ไม่ inject | Deploy + ใช้ /exec |
| HTML response | API return HtmlService | Split API/WEB mode ใน doGet |
| Content-Type error | Server ส่ง HTML | Check doGet() logic |
| Null data | Function return null | Return empty object default |
| Session expired | Auth token หมด | Reload page อีกครั้ง |
| CORS error | Cross-origin issue | N/A (same origin) |

---

**Last Updated**: 2026-02-09
**Version**: 1.0.0 - Fixed WEBAPP_URL injection & API JSON response

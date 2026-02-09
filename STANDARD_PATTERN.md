# 📚 Standard Pattern Guide - Apps Script + HTMLService + Fetch API

## 📐 Architecture Overview

```
┌─────────────────────────────────────┐
│     Google Apps Script Server       │
│  (Code.gs, Config.gs, Design.gs)    │
│                                     │
│  ✅ doGet(e)                        │
│     ├─ API mode: ?api=...           │
│     │  └─ Return ContentService JSON│
│     └─ WEB mode: ?view=...          │
│        └─ Return Template HTML      │
└─────────────────────────────────────┘
         ↑                  ↑
    fetch() via            Access via
   Fetch API           Browser URL
         │                  │
         └──────────┬───────┘
                    │
         ┌──────────▼──────────┐
         │   Browser/Client    │
         │ (Dashboard.html,    │
         │ js_design.html)     │
         │                     │
         │ ✅ Template inject  │
         │ ✅ Fetch API        │
         │ ✅ Error handling   │
         └─────────────────────┘
```

---

## 🔧 Server Pattern (Code.gs)

### Pattern: Dual-mode doGet()

```javascript
/**
 * Main entry point: handles both Web & API requests
 */
function doGet(e) {
  const p = e && e.parameter ? e.parameter : {};
  const api = (p.api || '').trim();
  const view = (p.view || '').trim();
  
  const BUILD_ID = getBuildId();
  
  // ✅ API MODE: Return JSON
  if (api) {
    try {
      let data;
      
      if (api === 'dashboardData') {
        data = getDetailedDashboardData(); // return object
      } else if (api === 'designData') {
        data = getDesignDataDS_(); // return object
      } else {
        throw new Error('Unknown API: ' + api);
      }
      
      // ✅ Wrap in response envelope
      const result = {
        ok: data.success !== false,
        data: data.success !== false ? data : null,
        error: data.success !== false ? null : (data.error || 'Unknown'),
        timestamp: new Date().toISOString(),
        buildId: BUILD_ID
      };
      
      // ✅ Return JSON ONLY
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
        
    } catch (err) {
      return ContentService.createTextOutput(JSON.stringify({
        ok: false,
        data: null,
        error: err.message,
        timestamp: new Date().toISOString(),
        buildId: BUILD_ID
      }))
      .setMimeType(ContentService.MimeType.JSON);
    }
  }
  
  // ✅ WEB MODE: Return HTML via Template
  else {
    const webappUrl = ScriptApp.getService().getUrl();
    const templateFile = view === 'design' ? 'js_design' : 'Dashboard';
    
    const template = HtmlService.createTemplateFromFile(templateFile);
    
    // ✅ Inject critical variables
    template.WEBAPP_URL = webappUrl;
    template.BUILD_ID = BUILD_ID;
    template.VIEW = view || 'dashboard';
    
    return template.evaluate()
      .setTitle('Dashboard | GD v1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
}
```

### Pattern: Data Handler Functions

```javascript
/**
 * ✅ Return object, NEVER null
 * Wrapper handles errors + default values
 */
function getDetailedDashboardData() {
  try {
    const data = _readDashboardData_();
    
    return {
      success: true,
      dashboardData: data,
      statusCounts: _calculateStatusCounts_(data)
    };
  } catch (e) {
    // ✅ Return default structure on error
    return {
      success: false,
      error: e.message,
      dashboardData: { ENG: [], DS: [], CAM: [] },
      statusCounts: {}
    };
  }
}

function getDesignDataDS_() {
  try {
    const result = {
      __signature: 'SIG_GETDESIGNDATA',
      board: {},
      types: [],
      summary: [],
      team: [],
      metricsByType: {}
    };
    
    // ... populate result
    
    return result;
  } catch (e) {
    // ✅ Return minimum valid structure
    return {
      __error: true,
      message: e.message,
      board: {},
      types: [],
      summary: []
    };
  }
}
```

---

## 🎨 Client Pattern (HTML Template)

### Pattern: Template Setup + Global Variables

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Dashboard</title>
</head>
<body>
  <!-- HTML structure -->
  <div id="container"></div>

  <script>
    // ✅ Inject from Server via HtmlService.createTemplateFromFile()
    window.WEBAPP_URL = '<? WEBAPP_URL ?>';     // ← plain text output
    window.BUILD_ID = '<? BUILD_ID ?>';
    window.VIEW = '<? VIEW ?>';
    
    // ✅ Validate injection
    if (!WEBAPP_URL || WEBAPP_URL.includes('<?')) {
      console.error('WEBAPP_URL not injected!');
      // Show error UI
      return;
    }
    
    console.log('[init] WEBAPP_URL=' + WEBAPP_URL);
    console.log('[init] BUILD_ID=' + BUILD_ID);
  </script>
</body>
</html>
```

**Key Points**:
- Use `<? VARIABLE ?>` for plain output (not `<?!= ?>` which HTML-escapes)
- Access in JS via `window.VARIABLE` or just `VARIABLE`
- **Validate before use** - check not empty, not contains `<?`

---

### Pattern: Robust Fetch Function

```javascript
/**
 * ✅ Generic fetch wrapper dengan full error handling
 */
async function fetchAPI(endpoint, queryParams = {}) {
  // ✅ Build URL using injected WEBAPP_URL
  const baseUrl = window.WEBAPP_URL;
  if (!baseUrl || baseUrl.includes('<?')) {
    throw new Error('WEBAPP_URL not injected - use /exec URL not /dev');
  }
  
  const params = new URLSearchParams({
    api: endpoint,
    t: Date.now(), // ✅ Cache busting
    ...queryParams
  });
  
  const url = baseUrl + '?' + params.toString();
  console.log('[fetchAPI] URL:', url);
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    console.log('[fetchAPI] Status:', response.status);
    console.log('[fetchAPI] Content-Type:', response.headers.get('content-type'));
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    // ✅ Validate content-type FIRST
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const html = await response.text();
      throw new Error(
        'INVALID_CONTENT_TYPE: ' + contentType + '\n' +
        'Response:\n' + html.substring(0, 200)
      );
    }
    
    // ✅ Parse JSON (safe after content-type check)
    const data = await response.json();
    
    console.log('[fetchAPI] Data:', data);
    
    if (data.ok === false || data.error) {
      throw new Error('Server error: ' + (data.error || 'Unknown'));
    }
    
    return data.data || data;
    
  } catch (error) {
    console.error('[fetchAPI] Error:', error.message);
    throw error;
  }
}
```

### Pattern: Fetch Call with Error UI

```javascript
async function loadData() {
  const container = document.getElementById('container');
  
  try {
    // ✅ Use wrapper function
    const data = await fetchAPI('dashboardData');
    
    // ✅ Validate data structure
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid data structure');
    }
    
    // ✅ Render UI
    renderDashboard(data);
    
  } catch (error) {
    // ✅ Show detailed error UI
    container.innerHTML = `
      <div style="padding: 20px; background: #ffebee; border-radius: 8px;">
        <h2 style="color: #c62828; margin: 0 0 10px;">❌ Error</h2>
        <p><strong>Message:</strong> ${error.message}</p>
        <p><strong>WEBAPP_URL:</strong> <code>${window.WEBAPP_URL}</code></p>
        <p><strong>BUILD_ID:</strong> ${window.BUILD_ID}</p>
        <button onclick="location.reload()" 
                style="padding: 10px 20px; background: #c62828; color: white; border: none; border-radius: 4px; cursor: pointer;">
          Reload
        </button>
      </div>
    `;
  }
}

// ✅ Call on page load
window.addEventListener('load', loadData);
```

---

## ✅ Checklist: Standard Pattern Implementation

### Server-side (Code.gs)
- [ ] `doGet(e)` checks `e.parameter.api` → API mode
- [ ] `doGet(e)` checks `e.parameter.view` → WEB mode
- [ ] API mode returns `ContentService.MimeType.JSON` ALWAYS
- [ ] WEB mode returns `template.evaluate()` 
- [ ] Template variables injected: `WEBAPP_URL`, `BUILD_ID`, `VIEW`
- [ ] Data handler functions return object (never null)
- [ ] Error responses wrapped in standard envelope

### Client-side (HTML)
- [ ] Template variables: `<? WEBAPP_URL ?>` (not `<?!= ?>`)
- [ ] Window variables defined: `window.WEBAPP_URL`, `window.BUILD_ID`
- [ ] Validation: check WEBAPP_URL not empty/invalid before fetch
- [ ] Fetch uses `WEBAPP_URL + '?api=endpoint&t=' + Date.now()`
- [ ] Content-Type validation before `response.json()`
- [ ] Error handling shows: message, URL, BUILD_ID
- [ ] Cache busting: `&t=${Date.now()}`

### Deployment
- [ ] Deploy as Web App
- [ ] Use `/exec` URL (not `/dev`)
- [ ] Test API endpoint: `{URL}?api=dashboardData` → JSON
- [ ] Test Web endpoint: `{URL}?view=dashboard` → HTML
- [ ] Check browser console: no errors
- [ ] Check Logs: no exceptions

---

## 🚨 Common Pitfalls & Solutions

| Pitfall | Problem | Solution |
|---------|---------|----------|
| `<?!= VARIABLE ?>` | HTML escapes value | Use `<? VARIABLE ?>` |
| `window.location` in fetch | May be /dev URL | Use WEBAPP_URL from template |
| No content-type check | Can't detect HTML response | Add `if (!contentType.includes('json'))` |
| Return null on error | Breaks client rendering | Return default object structure |
| No cache busting | Browser caches response | Add `&t=${Date.now()}` |
| Mixed return types | API returns HTML sometimes | Guarantee JSON with ContentService.MimeType |
| No error UI | User sees blank page | Show URL, BUILD_ID, error details |

---

**Pattern Version**: 1.0.0  
**Last Verified**: 2026-02-09  
**Quality**: Production Ready ✅

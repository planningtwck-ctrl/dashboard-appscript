function doGet(e){
  const view = (e && e.parameter && e.parameter.view) ? e.parameter.view : 'dashboard';

  if (view === 'design'){
    return HtmlService.createHtmlOutputFromFile('js_design')
      .setTitle('Design Dashboard')
      .addMetaTag('viewport','width=device-width, initial-scale=1');
  }

  if (view === 'report'){
    return HtmlService.createHtmlOutputFromFile('Report')
      .setTitle('A4 Report')
      .addMetaTag('viewport','width=device-width, initial-scale=1');
  }

  // ✅ default หน้าแรก
  return HtmlService.createHtmlOutputFromFile('Dashboard')
    .setTitle('Dashboard')
    .addMetaTag('viewport','width=device-width, initial-scale=1');
}

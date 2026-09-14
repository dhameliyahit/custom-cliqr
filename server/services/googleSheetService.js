const Setting = require('../models/Setting');

const GOOGLE_APPS_SCRIPT_TEMPLATE = `/**
 * CustomCliq — Google Sheet Webhook for Real-Time QR Leads Sync & Live Dashboard
 * 
 * Setup Instructions:
 * 1. Open your Google Sheet.
 * 2. In the top menu, click Extensions > Apps Script.
 * 3. Delete any code in the editor and paste this ENTIRE script.
 * 4. Click the Save icon (or Ctrl+S).
 * 5. Click "Deploy" (top right blue button) > "New deployment".
 * 6. Under "Select type", click the gear icon and select "Web app".
 * 7. Set:
 *    - Description: "CustomCliq Leads Sync"
 *    - Execute as: "Me"
 *    - Who has access: "Anyone" (Crucial for webhook receipt)
 * 8. Click "Deploy", authorize access with your Google account, and copy the "Web app URL".
 * 9. Paste that URL into CustomCliq SuperAdmin Settings and click "Test Connection"!
 */

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var contents = e.postData ? JSON.parse(e.postData.contents) : {};
    var action = contents.action || 'upsert';

    // Auto-create formatted KPI dashboard headers and table layout
    ensureSheetLayout(sheet);

    if (action === 'test') {
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: 'CustomCliq connection verified successfully! Dashboard and table initialized.'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Full Sync / Batch Upsert (Writes entire lead database atomically)
    if ((action === 'batch_upsert' || action === 'full_sync') && Array.isArray(contents.leads)) {
      var lastRow = sheet.getLastRow();
      // Clear previous data rows from Row 6 down
      if (lastRow >= 6) {
        var numCols = Math.max(sheet.getLastColumn(), 12);
        sheet.getRange(6, 1, lastRow - 5, numCols).clearContent();
      }

      var newRows = [];
      for (var i = 0; i < contents.leads.length; i++) {
        var lead = contents.leads[i];
        if (!lead || (!lead.code && !lead.batchCode)) continue;

        var rawPhone = (lead.customerPhone || '').toString().trim();
        var phoneCell = rawPhone;
        if (phoneCell && phoneCell.indexOf('+') === 0 && phoneCell.indexOf("'") !== 0) {
          phoneCell = "'" + phoneCell;
        }

        newRows.push([
          lead.code || '',
          lead.batchCode || '',
          lead.businessName || '',
          lead.customerName || '',
          phoneCell,
          lead.customerEmail || '',
          lead.redirectUrl || '',
          lead.directUrl || '',
          lead.adminName || '',
          (lead.status || 'UNASSIGNED').toUpperCase(),
          Number(lead.scanCount) || 0,
          lead.updatedAt || new Date().toLocaleString()
        ]);
      }

      if (newRows.length > 0) {
        sheet.getRange(6, 1, newRows.length, 12).setValues(newRows);
      }

      // Update Last Synced timestamp in KPI card
      sheet.getRange('H1').setValue(contents.syncTime || new Date().toLocaleString());

      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        syncedCount: newRows.length
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Single Lead Real-time Upsert
    var lead = contents.lead || contents;
    if (lead && lead.code) {
      upsertLeadRow(sheet, lead);
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        code: lead.code
      })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: 'Invalid payload: missing QR code or lead data'
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Initializes the Top KPI Dashboard Header and frozen Table Headers
 */
function ensureSheetLayout(sheet) {
  var lastRow = sheet.getLastRow();
  var a5Value = '';
  try {
    a5Value = sheet.getRange('A5').getValue();
  } catch (e) {}

  if (lastRow < 5 || a5Value !== 'QR Code') {
    sheet.clear();

    // 1. TOP TITLE BANNER (Row 1)
    sheet.getRange('A1:F1').merge();
    sheet.getRange('A1').setValue('CUSTOMCLIQ LIVE LEADS & QR DASHBOARD')
      .setFontWeight('bold')
      .setFontSize(12)
      .setBackground('#0f172a')
      .setFontColor('#ffffff')
      .setVerticalAlignment('middle');

    sheet.getRange('G1').setValue('Last Synced:')
      .setFontWeight('bold')
      .setFontSize(10)
      .setBackground('#1e293b')
      .setFontColor('#94a3b8')
      .setHorizontalAlignment('right');

    sheet.getRange('H1:L1').merge();
    sheet.getRange('H1').setValue(new Date().toLocaleString())
      .setFontWeight('bold')
      .setFontSize(10)
      .setBackground('#1e293b')
      .setFontColor('#38bdf8');

    // 2. KPI METRIC LABELS (Row 2)
    var kpiHeaders = [
      'Total QRs',
      'Configured Leads',
      'Assigned QRs',
      'Unassigned QRs',
      'Total Scans',
      'Integration Status'
    ];
    var kpiHeaderRange = sheet.getRange('A2:F2');
    kpiHeaderRange.setValues([kpiHeaders])
      .setFontWeight('bold')
      .setFontSize(9)
      .setBackground('#f1f5f9')
      .setFontColor('#475569')
      .setHorizontalAlignment('center');

    // 3. KPI METRIC DYNAMIC FORMULAS (Row 3)
    var kpiFormulas = [
      '=IFERROR(COUNTA(A6:A), 0)',
      '=IFERROR(COUNTIF(J6:J, "CONFIGURED"), 0)',
      '=IFERROR(COUNTIF(J6:J, "ASSIGNED"), 0)',
      '=IFERROR(COUNTIF(J6:J, "UNASSIGNED"), 0)',
      '=IFERROR(SUM(K6:K), 0)',
      'ACTIVE'
    ];
    var kpiFormulaRange = sheet.getRange('A3:F3');
    kpiFormulaRange.setValues([kpiFormulas])
      .setFontWeight('bold')
      .setFontSize(12)
      .setBackground('#ffffff')
      .setFontColor('#0f172a')
      .setHorizontalAlignment('center');

    // Accent borders on KPI cards
    kpiFormulaRange.setBorder(true, true, true, true, true, true, '#cbd5e1', SpreadsheetApp.BorderStyle.SOLID);

    // 4. SEPARATOR (Row 4 is blank)
    sheet.setRowHeight(4, 12);

    // 5. DATA TABLE HEADERS (Row 5)
    var tableHeaders = [
      'QR Code',
      'Batch Code',
      'Business Name',
      'Contact Person',
      'Phone Number',
      'Email Address',
      'Destination Redirection URL',
      'Direct QR Link',
      'Assigned Admin',
      'Status',
      'Scan Count',
      'Last Updated'
    ];
    var tableHeaderRange = sheet.getRange('A5:L5');
    tableHeaderRange.setValues([tableHeaders])
      .setBackground('#1e293b')
      .setFontColor('#ffffff')
      .setFontWeight('bold')
      .setFontSize(10)
      .setHorizontalAlignment('left');

    sheet.setFrozenRows(5);
  }
}

/**
 * Upsert a single lead row in place or prepend at row 6
 */
function upsertLeadRow(sheet, lead) {
  var rawPhone = (lead.customerPhone || '').toString().trim();
  var phoneCell = rawPhone;
  if (phoneCell && phoneCell.indexOf('+') === 0 && phoneCell.indexOf("'") !== 0) {
    phoneCell = "'" + phoneCell;
  }

  var rowData = [
    lead.code || '',
    lead.batchCode || '',
    lead.businessName || '',
    lead.customerName || '',
    phoneCell,
    lead.customerEmail || '',
    lead.redirectUrl || '',
    lead.directUrl || '',
    lead.adminName || '',
    (lead.status || 'UNASSIGNED').toUpperCase(),
    Number(lead.scanCount) || 0,
    lead.updatedAt || new Date().toLocaleString()
  ];

  var lastRow = sheet.getLastRow();
  if (lastRow >= 6) {
    var codes = sheet.getRange(6, 1, lastRow - 5, 1).getValues();
    var targetCode = (lead.code || '').trim().toUpperCase();
    for (var i = 0; i < codes.length; i++) {
      if (codes[i][0] && codes[i][0].toString().trim().toUpperCase() === targetCode) {
        // Update existing row in-place
        var targetRow = i + 6;
        sheet.getRange(targetRow, 1, 1, rowData.length).setValues([rowData]);
        sheet.getRange('H1').setValue(new Date().toLocaleString());
        return;
      }
    }
  }

  // If not found in sheet:
  // If active configured lead, insert at top of table (Row 6)
  if ((lead.status || '').toUpperCase() === 'CONFIGURED') {
    sheet.insertRowBefore(6);
    sheet.getRange(6, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }
  sheet.getRange('H1').setValue(new Date().toLocaleString());
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    service: 'CustomCliq Google Sheet Sync Active',
    version: '2.0.0'
  })).setMimeType(ContentService.MimeType.JSON);
}`;

/**
 * Format link object to clean lead payload
 */
const formatLeadPayload = (link, baseDomain = '') => {
  let formattedPhone = '';
  if (link.customerPhone) {
    const raw = link.customerPhone.toString().trim();
    const digits = raw.replace(/\D/g, '');
    if (digits.length >= 10) {
      formattedPhone = `+91 ${digits.slice(-10)}`;
    } else {
      formattedPhone = raw;
    }
  }

  return {
    code: link.code,
    batchCode: link.batchCode,
    businessName: link.businessName || '',
    customerName: link.customerName || '',
    customerPhone: formattedPhone,
    customerEmail: link.customerEmail || '',
    redirectUrl: link.redirectUrl || '',
    directUrl: `${baseDomain}/r/${link.code}`,
    adminName: link.assignedTo ? (link.assignedTo.name || 'Admin') : 'Unassigned',
    status: (link.status || 'UNASSIGNED').toUpperCase(),
    scanCount: link.scanCount || 0,
    updatedAt: new Date(link.updatedAt || link.createdAt || Date.now()).toLocaleString(),
  };
};

/**
 * Sync a single QR link lead to Google Sheets (Non-blocking / fire-and-forget)
 */
const syncLeadToGoogleSheet = async (link, baseDomain = '') => {
  try {
    const [enabledSetting, urlSetting] = await Promise.all([
      Setting.findOne({ key: 'google_sheet_sync_enabled' }),
      Setting.findOne({ key: 'google_sheet_webhook_url' }),
    ]);

    const isEnabled = enabledSetting ? enabledSetting.value === true || enabledSetting.value === 'true' : false;
    const webhookUrl = urlSetting ? (urlSetting.value || '').trim() : '';

    if (!isEnabled || !webhookUrl || !webhookUrl.startsWith('http')) {
      return { skipped: true, reason: 'Sync not enabled or webhook URL missing' };
    }

    const payload = {
      action: 'upsert',
      lead: formatLeadPayload(link, baseDomain),
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const DEFAULT_HEADERS = {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/plain, */*',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    };

    fetch(webhookUrl, {
      method: 'POST',
      headers: DEFAULT_HEADERS,
      body: JSON.stringify(payload),
      signal: controller.signal,
      redirect: 'follow',
    })
      .then((res) => {
        if (!res.ok && res.status !== 302) {
          if (res.status === 403) {
            console.error('[GoogleSheetSync] 403 Forbidden: Ensure "Who has access" is set to "Anyone" in Google Apps Script deployment.');
          } else {
            console.error(`[GoogleSheetSync] HTTP ${res.status} returned by Google`);
          }
        }
        return res.json().catch(() => ({}));
      })
      .then((data) => {
        if (data && data.success) {
          console.log(`[GoogleSheetSync] Successfully synced QR ${link.code} to Google Sheet:`, data);
        }
      })
      .catch((err) => {
        console.error(`[GoogleSheetSync] Error syncing QR ${link.code} to Google Sheet:`, err.message);
      })
      .finally(() => {
        clearTimeout(timeoutId);
      });

    return { success: true, queued: true };
  } catch (err) {
    console.error('[GoogleSheetSync] Dispatch error:', err.message);
    return { success: false, error: err.message };
  }
};

/**
 * Test a Google Sheet Webhook URL with a ping
 */
const testGoogleSheetWebhook = async (webhookUrl) => {
  if (!webhookUrl || !webhookUrl.startsWith('http')) {
    throw new Error('Please provide a valid Google Apps Script Web App URL starting with https://');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(webhookUrl.trim(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/plain, */*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      body: JSON.stringify({ action: 'test' }),
      signal: controller.signal,
      redirect: 'follow',
    });

    clearTimeout(timeoutId);

    if (!response.ok && response.status !== 302) {
      if (response.status === 403) {
        throw new Error(
          'Google Webhook returned 403 Forbidden: Access denied. In Apps Script, click Deploy > Manage deployments > Edit, change "Who has access" to "Anyone" (NOT "Only myself"), and verify the URL ends with /exec.'
        );
      }
      throw new Error(`Google Webhook returned HTTP status ${response.status}`);
    }

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    return {
      success: true,
      message: 'Google Sheet Webhook verified successfully! KPI Dashboard and Lead table initialized.',
      data,
    };
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Connection timed out after 10 seconds. Ensure the Apps Script deployment access is set to "Anyone".');
    }
    throw new Error(`Connection test failed: ${err.message}`);
  }
};

/**
 * Bulk sync ALL QR links to Google Sheet in ONE atomic, reliable payload
 * - All leads continuous with NO blank spacer rows
 * - Configured leads at top, followed by assigned and unassigned QRs
 * - Automatically updates Top KPI metrics
 */
const syncAllLinksToGoogleSheet = async (linksOrData, baseDomain = '', webhookUrl) => {
  let targetUrl = webhookUrl;
  if (!targetUrl) {
    const urlSetting = await Setting.findOne({ key: 'google_sheet_webhook_url' });
    targetUrl = urlSetting ? (urlSetting.value || '').trim() : '';
  }

  if (!targetUrl || !targetUrl.startsWith('http')) {
    throw new Error('Google Sheet Webhook URL is not configured. Please save a valid Webhook URL first.');
  }

  let rawLinks = [];
  if (Array.isArray(linksOrData)) {
    rawLinks = linksOrData;
  } else if (linksOrData && (linksOrData.configuredLinks || linksOrData.otherLinks)) {
    rawLinks = [...(linksOrData.configuredLinks || []), ...(linksOrData.otherLinks || [])];
  }

  if (rawLinks.length === 0) {
    throw new Error('No QR links found in the system to sync yet');
  }

  // Sort: Configured leads first, then assigned, then unassigned
  rawLinks.sort((a, b) => {
    const order = { configured: 1, assigned: 2, unassigned: 3, inactive: 4 };
    const orderA = order[a.status] || 5;
    const orderB = order[b.status] || 5;
    if (orderA !== orderB) return orderA - orderB;
    return new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0);
  });

  const formattedLeads = rawLinks.map((l) => formatLeadPayload(l, baseDomain));

  const configuredCount = rawLinks.filter((l) => l.status === 'configured').length;
  const assignedCount = rawLinks.filter((l) => l.status === 'assigned').length;
  const unassignedCount = rawLinks.filter((l) => l.status === 'unassigned').length;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 35000);

  try {
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/plain, */*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      body: JSON.stringify({
        action: 'full_sync',
        leads: formattedLeads,
        syncTime: new Date().toLocaleString(),
      }),
      signal: controller.signal,
      redirect: 'follow',
    });

    clearTimeout(timeoutId);

    if (!response.ok && response.status !== 302) {
      if (response.status === 403) {
        throw new Error(
          'Google Sheet returned 403 Forbidden: Access denied. In Google Apps Script, click Deploy > Manage deployments > Edit, change "Who has access" to "Anyone", and re-deploy.'
        );
      }
      throw new Error(`Google Sheet returned status ${response.status} during full sync`);
    }

    const resText = await response.text();
    let resData = {};
    try {
      resData = JSON.parse(resText);
    } catch (e) {
      resData = { raw: resText };
    }

    const message = `Successfully synchronized ALL ${formattedLeads.length} QR links (${configuredCount} configured, ${assignedCount} assigned, ${unassignedCount} unassigned) to your Google Sheet!`;

    return {
      success: true,
      totalSynced: formattedLeads.length,
      configuredCount,
      assignedCount,
      unassignedCount,
      message,
      data: resData,
    };
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Google Sheet full sync timed out after 35 seconds. Please verify your Webhook URL.');
    }
    throw err;
  }
};

module.exports = {
  syncLeadToGoogleSheet,
  testGoogleSheetWebhook,
  syncAllLinksToGoogleSheet,
  GOOGLE_APPS_SCRIPT_TEMPLATE,
  formatLeadPayload,
};

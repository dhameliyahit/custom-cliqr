const Setting = require('../models/Setting');

const GOOGLE_APPS_SCRIPT_TEMPLATE = `/**
 * CustomCliq — Google Sheet Webhook for Real-Time QR Leads Sync
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
 *    - Who has access: "Anyone" (Essential for webhook receipt)
 * 8. Click "Deploy", authorize access with your Google account, and copy the "Web app URL".
 * 9. Paste that URL into CustomCliq SuperAdmin Settings and click "Test Connection"!
 */

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var contents = e.postData ? JSON.parse(e.postData.contents) : {};
    var action = contents.action || 'upsert';

    // Auto-create formatted headers if sheet is empty
    ensureHeaders(sheet);

    if (action === 'test') {
      return ContentService.createTextOutput(JSON.stringify({ success: true, message: 'CustomCliq connection verified successfully!' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'batch_upsert' && Array.isArray(contents.leads)) {
      // Clear data from row 2 downwards on full sync if requested
      if (contents.clearFirst && sheet.getLastRow() > 1) {
        var lastRow = sheet.getLastRow();
        var numCols = Math.max(sheet.getLastColumn(), 12);
        sheet.getRange(2, 1, lastRow - 1, numCols).clearContent();
      }
      for (var i = 0; i < contents.leads.length; i++) {
        upsertLeadRow(sheet, contents.leads[i]);
      }
      return ContentService.createTextOutput(JSON.stringify({ success: true, syncedCount: contents.leads.length }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Single Lead Upsert
    var lead = contents.lead || contents;
    if (lead && lead.code) {
      upsertLeadRow(sheet, lead);
      return ContentService.createTextOutput(JSON.stringify({ success: true, code: lead.code }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ success: false, message: 'Invalid payload: missing QR code' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function ensureHeaders(sheet) {
  if (sheet.getLastRow() === 0) {
    var headers = [
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
    sheet.appendRow(headers);
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground('#000000');
    headerRange.setFontColor('#ffffff');
    headerRange.setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
}

function upsertLeadRow(sheet, lead) {
  // Append an empty row for spacing
  if (lead.isSpacer || (!lead.code && !lead.batchCode)) {
    sheet.appendRow(['', '', '', '', '', '', '', '', '', '', '', '']);
    return;
  }

  // Prepend single quote ' if phone starts with + so Google Sheets never interprets it as a formula
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
    lead.status || '',
    lead.scanCount || 0,
    lead.updatedAt || new Date().toLocaleString()
  ];

  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    var codes = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (var i = 0; i < codes.length; i++) {
      if (codes[i][0] && codes[i][0].toString().trim().toUpperCase() === (lead.code || '').trim().toUpperCase()) {
        // Update existing row
        var targetRow = i + 2;
        sheet.getRange(targetRow, 1, 1, rowData.length).setValues([rowData]);
        return;
      }
    }
  }

  // If not found in the sheet:
  // If it's an active configured lead, insert it right at row 2 (at the top of configured leads)
  if (lead.status === 'CONFIGURED') {
    sheet.insertRowBefore(2);
    sheet.getRange(2, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({ success: true, service: 'CustomCliq Google Sheet Sync Active' }))
    .setMimeType(ContentService.MimeType.JSON);
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
    status: (link.status || 'READY').toUpperCase(),
    scanCount: link.scanCount || 0,
    updatedAt: new Date(link.updatedAt || link.createdAt || Date.now()).toLocaleString(),
  };
};

/**
 * Sync a single QR link lead to Google Sheets (Non-blocking / fire-and-forget)
 */
const syncLeadToGoogleSheet = async (link, baseDomain = '') => {
  try {
    // Check if sync is enabled
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

    // Asynchronous dispatch with 6s timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

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
      redirect: 'follow', // Google Apps Script redirects with 302 to script.googleusercontent.com
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
  const timeoutId = setTimeout(() => controller.abort(), 8000);

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
          'Google Webhook returned 403 Forbidden: Access denied. In Apps Script, go to Deploy > Manage deployments > Edit, and change "Who has access" to "Anyone" (NOT "Only myself"), then ensure the URL ends with /exec.'
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
      message: 'Google Sheet Webhook verified successfully! Headers and connection are active.',
      data,
    };
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Connection timed out after 8 seconds. Ensure the Apps Script deployment access is set to "Anyone".');
    }
    throw new Error(`Connection test failed: ${err.message}`);
  }
};

/**
 * Helper to build an empty spacer lead object
 */
const createSpacerLead = () => ({
  code: '',
  batchCode: '',
  businessName: '',
  customerName: '',
  customerPhone: '',
  customerEmail: '',
  redirectUrl: '',
  directUrl: '',
  adminName: '',
  status: '',
  scanCount: '',
  updatedAt: '',
  isSpacer: true,
});

/**
 * Bulk sync all QR links to Google Sheets
 * - Configured QRs (active leads) placed at top
 * - 2 blank spacer rows
 * - All remaining QRs (assigned, unassigned, inactive) placed below
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

  let structuredLeads = [];
  let configuredCount = 0;
  let otherCount = 0;

  if (Array.isArray(linksOrData)) {
    const configured = linksOrData.filter((l) => l.status === 'configured');
    const others = linksOrData.filter((l) => l.status !== 'configured');
    configuredCount = configured.length;
    otherCount = others.length;

    // 1. All configured leads at the top
    structuredLeads.push(...configured.map((l) => formatLeadPayload(l, baseDomain)));

    // 2. Add 2 blank spacer rows if configured leads exist and others exist
    if (configured.length > 0 && others.length > 0) {
      structuredLeads.push(createSpacerLead());
      structuredLeads.push(createSpacerLead());
    }

    // 3. All other leads below
    structuredLeads.push(...others.map((l) => formatLeadPayload(l, baseDomain)));
  } else if (linksOrData && (linksOrData.configuredLinks || linksOrData.otherLinks)) {
    const configured = linksOrData.configuredLinks || [];
    const others = linksOrData.otherLinks || [];
    configuredCount = configured.length;
    otherCount = others.length;

    // 1. All configured leads at the top
    structuredLeads.push(...configured.map((l) => formatLeadPayload(l, baseDomain)));

    // 2. Add 2 blank spacer rows if configured leads exist and others exist
    if (configured.length > 0 && others.length > 0) {
      structuredLeads.push(createSpacerLead());
      structuredLeads.push(createSpacerLead());
    }

    // 3. All other leads below
    structuredLeads.push(...others.map((l) => formatLeadPayload(l, baseDomain)));
  }

  if (structuredLeads.length === 0) {
    throw new Error('No QR links found in the system to sync');
  }

  // Chunk in batches of 50 to avoid Google Apps Script execution timeouts
  const CHUNK_SIZE = 50;
  let totalSynced = 0;

  for (let i = 0; i < structuredLeads.length; i += CHUNK_SIZE) {
    const chunk = structuredLeads.slice(i, i + CHUNK_SIZE);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    const isFirstChunk = (i === 0);

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/plain, */*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      body: JSON.stringify({
        action: 'batch_upsert',
        clearFirst: isFirstChunk,
        leads: chunk,
      }),
      signal: controller.signal,
      redirect: 'follow',
    });

    clearTimeout(timeoutId);
    if (!response.ok && response.status !== 302) {
      if (response.status === 403) {
        throw new Error(
          'Google Sheet returned 403 Forbidden: Access denied. In Google Apps Script, click Deploy > Manage deployments > Edit, and change "Who has access" from "Only myself" to "Anyone", then re-deploy and verify the URL ends with /exec.'
        );
      }
      throw new Error(`Google Sheet returned status ${response.status} during batch sync`);
    }

    totalSynced += chunk.length;
  }

  const message = configuredCount > 0
    ? `Successfully synchronized ${configuredCount} configured lead(s) at the top, followed by 2 blank rows, and ${otherCount} other QR(s)!`
    : `Successfully synchronized ${otherCount} QR link(s) into your Google Sheet!`;

  return {
    success: true,
    totalSynced,
    configuredCount,
    otherCount,
    message,
  };
};

module.exports = {
  syncLeadToGoogleSheet,
  testGoogleSheetWebhook,
  syncAllLinksToGoogleSheet,
  GOOGLE_APPS_SCRIPT_TEMPLATE,
  formatLeadPayload,
};

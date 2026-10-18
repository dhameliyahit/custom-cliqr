const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const QrLink = require('../models/QrLink');
const Setting = require('../models/Setting');
const { getCachedRedirect, setCachedRedirect } = require('../services/redirectCache');

// Helper to determine client URL (smart fallback for unified server vs separate dev servers)
const getClientUrl = (req) => {
  if (process.env.CLIENT_URL && !process.env.CLIENT_URL.includes('localhost')) {
    return process.env.CLIENT_URL;
  }
  const clientDist = path.join(__dirname, '../../client/dist/index.html');
  if (fs.existsSync(clientDist)) {
    const proto = req.get('x-forwarded-proto') || req.protocol || 'http';
    const host = req.get('x-forwarded-host') || req.get('host');
    return `${proto}://${host}`;
  }
  if (req) {
    const proto = req.get('x-forwarded-proto') || req.protocol || 'http';
    const host = req.get('x-forwarded-host') || req.get('host');
    if (host && !host.includes('localhost')) {
      return `${proto}://${host}`;
    }
  }
  return process.env.CLIENT_URL || 'http://localhost:5173';
};

// High-Speed Handler for NFC Tap & QR Scan Redirection (< 1ms Latency)
const handleRedirect = async (req, res) => {
  const startTime = process.hrtime();

  try {
    const { code } = req.params;
    if (!code) return res.status(400).send('Code required');
    const cleanCode = code.toUpperCase().trim();

    // Check service-wide billing suspension
    const billing = await Setting.findOne({ key: 'billing_suspended' });
    if (billing && billing.value === true) {
      return res.status(402).send(`<!DOCTYPE html><html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>Service Suspended — CustomCliq</title><style>body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #00222B; color: #fff; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; text-align: center; }.card { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.15); border-radius: 16px; padding: 40px 24px; max-width: 440px; width: 100%; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }.badge { display: inline-block; background: #ef4444; color: #fff; font-size: 11px; font-weight: 700; text-transform: uppercase; padding: 4px 12px; border-radius: 9999px; letter-spacing: 0.05em; margin-bottom: 16px; }h1 { font-size: 22px; margin: 0 0 12px 0; font-weight: 800; color: #fff; }p { font-size: 14px; color: #94a3b8; line-height: 1.6; margin: 0; }</style></head><body><div class="card"><div class="badge">Billing Suspension</div><h1>Service Temporarily Paused</h1><p>This QR service is temporarily unavailable due to pending billing. Please contact the service provider to restore access.</p></div></body></html>`);
    }

    // Optimal HTTP headers for instant redirection without stale browser caching
    res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    // 1. FAST PATH: In-Memory Cache Lookup (Sub-millisecond)
    let link = getCachedRedirect(cleanCode);

    // 2. SLOW PATH: Database lookup only on first visit / cache miss
    if (!link) {
      const dbLink = await QrLink.findOne({ code: cleanCode })
        .select('_id code status redirectUrl')
        .lean();

      if (!dbLink) {
        const clientUrl = getClientUrl(req);
        return res.redirect(302, `${clientUrl}/tag/${cleanCode}?status=not_found`);
      }

      link = {
        id: dbLink._id,
        code: dbLink.code,
        status: dbLink.status,
        redirectUrl: dbLink.redirectUrl || '',
      };

      setCachedRedirect(cleanCode, link);
    }

    // 3. Asynchronous Non-Blocking Analytics Recording (Zero latency added to user!)
    setImmediate(() => {
      QrLink.updateOne(
        { _id: link.id },
        {
          $inc: { scanCount: 1 },
          $set: { lastScannedAt: new Date() },
        }
      ).catch((err) => console.error('[Scan Analytics Error]:', err.message));
    });

    // Timing header for latency measurement
    const diff = process.hrtime(startTime);
    const latencyMs = (diff[0] * 1e3 + diff[1] * 1e-6).toFixed(2);
    res.setHeader('X-Redirect-Latency', `${latencyMs}ms`);

    // 4. INSTANT REDIRECT
    if (link.status === 'configured' && link.redirectUrl && link.redirectUrl.trim() !== '') {
      let targetUrl = link.redirectUrl.trim();
      if (!targetUrl.match(/^https?:\/\//i)) {
        targetUrl = `https://${targetUrl}`;
      }
      return res.redirect(302, targetUrl);
    }

    const clientUrl = getClientUrl(req);

    if (link.status === 'inactive') {
      return res.redirect(302, `${clientUrl}/tag/${cleanCode}?status=inactive`);
    }

    return res.redirect(302, `${clientUrl}/tag/${cleanCode}?status=unconfigured`);
  } catch (error) {
    console.error('Redirection error:', error);
    const clientUrl = getClientUrl(req);
    return res.redirect(302, `${clientUrl}/tag/error?status=server_error`);
  }
};

// Route for /r/:code
router.get('/r/:code', handleRedirect);

// Also export handleRedirect for root /:code if needed
module.exports = {
  router,
  handleRedirect,
};

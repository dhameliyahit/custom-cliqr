const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const QrLink = require('../models/QrLink');
const { getCachedRedirect, setCachedRedirect } = require('../services/redirectCache');

// Helper to determine client URL (smart fallback for unified server vs separate dev servers)
const getClientUrl = (req) => {
  if (process.env.CLIENT_URL && process.env.CLIENT_URL !== 'http://localhost:5173') {
    return process.env.CLIENT_URL;
  }
  const clientDist = path.join(__dirname, '../../client/dist/index.html');
  if (fs.existsSync(clientDist)) {
    return `${req.protocol}://${req.get('host')}`;
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

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const QrLink = require('../models/QrLink');

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

// Handler for NFC Tap & QR Scan Redirection
const handleRedirect = async (req, res) => {
  try {
    const { code } = req.params;
    const cleanCode = code.toUpperCase().trim();

    const link = await QrLink.findOne({ code: cleanCode });

    const clientUrl = getClientUrl(req);

    if (!link) {
      return res.redirect(`${clientUrl}/tag/${cleanCode}?status=not_found`);
    }

    // Increment scan analytics
    await QrLink.findByIdAndUpdate(link._id, {
      $inc: { scanCount: 1 },
      $set: { lastScannedAt: new Date() },
    });

    // Check if configured and active
    if (link.status === 'configured' && link.redirectUrl && link.redirectUrl.trim() !== '') {
      let targetUrl = link.redirectUrl.trim();
      if (!targetUrl.match(/^https?:\/\//i)) {
        targetUrl = `https://${targetUrl}`;
      }
      return res.redirect(302, targetUrl);
    }

    // If tag exists but is inactive
    if (link.status === 'inactive') {
      return res.redirect(`${clientUrl}/tag/${cleanCode}?status=inactive`);
    }

    // If tag is unconfigured / unassigned
    return res.redirect(`${clientUrl}/tag/${cleanCode}?status=unconfigured`);
  } catch (error) {
    console.error('Redirection error:', error);
    const clientUrl = getClientUrl(req);
    return res.redirect(`${clientUrl}/tag/error?status=server_error`);
  }
};

// Route for /r/:code
router.get('/r/:code', handleRedirect);

// Also export handleRedirect for root /:code if needed
module.exports = {
  router,
  handleRedirect,
};

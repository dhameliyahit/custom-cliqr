const crypto = require('crypto');
const dns = require('dns').promises;
const http = require('http');
const https = require('https');
const QRCode = require('qrcode');
const XLSX = require('xlsx');
const archiver = require('archiver');
const QrLink = require('../models/QrLink');
const Batch = require('../models/Batch');
const User = require('../models/User');
const Setting = require('../models/Setting');
const { invalidateRedirect, clearAllRedirectCache } = require('../services/redirectCache');
const {
  syncLeadToGoogleSheet,
  testGoogleSheetWebhook,
  syncAllLinksToGoogleSheet,
  GOOGLE_APPS_SCRIPT_TEMPLATE,
} = require('../services/googleSheetService');

// Helper to create ZipArchive across archiver versions (supports both v7 function & v8 ZipArchive class)
const createZipArchive = (options = { zlib: { level: 9 } }) => {
  if (typeof archiver === 'function') {
    return archiver('zip', options);
  }
  if (archiver && archiver.ZipArchive) {
    return new archiver.ZipArchive(options);
  }
  if (archiver && archiver.default && typeof archiver.default === 'function') {
    return archiver.default('zip', options);
  }
  return new archiver(options);
};

// Helper to get active dynamic QR base domain
const getQrBaseDomain = async (req) => {
  try {
    const setting = await Setting.findOne({ key: 'qr_base_domain' });
    if (setting && setting.value && setting.value.trim() !== '' && setting.value.trim().toLowerCase() !== 'auto') {
      let val = setting.value.trim().replace(/\/+$/, '');
      if (!val.match(/^https?:\/\//i)) {
        val = `https://${val}`;
      }
      return val;
    }
  } catch (err) {
    console.error('Error fetching qr_base_domain setting:', err);
  }

  // Fallback to request host or env
  if (req) {
    const forwardedProto = req.get('x-forwarded-proto');
    const forwardedHost = req.get('x-forwarded-host');
    const host = forwardedHost || req.get('host');
    const protocol = forwardedProto || req.protocol || 'http';
    if (host) {
      return `${protocol}://${host}`.replace(/\/+$/, '');
    }
  }
  return (process.env.DEFAULT_QR_DOMAIN || 'http://localhost:5173').replace(/\/+$/, '');
};

// Helper to generate print-ready vector SVG containing QR code + centered short code below it
// Optimized for CorelDRAW, Illustrator, Plotters, and CNC laser engraving:
// - Closed filled compound path (fill="#000000", stroke="none")
// - Eliminates broken/movable individual stroke lines
// - No nested <svg> elements (ensures single coordinate space across all vector editors)
// - Grouped under <g id="CustomCliq-Printable-QR"> so elements select & move as a complete object
const generatePrintableQrSvg = async (targetUrl, code) => {
  const qr = QRCode.create(targetUrl, { errorCorrectionLevel: 'M' });
  const size = qr.modules.size;
  const margin = 1;
  const totalModules = size + margin * 2;

  const width = 600;
  const height = 610;
  const qrSize = 500;
  const qrX = (width - qrSize) / 2; // 50
  const qrY = 35;
  const textY = 565;
  const scale = qrSize / totalModules;

  let pathD = '';
  for (let r = 0; r < size; r++) {
    let c = 0;
    while (c < size) {
      if (qr.modules.get(r, c)) {
        const start = c;
        while (c < size && qr.modules.get(r, c)) {
          c++;
        }
        const len = c - start;
        const x = Number((qrX + (start + margin) * scale).toFixed(3));
        const y = Number((qrY + (r + margin) * scale).toFixed(3));
        const w = Number((len * scale).toFixed(3));
        const h = Number(scale.toFixed(3));
        pathD += `M${x} ${y}h${w}v${h}h-${w}z`;
      } else {
        c++;
      }
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <g id="CustomCliq-Printable-QR">
    <rect width="100%" height="100%" fill="#ffffff"/>
    <path id="qr-matrix" fill="#000000" d="${pathD}"/>
    <!-- Centered Short Code below QR for clear identification on print/standees -->
    <text x="${width / 2}" y="${textY}" text-anchor="middle" dominant-baseline="central" font-family="'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, monospace, sans-serif" font-size="34" font-weight="900" fill="#000000" letter-spacing="4">${code}</text>
  </g>
</svg>`;
};

// Helper to generate a random 6-character alphanumeric slug (e.g. CC-9X7K2P)
const generateSlug = () => {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Removed confusing 0, 1, I, O
  let result = '';
  const bytes = crypto.randomBytes(6);
  for (let i = 0; i < 6; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return `CC-${result}`;
};

// @desc    Bulk Generate QR Links with Batch Code
// @route   POST /api/qr/generate
exports.generateBatch = async (req, res) => {
  try {
    const { count = 100, batchCode: customBatchCode, description } = req.body;
    const numCount = parseInt(count, 10);

    if (isNaN(numCount) || numCount <= 0 || numCount > 5000) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid count between 1 and 5000',
      });
    }

    // Generate or format Batch Code
    let batchCode = customBatchCode ? customBatchCode.trim().toUpperCase() : '';
    if (!batchCode) {
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const randSuffix = crypto.randomBytes(2).toString('hex').toUpperCase();
      batchCode = `BATCH-${dateStr}-${randSuffix}`;
    }

    // Check if batchCode already exists
    const existingBatch = await Batch.findOne({ batchCode });
    if (existingBatch) {
      return res.status(409).json({
        success: false,
        message: `Batch code "${batchCode}" already exists. Please choose a different code.`,
      });
    }

    // Create Batch record
    const batch = new Batch({
      batchCode,
      description: description ? description.trim() : '',
      totalCount: numCount,
      assignedCount: 0,
      configuredCount: 0,
      createdBy: req.user._id,
    });
    await batch.save();

    // Generate unique slugs
    const linksToInsert = [];
    const generatedCodes = new Set();

    while (linksToInsert.length < numCount) {
      const code = generateSlug();
      if (!generatedCodes.has(code)) {
        generatedCodes.add(code);
        linksToInsert.push({
          code,
          batchCode,
          batchId: batch._id,
          assignedTo: null,
          status: 'unassigned',
          createdBy: req.user._id,
        });
      }
    }

    // Bulk insert into MongoDB
    await QrLink.insertMany(linksToInsert, { ordered: false });

    const baseDomain = await getQrBaseDomain(req);

    return res.status(201).json({
      success: true,
      message: `Successfully generated ${numCount} QR links under Batch "${batchCode}"`,
      batch: {
        id: batch._id,
        batchCode: batch.batchCode,
        totalCount: batch.totalCount,
        description: batch.description,
        createdAt: batch.createdAt,
      },
      sampleLink: `${baseDomain}/r/${linksToInsert[0].code}`,
    });
  } catch (error) {
    console.error('Generate batch error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate QR links',
      error: error.message,
    });
  }
};

// @desc    Get QR Links with Pagination, Search & Rich Filters
// @route   GET /api/qr
exports.getQrLinks = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      period,
      adminId,
      batchCode,
      status,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const query = {};

    // 1. Role-based scoping
    if (req.user.role === 'admin') {
      query.assignedTo = req.user._id;
    } else if (adminId) {
      if (adminId === 'unassigned') {
        query.assignedTo = null;
      } else if (adminId !== 'all') {
        query.assignedTo = adminId;
      }
    }

    // 2. Batch filter
    if (batchCode && batchCode !== 'all') {
      query.batchCode = batchCode.toUpperCase().trim();
    }

    // 3. Status filter
    if (status && status !== 'all') {
      query.status = status;
    }

    // 4. Date / Period filter
    if (period && period !== 'all') {
      const now = new Date();
      let startDate = null;

      if (period === 'today') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      } else if (period === 'this_month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      } else if (period === 'last_month') {
        const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
        query.createdAt = { $gte: firstDayLastMonth, $lte: lastDayLastMonth };
      } else if (period === 'last_7_days') {
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (period === 'last_30_days') {
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      if (startDate && !query.createdAt) {
        query.createdAt = { $gte: startDate };
      }
    }

    // 5. Search keyword
    if (search && search.trim() !== '') {
      const s = search.trim();
      query.$or = [
        { code: { $regex: s, $options: 'i' } },
        { batchCode: { $regex: s, $options: 'i' } },
        { businessName: { $regex: s, $options: 'i' } },
        { customerName: { $regex: s, $options: 'i' } },
        { customerPhone: { $regex: s, $options: 'i' } },
        { redirectUrl: { $regex: s, $options: 'i' } },
      ];
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const skip = (pageNum - 1) * limitNum;

    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [links, total] = await Promise.all([
      QrLink.find(query)
        .populate('assignedTo', 'name email phone company')
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      QrLink.countDocuments(query),
    ]);

    const baseDomain = await getQrBaseDomain(req);

    const formattedLinks = links.map((link) => ({
      ...link,
      fullUrl: `${baseDomain}/r/${link.code}`,
      cleanUrl: `${baseDomain}/${link.code}`,
    }));

    return res.status(200).json({
      success: true,
      links: formattedLinks,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      limit: limitNum,
      baseDomain,
    });
  } catch (error) {
    console.error('Get QR links error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve QR links',
      error: error.message,
    });
  }
};

// @desc    Get All Batches with counts
// @route   GET /api/qr/batches
exports.getBatches = async (req, res) => {
  try {
    const batches = await Batch.find().sort({ createdAt: -1 }).lean();

    // Calculate live counts for each batch
    const batchesWithCounts = await Promise.all(
      batches.map(async (batch) => {
        const total = await QrLink.countDocuments({ batchCode: batch.batchCode });
        const assigned = await QrLink.countDocuments({
          batchCode: batch.batchCode,
          assignedTo: { $ne: null },
        });
        const configured = await QrLink.countDocuments({
          batchCode: batch.batchCode,
          status: 'configured',
        });
        const scans = await QrLink.aggregate([
          { $match: { batchCode: batch.batchCode } },
          { $group: { _id: null, total: { $sum: '$scanCount' } } },
        ]);

        return {
          ...batch,
          totalCount: total,
          assignedCount: assigned,
          unassignedCount: total - assigned,
          configuredCount: configured,
          totalScans: scans[0]?.total || 0,
        };
      })
    );

    return res.status(200).json({
      success: true,
      batches: batchesWithCounts,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve batches',
      error: error.message,
    });
  }
};

// @desc    Assign QR Links to an Admin (by specific IDs or quantity from batch)
// @route   POST /api/qr/assign
exports.assignLinks = async (req, res) => {
  try {
    const { linkIds, batchCode, quantity, adminId } = req.body;

    if (!adminId) {
      return res.status(400).json({
        success: false,
        message: 'Please select an Admin to assign links to',
      });
    }

    const admin = await User.findOne({ _id: adminId, role: 'admin' });
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin account not found',
      });
    }

    let assignedCount = 0;
    const assignDate = new Date();

    if (Array.isArray(linkIds) && linkIds.length > 0) {
      // Assign specific link IDs
      const result = await QrLink.updateMany(
        { _id: { $in: linkIds } },
        {
          $set: {
            assignedTo: admin._id,
            assignedAt: assignDate,
            status: 'assigned',
          },
        }
      );
      assignedCount = result.modifiedCount;
    } else if (batchCode && quantity) {
      // Assign N quantity from a batch
      const numQty = parseInt(quantity, 10);
      if (isNaN(numQty) || numQty <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Please specify a valid assignment quantity',
        });
      }

      const availableLinks = await QrLink.find({
        batchCode: batchCode.toUpperCase().trim(),
        assignedTo: null,
      })
        .limit(numQty)
        .select('_id');

      if (availableLinks.length === 0) {
        return res.status(400).json({
          success: false,
          message: `No unassigned links available in batch "${batchCode}"`,
        });
      }

      const idsToAssign = availableLinks.map((l) => l._id);
      const result = await QrLink.updateMany(
        { _id: { $in: idsToAssign } },
        {
          $set: {
            assignedTo: admin._id,
            assignedAt: assignDate,
            status: 'assigned',
          },
        }
      );
      assignedCount = result.modifiedCount;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Please provide either a list of link IDs or a batchCode with quantity',
      });
    }

    return res.status(200).json({
      success: true,
      message: `Successfully assigned ${assignedCount} QR link(s) to ${admin.name}!`,
      assignedCount,
      adminName: admin.name,
    });
  } catch (error) {
    console.error('Assign links error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to assign links',
      error: error.message,
    });
  }
};

// @desc    Configure QR Link with Redirection URL & Business Info
// @route   PUT /api/qr/:id/configure
exports.configureLink = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      businessName,
      customerName,
      customerPhone,
      customerEmail,
      redirectUrl,
      status,
      notes,
    } = req.body;

    const link = await QrLink.findById(id);
    if (!link) {
      return res.status(404).json({
        success: false,
        message: 'QR link not found',
      });
    }

    // Role check: If Admin, must be assigned to this Admin
    if (
      req.user.role === 'admin' &&
      (!link.assignedTo || link.assignedTo.toString() !== req.user._id.toString())
    ) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. This QR link is not assigned to you.',
      });
    }

    if (businessName !== undefined) link.businessName = businessName.trim();
    if (customerName !== undefined) link.customerName = customerName.trim();
    if (customerPhone !== undefined) {
      const raw = customerPhone.toString().trim();
      if (raw) {
        let digits = raw.replace(/\D/g, '');
        if (digits.length === 12 && digits.startsWith('91')) {
          digits = digits.slice(2);
        }
        if (digits.length > 10) {
          digits = digits.slice(-10);
        }
        if (digits.length > 0 && digits.length < 10) {
          return res.status(400).json({
            success: false,
            message: 'Mobile number must be a valid 10-digit number',
          });
        }
        link.customerPhone = digits.length === 10 ? `+91 ${digits}` : raw;
      } else {
        link.customerPhone = '';
      }
    }
    if (customerEmail !== undefined) link.customerEmail = customerEmail.trim();
    if (notes !== undefined) link.notes = notes.trim();

    // Format & validate redirectUrl
    if (redirectUrl !== undefined) {
      let url = redirectUrl.trim();
      if (url && !url.match(/^https?:\/\//i)) {
        url = `https://${url}`;
      }
      link.redirectUrl = url;
    }

    // Set status
    if (status) {
      link.status = status;
    } else if (link.redirectUrl && link.redirectUrl.length > 0) {
      link.status = 'configured';
    }

    await link.save();
    invalidateRedirect(link.code);

    const baseDomain = await getQrBaseDomain(req);

    // Asynchronously trigger Google Sheet Live Lead Sync (fire-and-forget, non-blocking)
    QrLink.findById(link._id)
      .populate('assignedTo', 'name email phone company')
      .lean()
      .then((popLink) => {
        if (popLink) syncLeadToGoogleSheet(popLink, baseDomain);
      })
      .catch((err) => console.error('[GoogleSheetSync] Error fetching populated link:', err));

    return res.status(200).json({
      success: true,
      message: 'QR Link redirection configured successfully!',
      link: {
        ...link.toObject(),
        fullUrl: `${baseDomain}/r/${link.code}`,
      },
    });
  } catch (error) {
    console.error('Configure link error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to configure QR link',
      error: error.message,
    });
  }
};

// @desc    Get QR Code info / image Data URI or SVG
// @route   GET /api/qr/:id/download
exports.downloadQrCode = async (req, res) => {
  try {
    const { id } = req.params;
    const { format = 'png', size = 1000 } = req.query;

    const link = await QrLink.findById(id);
    if (!link) {
      return res.status(404).json({
        success: false,
        message: 'QR link not found',
      });
    }

    const baseDomain = await getQrBaseDomain(req);
    const targetUrl = `${baseDomain}/r/${link.code}`;

    if (format === 'svg') {
      const svgString = await generatePrintableQrSvg(targetUrl, link.code);
      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="customcliq-${link.code}.svg"`
      );
      return res.send(svgString);
    } else {
      const dataUri = await QRCode.toDataURL(targetUrl, {
        width: parseInt(size, 10) || 1000,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
      });

      return res.status(200).json({
        success: true,
        code: link.code,
        targetUrl,
        dataUri,
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to generate QR code',
      error: error.message,
    });
  }
};

// @desc    Export QR Links to CSV or Excel (XLSX)
// @route   GET /api/qr/export
exports.exportQrData = async (req, res) => {
  try {
    const { format = 'xlsx', batchCode, adminId, status, ids } = req.query;

    const query = {};

    // Filter by specific selected IDs if provided
    if (ids) {
      const idArray = ids.split(',').map((id) => id.trim()).filter(Boolean);
      if (idArray.length > 0) {
        query._id = { $in: idArray };
      }
    }

    if (req.user.role === 'admin') {
      query.assignedTo = req.user._id;
    } else if (adminId && adminId !== 'all') {
      if (adminId === 'unassigned') query.assignedTo = null;
      else query.assignedTo = adminId;
    }

    if (batchCode && batchCode !== 'all') query.batchCode = batchCode.toUpperCase().trim();
    if (status && status !== 'all') query.status = status;

    const links = await QrLink.find(query)
      .populate('assignedTo', 'name email phone company')
      .sort({ createdAt: -1 })
      .lean();

    const baseDomain = await getQrBaseDomain(req);

    const exportData = links.map((l) => ({
      'Batch Code': l.batchCode,
      'QR Code': l.code,
      'Full NFC / QR URL': `${baseDomain}/r/${l.code}`,
      'Direct URL': `${baseDomain}/${l.code}`,
      'Status': l.status.toUpperCase(),
      'Assigned Admin': l.assignedTo ? l.assignedTo.name : 'Unassigned',
      'Admin Phone': l.assignedTo ? l.assignedTo.phone : '',
      'Business Name': l.businessName || '',
      'Customer Name': l.customerName || '',
      'Customer Phone': l.customerPhone || '',
      'Customer Email': l.customerEmail || '',
      'Redirection URL': l.redirectUrl || '',
      'Scan Count': l.scanCount || 0,
      'Last Scanned': l.lastScannedAt ? new Date(l.lastScannedAt).toLocaleString() : '',
      'Created Date': new Date(l.createdAt).toLocaleString(),
    }));

    const filename = `CustomCliq_Export_${batchCode || (query._id ? 'Selected' : 'All')}_${Date.now()}`;

    // Handle ZIP Export of Print-Ready Vector SVGs (with centered codes) & Manifest
    if (format === 'zip') {
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.zip"`);

      // level: 1 for ultra-fast live generation with minimal CPU overhead
      const archive = createZipArchive({ zlib: { level: 1 } });
      archive.pipe(res);

      archive.on('error', (err) => {
        console.error('Archive error:', err);
        if (!res.headersSent) res.status(500).json({ error: err.message });
      });

      // 1. Add Excel spreadsheet manifest inside the ZIP
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'CustomCliq QRs');
      const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      archive.append(excelBuffer, { name: 'manifest.xlsx' });

      // 2. Generate and append Print-Ready Vector SVGs in concurrent chunks for high-speed live production
      const CHUNK_SIZE = 50;
      for (let i = 0; i < links.length; i += CHUNK_SIZE) {
        const chunk = links.slice(i, i + CHUNK_SIZE);
        const batchResults = await Promise.all(
          chunk.map(async (link) => {
            const tapUrl = `${baseDomain}/r/${link.code}`;
            const svgString = await generatePrintableQrSvg(tapUrl, link.code);
            return {
              name: `qr-svgs/${link.code}.svg`,
              buffer: Buffer.from(svgString, 'utf-8'),
            };
          })
        );

        for (const item of batchResults) {
          archive.append(item.buffer, { name: item.name });
        }
      }

      await archive.finalize();
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'CustomCliq QRs');

    if (format === 'csv') {
      const csvBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'csv' });
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
      return res.send(csvBuffer);
    } else {
      const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
      return res.send(excelBuffer);
    }
  } catch (error) {
    console.error('Export error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to export data',
      error: error.message,
    });
  }
};

// @desc    Get Dashboard Statistics (Role-aware)
// @route   GET /api/qr/stats
exports.getDashboardStats = async (req, res) => {
  try {
    const isSuperAdmin = req.user.role === 'superadmin';

    if (isSuperAdmin) {
      const totalGenerated = await QrLink.countDocuments();
      const totalBatches = await Batch.countDocuments();
      const totalAdmins = await User.countDocuments({ role: 'admin' });
      const assignedCount = await QrLink.countDocuments({ assignedTo: { $ne: null } });
      const unassignedCount = totalGenerated - assignedCount;
      const configuredCount = await QrLink.countDocuments({ status: 'configured' });
      const scanAggregate = await QrLink.aggregate([
        { $group: { _id: null, totalScans: { $sum: '$scanCount' } } },
      ]);

      return res.status(200).json({
        success: true,
        stats: {
          totalGenerated,
          totalBatches,
          totalAdmins,
          assignedCount,
          unassignedCount,
          configuredCount,
          totalScans: scanAggregate[0]?.totalScans || 0,
        },
      });
    } else {
      // Admin stats
      const totalAssigned = await QrLink.countDocuments({ assignedTo: req.user._id });
      const configuredCount = await QrLink.countDocuments({
        assignedTo: req.user._id,
        status: 'configured',
      });
      const availableCount = totalAssigned - configuredCount;
      const scanAggregate = await QrLink.aggregate([
        { $match: { assignedTo: req.user._id } },
        { $group: { _id: null, totalScans: { $sum: '$scanCount' } } },
      ]);

      return res.status(200).json({
        success: true,
        stats: {
          totalAssigned,
          configuredCount,
          availableCount,
          totalScans: scanAggregate[0]?.totalScans || 0,
        },
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve dashboard stats',
      error: error.message,
    });
  }
};

// @desc    Get or Update Settings (QR Base Domain, etc.)
// @route   GET & PUT /api/qr/settings
exports.getSettings = async (req, res) => {
  try {
    const settings = await Setting.find();
    const settingsMap = {};
    settings.forEach((s) => {
      settingsMap[s.key] = s.value;
    });

    const activeDomain = await getQrBaseDomain(req);

    // Auto-detected current host domain
    const forwardedProto = req.get('x-forwarded-proto');
    const forwardedHost = req.get('x-forwarded-host');
    const host = forwardedHost || req.get('host');
    const protocol = forwardedProto || req.protocol || 'http';
    const currentHostDomain = host ? `${protocol}://${host}`.replace(/\/+$/, '') : 'http://localhost:5173';

    const isCustomDomain = Boolean(
      settingsMap.qr_base_domain &&
      settingsMap.qr_base_domain.trim() !== '' &&
      settingsMap.qr_base_domain.trim().toLowerCase() !== 'auto'
    );

    return res.status(200).json({
      success: true,
      settings: settingsMap,
      activeDomain,
      currentHostDomain,
      domainMode: isCustomDomain ? 'custom' : 'current_host',
      googleAppsScriptTemplate: GOOGLE_APPS_SCRIPT_TEMPLATE,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve settings',
    });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const {
      qr_base_domain,
      company_name,
      google_sheet_webhook_url,
      google_sheet_sync_enabled,
    } = req.body;

    if (qr_base_domain !== undefined) {
      let cleaned = (qr_base_domain || '').trim();
      if (cleaned.toLowerCase() === 'auto' || cleaned === '') {
        cleaned = '';
      } else {
        cleaned = cleaned.replace(/\/+$/, '');
        if (!cleaned.match(/^https?:\/\//i)) {
          cleaned = `https://${cleaned}`;
        }
      }

      await Setting.findOneAndUpdate(
        { key: 'qr_base_domain' },
        {
          key: 'qr_base_domain',
          value: cleaned,
          description: 'Base domain for NFC / QR codes (empty for current host)',
        },
        { upsert: true, new: true }
      );
    }

    if (company_name !== undefined) {
      await Setting.findOneAndUpdate(
        { key: 'company_name' },
        {
          key: 'company_name',
          value: company_name.trim(),
          description: 'Company / Brand name',
        },
        { upsert: true, new: true }
      );
    }

    if (google_sheet_webhook_url !== undefined) {
      await Setting.findOneAndUpdate(
        { key: 'google_sheet_webhook_url' },
        {
          key: 'google_sheet_webhook_url',
          value: google_sheet_webhook_url.trim(),
          description: 'Google Apps Script Webhook URL for live lead sync',
        },
        { upsert: true, new: true }
      );
    }

    if (google_sheet_sync_enabled !== undefined) {
      await Setting.findOneAndUpdate(
        { key: 'google_sheet_sync_enabled' },
        {
          key: 'google_sheet_sync_enabled',
          value: Boolean(google_sheet_sync_enabled),
          description: 'Toggle for automatic Google Sheet lead sync',
        },
        { upsert: true, new: true }
      );
    }

    const activeDomain = await getQrBaseDomain(req);
    const forwardedProto = req.get('x-forwarded-proto');
    const forwardedHost = req.get('x-forwarded-host');
    const host = forwardedHost || req.get('host');
    const protocol = forwardedProto || req.protocol || 'http';
    const currentHostDomain = host ? `${protocol}://${host}`.replace(/\/+$/, '') : 'http://localhost:5173';

    return res.status(200).json({
      success: true,
      message: 'System settings updated successfully',
      activeDomain,
      currentHostDomain,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update settings',
    });
  }
};

// @desc    Verify Custom Domain DNS resolution and server reachability
// @route   POST /api/qr/settings/verify-domain
exports.verifyDomainReachability = async (req, res) => {
  try {
    let { domain } = req.body;
    if (!domain || typeof domain !== 'string' || !domain.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Domain name is required',
      });
    }

    let cleanedDomain = domain.trim();
    if (!cleanedDomain.match(/^https?:\/\//i)) {
      cleanedDomain = `https://${cleanedDomain}`;
    }

    let parsedUrl;
    try {
      parsedUrl = new URL(cleanedDomain);
    } catch (e) {
      return res.status(400).json({
        success: false,
        message: 'Invalid domain format. Example: https://qr.yourbrand.com',
      });
    }

    const hostname = parsedUrl.hostname;
    const protocol = parsedUrl.protocol; // 'http:' or 'https:'
    const port = parsedUrl.port || (protocol === 'https:' ? 443 : 80);

    // 1. DNS Resolution Check
    let resolvedIps = [];
    try {
      const lookupResult = await dns.lookup(hostname, { all: true });
      resolvedIps = lookupResult.map((item) => item.address);
    } catch (dnsErr) {
      return res.status(200).json({
        success: false,
        reachable: false,
        hostname,
        errorStep: 'dns',
        message: `DNS Lookup Failed: The domain "${hostname}" does not resolve to any IP address.`,
        instructions: `Go to your domain DNS provider (e.g. Cloudflare, GoDaddy, Namecheap) and create a CNAME or A Record pointing to this server IP before activating.`,
      });
    }

    // 2. HTTP Server Reachability Probe (Check if /health responds)
    const probePath = '/health';
    const clientModule = protocol === 'https:' ? https : http;

    const probeResult = await new Promise((resolve) => {
      const timer = setTimeout(() => {
        resolve({
          success: false,
          errorStep: 'timeout',
          message: `Connection Timed Out: Server at "${hostname}" did not respond within 6 seconds. Ensure your server firewall / reverse proxy routes traffic on port ${port}.`,
        });
      }, 6000);

      const probeReq = clientModule.get(
        `${protocol}//${hostname}${parsedUrl.port ? `:${parsedUrl.port}` : ''}${probePath}`,
        {
          headers: {
            'User-Agent': 'CustomCliq-Domain-Verifier/2.0',
            'Accept': 'application/json',
          },
          rejectUnauthorized: false, // Allow testing staging/self-signed certs
        },
        (probeRes) => {
          clearTimeout(timer);
          let data = '';
          probeRes.on('data', (chunk) => {
            data += chunk;
          });
          probeRes.on('end', () => {
            let isCustomCliq = false;
            try {
              const json = JSON.parse(data);
              if (json && (json.status === 'healthy' || json.name?.includes('CustomCliq'))) {
                isCustomCliq = true;
              }
            } catch (err) {}

            if (probeRes.statusCode >= 200 && probeRes.statusCode < 400) {
              resolve({
                success: true,
                statusCode: probeRes.statusCode,
                isCustomCliq,
                message: isCustomCliq
                  ? `Domain verified successfully! "${hostname}" resolves to ${resolvedIps[0]} and connects directly to CustomCliq.`
                  : `Domain responds (HTTP ${probeRes.statusCode}), but did not return CustomCliq health signature. Verify your reverse proxy points to this exact application.`,
              });
            } else {
              resolve({
                success: false,
                statusCode: probeRes.statusCode,
                errorStep: 'status_code',
                message: `Server reached but responded with HTTP ${probeRes.statusCode}.`,
              });
            }
          });
        }
      );

      probeReq.on('error', (err) => {
        clearTimeout(timer);
        resolve({
          success: false,
          errorStep: 'connection',
          message: `Could not connect to "${hostname}": ${err.message}. Ensure your web server or reverse proxy is configured for this hostname.`,
        });
      });
    });

    return res.status(200).json({
      success: true,
      reachable: probeResult.success,
      hostname,
      resolvedIps,
      normalizedDomain: `${protocol}//${hostname}${parsedUrl.port ? `:${parsedUrl.port}` : ''}`,
      details: probeResult,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to verify domain reachability: ' + error.message,
    });
  }
};

// @desc    Test Google Sheet Webhook Connection
// @route   POST /api/qr/google-sheet/test
exports.testGoogleSheet = async (req, res) => {
  try {
    let { webhookUrl } = req.body;
    if (!webhookUrl) {
      const urlSetting = await Setting.findOne({ key: 'google_sheet_webhook_url' });
      webhookUrl = urlSetting ? urlSetting.value : '';
    }

    const result = await testGoogleSheetWebhook(webhookUrl);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Sync All Links to Google Sheet (Configured at top, 2 blank spacer rows, then empty/assigned/unassigned)
// @route   POST /api/qr/google-sheet/sync-all
exports.syncAllGoogleSheet = async (req, res) => {
  try {
    const { webhookUrl } = req.body;

    // 1. Fetch configured links (active leads) to place at top
    const configuredLinks = await QrLink.find({ status: 'configured' })
      .populate('assignedTo', 'name email phone company')
      .sort({ updatedAt: -1 })
      .lean();

    // 2. Fetch all other links (assigned, unassigned, inactive)
    const otherLinks = await QrLink.find({ status: { $ne: 'configured' } })
      .populate('assignedTo', 'name email phone company')
      .sort({ createdAt: -1 })
      .lean();

    const totalCount = configuredLinks.length + otherLinks.length;
    if (totalCount === 0) {
      return res.status(400).json({
        success: false,
        message: 'No QR links found in the system to sync yet',
      });
    }

    const baseDomain = await getQrBaseDomain(req);
    const result = await syncAllLinksToGoogleSheet(
      { configuredLinks, otherLinks },
      baseDomain,
      webhookUrl
    );
    return res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Public / API Lookup for single QR link (used by redirection page & scanner)
// @route   GET /api/qr/info/:code
exports.getLinkByCode = async (req, res) => {
  try {
    const { code } = req.params;
    if (!code) {
      return res.status(400).json({ success: false, message: 'Code is required' });
    }
    const cleanCode = code.trim().toUpperCase();
    const stripped = cleanCode.replace(/^CC-/i, '');

    const link = await QrLink.findOne({
      $or: [
        { code: cleanCode },
        { code: `CC-${stripped}` },
        { code: stripped },
      ],
    }).populate('assignedTo', 'name email phone company');

    if (!link) {
      return res.status(404).json({
        success: false,
        message: 'CustomCliq tag not found',
      });
    }

    const baseDomain = await getQrBaseDomain(req);

    return res.status(200).json({
      success: true,
      link: {
        code: link.code,
        batchCode: link.batchCode,
        businessName: link.businessName,
        customerName: link.customerName,
        customerPhone: link.customerPhone,
        customerEmail: link.customerEmail,
        redirectUrl: link.redirectUrl,
        status: link.status,
        scanCount: link.scanCount,
        assignedTo: link.assignedTo,
        fullUrl: `${baseDomain}/r/${link.code}`,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error fetching tag info',
    });
  }
};

// ============================================================================
// [TEMP/CONFIGURABLE] QR Link Deletion & Fast Selection Functions
// If deletion needs to be commented out or disabled later, simply comment the routes in qrRoutes.js
// ============================================================================

// @desc    Delete multiple QR links in bulk (Super Admin only)
// @route   POST /api/qr/delete-bulk
exports.deleteBulkLinks = async (req, res) => {
  try {
    const { linkIds } = req.body;
    if (!Array.isArray(linkIds) || linkIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of link IDs to delete',
      });
    }

    // Find affected batch codes before deletion so we can recount them
    const linksToDelete = await QrLink.find({ _id: { $in: linkIds } }).select('batchCode');
    const affectedBatchCodes = [...new Set(linksToDelete.map((l) => l.batchCode).filter(Boolean))];

    const result = await QrLink.deleteMany({ _id: { $in: linkIds } });
    clearAllRedirectCache();

    // Recalculate counts for all affected batches
    for (const bCode of affectedBatchCodes) {
      const total = await QrLink.countDocuments({ batchCode: bCode });
      const assigned = await QrLink.countDocuments({ batchCode: bCode, assignedTo: { $ne: null } });
      const configured = await QrLink.countDocuments({ batchCode: bCode, status: 'configured' });

      await Batch.updateOne(
        { batchCode: bCode },
        { totalCount: total, assignedCount: assigned, configuredCount: configured }
      );
    }

    return res.status(200).json({
      success: true,
      message: `Successfully deleted ${result.deletedCount} QR link(s)`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error('Delete bulk links error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete QR links',
      error: error.message,
    });
  }
};

// @desc    Delete a single QR link by ID (Super Admin only)
// @route   DELETE /api/qr/:id
exports.deleteSingleLink = async (req, res) => {
  try {
    const { id } = req.params;
    const link = await QrLink.findById(id);
    if (!link) {
      return res.status(404).json({
        success: false,
        message: 'QR link not found',
      });
    }

    const batchCode = link.batchCode;
    await QrLink.findByIdAndDelete(id);
    invalidateRedirect(link.code);

    if (batchCode) {
      const total = await QrLink.countDocuments({ batchCode });
      const assigned = await QrLink.countDocuments({ batchCode, assignedTo: { $ne: null } });
      const configured = await QrLink.countDocuments({ batchCode, status: 'configured' });

      await Batch.updateOne(
        { batchCode },
        { totalCount: total, assignedCount: assigned, configuredCount: configured }
      );
    }

    return res.status(200).json({
      success: true,
      message: `QR link ${link.code} deleted successfully`,
    });
  } catch (error) {
    console.error('Delete single link error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete QR link',
      error: error.message,
    });
  }
};

// @desc    Get unassigned link IDs by count (for rapid selection of e.g. 500 links)
// @route   GET /api/qr/unassigned-ids
exports.getUnassignedIds = async (req, res) => {
  try {
    const { batchCode, limit = 500 } = req.query;
    const query = { assignedTo: null };

    if (batchCode && batchCode !== 'all') {
      query.batchCode = batchCode.toUpperCase().trim();
    }

    const numLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 5000);

    const links = await QrLink.find(query)
      .limit(numLimit)
      .select('_id code batchCode')
      .lean();

    return res.status(200).json({
      success: true,
      count: links.length,
      linkIds: links.map((l) => l._id),
      links,
    });
  } catch (error) {
    console.error('Get unassigned IDs error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch unassigned link IDs',
      error: error.message,
    });
  }
};


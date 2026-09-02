const crypto = require('crypto');
const QRCode = require('qrcode');
const XLSX = require('xlsx');
const archiver = require('archiver');
const QrLink = require('../models/QrLink');
const Batch = require('../models/Batch');
const User = require('../models/User');
const Setting = require('../models/Setting');

// Helper to get active dynamic QR base domain
const getQrBaseDomain = async (req) => {
  try {
    const setting = await Setting.findOne({ key: 'qr_base_domain' });
    if (setting && setting.value && setting.value.trim() !== '') {
      return setting.value.trim().replace(/\/+$/, '');
    }
  } catch (err) {
    console.error('Error fetching qr_base_domain setting:', err);
  }

  // Fallback to request host or env
  if (req) {
    const host = req.get('host');
    const protocol = req.protocol || 'http';
    return `${protocol}://${host}`;
  }
  return process.env.DEFAULT_QR_DOMAIN || 'http://localhost:5173';
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
    if (customerPhone !== undefined) link.customerPhone = customerPhone.trim();
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

    const baseDomain = await getQrBaseDomain(req);

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
      const svgString = await QRCode.toString(targetUrl, {
        type: 'svg',
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
      });
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

    // Handle ZIP Export of 1000px High-Res PNG QR Images
    if (format === 'zip') {
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.zip"`);

      const archive = archiver('zip', { zlib: { level: 9 } });
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

      // 2. Generate and append 1000px High-Res PNG images for each card
      for (const link of links) {
        const tapUrl = `${baseDomain}/r/${link.code}`;
        const pngBuffer = await QRCode.toBuffer(tapUrl, {
          type: 'png',
          width: 1000,
          margin: 2,
          color: { dark: '#000000', light: '#ffffff' },
        });
        archive.append(pngBuffer, { name: `qr-images/${link.code}.png` });
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

    return res.status(200).json({
      success: true,
      settings: settingsMap,
      activeDomain,
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
    const { qr_base_domain, company_name } = req.body;

    if (qr_base_domain !== undefined) {
      await Setting.findOneAndUpdate(
        { key: 'qr_base_domain' },
        {
          key: 'qr_base_domain',
          value: qr_base_domain.trim(),
          description: 'Base domain for NFC / QR codes',
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

    const activeDomain = await getQrBaseDomain(req);

    return res.status(200).json({
      success: true,
      message: 'System settings updated successfully',
      activeDomain,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update settings',
    });
  }
};

// @desc    Public / API Lookup for single QR link (used by redirection page)
// @route   GET /api/qr/info/:code
exports.getLinkByCode = async (req, res) => {
  try {
    const { code } = req.params;
    const cleanCode = code.toUpperCase().trim();

    const link = await QrLink.findOne({ code: cleanCode });
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
        redirectUrl: link.redirectUrl,
        status: link.status,
        scanCount: link.scanCount,
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


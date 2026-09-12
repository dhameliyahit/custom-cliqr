const express = require('express');
const router = express.Router();
const qrController = require('../controllers/qrController');
const {
  verifyAccessToken,
  requireSuperAdmin,
  requireAdminOrSuperAdmin,
} = require('../middleware/auth');

// Public endpoint for tag lookup
router.get('/info/:code', qrController.getLinkByCode);

// Authenticated routes
router.use(verifyAccessToken);

// Dashboard statistics
router.get('/stats', qrController.getDashboardStats);

// Batch & QR listing
router.get('/', qrController.getQrLinks);
router.get('/batches', qrController.getBatches);
router.get('/batches/:batchCode/details', requireSuperAdmin, qrController.getBatchDetails);
router.get('/export', qrController.exportQrData);
router.get('/:id/download', qrController.downloadQrCode);

// QR link configuration (Admin configuring customer's redirect)
router.put('/:id/configure', requireAdminOrSuperAdmin, qrController.configureLink);

// Super Admin exclusive routes
router.post('/generate', requireSuperAdmin, qrController.generateBatch);
router.post('/assign', requireSuperAdmin, qrController.assignLinks);
router.get('/settings', requireSuperAdmin, qrController.getSettings);
router.put('/settings', requireSuperAdmin, qrController.updateSettings);
router.post('/settings/verify-domain', requireSuperAdmin, qrController.verifyDomainReachability);

// Google Sheet Live Lead Sync routes (Super Admin only)
router.post('/google-sheet/test', requireSuperAdmin, qrController.testGoogleSheet);
router.post('/google-sheet/sync-all', requireSuperAdmin, qrController.syncAllGoogleSheet);

// Quick unassigned IDs lookup (for rapid number-based selection like 500 QRs)
router.get('/unassigned-ids', requireSuperAdmin, qrController.getUnassignedIds);

// [TEMP/CONFIGURABLE] QR Link Deletion (Comment out lines below if deleting should be disabled)
router.post('/delete-bulk', requireSuperAdmin, qrController.deleteBulkLinks);
router.delete('/:id', requireSuperAdmin, qrController.deleteSingleLink);


module.exports = router;

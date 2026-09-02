const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifyAccessToken, requireSuperAdmin } = require('../middleware/auth');

router.use(verifyAccessToken, requireSuperAdmin);

router.get('/', adminController.getAllAdmins);
router.post('/', adminController.createAdmin);
router.put('/:id', adminController.updateAdmin);
router.delete('/:id', adminController.deleteAdmin);

module.exports = router;

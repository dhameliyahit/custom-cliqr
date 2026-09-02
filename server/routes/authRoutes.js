const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyAccessToken } = require('../middleware/auth');

router.post('/login', authController.login);
router.post('/register', authController.register);
router.post('/refresh', authController.refreshToken);
router.post('/logout', verifyAccessToken, authController.logout);
router.get('/me', verifyAccessToken, authController.getMe);
router.put('/profile', verifyAccessToken, authController.updateProfile);

module.exports = router;

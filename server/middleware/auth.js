const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Setting = require('../models/Setting');

const generateTokens = (userId, role) => {
  const accessToken = jwt.sign(
    { id: userId, role },
    process.env.JWT_SECRET || 'customcliq_super_secret_jwt_key_2026_x9k2',
    { expiresIn: '2h' }
  );

  const refreshToken = jwt.sign(
    { id: userId, role },
    process.env.JWT_REFRESH_SECRET || 'customcliq_super_refresh_jwt_key_2026_z8m4',
    { expiresIn: '30d' }
  );

  return { accessToken, refreshToken };
};

const verifyAccessToken = async (req, res, next) => {
  try {
    let token = null;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.query && req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No authorization token provided.',
      });
    }

    // Check service-wide billing suspension
    const billingSetting = await Setting.findOne({ key: 'billing_suspended' });
    if (billingSetting && billingSetting.value === true) {
      return res.status(403).json({
        success: false,
        code: 'BILLING_SUSPENDED',
        message: 'Service Suspended: Application is temporarily suspended due to pending billing.',
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'customcliq_super_secret_jwt_key_2026_x9k2'
    );

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'The account associated with this token no longer exists.',
      });
    }

    if (user.billingSuspended || (user.status === 'blocked' && user.blockReason && user.blockReason.toLowerCase().includes('billing'))) {
      return res.status(403).json({
        success: false,
        code: 'BILLING_SUSPENDED',
        message: user.blockReason || 'Service Suspended: Application is temporarily suspended due to pending billing.',
      });
    }

    if (user.status === 'blocked') {
      return res.status(403).json({
        success: false,
        message: user.blockReason || 'Account has been blocked. Please contact support.',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      code: 'TOKEN_EXPIRED',
      message: 'Invalid or expired token.',
    });
  }
};

const requireSuperAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'superadmin') {
    return res.status(403).json({
      success: false,
      message: 'Forbidden. Super Admin access required.',
    });
  }
  next();
};

const requireAdminOrSuperAdmin = (req, res, next) => {
  if (!req.user || (req.user.role !== 'superadmin' && req.user.role !== 'admin')) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden. Admin privileges required.',
    });
  }
  next();
};

module.exports = {
  generateTokens,
  verifyAccessToken,
  requireSuperAdmin,
  requireAdminOrSuperAdmin,
};

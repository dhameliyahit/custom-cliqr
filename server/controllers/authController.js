const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { generateTokens } = require('../middleware/auth');

// @desc    Login user (SuperAdmin / Admin)
// @route   POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password',
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. User not found.',
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Password incorrect.',
      });
    }

    if (user.status === 'blocked') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact support.',
      });
    }

    const { accessToken, refreshToken } = generateTokens(user._id, user.role);

    // Keep at most 10 active refresh tokens
    user.refreshTokens = user.refreshTokens || [];
    if (user.refreshTokens.length > 10) {
      user.refreshTokens.shift();
    }
    user.refreshTokens.push({ token: refreshToken });
    await user.save();

    return res.status(200).json({
      success: true,
      message: `Welcome back, ${user.name}!`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        company: user.company,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: error.message,
    });
  }
};

// @desc    Register Admin (Self-registration)
// @route   POST /api/auth/register
exports.register = async (req, res) => {
  try {
    const { name, email, phone, password, company } = req.body;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, phone, and password are required',
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists.',
      });
    }

    const newUser = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      password,
      company: company ? company.trim() : '',
      role: 'admin',
      status: 'active',
      assignedCount: 0,
      configuredCount: 0,
    });

    const { accessToken, refreshToken } = generateTokens(newUser._id, newUser.role);
    newUser.refreshTokens = [{ token: refreshToken }];
    await newUser.save();

    return res.status(201).json({
      success: true,
      message: 'Registration successful! Welcome to CustomCliq.',
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role,
        status: newUser.status,
        company: newUser.company,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during registration',
      error: error.message,
    });
  }
};

// @desc    Renew Access Token using Refresh Token
// @route   POST /api/auth/refresh
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required',
      });
    }

    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET || 'customcliq_super_refresh_jwt_key_2026_z8m4'
    );

    const user = await User.findOne({
      _id: decoded.id,
      'refreshTokens.token': refreshToken,
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or revoked refresh token',
      });
    }

    if (user.status === 'blocked') {
      return res.status(403).json({
        success: false,
        message: 'Account is blocked',
      });
    }

    // Generate new tokens (token rotation)
    const tokens = generateTokens(user._id, user.role);

    // Replace old refresh token with new one
    user.refreshTokens = user.refreshTokens.filter((rt) => rt.token !== refreshToken);
    user.refreshTokens.push({ token: tokens.refreshToken });
    await user.save();

    return res.status(200).json({
      success: true,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired refresh token',
      error: error.message,
    });
  }
};

// @desc    Logout user & invalidate refresh token
// @route   POST /api/auth/logout
exports.logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (req.user && refreshToken) {
      await User.findByIdAndUpdate(req.user._id, {
        $pull: { refreshTokens: { token: refreshToken } },
      });
    }
    return res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error during logout',
    });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch user profile',
    });
  }
};

// @desc    Update profile
// @route   PUT /api/auth/profile
exports.updateProfile = async (req, res) => {
  try {
    const { name, phone, password, company } = req.body;
    const user = await User.findById(req.user._id);

    if (name) user.name = name.trim();
    if (phone) user.phone = phone.trim();
    if (company !== undefined) user.company = company.trim();
    if (password) user.password = password;

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update profile',
    });
  }
};

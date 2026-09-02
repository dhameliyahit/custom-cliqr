const User = require('../models/User');
const QrLink = require('../models/QrLink');

// @desc    Get all admins with their link statistics
// @route   GET /api/admins
exports.getAllAdmins = async (req, res) => {
  try {
    const admins = await User.find({ role: 'admin' }).sort({ createdAt: -1 });

    // Populate live counts from QrLink
    const adminList = await Promise.all(
      admins.map(async (admin) => {
        const assigned = await QrLink.countDocuments({ assignedTo: admin._id });
        const configured = await QrLink.countDocuments({
          assignedTo: admin._id,
          status: 'configured',
        });
        const totalScans = await QrLink.aggregate([
          { $match: { assignedTo: admin._id } },
          { $group: { _id: null, total: { $sum: '$scanCount' } } },
        ]);

        return {
          _id: admin._id,
          name: admin.name,
          email: admin.email,
          phone: admin.phone,
          company: admin.company,
          status: admin.status,
          assignedCount: assigned,
          configuredCount: configured,
          availableCount: assigned - configured,
          totalScans: totalScans[0]?.total || 0,
          createdAt: admin.createdAt,
        };
      })
    );

    return res.status(200).json({
      success: true,
      admins: adminList,
    });
  } catch (error) {
    console.error('Fetch admins error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve admins',
      error: error.message,
    });
  }
};

// @desc    Create new Admin by Super Admin
// @route   POST /api/admins
exports.createAdmin = async (req, res) => {
  try {
    const { name, email, phone, password, company } = req.body;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, phone, and password are required',
      });
    }

    const exists = await User.findOne({ email: email.toLowerCase().trim() });
    if (exists) {
      return res.status(409).json({
        success: false,
        message: 'A user with this email already exists',
      });
    }

    const admin = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      password,
      company: company ? company.trim() : '',
      role: 'admin',
      status: 'active',
    });

    await admin.save();

    return res.status(201).json({
      success: true,
      message: `Admin account for ${admin.name} created successfully`,
      admin,
    });
  } catch (error) {
    console.error('Create admin error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create admin',
      error: error.message,
    });
  }
};

// @desc    Update Admin
// @route   PUT /api/admins/:id
exports.updateAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, company, status, password } = req.body;

    const admin = await User.findOne({ _id: id, role: 'admin' });
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found',
      });
    }

    if (name) admin.name = name.trim();
    if (phone) admin.phone = phone.trim();
    if (company !== undefined) admin.company = company.trim();
    if (status) admin.status = status;
    if (password) admin.password = password;

    await admin.save();

    return res.status(200).json({
      success: true,
      message: 'Admin details updated successfully',
      admin,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update admin',
      error: error.message,
    });
  }
};

// @desc    Delete Admin and unassign links
// @route   DELETE /api/admins/:id
exports.deleteAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const admin = await User.findOne({ _id: id, role: 'admin' });

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found',
      });
    }

    // Unassign links assigned to this admin
    await QrLink.updateMany(
      { assignedTo: id },
      { $set: { assignedTo: null, assignedAt: null, status: 'unassigned' } }
    );

    await User.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: `Admin ${admin.name} deleted and their links have been returned to unassigned pool.`,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete admin',
      error: error.message,
    });
  }
};

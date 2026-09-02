require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const User = require('../models/User');
const Setting = require('../models/Setting');

const seed = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/customcliq';
    await mongoose.connect(mongoUri);
    console.log('[Seed] Connected to MongoDB:', mongoUri);

    const email = 'superadmin@gmail.com';
    const password = '123456';

    let superAdmin = await User.findOne({ email });
    if (!superAdmin) {
      superAdmin = await User.findOne({ role: 'superadmin' });
    }

    if (!superAdmin) {
      superAdmin = new User({
        name: 'CustomCliq SuperAdmin',
        email,
        phone: '+919090909090',
        password,
        role: 'superadmin',
        status: 'active',
        company: 'CustomCliq HQ',
      });
    } else {
      superAdmin.email = email;
      superAdmin.password = password; // pre-save hook will hash it
      superAdmin.status = 'active';
    }

    await superAdmin.save();
    console.log('[Seed] SuperAdmin configured with:', email);

    // Default settings
    await Setting.findOneAndUpdate(
      { key: 'qr_base_domain' },
      { key: 'qr_base_domain', value: 'http://localhost:5173', description: 'Dynamic QR / NFC Base Domain' },
      { upsert: true }
    );

    await Setting.findOneAndUpdate(
      { key: 'company_name' },
      { key: 'company_name', value: 'CustomCliq Smart NFC', description: 'Brand Name' },
      { upsert: true }
    );

    console.log('\n=============================================');
    console.log(' SUPERADMIN READY:');
    console.log(` Email   : ${email}`);
    console.log(` Password: ${password}`);
    console.log('=============================================\n');

    process.exit(0);
  } catch (error) {
    console.error('[Seed Error]:', error);
    process.exit(1);
  }
};

seed();

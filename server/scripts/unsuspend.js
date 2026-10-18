const path = require('path');
const fs = require('fs');

// Support .env in root directory or inside server/
const rootEnvPath = path.resolve(__dirname, '../../.env');
const serverEnvPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(rootEnvPath)) {
  require('dotenv').config({ path: rootEnvPath });
}
if (fs.existsSync(serverEnvPath)) {
  require('dotenv').config({ path: serverEnvPath });
}
require('dotenv').config();

const mongoose = require('mongoose');
const Setting = require('../models/Setting');

const run = async () => {
  try {
    const mongoUri =
      process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/customcliq';

    console.log('[Connecting to MongoDB]...');
    await mongoose.connect(mongoUri);
    console.log('[Connected] successfully.');

    await Setting.findOneAndUpdate(
      { key: 'billing_suspended' },
      {
        key: 'billing_suspended',
        value: false,
        description: 'Billing Suspension Flag',
      },
      { upsert: true }
    );

    console.log('\n=============================================================');
    console.log('  CUSTOMCLIQ — SERVICE RESTORED (ACTIVE)');
    console.log('=============================================================');
    console.log('  [✓] Billing suspension flag removed (value: false)');
    console.log('  [✓] SuperAdmin and Admin logins are enabled again');
    console.log('  [✓] All QR code redirections are active again');
    console.log('=============================================================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('\n[Error]:', error.message);
    process.exit(1);
  }
};

run();

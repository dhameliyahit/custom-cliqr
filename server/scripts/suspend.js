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
const User = require('../models/User');
const Setting = require('../models/Setting');

const run = async () => {
  try {
    const mongoUri =
      process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/customcliq';

    console.log('[Connecting to MongoDB]...');
    await mongoose.connect(mongoUri);
    console.log('[Connected] successfully.');

    // Check action from command line args (e.g. node suspend.js resume)
    const args = process.argv.slice(2);
    const action = (args[0] || 'suspend').toLowerCase().trim();

    if (['resume', 'unsuspend', 'active', 'activate', 'enable'].includes(action)) {
      // 1. UNSUSPEND / RESUME SERVICE
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
      console.log('  [✓] SuperAdmin and Admin logins are restored');
      console.log('  [✓] All QR code redirections are active again');
      console.log('=============================================================\n');
    } else {
      // 2. SUSPEND SERVICE FOR BILLING
      await Setting.findOneAndUpdate(
        { key: 'billing_suspended' },
        {
          key: 'billing_suspended',
          value: true,
          description: 'Billing Suspension Flag',
        },
        { upsert: true }
      );

      // Invalidate all active user sessions by wiping refresh tokens
      const result = await User.updateMany({}, { $set: { refreshTokens: [] } });

      console.log('\n=============================================================');
      console.log('  CUSTOMCLIQ — BILLING SUSPENSION ACTIVATED');
      console.log('=============================================================');
      console.log('  [✓] Billing suspension flag enabled in database');
      console.log(`  [✓] Logged out all users (${result.modifiedCount} accounts terminated)`);
      console.log('  [✓] All active sessions terminated immediately');
      console.log('  [✓] Login attempts will now display:');
      console.log('      "Service Suspended: Account is temporarily suspended due to pending billing. Please contact the service provider to restore access."');
      console.log('  [✓] QR code scans will show Billing Suspension screen');
      console.log('  [✓] Client business data remains 100% safe & intact');
      console.log('-------------------------------------------------------------');
      console.log('  To reactivate the service when payment is settled, run:');
      console.log('    node server/scripts/suspend.js resume');
      console.log('    or: node server/scripts/unsuspend.js');
      console.log('=============================================================\n');
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('\n[Error]:', error.message);
    process.exit(1);
  }
};

run();

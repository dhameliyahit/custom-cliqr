if (!global.crypto) {
  global.crypto = require('crypto');
}

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

const BILLING_MESSAGE =
  'Service Suspended: Account is temporarily suspended due to pending billing. Please contact the service provider to restore access.';

const run = async () => {
  try {
    const mongoUri =
      process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/customcliq';

    console.log('[Connecting to MongoDB]...');
    await mongoose.connect(mongoUri);
    console.log('[Connected] successfully.');

    // Parse command line arguments
    const args = process.argv.slice(2);
    let action = 'suspend';
    let targetEmail = null;

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      if (['resume', 'unsuspend', 'active', 'activate', 'enable'].includes(arg.toLowerCase())) {
        action = 'resume';
      } else if (['suspend', 'block'].includes(arg.toLowerCase())) {
        action = 'suspend';
      } else if (arg === '--email' || arg === '-e') {
        targetEmail = args[i + 1]?.toLowerCase().trim();
        i++;
      } else if (arg.startsWith('--email=')) {
        targetEmail = arg.split('=')[1]?.toLowerCase().trim();
      } else if (arg.includes('@') && !arg.startsWith('-')) {
        targetEmail = arg.toLowerCase().trim();
      }
    }

    if (targetEmail) {
      // =========================================================
      // TARGETED SUSPENSION / RESTORATION FOR SPECIFIC EMAIL
      // =========================================================
      const user = await User.findOne({ email: targetEmail });
      if (!user) {
        console.error(`\n[Error] No user found with email: "${targetEmail}"`);
        await mongoose.disconnect();
        process.exit(1);
      }

      if (action === 'resume') {
        user.billingSuspended = false;
        user.status = 'active';
        user.blockReason = '';
        await user.save();

        console.log('\n=============================================================');
        console.log('  CUSTOMCLIQ — USER ACCOUNT RESTORED (ACTIVE)');
        console.log('=============================================================');
        console.log(`  [✓] Target User   : ${user.name} (${user.email})`);
        console.log(`  [✓] Role          : ${user.role}`);
        console.log(`  [✓] Status        : active (billingSuspended = false)`);
        console.log(`  [✓] Login and API access restored for this account`);
        console.log('=============================================================\n');
      } else {
        // Suspend specific user for billing
        user.billingSuspended = true;
        user.status = 'blocked';
        user.blockReason = BILLING_MESSAGE;
        user.refreshTokens = []; // Force logout from all active sessions
        await user.save();

        console.log('\n=============================================================');
        console.log('  CUSTOMCLIQ — USER ACCOUNT SUSPENDED FOR BILLING');
        console.log('=============================================================');
        console.log(`  [✓] Target User   : ${user.name} (${user.email})`);
        console.log(`  [✓] Role          : ${user.role}`);
        console.log(`  [✓] Status        : blocked (billingSuspended = true)`);
        console.log(`  [✓] Active sessions terminated immediately (logged out)`);
        console.log(`  [✓] When this user logs in, they will see:`);
        console.log(`      "${BILLING_MESSAGE}"`);
        console.log('-------------------------------------------------------------');
        console.log('  To reactivate this user, run:');
        console.log(`    node server/scripts/suspend.js resume --email ${user.email}`);
        console.log(`    or: node server/scripts/unsuspend.js --email ${user.email}`);
        console.log('=============================================================\n');
      }
    } else {
      // =========================================================
      // SYSTEM-WIDE SUSPENSION / RESTORATION FOR ALL USERS
      // =========================================================
      if (action === 'resume') {
        // Resume all
        await Setting.findOneAndUpdate(
          { key: 'billing_suspended' },
          { key: 'billing_suspended', value: false, description: 'Billing Suspension Flag' },
          { upsert: true }
        );

        // Also reset any accounts that had billingSuspended flag
        await User.updateMany(
          { billingSuspended: true },
          { $set: { billingSuspended: false, status: 'active', blockReason: '' } }
        );

        console.log('\n=============================================================');
        console.log('  CUSTOMCLIQ — SERVICE RESTORED (ACTIVE)');
        console.log('=============================================================');
        console.log('  [✓] Global billing suspension removed (billing_suspended = false)');
        console.log('  [✓] SuperAdmin and Admin logins restored');
        console.log('  [✓] All QR code redirections are active again');
        console.log('=============================================================\n');
      } else {
        // Suspend all
        await Setting.findOneAndUpdate(
          { key: 'billing_suspended' },
          { key: 'billing_suspended', value: true, description: 'Billing Suspension Flag' },
          { upsert: true }
        );

        // Invalidate all active user sessions by wiping refresh tokens
        const result = await User.updateMany({}, { $set: { refreshTokens: [] } });

        console.log('\n=============================================================');
        console.log('  CUSTOMCLIQ — ALL USERS SUSPENDED FOR BILLING');
        console.log('=============================================================');
        console.log('  [✓] System-wide billing suspension enabled in database');
        console.log(`  [✓] Logged out all users (${result.modifiedCount} accounts terminated)`);
        console.log('  [✓] All active sessions terminated immediately');
        console.log('  [✓] Any login attempt will now display:');
        console.log(`      "${BILLING_MESSAGE}"`);
        console.log('  [✓] QR code scans will show Billing Suspension screen');
        console.log('  [✓] Client business data remains 100% safe & intact');
        console.log('-------------------------------------------------------------');
        console.log('  To reactivate the service when payment is settled, run:');
        console.log('    node server/scripts/suspend.js resume');
        console.log('    or: node server/scripts/unsuspend.js');
        console.log('=============================================================\n');
      }
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('\n[Error]:', error.message);
    process.exit(1);
  }
};

run();

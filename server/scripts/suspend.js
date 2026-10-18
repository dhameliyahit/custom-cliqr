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
    // Parse command line arguments
    const args = process.argv.slice(2);
    let action = 'suspend';
    let targetEmail = null;

    const mongoUri =
      process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/customcliq';

    console.log('\n[Connecting to Database]...');
    await mongoose.connect(mongoUri);
    console.log('[Connected Successfully]\n');

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
        console.log(`  [RESTORED TO ACTIVE] ${user.email} [Role: ${user.role}] (${user.name})`);
        console.log(`  [✓] Status        : active (billingSuspended = false)`);
        console.log(`  [✓] Login and API access restored for this account`);
        console.log('=============================================================\n');
      } else {
        // Suspend specific user (regardless of role: superadmin or admin)
        const sessionsRevoked = user.refreshTokens ? user.refreshTokens.length : 0;
        user.billingSuspended = true;
        user.status = 'blocked';
        user.blockReason = BILLING_MESSAGE;
        user.refreshTokens = []; // Force logout from all active sessions
        await user.save();

        console.log('\n=============================================================');
        console.log('  CUSTOMCLIQ — USER ACCOUNT SUSPENDED FOR BILLING');
        console.log('=============================================================');
        console.log(`  [LOGGED OUT & SUSPENDED] ${user.email} [Role: ${user.role}] (${user.name})`);
        console.log(`  [✓] Revoked Sessions : ${sessionsRevoked} active session(s) terminated`);
        console.log(`  [✓] Status           : blocked (billingSuspended = true)`);
        console.log(`  [✓] SuperAdmin Block : ${user.role === 'superadmin' ? 'YES (SuperAdmin blocked)' : 'No (Partner Admin)'}`);
        console.log(`  [✓] Login attempts will now display:`);
        console.log(`      "${BILLING_MESSAGE}"`);
        console.log('-------------------------------------------------------------');
        console.log('  To reactivate this user, run:');
        console.log(`    node server/scripts/suspend.js resume --email ${user.email}`);
        console.log(`    or: node server/scripts/unsuspend.js --email ${user.email}`);
        console.log('=============================================================\n');
      }
    } else {
      // =========================================================
      // SYSTEM-WIDE SUSPENSION / RESTORATION FOR ALL USERS (INCLUDING SUPERADMIN)
      // =========================================================
      if (action === 'resume') {
        // Resume all
        await Setting.findOneAndUpdate(
          { key: 'billing_suspended' },
          { key: 'billing_suspended', value: false, description: 'Billing Suspension Flag' },
          { upsert: true }
        );

        console.log('\n=============================================================');
        console.log('  CUSTOMCLIQ — SERVICE RESTORED (ACTIVE)');
        console.log('=============================================================');

        const users = await User.find({}).select('email name role billingSuspended status');
        for (const u of users) {
          u.billingSuspended = false;
          u.status = 'active';
          u.blockReason = '';
          await u.save();
          console.log(`  [RESTORED TO ACTIVE] ${u.email} [Role: ${u.role}] (${u.name})`);
        }

        console.log('-------------------------------------------------------------');
        console.log('  [✓] Global billing suspension removed (billing_suspended = false)');
        console.log('  [✓] All SuperAdmins and Admins can log in normally');
        console.log('  [✓] All QR code redirections are active again');
        console.log('=============================================================\n');
      } else {
        // Suspend all - No matter what role: SuperAdmin, Admin, etc. All are suspended!
        await Setting.findOneAndUpdate(
          { key: 'billing_suspended' },
          { key: 'billing_suspended', value: true, description: 'Billing Suspension Flag' },
          { upsert: true }
        );

        console.log('\n=============================================================');
        console.log('  CUSTOMCLIQ — SUSPENDING ALL USERS & REVOKING SESSIONS');
        console.log('=============================================================');

        const users = await User.find({}).select('email name role refreshTokens');
        let totalSessionsTerminated = 0;

        for (const u of users) {
          const count = u.refreshTokens ? u.refreshTokens.length : 0;
          totalSessionsTerminated += count;
          u.refreshTokens = [];
          u.billingSuspended = true;
          u.status = 'blocked';
          u.blockReason = BILLING_MESSAGE;
          await u.save();

          console.log(`  [LOGGED OUT & SUSPENDED] ${u.email} [Role: ${u.role}] (${u.name}) — ${count} active session(s) revoked`);
        }

        console.log('-------------------------------------------------------------');
        console.log(`  [✓] Total Users Suspended       : ${users.length} (ALL ROLES, SuperAdmin included)`);
        console.log(`  [✓] Total Sessions Terminated   : ${totalSessionsTerminated}`);
        console.log(`  [✓] System-wide Setting Flag    : billing_suspended = true`);
        console.log(`  [✓] When any user tries login   : "${BILLING_MESSAGE}"`);
        console.log(`  [✓] QR scans will show          : Service Temporarily Paused screen`);
        console.log(`  [✓] Client business data        : 100% safe & preserved`);
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

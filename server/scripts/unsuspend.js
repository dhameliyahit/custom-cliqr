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

const run = async () => {
  try {
    const mongoUri =
      process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/customcliq';

    console.log('[Connecting to MongoDB]...');
    await mongoose.connect(mongoUri);
    console.log('[Connected] successfully.');

    // Parse target email if provided
    const args = process.argv.slice(2);
    let targetEmail = null;

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      if (arg === '--email' || arg === '-e') {
        targetEmail = args[i + 1]?.toLowerCase().trim();
        i++;
      } else if (arg.startsWith('--email=')) {
        targetEmail = arg.split('=')[1]?.toLowerCase().trim();
      } else if (arg.includes('@') && !arg.startsWith('-')) {
        targetEmail = arg.toLowerCase().trim();
      }
    }

    if (targetEmail) {
      // Restore specific user
      const user = await User.findOne({ email: targetEmail });
      if (!user) {
        console.error(`\n[Error] No user found with email: "${targetEmail}"`);
        await mongoose.disconnect();
        process.exit(1);
      }

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
      // Restore system-wide
      await Setting.findOneAndUpdate(
        { key: 'billing_suspended' },
        {
          key: 'billing_suspended',
          value: false,
          description: 'Billing Suspension Flag',
        },
        { upsert: true }
      );

      // Also reset any accounts that had billingSuspended flag
      await User.updateMany(
        { billingSuspended: true },
        { $set: { billingSuspended: false, status: 'active', blockReason: '' } }
      );

      console.log('\n=============================================================');
      console.log('  CUSTOMCLIQ — ALL SERVICES RESTORED (ACTIVE)');
      console.log('=============================================================');
      console.log('  [✓] Global billing suspension removed (value: false)');
      console.log('  [✓] All user accounts restored to active');
      console.log('  [✓] SuperAdmin and Admin logins are enabled again');
      console.log('  [✓] All QR code redirections are active again');
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

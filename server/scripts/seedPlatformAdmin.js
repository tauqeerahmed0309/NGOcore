const mongoose = require('mongoose');
const argon2 = require('argon2');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { PlatformAdmin } = require('../src/modules/platform/model');
const { AuditLog } = require('../src/modules/audit/model');

async function seedPlatformAdmin() {
  const email = process.env.ADMIN_BOOTSTRAP_EMAIL || 'admin@ngoplatform.com';
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;

  if (!password) {
    console.error('❌ Error: ADMIN_BOOTSTRAP_PASSWORD environment variable is required to seed platform admin.');
    process.exit(1);
  }

  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ngo_management';

  try {
    console.log('Connecting to database...');
    await mongoose.connect(mongoUri);

    const existingAdmin = await PlatformAdmin.findOne({ email });
    if (existingAdmin) {
      console.log(`ℹ️ Platform admin with email "${email}" already exists. Skipping creation.`);
      await mongoose.disconnect();
      return;
    }

    // Hash password securely with argon2
    const hashedPassword = await argon2.hash(password);

    // Generate 2FA secret for TOTP
    const secret = speakeasy.generateSecret({
      name: `NGO Platform Admin (${email})`,
      length: 20
    });

    const newAdmin = await PlatformAdmin.create({
      name: 'Platform Administrator',
      email,
      password: hashedPassword,
      twoFactorSecret: secret.base32,
      is2FAEnabled: true
    });

    // Write audit log
    await AuditLog.create({
      userId: newAdmin._id,
      action: 'PLATFORM_ADMIN_BOOTSTRAP',
      resource: 'PlatformAdmin',
      resourceId: newAdmin._id,
      details: { email }
    });

    console.log('\n======================================================');
    console.log('✅ Platform Admin Account Created Successfully!');
    console.log('======================================================');
    console.log(`Email:       ${email}`);
    console.log(`2FA Secret:  ${secret.base32}`);
    console.log('======================================================\n');
    console.log('Scan the QR code below with Google Authenticator or any TOTP app:\n');

    try {
      const qrTerminal = await qrcode.toString(secret.otpauth_url, { type: 'terminal', small: true });
      console.log(qrTerminal);
    } catch (qrErr) {
      console.log(`(Could not render terminal QR: ${qrErr.message})`);
    }

    console.log('\nTOTP Auth URL:', secret.otpauth_url);
    console.log('======================================================\n');

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error seeding platform admin:', error);
    process.exit(1);
  }
}

seedPlatformAdmin();

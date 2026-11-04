const mongoose = require('mongoose');
const config = require('../config/env');
const User = require('../models/User');
const Ngo = require('../models/Ngo');
const { hashPassword, validatePasswordStrength } = require('../utils/passwordHelper');
const logger = require('../utils/logger');

const resetAdminPassword = async () => {
  try {
    const passwordValidation = validatePasswordStrength(config.ADMIN_PASSWORD);
    if (!passwordValidation.isValid) {
      throw new Error(`Configured admin password is invalid: ${passwordValidation.message}`);
    }

    await mongoose.connect(config.MONGODB_URI);

    const admin = await User.findOne({ email: config.ADMIN_EMAIL.toLowerCase().trim() });
    if (!admin) {
      throw new Error('Configured admin account was not found. Run npm run seed:admin first.');
    }
    if (admin.role !== 'admin') {
      throw new Error('Configured admin email belongs to a non-admin account; password was not changed.');
    }
    if (!admin.isActive) {
      throw new Error('Configured admin account is inactive; password was not changed.');
    }

    let ngo = admin.ngoId ? await Ngo.findById(admin.ngoId) : null;
    if (!ngo && !admin.ngoId) {
      ngo = await Ngo.findOneAndUpdate(
        { name: 'Legacy NGO (Migrated)' },
        {
          $setOnInsert: {
            status: 'approved',
            contactEmail: config.ADMIN_EMAIL.toLowerCase().trim()
          }
        },
        { upsert: true, returnDocument: 'after' }
      );
      admin.ngoId = ngo._id;
    }
    if (!ngo) {
      throw new Error('Admin organization is missing; password was not changed.');
    }
    if (ngo.status !== 'approved') {
      throw new Error(`Admin organization is ${ngo.status}; password was not changed.`);
    }

    admin.password = await hashPassword(config.ADMIN_PASSWORD);
    await admin.save();
    logger.info('Configured admin password reset successfully.');
  } catch (error) {
    logger.error('Admin password reset failed:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

resetAdminPassword();

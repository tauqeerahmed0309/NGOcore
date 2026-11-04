const mongoose = require('mongoose');
const config = require('../config/env');
const User = require('../models/User');
const Ngo = require('../models/Ngo');
const { hashPassword, validatePasswordStrength } = require('../utils/passwordHelper');
const logger = require('../utils/logger');

const seedAdmin = async () => {
  try {
    if (!config.ADMIN_EMAIL || !config.ADMIN_PASSWORD) {
      throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD before running the administrator seed script.');
    }
    logger.info('Connecting to MongoDB for seeding...');
    await mongoose.connect(config.MONGODB_URI);
    logger.info('Connected to MongoDB.');

    const legacyNgo = await Ngo.findOneAndUpdate(
      { name: 'Legacy NGO (Migrated)' },
      {
        $setOnInsert: {
          status: 'approved',
          contactEmail: config.ADMIN_EMAIL.toLowerCase().trim()
        }
      },
      { upsert: true, returnDocument: 'after' }
    );

    // 1. Seed Admin
    const adminEmail = config.ADMIN_EMAIL.toLowerCase().trim();
    const existingAdmin = await User.findOne({ email: adminEmail });

    if (existingAdmin) {
      logger.info(`Admin user already exists with email: ${adminEmail}`);
    } else {
      const passwordValidation = validatePasswordStrength(config.ADMIN_PASSWORD);
      if (!passwordValidation.isValid) {
        throw new Error(`Admin password does not meet security requirements: ${passwordValidation.message}`);
      }

      const hashedPassword = await hashPassword(config.ADMIN_PASSWORD);
      await User.create({
        ngoId: legacyNgo._id,
        email: adminEmail,
        password: hashedPassword,
        role: 'admin',
        firstName: 'System',
        lastName: 'Administrator',
        isActive: true
      });

      logger.info(`First Admin created successfully with email: ${adminEmail}`);
      // Security rule: Never print admin password in logs
    }
    await User.updateOne(
      { email: adminEmail, ngoId: { $exists: false } },
      { $set: { ngoId: legacyNgo._id } }
    );

    logger.info('Database seeding completed successfully.');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    logger.error('Error during database seeding:', error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
};

seedAdmin();

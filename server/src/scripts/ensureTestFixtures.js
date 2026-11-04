const mongoose = require('mongoose');
const config = require('../config/env');
const User = require('../models/User');
const Ngo = require('../models/Ngo');
const { hashPassword } = require('../utils/passwordHelper');

const ensureTestFixtures = async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(config.MONGODB_URI);
  }

  const legacyNgo = await Ngo.findOneAndUpdate(
    { name: 'Legacy NGO (Migrated)' },
    {
      $set: { status: 'approved' },
      $setOnInsert: { contactEmail: config.ADMIN_EMAIL.toLowerCase().trim() }
    },
    { upsert: true, returnDocument: 'after' }
  );

  const fixtureUsers = [
    {
      email: config.ADMIN_EMAIL.toLowerCase().trim(),
      password: config.ADMIN_PASSWORD,
      role: 'admin',
      firstName: 'System',
      lastName: 'Administrator',
      isActive: true
    },
    {
      email: 'staff@ngo.org',
      password: 'StaffPassword123!',
      role: 'staff',
      firstName: 'Staff',
      lastName: 'Member',
      isActive: true
    },
    {
      email: 'volunteer@ngo.org',
      password: 'VolunteerPass123!',
      role: 'volunteer',
      firstName: 'Volunteer',
      lastName: 'Member',
      isActive: true
    },
    {
      email: 'student@ngo.org',
      password: 'StudentPass123!',
      role: 'student',
      firstName: 'Student',
      lastName: 'Member',
      isActive: true
    },
    {
      email: 'inactive@ngo.org',
      password: 'InactivePass123!',
      role: 'staff',
      firstName: 'Inactive',
      lastName: 'Member',
      isActive: false
    }
  ];

  for (const fixture of fixtureUsers) {
    const hashedPassword = await hashPassword(fixture.password);
    await User.findOneAndUpdate(
      { email: fixture.email },
      {
        $set: {
          ngoId: legacyNgo._id,
          password: hashedPassword,
          role: fixture.role,
          firstName: fixture.firstName,
          lastName: fixture.lastName,
          isActive: fixture.isActive,
          isEmailVerified: true,
          isPasswordSetupRequired: false
        }
      },
      { upsert: true }
    );
  }
};

module.exports = { ensureTestFixtures };

if (require.main === module) {
  ensureTestFixtures()
    .then(async () => {
      console.log('Test fixtures ensured successfully.');
      await mongoose.disconnect();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('Error ensuring test fixtures:', err);
      await mongoose.disconnect();
      process.exit(1);
    });
}

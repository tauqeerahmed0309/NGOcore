const mongoose = require('mongoose');
const User = require('../models/User');
const Ngo = require('../models/Ngo');
const Student = require('../models/Student');
const Program = require('../models/Program');
const ProgramEnrollment = require('../models/ProgramEnrollment');
const AttendanceSession = require('../models/AttendanceSession');
const AuditLog = require('../models/AuditLog');
const { hashPassword } = require('../utils/passwordHelper');

async function seedEmpty() {
  await mongoose.connect('mongodb://127.0.0.1:27017/ngo_records_db');

  let emptyNgo = await Ngo.findOne({ name: 'Empty Test NGO' });
  if (!emptyNgo) {
    emptyNgo = await Ngo.create({
      name: 'Empty Test NGO',
      registrationNumber: 'REG-EMPTY-2026',
      organizationType: 'Testing',
      status: 'approved',
      isActive: true
    });
  }

  const email = 'empty.staff@emptyngo.org';
  let staff = await User.findOne({ email });
  if (!staff) {
    staff = await User.create({
      ngoId: emptyNgo._id,
      email,
      password: await hashPassword('EmptyDemo2026!'),
      role: 'staff',
      firstName: 'Empty',
      lastName: 'User',
      isActive: true
    });
  }

  // Ensure 0 records exist
  await Student.deleteMany({ ngoId: emptyNgo._id });
  await Program.deleteMany({ ngoId: emptyNgo._id });
  await ProgramEnrollment.deleteMany({ ngoId: emptyNgo._id });
  await AttendanceSession.deleteMany({ ngoId: emptyNgo._id });
  await AuditLog.deleteMany({ ngoId: emptyNgo._id });

  console.log('✅ Empty NGO seeded with 0 records!');
  process.exit(0);
}

seedEmpty().catch(err => {
  console.error(err);
  process.exit(1);
});


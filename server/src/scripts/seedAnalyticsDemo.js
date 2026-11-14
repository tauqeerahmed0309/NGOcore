const mongoose = require('mongoose');
const config = require('../config/env');
const User = require('../models/User');
const Ngo = require('../models/Ngo');
const Student = require('../models/Student');
const Program = require('../models/Program');
const ProgramEnrollment = require('../models/ProgramEnrollment');
const AttendanceSession = require('../models/AttendanceSession');
const AuditLog = require('../models/AuditLog');
const { hashPassword } = require('../utils/passwordHelper');

async function seed() {
  await mongoose.connect('mongodb://127.0.0.1:27017/ngo_records_db');

  let ngo = await Ngo.findOne({ name: 'Shine Foundation NGO' });
  if (!ngo) {
    ngo = await Ngo.create({
      name: 'Shine Foundation NGO',
      registrationNumber: 'REG-SHINE-2026',
      organizationType: 'Education & Community Upliftment',
      status: 'approved',
      isActive: true
    });
  }

  const staffEmail = 'analytics.staff@shine.org';
  let staff = await User.findOne({ email: staffEmail });
  if (!staff) {
    staff = await User.create({
      ngoId: ngo._id,
      email: staffEmail,
      password: await hashPassword('ShineDemo2026!'),
      role: 'staff',
      firstName: 'Priya',
      lastName: 'Nair',
      isActive: true
    });
  }

  // Clear existing demo records for this NGO to ensure clean predictable counts
  await Student.deleteMany({ ngoId: ngo._id });
  await Program.deleteMany({ ngoId: ngo._id });
  await ProgramEnrollment.deleteMany({ ngoId: ngo._id });
  await AttendanceSession.deleteMany({ ngoId: ngo._id });
  await AuditLog.deleteMany({ ngoId: ngo._id });

  // 1. Seed Beneficiaries (with realistic demographic cohorts, gender distribution, and states)
  const students = [
    { firstName: 'Aarav', lastName: 'Patel', gender: 'male', dateOfBirth: new Date('2022-04-10'), state: 'Karnataka', status: 'active' },
    { firstName: 'Diya', lastName: 'Sharma', gender: 'female', dateOfBirth: new Date('2018-09-15'), state: 'Karnataka', status: 'active' },
    { firstName: 'Kabir', lastName: 'Mehta', gender: 'male', dateOfBirth: new Date('2015-02-20'), state: 'Maharashtra', status: 'active' },
    { firstName: 'Ananya', lastName: 'Deshmukh', gender: 'female', dateOfBirth: new Date('2010-11-05'), state: 'Maharashtra', status: 'active' },
    { firstName: 'Rohan', lastName: 'Verma', gender: 'male', dateOfBirth: new Date('2006-07-12'), state: 'Delhi', status: 'active' },
    { firstName: 'Ishaan', lastName: 'Gupta', gender: 'male', dateOfBirth: new Date('2003-01-25'), state: 'Delhi', status: 'active' },
    { firstName: 'Meera', lastName: 'Iyer', gender: 'female', dateOfBirth: new Date('1998-06-30'), state: 'Tamil Nadu', status: 'active' },
    { firstName: 'Tanvi', lastName: 'Joshi', gender: 'female', dateOfBirth: new Date('2008-03-14'), state: 'Gujarat', status: 'graduated' },
    { firstName: 'Arjun', lastName: 'Rao', gender: 'male', dateOfBirth: new Date('2005-08-22'), state: 'Telangana', status: 'graduated' },
    { firstName: 'Sneha', lastName: 'Reddy', gender: 'female', dateOfBirth: new Date('2012-10-18'), state: 'Andhra Pradesh', status: 'transferred' },
    { firstName: 'Dev', lastName: 'Shah', gender: 'other', dateOfBirth: new Date('2014-12-05'), state: 'Gujarat', status: 'inactive' },
    { firstName: 'Pooja', lastName: 'Kulkarni', gender: 'prefer_not_to_say', dateOfBirth: null, state: 'Maharashtra', status: 'active' }, // Missing DOB
    { firstName: 'Vikram', lastName: 'Singh', gender: 'male', dateOfBirth: new Date('2032-01-01'), state: 'Rajasthan', status: 'active' } // Future/Invalid DOB
  ];

  const createdStudents = [];
  for (let i = 0; i < students.length; i++) {
    const s = await Student.create({
      ...students[i],
      ngoId: ngo._id,
      registrationNumber: `SHINE-${String(i + 1).padStart(3, '0')}`,
      createdAt: new Date(Date.now() - (i % 6) * 30 * 24 * 3600 * 1000)
    });
    createdStudents.push(s);
  }

  // 2. Seed Programs
  const prog1 = await Program.create({
    ngoId: ngo._id,
    code: 'SHINE-LIT-01',
    name: 'Digital Literacy & Coding Basics',
    type: 'class',
    capacity: 25,
    status: 'active'
  });

  const prog2 = await Program.create({
    ngoId: ngo._id,
    code: 'SHINE-ENG-02',
    name: 'Spoken English & Communication',
    type: 'workshop',
    capacity: 20,
    status: 'active'
  });

  const prog3 = await Program.create({
    ngoId: ngo._id,
    code: 'SHINE-HLT-03',
    name: 'Community Health Awareness',
    type: 'seminar',
    capacity: null, // Unlimited
    status: 'active'
  });

  const prog4 = await Program.create({
    ngoId: ngo._id,
    code: 'SHINE-ART-04',
    name: 'Creative Arts & Crafts',
    type: 'workshop',
    capacity: 15,
    status: 'completed'
  });

  const prog5 = await Program.create({
    ngoId: ngo._id,
    code: 'SHINE-ROB-05',
    name: 'Robotics Summer Camp',
    type: 'class',
    capacity: 30,
    status: 'draft'
  });

  // 3. Seed Program Enrollments
  // prog1: 18 enrolled out of 25 capacity
  // prog2: 12 enrolled out of 20 capacity
  // prog3: 15 enrolled (unlimited)
  for (let i = 0; i < 8; i++) {
    await ProgramEnrollment.create({
      ngoId: ngo._id,
      programId: prog1._id,
      studentId: createdStudents[i]._id,
      status: 'enrolled',
      enrolledAt: new Date(Date.now() - (i % 4) * 20 * 24 * 3600 * 1000)
    });
  }

  for (let i = 4; i < 9; i++) {
    await ProgramEnrollment.create({
      ngoId: ngo._id,
      programId: prog2._id,
      studentId: createdStudents[i]._id,
      status: 'enrolled',
      enrolledAt: new Date(Date.now() - (i % 3) * 15 * 24 * 3600 * 1000)
    });
  }

  for (let i = 0; i < 6; i++) {
    await ProgramEnrollment.create({
      ngoId: ngo._id,
      programId: prog3._id,
      studentId: createdStudents[i]._id,
      status: 'enrolled',
      enrolledAt: new Date(Date.now() - (i % 5) * 10 * 24 * 3600 * 1000)
    });
  }

  // 4. Seed Attendance Sessions
  await AttendanceSession.create({
    ngoId: ngo._id,
    programId: prog1._id,
    sessionDate: new Date(Date.now() - 2 * 24 * 3600 * 1000),
    recordedBy: staff._id,
    entries: [
      { studentId: createdStudents[0]._id, status: 'present' },
      { studentId: createdStudents[1]._id, status: 'present' },
      { studentId: createdStudents[2]._id, status: 'present' },
      { studentId: createdStudents[3]._id, status: 'present' },
      { studentId: createdStudents[4]._id, status: 'absent' },
      { studentId: createdStudents[5]._id, status: 'excused' }
    ]
  });

  await AttendanceSession.create({
    ngoId: ngo._id,
    programId: prog2._id,
    sessionDate: new Date(Date.now() - 5 * 24 * 3600 * 1000),
    recordedBy: staff._id,
    entries: [
      { studentId: createdStudents[4]._id, status: 'present' },
      { studentId: createdStudents[5]._id, status: 'present' },
      { studentId: createdStudents[6]._id, status: 'present' },
      { studentId: createdStudents[7]._id, status: 'absent' }
    ]
  });

  // 5. Seed Audit Logs (Strictly Zero PII)
  await AuditLog.create([
    {
      ngoId: ngo._id,
      actorId: staff._id,
      action: 'create',
      entityType: 'student',
      entityId: String(createdStudents[0]._id),
      createdAt: new Date(Date.now() - 30 * 60 * 1000)
    },
    {
      ngoId: ngo._id,
      actorId: staff._id,
      action: 'update',
      entityType: 'program',
      entityId: String(prog1._id),
      createdAt: new Date(Date.now() - 2 * 3600 * 1000)
    },
    {
      ngoId: ngo._id,
      actorId: staff._id,
      action: 'create',
      entityType: 'attendance_session',
      entityId: String(prog1._id),
      createdAt: new Date(Date.now() - 24 * 3600 * 1000)
    },
    {
      ngoId: ngo._id,
      actorId: staff._id,
      action: 'create',
      entityType: 'report_export',
      entityId: 'beneficiaries_summary',
      createdAt: new Date(Date.now() - 48 * 3600 * 1000)
    }
  ]);

  console.log('✅ Demo data seeded successfully!');
  console.log('Credentials:');
  console.log(`Email: ${staffEmail}`);
  console.log('Password: ShineDemo2026!');
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});

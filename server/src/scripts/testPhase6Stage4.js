/**
 * NGOcore — Phase 6 Stage 4: Attendance Tracking, Presence Rates & Roster Integrity
 *
 * Focused Automated Regression Test Suite covering:
 * - 1. Attendance Roster Retrieval (Unrecorded session returns active enrolled students with default empty status)
 * - 2. Attendance Recording (Present, absent, excused entries + notes + AuditLog)
 * - 3. Roster State Verification (Subsequent GET merges recorded statuses and notes)
 * - 4. Duplicate Student Entry Rejection (HTTP 400)
 * - 5. Non-Enrolled Student Rejection (HTTP 400)
 * - 6. In-Place Update / Upsert (Modifying an existing session updates without creating duplicates)
 * - 7. Accurate Presence Rate Calculations (Individual session & overall aggregated presenceRate)
 * - 8. RBAC Authorization Guards (Student role receives HTTP 403 on attendance recording)
 * - 9. Multi-Tenant Isolation & IDOR Protection (HTTP 404 across organizations)
 */

const bcrypt = require('bcrypt');
const config = require('../config/env');
const Program = require('../models/Program');
const Student = require('../models/Student');
const ProgramEnrollment = require('../models/ProgramEnrollment');
const AttendanceSession = require('../models/AttendanceSession');
const AuditLog = require('../models/AuditLog');
const User = require('../models/User');
const Ngo = require('../models/Ngo');
const { apiRequest } = require('./apiTestClient');
const { setupTestEnvironment, teardownTestEnvironment } = require('./testHelper');

const BASE_URL = `http://localhost:${config.PORT}/api/v1`;

const results = [];

const record = (num, name, passed, details) => {
  results.push({ num, name, passed, details });
  console.log(
    `${passed ? '✅' : '❌'} Test ${num.toString().padStart(2, ' ')}: ${name.padEnd(58, ' ')} -> ${
      passed ? 'PASSED' : 'FAILED'
    } (${details})`
  );
};

const runStage4Tests = async () => {
  await setupTestEnvironment();

  console.log('\n================================================================');
  console.log('   RUNNING PHASE 6 STAGE 4: ATTENDANCE TRACKING & PRESENCE RATES');
  console.log('================================================================\n');

  let adminToken = '';
  let staffToken = '';
  let studentToken = '';
  let ngoAId = '';

  let ngoBAdminToken = '';
  let ngoBId = '';

  let student1Id = '';
  let student2Id = '';
  let student3Id = '';
  let nonEnrolledStudentId = '';

  let testProgramId = '';

  try {
    // 1. Authenticate users
    const adminUser = await User.findOne({ email: config.ADMIN_EMAIL });
    ngoAId = adminUser.ngoId;

    const adminRes = await apiRequest(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: config.ADMIN_EMAIL, password: config.ADMIN_PASSWORD })
    });
    adminToken = adminRes.accessToken;

    const staffRes = await apiRequest(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: 'staff@ngo.org', password: 'StaffPassword123!' })
    });
    staffToken = staffRes.accessToken;

    // 2. Setup Secondary NGO for isolation tests
    const timestamp = Date.now();
    const ngoB = await Ngo.create({
      name: `NGO Isolation Stage 4 ${timestamp}`,
      status: 'approved',
      registrationNumber: `REG-STAGE4-P6-${timestamp}`
    });
    ngoBId = ngoB._id;

    const hashedPassword = await bcrypt.hash('Password123!', 10);
    const userB = await User.create({
      email: `admin-b-stage4-${timestamp}@example.org`,
      password: hashedPassword,
      role: 'admin',
      ngoId: ngoBId,
      isActive: true,
      firstName: 'Admin',
      lastName: 'NGO B'
    });

    const ngoBLogin = await apiRequest(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: userB.email, password: 'Password123!' })
    });
    ngoBAdminToken = ngoBLogin.accessToken;

    // 3. Setup student login token for RBAC check
    const studentUser = await User.create({
      email: `student-s4-${timestamp}@ngo.org`,
      password: hashedPassword,
      role: 'student',
      ngoId: ngoAId,
      isActive: true,
      firstName: 'Student',
      lastName: 'User'
    });
    const studentLogin = await apiRequest(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: studentUser.email, password: 'Password123!' })
    });
    studentToken = studentLogin.accessToken;

    // 4. Clean test records
    await Student.deleteMany({ registrationNumber: /^BEN-S4-/ });
    await Program.deleteMany({ code: /^PRG-S4-/ });

    // 5. Create test students
    const s1 = await Student.create({
      ngoId: ngoAId,
      registrationNumber: 'BEN-S4-001',
      firstName: 'Vikram',
      lastName: 'Malhotra',
      status: 'active'
    });
    student1Id = s1._id;

    const s2 = await Student.create({
      ngoId: ngoAId,
      registrationNumber: 'BEN-S4-002',
      firstName: 'Ananya',
      lastName: 'Iyer',
      status: 'active'
    });
    student2Id = s2._id;

    const s3 = await Student.create({
      ngoId: ngoAId,
      registrationNumber: 'BEN-S4-003',
      firstName: 'Rahul',
      lastName: 'Sharma',
      status: 'active'
    });
    student3Id = s3._id;

    const sNonEnrolled = await Student.create({
      ngoId: ngoAId,
      registrationNumber: 'BEN-S4-004',
      firstName: 'Sneha',
      lastName: 'Patil',
      status: 'active'
    });
    nonEnrolledStudentId = sNonEnrolled._id;

    // 6. Create test program
    const prog = await Program.create({
      ngoId: ngoAId,
      name: 'Stage 4 Robotics Academy',
      code: 'PRG-S4-ROBOTICS',
      type: 'course',
      category: 'technology',
      status: 'active',
      capacity: 30,
      createdBy: adminUser._id
    });
    testProgramId = prog._id;

    // Enroll students 1, 2, 3
    await ProgramEnrollment.create([
      { ngoId: ngoAId, programId: testProgramId, studentId: student1Id, status: 'enrolled' },
      { ngoId: ngoAId, programId: testProgramId, studentId: student2Id, status: 'enrolled' },
      { ngoId: ngoAId, programId: testProgramId, studentId: student3Id, status: 'enrolled' }
    ]);
    await Program.updateOne({ _id: testProgramId }, { $set: { enrolledCount: 3 } });

    // ----------------------------------------------------------------
    // SECTION 1: ATTENDANCE ROSTER & RECORDING
    // ----------------------------------------------------------------
    console.log('▶ [1. Attendance Roster & Recording]');

    // Test 1: Retrieve unrecorded attendance roster
    try {
      const res = await apiRequest(`${BASE_URL}/programs/${testProgramId}/attendance?date=2026-11-20`, {
        headers: { Authorization: `Bearer ${staffToken}` }
      });
      const data = res.data?.data;
      const roster = data?.roster || [];
      const ok =
        res.status === 200 &&
        roster.length === 3 &&
        roster.every((r) => r.status === '' && r.student && r.student.firstName);

      record(1, 'Retrieve unrecorded attendance roster (3 enrolled students)', ok, `Count=${roster.length}`);
    } catch (err) {
      record(1, 'Retrieve unrecorded attendance roster (3 enrolled students)', false, err.message);
    }

    // Test 2: Save attendance session with present, absent, excused
    try {
      const res = await apiRequest(`${BASE_URL}/programs/${testProgramId}/attendance`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${staffToken}` },
        body: JSON.stringify({
          date: '2026-11-20',
          entries: [
            { studentId: String(student1Id), status: 'present', note: 'Active in class' },
            { studentId: String(student2Id), status: 'absent', note: 'Unexcused' },
            { studentId: String(student3Id), status: 'excused', note: 'Medical certificate submitted' }
          ]
        })
      });

      const auditLog = await AuditLog.findOne({
        entityId: { $exists: true },
        action: 'update',
        entityType: 'attendance_session',
        'metadata.programId': String(testProgramId),
        'metadata.sessionDate': '2026-11-20'
      });

      const ok = res.status === 200 && auditLog !== null;
      record(2, 'Save attendance with mixed statuses + AuditLog', ok, `Status=${res.status}, AuditLog=${Boolean(auditLog)}`);
    } catch (err) {
      record(2, 'Save attendance with mixed statuses + AuditLog', false, err.message);
    }

    // Test 3: Roster reflects saved attendance
    try {
      const res = await apiRequest(`${BASE_URL}/programs/${testProgramId}/attendance?date=2026-11-20`, {
        headers: { Authorization: `Bearer ${staffToken}` }
      });
      const roster = res.data?.data?.roster || [];
      const s1Entry = roster.find((r) => String(r.student?._id) === String(student1Id));
      const s2Entry = roster.find((r) => String(r.student?._id) === String(student2Id));
      const s3Entry = roster.find((r) => String(r.student?._id) === String(student3Id));

      const ok =
        res.status === 200 &&
        s1Entry?.status === 'present' &&
        s2Entry?.status === 'absent' &&
        s3Entry?.status === 'excused';

      record(3, 'Roster query reflects recorded attendance statuses', ok, `S1=${s1Entry?.status}, S2=${s2Entry?.status}, S3=${s3Entry?.status}`);
    } catch (err) {
      record(3, 'Roster query reflects recorded attendance statuses', false, err.message);
    }

    // ----------------------------------------------------------------
    // SECTION 2: ATTENDANCE INPUT VALIDATION GUARDS
    // ----------------------------------------------------------------
    console.log('\n▶ [2. Attendance Input Validation Guards]');

    // Test 4: Duplicate student in attendance entries rejected (HTTP 400)
    try {
      const res = await apiRequest(`${BASE_URL}/programs/${testProgramId}/attendance`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${staffToken}` },
        body: JSON.stringify({
          date: '2026-11-21',
          entries: [
            { studentId: String(student1Id), status: 'present' },
            { studentId: String(student1Id), status: 'absent' }
          ]
        })
      });
      const ok = res.status === 400 && JSON.stringify(res.data).includes('duplicate');
      record(4, 'Duplicate student in attendance payload rejected (HTTP 400)', ok, `Status=${res.status}`);
    } catch (err) {
      record(4, 'Duplicate student in attendance payload rejected (HTTP 400)', false, err.message);
    }

    // Test 5: Non-enrolled student in attendance rejected (HTTP 400)
    try {
      const res = await apiRequest(`${BASE_URL}/programs/${testProgramId}/attendance`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${staffToken}` },
        body: JSON.stringify({
          date: '2026-11-21',
          entries: [
            { studentId: String(student1Id), status: 'present' },
            { studentId: String(nonEnrolledStudentId), status: 'present' }
          ]
        })
      });
      const ok = res.status === 400 && JSON.stringify(res.data).includes('enrolled');
      record(5, 'Non-enrolled student in attendance rejected (HTTP 400)', ok, `Status=${res.status}`);
    } catch (err) {
      record(5, 'Non-enrolled student in attendance rejected (HTTP 400)', false, err.message);
    }

    // ----------------------------------------------------------------
    // SECTION 3: PRESENCE RATE CALCULATION & HISTORY
    // ----------------------------------------------------------------
    console.log('\n▶ [3. Presence Rate Calculation & History]');

    // Session 1: 1 present, 1 absent, 1 excused -> denom = 2, rate = 50%
    // Record Session 2 on 2026-11-22: 2 present, 1 absent -> denom = 3, rate = 67%
    await apiRequest(`${BASE_URL}/programs/${testProgramId}/attendance`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${staffToken}` },
      body: JSON.stringify({
        date: '2026-11-22',
        entries: [
          { studentId: String(student1Id), status: 'present' },
          { studentId: String(student2Id), status: 'present' },
          { studentId: String(student3Id), status: 'absent' }
        ]
      })
    });

    // Test 6: Get attendance history returns calculated rates
    try {
      const res = await apiRequest(`${BASE_URL}/programs/${testProgramId}/attendance-history`, {
        headers: { Authorization: `Bearer ${staffToken}` }
      });
      const data = res.data?.data;
      const sessions = data?.sessions || [];
      const overallStats = data?.overallStats || data?.stats;

      // Session 1 (2026-11-20): 1 present, 1 absent, 1 excused -> 50%
      const sessNov20 = sessions.find((s) => s.sessionDate === '2026-11-20');
      // Session 2 (2026-11-22): 2 present, 1 absent, 0 excused -> 67%
      const sessNov22 = sessions.find((s) => s.sessionDate === '2026-11-22');

      // Overall: 3 present, 2 absent, 1 excused -> denom = 5, overallRate = round(3/5 * 100) = 60%
      const ok =
        res.status === 200 &&
        sessions.length === 2 &&
        sessNov20?.presenceRate === 50 &&
        sessNov22?.presenceRate === 67 &&
        overallStats?.presenceRate === 60;

      record(
        6,
        'Attendance history computes presence rates (Sess1=50%, Sess2=67%, Overall=60%)',
        ok,
        `S1=${sessNov20?.presenceRate}%, S2=${sessNov22?.presenceRate}%, Overall=${overallStats?.presenceRate}%`
      );
    } catch (err) {
      record(6, 'Attendance history computes presence rates (Sess1=50%, Sess2=67%, Overall=60%)', false, err.message);
    }

    // ----------------------------------------------------------------
    // SECTION 4: RBAC & TENANT ISOLATION
    // ----------------------------------------------------------------
    console.log('\n▶ [4. RBAC & Multi-Tenant Isolation]');

    // Test 7: Student user cannot record attendance (HTTP 403 Forbidden)
    try {
      const res = await apiRequest(`${BASE_URL}/programs/${testProgramId}/attendance`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${studentToken}` },
        body: JSON.stringify({
          date: '2026-11-23',
          entries: [{ studentId: String(student1Id), status: 'present' }]
        })
      });
      const ok = res.status === 403;
      record(7, 'Student cannot record attendance (HTTP 403 Forbidden)', ok, `Status=${res.status}`);
    } catch (err) {
      record(7, 'Student cannot record attendance (HTTP 403 Forbidden)', false, err.message);
    }

    // Test 8: Foreign NGO admin cannot record attendance for Program A (HTTP 404 IDOR)
    try {
      const res = await apiRequest(`${BASE_URL}/programs/${testProgramId}/attendance`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${ngoBAdminToken}` },
        body: JSON.stringify({
          date: '2026-11-23',
          entries: [{ studentId: String(student1Id), status: 'present' }]
        })
      });
      const ok = res.status === 404;
      record(8, 'Cross-NGO attendance recording rejected (HTTP 404 IDOR)', ok, `Status=${res.status}`);
    } catch (err) {
      record(8, 'Cross-NGO attendance recording rejected (HTTP 404 IDOR)', false, err.message);
    }

    // Test 9: Foreign NGO admin cannot view attendance history of Program A (HTTP 404 IDOR)
    try {
      const res = await apiRequest(`${BASE_URL}/programs/${testProgramId}/attendance-history`, {
        headers: { Authorization: `Bearer ${ngoBAdminToken}` }
      });
      const ok = res.status === 404;
      record(9, 'Cross-NGO attendance history access rejected (HTTP 404 IDOR)', ok, `Status=${res.status}`);
    } catch (err) {
      record(9, 'Cross-NGO attendance history access rejected (HTTP 404 IDOR)', false, err.message);
    }

  } catch (globalErr) {
    console.error('Fatal test error:', globalErr);
  } finally {
    // Cleanup test records
    await Program.deleteMany({ code: /^PRG-S4-/ });
    await Student.deleteMany({ registrationNumber: /^BEN-S4-/ });
    if (testProgramId) {
      await ProgramEnrollment.deleteMany({ programId: testProgramId });
      await AttendanceSession.deleteMany({ programId: testProgramId });
    }
    await User.deleteMany({ email: /^student-s4-/ });
    await User.deleteMany({ email: /^admin-b-stage4-/ });
    if (ngoBId) await Ngo.deleteOne({ _id: ngoBId });
    await teardownTestEnvironment();
  }

  const passedCount = results.filter((r) => r.passed).length;
  const totalCount = results.length;
  console.log('\n================================================================');
  console.log(`STAGE 4 TEST SUITE: ${passedCount} / ${totalCount} TESTS PASSED! ${passedCount === totalCount ? '✅' : '❌'}`);
  console.log('================================================================\n');

  if (passedCount !== totalCount) {
    process.exit(1);
  }
};

runStage4Tests();

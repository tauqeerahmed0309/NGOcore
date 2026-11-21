/**
 * NGOcore — Phase 6 Stage 1: Program Lifecycle, Closure Rules & Safe Deletion Guard
 *
 * Focused Automated Regression Test Suite covering:
 * - 1. Program Creation & Validation (Code uniqueness, date range, coordinator check)
 * - 2. Enriched Program Retrieval & Capacity Calculations
 * - 3. Capacity Reduction Guard (Cannot reduce below active enrollments)
 * - 4. Program Closure Lifecycle Rules (Completed -> conclude active as completed with timestamp, Cancelled -> withdraw with reason, Zero deletions)
 * - 5. Safe Deletion Guard (Rejects deletion if enrollments, attendance, or audit history exist; allows clean deletions)
 * - 6. Multi-Tenant Isolation & IDOR Protection
 */

const bcrypt = require('bcrypt');
const config = require('../config/env');
const Student = require('../models/Student');
const Program = require('../models/Program');
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
    `${passed ? '✅' : '❌'} Test ${num.toString().padStart(2, ' ')}: ${name.padEnd(56, ' ')} -> ${
      passed ? 'PASSED' : 'FAILED'
    } (${details})`
  );
};

const runStage1Tests = async () => {
  await setupTestEnvironment();

  console.log('\n================================================================');
  console.log('   RUNNING PHASE 6 STAGE 1: PROGRAM LIFECYCLE & SAFE DELETION   ');
  console.log('================================================================\n');

  let adminToken = '';
  let staffToken = '';
  let ngoAId = '';
  let staffUserId = '';

  let ngoBAdminToken = '';
  let ngoBId = '';

  let testStudentId = '';
  let testStudent2Id = '';
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

    const staffUser = await User.findOne({ email: 'staff@ngo.org' });
    staffUserId = staffUser._id;
    const staffRes = await apiRequest(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: 'staff@ngo.org', password: 'StaffPassword123!' })
    });
    staffToken = staffRes.accessToken;

    // 2. Setup Secondary NGO for isolation tests
    const timestamp = Date.now();
    const ngoB = await Ngo.create({
      name: `NGO Isolation Stage 1 ${timestamp}`,
      status: 'approved',
      registrationNumber: `REG-STAGE1-P6-${timestamp}`
    });
    ngoBId = ngoB._id;

    const hashedPassword = await bcrypt.hash('Password123!', 10);
    const userB = await User.create({
      email: `admin-b-stage1-${timestamp}@example.org`,
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

    // 3. Clean test records
    await Student.deleteMany({ registrationNumber: /^BEN-S1-/ });
    await Program.deleteMany({ code: /^PRG-S1-/ });

    const studentDoc = await Student.create({
      ngoId: ngoAId,
      registrationNumber: 'BEN-S1-001',
      firstName: 'Rohan',
      lastName: 'Gupta',
      gender: 'male',
      status: 'active'
    });
    testStudentId = studentDoc._id;

    const studentDoc2 = await Student.create({
      ngoId: ngoAId,
      registrationNumber: 'BEN-S1-002',
      firstName: 'Pooja',
      lastName: 'Verma',
      gender: 'female',
      status: 'active'
    });
    testStudent2Id = studentDoc2._id;

    // ----------------------------------------------------------------
    // SECTION 1: PROGRAM CREATION & INPUT VALIDATION
    // ----------------------------------------------------------------
    console.log('▶ [1. Program Creation & Input Validation]');

    // Test 1: Admin creates program with valid full specification
    try {
      const res = await apiRequest(`${BASE_URL}/programs`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          name: 'Advanced Web Development Bootcamp',
          code: 'PRG-S1-BOOTCAMP',
          type: 'course',
          category: 'skill_development',
          description: 'Intensive front-end and back-end training',
          startDate: '2026-12-01',
          endDate: '2027-02-28',
          coordinator: String(staffUserId),
          capacity: 15,
          location: 'Lab 101'
        })
      });
      testProgramId = res.data?.data?.program?._id;
      const ok = res.status === 201 && testProgramId && res.data?.data?.program?.code === 'PRG-S1-BOOTCAMP';
      record(1, 'Admin creates program with valid full specification', ok, `Status=${res.status}, ID=${testProgramId}`);
    } catch (err) {
      record(1, 'Admin creates program with valid full specification', false, err.message);
    }

    // Test 2: Duplicate program code rejected (409)
    try {
      const res = await apiRequest(`${BASE_URL}/programs`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          name: 'Duplicate Bootcamp',
          code: 'PRG-S1-BOOTCAMP',
          type: 'course',
          category: 'education'
        })
      });
      const ok = res.status === 409;
      record(2, 'Duplicate program code rejected with HTTP 409', ok, `Status=${res.status}`);
    } catch (err) {
      record(2, 'Duplicate program code rejected with HTTP 409', false, err.message);
    }

    // Test 3: Date range validation (end date before start date rejected)
    try {
      const res = await apiRequest(`${BASE_URL}/programs`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          name: 'Invalid Dates Program',
          code: 'PRG-S1-BAD-DATES',
          type: 'course',
          category: 'education',
          startDate: '2026-12-01',
          endDate: '2026-11-01'
        })
      });
      const ok = res.status === 400;
      record(3, 'End date before start date rejected with HTTP 400', ok, `Status=${res.status}`);
    } catch (err) {
      record(3, 'End date before start date rejected with HTTP 400', false, err.message);
    }

    // Test 4: Non-existent coordinator ID rejected
    try {
      const res = await apiRequest(`${BASE_URL}/programs`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          name: 'Bad Coordinator Program',
          code: 'PRG-S1-BAD-COORD',
          type: 'course',
          category: 'education',
          coordinator: '507f1f77bcf86cd799439011'
        })
      });
      const ok = res.status === 400;
      record(4, 'Non-existent coordinator ID rejected with HTTP 400', ok, `Status=${res.status}`);
    } catch (err) {
      record(4, 'Non-existent coordinator ID rejected with HTTP 400', false, err.message);
    }

    // Test 5: Get program returns enriched fields
    try {
      const res = await apiRequest(`${BASE_URL}/programs/${testProgramId}`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      const data = res.data?.data;
      const ok =
        res.status === 200 &&
        data &&
        typeof data.enrolledCount === 'number' &&
        typeof data.availableSeats === 'number' &&
        typeof data.isFull === 'boolean';
      record(5, 'Get program returns enriched stats (enrolledCount, availableSeats)', ok, `Enrolled=${data?.enrolledCount}, Available=${data?.availableSeats}`);
    } catch (err) {
      record(5, 'Get program returns enriched stats (enrolledCount, availableSeats)', false, err.message);
    }

    // ----------------------------------------------------------------
    // SECTION 2: CAPACITY REDUCTION GUARD
    // ----------------------------------------------------------------
    console.log('\n▶ [2. Capacity Reduction Guard]');

    // Enroll two students in program
    try {
      await apiRequest(`${BASE_URL}/programs/${testProgramId}/enrollments`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${staffToken}` },
        body: JSON.stringify({ studentId: String(testStudentId) })
      });
      await apiRequest(`${BASE_URL}/programs/${testProgramId}/enrollments`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${staffToken}` },
        body: JSON.stringify({ studentId: String(testStudent2Id) })
      });
    } catch (err) {
      console.error('Pre-enrollment error:', err);
    }

    // Test 6: Capacity reduction below current active enrollments rejected (400)
    try {
      const res = await apiRequest(`${BASE_URL}/programs/${testProgramId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ capacity: 1 })
      });
      const ok = res.status === 400 && JSON.stringify(res.data).includes('Capacity cannot be reduced');
      record(6, 'Capacity reduction below active enrollments rejected (HTTP 400)', ok, `Status=${res.status}`);
    } catch (err) {
      record(6, 'Capacity reduction below active enrollments rejected (HTTP 400)', false, err.message);
    }

    // Test 7: Capacity update to valid higher/equal capacity succeeds
    try {
      const res = await apiRequest(`${BASE_URL}/programs/${testProgramId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ capacity: 20 })
      });
      const ok = res.status === 200 && res.data?.data?.program?.capacity === 20;
      record(7, 'Capacity update to valid capacity (20) succeeds (HTTP 200)', ok, `NewCapacity=${res.data?.data?.program?.capacity}`);
    } catch (err) {
      record(7, 'Capacity update to valid capacity (20) succeeds (HTTP 200)', false, err.message);
    }

    // ----------------------------------------------------------------
    // SECTION 3: PROGRAM CLOSURE LIFECYCLE RULES
    // ----------------------------------------------------------------
    console.log('\n▶ [3. Program Closure Lifecycle Rules]');

    // Test 8: Closing program as 'completed' marks active enrollments as completed with timestamp
    try {
      const res = await apiRequest(`${BASE_URL}/programs/${testProgramId}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ status: 'completed' })
      });
      const enrollmentInDb = await ProgramEnrollment.findOne({ programId: testProgramId, studentId: testStudentId });
      const ok =
        res.status === 200 &&
        enrollmentInDb &&
        enrollmentInDb.status === 'completed' &&
        enrollmentInDb.completedAt !== null;
      record(8, "Closing program as 'completed' concludes active enrollments with completedAt", ok, `EnrollmentStatus=${enrollmentInDb?.status}, CompletedAt=${enrollmentInDb?.completedAt}`);
    } catch (err) {
      record(8, "Closing program as 'completed' concludes active enrollments with completedAt", false, err.message);
    }

    // Reactivate program to test cancellation rule
    await apiRequest(`${BASE_URL}/programs/${testProgramId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ status: 'active' })
    });
    // Re-enroll student
    await apiRequest(`${BASE_URL}/programs/${testProgramId}/enrollments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${staffToken}` },
      body: JSON.stringify({ studentId: String(testStudentId) })
    });

    // Test 9: Closing program as 'cancelled' transitions active enrollments to 'withdrawn' with documented reason
    try {
      const res = await apiRequest(`${BASE_URL}/programs/${testProgramId}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ status: 'cancelled' })
      });
      const enrollmentInDb = await ProgramEnrollment.findOne({ programId: testProgramId, studentId: testStudentId });
      const ok =
        res.status === 200 &&
        enrollmentInDb &&
        enrollmentInDb.status === 'withdrawn' &&
        enrollmentInDb.withdrawalReason === 'Program cancelled by organization' &&
        enrollmentInDb.withdrawnAt !== null;
      record(9, "Closing program as 'cancelled' transitions active enrollments with documented reason", ok, `Reason=${enrollmentInDb?.withdrawalReason}`);
    } catch (err) {
      record(9, "Closing program as 'cancelled' transitions active enrollments with documented reason", false, err.message);
    }

    // ----------------------------------------------------------------
    // SECTION 4: SAFE DELETION GUARD
    // ----------------------------------------------------------------
    console.log('\n▶ [4. Safe Deletion Guard]');

    // Test 10: Safe Deletion Guard blocks deletion of program with enrollments (HTTP 400)
    try {
      const res = await apiRequest(`${BASE_URL}/programs/${testProgramId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      const ok = res.status === 400 && JSON.stringify(res.data).includes('Cannot permanently delete program');
      record(10, 'Safe Deletion Guard blocks deletion of program with enrollments', ok, `Status=${res.status}`);
    } catch (err) {
      record(10, 'Safe Deletion Guard blocks deletion of program with enrollments', false, err.message);
    }

    // Test 11: Safe Deletion Guard allows deletion of clean program with no history
    try {
      const cleanProgRes = await apiRequest(`${BASE_URL}/programs`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          name: 'Mistake Program For Clean Deletion',
          code: 'PRG-S1-CLEAN',
          type: 'workshop',
          category: 'community'
        })
      });
      const cleanId = cleanProgRes.data?.data?.program?._id;
      const delRes = await apiRequest(`${BASE_URL}/programs/${cleanId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      const verifyRes = await apiRequest(`${BASE_URL}/programs/${cleanId}`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      const ok = delRes.status === 200 && verifyRes.status === 404;
      record(11, 'Safe Deletion Guard allows deletion of clean program (HTTP 200)', ok, `DeleteStatus=${delRes.status}, Verify=${verifyRes.status}`);
    } catch (err) {
      record(11, 'Safe Deletion Guard allows deletion of clean program (HTTP 200)', false, err.message);
    }

    // ----------------------------------------------------------------
    // SECTION 5: TENANT ISOLATION & IDOR PROTECTION
    // ----------------------------------------------------------------
    console.log('\n▶ [5. Tenant Isolation & IDOR Protection]');

    // Test 12: NGO B cannot read NGO A's program (404)
    try {
      const res = await apiRequest(`${BASE_URL}/programs/${testProgramId}`, {
        headers: { Authorization: `Bearer ${ngoBAdminToken}` }
      });
      const ok = res.status === 404;
      record(12, 'Cross-NGO IDOR: GET program returns HTTP 404', ok, `Status=${res.status}`);
    } catch (err) {
      record(12, 'Cross-NGO IDOR: GET program returns HTTP 404', false, err.message);
    }

    // Test 13: NGO B cannot update NGO A's program (404)
    try {
      const res = await apiRequest(`${BASE_URL}/programs/${testProgramId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${ngoBAdminToken}` },
        body: JSON.stringify({ name: 'Cross-Tenant Hijack' })
      });
      const ok = res.status === 404;
      record(13, 'Cross-NGO IDOR: PUT program returns HTTP 404', ok, `Status=${res.status}`);
    } catch (err) {
      record(13, 'Cross-NGO IDOR: PUT program returns HTTP 404', false, err.message);
    }

    // Test 14: NGO B cannot delete NGO A's program (404)
    try {
      const res = await apiRequest(`${BASE_URL}/programs/${testProgramId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${ngoBAdminToken}` }
      });
      const ok = res.status === 404;
      record(14, 'Cross-NGO IDOR: DELETE program returns HTTP 404', ok, `Status=${res.status}`);
    } catch (err) {
      record(14, 'Cross-NGO IDOR: DELETE program returns HTTP 404', false, err.message);
    }

    // Clean up
    await Student.deleteMany({ registrationNumber: /^BEN-S1-/ });
    await Program.deleteMany({ code: /^PRG-S1-/ });
    await User.findByIdAndDelete(userB._id);
    await Ngo.findByIdAndDelete(ngoBId);

  } catch (err) {
    console.error('Fatal test error in Stage 1:', err);
  } finally {
    await teardownTestEnvironment();
  }

  const passed = results.filter((r) => r.passed).length;
  const total = results.length;

  console.log('\n================================================================');
  console.log(`STAGE 1 TEST SUITE: ${passed} / ${total} TESTS PASSED! ${passed === total ? '✅' : '❌'}`);
  console.log('================================================================\n');

  if (passed !== total) {
    process.exit(1);
  }
};

runStage1Tests().catch((err) => {
  console.error('Test runner failure:', err);
  process.exit(1);
});

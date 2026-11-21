/**
 * NGOcore — Phase 6 Stage 3: Concurrency-Safe Beneficiary Enrollment
 *
 * Focused Automated Regression Test Suite covering:
 * - 1. Successful enrollment into active program with capacity tracking
 * - 2. Duplicate active enrollment prevention (HTTP 409)
 * - 3. Inactive beneficiary guard (HTTP 404)
 * - 4. Program status guard (Cannot enroll in draft/paused/completed/cancelled programs) (HTTP 400)
 * - 5. Enrollment lifecycle transitions (withdrawn with reason -> seat freed, re-enrolled -> seat reserved, completed -> seat freed)
 * - 6. Standard capacity boundary enforcement (HTTP 409 when full)
 * - 7. True Concurrency Stress Test: 5 simultaneous requests for 1 remaining seat (exact 1 winner, 4 rejected with 409, enrolledCount = 1)
 * - 8. Multi-tenant isolation & IDOR prevention (HTTP 404 across organizations)
 */

const bcrypt = require('bcrypt');
const config = require('../config/env');
const Program = require('../models/Program');
const Student = require('../models/Student');
const ProgramEnrollment = require('../models/ProgramEnrollment');
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

const runStage3Tests = async () => {
  await setupTestEnvironment();

  console.log('\n================================================================');
  console.log('   RUNNING PHASE 6 STAGE 3: CONCURRENCY-SAFE BENEFICIARY ENROLLMENT');
  console.log('================================================================\n');

  let adminToken = '';
  let staffToken = '';
  let ngoAId = '';

  let ngoBAdminToken = '';
  let ngoBId = '';

  let activeStudent1Id = '';
  let activeStudent2Id = '';
  let inactiveStudentId = '';
  let foreignStudentId = '';

  let activeProgId = '';
  let draftProgId = '';
  let cappedProgId = '';

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
      name: `NGO Isolation Stage 3 ${timestamp}`,
      status: 'approved',
      registrationNumber: `REG-STAGE3-P6-${timestamp}`
    });
    ngoBId = ngoB._id;

    const hashedPassword = await bcrypt.hash('Password123!', 10);
    const userB = await User.create({
      email: `admin-b-stage3-${timestamp}@example.org`,
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
    await Student.deleteMany({ registrationNumber: /^BEN-S3-/ });
    await Program.deleteMany({ code: /^PRG-S3-/ });

    // 4. Create test students
    const s1 = await Student.create({
      ngoId: ngoAId,
      registrationNumber: 'BEN-S3-001',
      firstName: 'Aarav',
      lastName: 'Sharma',
      gender: 'male',
      status: 'active'
    });
    activeStudent1Id = s1._id;

    const s2 = await Student.create({
      ngoId: ngoAId,
      registrationNumber: 'BEN-S3-002',
      firstName: 'Diya',
      lastName: 'Patel',
      gender: 'female',
      status: 'active'
    });
    activeStudent2Id = s2._id;

    const sInactive = await Student.create({
      ngoId: ngoAId,
      registrationNumber: 'BEN-S3-003',
      firstName: 'Karan',
      lastName: 'Singh',
      gender: 'male',
      status: 'inactive'
    });
    inactiveStudentId = sInactive._id;

    const sForeign = await Student.create({
      ngoId: ngoBId,
      registrationNumber: 'BEN-S3-FOR',
      firstName: 'Foreign',
      lastName: 'Student',
      gender: 'male',
      status: 'active'
    });
    foreignStudentId = sForeign._id;

    // 5. Create test programs
    const progActive = await Program.create({
      ngoId: ngoAId,
      name: 'Stage 3 Active Coding Program',
      code: 'PRG-S3-ACTIVE',
      type: 'course',
      category: 'technology',
      status: 'active',
      capacity: 10,
      createdBy: adminUser._id
    });
    activeProgId = progActive._id;

    const progDraft = await Program.create({
      ngoId: ngoAId,
      name: 'Stage 3 Draft Coding Program',
      code: 'PRG-S3-DRAFT',
      type: 'course',
      category: 'technology',
      status: 'draft',
      capacity: 10,
      createdBy: adminUser._id
    });
    draftProgId = progDraft._id;

    // ----------------------------------------------------------------
    // SECTION 1: STANDARD ENROLLMENT & GUARDS
    // ----------------------------------------------------------------
    console.log('▶ [1. Standard Enrollment & Status Guards]');

    // Test 1: Enroll active student in active program succeeds
    try {
      const res = await apiRequest(`${BASE_URL}/programs/${activeProgId}/enrollments`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${staffToken}` },
        body: JSON.stringify({ studentId: String(activeStudent1Id) })
      });
      const enrollment = res.data?.data?.enrollment || res.data?.data;
      const progAfter = await Program.findById(activeProgId);

      const ok = res.status === 201 && enrollment?.status === 'enrolled' && progAfter.enrolledCount === 1;
      record(1, 'Enroll active student in active program (HTTP 201)', ok, `Status=${res.status}, EnrolledCount=${progAfter?.enrolledCount}`);
    } catch (err) {
      record(1, 'Enroll active student in active program (HTTP 201)', false, err.message);
    }

    // Test 2: Duplicate enrollment rejected (HTTP 409)
    try {
      const res = await apiRequest(`${BASE_URL}/programs/${activeProgId}/enrollments`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${staffToken}` },
        body: JSON.stringify({ studentId: String(activeStudent1Id) })
      });
      const ok = res.status === 409 && JSON.stringify(res.data).includes('already enrolled');
      record(2, 'Duplicate active enrollment rejected (HTTP 409)', ok, `Status=${res.status}`);
    } catch (err) {
      record(2, 'Duplicate active enrollment rejected (HTTP 409)', false, err.message);
    }

    // Test 3: Inactive student enrollment rejected (HTTP 404)
    try {
      const res = await apiRequest(`${BASE_URL}/programs/${activeProgId}/enrollments`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${staffToken}` },
        body: JSON.stringify({ studentId: String(inactiveStudentId) })
      });
      const ok = res.status === 404;
      record(3, 'Inactive student enrollment rejected (HTTP 404)', ok, `Status=${res.status}`);
    } catch (err) {
      record(3, 'Inactive student enrollment rejected (HTTP 404)', false, err.message);
    }

    // Test 4: Enrollment in draft program rejected (HTTP 400)
    try {
      const res = await apiRequest(`${BASE_URL}/programs/${draftProgId}/enrollments`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${staffToken}` },
        body: JSON.stringify({ studentId: String(activeStudent2Id) })
      });
      const ok = res.status === 400 && JSON.stringify(res.data).includes('Only active programs');
      record(4, 'Enrollment in non-active program rejected (HTTP 400)', ok, `Status=${res.status}`);
    } catch (err) {
      record(4, 'Enrollment in non-active program rejected (HTTP 400)', false, err.message);
    }

    // ----------------------------------------------------------------
    // SECTION 2: ENROLLMENT LIFECYCLE (WITHDRAWAL & RE-ENROLLMENT)
    // ----------------------------------------------------------------
    console.log('\n▶ [2. Enrollment Lifecycle & Seat Accounting]');

    // Test 5: Withdraw student with reason frees seat
    try {
      const res = await apiRequest(`${BASE_URL}/programs/${activeProgId}/enrollments/${activeStudent1Id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${staffToken}` },
        body: JSON.stringify({ status: 'withdrawn', reason: 'Family relocated to another city' })
      });
      const enrollment = res.data?.data?.enrollment || res.data?.data;
      const progAfter = await Program.findById(activeProgId);

      const ok =
        res.status === 200 &&
        enrollment?.status === 'withdrawn' &&
        enrollment?.withdrawalReason === 'Family relocated to another city' &&
        enrollment?.withdrawnAt !== null &&
        progAfter.enrolledCount === 0;

      record(5, 'Withdraw student with documented reason frees seat', ok, `Status=${enrollment?.status}, SeatsRemaining=${progAfter.enrolledCount}`);
    } catch (err) {
      record(5, 'Withdraw student with documented reason frees seat', false, err.message);
    }

    // Test 6: Re-enroll withdrawn student clears reason and re-reserves seat
    try {
      const res = await apiRequest(`${BASE_URL}/programs/${activeProgId}/enrollments/${activeStudent1Id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${staffToken}` },
        body: JSON.stringify({ status: 'enrolled' })
      });
      const enrollment = res.data?.data?.enrollment || res.data?.data;
      const progAfter = await Program.findById(activeProgId);

      const ok =
        res.status === 200 &&
        enrollment?.status === 'enrolled' &&
        enrollment?.withdrawalReason === '' &&
        progAfter.enrolledCount === 1;

      record(6, 'Re-enrolling student restores active status and increments count', ok, `Status=${enrollment?.status}, EnrolledCount=${progAfter.enrolledCount}`);
    } catch (err) {
      record(6, 'Re-enrolling student restores active status and increments count', false, err.message);
    }

    // Test 7: Mark student completed preserves history and frees seat
    try {
      const res = await apiRequest(`${BASE_URL}/programs/${activeProgId}/enrollments/${activeStudent1Id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${staffToken}` },
        body: JSON.stringify({ status: 'completed' })
      });
      const enrollment = res.data?.data?.enrollment || res.data?.data;
      const progAfter = await Program.findById(activeProgId);

      const ok =
        res.status === 200 &&
        enrollment?.status === 'completed' &&
        enrollment?.completedAt !== null &&
        progAfter.enrolledCount === 0;

      record(7, 'Marking student completed sets completedAt and decrements count', ok, `Status=${enrollment?.status}, EnrolledCount=${progAfter.enrolledCount}`);
    } catch (err) {
      record(7, 'Marking student completed sets completedAt and decrements count', false, err.message);
    }

    // ----------------------------------------------------------------
    // SECTION 3: CAPACITY BOUNDARY & CONCURRENCY STRESS TEST
    // ----------------------------------------------------------------
    console.log('\n▶ [3. Capacity Boundary & Concurrency Stress Test]');

    // Create program with capacity = 1
    const progCapped = await Program.create({
      ngoId: ngoAId,
      name: 'Single Seat Elite Workshop',
      code: 'PRG-S3-CAPPED',
      type: 'workshop',
      category: 'technology',
      status: 'active',
      capacity: 1,
      enrolledCount: 0,
      createdBy: adminUser._id
    });
    cappedProgId = progCapped._id;

    // Create 5 distinct students for concurrency battle
    const stressStudents = await Promise.all([
      Student.create({ ngoId: ngoAId, registrationNumber: 'BEN-S3-C1', firstName: 'Cand1', lastName: 'Test', status: 'active' }),
      Student.create({ ngoId: ngoAId, registrationNumber: 'BEN-S3-C2', firstName: 'Cand2', lastName: 'Test', status: 'active' }),
      Student.create({ ngoId: ngoAId, registrationNumber: 'BEN-S3-C3', firstName: 'Cand3', lastName: 'Test', status: 'active' }),
      Student.create({ ngoId: ngoAId, registrationNumber: 'BEN-S3-C4', firstName: 'Cand4', lastName: 'Test', status: 'active' }),
      Student.create({ ngoId: ngoAId, registrationNumber: 'BEN-S3-C5', firstName: 'Cand5', lastName: 'Test', status: 'active' })
    ]);

    // Test 8: Fire 5 simultaneous enrollment requests for exactly 1 seat
    try {
      const concurrentRequests = stressStudents.map((stud) =>
        apiRequest(`${BASE_URL}/programs/${cappedProgId}/enrollments`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${staffToken}` },
          body: JSON.stringify({ studentId: String(stud._id) })
        })
      );

      const responses = await Promise.all(concurrentRequests);
      const successes = responses.filter((r) => r.status === 201);
      const capacityRejections = responses.filter((r) => r.status === 409 && JSON.stringify(r.data).includes('capacity'));
      const progInDb = await Program.findById(cappedProgId);
      const enrollmentsInDb = await ProgramEnrollment.find({ programId: cappedProgId, status: 'enrolled' });

      const ok =
        successes.length === 1 &&
        capacityRejections.length === 4 &&
        progInDb.enrolledCount === 1 &&
        enrollmentsInDb.length === 1;

      record(
        8,
        'Concurrency Stress: 5 requests for 1 seat -> exactly 1 enrolled, 4 rejected',
        ok,
        `Successes=${successes.length}, Rejections=${capacityRejections.length}, EnrolledInDb=${progInDb.enrolledCount}`
      );
    } catch (err) {
      record(8, 'Concurrency Stress: 5 requests for 1 seat -> exactly 1 enrolled, 4 rejected', false, err.message);
    }

    // ----------------------------------------------------------------
    // SECTION 4: TENANT ISOLATION & IDOR GUARDS
    // ----------------------------------------------------------------
    console.log('\n▶ [4. Multi-Tenant Isolation & IDOR Guards]');

    // Test 9: Enrolling foreign NGO student rejected (HTTP 404)
    try {
      const res = await apiRequest(`${BASE_URL}/programs/${activeProgId}/enrollments`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${staffToken}` },
        body: JSON.stringify({ studentId: String(foreignStudentId) })
      });
      const ok = res.status === 404;
      record(9, 'Cross-NGO student enrollment rejected (HTTP 404 IDOR)', ok, `Status=${res.status}`);
    } catch (err) {
      record(9, 'Cross-NGO student enrollment rejected (HTTP 404 IDOR)', false, err.message);
    }

    // Test 10: Foreign NGO admin accessing NGO A program enrollments rejected (HTTP 404)
    try {
      const res = await apiRequest(`${BASE_URL}/programs/${activeProgId}/enrollments`, {
        headers: { Authorization: `Bearer ${ngoBAdminToken}` }
      });
      const ok = res.status === 404;
      record(10, 'Cross-NGO program enrollment access rejected (HTTP 404 IDOR)', ok, `Status=${res.status}`);
    } catch (err) {
      record(10, 'Cross-NGO program enrollment access rejected (HTTP 404 IDOR)', false, err.message);
    }

  } catch (globalErr) {
    console.error('Fatal test error:', globalErr);
  } finally {
    // Cleanup test records
    await Program.deleteMany({ code: /^PRG-S3-/ });
    await Student.deleteMany({ registrationNumber: /^BEN-S3-/ });
    if (cappedProgId) await ProgramEnrollment.deleteMany({ programId: cappedProgId });
    if (activeProgId) await ProgramEnrollment.deleteMany({ programId: activeProgId });
    if (draftProgId) await ProgramEnrollment.deleteMany({ programId: draftProgId });
    await User.deleteMany({ email: /^admin-b-stage3-/ });
    if (ngoBId) await Ngo.deleteOne({ _id: ngoBId });
    await teardownTestEnvironment();
  }

  const passedCount = results.filter((r) => r.passed).length;
  const totalCount = results.length;
  console.log('\n================================================================');
  console.log(`STAGE 3 TEST SUITE: ${passedCount} / ${totalCount} TESTS PASSED! ${passedCount === totalCount ? '✅' : '❌'}`);
  console.log('================================================================\n');

  if (passedCount !== totalCount) {
    process.exit(1);
  }
};

runStage3Tests();

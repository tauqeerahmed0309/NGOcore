/**
 * NGOcore — Phase 6.1: Data Integrity and Historical Consistency Remediation Test Suite
 *
 * Automated Regression Test Suite covering:
 *
 * PART 1: ENROLLMENT COUNTER RECONCILIATION
 * - 1. Program with missing counter and existing enrollments is accurately reconciled
 * - 2. Program with incorrect/drifted counter is reconciled to actual active count
 * - 3. Program with zero active enrollments is properly set to 0
 * - 4. Multi-NGO isolation: reconciliation preserves strict NGO scoping
 * - 5. Repeated reconciliation is 100% idempotent
 * - 6. Enrolling into program where capacity is reached after reconciliation is rejected (HTTP 409)
 * - 7. Missing counter self-heals dynamically on enrollment attempt without bypassing capacity limits
 *
 * PART 2: ENROLLMENT HISTORY PRESERVATION
 * - 8. Initial enrollment records initial history entry
 * - 9. Withdrawal appends withdrawal transition with reason and acting user
 * - 10. Re-enrollment preserves previous withdrawal history, reason, and timestamps in timeline
 * - 11. Multiple withdrawal & re-enrollment cycles maintain unbroken chronologically ordered history
 * - 12. Marking completion records completion transition in history
 * - 13. Program closure (cancellation) records documented closure reason across active enrollments
 * - 14. Retried / repeated requests are idempotent and do not append duplicate identical history entries
 *
 * PART 3: CONCURRENCY & FAILURE RECOVERY
 * - 15. Two simultaneous withdrawal requests for the SAME student: counter decremented EXACTLY ONCE
 * - 16. Repeated withdrawal request on already withdrawn beneficiary does not decrement counter
 * - 17. Two simultaneous completion requests for the SAME student: counter decremented EXACTLY ONCE
 * - 18. Concurrent race: Withdrawal vs. Completion on the same student resolves with exactly 1 counter decrement
 * - 19. Two simultaneous re-enrollment requests racing for 1 available seat: exactly 1 succeeds, seat not double-allocated
 * - 20. Interrupted counter adjustment recovery: system reconciles program counter on simulated write failure
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
const { reconcileEnrollmentCounters } = require('./reconcileProgramEnrollments');

const BASE_URL = `http://localhost:${config.PORT}/api/v1`;

const results = [];

const record = (num, name, passed, details) => {
  results.push({ num, name, passed, details });
  console.log(
    `${passed ? '✅' : '❌'} Test ${num.toString().padStart(2, ' ')}: ${name.padEnd(62, ' ')} -> ${
      passed ? 'PASSED' : 'FAILED'
    } (${details})`
  );
};

const runPhase61Tests = async () => {
  await setupTestEnvironment();

  console.log('\n================================================================');
  console.log('   RUNNING PHASE 6.1: DATA INTEGRITY & HISTORY REMEDIATION       ');
  console.log('================================================================\n');

  let adminToken = '';
  let staffToken = '';
  let adminUserId = '';
  let ngoAId = '';

  let ngoBAdminToken = '';
  let ngoBId = '';

  try {
    // 1. Authenticate users
    const adminUser = await User.findOne({ email: config.ADMIN_EMAIL });
    adminUserId = adminUser._id;
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
      name: `NGO Isolation Phase 6.1 ${timestamp}`,
      status: 'approved',
      registrationNumber: `REG-P61-${timestamp}`
    });
    ngoBId = ngoB._id;

    const hashedPassword = await bcrypt.hash('Password123!', 10);
    const userB = await User.create({
      email: `admin-b-p61-${timestamp}@example.org`,
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

    // Clean test records
    await Program.deleteMany({ code: /^PRG-P61-/ });
    await Student.deleteMany({ registrationNumber: /^BEN-P61-/ });

    // ----------------------------------------------------------------
    // SECTION 1: ENROLLMENT COUNTER RECONCILIATION
    // ----------------------------------------------------------------
    console.log('▶ [1. Enrollment Counter Reconciliation]');

    // Setup Program 1: Missing counter, 3 active enrollments
    const prog1 = await Program.create({
      ngoId: ngoAId,
      name: 'Unreconciled Program 1',
      code: 'PRG-P61-REC-01',
      type: 'course',
      capacity: 3,
      status: 'active',
      createdBy: adminUserId
    });
    // Deliberately unset enrolledCount to simulate legacy document
    await Program.collection.updateOne({ _id: prog1._id }, { $unset: { enrolledCount: '' } });

    const [s1, s2, s3] = await Promise.all([
      Student.create({ ngoId: ngoAId, registrationNumber: 'BEN-P61-S1', firstName: 'Student1', lastName: 'Test', status: 'active' }),
      Student.create({ ngoId: ngoAId, registrationNumber: 'BEN-P61-S2', firstName: 'Student2', lastName: 'Test', status: 'active' }),
      Student.create({ ngoId: ngoAId, registrationNumber: 'BEN-P61-S3', firstName: 'Student3', lastName: 'Test', status: 'active' })
    ]);

    await ProgramEnrollment.create([
      { ngoId: ngoAId, programId: prog1._id, studentId: s1._id, status: 'enrolled' },
      { ngoId: ngoAId, programId: prog1._id, studentId: s2._id, status: 'enrolled' },
      { ngoId: ngoAId, programId: prog1._id, studentId: s3._id, status: 'enrolled' }
    ]);

    // Setup Program 2: Drifted counter (stored: 99, actual active: 1)
    const s4 = await Student.create({ ngoId: ngoAId, registrationNumber: 'BEN-P61-S4', firstName: 'Student4', lastName: 'Test', status: 'active' });
    const prog2 = await Program.create({
      ngoId: ngoAId,
      name: 'Drifted Program 2',
      code: 'PRG-P61-REC-02',
      type: 'course',
      capacity: 10,
      enrolledCount: 99, // Intentional drift
      status: 'active',
      createdBy: adminUserId
    });
    await ProgramEnrollment.create([
      { ngoId: ngoAId, programId: prog2._id, studentId: s4._id, status: 'enrolled' }
    ]);

    // Setup Program 3: Zero active enrollments
    const prog3 = await Program.create({
      ngoId: ngoAId,
      name: 'Zero Enrollment Program 3',
      code: 'PRG-P61-REC-03',
      type: 'course',
      capacity: 10,
      enrolledCount: 5, // Intentional drift
      status: 'active',
      createdBy: adminUserId
    });

    // Setup Program 4 in NGO B: 2 active enrollments
    const sB1 = await Student.create({ ngoId: ngoBId, registrationNumber: 'BEN-P61-SB1', firstName: 'StudentB1', lastName: 'Test', status: 'active' });
    const sB2 = await Student.create({ ngoId: ngoBId, registrationNumber: 'BEN-P61-SB2', firstName: 'StudentB2', lastName: 'Test', status: 'active' });
    const progB = await Program.create({
      ngoId: ngoBId,
      name: 'Tenant B Program',
      code: 'PRG-P61-REC-B',
      type: 'course',
      capacity: 10,
      enrolledCount: 0, // Intentional drift
      status: 'active',
      createdBy: userB._id
    });
    await ProgramEnrollment.create([
      { ngoId: ngoBId, programId: progB._id, studentId: sB1._id, status: 'enrolled' },
      { ngoId: ngoBId, programId: progB._id, studentId: sB2._id, status: 'enrolled' }
    ]);

    // Execute reconciliation in apply mode
    const reconResult = await reconcileEnrollmentCounters({ dryRun: false });

    // Test 1: Program with missing counter reconciled to 3
    const prog1After = await Program.findById(prog1._id);
    const t1Ok = prog1After.enrolledCount === 3;
    record(1, 'Program with missing counter accurately reconciled to actual count (3)', t1Ok, `EnrolledCount=${prog1After.enrolledCount}`);

    // Test 2: Drifted program counter reconciled to 1
    const prog2After = await Program.findById(prog2._id);
    const t2Ok = prog2After.enrolledCount === 1;
    record(2, 'Program with drifted counter reconciled to actual count (1)', t2Ok, `EnrolledCount=${prog2After.enrolledCount}`);

    // Test 3: Program with 0 active enrollments reconciled to 0
    const prog3After = await Program.findById(prog3._id);
    const t3Ok = prog3After.enrolledCount === 0;
    record(3, 'Program with zero enrollments reconciled to 0', t3Ok, `EnrolledCount=${prog3After.enrolledCount}`);

    // Test 4: Tenant B program reconciled strictly to Tenant B count (2)
    const progBAfter = await Program.findById(progB._id);
    const t4Ok = progBAfter.enrolledCount === 2;
    record(4, 'Multi-tenant isolation: Tenant B program reconciled strictly to 2', t4Ok, `EnrolledCount=${progBAfter.enrolledCount}`);

    // Test 5: Repeated reconciliation is 100% idempotent (0 discrepancies)
    const secondRecon = await reconcileEnrollmentCounters({ dryRun: true });
    const t5Ok = secondRecon.discrepancyCount === 0;
    record(5, 'Repeated reconciliation is strictly idempotent (0 discrepancies)', t5Ok, `Discrepancies=${secondRecon.discrepancyCount}`);

    // Test 6: Capacity full after reconciliation blocks new enrollment (HTTP 409)
    const sExtra = await Student.create({ ngoId: ngoAId, registrationNumber: 'BEN-P61-SEXTRA', firstName: 'Extra', lastName: 'Test', status: 'active' });
    try {
      const res = await apiRequest(`${BASE_URL}/programs/${prog1._id}/enrollments`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${staffToken}` },
        body: JSON.stringify({ studentId: String(sExtra._id) })
      });
      const ok = res.status === 409 && JSON.stringify(res.data).includes('capacity');
      record(6, 'Reconciled full program blocks new enrollment with HTTP 409', ok, `Status=${res.status}`);
    } catch (err) {
      record(6, 'Reconciled full program blocks new enrollment with HTTP 409', false, err.message);
    }

    // Test 7: Dynamically self-heals un-reconciled program on enrollment without bypassing capacity
    const progUnhealed = await Program.create({
      ngoId: ngoAId,
      name: 'Unhealed Program',
      code: 'PRG-P61-UNHEALED',
      type: 'course',
      capacity: 1,
      status: 'active',
      createdBy: adminUserId
    });
    await ProgramEnrollment.create([
      { ngoId: ngoAId, programId: progUnhealed._id, studentId: s1._id, status: 'enrolled' }
    ]);
    // Deliberately unset enrolledCount
    await Program.collection.updateOne({ _id: progUnhealed._id }, { $unset: { enrolledCount: '' } });

    try {
      const res = await apiRequest(`${BASE_URL}/programs/${progUnhealed._id}/enrollments`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${staffToken}` },
        body: JSON.stringify({ studentId: String(sExtra._id) })
      });
      const ok = res.status === 409 && JSON.stringify(res.data).includes('capacity');
      const inDb = await Program.findById(progUnhealed._id);
      record(7, 'Self-healing counter prevents capacity bypass on un-reconciled program', ok && inDb.enrolledCount === 1, `Status=${res.status}, EnrolledCountInDb=${inDb.enrolledCount}`);
    } catch (err) {
      record(7, 'Self-healing counter prevents capacity bypass on un-reconciled program', false, err.message);
    }

    // ----------------------------------------------------------------
    // SECTION 2: ENROLLMENT HISTORY PRESERVATION
    // ----------------------------------------------------------------
    console.log('\n▶ [2. Enrollment History Preservation]');

    const historyProg = await Program.create({
      ngoId: ngoAId,
      name: 'History Test Program',
      code: 'PRG-P61-HIST',
      type: 'course',
      capacity: 10,
      status: 'active',
      createdBy: adminUserId
    });

    const hStudent = await Student.create({
      ngoId: ngoAId,
      registrationNumber: 'BEN-P61-HIST-01',
      firstName: 'Historical',
      lastName: 'Student',
      status: 'active'
    });

    // Test 8: Initial enrollment records history entry
    let enrollDoc;
    try {
      const res = await apiRequest(`${BASE_URL}/programs/${historyProg._id}/enrollments`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${staffToken}` },
        body: JSON.stringify({ studentId: String(hStudent._id) })
      });
      enrollDoc = await ProgramEnrollment.findOne({ programId: historyProg._id, studentId: hStudent._id });
      const ok = res.status === 201 && enrollDoc && Array.isArray(enrollDoc.history) && enrollDoc.history.length === 1 && enrollDoc.history[0].status === 'enrolled';
      record(8, 'Initial enrollment records initial history entry (length = 1)', ok, `HistoryLength=${enrollDoc?.history?.length}, Status=${enrollDoc?.history?.[0]?.status}`);
    } catch (err) {
      record(8, 'Initial enrollment records initial history entry (length = 1)', false, err.message);
    }

    // Test 9: Withdrawal appends withdrawal transition with reason
    try {
      const res = await apiRequest(`${BASE_URL}/programs/${historyProg._id}/enrollments/${hStudent._id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${staffToken}` },
        body: JSON.stringify({ status: 'withdrawn', reason: 'Medical absence for recovery' })
      });
      enrollDoc = await ProgramEnrollment.findOne({ programId: historyProg._id, studentId: hStudent._id });
      const ok =
        res.status === 200 &&
        enrollDoc.status === 'withdrawn' &&
        enrollDoc.withdrawalReason === 'Medical absence for recovery' &&
        enrollDoc.history.length === 2 &&
        enrollDoc.history[1].status === 'withdrawn' &&
        enrollDoc.history[1].reason === 'Medical absence for recovery';
      record(9, 'Withdrawal appends transition with documented reason (length = 2)', ok, `Status=${enrollDoc?.status}, HistoryLength=${enrollDoc?.history?.length}`);
    } catch (err) {
      record(9, 'Withdrawal appends transition with documented reason (length = 2)', false, err.message);
    }

    // Test 10: Re-enrollment preserves previous withdrawal entry in history
    try {
      const res = await apiRequest(`${BASE_URL}/programs/${historyProg._id}/enrollments/${hStudent._id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${staffToken}` },
        body: JSON.stringify({ status: 'enrolled', reason: 'Medical clearance received' })
      });
      enrollDoc = await ProgramEnrollment.findOne({ programId: historyProg._id, studentId: hStudent._id });
      const ok =
        res.status === 200 &&
        enrollDoc.status === 'enrolled' &&
        enrollDoc.history.length === 3 &&
        enrollDoc.history[0].status === 'enrolled' &&
        enrollDoc.history[1].status === 'withdrawn' &&
        enrollDoc.history[1].reason === 'Medical absence for recovery' &&
        enrollDoc.history[2].status === 'enrolled';
      record(10, 'Re-enrollment preserves previous withdrawal in timeline (length = 3)', ok, `HistoryLength=${enrollDoc?.history?.length}, H1Reason=${enrollDoc?.history?.[1]?.reason}`);
    } catch (err) {
      record(10, 'Re-enrollment preserves previous withdrawal in timeline (length = 3)', false, err.message);
    }

    // Test 11: Multiple withdrawal and re-enrollment cycles maintain full chronological timeline
    try {
      // Cycle 2: Withdraw again
      await apiRequest(`${BASE_URL}/programs/${historyProg._id}/enrollments/${hStudent._id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${staffToken}` },
        body: JSON.stringify({ status: 'withdrawn', reason: 'Second temporary withdrawal' })
      });
      // Cycle 2: Re-enroll again via POST
      await apiRequest(`${BASE_URL}/programs/${historyProg._id}/enrollments`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${staffToken}` },
        body: JSON.stringify({ studentId: String(hStudent._id) })
      });

      enrollDoc = await ProgramEnrollment.findOne({ programId: historyProg._id, studentId: hStudent._id });
      const ok =
        enrollDoc.status === 'enrolled' &&
        enrollDoc.history.length === 5 &&
        enrollDoc.history.map((h) => h.status).join('->') === 'enrolled->withdrawn->enrolled->withdrawn->enrolled';
      record(11, 'Multiple cycles maintain unbroken chronological history (5 transitions)', ok, `Timeline=${enrollDoc?.history?.map((h) => h.status).join('->')}`);
    } catch (err) {
      record(11, 'Multiple cycles maintain unbroken chronological history (5 transitions)', false, err.message);
    }

    // Test 12: Marking completion records completed transition in history
    try {
      const res = await apiRequest(`${BASE_URL}/programs/${historyProg._id}/enrollments/${hStudent._id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${staffToken}` },
        body: JSON.stringify({ status: 'completed' })
      });
      enrollDoc = await ProgramEnrollment.findOne({ programId: historyProg._id, studentId: hStudent._id });
      const ok =
        res.status === 200 &&
        enrollDoc.status === 'completed' &&
        enrollDoc.history.length === 6 &&
        enrollDoc.history[5].status === 'completed';
      record(12, 'Marking completion records completion transition in history (length = 6)', ok, `HistoryLength=${enrollDoc?.history?.length}, LastStatus=${enrollDoc?.history?.[5]?.status}`);
    } catch (err) {
      record(12, 'Marking completion records completion transition in history (length = 6)', false, err.message);
    }

    // Test 13: Program closure records closure reason across active enrollments
    const closureProg = await Program.create({
      ngoId: ngoAId,
      name: 'Closure Test Program',
      code: 'PRG-P61-CLOSURE',
      type: 'course',
      capacity: 10,
      status: 'active',
      createdBy: adminUserId
    });
    const cStudent = await Student.create({
      ngoId: ngoAId,
      registrationNumber: 'BEN-P61-CLOSURE-01',
      firstName: 'Close',
      lastName: 'Student',
      status: 'active'
    });
    await apiRequest(`${BASE_URL}/programs/${closureProg._id}/enrollments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${staffToken}` },
      body: JSON.stringify({ studentId: String(cStudent._id) })
    });
    // Close program as cancelled
    await apiRequest(`${BASE_URL}/programs/${closureProg._id}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ status: 'cancelled' })
    });
    const closedEnrollment = await ProgramEnrollment.findOne({ programId: closureProg._id, studentId: cStudent._id });
    const t13Ok =
      closedEnrollment &&
      closedEnrollment.status === 'withdrawn' &&
      closedEnrollment.history.length === 2 &&
      closedEnrollment.history[1].status === 'withdrawn' &&
      closedEnrollment.history[1].reason === 'Program cancelled by organization';
    record(13, 'Program cancellation records closure transition in enrollment history', t13Ok, `Reason=${closedEnrollment?.history?.[1]?.reason}`);

    // Test 14: Repeated status change is idempotent (does not duplicate history entries)
    try {
      await apiRequest(`${BASE_URL}/programs/${closureProg._id}/enrollments/${cStudent._id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${staffToken}` },
        body: JSON.stringify({ status: 'withdrawn', reason: 'Retried withdrawal' })
      });
      const checkDoc = await ProgramEnrollment.findOne({ programId: closureProg._id, studentId: cStudent._id });
      const ok = checkDoc.history.length === 2; // Should NOT be 3
      record(14, 'Retried requests are idempotent and do not duplicate history entries', ok, `HistoryLength=${checkDoc?.history?.length}`);
    } catch (err) {
      record(14, 'Retried requests are idempotent and do not duplicate history entries', false, err.message);
    }

    // ----------------------------------------------------------------
    // SECTION 3: CONCURRENCY & FAILURE RECOVERY
    // ----------------------------------------------------------------
    console.log('\n▶ [3. Concurrency & Failure Recovery]');

    const concProg = await Program.create({
      ngoId: ngoAId,
      name: 'Concurrency Battle Program',
      code: 'PRG-P61-CONC',
      type: 'course',
      capacity: 5,
      enrolledCount: 1,
      status: 'active',
      createdBy: adminUserId
    });

    const concStudent = await Student.create({
      ngoId: ngoAId,
      registrationNumber: 'BEN-P61-CONC-01',
      firstName: 'Conc',
      lastName: 'Student',
      status: 'active'
    });

    await ProgramEnrollment.create({
      ngoId: ngoAId,
      programId: concProg._id,
      studentId: concStudent._id,
      status: 'enrolled',
      history: [{ status: 'enrolled', changedAt: new Date(), reason: 'Initial enrollment' }]
    });

    // Test 15: Two simultaneous withdrawal requests for the SAME student: counter decremented EXACTLY ONCE
    try {
      const [w1, w2] = await Promise.all([
        apiRequest(`${BASE_URL}/programs/${concProg._id}/enrollments/${concStudent._id}`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${staffToken}` },
          body: JSON.stringify({ status: 'withdrawn', reason: 'Withdrawal Req 1' })
        }),
        apiRequest(`${BASE_URL}/programs/${concProg._id}/enrollments/${concStudent._id}`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${staffToken}` },
          body: JSON.stringify({ status: 'withdrawn', reason: 'Withdrawal Req 2' })
        })
      ]);

      const pAfter = await Program.findById(concProg._id);
      const eAfter = await ProgramEnrollment.findOne({ programId: concProg._id, studentId: concStudent._id });

      const ok =
        (w1.status === 200 || w1.status === 304) &&
        (w2.status === 200 || w2.status === 304) &&
        pAfter.enrolledCount === 0 && // Exactly decremented from 1 to 0 (NOT -1!)
        eAfter.status === 'withdrawn';

      record(15, 'Two simultaneous withdrawal requests decrement counter EXACTLY ONCE', ok, `FinalEnrolledCount=${pAfter.enrolledCount}`);
    } catch (err) {
      record(15, 'Two simultaneous withdrawal requests decrement counter EXACTLY ONCE', false, err.message);
    }

    // Test 16: Repeated withdrawal request on already withdrawn beneficiary does NOT decrement counter
    try {
      await apiRequest(`${BASE_URL}/programs/${concProg._id}/enrollments/${concStudent._id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${staffToken}` },
        body: JSON.stringify({ status: 'withdrawn', reason: 'Repeated Withdrawal' })
      });
      const pAfter = await Program.findById(concProg._id);
      const ok = pAfter.enrolledCount === 0;
      record(16, 'Repeated withdrawal request does not decrement counter (remains 0)', ok, `EnrolledCount=${pAfter.enrolledCount}`);
    } catch (err) {
      record(16, 'Repeated withdrawal request does not decrement counter (remains 0)', false, err.message);
    }

    // Reset student to enrolled
    await ProgramEnrollment.updateOne({ programId: concProg._id, studentId: concStudent._id }, { $set: { status: 'enrolled' } });
    await Program.updateOne({ _id: concProg._id }, { $set: { enrolledCount: 1 } });

    // Test 17: Two simultaneous completion requests for the SAME student: counter decremented EXACTLY ONCE
    try {
      const [c1, c2] = await Promise.all([
        apiRequest(`${BASE_URL}/programs/${concProg._id}/enrollments/${concStudent._id}`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${staffToken}` },
          body: JSON.stringify({ status: 'completed' })
        }),
        apiRequest(`${BASE_URL}/programs/${concProg._id}/enrollments/${concStudent._id}`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${staffToken}` },
          body: JSON.stringify({ status: 'completed' })
        })
      ]);

      const pAfter = await Program.findById(concProg._id);
      const ok = pAfter.enrolledCount === 0;
      record(17, 'Two simultaneous completion requests decrement counter EXACTLY ONCE', ok, `FinalEnrolledCount=${pAfter.enrolledCount}`);
    } catch (err) {
      record(17, 'Two simultaneous completion requests decrement counter EXACTLY ONCE', false, err.message);
    }

    // Reset student to enrolled
    await ProgramEnrollment.updateOne({ programId: concProg._id, studentId: concStudent._id }, { $set: { status: 'enrolled' } });
    await Program.updateOne({ _id: concProg._id }, { $set: { enrolledCount: 1 } });

    // Test 18: Withdrawal racing with completion on the same student decrements counter EXACTLY ONCE
    try {
      const [resW, resC] = await Promise.all([
        apiRequest(`${BASE_URL}/programs/${concProg._id}/enrollments/${concStudent._id}`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${staffToken}` },
          body: JSON.stringify({ status: 'withdrawn', reason: 'Racing withdrawal' })
        }),
        apiRequest(`${BASE_URL}/programs/${concProg._id}/enrollments/${concStudent._id}`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${staffToken}` },
          body: JSON.stringify({ status: 'completed' })
        })
      ]);

      const pAfter = await Program.findById(concProg._id);
      const eAfter = await ProgramEnrollment.findOne({ programId: concProg._id, studentId: concStudent._id });
      const ok = pAfter.enrolledCount === 0 && ['withdrawn', 'completed'].includes(eAfter.status);
      record(18, 'Withdrawal racing with completion decrements counter EXACTLY ONCE', ok, `FinalEnrolledCount=${pAfter.enrolledCount}, WinnerStatus=${eAfter.status}`);
    } catch (err) {
      record(18, 'Withdrawal racing with completion decrements counter EXACTLY ONCE', false, err.message);
    }

    // Test 19: Two simultaneous re-enrollment requests racing for 1 available seat: exactly 1 succeeds
    const singleSeatProg = await Program.create({
      ngoId: ngoAId,
      name: 'Single Seat Race Program',
      code: 'PRG-P61-RACE',
      type: 'course',
      capacity: 1,
      enrolledCount: 0,
      status: 'active',
      createdBy: adminUserId
    });

    const [rStudent1, rStudent2] = await Promise.all([
      Student.create({ ngoId: ngoAId, registrationNumber: 'BEN-P61-R1', firstName: 'Racer1', lastName: 'Test', status: 'active' }),
      Student.create({ ngoId: ngoAId, registrationNumber: 'BEN-P61-R2', firstName: 'Racer2', lastName: 'Test', status: 'active' })
    ]);

    try {
      const [resR1, resR2] = await Promise.all([
        apiRequest(`${BASE_URL}/programs/${singleSeatProg._id}/enrollments`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${staffToken}` },
          body: JSON.stringify({ studentId: String(rStudent1._id) })
        }),
        apiRequest(`${BASE_URL}/programs/${singleSeatProg._id}/enrollments`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${staffToken}` },
          body: JSON.stringify({ studentId: String(rStudent2._id) })
        })
      ]);

      const successCount = [resR1, resR2].filter((r) => r.status === 201).length;
      const rejectCount = [resR1, resR2].filter((r) => r.status === 409).length;
      const pInDb = await Program.findById(singleSeatProg._id);

      const ok = successCount === 1 && rejectCount === 1 && pInDb.enrolledCount === 1;
      record(19, 'Simultaneous re-enrollment for 1 seat: 1 succeeds, 1 rejected, count = 1', ok, `Success=${successCount}, Rejected=${rejectCount}, FinalCount=${pInDb.enrolledCount}`);
    } catch (err) {
      record(19, 'Simultaneous re-enrollment for 1 seat: 1 succeeds, 1 rejected, count = 1', false, err.message);
    }

    // Test 20: Counter reconciliation after simulated failure
    // Simulate intentional counter discrepancy on singleSeatProg
    await Program.updateOne({ _id: singleSeatProg._id }, { $set: { enrolledCount: 99 } });
    const recoveryResult = await reconcileEnrollmentCounters({ dryRun: false, programId: singleSeatProg._id });
    const pRecovered = await Program.findById(singleSeatProg._id);
    const ok20 = recoveryResult.modifiedCount === 1 && pRecovered.enrolledCount === 1;
    record(20, 'Counter reconciliation restores correct active count after simulated failure', ok20, `RecoveredCount=${pRecovered.enrolledCount}`);

  } catch (globalErr) {
    console.error('Fatal test error in Phase 6.1 suite:', globalErr);
  } finally {
    // Cleanup test records
    await Program.deleteMany({ code: /^PRG-P61-/ });
    await Student.deleteMany({ registrationNumber: /^BEN-P61-/ });
    await ProgramEnrollment.deleteMany({ ngoId: ngoBId });
    await User.deleteMany({ email: /^admin-b-p61-/ });
    if (ngoBId) await Ngo.deleteOne({ _id: ngoBId });
    await teardownTestEnvironment();
  }

  const passedCount = results.filter((r) => r.passed).length;
  const totalCount = results.length;
  console.log('\n================================================================');
  console.log(`PHASE 6.1 TEST SUITE: ${passedCount} / ${totalCount} TESTS PASSED! ${passedCount === totalCount ? '✅' : '❌'}`);
  console.log('================================================================\n');

  if (passedCount !== totalCount) {
    process.exit(1);
  }
};

runPhase61Tests();

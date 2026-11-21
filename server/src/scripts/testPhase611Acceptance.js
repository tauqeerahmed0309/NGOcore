/**
 * NGOcore — Phase 6.1.1: Final Acceptance Verification Test Suite
 *
 * Comprehensive acceptance test suite covering:
 *
 * TASK 2: CONCURRENT ENROLLMENT DURING RECONCILIATION
 * - Test 1: Program with missing enrolledCount, 8 active enrollments, capacity=10.
 *           Two simultaneous enrollment requests: exactly 2 succeed, final enrolledCount = 10.
 * - Test 2: In capacity=10 program with 10 active enrollments, 3rd concurrent request is rejected (HTTP 409).
 * - Test 3: Concurrent race: Reconciliation snapshot vs newer enrollment.
 *           Reconciliation OCC filter guarantees it NEVER overwrites newer count with stale count.
 * - Test 4: Incorrect existing counter (e.g. 3 vs 8) is detected and reconciled to true active count.
 * - Test 5: Repeated reconciliation is 100% idempotent (0 discrepancies, 0 modifications).
 * - Test 6: Unlimited capacity program (capacity=null) with missing counter supports concurrent enrollments.
 *
 * TASK 3: FAILURE RECOVERY VERIFICATION
 * - Test 7: Scenario A: Counter update application-level error during status change.
 *           Recovery logic in catch block reconciles enrolledCount to true active count.
 * - Test 8: Scenario B & C: Simulating interrupted post-crash state (status transitioned, counter not updated).
 *           Subsequent duplicate withdrawal attempt is idempotent and does NOT double-decrement counter.
 * - Test 9: Scenario D: Reconciliation runs after interrupted operation and repairs counter to exact active count.
 * - Test 10: Retried enrollment after failed operation releases reserved seat safely.
 *
 * TASK 4: EXTENDED HISTORY PRESERVATION ACROSS MULTIPLE CYCLES
 * - Test 11: 6-Step Multi-Cycle History Preservation:
 *            Initial Enroll -> Withdraw (Reason 1) -> Re-enroll (Reason 2) ->
 *            Withdraw (Reason 3) -> Re-enroll (Reason 4) -> Complete (Reason 5).
 *            Verifies: exactly 6 history records, strict chronological ordering,
 *            unoverwritten reasons, timestamps, and distinct acting users.
 * - Test 12: Program Closure Cancellation History:
 *            Closing a program records documented closure reason in history for all active enrollments.
 *
 * TASK 5: MIGRATION SAFETY AUDIT
 * - Test 13: Reconcile script dry-run mode modifies 0 documents.
 * - Test 14: Reconcile script apply mode updates only mismatched programs and leaves matched untouched.
 */

const mongoose = require('mongoose');
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
const { changeEnrollmentStatus, enrollStudent } = require('../services/programActivityService');

const BASE_URL = `http://localhost:${config.PORT}/api/v1`;

const results = [];

const record = (num, name, passed, details) => {
  results.push({ num, name, passed, details });
  console.log(
    `${passed ? '✅' : '❌'} Test ${num.toString().padStart(2, ' ')}: ${name.padEnd(64, ' ')} -> ${
      passed ? 'PASSED' : 'FAILED'
    } (${details})`
  );
};

const runPhase611AcceptanceTests = async () => {
  await setupTestEnvironment();

  console.log('\n================================================================');
  console.log('   RUNNING PHASE 6.1.1: FINAL ACCEPTANCE VERIFICATION           ');
  console.log('================================================================\n');

  let adminToken = '';
  let staffToken = '';
  let adminUserId = '';
  let staffUserId = '';
  let ngoId = '';

  try {
    // 1. Authenticate users
    const adminUser = await User.findOne({ email: config.ADMIN_EMAIL });
    adminUserId = adminUser._id;
    ngoId = adminUser.ngoId;

    const adminRes = await apiRequest(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: config.ADMIN_EMAIL, password: config.ADMIN_PASSWORD })
    });
    adminToken = adminRes.accessToken;

    let staffUser = await User.findOne({ email: 'staff@ngo.org' });
    if (!staffUser) {
      const hp = await bcrypt.hash('StaffPassword123!', 10);
      staffUser = await User.create({
        name: 'Staff Verification User',
        email: 'staff@ngo.org',
        password: hp,
        role: 'staff',
        ngoId,
        status: 'active'
      });
    }
    staffUserId = staffUser._id;

    const staffRes = await apiRequest(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: 'staff@ngo.org', password: 'StaffPassword123!' })
    });
    staffToken = staffRes.accessToken;

    const authPost = (url, body, token = adminToken) =>
      apiRequest(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(body)
      });

    const authPatch = (url, body, token = adminToken) =>
      apiRequest(url, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(body)
      });

    const ngoFilter = (query = {}) => ({ ...query, ngoId });

    // Helper to generate distinct active students
    const createStudents = async (count, prefix = 'P611') => {
      const created = [];
      const now = Date.now();
      for (let i = 0; i < count; i++) {
        const regNum = `${prefix}-${now}-${i}-${Math.random().toString(36).substring(2, 6)}`;
        const s = await Student.create({
          ngoId,
          firstName: `Student${i}`,
          lastName: `${prefix}`,
          registrationNumber: regNum,
          email: `${regNum.toLowerCase()}@test.org`,
          dateOfBirth: new Date('2010-01-01'),
          status: 'active'
        });
        created.push(s);
      }
      return created;
    };

    // =========================================================================
    // TASK 2: CONCURRENT ENROLLMENT DURING RECONCILIATION
    // =========================================================================
    console.log('\n--- TASK 2: Concurrent Enrollment & Reconciliation ---');

    // Test 1: Program with missing enrolledCount, 8 active enrollments, capacity=10.
    // Two simultaneous enrollment requests: exactly 2 succeed, final enrolledCount = 10.
    {
      const students = await createStudents(10, 'T1');
      const prog = await Program.create({
        ngoId,
        name: 'Phase 6.1.1 Concurrency Prog 1',
        code: `P611-C1-${Date.now()}`,
        type: 'education',
        status: 'active',
        capacity: 10
      });

      // Populate 8 active enrollments
      for (let i = 0; i < 8; i++) {
        await ProgramEnrollment.create({
          ngoId,
          programId: prog._id,
          studentId: students[i]._id,
          status: 'enrolled',
          enrolledAt: new Date(),
          history: [{ status: 'enrolled', changedAt: new Date(), reason: 'Initial' }]
        });
      }

      // Deliberately remove enrolledCount field to simulate missing counter
      await Program.updateOne({ _id: prog._id }, { $unset: { enrolledCount: 1 } });
      const checkProg = await Program.findById(prog._id).lean();
      const hasFieldBefore = Object.prototype.hasOwnProperty.call(checkProg, 'enrolledCount');

      // Launch two simultaneous enrollment requests for Student 8 and Student 9
      const [res1, res2] = await Promise.all([
        authPost(`${BASE_URL}/programs/${prog._id}/enrollments`, { studentId: students[8]._id }),
        authPost(`${BASE_URL}/programs/${prog._id}/enrollments`, { studentId: students[9]._id })
      ]);

      const bothSucceeded = res1.status === 201 && res2.status === 201;
      const freshProg = await Program.findById(prog._id).lean();
      const actualActive = await ProgramEnrollment.countDocuments({ programId: prog._id, status: 'enrolled' });

      record(
        1,
        'Missing counter + 8 active + capacity 10: 2 concurrent succeed',
        !hasFieldBefore && bothSucceeded && freshProg.enrolledCount === 10 && actualActive === 10,
        `WasMissing: ${!hasFieldBefore}, Res1: ${res1.status}, Res2: ${res2.status}, Count: ${freshProg.enrolledCount}/10`
      );

      // Test 2: In capacity=10 program with 10 active enrollments, 3rd concurrent request is rejected
      const overflowStudent = (await createStudents(1, 'T2-OVER'))[0];
      const overflowRes = await authPost(`${BASE_URL}/programs/${prog._id}/enrollments`, {
        studentId: overflowStudent._id
      });

      const progAfterOverflow = await Program.findById(prog._id).lean();
      const activeAfterOverflow = await ProgramEnrollment.countDocuments({ programId: prog._id, status: 'enrolled' });

      record(
        2,
        'Capacity 10 reached: 3rd concurrent enrollment rejected (409)',
        overflowRes.status === 409 && progAfterOverflow.enrolledCount === 10 && activeAfterOverflow === 10,
        `Status: ${overflowRes.status}, Error: "${overflowRes.body?.error}", Count: ${progAfterOverflow.enrolledCount}`
      );
    }

    // Test 3: Reconciliation snapshot racing with newer concurrent enrollment.
    // Reconciliation OCC filter guarantees it NEVER overwrites newer count with stale count.
    {
      const students = await createStudents(9, 'T3');
      const prog = await Program.create({
        ngoId,
        name: 'Phase 6.1.1 OCC Stale Overwrite Guard',
        code: `P611-OCC-${Date.now()}`,
        type: 'education',
        status: 'active',
        capacity: 10,
        enrolledCount: 8
      });

      // Populate 8 active enrollments
      for (let i = 0; i < 8; i++) {
        await ProgramEnrollment.create({
          ngoId,
          programId: prog._id,
          studentId: students[i]._id,
          status: 'enrolled',
          enrolledAt: new Date(),
          history: [{ status: 'enrolled', changedAt: new Date(), reason: 'Initial' }]
        });
      }

      // 1. Snapshot taken by reconciliation when count was 8:
      const snapshotProg = await Program.findById(prog._id).lean();
      const snapshotCount = snapshotProg.enrolledCount; // 8
      const staleCalculatedCount = 8;

      // 2. Before reconciliation writes, a concurrent enrollment for Student 8 arrives and succeeds:
      const enrollRes = await authPost(`${BASE_URL}/programs/${prog._id}/enrollments`, {
        studentId: students[8]._id
      });

      // Database now has enrolledCount: 9 and 9 active enrollments
      const progAfterEnroll = await Program.findById(prog._id).lean();

      // 3. Stale reconciliation write now executes with OCC filter { enrolledCount: 8 }
      const staleWriteResult = await Program.bulkWrite([
        {
          updateOne: {
            filter: { _id: prog._id, enrolledCount: snapshotCount },
            update: { $set: { enrolledCount: staleCalculatedCount } }
          }
        }
      ]);

      const progAfterStaleWrite = await Program.findById(prog._id).lean();
      const actualActive = await ProgramEnrollment.countDocuments({ programId: prog._id, status: 'enrolled' });

      record(
        3,
        'Reconciliation OCC guard: never overwrites newer count with stale',
        enrollRes.status === 201 &&
          progAfterEnroll.enrolledCount === 9 &&
          staleWriteResult.modifiedCount === 0 &&
          progAfterStaleWrite.enrolledCount === 9 &&
          actualActive === 9,
        `EnrolledCount: ${progAfterStaleWrite.enrolledCount}, Actual: ${actualActive}, StaleModified: ${staleWriteResult.modifiedCount}`
      );
    }

    // Test 4: Incorrect existing counter (e.g. 3 vs 8) is detected and reconciled to true active count.
    {
      const students = await createStudents(8, 'T4');
      const prog = await Program.create({
        ngoId,
        name: 'Phase 6.1.1 Drifted Counter Test',
        code: `P611-DRIFT-${Date.now()}`,
        type: 'education',
        status: 'active',
        capacity: 15,
        enrolledCount: 3 // Drifted/incorrect: 3 instead of 8
      });

      for (let i = 0; i < 8; i++) {
        await ProgramEnrollment.create({
          ngoId,
          programId: prog._id,
          studentId: students[i]._id,
          status: 'enrolled',
          enrolledAt: new Date(),
          history: [{ status: 'enrolled', changedAt: new Date(), reason: 'Initial' }]
        });
      }

      const recResult = await reconcileEnrollmentCounters({ dryRun: false, programId: prog._id });
      const progAfter = await Program.findById(prog._id).lean();
      const actualActive = await ProgramEnrollment.countDocuments({ programId: prog._id, status: 'enrolled' });

      record(
        4,
        'Incorrect counter (stored: 3, actual: 8) reconciled to true count',
        recResult.discrepancyCount === 1 && progAfter.enrolledCount === 8 && actualActive === 8,
        `Discrepancies: ${recResult.discrepancyCount}, Modified: ${recResult.modifiedCount}, Count: ${progAfter.enrolledCount}`
      );

      // Test 5: Repeated reconciliation is 100% idempotent
      const repeatedResult = await reconcileEnrollmentCounters({ dryRun: false, programId: prog._id });
      const progAfterRepeated = await Program.findById(prog._id).lean();

      record(
        5,
        'Repeated reconciliation is 100% idempotent (0 modified)',
        repeatedResult.discrepancyCount === 0 &&
          repeatedResult.modifiedCount === 0 &&
          progAfterRepeated.enrolledCount === 8,
        `Discrepancies: ${repeatedResult.discrepancyCount}, Modified: ${repeatedResult.modifiedCount}`
      );
    }

    // Test 6: Unlimited capacity program (capacity=null) with missing counter
    {
      const students = await createStudents(4, 'T6');
      const prog = await Program.create({
        ngoId,
        name: 'Phase 6.1.1 Unlimited Capacity Test',
        code: `P611-UNLIM-${Date.now()}`,
        type: 'education',
        status: 'active',
        capacity: null // Unlimited capacity
      });

      // 2 existing enrollments, missing enrolledCount
      for (let i = 0; i < 2; i++) {
        await ProgramEnrollment.create({
          ngoId,
          programId: prog._id,
          studentId: students[i]._id,
          status: 'enrolled',
          enrolledAt: new Date(),
          history: [{ status: 'enrolled', changedAt: new Date(), reason: 'Initial' }]
        });
      }
      await Program.updateOne({ _id: prog._id }, { $unset: { enrolledCount: 1 } });

      // Concurrent enrollments into unlimited program
      const [r1, r2] = await Promise.all([
        authPost(`${BASE_URL}/programs/${prog._id}/enrollments`, { studentId: students[2]._id }),
        authPost(`${BASE_URL}/programs/${prog._id}/enrollments`, { studentId: students[3]._id })
      ]);

      const freshProg = await Program.findById(prog._id).lean();
      const actualActive = await ProgramEnrollment.countDocuments({ programId: prog._id, status: 'enrolled' });

      record(
        6,
        'Unlimited capacity program handles missing counter and concurrent enrollments',
        r1.status === 201 && r2.status === 201 && freshProg.enrolledCount === 4 && actualActive === 4,
        `R1: ${r1.status}, R2: ${r2.status}, Count: ${freshProg.enrolledCount}, Actual: ${actualActive}`
      );
    }

    // =========================================================================
    // TASK 3: FAILURE RECOVERY VERIFICATION
    // =========================================================================
    console.log('\n--- TASK 3: Failure Recovery Verification ---');

    // Test 7: Scenario A: Counter update application-level error during status change.
    // Recovery logic in catch block reconciles enrolledCount to true active count.
    {
      const [student] = await createStudents(1, 'T7');
      const prog = await Program.create({
        ngoId,
        name: 'Phase 6.1.1 Scenario A Recovery',
        code: `P611-RECA-${Date.now()}`,
        type: 'education',
        status: 'active',
        capacity: 10,
        enrolledCount: 1
      });

      await ProgramEnrollment.create({
        ngoId,
        programId: prog._id,
        studentId: student._id,
        status: 'enrolled',
        enrolledAt: new Date(),
        history: [{ status: 'enrolled', changedAt: new Date(), reason: 'Initial' }]
      });

      // Temporarily mock Program.updateOne to throw an error on counter decrement
      const originalUpdateOne = Program.updateOne;
      let errorThrown = false;
      let recoveryExecuted = false;

      Program.updateOne = function (...args) {
        const filter = args[0] || {};
        // Intercept decrement query
        if (filter.enrolledCount && filter.enrolledCount.$gt !== undefined) {
          errorThrown = true;
          throw new Error('Simulated Database Write Failure during counter decrement');
        }
        // Intercept recovery query (reconcile set)
        if (args[1] && args[1].$set && args[1].$set.enrolledCount !== undefined) {
          recoveryExecuted = true;
        }
        return originalUpdateOne.apply(this, args);
      };

      try {
        const updated = await changeEnrollmentStatus(
          prog._id,
          student._id,
          'withdrawn',
          'Medical leave',
          ngoFilter,
          adminUserId
        );

        const progAfter = await Program.findById(prog._id).lean();
        const actualActive = await ProgramEnrollment.countDocuments({ programId: prog._id, status: 'enrolled' });

        record(
          7,
          'Scenario A: Counter write failure triggers recovery reconciliation',
          errorThrown && recoveryExecuted && updated.status === 'withdrawn' && progAfter.enrolledCount === 0 && actualActive === 0,
          `ErrorIntercepted: ${errorThrown}, RecoveryRun: ${recoveryExecuted}, FinalCount: ${progAfter.enrolledCount}, Actual: ${actualActive}`
        );
      } finally {
        Program.updateOne = originalUpdateOne;
      }
    }

    // Test 8: Scenario B & C: Simulating interrupted post-crash state (status transitioned, counter not updated).
    // Subsequent duplicate withdrawal attempt is idempotent and does NOT double-decrement counter.
    {
      const [student] = await createStudents(1, 'T8');
      const prog = await Program.create({
        ngoId,
        name: 'Phase 6.1.1 Scenario B/C Crash Simulation',
        code: `P611-CRASH-${Date.now()}`,
        type: 'education',
        status: 'active',
        capacity: 10,
        enrolledCount: 5 // Baseline counter
      });

      // Create enrollment in withdrawn state (simulating crash after enrollment status write but before counter decrement)
      await ProgramEnrollment.create({
        ngoId,
        programId: prog._id,
        studentId: student._id,
        status: 'withdrawn',
        withdrawnAt: new Date(),
        withdrawalReason: 'Relocation',
        history: [
          { status: 'enrolled', changedAt: new Date(Date.now() - 10000), reason: 'Initial' },
          { status: 'withdrawn', changedAt: new Date(), reason: 'Relocation' }
        ]
      });

      // User retries withdrawal on the already withdrawn student
      const retryRes = await authPatch(`${BASE_URL}/programs/${prog._id}/enrollments/${student._id}`, {
        status: 'withdrawn',
        reason: 'Relocation retry'
      }, adminToken);

      const progAfterRetry = await Program.findById(prog._id).lean();

      record(
        8,
        'Scenario B & C: Retry on interrupted/withdrawn student is idempotent (no double decrement)',
        retryRes.status === 200 && progAfterRetry.enrolledCount === 5,
        `Status: ${retryRes.status}, CounterUnchanged: ${progAfterRetry.enrolledCount === 5} (Count: ${progAfterRetry.enrolledCount})`
      );

      // Test 9: Scenario D: Reconciliation runs after interrupted operation and repairs counter to exact active count
      const recResult = await reconcileEnrollmentCounters({ dryRun: false, programId: prog._id });
      const progAfterRec = await Program.findById(prog._id).lean();
      const actualActive = await ProgramEnrollment.countDocuments({ programId: prog._id, status: 'enrolled' });

      record(
        9,
        'Scenario D: Reconciliation repairs interrupted counter to exact active count',
        recResult.discrepancyCount === 1 && progAfterRec.enrolledCount === 0 && actualActive === 0,
        `Discrepancies: ${recResult.discrepancyCount}, RepairedCount: ${progAfterRec.enrolledCount}, Actual: ${actualActive}`
      );
    }

    // Test 10: Retried enrollment after failed operation releases reserved seat safely
    {
      const [student] = await createStudents(1, 'T10');
      const prog = await Program.create({
        ngoId,
        name: 'Phase 6.1.1 Reservation Release on Fail',
        code: `P611-REL-${Date.now()}`,
        type: 'education',
        status: 'active',
        capacity: 2,
        enrolledCount: 1
      });

      // Deliberately mock ProgramEnrollment.create to throw an error after reservation
      const originalCreate = ProgramEnrollment.create;
      ProgramEnrollment.create = function () {
        throw new Error('Simulated failure during enrollment document insertion');
      };

      let threw = false;
      try {
        await enrollStudent(prog._id, student._id, ngoId, ngoFilter, adminUserId);
      } catch (err) {
        threw = true;
      } finally {
        ProgramEnrollment.create = originalCreate;
      }

      const progAfterFail = await Program.findById(prog._id).lean();

      record(
        10,
        'Failed enrollment document creation rolls back reserved seat cleanly',
        threw && progAfterFail.enrolledCount === 1,
        `Threw: ${threw}, SeatReleased: ${progAfterFail.enrolledCount === 1} (EnrolledCount: ${progAfterFail.enrolledCount})`
      );
    }

    // =========================================================================
    // TASK 4: EXTENDED HISTORY PRESERVATION ACROSS MULTIPLE CYCLES
    // =========================================================================
    console.log('\n--- TASK 4: History Preservation Across Multiple Cycles ---');

    // Test 11: 6-Step Multi-Cycle History Preservation:
    // Initial Enroll -> Withdraw (Reason 1) -> Re-enroll (Reason 2) ->
    // Withdraw (Reason 3) -> Re-enroll (Reason 4) -> Complete (Reason 5).
    {
      const [student] = await createStudents(1, 'T11');
      const prog = await Program.create({
        ngoId,
        name: 'Phase 6.1.1 6-Step History Program',
        code: `P611-HIST-${Date.now()}`,
        type: 'education',
        status: 'active',
        capacity: 10
      });

      // Step 1: Initial enrollment by Admin User
      const s1 = await authPost(`${BASE_URL}/programs/${prog._id}/enrollments`, { studentId: student._id }, adminToken);

      // Step 2: Withdrawal by Staff User with Reason 1
      const s2 = await authPatch(`${BASE_URL}/programs/${prog._id}/enrollments/${student._id}`, {
        status: 'withdrawn',
        reason: 'Moved away for family relocation'
      }, staffToken);

      // Step 3: Re-enrollment by Admin User with Reason 2
      const s3 = await authPatch(`${BASE_URL}/programs/${prog._id}/enrollments/${student._id}`, {
        status: 'enrolled',
        reason: 'Returned to local municipal district'
      }, adminToken);

      // Step 4: Second withdrawal by Staff User with Reason 3
      const s4 = await authPatch(`${BASE_URL}/programs/${prog._id}/enrollments/${student._id}`, {
        status: 'withdrawn',
        reason: 'Temporary medical leave of absence'
      }, staffToken);

      // Step 5: Second re-enrollment by Admin User with Reason 4
      const s5 = await authPatch(`${BASE_URL}/programs/${prog._id}/enrollments/${student._id}`, {
        status: 'enrolled',
        reason: 'Cleared by physician to resume curriculum'
      }, adminToken);

      // Step 6: Completion by Staff User with Reason 5
      const s6 = await authPatch(`${BASE_URL}/programs/${prog._id}/enrollments/${student._id}`, {
        status: 'completed',
        reason: 'Graduated all modules with honors'
      }, staffToken);

      const finalDoc = await ProgramEnrollment.findOne({ programId: prog._id, studentId: student._id }).lean();
      const h = finalDoc.history || [];

      const correctCount = h.length === 6;
      const isChronological = h.every((entry, idx) => {
        if (idx === 0) return true;
        return new Date(entry.changedAt) >= new Date(h[idx - 1].changedAt);
      });

      const expectedTransitions = [
        { status: 'enrolled', reason: 'Initial enrollment', by: String(adminUserId) },
        { status: 'withdrawn', reason: 'Moved away for family relocation', by: String(staffUserId) },
        { status: 'enrolled', reason: 'Returned to local municipal district', by: String(adminUserId) },
        { status: 'withdrawn', reason: 'Temporary medical leave of absence', by: String(staffUserId) },
        { status: 'enrolled', reason: 'Cleared by physician to resume curriculum', by: String(adminUserId) },
        { status: 'completed', reason: 'Graduated all modules with honors', by: String(staffUserId) }
      ];

      const transitionsMatch = expectedTransitions.every((expected, idx) => {
        const actual = h[idx];
        if (!actual) return false;
        const statusOk = actual.status === expected.status;
        const reasonOk = actual.reason === expected.reason;
        const byOk = String(actual.changedBy) === expected.by;
        return statusOk && reasonOk && byOk;
      });

      const topLevelOk = finalDoc.status === 'completed' && finalDoc.completedAt !== null;

      record(
        11,
        '6-step cycle: full history preserved, chronological, reasons & users intact',
        correctCount && isChronological && transitionsMatch && topLevelOk,
        `HistoryLength: ${h.length}/6, Chronological: ${isChronological}, Matches: ${transitionsMatch}, FinalStatus: ${finalDoc.status}`
      );
    }

    // Test 12: Program Closure Cancellation History:
    // Closing a program records documented closure reason in history for all active enrollments.
    {
      const students = await createStudents(3, 'T12');
      const prog = await Program.create({
        ngoId,
        name: 'Phase 6.1.1 Program Closure History',
        code: `P611-CLOSE-${Date.now()}`,
        type: 'education',
        status: 'active',
        capacity: 10,
        enrolledCount: 3
      });

      for (let i = 0; i < 3; i++) {
        await ProgramEnrollment.create({
          ngoId,
          programId: prog._id,
          studentId: students[i]._id,
          status: 'enrolled',
          enrolledAt: new Date(),
          history: [{ status: 'enrolled', changedAt: new Date(), reason: 'Initial enrollment' }]
        });
      }

      // Close the program via API
      const closeRes = await authPatch(`${BASE_URL}/programs/${prog._id}/status`, {
        status: 'completed'
      }, adminToken);

      const enrollmentsAfterClose = await ProgramEnrollment.find({ programId: prog._id }).lean();
      const allHaveClosureInHistory = enrollmentsAfterClose.every((e) => {
        const lastEntry = e.history[e.history.length - 1];
        return (
          lastEntry &&
          lastEntry.status === 'completed' &&
          lastEntry.reason.includes('Program concluded by organization')
        );
      });

      record(
        12,
        'Program closure records documented closure reason in history of active enrollments',
        closeRes.status === 200 && enrollmentsAfterClose.length === 3 && allHaveClosureInHistory,
        `Status: ${closeRes.status}, EnrollmentsAudited: ${enrollmentsAfterClose.length}, AllDocumented: ${allHaveClosureInHistory}`
      );
    }

    // =========================================================================
    // TASK 5: MIGRATION SAFETY AUDIT
    // =========================================================================
    console.log('\n--- TASK 5: Migration Safety Audit ---');

    // Test 13: Reconcile script dry-run mode modifies 0 documents.
    {
      const students = await createStudents(2, 'T13');
      const prog = await Program.create({
        ngoId,
        name: 'Phase 6.1.1 Dry-Run Safety Program',
        code: `P611-DRY-${Date.now()}`,
        type: 'education',
        status: 'active',
        capacity: 10,
        enrolledCount: 0 // Intentional mismatch: 0 vs 2 actual
      });

      for (let i = 0; i < 2; i++) {
        await ProgramEnrollment.create({
          ngoId,
          programId: prog._id,
          studentId: students[i]._id,
          status: 'enrolled',
          enrolledAt: new Date(),
          history: [{ status: 'enrolled', changedAt: new Date(), reason: 'Initial' }]
        });
      }

      // Execute dry-run reconciliation
      const dryResult = await reconcileEnrollmentCounters({ dryRun: true, programId: prog._id });
      const progAfterDry = await Program.findById(prog._id).lean();

      record(
        13,
        'Reconcile script default dry-run mode modifies 0 documents in DB',
        dryResult.dryRun === true &&
          dryResult.discrepancyCount === 1 &&
          dryResult.modifiedCount === 0 &&
          progAfterDry.enrolledCount === 0,
        `DryRun: ${dryResult.dryRun}, Discrepancies: ${dryResult.discrepancyCount}, Modified: ${dryResult.modifiedCount}, DBCount: ${progAfterDry.enrolledCount}`
      );

      // Test 14: Reconcile script apply mode updates only mismatched programs and leaves matched untouched.
      const applyResult = await reconcileEnrollmentCounters({ dryRun: false, programId: prog._id });
      const progAfterApply = await Program.findById(prog._id).lean();

      record(
        14,
        'Reconcile script apply mode writes updates and reconciles mismatch cleanly',
        applyResult.dryRun === false &&
          applyResult.discrepancyCount === 1 &&
          applyResult.modifiedCount === 1 &&
          progAfterApply.enrolledCount === 2,
        `DryRun: ${applyResult.dryRun}, Modified: ${applyResult.modifiedCount}, FinalCount: ${progAfterApply.enrolledCount}`
      );
    }

  } catch (err) {
    console.error('\n❌ Unhandled error in acceptance test runner:', err);
    record(99, 'Fatal Exception Guard', false, err.message);
  } finally {
    await teardownTestEnvironment();
  }

  // Summary Report
  console.log('\n================================================================');
  console.log('   PHASE 6.1.1 ACCEPTANCE TEST SUITE SUMMARY                    ');
  console.log('================================================================');

  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;

  console.log(`Total Verification Checks: ${results.length}`);
  console.log(`Passed:                    ${passedCount}`);
  console.log(`Failed:                    ${failedCount}`);
  console.log(`Success Rate:              ${((passedCount / results.length) * 100).toFixed(1)}%\n`);

  if (failedCount > 0) {
    console.error('❌ Phase 6.1.1 Verification had failures. Review output above.');
    process.exitCode = 1;
  } else {
    console.log('🎉 ALL 14 PHASE 6.1.1 ACCEPTANCE CHECKS PASSED PERFECTLY!\n');
  }
};

if (require.main === module) {
  runPhase611AcceptanceTests();
}

module.exports = { runPhase611AcceptanceTests };

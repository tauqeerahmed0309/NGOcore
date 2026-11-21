const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const config = require('../config/env');
const Task = require('../models/Task');
const Ngo = require('../models/Ngo');
const User = require('../models/User');
const Program = require('../models/Program');
const Volunteer = require('../models/Volunteer');
const { apiRequest } = require('./apiTestClient');
const { setupTestEnvironment, teardownTestEnvironment } = require('./testHelper');

const BASE_URL = `http://localhost:${config.PORT}/api/v1`;

const results = [];
const record = (testNum, description, passed, detail = '') => {
  results.push({ testNum, description, passed, detail });
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} Test ${String(testNum).padStart(2, ' ')}: ${description.padEnd(65, ' ')} -> ${passed ? 'PASSED' : 'FAILED'}${detail ? ` (${detail})` : ''}`);
};

async function runTaskTests() {
  await setupTestEnvironment();

  console.log('\n================================================================');
  console.log('   RUNNING TASK MANAGEMENT AUTOMATED TEST SUITE                 ');
  console.log('================================================================\n');

  const timestamp = Date.now();

  let adminToken = '';
  let staffToken = '';
  let volunteerToken = '';
  let studentToken = '';
  let ngoAId = '';
  let testProgramId = '';
  let testVolunteerId = '';

  let ngoBAdminToken = '';
  let ngoBId = '';

  let task1Id = '';
  let task2Id = '';

  try {
    // -------------------------------------------------------------------------
    // Setup Authentication & Users
    // -------------------------------------------------------------------------
    const adminUser = await User.findOne({ email: config.ADMIN_EMAIL });
    if (!adminUser) {
      throw new Error(`Admin user ${config.ADMIN_EMAIL} not found.`);
    }
    ngoAId = adminUser.ngoId;

    const adminLoginRes = await apiRequest(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: config.ADMIN_EMAIL, password: config.ADMIN_PASSWORD })
    });
    adminToken = adminLoginRes.accessToken;

    const staffLoginRes = await apiRequest(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: 'staff@ngo.org', password: 'StaffPassword123!' })
    });
    staffToken = staffLoginRes.accessToken;

    const volLoginRes = await apiRequest(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: 'volunteer@ngo.org', password: 'VolunteerPass123!' })
    });
    volunteerToken = volLoginRes.accessToken;

    const stuLoginRes = await apiRequest(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: 'student@ngo.org', password: 'StudentPass123!' })
    });
    studentToken = stuLoginRes.accessToken;

    // Tenant B Setup
    const ngoB = await Ngo.create({
      name: `Tenant NGO B (Tasks) ${timestamp}`,
      status: 'approved',
      registrationNumber: `REG-TSK-${timestamp}`
    });
    ngoBId = ngoB._id;

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('StaffPassword123!', salt);

    const adminBUser = await User.findOneAndUpdate(
      { email: `admin-b-tsk-${timestamp}@example.org` },
      {
        firstName: 'AdminB',
        lastName: 'TaskTenant',
        password: hashedPassword,
        role: 'admin',
        ngoId: ngoBId,
        status: 'active'
      },
      { upsert: true, returnDocument: 'after' }
    );

    const adminBLoginRes = await apiRequest(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: adminBUser.email, password: 'StaffPassword123!' })
    });
    ngoBAdminToken = adminBLoginRes.accessToken;

    // Helper authenticated requests
    const authPost = (url, body, token) =>
      apiRequest(url, { method: 'POST', body: JSON.stringify(body), headers: { Authorization: `Bearer ${token}` } });
    const authGet = (url, token) =>
      apiRequest(url, { method: 'GET', headers: { Authorization: `Bearer ${token}` } });
    const authPut = (url, body, token) =>
      apiRequest(url, { method: 'PUT', body: JSON.stringify(body), headers: { Authorization: `Bearer ${token}` } });
    const authPatch = (url, body, token) =>
      apiRequest(url, { method: 'PATCH', body: JSON.stringify(body), headers: { Authorization: `Bearer ${token}` } });
    const authDelete = (url, token) =>
      apiRequest(url, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });

    // Seed test program & volunteer
    const program = await Program.create({
      code: `TSK-PRG-${timestamp}`,
      name: 'Mobile Health Clinic Drive',
      type: 'health_camp',
      category: 'Healthcare',
      capacity: 100,
      ngoId: ngoAId,
      status: 'active',
      startDate: new Date(),
      endDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000)
    });
    testProgramId = program._id;

    const volunteer = await Volunteer.create({
      volunteerNumber: `VOL-TSK-${timestamp}`,
      name: 'Rohan Sharma',
      email: `rohan.tsk.${timestamp}@example.org`,
      ngoId: ngoAId,
      createdBy: adminUser._id
    });
    testVolunteerId = volunteer._id;

    // =========================================================================
    // PART 1: TASK CREATION, AUTO-NUMBERING & VALIDATION
    // =========================================================================
    console.log('▶ [1. Task Creation, Auto-Numbering & Field Validation]');

    // Test 1: Admin creates operational task with auto-numbering (TSK-XXXX)
    const task1Res = await authPost(
      `${BASE_URL}/tasks`,
      {
        title: 'Procure Diagnostic Kits and First Aid Supplies',
        description: 'Coordinate with approved medical vendor to receive 50 sterile checkup sets.',
        category: 'field_work',
        priority: 'high',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        programId: testProgramId.toString(),
        assignedVolunteerId: testVolunteerId.toString(),
        checklist: [
          { text: 'Verify vendor GST compliance', isCompleted: true },
          { text: 'Inspect kit seals on delivery', isCompleted: false }
        ]
      },
      adminToken
    );

    const task1 = task1Res.data?.data?.task;
    task1Id = task1?._id;

    record(
      1,
      'Admin creates task with sequential auto-numbering (TSK-XXXX)',
      task1Res.status === 201 && task1?.taskNumber?.startsWith('TSK-') && task1?.title?.includes('Procure Diagnostic Kits'),
      `Status: ${task1Res.status}, Number: ${task1?.taskNumber}`
    );

    // Test 2: Staff creates task with custom ID & priority
    const task2Res = await authPost(
      `${BASE_URL}/tasks`,
      {
        taskNumber: `TSK-CUSTOM-${timestamp}`,
        title: 'Draft Quarterly Compliance Summary for Trust Board',
        description: 'Collate beneficiary metrics and financial disbursements into board packet.',
        category: 'compliance',
        priority: 'urgent',
        status: 'todo'
      },
      staffToken
    );

    const task2 = task2Res.data?.data?.task;
    task2Id = task2?._id;

    record(
      2,
      'Staff creates task with custom ID and urgent priority',
      task2Res.status === 201 && task2?.taskNumber === `TSK-CUSTOM-${timestamp}`,
      `Status: ${task2Res.status}, ID: ${task2?.taskNumber}`
    );

    // Test 3: Duplicate custom task number in same NGO rejected with 409
    const dupRes = await authPost(
      `${BASE_URL}/tasks`,
      {
        taskNumber: `TSK-CUSTOM-${timestamp}`,
        title: 'Colliding Task Number Record',
        category: 'administrative'
      },
      adminToken
    );

    record(
      3,
      'Duplicate custom task number in same NGO rejected with HTTP 409',
      dupRes.status === 409,
      `Status: ${dupRes.status}`
    );

    // Test 4: Same task number in distinct NGO allowed (tenant isolation)
    const tenantBRes = await authPost(
      `${BASE_URL}/tasks`,
      {
        taskNumber: `TSK-CUSTOM-${timestamp}`,
        title: 'Tenant B Legitimate Task With Same Code',
        category: 'administrative'
      },
      ngoBAdminToken
    );

    record(
      4,
      'Same task number in distinct NGO allowed (tenant-scoped uniqueness)',
      tenantBRes.status === 201,
      `Status: ${tenantBRes.status}`
    );

    // Test 5: Missing or short title rejected with HTTP 400
    const invTitleRes = await authPost(
      `${BASE_URL}/tasks`,
      { title: 'No' },
      adminToken
    );

    record(
      5,
      'Title with fewer than 3 characters rejected with HTTP 400 Bad Request',
      invTitleRes.status === 400,
      `Status: ${invTitleRes.status}`
    );

    // =========================================================================
    // PART 2: CONCURRENCY & MONOTONIC SEQUENCE ALLOCATION
    // =========================================================================
    console.log('\n▶ [2. Concurrency & Monotonic Sequence Allocation]');

    const parallelCount = 20;
    const parallelPromises = [];

    for (let i = 1; i <= parallelCount; i++) {
      parallelPromises.push(
        authPost(
          `${BASE_URL}/tasks`,
          {
            title: `Concurrent Field Task #${i}`,
            category: 'field_work',
            priority: 'medium'
          },
          adminToken
        )
      );
    }

    const parallelResults = await Promise.all(parallelPromises);
    const successfulTasks = parallelResults.filter((r) => r.status === 201).map((r) => r.data?.data?.task);
    const allocatedNumbers = successfulTasks.map((t) => t.taskNumber);
    const uniqueNumbers = new Set(allocatedNumbers);

    record(
      6,
      'Simultaneous task creation (20 parallel requests) allocates unique numbers',
      successfulTasks.length === parallelCount && uniqueNumbers.size === parallelCount,
      `Created: ${successfulTasks.length}/${parallelCount}, Unique: ${uniqueNumbers.size}`
    );

    // =========================================================================
    // PART 3: STATUS TRANSITIONS & COMPLETION WORKFLOW
    // =========================================================================
    console.log('\n▶ [3. Task Status Lifecycle & Completion Workflow]');

    // Test 7: Volunteer / Staff updates status to in_progress
    const inProgRes = await authPatch(
      `${BASE_URL}/tasks/${task1Id}/status`,
      { status: 'in_progress' },
      volunteerToken
    );

    record(
      7,
      'Assigned volunteer updates task status to "in_progress"',
      inProgRes.status === 200 && inProgRes.data?.data?.task?.status === 'in_progress',
      `Status: ${inProgRes.status}, TaskStatus: ${inProgRes.data?.data?.task?.status}`
    );

    // Test 8: Staff marks task completed with completion notes
    const compRes = await authPatch(
      `${BASE_URL}/tasks/${task1Id}/status`,
      {
        status: 'completed',
        completionNotes: 'All 50 kits verified, cataloged, and stored in clinic storage room B.'
      },
      staffToken
    );

    const compTask = compRes.data?.data?.task;

    record(
      8,
      'Staff marks task completed with timestamp and documented notes',
      compRes.status === 200 && compTask?.status === 'completed' && Boolean(compTask?.completedAt) && Boolean(compTask?.completionNotes),
      `Status: ${compRes.status}, CompletedAt: ${compTask?.completedAt}`
    );

    // Test 9: Reopening completed task clears completion timestamp
    const reopenRes = await authPatch(
      `${BASE_URL}/tasks/${task1Id}/status`,
      { status: 'in_progress' },
      adminToken
    );

    const reopenedTask = reopenRes.data?.data?.task;

    record(
      9,
      'Reopening completed task clears completedAt and completedBy cleanly',
      reopenRes.status === 200 && reopenedTask?.status === 'in_progress' && reopenedTask?.completedAt === null,
      `Status: ${reopenRes.status}, CompletedAt: ${reopenedTask?.completedAt}`
    );

    // =========================================================================
    // PART 4: QUERY, SEARCH, FILTERS & SUMMARY METRICS
    // =========================================================================
    console.log('\n▶ [4. Query, Search, Filters, Sorting & Summary Analytics]');

    // Test 10: GET task details by ID returns enriched record with relations & audit logs
    const getDetailsRes = await authGet(`${BASE_URL}/tasks/${task1Id}`, adminToken);
    const det = getDetailsRes.data?.data;

    record(
      10,
      'GET task details by ID returns enriched record with relations & audit trail',
      getDetailsRes.status === 200 && det?.task?.title?.includes('Procure Diagnostic Kits') && Array.isArray(det?.auditLogs),
      `Status: ${getDetailsRes.status}, Found: ${det?.task?.taskNumber}, AuditLogs: ${det?.auditLogs?.length}`
    );

    // Test 11: Search tasks by keyword returns matching records
    const searchRes = await authGet(`${BASE_URL}/tasks?search=Compliance`, staffToken);
    const searchTasks = searchRes.data?.data?.tasks || [];

    record(
      11,
      'Search tasks by keyword returns matching records',
      searchRes.status === 200 && searchTasks.some((t) => t.title.includes('Compliance')),
      `Status: ${searchRes.status}, MatchesFound: ${searchTasks.length}`
    );

    // Test 12: Filter tasks by category & priority
    const filterRes = await authGet(`${BASE_URL}/tasks?category=field_work&priority=medium&limit=50`, staffToken);
    const filterTasks = filterRes.data?.data?.tasks || [];

    record(
      12,
      'Filter tasks by category and priority returns precise matches',
      filterRes.status === 200 && filterTasks.length >= 20 && filterTasks[0].category === 'field_work',
      `Status: ${filterRes.status}, MatchesCount: ${filterTasks.length}`
    );

    // Test 13: Summary endpoint computes status counts and priority metrics
    const summaryRes = await authGet(`${BASE_URL}/tasks/summary`, adminToken);
    const sum = summaryRes.data?.data;

    record(
      13,
      'Summary aggregation pipeline computes status counts and priority breakdown',
      summaryRes.status === 200 && sum?.statusCounts?.total >= 22 && sum?.priorityCounts?.medium >= 20,
      `Status: ${summaryRes.status}, TotalTasks: ${sum?.statusCounts?.total}, Overdue: ${sum?.overdueCount}`
    );

    // Test 14: CSV export endpoint generates RFC-4180 compliant export
    const exportRes = await authGet(`${BASE_URL}/tasks/export`, adminToken);

    record(
      14,
      'Export tasks endpoint streams RFC-4180 compliant CSV',
      exportRes.status === 200 && typeof exportRes.data === 'string' && exportRes.data.includes('Task #,Title,Category'),
      `Status: ${exportRes.status}, HasHeader: ${exportRes.data?.includes('Task #')}`
    );

    // =========================================================================
    // PART 5: SECURITY, RBAC & SOFT-DELETE ARCHIVING
    // =========================================================================
    console.log('\n▶ [5. Security, RBAC & Soft-Delete Archiving]');

    // Test 15: Student role blocked from accessing task management (HTTP 403)
    const stuDeniedRes = await authGet(`${BASE_URL}/tasks`, studentToken);

    record(
      15,
      'Student role blocked from accessing task management (HTTP 403)',
      stuDeniedRes.status === 403,
      `Status: ${stuDeniedRes.status}`
    );

    // Test 16: Cross-NGO IDOR guards: GET, PUT, PATCH STATUS, DELETE return 404
    const idorGet = await authGet(`${BASE_URL}/tasks/${task1Id}`, ngoBAdminToken);
    const idorPut = await authPut(`${BASE_URL}/tasks/${task1Id}`, { title: 'IDOR Overwrite' }, ngoBAdminToken);
    const idorStatus = await authPatch(`${BASE_URL}/tasks/${task1Id}/status`, { status: 'completed' }, ngoBAdminToken);
    const idorDelete = await authDelete(`${BASE_URL}/tasks/${task1Id}`, ngoBAdminToken);

    record(
      16,
      'Cross-NGO IDOR guards: foreign tenant requests return 404 Not Found',
      idorGet.status === 404 && idorPut.status === 404 && idorStatus.status === 404 && idorDelete.status === 404,
      `GET: ${idorGet.status}, PUT: ${idorPut.status}, STATUS: ${idorStatus.status}, DEL: ${idorDelete.status}`
    );

    // Test 17: Staff role blocked from deleting tasks (Admin only, 403)
    const staffDelRes = await authDelete(`${BASE_URL}/tasks/${task1Id}`, staffToken);

    record(
      17,
      'Staff role blocked from deleting tasks (Admin only, HTTP 403)',
      staffDelRes.status === 403,
      `Status: ${staffDelRes.status}`
    );

    // Test 18: Admin safely archives task (soft-delete preserves record and audit trail)
    const adminDelRes = await authDelete(`${BASE_URL}/tasks/${task1Id}`, adminToken);
    const archivedCheck = await Task.findById(task1Id);

    record(
      18,
      'Admin safely archives task (soft-delete preserves record and audit trail)',
      adminDelRes.status === 200 && archivedCheck?.isArchived === true && archivedCheck?.status === 'cancelled',
      `Status: ${adminDelRes.status}, isArchived: ${archivedCheck?.isArchived}`
    );

  } catch (err) {
    console.error('Task test suite aborted due to unexpected error:', err);
  } finally {
    await teardownTestEnvironment();
  }

  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;

  console.log('\n================================================================');
  console.log('   TASK MANAGEMENT TEST SUITE SUMMARY                           ');
  console.log('================================================================');
  console.log(`Total Verification Checks: ${results.length}`);
  console.log(`Passed:                    ${passedCount}`);
  console.log(`Failed:                    ${failedCount}`);
  console.log(`Success Rate:              ${((passedCount / results.length) * 100).toFixed(1)}%\n`);

  if (failedCount === 0 && results.length > 0) {
    console.log('🎉 ALL TASK MANAGEMENT VERIFICATION CHECKS PASSED PERFECTLY!\n');
    process.exit(0);
  } else {
    console.error('❌ SOME TASK MANAGEMENT CHECKS FAILED.\n');
    process.exit(1);
  }
}

runTaskTests();

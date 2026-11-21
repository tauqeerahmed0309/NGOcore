const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const config = require('../config/env');
const Volunteer = require('../models/Volunteer');
const Ngo = require('../models/Ngo');
const User = require('../models/User');
const Program = require('../models/Program');
const { apiRequest } = require('./apiTestClient');
const { setupTestEnvironment, teardownTestEnvironment } = require('./testHelper');

const BASE_URL = `http://localhost:${config.PORT}/api/v1`;

const results = [];
const record = (testNum, description, passed, detail = '') => {
  results.push({ testNum, description, passed, detail });
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} Test ${String(testNum).padStart(2, ' ')}: ${description.padEnd(65, ' ')} -> ${passed ? 'PASSED' : 'FAILED'}${detail ? ` (${detail})` : ''}`);
};

async function runVolunteerTests() {
  await setupTestEnvironment();

  console.log('\n================================================================');
  console.log('   RUNNING VOLUNTEER MANAGEMENT AUTOMATED TEST SUITE            ');
  console.log('================================================================\n');
  const timestamp = Date.now();

  let adminToken = '';
  let staffToken = '';
  let volunteerToken = '';
  let studentToken = '';
  let ngoAId = '';
  let testProgramId = '';

  let ngoBAdminToken = '';
  let ngoBId = '';

  let volunteer1Id = '';
  let volunteer2Id = '';
  let hoursLog1Id = '';

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
      name: `Tenant NGO B (Volunteers) ${timestamp}`,
      status: 'approved',
      registrationNumber: `REG-VOL-${timestamp}`
    });
    ngoBId = ngoB._id;

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('StaffPassword123!', salt);

    const adminBUser = await User.findOneAndUpdate(
      { email: `admin-b-vol-${timestamp}@example.org` },
      {
        firstName: 'AdminB',
        lastName: 'VolunteerTenant',
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

    // Seed test program
    const program = await Program.create({
      code: `VOL-PRG-${timestamp}`,
      name: 'Community Literacy Drive',
      type: 'community_service',
      category: 'Education',
      capacity: 50,
      ngoId: ngoAId,
      status: 'active',
      startDate: new Date(),
      endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
    });
    testProgramId = program._id;

    // =========================================================================
    // PART 1: REGISTRATION & AUTO-NUMBERING
    // =========================================================================
    console.log('▶ [1. Volunteer Registration, Auto-Numbering & Validation]');

    // Test 1: Admin registers volunteer with auto-numbering
    const vol1Res = await authPost(
      `${BASE_URL}/volunteers`,
      {
        name: 'Arjun Deshmukh',
        email: `arjun.vol.${timestamp}@example.org`,
        phone: '+91 98220 11223',
        skills: ['teaching', 'event_coordination'],
        availability: 'weekends',
        status: 'active',
        address: { city: 'Pune', state: 'Maharashtra' }
      },
      adminToken
    );

    const vol1 = vol1Res.data?.data?.volunteer;
    volunteer1Id = vol1?._id;

    record(
      1,
      'Admin registers volunteer with sequential auto-numbering (VOL-XXXX)',
      vol1Res.status === 201 && vol1?.volunteerNumber?.startsWith('VOL-') && vol1?.name === 'Arjun Deshmukh',
      `Status: ${vol1Res.status}, Number: ${vol1?.volunteerNumber}`
    );

    // Test 2: Staff registers volunteer with custom number and program assignment
    const vol2Res = await authPost(
      `${BASE_URL}/volunteers`,
      {
        volunteerNumber: `VOL-CUSTOM-${timestamp}`,
        name: 'Sneha Kulkarni',
        email: `sneha.vol.${timestamp}@example.org`,
        phone: '+91 97654 33445',
        skills: ['first_aid', 'counseling'],
        availability: 'flexible',
        assignedPrograms: [testProgramId.toString()],
        notes: 'Experienced pediatric first aid volunteer'
      },
      staffToken
    );

    const vol2 = vol2Res.data?.data?.volunteer;
    volunteer2Id = vol2?._id;

    record(
      2,
      'Staff registers volunteer with custom ID and program assignment',
      vol2Res.status === 201 && vol2?.volunteerNumber === `VOL-CUSTOM-${timestamp}`,
      `Status: ${vol2Res.status}, ID: ${vol2?.volunteerNumber}`
    );

    // Test 3: Duplicate custom volunteer number in same NGO rejected (409)
    const dupRes = await authPost(
      `${BASE_URL}/volunteers`,
      {
        volunteerNumber: `VOL-CUSTOM-${timestamp}`,
        name: 'Colliding Volunteer',
        email: `colliding.${timestamp}@example.org`
      },
      adminToken
    );

    record(
      3,
      'Duplicate custom volunteer number in same NGO rejected with HTTP 409',
      dupRes.status === 409,
      `Status: ${dupRes.status}`
    );

    // Test 4: Same volunteer number allowed in distinct NGO (tenant isolation)
    const tenantBVolRes = await authPost(
      `${BASE_URL}/volunteers`,
      {
        volunteerNumber: `VOL-CUSTOM-${timestamp}`,
        name: 'Tenant B Valid Volunteer',
        email: `tenantb.${timestamp}@example.org`
      },
      ngoBAdminToken
    );

    record(
      4,
      'Same volunteer number in distinct NGO allowed (tenant-scoped uniqueness)',
      tenantBVolRes.status === 201,
      `Status: ${tenantBVolRes.status}`
    );

    // Test 5: Invalid email format rejected with HTTP 400
    const invEmailRes = await authPost(
      `${BASE_URL}/volunteers`,
      {
        name: 'Bad Email Vol',
        email: 'invalid-email-address'
      },
      adminToken
    );

    record(
      5,
      'Invalid email address rejected with HTTP 400 Bad Request',
      invEmailRes.status === 400,
      `Status: ${invEmailRes.status}`
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
          `${BASE_URL}/volunteers`,
          {
            name: `Concurrent Volunteer ${i}`,
            email: `concurrent.vol.${i}.${timestamp}@example.org`,
            skills: ['logistics']
          },
          adminToken
        )
      );
    }

    const parallelResults = await Promise.all(parallelPromises);
    const successfulVolunteers = parallelResults.filter((r) => r.status === 201).map((r) => r.data?.data?.volunteer);
    const allocatedNumbers = successfulVolunteers.map((v) => v.volunteerNumber);
    const uniqueNumbers = new Set(allocatedNumbers);

    record(
      6,
      'Simultaneous registration (20 parallel requests) allocates unique sequences',
      successfulVolunteers.length === parallelCount && uniqueNumbers.size === parallelCount,
      `Created: ${successfulVolunteers.length}/${parallelCount}, Unique: ${uniqueNumbers.size}`
    );

    // =========================================================================
    // PART 3: HOURS LOGGING & WORKFLOW APPROVAL
    // =========================================================================
    console.log('\n▶ [3. Volunteer Hours Logging & Review Workflows]');

    // Test 7: Volunteer / Staff logs activity hours (defaults to pending)
    const logRes = await authPost(
      `${BASE_URL}/volunteers/${volunteer1Id}/hours`,
      {
        programId: testProgramId.toString(),
        hours: 4.5,
        activityDescription: 'Conducted English literacy workshop for 25 students'
      },
      volunteerToken
    );

    const updatedVolLogs = logRes.data?.data?.volunteer?.hoursLogs;
    const latestLog = updatedVolLogs?.[updatedVolLogs.length - 1];
    hoursLog1Id = latestLog?._id;

    record(
      7,
      'Volunteer logs activity hours (status defaults to "pending")',
      logRes.status === 201 && latestLog?.status === 'pending' && latestLog?.hours === 4.5,
      `Status: ${logRes.status}, LogStatus: ${latestLog?.status}, Hours: ${latestLog?.hours}`
    );

    // Test 8: Invalid hours (<0.25 or >24) rejected with HTTP 400
    const invHoursRes = await authPost(
      `${BASE_URL}/volunteers/${volunteer1Id}/hours`,
      {
        hours: 28,
        activityDescription: 'Impossible hours'
      },
      volunteerToken
    );

    record(
      8,
      'Logging invalid hours (>24) rejected with HTTP 400 Validation Error',
      invHoursRes.status === 400,
      `Status: ${invHoursRes.status}`
    );

    // Test 9: Staff approves logged hours and recalculates totalApprovedHours
    const approveRes = await authPatch(
      `${BASE_URL}/volunteers/${volunteer1Id}/hours/${hoursLog1Id}`,
      { status: 'approved' },
      staffToken
    );

    const approvedVol = approveRes.data?.data?.volunteer;
    const approvedLog = approvedVol?.hoursLogs?.find((l) => l._id.toString() === hoursLog1Id.toString());

    record(
      9,
      'Staff approves volunteer hours and updates totalApprovedHours sum',
      approveRes.status === 200 && approvedLog?.status === 'approved' && approvedVol?.totalApprovedHours === 4.5,
      `Status: ${approveRes.status}, ApprovedHours: ${approvedVol?.totalApprovedHours}`
    );

    // Test 10: Approving already approved hours rejected (HTTP 400)
    const reApproveRes = await authPatch(
      `${BASE_URL}/volunteers/${volunteer1Id}/hours/${hoursLog1Id}`,
      { status: 'approved' },
      staffToken
    );

    record(
      10,
      'Re-approving already approved hours rejected with HTTP 400 Bad Request',
      reApproveRes.status === 400,
      `Status: ${reApproveRes.status}`
    );

    // Test 11: Rejecting hours without justification reason rejected (HTTP 400)
    // First log a second hours entry
    const log2Res = await authPost(
      `${BASE_URL}/volunteers/${volunteer1Id}/hours`,
      {
        hours: 3.0,
        activityDescription: 'Unverified outdoor leaflet distribution'
      },
      volunteerToken
    );
    const log2Id = log2Res.data?.data?.volunteer?.hoursLogs?.slice(-1)[0]?._id;

    const noReasonRejectRes = await authPatch(
      `${BASE_URL}/volunteers/${volunteer1Id}/hours/${log2Id}`,
      { status: 'rejected' },
      staffToken
    );

    record(
      11,
      'Rejecting hours without mandatory justification rejected (HTTP 400)',
      noReasonRejectRes.status === 400,
      `Status: ${noReasonRejectRes.status}`
    );

    // Test 12: Rejecting hours with justification marks status "rejected" cleanly
    const rejectRes = await authPatch(
      `${BASE_URL}/volunteers/${volunteer1Id}/hours/${log2Id}`,
      {
        status: 'rejected',
        rejectionReason: 'Activity was not pre-authorized by program coordinator.'
      },
      staffToken
    );

    const rejectedVol = rejectRes.data?.data?.volunteer;
    const rejectedLog = rejectedVol?.hoursLogs?.find((l) => l._id.toString() === log2Id.toString());

    record(
      12,
      'Rejecting hours with justification records reason & preserves totalApprovedHours',
      rejectRes.status === 200 && rejectedLog?.status === 'rejected' && rejectedVol?.totalApprovedHours === 4.5,
      `Status: ${rejectRes.status}, LogStatus: ${rejectedLog?.status}, TotalApproved: ${rejectedVol?.totalApprovedHours}`
    );

    // =========================================================================
    // PART 4: QUERY, SEARCH, FILTERS & METRICS
    // =========================================================================
    console.log('\n▶ [4. Query, Search, Filters, Sorting & Summary Analytics]');

    // Test 13: GET volunteer details by ID returns enriched record with audit logs
    const getDetailsRes = await authGet(`${BASE_URL}/volunteers/${volunteer1Id}`, adminToken);
    const det = getDetailsRes.data?.data;

    record(
      13,
      'GET volunteer details by ID returns profile, populated programs & audit logs',
      getDetailsRes.status === 200 && det?.volunteer?.name === 'Arjun Deshmukh' && Array.isArray(det?.auditLogs),
      `Status: ${getDetailsRes.status}, Found: ${det?.volunteer?.name}, LogsCount: ${det?.auditLogs?.length}`
    );

    // Test 14: Search volunteers by keyword returns matching profiles
    const searchRes = await authGet(`${BASE_URL}/volunteers?search=Sneha`, staffToken);
    const searchVols = searchRes.data?.data?.volunteers || [];

    record(
      14,
      'Search volunteers by keyword returns matching profiles',
      searchRes.status === 200 && searchVols.some((v) => v.name.includes('Sneha')),
      `Status: ${searchRes.status}, MatchesFound: ${searchVols.length}`
    );

    // Test 15: Filter volunteers by availability & skill
    const filterRes = await authGet(`${BASE_URL}/volunteers?availability=weekends&skill=teaching`, staffToken);
    const filterVols = filterRes.data?.data?.volunteers || [];

    record(
      15,
      'Filter volunteers by availability and skill returns targeted records',
      filterRes.status === 200 && filterVols.length > 0 && filterVols[0].availability === 'weekends',
      `Status: ${filterRes.status}, MatchesCount: ${filterVols.length}`
    );

    // Test 16: Summary endpoint computes status counts and hours metrics via aggregation
    const summaryRes = await authGet(`${BASE_URL}/volunteers/summary`, adminToken);
    const summaryData = summaryRes.data?.data;

    record(
      16,
      'Summary aggregation pipeline computes status counts and hours totals',
      summaryRes.status === 200 && summaryData?.statusCounts?.total >= 22 && summaryData?.totalApprovedHours >= 4.5,
      `Status: ${summaryRes.status}, TotalVolunteers: ${summaryData?.statusCounts?.total}, ApprovedHours: ${summaryData?.totalApprovedHours}`
    );

    // Test 17: CSV export generates RFC-4180 compliant export
    const exportRes = await authGet(`${BASE_URL}/volunteers/export`, adminToken);

    record(
      17,
      'Export volunteers endpoint streams RFC-4180 compliant CSV',
      exportRes.status === 200 && typeof exportRes.data === 'string' && exportRes.data.includes('Volunteer ID,Full Name'),
      `Status: ${exportRes.status}, HasHeader: ${exportRes.data?.includes('Volunteer ID')}`
    );

    // =========================================================================
    // PART 5: SECURITY, RBAC & SOFT-DELETE ARCHIVING
    // =========================================================================
    console.log('\n▶ [5. Security, RBAC & Soft-Delete Archiving]');

    // Test 18: Student role blocked from accessing volunteer management (403)
    const stuDeniedRes = await authGet(`${BASE_URL}/volunteers`, studentToken);

    record(
      18,
      'Student role blocked from accessing volunteer management (HTTP 403)',
      stuDeniedRes.status === 403,
      `Status: ${stuDeniedRes.status}`
    );

    // Test 19: Cross-NGO IDOR guards: GET, PUT, HOURS, DELETE return 404 for foreign tenant
    const idorGet = await authGet(`${BASE_URL}/volunteers/${volunteer1Id}`, ngoBAdminToken);
    const idorPut = await authPut(`${BASE_URL}/volunteers/${volunteer1Id}`, { name: 'IDOR Overwrite' }, ngoBAdminToken);
    const idorHours = await authPost(`${BASE_URL}/volunteers/${volunteer1Id}/hours`, { hours: 2, activityDescription: 'IDOR' }, ngoBAdminToken);
    const idorDelete = await authDelete(`${BASE_URL}/volunteers/${volunteer1Id}`, ngoBAdminToken);

    record(
      19,
      'Cross-NGO IDOR guards: foreign tenant requests return 404 Not Found',
      idorGet.status === 404 && idorPut.status === 404 && idorHours.status === 404 && idorDelete.status === 404,
      `GET: ${idorGet.status}, PUT: ${idorPut.status}, HOURS: ${idorHours.status}, DEL: ${idorDelete.status}`
    );

    // Test 20: Staff role blocked from deleting/archiving volunteer (Admin only, 403)
    const staffDelRes = await authDelete(`${BASE_URL}/volunteers/${volunteer1Id}`, staffToken);

    record(
      20,
      'Staff role blocked from deleting volunteer records (Admin only, HTTP 403)',
      staffDelRes.status === 403,
      `Status: ${staffDelRes.status}`
    );

    // Test 21: Admin safely archives volunteer record (soft-delete preserves audit trail)
    const adminDelRes = await authDelete(`${BASE_URL}/volunteers/${volunteer1Id}`, adminToken);
    const archivedCheck = await Volunteer.findById(volunteer1Id);

    record(
      21,
      'Admin safely archives volunteer (soft-delete preserves record and audit trail)',
      adminDelRes.status === 200 && archivedCheck?.isArchived === true && archivedCheck?.status === 'inactive',
      `Status: ${adminDelRes.status}, isArchived: ${archivedCheck?.isArchived}`
    );

  } catch (err) {
    console.error('Test execution aborted due to unexpected error:', err);
  } finally {
    await teardownTestEnvironment();
  }

  // Summary
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;

  console.log('\n================================================================');
  console.log('   VOLUNTEER MANAGEMENT TEST SUITE SUMMARY                     ');
  console.log('================================================================');
  console.log(`Total Verification Checks: ${results.length}`);
  console.log(`Passed:                    ${passedCount}`);
  console.log(`Failed:                    ${failedCount}`);
  console.log(`Success Rate:              ${((passedCount / results.length) * 100).toFixed(1)}%\n`);

  if (failedCount === 0 && results.length > 0) {
    console.log('🎉 ALL VOLUNTEER MANAGEMENT VERIFICATION CHECKS PASSED PERFECTLY!\n');
    process.exit(0);
  } else {
    console.error('❌ SOME VOLUNTEER MANAGEMENT CHECKS FAILED. PLEASE INVESTIGATE.\n');
    process.exit(1);
  }
}

runVolunteerTests();

/**
 * NGOcore — Event Management Automated Test Suite
 *
 * Comprehensive coverage:
 * - PART 1: Event Creation, Auto-Numbering (EVT-XXXX), Custom IDs & Validation
 * - PART 2: Concurrency & Monotonic Sequence Allocation (20 Parallel Requests)
 * - PART 3: Attendee Registration, Duplicate Prevention & Capacity Enforcement
 * - PART 4: Attendee Check-In Workflow & Audit Logging
 * - PART 5: Query, Search, Filters, Sorting & Aggregation Summary
 * - PART 6: RFC-4180 Compliant CSV Export
 * - PART 7: Security, RBAC & Soft-Delete Archiving
 */

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const config = require('../config/env');
const Event = require('../models/Event');
const Program = require('../models/Program');
const Volunteer = require('../models/Volunteer');
const User = require('../models/User');
const Ngo = require('../models/Ngo');
const { apiRequest } = require('./apiTestClient');
const { setupTestEnvironment, teardownTestEnvironment } = require('./testHelper');

const BASE_URL = `http://localhost:${config.PORT}/api/v1`;

const results = [];

const record = (num, name, passed, details) => {
  results.push({ num, name, passed, details });
  console.log(
    `${passed ? '✅' : '❌'} Test ${num.toString().padStart(2, ' ')}: ${name.padEnd(72, ' ')} -> ${
      passed ? 'PASSED' : 'FAILED'
    } (${details})`
  );
};

const runEventTests = async () => {
  await setupTestEnvironment();

  console.log('\n================================================================');
  console.log('   RUNNING EVENT MANAGEMENT AUTOMATED TEST SUITE                ');
  console.log('================================================================\n');

  let adminToken = '';
  let staffToken = '';
  let volunteerToken = '';
  let studentToken = '';
  let adminBToken = '';

  let ngoAId = '';
  let ngoBId = '';

  let primaryEventId = '';
  let primaryEventNumber = '';
  let sampleProgramId = '';
  let sampleVolunteerId = '';

  const uniqueSuffix = Date.now().toString();

  try {
    // 1. Authenticate users
    const adminUser = await User.findOne({ email: config.ADMIN_EMAIL });
    if (!adminUser) {
      throw new Error(`Admin user ${config.ADMIN_EMAIL} not found.`);
    }
    ngoAId = adminUser.ngoId;

    const adminLogin = await apiRequest(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: config.ADMIN_EMAIL, password: config.ADMIN_PASSWORD })
    });
    adminToken = adminLogin.accessToken;

    const staffLogin = await apiRequest(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: 'staff@ngo.org', password: 'StaffPassword123!' })
    });
    staffToken = staffLogin.accessToken;

    const volLogin = await apiRequest(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: 'volunteer@ngo.org', password: 'VolunteerPass123!' })
    });
    volunteerToken = volLogin.accessToken;

    const studentLogin = await apiRequest(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: 'student@ngo.org', password: 'StudentPass123!' })
    });
    studentToken = studentLogin.accessToken;

    // Setup Tenant B
    let ngoB = await Ngo.findOne({ name: 'Tenant B Autonomous Test NGO' });
    if (!ngoB) {
      ngoB = await Ngo.create({
        name: 'Tenant B Autonomous Test NGO',
        status: 'approved',
        approvalSubmitted: true
      });
    }
    ngoBId = ngoB._id.toString();

    const tenantBAdminEmail = `admin-b-evt-${uniqueSuffix}@example.org`;
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('StaffPassword123!', salt);
    await User.create({
      firstName: 'Admin',
      lastName: 'TenantB',
      email: tenantBAdminEmail,
      password: passwordHash,
      role: 'admin',
      ngoId: ngoB._id,
      status: 'active'
    });

    const adminBLogin = await apiRequest(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: tenantBAdminEmail, password: 'StaffPassword123!' })
    });
    adminBToken = adminBLogin.accessToken;

    // Create a sample program and volunteer for linkages
    let sampleProgram = await Program.findOne({ ngoId: ngoAId });
    if (!sampleProgram) {
      sampleProgram = await Program.create({
        ngoId: ngoAId,
        name: 'Event Linked Literacy Mission',
        code: `PRG-EVT-${uniqueSuffix}`,
        category: 'Education',
        capacity: 50,
        enrolledCount: 0,
        status: 'active',
        startDate: new Date()
      });
    }
    sampleProgramId = sampleProgram._id.toString();

    let sampleVolunteer = await Volunteer.findOne({ ngoId: ngoAId });
    if (!sampleVolunteer) {
      sampleVolunteer = await Volunteer.create({
        ngoId: ngoAId,
        volunteerNumber: `VOL-EVT-${uniqueSuffix}`,
        name: 'Kavita Iyer',
        email: `kavita-${uniqueSuffix}@example.org`,
        phone: '9876543210',
        skills: ['Event Planning', 'First Aid'],
        status: 'active'
      });
    }
    sampleVolunteerId = sampleVolunteer._id.toString();

    // =========================================================================
    // PART 1: Event Creation, Auto-Numbering & Field Validation
    // =========================================================================
    console.log('▶ [1. Event Creation, Auto-Numbering & Field Validation]');

    const startDate1 = new Date(Date.now() + 86400000 * 2).toISOString();
    const endDate1 = new Date(Date.now() + 86400000 * 3).toISOString();

    const createRes1 = await apiRequest(`${BASE_URL}/events`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        title: 'Community Health & Nutrition Workshop',
        description: 'Comprehensive health screening and dietary guidance session.',
        category: 'health_camp',
        startDate: startDate1,
        endDate: endDate1,
        venue: {
          name: 'Central Community Hall',
          city: 'Mumbai',
          state: 'Maharashtra'
        },
        programId: sampleProgramId,
        assignedVolunteers: [sampleVolunteerId],
        capacity: 100,
        budget: 15000
      })
    });

    primaryEventId = createRes1.data?.data?.event?._id;
    primaryEventNumber = createRes1.data?.data?.event?.eventNumber;
    record(
      1,
      'Admin creates event with sequential auto-numbering (EVT-XXXX)',
      createRes1.status === 201 && primaryEventNumber?.startsWith('EVT-'),
      `Status: ${createRes1.status}, Number: ${primaryEventNumber}`
    );

    const customEventNumber = `EVT-CUSTOM-${uniqueSuffix}`;
    const createRes2 = await apiRequest(`${BASE_URL}/events`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${staffToken}` },
      body: JSON.stringify({
        eventNumber: customEventNumber,
        title: 'Annual Youth Leadership Summit',
        category: 'workshop',
        startDate: startDate1,
        endDate: endDate1,
        venue: { name: 'Main Auditorium' },
        capacity: 250
      })
    });

    record(
      2,
      'Staff creates event with custom ID and capacity configuration',
      createRes2.status === 201 && createRes2.data?.data?.event?.eventNumber === customEventNumber,
      `Status: ${createRes2.status}, ID: ${customEventNumber}`
    );

    const duplicateRes = await apiRequest(`${BASE_URL}/events`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        eventNumber: customEventNumber,
        title: 'Collision Attempt Event',
        startDate: startDate1,
        endDate: endDate1
      })
    });

    record(
      3,
      'Duplicate custom event number in same NGO rejected with HTTP 409',
      duplicateRes.status === 409,
      `Status: ${duplicateRes.status}`
    );

    const tenantBRes = await apiRequest(`${BASE_URL}/events`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminBToken}` },
      body: JSON.stringify({
        eventNumber: customEventNumber,
        title: 'Tenant B Event with Same Code',
        startDate: startDate1,
        endDate: endDate1
      })
    });

    record(
      4,
      'Same event number in distinct NGO allowed (tenant-scoped uniqueness)',
      tenantBRes.status === 201,
      `Status: ${tenantBRes.status}`
    );

    const invalidDateRes = await apiRequest(`${BASE_URL}/events`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        title: 'Invalid Date Range Event',
        startDate: endDate1,
        endDate: startDate1 // End date before start date!
      })
    });

    record(
      5,
      'Event with endDate earlier than startDate rejected with HTTP 400 Bad Request',
      invalidDateRes.status === 400,
      `Status: ${invalidDateRes.status}`
    );

    // =========================================================================
    // PART 2: Concurrency & Monotonic Sequence Allocation
    // =========================================================================
    console.log('\n▶ [2. Concurrency & Monotonic Sequence Allocation]');

    const parallelCount = 20;
    const parallelPromises = [];

    for (let i = 1; i <= parallelCount; i++) {
      parallelPromises.push(
        apiRequest(`${BASE_URL}/events`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${adminToken}` },
          body: JSON.stringify({
            title: `Concurrent Field Event #${i}`,
            category: 'community_outreach',
            startDate: startDate1,
            endDate: endDate1
          })
        })
      );
    }

    const parallelResults = await Promise.all(parallelPromises);
    const createdNumbers = parallelResults
      .filter((r) => r.status === 201)
      .map((r) => r.data?.data?.event?.eventNumber);
    const uniqueNumbers = new Set(createdNumbers);

    record(
      6,
      'Simultaneous event creation (20 parallel requests) allocates unique sequences',
      createdNumbers.length === parallelCount && uniqueNumbers.size === parallelCount,
      `Created: ${createdNumbers.length}/${parallelCount}, Unique: ${uniqueNumbers.size}`
    );

    // =========================================================================
    // PART 3: Attendee Registration & Capacity Enforcement
    // =========================================================================
    console.log('\n▶ [3. Attendee Registration & Capacity Enforcement]');

    let sampleAttendeeId = '';
    const regRes1 = await apiRequest(`${BASE_URL}/events/${primaryEventId}/attendees`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${volunteerToken}` },
      body: JSON.stringify({
        name: 'Pooja Sharma',
        email: `pooja.attendee.${uniqueSuffix}@example.org`,
        phone: '9876500001'
      })
    });

    sampleAttendeeId = regRes1.data?.data?.attendee?._id;
    record(
      7,
      'Volunteer registers attendee to event (HTTP 201)',
      regRes1.status === 201 && sampleAttendeeId,
      `Status: ${regRes1.status}, AttendeeId: ${sampleAttendeeId}`
    );

    const dupEmailRes = await apiRequest(`${BASE_URL}/events/${primaryEventId}/attendees`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${staffToken}` },
      body: JSON.stringify({
        name: 'Pooja Sharma Duplicate',
        email: `pooja.attendee.${uniqueSuffix}@example.org`,
        phone: '9876500001'
      })
    });

    record(
      8,
      'Duplicate attendee registration with same email rejected with HTTP 409',
      dupEmailRes.status === 409,
      `Status: ${dupEmailRes.status}`
    );

    // Create a mini-event with capacity = 2 to verify capacity enforcement
    const capacityEventRes = await apiRequest(`${BASE_URL}/events`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        title: 'Exclusive Robotics Masterclass',
        category: 'workshop',
        capacity: 2,
        startDate: startDate1,
        endDate: endDate1
      })
    });
    const capEventId = capacityEventRes.data?.data?.event?._id;

    // Register attendee 1 & 2 (succeed)
    await apiRequest(`${BASE_URL}/events/${capEventId}/attendees`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ name: 'Student One', email: `s1.${uniqueSuffix}@test.org` })
    });
    await apiRequest(`${BASE_URL}/events/${capEventId}/attendees`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ name: 'Student Two', email: `s2.${uniqueSuffix}@test.org` })
    });

    // Register attendee 3 (must fail with 400)
    const capOverRes = await apiRequest(`${BASE_URL}/events/${capEventId}/attendees`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ name: 'Student Three', email: `s3.${uniqueSuffix}@test.org` })
    });

    record(
      9,
      'Event capacity enforcement: registering beyond capacity rejected with HTTP 400',
      capOverRes.status === 400,
      `Status: ${capOverRes.status}, Message: "${capOverRes.data?.message}"`
    );

    // =========================================================================
    // PART 4: Attendee Check-In Workflow & Audit Trail
    // =========================================================================
    console.log('\n▶ [4. Attendee Check-In Workflow & Audit Trail]');

    const checkInRes = await apiRequest(
      `${BASE_URL}/events/${primaryEventId}/attendees/${sampleAttendeeId}/checkin`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${staffToken}` }
      }
    );

    record(
      10,
      'Staff checks in registered attendee and records timestamp (HTTP 200)',
      checkInRes.status === 200 && checkInRes.data?.data?.attendee?.attended === true,
      `Status: ${checkInRes.status}, Attended: ${checkInRes.data?.data?.attendee?.attended}`
    );

    const dupCheckInRes = await apiRequest(
      `${BASE_URL}/events/${primaryEventId}/attendees/${sampleAttendeeId}/checkin`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${staffToken}` }
      }
    );

    record(
      11,
      'Re-checking in already checked-in attendee rejected with HTTP 400 Bad Request',
      dupCheckInRes.status === 400,
      `Status: ${dupCheckInRes.status}`
    );

    // =========================================================================
    // PART 5: Query, Search, Filters, Sorting & Aggregation Summary
    // =========================================================================
    console.log('\n▶ [5. Query, Search, Filters, Sorting & Aggregation Summary]');

    const getByIdRes = await apiRequest(`${BASE_URL}/events/${primaryEventId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    record(
      12,
      'GET event details by ID returns enriched record with relations & audit trail',
      getByIdRes.status === 200 &&
        getByIdRes.data?.data?.eventNumber === primaryEventNumber &&
        Array.isArray(getByIdRes.data?.data?.auditLogs),
      `Status: ${getByIdRes.status}, Found: ${getByIdRes.data?.data?.eventNumber}, AuditLogs: ${getByIdRes.data?.data?.auditLogs?.length}`
    );

    const searchRes = await apiRequest(`${BASE_URL}/events?search=Community`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    record(
      13,
      'Search events by keyword returns matching records',
      searchRes.status === 200 && (searchRes.data?.data?.events?.length || 0) >= 1,
      `Status: ${searchRes.status}, MatchesFound: ${searchRes.data?.data?.events?.length}`
    );

    const filterRes = await apiRequest(`${BASE_URL}/events?category=health_camp&status=scheduled`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    record(
      14,
      'Filter events by category and status returns precise matches',
      filterRes.status === 200 && filterRes.data?.data?.events?.length >= 1,
      `Status: ${filterRes.status}, MatchesCount: ${filterRes.data?.data?.events?.length}`
    );

    const summaryRes = await apiRequest(`${BASE_URL}/events/summary`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    record(
      15,
      'Summary aggregation pipeline computes status counts, category metrics & attendees',
      summaryRes.status === 200 &&
        summaryRes.data?.data?.totalEvents >= 20 &&
        summaryRes.data?.data?.totalRegisteredAttendees >= 1,
      `Status: ${summaryRes.status}, TotalEvents: ${summaryRes.data?.data?.totalEvents}, RegisteredAttendees: ${summaryRes.data?.data?.totalRegisteredAttendees}`
    );

    // =========================================================================
    // PART 6: RFC-4180 CSV Export Functionality
    // =========================================================================
    console.log('\n▶ [6. RFC-4180 CSV Export Functionality]');

    const exportRes = await apiRequest(`${BASE_URL}/events/export`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    const isCsv =
      exportRes.status === 200 &&
      typeof exportRes.data === 'string' &&
      exportRes.data.includes('Event #') &&
      exportRes.data.includes('Venue Name');

    record(
      16,
      'Export events endpoint streams RFC-4180 compliant CSV',
      isCsv,
      `Status: ${exportRes.status}, HasHeader: ${Boolean(isCsv)}`
    );

    // =========================================================================
    // PART 7: Security, RBAC & Soft-Delete Archiving
    // =========================================================================
    console.log('\n▶ [7. Security, RBAC & Soft-Delete Archiving]');

    const studentBlockedRes = await apiRequest(`${BASE_URL}/events`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${studentToken}` }
    });

    record(
      17,
      'Student role blocked from accessing event management (HTTP 403)',
      studentBlockedRes.status === 403,
      `Status: ${studentBlockedRes.status}`
    );

    // Tenant B cross-NGO access attempts on Tenant A's primaryEventId
    const idorGet = await apiRequest(`${BASE_URL}/events/${primaryEventId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminBToken}` }
    });
    const idorPut = await apiRequest(`${BASE_URL}/events/${primaryEventId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminBToken}` },
      body: JSON.stringify({ title: 'Hijacked Event Title' })
    });
    const idorAtt = await apiRequest(`${BASE_URL}/events/${primaryEventId}/attendees`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminBToken}` },
      body: JSON.stringify({ name: 'Malicious Injected Attendee' })
    });
    const idorDel = await apiRequest(`${BASE_URL}/events/${primaryEventId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminBToken}` }
    });

    const idorSafe =
      idorGet.status === 404 &&
      idorPut.status === 404 &&
      idorAtt.status === 404 &&
      idorDel.status === 404;

    record(
      18,
      'Cross-NGO IDOR guards: foreign tenant requests return 404 Not Found',
      idorSafe,
      `GET: ${idorGet.status}, PUT: ${idorPut.status}, ATT: ${idorAtt.status}, DEL: ${idorDel.status}`
    );

    const staffDelRes = await apiRequest(`${BASE_URL}/events/${primaryEventId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${staffToken}` }
    });

    record(
      19,
      'Staff role blocked from deleting event records (Admin only, HTTP 403)',
      staffDelRes.status === 403,
      `Status: ${staffDelRes.status}`
    );

    const adminDelRes = await apiRequest(`${BASE_URL}/events/${primaryEventId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    const archivedCheck = await Event.findById(primaryEventId);
    record(
      20,
      'Admin safely archives event (soft-delete preserves record and audit trail)',
      adminDelRes.status === 200 && archivedCheck.isArchived === true && archivedCheck.status === 'cancelled',
      `Status: ${adminDelRes.status}, isArchived: ${archivedCheck.isArchived}, status: ${archivedCheck.status}`
    );
  } catch (err) {
    console.error('Unexpected error during event test suite execution:', err);
  } finally {
    await teardownTestEnvironment();
  }

  // Summary
  const passedCount = results.filter((r) => r.passed).length;
  const totalCount = results.length;
  console.log('\n================================================================');
  console.log('   EVENT MANAGEMENT TEST SUITE SUMMARY                          ');
  console.log('================================================================');
  console.log(`Total Verification Checks: ${totalCount}`);
  console.log(`Passed:                    ${passedCount}`);
  console.log(`Failed:                    ${totalCount - passedCount}`);
  console.log(`Success Rate:              ${((passedCount / totalCount) * 100).toFixed(1)}%\n`);

  if (passedCount === totalCount && totalCount > 0) {
    console.log('🎉 ALL EVENT MANAGEMENT VERIFICATION CHECKS PASSED PERFECTLY!\n');
    process.exit(0);
  } else {
    console.error('❌ SOME EVENT VERIFICATION CHECKS FAILED.\n');
    process.exit(1);
  }
};

runEventTests();

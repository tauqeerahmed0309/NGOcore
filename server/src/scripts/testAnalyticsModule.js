const mongoose = require('mongoose');
const http = require('http');
const config = require('../config/env');
const app = require('../app');
const Ngo = require('../models/Ngo');
const User = require('../models/User');
const Student = require('../models/Student');
const Program = require('../models/Program');
const ProgramEnrollment = require('../models/ProgramEnrollment');
const AttendanceSession = require('../models/AttendanceSession');
const AuditLog = require('../models/AuditLog');
const { hashPassword } = require('../utils/passwordHelper');
const { apiRequest } = require('./apiTestClient');
const {
  getBeneficiaryAnalytics,
  getProgramAnalytics,
  getAttendanceAnalytics,
  getRecentActivity,
  getOrganizationDashboardAnalytics
} = require('../services/analyticsService');

let passed = 0;
let failed = 0;

const assert = (condition, message) => {
  if (!condition) {
    failed += 1;
    console.error(`❌ FAILED: ${message}`);
    throw new Error(message);
  }
  passed += 1;
  console.log(`✅ PASSED: ${message}`);
};

const runAll = async () => {
  console.log('================================================================');
  console.log('   RUNNING ORGANIZATION ANALYTICS DASHBOARD TEST SUITE          ');
  console.log('================================================================\n');

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(config.MONGODB_URI);
  }

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api/v1`;

  const timestamp = Date.now();

  // Create NGO A (Primary testing organization)
  const ngoA = await Ngo.create({
    name: `Analytics Test NGO A ${timestamp}`,
    registrationNumber: `REG-ANA-A-${timestamp}`,
    organizationType: 'Education Non-Profit',
    status: 'approved',
    isActive: true
  });

  // Create NGO B (Secondary organization for multi-tenant isolation testing)
  const ngoB = await Ngo.create({
    name: `Analytics Test NGO B ${timestamp}`,
    registrationNumber: `REG-ANA-B-${timestamp}`,
    organizationType: 'Health Non-Profit',
    status: 'approved',
    isActive: true
  });

  // Create NGO C (Empty organization for zero-data edge cases)
  const ngoC = await Ngo.create({
    name: `Analytics Test NGO C ${timestamp}`,
    registrationNumber: `REG-ANA-C-${timestamp}`,
    organizationType: 'Rural Development',
    status: 'approved',
    isActive: true
  });

  // Create Users
  const adminUserA = await User.create({
    firstName: 'Analytics',
    lastName: 'AdminA',
    email: `admin-ana-a-${timestamp}@example.org`,
    password: await hashPassword('AnaAdminPass123!'),
    role: 'admin',
    ngoId: ngoA._id,
    isActive: true
  });

  const staffUserA = await User.create({
    firstName: 'Analytics',
    lastName: 'StaffA',
    email: `staff-ana-a-${timestamp}@example.org`,
    password: await hashPassword('AnaStaffPass123!'),
    role: 'staff',
    ngoId: ngoA._id,
    isActive: true
  });

  const staffUserB = await User.create({
    firstName: 'Analytics',
    lastName: 'StaffB',
    email: `staff-ana-b-${timestamp}@example.org`,
    password: await hashPassword('AnaStaffPass123!'),
    role: 'staff',
    ngoId: ngoB._id,
    isActive: true
  });

  const staffUserC = await User.create({
    firstName: 'Analytics',
    lastName: 'StaffC',
    email: `staff-ana-c-${timestamp}@example.org`,
    password: await hashPassword('AnaStaffPass123!'),
    role: 'staff',
    ngoId: ngoC._id,
    isActive: true
  });

  // Seed Students for NGO A with diverse ages, statuses, and edge cases
  // Age reference relative to 2026:
  // 2022-01-01 -> ~4 yrs (under_6)
  // 2016-01-01 -> ~10 yrs (6_to_12)
  // 2011-01-01 -> ~15 yrs (13_to_17)
  // 2005-01-01 -> ~21 yrs (18_to_24)
  // 1995-01-01 -> ~31 yrs (25_plus)
  // 2030-01-01 -> future (invalid DOB)
  // null -> missing DOB
  // 1900-01-01 -> >100 yrs (invalid DOB)
  const stuA1 = await Student.create({
    ngoId: ngoA._id,
    registrationNumber: `ANA-S1-${timestamp}`,
    firstName: 'Aarav',
    lastName: 'Patel',
    dateOfBirth: new Date('2022-01-01'),
    gender: 'male',
    state: 'Karnataka',
    status: 'active'
  });

  const stuA2 = await Student.create({
    ngoId: ngoA._id,
    registrationNumber: `ANA-S2-${timestamp}`,
    firstName: 'Diya',
    lastName: 'Sharma',
    dateOfBirth: new Date('2016-01-01'),
    gender: 'female',
    state: 'Karnataka',
    status: 'active'
  });

  const stuA3 = await Student.create({
    ngoId: ngoA._id,
    registrationNumber: `ANA-S3-${timestamp}`,
    firstName: 'Rohan',
    lastName: 'Verma',
    dateOfBirth: new Date('2011-01-01'),
    gender: 'male',
    state: 'Maharashtra',
    status: 'graduated'
  });

  const stuA4 = await Student.create({
    ngoId: ngoA._id,
    registrationNumber: `ANA-S4-${timestamp}`,
    firstName: 'Ananya',
    lastName: 'Deshmukh',
    dateOfBirth: new Date('2005-01-01'),
    gender: 'female',
    state: 'Maharashtra',
    status: 'transferred'
  });

  const stuA5 = await Student.create({
    ngoId: ngoA._id,
    registrationNumber: `ANA-S5-${timestamp}`,
    firstName: 'Karan',
    lastName: 'Mehta',
    dateOfBirth: new Date('1995-01-01'),
    gender: 'other',
    state: 'Gujarat',
    status: 'inactive'
  });

  const stuA6 = await Student.create({
    ngoId: ngoA._id,
    registrationNumber: `ANA-S6-${timestamp}`,
    firstName: 'Future',
    lastName: 'Kid',
    dateOfBirth: new Date('2030-01-01'), // Future DOB
    gender: 'male',
    state: 'Gujarat',
    status: 'active'
  });

  const stuA7 = await Student.create({
    ngoId: ngoA._id,
    registrationNumber: `ANA-S7-${timestamp}`,
    firstName: 'Ancient',
    lastName: 'Elder',
    dateOfBirth: new Date('1900-01-01'), // > 100 yrs
    gender: 'female',
    state: 'Delhi',
    status: 'active'
  });

  const stuA8 = await Student.create({
    ngoId: ngoA._id,
    registrationNumber: `ANA-S8-${timestamp}`,
    firstName: 'NoDob',
    lastName: 'Student',
    dateOfBirth: null, // Null DOB
    gender: '', // Unspecified gender
    state: 'Delhi',
    status: 'active'
  });

  // Seed Programs for NGO A:
  // prog1: active, capacity 10
  // prog2: active, capacity null (unlimited)
  // prog3: draft, capacity 20
  // prog4: paused, capacity 15
  // prog5: completed, capacity 25
  // prog6: cancelled, capacity 30
  const progA1 = await Program.create({
    ngoId: ngoA._id,
    name: 'Active Program with Capacity',
    code: `PRG-CAP-${timestamp}`,
    type: 'workshop',
    status: 'active',
    capacity: 10
  });

  const progA2 = await Program.create({
    ngoId: ngoA._id,
    name: 'Active Program Unlimited',
    code: `PRG-UNL-${timestamp}`,
    type: 'seminar',
    status: 'active',
    capacity: null
  });

  const progA3 = await Program.create({
    ngoId: ngoA._id,
    name: 'Draft Program',
    code: `PRG-DFT-${timestamp}`,
    type: 'mentorship',
    status: 'draft',
    capacity: 20
  });

  const progA4 = await Program.create({
    ngoId: ngoA._id,
    name: 'Paused Program',
    code: `PRG-PSD-${timestamp}`,
    type: 'workshop',
    status: 'paused',
    capacity: 15
  });

  const progA5 = await Program.create({
    ngoId: ngoA._id,
    name: 'Completed Program',
    code: `PRG-CMP-${timestamp}`,
    type: 'education',
    status: 'completed',
    capacity: 25
  });

  const progA6 = await Program.create({
    ngoId: ngoA._id,
    name: 'Cancelled Program',
    code: `PRG-CNC-${timestamp}`,
    type: 'workshop',
    status: 'cancelled',
    capacity: 30
  });

  // Seed Enrollments in NGO A:
  // progA1: 2 students enrolled (out of 10 capacity = 20% utilization)
  // progA2: 1 student enrolled (unlimited capacity)
  await ProgramEnrollment.create([
    { ngoId: ngoA._id, programId: progA1._id, studentId: stuA1._id, status: 'enrolled' },
    { ngoId: ngoA._id, programId: progA1._id, studentId: stuA2._id, status: 'enrolled' },
    { ngoId: ngoA._id, programId: progA2._id, studentId: stuA3._id, status: 'enrolled' }
  ]);

  // Seed Attendance Sessions for NGO A:
  // Session 1: 2 present, 1 absent, 1 excused (total 4 entries, rate = 2 / (2 + 1) = 66.67% -> 67%)
  await AttendanceSession.create({
    ngoId: ngoA._id,
    programId: progA1._id,
    sessionDate: new Date(),
    recordedBy: staffUserA._id,
    entries: [
      { studentId: stuA1._id, status: 'present' },
      { studentId: stuA2._id, status: 'present' },
      { studentId: stuA3._id, status: 'absent' },
      { studentId: stuA4._id, status: 'excused' }
    ]
  });

  // Seed Audit Logs for NGO A
  await AuditLog.create([
    {
      ngoId: ngoA._id,
      actorId: adminUserA._id,
      action: 'create',
      entityType: 'student',
      entityId: stuA1._id.toString(),
      metadata: { field: 'registration' }
    },
    {
      ngoId: ngoA._id,
      actorId: staffUserA._id,
      action: 'update',
      entityType: 'program',
      entityId: progA1._id.toString(),
      metadata: { field: 'capacity' }
    }
  ]);

  // Seed NGO B (Isolated tenant): 1 student, 1 program, 0 attendance
  const stuB = await Student.create({
    ngoId: ngoB._id,
    registrationNumber: `ANA-B-S1-${timestamp}`,
    firstName: 'TenantB',
    lastName: 'Beneficiary',
    dateOfBirth: new Date('2010-05-10'),
    gender: 'female',
    state: 'Punjab',
    status: 'active'
  });

  const progB = await Program.create({
    ngoId: ngoB._id,
    name: 'NGO B Exclusive Program',
    code: `PRG-B-${timestamp}`,
    type: 'health',
    status: 'active',
    capacity: 50
  });

  try {
    // ============================================================================
    // SECTION 1: Direct Service Aggregation Unit Tests
    // ============================================================================
    console.log('▶ [1. Direct Service Aggregation Unit Tests]');

    // 1.1 Beneficiary Analytics
    const benData = await getBeneficiaryAnalytics(ngoA._id, 6);
    assert(benData.total === 8, 'Beneficiary total count matches seeded records (8)');
    assert(benData.byStatus.active === 5, 'Active beneficiary count matches (5)');
    assert(benData.byStatus.graduated === 1, 'Graduated beneficiary count matches (1)');
    assert(benData.byStatus.transferred === 1, 'Transferred beneficiary count matches (1)');
    assert(benData.byStatus.inactive === 1, 'Inactive beneficiary count matches (1)');

    const maleGender = benData.genderDistribution.find(g => g.gender === 'male');
    const femaleGender = benData.genderDistribution.find(g => g.gender === 'female');
    const otherGender = benData.genderDistribution.find(g => g.gender === 'other');
    const unspecifiedGender = benData.genderDistribution.find(g => g.gender === 'unspecified');

    assert(maleGender?.count === 3, 'Gender distribution: 3 males');
    assert(femaleGender?.count === 3, 'Gender distribution: 3 females');
    assert(otherGender?.count === 1, 'Gender distribution: 1 other');
    assert(unspecifiedGender?.count === 1, 'Gender distribution: 1 unspecified');

    const under6 = benData.ageDistribution.find(a => a.bracket === 'under_6');
    const age6_12 = benData.ageDistribution.find(a => a.bracket === '6_to_12');
    const age13_17 = benData.ageDistribution.find(a => a.bracket === '13_to_17');
    const age18_24 = benData.ageDistribution.find(a => a.bracket === '18_to_24');
    const age25plus = benData.ageDistribution.find(a => a.bracket === '25_plus');

    assert(under6?.count === 1, 'Age distribution: 1 in under_6');
    assert(age6_12?.count === 1, 'Age distribution: 1 in 6_to_12');
    assert(age13_17?.count === 1, 'Age distribution: 1 in 13_to_17');
    assert(age18_24?.count === 1, 'Age distribution: 1 in 18_to_24');
    assert(age25plus?.count === 1, 'Age distribution: 1 in 25_plus');
    assert(benData.missingOrInvalidDobCount === 3, 'Invalid DOBs (future, >100, null) counted as 3');
    assert(benData.monthlyRegistrationTrends.length === 6, 'Monthly registration trends contains 6 zero-padded buckets');
    assert(benData.topStates.length > 0, 'Top states aggregation returns populated states list');

    // 1.2 Program Analytics
    const progData = await getProgramAnalytics(ngoA._id, 6);
    assert(progData.total === 6, 'Program total count matches (6)');
    assert(progData.byStatus.active === 2, 'Active programs count matches (2)');
    assert(progData.byStatus.draft === 1, 'Draft programs count matches (1)');
    assert(progData.byStatus.paused === 1, 'Paused programs count matches (1)');
    assert(progData.byStatus.completed === 1, 'Completed programs count matches (1)');
    assert(progData.byStatus.cancelled === 1, 'Cancelled programs count matches (1)');

    assert(progData.capacityMetrics.totalActivePrograms === 2, 'Total active programs is 2');
    assert(progData.capacityMetrics.totalFiniteCapacity === 10, 'Total finite capacity is 10');
    assert(progData.capacityMetrics.totalEnrolledInFinite === 2, 'Enrolled in finite capacity programs is 2');
    assert(progData.capacityMetrics.totalUnlimitedPrograms === 1, 'Active programs with unlimited capacity count is 1');
    assert(progData.capacityMetrics.totalEnrolledInUnlimited === 1, 'Enrolled in unlimited capacity programs is 1');
    assert(progData.capacityMetrics.overallCapacityUtilizationRate === 20, 'Overall finite capacity utilization rate is exactly 20%');
    assert(progData.monthlyEnrollmentTrends.length === 6, 'Monthly enrollment trends contains 6 zero-padded buckets');

    // 1.3 Attendance Analytics
    const attData = await getAttendanceAnalytics(ngoA._id, 6);
    assert(attData.totalSessionsRecorded === 1, 'Total attendance sessions recorded is 1');
    assert(attData.presentCount === 2, 'Attendance present count is 2');
    assert(attData.absentCount === 1, 'Attendance absent count is 1');
    assert(attData.excusedCount === 1, 'Attendance excused count is 1');
    assert(attData.totalRecordedEntries === 4, 'Total recorded entries is 4');
    assert(attData.rateDenominator === 3, 'Presence rate denominator (present + absent) is 3');
    assert(attData.overallPresenceRate === 67, 'Attendance presence rate correctly calculated as 67% (2/3 rounded)');

    // 1.4 Recent Activity (Zero PII)
    const actData = await getRecentActivity(ngoA._id, 8);
    assert(actData.length === 2, 'Recent activity returns 2 audit events');
    assert(actData[0].actorName !== undefined && actData[0].actorRole !== undefined, 'Recent activity includes actor name and role');
    assert(actData.every(a => a.firstName === undefined && a.email === undefined && a.phone === undefined), 'Recent activity excludes beneficiary PII fields');

    // 1.5 Empty Organization (Zero data handling)
    const emptyBen = await getBeneficiaryAnalytics(ngoC._id, 6);
    const emptyProg = await getProgramAnalytics(ngoC._id, 6);
    const emptyAtt = await getAttendanceAnalytics(ngoC._id, 6);
    assert(emptyBen.total === 0, 'Empty NGO beneficiary total is 0');
    assert(emptyProg.capacityMetrics.overallCapacityUtilizationRate === null, 'Empty NGO capacity utilization is null (no finite capacity, no NaN)');
    assert(emptyAtt.overallPresenceRate === 0, 'Empty NGO attendance presence rate is 0% (no NaN)');

    // ============================================================================
    // SECTION 2: HTTP Integration API Tests (GET /api/v1/analytics/dashboard)
    // ============================================================================
    console.log('\n▶ [2. HTTP Integration API Tests]');

    // Login Staff A
    const loginResA = await apiRequest(`${baseUrl}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: staffUserA.email, password: 'AnaStaffPass123!' })
    });
    const tokenA = loginResA.accessToken;
    assert(Boolean(tokenA), 'Staff A successfully authenticated and received access token');

    // 2.1 Standard Dashboard Request
    const dashResA = await apiRequest(`${baseUrl}/analytics/dashboard`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assert(dashResA.status === 200, 'GET /analytics/dashboard returns HTTP 200');
    assert(dashResA.data.success === true, 'Response body indicates success: true');
    assert(dashResA.data.data.beneficiaries.total === 8, 'API response beneficiary total is 8');
    assert(dashResA.data.data.programs.total === 6, 'API response program total is 6');
    assert(dashResA.data.data.attendance.totalSessionsRecorded === 1, 'API response attendance session count is 1');
    assert(dashResA.data.data.timeframeMonths === 6, 'Default timeframeMonths is 6');

    // 2.2 Custom Months Parameter
    const customRes = await apiRequest(`${baseUrl}/analytics/dashboard?months=12`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assert(customRes.status === 200, 'Custom ?months=12 returns HTTP 200');
    assert(customRes.data.data.timeframeMonths === 12, 'Response confirms timeframeMonths: 12');
    assert(customRes.data.data.beneficiaries.monthlyRegistrationTrends.length === 12, 'Registration trends has 12 monthly buckets');
    assert(customRes.data.data.programs.monthlyEnrollmentTrends.length === 12, 'Enrollment trends has 12 monthly buckets');

    // 2.3 Query Validation (Invalid Months)
    const invalidRes1 = await apiRequest(`${baseUrl}/analytics/dashboard?months=30`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assert(invalidRes1.status === 400, 'Request with ?months=30 (exceeding 24) rejected with HTTP 400');

    const invalidRes2 = await apiRequest(`${baseUrl}/analytics/dashboard?months=-5`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assert(invalidRes2.status === 400, 'Request with negative ?months rejected with HTTP 400');

    // 2.4 Multi-Tenant Data Isolation Test
    const loginResB = await apiRequest(`${baseUrl}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: staffUserB.email, password: 'AnaStaffPass123!' })
    });
    const tokenB = loginResB.accessToken;

    const dashResB = await apiRequest(`${baseUrl}/analytics/dashboard`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${tokenB}` }
    });
    assert(dashResB.status === 200, 'Staff B retrieves NGO B dashboard successfully');
    assert(dashResB.data.data.beneficiaries.total === 1, 'NGO B dashboard total beneficiaries is strictly 1 (isolated from NGO A)');
    assert(dashResB.data.data.programs.total === 1, 'NGO B dashboard total programs is strictly 1 (isolated from NGO A)');
    assert(dashResB.data.data.programs.byStatus.active === 1, 'NGO B dashboard active programs is 1');
    assert(dashResB.data.data.attendance.totalSessionsRecorded === 0, 'NGO B dashboard attendance sessions is strictly 0');

    // 2.5 Unauthenticated Access Blocked
    const unauthRes = await apiRequest(`${baseUrl}/analytics/dashboard`, {
      method: 'GET'
    });
    assert(unauthRes.status === 401, 'Unauthenticated request to /analytics/dashboard rejected with HTTP 401');

    // 2.6 Zero PII Verification
    const responsePayloadStr = JSON.stringify(dashResA.data);
    const piiStrings = ['Aarav', 'Patel', 'Diya', 'Sharma', 'Karnataka', 'Maharashtra'];
    // States and city are aggregate names, but beneficiary personal names should NEVER appear
    const personalNames = ['Aarav', 'Patel', 'Diya', 'Sharma', 'Rohan', 'Verma', 'Ananya', 'Deshmukh', 'Karan', 'Mehta'];
    let leakedPii = personalNames.filter(name => responsePayloadStr.includes(name));
    assert(leakedPii.length === 0, `Dashboard response is completely free of beneficiary PII (Leaked: ${leakedPii.join(', ') || 'none'})`);

    console.log('\n================================================================');
    console.log(`ORGANIZATION ANALYTICS TEST RESULT: ALL ${passed} TESTS PASSED! ✅`);
    console.log('================================================================');
  } finally {
    // Teardown
    await new Promise((resolve) => server.close(resolve));
    await AttendanceSession.deleteMany({ ngoId: { $in: [ngoA._id, ngoB._id, ngoC._id] } });
    await ProgramEnrollment.deleteMany({ ngoId: { $in: [ngoA._id, ngoB._id, ngoC._id] } });
    await Program.deleteMany({ ngoId: { $in: [ngoA._id, ngoB._id, ngoC._id] } });
    await Student.deleteMany({ ngoId: { $in: [ngoA._id, ngoB._id, ngoC._id] } });
    await User.deleteMany({ _id: { $in: [adminUserA._id, staffUserA._id, staffUserB._id, staffUserC._id] } });
    await Ngo.deleteMany({ _id: { $in: [ngoA._id, ngoB._id, ngoC._id] } });
    await AuditLog.deleteMany({ ngoId: { $in: [ngoA._id, ngoB._id, ngoC._id] } });
  }
};

runAll()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test execution failed:', err);
    process.exit(1);
  });

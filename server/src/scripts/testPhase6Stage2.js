/**
 * NGOcore — Phase 6 Stage 2: Staff Assignment & Team Management
 *
 * Focused Automated Regression Test Suite covering:
 * - 1. RBAC Guard: Only admin can assign / remove staff (staff/student get 403)
 * - 2. Admin successfully assigns valid staff member to program (HTTP 200, populated response, AuditLog)
 * - 3. Duplicate staff assignment rejected (HTTP 409)
 * - 4. Inactive staff assignment rejected (HTTP 400)
 * - 5. Invalid role assignment rejected (e.g. assigning student/volunteer as staff) (HTTP 400)
 * - 6. Cross-NGO staff assignment rejected (IDOR / tenant isolation) (HTTP 404)
 * - 7. Cross-NGO program access rejected (IDOR) (HTTP 404)
 * - 8. Admin successfully removes assigned staff member (HTTP 200, member removed, AuditLog)
 * - 9. Removing staff member not assigned to program rejected (HTTP 404)
 * - 10. Non-existent program or invalid ObjectId rejected (HTTP 400/404)
 */

const bcrypt = require('bcrypt');
const config = require('../config/env');
const Program = require('../models/Program');
const User = require('../models/User');
const Ngo = require('../models/Ngo');
const AuditLog = require('../models/AuditLog');
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

const runStage2Tests = async () => {
  await setupTestEnvironment();

  console.log('\n================================================================');
  console.log('   RUNNING PHASE 6 STAGE 2: STAFF ASSIGNMENT & TEAM MANAGEMENT  ');
  console.log('================================================================\n');

  let adminToken = '';
  let staffToken = '';
  let ngoAId = '';

  let ngoBAdminToken = '';
  let ngoBId = '';

  let validStaffId = '';
  let inactiveStaffId = '';
  let studentUserId = '';
  let foreignStaffId = '';
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
    validStaffId = staffUser._id;
    const staffRes = await apiRequest(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: 'staff@ngo.org', password: 'StaffPassword123!' })
    });
    staffToken = staffRes.accessToken;

    // 2. Setup Secondary NGO for isolation tests
    const timestamp = Date.now();
    const ngoB = await Ngo.create({
      name: `NGO Isolation Stage 2 ${timestamp}`,
      status: 'approved',
      registrationNumber: `REG-STAGE2-P6-${timestamp}`
    });
    ngoBId = ngoB._id;

    const hashedPassword = await bcrypt.hash('Password123!', 10);
    const userB = await User.create({
      email: `admin-b-stage2-${timestamp}@example.org`,
      password: hashedPassword,
      role: 'admin',
      ngoId: ngoBId,
      isActive: true,
      firstName: 'Admin',
      lastName: 'NGO B'
    });

    const foreignStaff = await User.create({
      email: `staff-b-stage2-${timestamp}@example.org`,
      password: hashedPassword,
      role: 'staff',
      ngoId: ngoBId,
      isActive: true,
      firstName: 'Foreign',
      lastName: 'Staff'
    });
    foreignStaffId = foreignStaff._id;

    const ngoBLogin = await apiRequest(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: userB.email, password: 'Password123!' })
    });
    ngoBAdminToken = ngoBLogin.accessToken;

    // 3. Create test users in NGO A: inactive staff and student user
    const inactiveStaff = await User.create({
      email: `inactive-staff-${timestamp}@ngo.org`,
      password: hashedPassword,
      role: 'staff',
      ngoId: ngoAId,
      isActive: false,
      firstName: 'Inactive',
      lastName: 'Staff'
    });
    inactiveStaffId = inactiveStaff._id;

    const studentUser = await User.create({
      email: `student-user-${timestamp}@ngo.org`,
      password: hashedPassword,
      role: 'student',
      ngoId: ngoAId,
      isActive: true,
      firstName: 'Student',
      lastName: 'User'
    });
    studentUserId = studentUser._id;

    // 4. Create fresh test program
    await Program.deleteMany({ code: /^PRG-S2-/ });
    const createProgRes = await apiRequest(`${BASE_URL}/programs`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        name: 'Stage 2 Team Program',
        code: 'PRG-S2-TEAM',
        type: 'course',
        category: 'leadership',
        description: 'Testing staff assignments and team management',
        capacity: 25
      })
    });
    testProgramId = createProgRes.data?.data?.program?._id;

    // ----------------------------------------------------------------
    // SECTION 1: RBAC AUTHORIZATION GUARDS
    // ----------------------------------------------------------------
    console.log('▶ [1. RBAC Authorization Guards]');

    // Test 1: Staff cannot assign staff (Admin only)
    try {
      const res = await apiRequest(`${BASE_URL}/programs/${testProgramId}/staff`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${staffToken}` },
        body: JSON.stringify({ staffId: String(validStaffId) })
      });
      const ok = res.status === 403;
      record(1, 'Non-admin cannot assign staff (HTTP 403 Forbidden)', ok, `Status=${res.status}`);
    } catch (err) {
      record(1, 'Non-admin cannot assign staff (HTTP 403 Forbidden)', false, err.message);
    }

    // Test 2: Staff cannot remove staff (Admin only)
    try {
      const res = await apiRequest(`${BASE_URL}/programs/${testProgramId}/staff/${validStaffId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${staffToken}` }
      });
      const ok = res.status === 403;
      record(2, 'Non-admin cannot remove staff (HTTP 403 Forbidden)', ok, `Status=${res.status}`);
    } catch (err) {
      record(2, 'Non-admin cannot remove staff (HTTP 403 Forbidden)', false, err.message);
    }

    // ----------------------------------------------------------------
    // SECTION 2: STAFF ASSIGNMENT OPERATIONS & VALIDATIONS
    // ----------------------------------------------------------------
    console.log('\n▶ [2. Staff Assignment Operations & Validations]');

    // Test 3: Admin successfully assigns valid staff member
    try {
      const res = await apiRequest(`${BASE_URL}/programs/${testProgramId}/staff`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ staffId: String(validStaffId) })
      });
      const prog = res.data?.data?.program;
      const isAssigned = (prog?.assignedStaff || []).some((s) => String(s._id || s) === String(validStaffId));
      
      // Also verify AuditLog was created
      const auditLog = await AuditLog.findOne({
        entityId: String(testProgramId),
        action: 'update',
        'metadata.action': 'assign_staff',
        'metadata.staffId': String(validStaffId)
      });

      const ok = res.status === 200 && isAssigned && auditLog !== null;
      record(3, 'Admin assigns valid staff member (HTTP 200 + AuditLog)', ok, `Status=${res.status}, AuditLog=${Boolean(auditLog)}`);
    } catch (err) {
      record(3, 'Admin assigns valid staff member (HTTP 200 + AuditLog)', false, err.message);
    }

    // Test 4: Duplicate staff assignment rejected (HTTP 409)
    try {
      const res = await apiRequest(`${BASE_URL}/programs/${testProgramId}/staff`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ staffId: String(validStaffId) })
      });
      const ok = res.status === 409 && JSON.stringify(res.data).includes('already assigned');
      record(4, 'Duplicate staff assignment rejected (HTTP 409 Conflict)', ok, `Status=${res.status}`);
    } catch (err) {
      record(4, 'Duplicate staff assignment rejected (HTTP 409 Conflict)', false, err.message);
    }

    // Test 5: Inactive staff assignment rejected (HTTP 400)
    try {
      const res = await apiRequest(`${BASE_URL}/programs/${testProgramId}/staff`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ staffId: String(inactiveStaffId) })
      });
      const ok = res.status === 400 && JSON.stringify(res.data).includes('inactive');
      record(5, 'Inactive staff assignment rejected (HTTP 400)', ok, `Status=${res.status}`);
    } catch (err) {
      record(5, 'Inactive staff assignment rejected (HTTP 400)', false, err.message);
    }

    // Test 6: Ineligible role assignment rejected (HTTP 400)
    try {
      const res = await apiRequest(`${BASE_URL}/programs/${testProgramId}/staff`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ staffId: String(studentUserId) })
      });
      const ok = res.status === 400 && JSON.stringify(res.data).includes('staff');
      record(6, 'Student user assignment as staff rejected (HTTP 400)', ok, `Status=${res.status}`);
    } catch (err) {
      record(6, 'Student user assignment as staff rejected (HTTP 400)', false, err.message);
    }

    // ----------------------------------------------------------------
    // SECTION 3: MULTI-TENANT ISOLATION & IDOR GUARDS
    // ----------------------------------------------------------------
    console.log('\n▶ [3. Multi-Tenant Isolation & IDOR Guards]');

    // Test 7: Foreign NGO staff assignment rejected (HTTP 404 User not found)
    try {
      const res = await apiRequest(`${BASE_URL}/programs/${testProgramId}/staff`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ staffId: String(foreignStaffId) })
      });
      const ok = res.status === 404;
      record(7, 'Cross-NGO staff assignment rejected (HTTP 404 IDOR)', ok, `Status=${res.status}`);
    } catch (err) {
      record(7, 'Cross-NGO staff assignment rejected (HTTP 404 IDOR)', false, err.message);
    }

    // Test 8: Foreign NGO admin cannot assign staff to Program A (HTTP 404 Program not found)
    try {
      const res = await apiRequest(`${BASE_URL}/programs/${testProgramId}/staff`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${ngoBAdminToken}` },
        body: JSON.stringify({ staffId: String(foreignStaffId) })
      });
      const ok = res.status === 404;
      record(8, 'Cross-NGO admin cannot access Program A (HTTP 404 IDOR)', ok, `Status=${res.status}`);
    } catch (err) {
      record(8, 'Cross-NGO admin cannot access Program A (HTTP 404 IDOR)', false, err.message);
    }

    // ----------------------------------------------------------------
    // SECTION 4: STAFF REMOVAL OPERATIONS & VALIDATIONS
    // ----------------------------------------------------------------
    console.log('\n▶ [4. Staff Removal Operations & Validations]');

    // Test 9: Admin successfully removes assigned staff member
    try {
      const res = await apiRequest(`${BASE_URL}/programs/${testProgramId}/staff/${validStaffId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      const prog = res.data?.data?.program;
      const isStillAssigned = (prog?.assignedStaff || []).some((s) => String(s._id || s) === String(validStaffId));

      const auditLog = await AuditLog.findOne({
        entityId: String(testProgramId),
        action: 'update',
        'metadata.action': 'remove_staff',
        'metadata.staffId': String(validStaffId)
      });

      const ok = res.status === 200 && !isStillAssigned && auditLog !== null;
      record(9, 'Admin removes assigned staff member (HTTP 200 + AuditLog)', ok, `Status=${res.status}, AuditLog=${Boolean(auditLog)}`);
    } catch (err) {
      record(9, 'Admin removes assigned staff member (HTTP 200 + AuditLog)', false, err.message);
    }

    // Test 10: Removing staff not assigned rejected (HTTP 404)
    try {
      const res = await apiRequest(`${BASE_URL}/programs/${testProgramId}/staff/${validStaffId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      const ok = res.status === 404 && JSON.stringify(res.data).includes('not assigned');
      record(10, 'Removing unassigned staff member rejected (HTTP 404)', ok, `Status=${res.status}`);
    } catch (err) {
      record(10, 'Removing unassigned staff member rejected (HTTP 404)', false, err.message);
    }

    // Test 11: Invalid ObjectId parameter rejected (HTTP 400)
    try {
      const res = await apiRequest(`${BASE_URL}/programs/${testProgramId}/staff/invalid-staff-id`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      const ok = res.status === 400;
      record(11, 'Invalid staffId parameter format rejected with HTTP 400', ok, `Status=${res.status}`);
    } catch (err) {
      record(11, 'Invalid staffId parameter format rejected with HTTP 400', false, err.message);
    }

  } catch (globalErr) {
    console.error('Fatal test error:', globalErr);
  } finally {
    // Cleanup created test records
    await Program.deleteMany({ code: /^PRG-S2-/ });
    await User.deleteMany({ email: { $in: [
      `inactive-staff-${Date.now()}@ngo.org`,
      `student-user-${Date.now()}@ngo.org`,
      `staff-b-stage2-${Date.now()}@example.org`,
      `admin-b-stage2-${Date.now()}@example.org`
    ] } });
    if (ngoBId) await Ngo.deleteOne({ _id: ngoBId });
    await teardownTestEnvironment();
  }

  const passedCount = results.filter((r) => r.passed).length;
  const totalCount = results.length;
  console.log('\n================================================================');
  console.log(`STAGE 2 TEST SUITE: ${passedCount} / ${totalCount} TESTS PASSED! ${passedCount === totalCount ? '✅' : '❌'}`);
  console.log('================================================================\n');

  if (passedCount !== totalCount) {
    process.exit(1);
  }
};

runStage2Tests();

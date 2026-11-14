/**
 * NGOcore — Phase 6: Complete Program Management & Operational Workflow Verification
 *
 * 64 comprehensive automated regression assertions covering:
 * - Part 1: Program CRUD Lifecycle & Validation (Unique Code, Date Ranges, Capacity Reduction Check, Safe Deletion Guard)
 * - Part 2: Staff Assignment & Management (Atomic Add/Remove, Role Check, Active Check, IDOR Guard, Audit Trail)
 * - Part 3: Beneficiary Enrollment & Capacity Enforcement (Atomic Capacity, Duplicate Check, Withdrawal with Reason, Re-enrollment)
 * - Part 4: Attendance Tracking & Integrity (Roster Check, Session Uniqueness, Duplicate Student Rejection, History & Presence Rates)
 * - Part 5: Multi-Tenant Isolation & Role Authorization (Admin, Staff, Volunteer, Student, Cross-NGO IDOR HTTP 404)
 * - Part 6: 12-Step Realistic End-to-End Operational Lifecycle
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
    `${passed ? '✅' : '❌'} Test ${num.toString().padStart(2, ' ')}: ${name.padEnd(54, ' ')} -> ${
      passed ? 'PASSED' : 'FAILED'
    } (${details})`
  );
};

const runTests = async () => {
  await setupTestEnvironment();

  console.log('\n================================================================');
  console.log('   RUNNING PHASE 6: PROGRAM MANAGEMENT COMPLETE WORKFLOW        ');
  console.log('================================================================\n');

  let adminToken = '';
  let staffToken = '';
  let volunteerToken = '';
  let studentToken = '';

  let ngoAId = '';
  let adminUserId = '';
  let staffUserId = '';
  let volunteerUserId = '';
  let studentUserId = '';
  let inactiveUserId = '';

  // Secondary NGO tokens for tenant isolation
  let ngoBAdminToken = '';
  let ngoBId = '';
  let userBId = '';

  // Test beneficiaries
  let student1Id = '';
  let student2Id = '';
  let student3Id = '';

  try {
    // 1. Authenticate users from Primary NGO
    const adminUser = await User.findOne({ email: config.ADMIN_EMAIL });
    ngoAId = adminUser.ngoId;
    adminUserId = adminUser._id;

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

    const volunteerUser = await User.findOne({ email: 'volunteer@ngo.org' });
    volunteerUserId = volunteerUser._id;
    const volunteerRes = await apiRequest(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: 'volunteer@ngo.org', password: 'VolunteerPass123!' })
    });
    volunteerToken = volunteerRes.accessToken;

    const studentUser = await User.findOne({ email: 'student@ngo.org' });
    studentUserId = studentUser._id;
    const studentRes = await apiRequest(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: 'student@ngo.org', password: 'StudentPass123!' })
    });
    studentToken = studentRes.accessToken;

    // Create an inactive user for negative assignment checks
    const inactiveUser = await User.findOneAndUpdate(
      { email: 'inactive-p6@ngo.org' },
      {
        email: 'inactive-p6@ngo.org',
        password: await bcrypt.hash('Password123!', 10),
        role: 'staff',
        ngoId: ngoAId,
        isActive: false,
        firstName: 'Inactive',
        lastName: 'Staff'
      },
      { upsert: true, new: true }
    );
    inactiveUserId = inactiveUser._id;

    // 2. Setup Secondary NGO for tenant isolation tests
    const timestamp = Date.now();
    const ngoB = await Ngo.create({
      name: `NGO Isolation Test B ${timestamp}`,
      status: 'approved',
      registrationNumber: `REG-ISOLATION-P6-${timestamp}`
    });
    ngoBId = ngoB._id;

    const hashedPassword = await bcrypt.hash('Password123!', 10);
    const userB = await User.create({
      email: `admin-b-p6-${timestamp}@example.org`,
      password: hashedPassword,
      role: 'admin',
      ngoId: ngoBId,
      isActive: true,
      firstName: 'Admin',
      lastName: 'NGO B'
    });
    userBId = userB._id;

    const ngoBLogin = await apiRequest(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: userB.email, password: 'Password123!' })
    });
    ngoBAdminToken = ngoBLogin.accessToken;

    // 3. Clean and prepare test beneficiaries
    await Student.deleteMany({ registrationNumber: /^BEN-P6-/ });
    await Program.deleteMany({ code: /^PRG-P6-/ });

    const s1 = await Student.create({
      ngoId: ngoAId,
      registrationNumber: 'BEN-P6-01',
      firstName: 'Aarav',
      lastName: 'Sharma',
      gender: 'male',
      status: 'active'
    });
    student1Id = s1._id;

    const s2 = await Student.create({
      ngoId: ngoAId,
      registrationNumber: 'BEN-P6-02',
      firstName: 'Diya',
      lastName: 'Patel',
      gender: 'female',
      status: 'active'
    });
    student2Id = s2._id;

    const s3 = await Student.create({
      ngoId: ngoAId,
      registrationNumber: 'BEN-P6-03',
      firstName: 'Kabir',
      lastName: 'Verma',
      gender: 'male',
      status: 'active'
    });
    student3Id = s3._id;

    // ================================================================
    // PART 1: PROGRAM CRUD LIFECYCLE & VALIDATION
    // ================================================================
    console.log('▶ [Part 1: Program CRUD Lifecycle & Validation]');

    let crudProgramId = '';

    // 1. Admin creates program with valid full specification
    try {
      const res = await apiRequest(`${BASE_URL}/programs`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          name: 'Robotics & STEM Workshop',
          code: 'PRG-P6-CRUD',
          type: 'workshop',
          category: 'skill_development',
          description: 'Hands-on robotics and coding curriculum',
          startDate: '2026-11-01',
          endDate: '2026-12-01',
          coordinatorId: String(staffUserId),
          capacity: 10,
          location: 'Main Lab'
        })
      });
      crudProgramId = res.data?.data?.program?._id || res.data?.data?.program?.id;
      const ok = res.status === 201 && crudProgramId && res.data?.data?.program?.code === 'PRG-P6-CRUD';
      record(1, 'Admin creates program with valid full specification', ok, `Status=${res.status}, ID=${crudProgramId}`);
    } catch (err) {
      record(1, 'Admin creates program with valid full specification', false, err.message);
    }

    // 2. Duplicate program code within same NGO rejected (409)
    try {
      const res = await apiRequest(`${BASE_URL}/programs`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          name: 'Duplicate Robotics Workshop',
          code: 'PRG-P6-CRUD',
          type: 'workshop',
          category: 'education'
        })
      });
      const ok = res.status === 409;
      record(2, 'Duplicate program code rejected with HTTP 409', ok, `Status=${res.status}`);
    } catch (err) {
      record(2, 'Duplicate program code rejected with HTTP 409', false, err.message);
    }

    // 3. Date range validation: end date before start date rejected (400)
    try {
      const res = await apiRequest(`${BASE_URL}/programs`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          name: 'Invalid Date Program',
          code: 'PRG-P6-INVALID-DATE',
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

    // 4. Non-existent coordinator ID rejected (400)
    try {
      const res = await apiRequest(`${BASE_URL}/programs`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          name: 'Bad Coordinator Program',
          code: 'PRG-P6-BAD-COORD',
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

    // 5. Get program by ID returns enriched response structure
    try {
      const res = await apiRequest(`${BASE_URL}/programs/${crudProgramId}`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      const data = res.data?.data;
      const prog = data?.program || data;
      const ok =
        res.status === 200 &&
        prog &&
        typeof (data?.enrolledCount ?? prog?.enrolledCount) === 'number' &&
        typeof (data?.availableSeats ?? prog?.availableSeats) === 'number' &&
        typeof (data?.isFull ?? prog?.isFull) === 'boolean' &&
        (data?.attendance !== undefined || prog?.attendance !== undefined);
      record(5, 'Get program returns enriched enrollment and attendance stats', ok, `Enrolled=${data?.enrolledCount ?? prog?.enrolledCount}, Seats=${data?.availableSeats ?? prog?.availableSeats}`);
    } catch (err) {
      record(5, 'Get program returns enriched enrollment and attendance stats', false, err.message);
    }

    // 6. Pre-enroll student in CRUD program to test capacity reduction & safe delete guard
    try {
      const res = await apiRequest(`${BASE_URL}/programs/${crudProgramId}/enrollments`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ studentId: String(student1Id) })
      });
      const ok = res.status === 201;
      record(6, 'Enroll student 1 into CRUD program', ok, `Status=${res.status}`);
    } catch (err) {
      record(6, 'Enroll student 1 into CRUD program', false, err.message);
    }

    // 7. Capacity reduction check: reducing capacity below active enrollments rejected (400)
    try {
      const res = await apiRequest(`${BASE_URL}/programs/${crudProgramId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ capacity: 0 })
      });
      const ok = res.status === 400;
      record(7, 'Capacity reduction below active enrollments rejected with HTTP 400', ok, `Status=${res.status}`);
    } catch (err) {
      record(7, 'Capacity reduction below active enrollments rejected with HTTP 400', false, err.message);
    }

    // 8. Safe Deletion Guard: program with enrollments cannot be deleted (400)
    try {
      const res = await apiRequest(`${BASE_URL}/programs/${crudProgramId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      const ok = res.status === 400 && JSON.stringify(res.data).includes('Cannot permanently delete program');
      record(8, 'Safe Deletion Guard blocks deletion of program with enrollments (HTTP 400)', ok, `Status=${res.status}`);
    } catch (err) {
      record(8, 'Safe Deletion Guard blocks deletion of program with enrollments (HTTP 400)', false, err.message);
    }

    // 9. Safe Deletion Guard: clean program without history deletes successfully (200)
    try {
      const cleanRes = await apiRequest(`${BASE_URL}/programs`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          name: 'Clean Program For Deletion',
          code: 'PRG-P6-CLEAN',
          type: 'event',
          category: 'community'
        })
      });
      const cleanId = cleanRes.data?.data?.program?._id;
      const delRes = await apiRequest(`${BASE_URL}/programs/${cleanId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      const verifyGet = await apiRequest(`${BASE_URL}/programs/${cleanId}`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      const ok = delRes.status === 200 && verifyGet.status === 404;
      record(9, 'Safe Deletion Guard allows deletion of clean program', ok, `DeleteStatus=${delRes.status}, VerifyStatus=${verifyGet.status}`);
    } catch (err) {
      record(9, 'Safe Deletion Guard allows deletion of clean program', false, err.message);
    }

    // ================================================================
    // PART 2: STAFF ASSIGNMENT & MANAGEMENT
    // ================================================================
    console.log('\n▶ [Part 2: Staff Assignment & Management]');

    // 10. Admin assigns active staff user to program (POST /programs/:id/staff)
    try {
      const res = await apiRequest(`${BASE_URL}/programs/${crudProgramId}/staff`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ staffId: String(staffUserId) })
      });
      const ok = res.status === 200 && res.data?.success;
      record(10, 'Admin assigns active staff member to program', ok, `Status=${res.status}`);
    } catch (err) {
      record(10, 'Admin assigns active staff member to program', false, err.message);
    }

    // 11. Verification: assigned staff appears in program assignedStaff array
    try {
      const prog = await Program.findById(crudProgramId);
      const isAssigned = prog.assignedStaff.some((id) => String(id) === String(staffUserId));
      record(11, 'Assigned staff is persisted in program assignedStaff array', isAssigned, `Found=${isAssigned}`);
    } catch (err) {
      record(11, 'Assigned staff is persisted in program assignedStaff array', false, err.message);
    }

    // 12. Duplicate staff assignment rejected (409)
    try {
      const res = await apiRequest(`${BASE_URL}/programs/${crudProgramId}/staff`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ staffId: String(staffUserId) })
      });
      const ok = res.status === 409;
      record(12, 'Duplicate staff assignment rejected with HTTP 409', ok, `Status=${res.status}`);
    } catch (err) {
      record(12, 'Duplicate staff assignment rejected with HTTP 409', false, err.message);
    }

    // 13. Assigning a student user as staff rejected (400)
    try {
      const res = await apiRequest(`${BASE_URL}/programs/${crudProgramId}/staff`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ staffId: String(studentUserId) })
      });
      const ok = res.status === 400 && JSON.stringify(res.data).includes('staff');
      record(13, 'Assigning non-staff/admin user rejected with HTTP 400', ok, `Status=${res.status}`);
    } catch (err) {
      record(13, 'Assigning non-staff/admin user rejected with HTTP 400', false, err.message);
    }

    // 14. Assigning an inactive staff user rejected (400)
    try {
      const res = await apiRequest(`${BASE_URL}/programs/${crudProgramId}/staff`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ staffId: String(inactiveUserId) })
      });
      const ok = res.status === 400 && JSON.stringify(res.data).includes('inactive');
      record(14, 'Assigning inactive staff user rejected with HTTP 400', ok, `Status=${res.status}`);
    } catch (err) {
      record(14, 'Assigning inactive staff user rejected with HTTP 400', false, err.message);
    }

    // 15. Assigning a staff user from another NGO rejected (400 IDOR guard)
    try {
      const res = await apiRequest(`${BASE_URL}/programs/${crudProgramId}/staff`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ staffId: String(userBId) })
      });
      const ok = (res.status === 400 || res.status === 404);
      record(15, 'Assigning staff from external NGO rejected with HTTP 400/404', ok, `Status=${res.status}`);
    } catch (err) {
      record(15, 'Assigning staff from external NGO rejected with HTTP 400/404', false, err.message);
    }

    // 16. Admin removes staff member (DELETE /programs/:id/staff/:staffId)
    try {
      const res = await apiRequest(`${BASE_URL}/programs/${crudProgramId}/staff/${staffUserId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      const ok = res.status === 200 && res.data?.success;
      record(16, 'Admin removes staff member with HTTP 200', ok, `Status=${res.status}`);
    } catch (err) {
      record(16, 'Admin removes staff member with HTTP 200', false, err.message);
    }

    // 17. Verification: assigned staff is removed from program
    try {
      const prog = await Program.findById(crudProgramId);
      const isStillAssigned = prog.assignedStaff.some((id) => String(id) === String(staffUserId));
      record(17, 'Staff member is removed from program assignedStaff array', !isStillAssigned, `StillAssigned=${isStillAssigned}`);
    } catch (err) {
      record(17, 'Staff member is removed from program assignedStaff array', false, err.message);
    }

    // 18. Removing staff member who is not assigned rejected (400 or 404)
    try {
      const res = await apiRequest(`${BASE_URL}/programs/${crudProgramId}/staff/${staffUserId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      const ok = (res.status === 400 || res.status === 404);
      record(18, 'Removing non-assigned staff member rejected with HTTP 400/404', ok, `Status=${res.status}`);
    } catch (err) {
      record(18, 'Removing non-assigned staff member rejected with HTTP 400/404', false, err.message);
    }

    // 19. Audit logs verify staff assignment and removal
    try {
      const assignLog = await AuditLog.findOne({ entityId: String(crudProgramId), 'metadata.action': 'assign_staff' });
      const removeLog = await AuditLog.findOne({ entityId: String(crudProgramId), 'metadata.action': 'remove_staff' });
      const ok = !!assignLog && !!removeLog;
      record(19, 'Audit log entries created for staff assignment and removal', ok, `Assign=${!!assignLog}, Remove=${!!removeLog}`);
    } catch (err) {
      record(19, 'Audit log entries created for staff assignment and removal', false, err.message);
    }

    // ================================================================
    // PART 3: BENEFICIARY ENROLLMENT & CAPACITY ENFORCEMENT
    // ================================================================
    console.log('\n▶ [Part 3: Beneficiary Enrollment & Capacity Enforcement]');

    let capProgramId = '';

    // 20. Create program with capacity = 2
    try {
      const res = await apiRequest(`${BASE_URL}/programs`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          name: 'Computer Basics Cohort',
          code: 'PRG-P6-CAP',
          type: 'course',
          category: 'skill_development',
          capacity: 2
        })
      });
      capProgramId = res.data?.data?.program?._id;
      const ok = res.status === 201 && capProgramId;
      record(20, 'Create capacity-constrained program (Capacity = 2)', ok, `Status=${res.status}, ID=${capProgramId}`);
    } catch (err) {
      record(20, 'Create capacity-constrained program (Capacity = 2)', false, err.message);
    }

    // 21. Staff enrolls Beneficiary 1 (POST /programs/:id/enrollments)
    let enrollment1Doc = null;
    try {
      const res = await apiRequest(`${BASE_URL}/programs/${capProgramId}/enrollments`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${staffToken}` },
        body: JSON.stringify({ studentId: String(student1Id) })
      });
      enrollment1Doc = res.data?.data?.enrollment;
      const ok = res.status === 201 && enrollment1Doc && enrollment1Doc.status === 'enrolled';
      record(21, 'Staff enrolls Beneficiary 1 with HTTP 201', ok, `Status=${res.status}, EnrollmentID=${enrollment1Doc?._id}`);
    } catch (err) {
      record(21, 'Staff enrolls Beneficiary 1 with HTTP 201', false, err.message);
    }

    // 22. Enrollment document records enrolledBy reference
    try {
      const enrollmentInDb = await ProgramEnrollment.findById(enrollment1Doc._id);
      const ok = enrollmentInDb && String(enrollmentInDb.enrolledBy) === String(staffUserId);
      record(22, 'Enrollment document stores correct enrolledBy reference', ok, `EnrolledBy=${enrollmentInDb?.enrolledBy}`);
    } catch (err) {
      record(22, 'Enrollment document stores correct enrolledBy reference', false, err.message);
    }

    // 23. Duplicate active enrollment of Beneficiary 1 rejected (409)
    try {
      const res = await apiRequest(`${BASE_URL}/programs/${capProgramId}/enrollments`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${staffToken}` },
        body: JSON.stringify({ studentId: String(student1Id) })
      });
      const ok = res.status === 409;
      record(23, 'Duplicate active enrollment rejected with HTTP 409', ok, `Status=${res.status}`);
    } catch (err) {
      record(23, 'Duplicate active enrollment rejected with HTTP 409', false, err.message);
    }

    // 24. Program enriched details show enrolledCount=1, availableSeats=1, isFull=false
    try {
      const res = await apiRequest(`${BASE_URL}/programs/${capProgramId}`, {
        headers: { Authorization: `Bearer ${staffToken}` }
      });
      const data = res.data?.data;
      const ok = data && data.enrolledCount === 1 && data.availableSeats === 1 && data.isFull === false;
      record(24, 'Program stats reflect 1 enrolled and 1 available seat', ok, `Enrolled=${data?.enrolledCount}, Left=${data?.availableSeats}, Full=${data?.isFull}`);
    } catch (err) {
      record(24, 'Program stats reflect 1 enrolled and 1 available seat', false, err.message);
    }

    // 25. Staff enrolls Beneficiary 2 (reaches capacity 2)
    try {
      const res = await apiRequest(`${BASE_URL}/programs/${capProgramId}/enrollments`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${staffToken}` },
        body: JSON.stringify({ studentId: String(student2Id) })
      });
      const ok = res.status === 201;
      record(25, 'Staff enrolls Beneficiary 2 reaching capacity', ok, `Status=${res.status}`);
    } catch (err) {
      record(25, 'Staff enrolls Beneficiary 2 reaching capacity', false, err.message);
    }

    // 26. Program enriched details show enrolledCount=2, availableSeats=0, isFull=true
    try {
      const res = await apiRequest(`${BASE_URL}/programs/${capProgramId}`, {
        headers: { Authorization: `Bearer ${staffToken}` }
      });
      const data = res.data?.data;
      const ok = data && data.enrolledCount === 2 && data.availableSeats === 0 && data.isFull === true;
      record(26, 'Program stats show maximum capacity reached (isFull=true)', ok, `Enrolled=${data?.enrolledCount}, Left=${data?.availableSeats}, Full=${data?.isFull}`);
    } catch (err) {
      record(26, 'Program stats show maximum capacity reached (isFull=true)', false, err.message);
    }

    // 27. Attempting to enroll Beneficiary 3 when capacity is full rejected (400 or 409)
    try {
      const res = await apiRequest(`${BASE_URL}/programs/${capProgramId}/enrollments`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${staffToken}` },
        body: JSON.stringify({ studentId: String(student3Id) })
      });
      const ok = (res.status === 400 || res.status === 409) && JSON.stringify(res.data).includes('capacity');
      record(27, 'Enrollment beyond capacity rejected with HTTP 400/409', ok, `Status=${res.status}`);
    } catch (err) {
      record(27, 'Enrollment beyond capacity rejected with HTTP 400/409', false, err.message);
    }

    // 28. Withdrawal with reason: Beneficiary 1 withdraws
    try {
      const res = await apiRequest(`${BASE_URL}/programs/${capProgramId}/enrollments/${student1Id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${staffToken}` },
        body: JSON.stringify({ status: 'withdrawn', reason: 'Relocated to Pune' })
      });
      const ok = res.status === 200 && res.data?.success;
      record(28, 'Beneficiary withdrawal with reason succeeds (HTTP 200)', ok, `Status=${res.status}`);
    } catch (err) {
      record(28, 'Beneficiary withdrawal with reason succeeds (HTTP 200)', false, err.message);
    }

    // 29. Verification: withdrawal stores withdrawalReason and withdrawnAt
    try {
      const enrollmentInDb = await ProgramEnrollment.findOne({ programId: capProgramId, studentId: student1Id });
      const ok =
        enrollmentInDb &&
        enrollmentInDb.status === 'withdrawn' &&
        enrollmentInDb.withdrawalReason === 'Relocated to Pune' &&
        enrollmentInDb.withdrawnAt !== null;
      record(29, 'Withdrawal fields persisted (withdrawnAt, withdrawalReason)', ok, `Status=${enrollmentInDb?.status}, Reason=${enrollmentInDb?.withdrawalReason}`);
    } catch (err) {
      record(29, 'Withdrawal fields persisted (withdrawnAt, withdrawalReason)', false, err.message);
    }

    // 30. Re-enrollment: re-enrolling previously withdrawn student succeeds and reactivates seat
    try {
      const res = await apiRequest(`${BASE_URL}/programs/${capProgramId}/enrollments`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${staffToken}` },
        body: JSON.stringify({ studentId: String(student1Id) })
      });
      const reEnrolledInDb = await ProgramEnrollment.findOne({ programId: capProgramId, studentId: student1Id });
      const ok =
        res.status === 201 &&
        reEnrolledInDb &&
        reEnrolledInDb.status === 'enrolled' &&
        !reEnrolledInDb.withdrawalReason;
      record(30, 'Re-enrolling withdrawn student reactivates enrollment & clears reason', ok, `Status=${reEnrolledInDb?.status}`);
    } catch (err) {
      record(30, 'Re-enrolling withdrawn student reactivates enrollment & clears reason', false, err.message);
    }

    // ================================================================
    // PART 4: ATTENDANCE TRACKING & INTEGRITY
    // ================================================================
    console.log('\n▶ [Part 4: Attendance Tracking & Integrity]');

    // 31. Record attendance session (PUT /programs/:id/attendance)
    try {
      const res = await apiRequest(`${BASE_URL}/programs/${capProgramId}/attendance`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${staffToken}` },
        body: JSON.stringify({
          date: '2026-11-10',
          entries: [
            { studentId: String(student1Id), status: 'present', note: 'Participated actively' },
            { studentId: String(student2Id), status: 'absent', note: 'Sick leave' }
          ]
        })
      });
      const ok = res.status === 200 && res.data?.success;
      record(31, 'Record attendance session for date with HTTP 200', ok, `Status=${res.status}`);
    } catch (err) {
      record(31, 'Record attendance session for date with HTTP 200', false, err.message);
    }

    // 32. Attendance session created in DB with recorded entries and correct status counts
    try {
      const session = await AttendanceSession.findOne({ programId: capProgramId, sessionDate: new Date('2026-11-10T00:00:00.000Z') });
      const presentCount = session?.entries.filter((e) => e.status === 'present').length;
      const absentCount = session?.entries.filter((e) => e.status === 'absent').length;
      const ok =
        session &&
        presentCount === 1 &&
        absentCount === 1 &&
        session.entries.length === 2;
      record(32, 'Attendance session document stores correct counts (1 present, 1 absent)', ok, `Present=${presentCount}, Absent=${absentCount}`);
    } catch (err) {
      record(32, 'Attendance session document stores correct counts (1 present, 1 absent)', false, err.message);
    }

    // 33. Duplicate student entries within the same session payload rejected (400)
    try {
      const res = await apiRequest(`${BASE_URL}/programs/${capProgramId}/attendance`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${staffToken}` },
        body: JSON.stringify({
          date: '2026-11-11',
          entries: [
            { studentId: String(student1Id), status: 'present' },
            { studentId: String(student1Id), status: 'absent' }
          ]
        })
      });
      const ok = res.status === 400 && JSON.stringify(res.data).includes('duplicate');
      record(33, 'Duplicate student entries in attendance payload rejected (HTTP 400)', ok, `Status=${res.status}`);
    } catch (err) {
      record(33, 'Duplicate student entries in attendance payload rejected (HTTP 400)', false, err.message);
    }

    // 34. Marking attendance for a student NOT enrolled in program rejected (400)
    try {
      const res = await apiRequest(`${BASE_URL}/programs/${capProgramId}/attendance`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${staffToken}` },
        body: JSON.stringify({
          date: '2026-11-11',
          entries: [
            { studentId: String(student3Id), status: 'present' }
          ]
        })
      });
      const ok = res.status === 400 && JSON.stringify(res.data).includes('enrolled');
      record(34, 'Marking attendance for unenrolled student rejected with HTTP 400', ok, `Status=${res.status}`);
    } catch (err) {
      record(34, 'Marking attendance for unenrolled student rejected with HTTP 400', false, err.message);
    }

    // 35. Attendance session with invalid status rejected (400)
    try {
      const res = await apiRequest(`${BASE_URL}/programs/${capProgramId}/attendance`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${staffToken}` },
        body: JSON.stringify({
          date: '2026-11-11',
          entries: [
            { studentId: String(student1Id), status: 'unknown_status' }
          ]
        })
      });
      const ok = res.status === 400;
      record(35, 'Invalid attendance status rejected with HTTP 400', ok, `Status=${res.status}`);
    } catch (err) {
      record(35, 'Invalid attendance status rejected with HTTP 400', false, err.message);
    }

    // 36. Updating attendance for existing session date updates session without creating duplicate
    try {
      const res = await apiRequest(`${BASE_URL}/programs/${capProgramId}/attendance`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${staffToken}` },
        body: JSON.stringify({
          date: '2026-11-10',
          entries: [
            { studentId: String(student1Id), status: 'present' },
            { studentId: String(student2Id), status: 'present', note: 'Late arrival - marked present' }
          ]
        })
      });
      const count = await AttendanceSession.countDocuments({
        programId: capProgramId,
        sessionDate: new Date('2026-11-10T00:00:00.000Z')
      });
      const updatedSession = await AttendanceSession.findOne({
        programId: capProgramId,
        sessionDate: new Date('2026-11-10T00:00:00.000Z')
      });
      const presentCount = updatedSession?.entries.filter((e) => e.status === 'present').length;
      const ok = res.status === 200 && count === 1 && presentCount === 2;
      record(36, 'Re-saving session updates existing record without duplicate', ok, `Count=${count}, Present=${presentCount}`);
    } catch (err) {
      record(36, 'Re-saving session updates existing record without duplicate', false, err.message);
    }

    // 37. GET /programs/:id/attendance-history returns paginated sessions
    try {
      const res = await apiRequest(`${BASE_URL}/programs/${capProgramId}/attendance-history`, {
        headers: { Authorization: `Bearer ${staffToken}` }
      });
      const data = res.data?.data;
      const ok =
        res.status === 200 &&
        data &&
        Array.isArray(data.sessions) &&
        data.sessions.length >= 1 &&
        data.sessions[0].presenceRate !== undefined;
      record(37, 'GET attendance-history returns paginated sessions with presenceRate', ok, `Sessions=${data?.sessions?.length}, Rate=${data?.sessions?.[0]?.presenceRate}%`);
    } catch (err) {
      record(37, 'GET attendance-history returns paginated sessions with presenceRate', false, err.message);
    }

    // 38. Attendance history calculates overall presence rate matching formula (100% since both present)
    try {
      const res = await apiRequest(`${BASE_URL}/programs/${capProgramId}/attendance-history`, {
        headers: { Authorization: `Bearer ${staffToken}` }
      });
      const stats = res.data?.data?.stats || res.data?.data?.overallStats;
      const rate = stats?.overallPresenceRate ?? stats?.presenceRate;
      const ok = stats && rate === 100 && stats.presentCount === 2;
      record(38, 'Overall presence rate matches formula: (present / (present + absent)) * 100', ok, `Rate=${rate}%, Present=${stats?.presentCount}`);
    } catch (err) {
      record(38, 'Overall presence rate matches formula: (present / (present + absent)) * 100', false, err.message);
    }

    // ================================================================
    // PART 5: MULTI-TENANT ISOLATION & ROLE-BASED ACCESS CONTROL
    // ================================================================
    console.log('\n▶ [Part 5: Multi-Tenant Isolation & Role Authorization]');

    // 39. Admin has full access to program listing
    try {
      const res = await apiRequest(`${BASE_URL}/programs`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      const ok = res.status === 200 && Array.isArray(res.data?.data?.programs);
      record(39, 'Admin has full access to program listing (HTTP 200)', ok, `Count=${res.data?.data?.programs?.length}`);
    } catch (err) {
      record(39, 'Admin has full access to program listing (HTTP 200)', false, err.message);
    }

    // 40. Staff can view programs and enroll students
    try {
      const res = await apiRequest(`${BASE_URL}/programs`, {
        headers: { Authorization: `Bearer ${staffToken}` }
      });
      const ok = res.status === 200 && Array.isArray(res.data?.data?.programs);
      record(40, 'Staff has read access to NGO programs (HTTP 200)', ok, `Status=${res.status}`);
    } catch (err) {
      record(40, 'Staff has read access to NGO programs (HTTP 200)', false, err.message);
    }

    // 41. Staff can record attendance
    try {
      const res = await apiRequest(`${BASE_URL}/programs/${capProgramId}/attendance`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${staffToken}` },
        body: JSON.stringify({
          date: '2026-11-12',
          entries: [
            { studentId: String(student1Id), status: 'present' },
            { studentId: String(student2Id), status: 'excused' }
          ]
        })
      });
      const ok = res.status === 200;
      record(41, 'Staff can record attendance sessions (HTTP 200)', ok, `Status=${res.status}`);
    } catch (err) {
      record(41, 'Staff can record attendance sessions (HTTP 200)', false, err.message);
    }

    // 42. Staff cannot delete a program (403 Forbidden)
    try {
      const res = await apiRequest(`${BASE_URL}/programs/${capProgramId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${staffToken}` }
      });
      const ok = res.status === 403;
      record(42, 'Staff cannot delete a program (HTTP 403 Forbidden)', ok, `Status=${res.status}`);
    } catch (err) {
      record(42, 'Staff cannot delete a program (HTTP 403 Forbidden)', false, err.message);
    }

    // 43. Volunteer cannot create a program (403 Forbidden)
    try {
      const res = await apiRequest(`${BASE_URL}/programs`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${volunteerToken}` },
        body: JSON.stringify({
          name: 'Volunteer Program Attempt',
          code: 'PRG-VOL-ATTEMPT',
          type: 'course',
          category: 'education'
        })
      });
      const ok = res.status === 403;
      record(43, 'Volunteer cannot create a program (HTTP 403 Forbidden)', ok, `Status=${res.status}`);
    } catch (err) {
      record(43, 'Volunteer cannot create a program (HTTP 403 Forbidden)', false, err.message);
    }

    // 44. Volunteer cannot delete a program (403 Forbidden)
    try {
      const res = await apiRequest(`${BASE_URL}/programs/${capProgramId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${volunteerToken}` }
      });
      const ok = res.status === 403;
      record(44, 'Volunteer cannot delete a program (HTTP 403 Forbidden)', ok, `Status=${res.status}`);
    } catch (err) {
      record(44, 'Volunteer cannot delete a program (HTTP 403 Forbidden)', false, err.message);
    }

    // 45. Volunteer cannot assign staff (403 Forbidden)
    try {
      const res = await apiRequest(`${BASE_URL}/programs/${capProgramId}/staff`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${volunteerToken}` },
        body: JSON.stringify({ staffId: String(staffUserId) })
      });
      const ok = res.status === 403;
      record(45, 'Volunteer cannot assign staff (HTTP 403 Forbidden)', ok, `Status=${res.status}`);
    } catch (err) {
      record(45, 'Volunteer cannot assign staff (HTTP 403 Forbidden)', false, err.message);
    }

    // 46. Student cannot access program management (403 Forbidden)
    try {
      const res = await apiRequest(`${BASE_URL}/programs`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${studentToken}` },
        body: JSON.stringify({
          name: 'Student Program Attempt',
          code: 'PRG-STUDENT-ATTEMPT',
          type: 'course',
          category: 'education'
        })
      });
      const ok = res.status === 403;
      record(46, 'Student cannot access program creation (HTTP 403 Forbidden)', ok, `Status=${res.status}`);
    } catch (err) {
      record(46, 'Student cannot access program creation (HTTP 403 Forbidden)', false, err.message);
    }

    // 47. Cross-NGO Isolation: NGO-B admin attempting GET NGO-A program receives 404
    try {
      const res = await apiRequest(`${BASE_URL}/programs/${capProgramId}`, {
        headers: { Authorization: `Bearer ${ngoBAdminToken}` }
      });
      const ok = res.status === 404;
      record(47, 'Cross-NGO IDOR: GET program returns HTTP 404', ok, `Status=${res.status}`);
    } catch (err) {
      record(47, 'Cross-NGO IDOR: GET program returns HTTP 404', false, err.message);
    }

    // 48. Cross-NGO Isolation: NGO-B admin attempting PUT NGO-A program receives 404
    try {
      const res = await apiRequest(`${BASE_URL}/programs/${capProgramId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${ngoBAdminToken}` },
        body: JSON.stringify({ name: 'Tampered By NGO B' })
      });
      const ok = res.status === 404;
      record(48, 'Cross-NGO IDOR: PUT program returns HTTP 404', ok, `Status=${res.status}`);
    } catch (err) {
      record(48, 'Cross-NGO IDOR: PUT program returns HTTP 404', false, err.message);
    }

    // 49. Cross-NGO Isolation: NGO-B admin attempting DELETE NGO-A program receives 404
    try {
      const res = await apiRequest(`${BASE_URL}/programs/${capProgramId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${ngoBAdminToken}` }
      });
      const ok = res.status === 404;
      record(49, 'Cross-NGO IDOR: DELETE program returns HTTP 404', ok, `Status=${res.status}`);
    } catch (err) {
      record(49, 'Cross-NGO IDOR: DELETE program returns HTTP 404', false, err.message);
    }

    // 50. Cross-NGO Isolation: NGO-B admin attempting POST staff receives 404
    try {
      const res = await apiRequest(`${BASE_URL}/programs/${capProgramId}/staff`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${ngoBAdminToken}` },
        body: JSON.stringify({ staffId: String(userBId) })
      });
      const ok = res.status === 404;
      record(50, 'Cross-NGO IDOR: POST staff assignment returns HTTP 404', ok, `Status=${res.status}`);
    } catch (err) {
      record(50, 'Cross-NGO IDOR: POST staff assignment returns HTTP 404', false, err.message);
    }

    // 51. Cross-NGO Isolation: NGO-B admin attempting enrollment receives 404
    try {
      const res = await apiRequest(`${BASE_URL}/programs/${capProgramId}/enrollments`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${ngoBAdminToken}` },
        body: JSON.stringify({ studentId: String(student1Id) })
      });
      const ok = res.status === 404;
      record(51, 'Cross-NGO IDOR: POST enrollment returns HTTP 404', ok, `Status=${res.status}`);
    } catch (err) {
      record(51, 'Cross-NGO IDOR: POST enrollment returns HTTP 404', false, err.message);
    }

    // 52. Cross-NGO Isolation: NGO-B admin attempting attendance history receives 404
    try {
      const res = await apiRequest(`${BASE_URL}/programs/${capProgramId}/attendance-history`, {
        headers: { Authorization: `Bearer ${ngoBAdminToken}` }
      });
      const ok = res.status === 404;
      record(52, 'Cross-NGO IDOR: GET attendance-history returns HTTP 404', ok, `Status=${res.status}`);
    } catch (err) {
      record(52, 'Cross-NGO IDOR: GET attendance-history returns HTTP 404', false, err.message);
    }

    // ================================================================
    // PART 6: 12-STEP REALISTIC END-TO-END OPERATIONAL LIFECYCLE
    // ================================================================
    console.log('\n▶ [Part 6: 12-Step Realistic End-to-End Operational Lifecycle]');

    let e2eProgramId = '';

    // Step 1: NGO Admin configures a new digital literacy cohort with capacity of 2
    try {
      const res = await apiRequest(`${BASE_URL}/programs`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          name: 'Digital Empowerment Cohort Alpha',
          code: 'PRG-P6-E2E-LIFECYCLE',
          type: 'course',
          category: 'skill_development',
          description: 'Comprehensive digital literacy training for youth',
          startDate: '2026-11-01',
          endDate: '2026-12-31',
          capacity: 2,
          location: 'Community Tech Center'
        })
      });
      e2eProgramId = res.data?.data?.program?._id;
      const ok = res.status === 201 && e2eProgramId;
      record(53, 'E2E Step 1: Admin configures new cohort with capacity of 2', ok, `ID=${e2eProgramId}`);
    } catch (err) {
      record(53, 'E2E Step 1: Admin configures new cohort with capacity of 2', false, err.message);
    }

    // Step 2: NGO Admin assigns designated staff instructor to manage the cohort
    try {
      const res = await apiRequest(`${BASE_URL}/programs/${e2eProgramId}/staff`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ staffId: String(staffUserId) })
      });
      const ok = res.status === 200 && res.data?.success;
      record(54, 'E2E Step 2: Admin assigns designated staff instructor', ok, `Status=${res.status}`);
    } catch (err) {
      record(54, 'E2E Step 2: Admin assigns designated staff instructor', false, err.message);
    }

    // Step 3: Staff instructor verifies their assigned cohort in program listing
    try {
      const res = await apiRequest(`${BASE_URL}/programs`, {
        headers: { Authorization: `Bearer ${staffToken}` }
      });
      const programs = res.data?.data?.programs || [];
      const found = programs.find((p) => (p._id || p.id) === e2eProgramId);
      const ok = res.status === 200 && !!found && found.assignedStaff.some((s) => (s._id || s.id || s) === String(staffUserId));
      record(55, 'E2E Step 3: Staff instructor verifies assigned cohort in listing', ok, `Found=${!!found}`);
    } catch (err) {
      record(55, 'E2E Step 3: Staff instructor verifies assigned cohort in listing', false, err.message);
    }

    // Step 4: Staff instructor enrolls Beneficiary 1 and Beneficiary 2, reaching capacity limit
    try {
      const res1 = await apiRequest(`${BASE_URL}/programs/${e2eProgramId}/enrollments`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${staffToken}` },
        body: JSON.stringify({ studentId: String(student1Id) })
      });
      const res2 = await apiRequest(`${BASE_URL}/programs/${e2eProgramId}/enrollments`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${staffToken}` },
        body: JSON.stringify({ studentId: String(student2Id) })
      });
      const ok = res1.status === 201 && res2.status === 201;
      record(56, 'E2E Step 4: Staff enrolls Beneficiary 1 and 2 reaching capacity', ok, `S1=${res1.status}, S2=${res2.status}`);
    } catch (err) {
      record(56, 'E2E Step 4: Staff enrolls Beneficiary 1 and 2 reaching capacity', false, err.message);
    }

    // Step 5: System blocks enrollment of Beneficiary 3 due to strict capacity constraint
    try {
      const res = await apiRequest(`${BASE_URL}/programs/${e2eProgramId}/enrollments`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${staffToken}` },
        body: JSON.stringify({ studentId: String(student3Id) })
      });
      const ok = (res.status === 400 || res.status === 409) && JSON.stringify(res.data).includes('capacity');
      record(57, 'E2E Step 5: System blocks Beneficiary 3 (Capacity Full)', ok, `Status=${res.status}`);
    } catch (err) {
      record(57, 'E2E Step 5: System blocks Beneficiary 3 (Capacity Full)', false, err.message);
    }

    // Step 6: Staff instructor conducts Session 1 on day 1 (Beneficiary 1 Present, Beneficiary 2 Absent with note)
    try {
      const res = await apiRequest(`${BASE_URL}/programs/${e2eProgramId}/attendance`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${staffToken}` },
        body: JSON.stringify({
          date: '2026-11-03',
          entries: [
            { studentId: String(student1Id), status: 'present', note: 'Engaged and punctual' },
            { studentId: String(student2Id), status: 'absent', note: 'Family emergency' }
          ]
        })
      });
      const ok = res.status === 200;
      record(58, 'E2E Step 6: Staff records Session 1 (1 Present, 1 Absent)', ok, `Status=${res.status}`);
    } catch (err) {
      record(58, 'E2E Step 6: Staff records Session 1 (1 Present, 1 Absent)', false, err.message);
    }

    // Step 7: Staff instructor conducts Session 2 on day 2 (both Beneficiaries Present)
    try {
      const res = await apiRequest(`${BASE_URL}/programs/${e2eProgramId}/attendance`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${staffToken}` },
        body: JSON.stringify({
          date: '2026-11-04',
          entries: [
            { studentId: String(student1Id), status: 'present' },
            { studentId: String(student2Id), status: 'present' }
          ]
        })
      });
      const ok = res.status === 200;
      record(59, 'E2E Step 7: Staff records Session 2 (2 Present)', ok, `Status=${res.status}`);
    } catch (err) {
      record(59, 'E2E Step 7: Staff records Session 2 (2 Present)', false, err.message);
    }

    // Step 8: Beneficiary 2 withdraws due to relocation with recorded explanation
    try {
      const res = await apiRequest(`${BASE_URL}/programs/${e2eProgramId}/enrollments/${student2Id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${staffToken}` },
        body: JSON.stringify({ status: 'withdrawn', reason: 'Family moved to Bangalore' })
      });
      const ok = res.status === 200 && res.data?.success;
      record(60, 'E2E Step 8: Beneficiary 2 withdraws with reason (Family moved)', ok, `Status=${res.status}`);
    } catch (err) {
      record(60, 'E2E Step 8: Beneficiary 2 withdraws with reason (Family moved)', false, err.message);
    }

    // Step 9: Vacated seat allows Beneficiary 3 to be enrolled into the cohort
    try {
      const res = await apiRequest(`${BASE_URL}/programs/${e2eProgramId}/enrollments`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${staffToken}` },
        body: JSON.stringify({ studentId: String(student3Id) })
      });
      const ok = res.status === 201;
      record(61, 'E2E Step 9: Vacated seat allows Beneficiary 3 to be enrolled', ok, `Status=${res.status}`);
    } catch (err) {
      record(61, 'E2E Step 9: Vacated seat allows Beneficiary 3 to be enrolled', false, err.message);
    }

    // Step 10: Staff instructor marks Session 3 with newly enrolled Beneficiary 3
    try {
      const res = await apiRequest(`${BASE_URL}/programs/${e2eProgramId}/attendance`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${staffToken}` },
        body: JSON.stringify({
          date: '2026-11-05',
          entries: [
            { studentId: String(student1Id), status: 'present' },
            { studentId: String(student3Id), status: 'present', note: 'First class for Beneficiary 3' }
          ]
        })
      });
      const ok = res.status === 200;
      record(62, 'E2E Step 10: Staff marks Session 3 with newly enrolled Beneficiary 3', ok, `Status=${res.status}`);
    } catch (err) {
      record(62, 'E2E Step 10: Staff marks Session 3 with newly enrolled Beneficiary 3', false, err.message);
    }

    // Step 11: Program details and attendance history verify multi-session presence rate & roster history
    try {
      const historyRes = await apiRequest(`${BASE_URL}/programs/${e2eProgramId}/attendance-history`, {
        headers: { Authorization: `Bearer ${staffToken}` }
      });
      const stats = historyRes.data?.data?.stats || historyRes.data?.data?.overallStats;
      const rate = stats?.overallPresenceRate ?? stats?.presenceRate;
      const sessions = historyRes.data?.data?.sessions || [];
      // Session 1: 1 present, 1 absent (50%)
      // Session 2: 2 present (100%)
      // Session 3: 2 present (100%)
      // Overall: 5 present / (5 present + 1 absent) = 5/6 = 83.33% => 83%
      const ok =
        historyRes.status === 200 &&
        sessions.length === 3 &&
        stats &&
        stats.totalSessions === 3 &&
        stats.presentCount === 5 &&
        stats.absentCount === 1 &&
        rate === 83;
      record(63, 'E2E Step 11: Attendance history reflects 3 sessions and 83% presence rate', ok, `Sessions=${sessions.length}, Present=${stats?.presentCount}, Rate=${rate}%`);
    } catch (err) {
      record(63, 'E2E Step 11: Attendance history reflects 3 sessions and 83% presence rate', false, err.message);
    }

    // Step 12: Admin verifies that program with active history cannot be accidentally deleted
    try {
      const res = await apiRequest(`${BASE_URL}/programs/${e2eProgramId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      const ok = res.status === 400 && JSON.stringify(res.data).includes('Cannot permanently delete program');
      record(64, 'E2E Step 12: Safe Deletion Guard blocks accidental deletion of active program', ok, `Status=${res.status}`);
    } catch (err) {
      record(64, 'E2E Step 12: Safe Deletion Guard blocks accidental deletion of active program', false, err.message);
    }

    // Clean up
    await Student.deleteMany({ registrationNumber: /^BEN-P6-/ });
    await Program.deleteMany({ code: /^PRG-P6-/ });
    await User.findByIdAndDelete(inactiveUserId);
    await User.findByIdAndDelete(userBId);
    await Ngo.findByIdAndDelete(ngoBId);

  } catch (err) {
    console.error('Fatal test error:', err);
  } finally {
    await teardownTestEnvironment();
  }

  const passed = results.filter((r) => r.passed).length;
  const total = results.length;

  console.log('\n================================================================');
  console.log(`PROGRAM LIFECYCLE TEST SUITE: ${passed} / ${total} TESTS PASSED! ${passed === total ? '✅' : '❌'}`);
  console.log('================================================================\n');

  if (passed !== total) {
    process.exit(1);
  }
};

runTests().catch((err) => {
  console.error('Test runner failure:', err);
  process.exit(1);
});

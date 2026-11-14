/**
 * NGOcore — Phase 5: Beneficiary Management Complete Lifecycle & Workflow Verification
 *
 * 51 comprehensive automated regression assertions covering:
 * - Part 1: Full Beneficiary CRUD, Normalization, Duplicate Pre-check & Safe Deletion Guard
 * - Part 2: Extended Server-Side Search, Multi-Filter (State, PIN, Program, Status, Gender) & Sorting
 * - Part 3: Program Participation, Attendance Tracking & Enrollment History
 * - Part 4: Data Quality (DQI), Itemized Deductions, AI Proposals & HMAC-Verified Human Review
 * - Part 5: Role-Based Access Control, IDOR Prevention & Multi-Tenant NGO Isolation
 * - Part 6: 10-Step Realistic End-to-End Operational Lifecycle
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
const geminiService = require('../services/geminiService');
const { apiRequest } = require('./apiTestClient');
const { setupTestEnvironment, teardownTestEnvironment } = require('./testHelper');

const BASE_URL = `http://localhost:${config.PORT}/api/v1`;

const results = [];

const record = (num, name, passed, details) => {
  results.push({ num, name, passed, details });
  console.log(
    `${passed ? '✅' : '❌'} Test ${num.toString().padStart(2, ' ')}: ${name.padEnd(52, ' ')} -> ${
      passed ? 'PASSED' : 'FAILED'
    } (${details})`
  );
};

const runTests = async () => {
  await setupTestEnvironment();

  console.log('\n================================================================');
  console.log('   RUNNING PHASE 5: BENEFICIARY MANAGEMENT COMPLETE WORKFLOW    ');
  console.log('================================================================\n');

  let adminToken = '';
  let staffToken = '';
  let volunteerToken = '';
  let studentToken = '';
  let studentUserId = '';
  let ngoAId = '';
  let adminUserId = '';

  // Secondary NGO tokens for tenant isolation
  let ngoBAdminToken = '';
  let ngoBId = '';

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

    const staffRes = await apiRequest(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: 'staff@ngo.org', password: 'StaffPassword123!' })
    });
    staffToken = staffRes.accessToken;

    const volunteerRes = await apiRequest(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: 'volunteer@ngo.org', password: 'VolunteerPass123!' })
    });
    volunteerToken = volunteerRes.accessToken;

    const studentRes = await apiRequest(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: 'student@ngo.org', password: 'StudentPass123!' })
    });
    studentToken = studentRes.accessToken;
    studentUserId = studentRes.data?.data?.user?.id || studentRes.data?.data?.user?._id;

    // 2. Setup Secondary NGO for isolation tests
    const timestamp = Date.now();
    const ngoB = await Ngo.create({
      name: `NGO Isolation Test B ${timestamp}`,
      status: 'approved',
      registrationNumber: `REG-ISOLATION-B-${timestamp}`
    });
    ngoBId = ngoB._id;

    const hashedPassword = await bcrypt.hash('Password123!', 10);
    const userB = await User.create({
      email: `admin-b-${timestamp}@example.org`,
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
    await Student.deleteMany({ registrationNumber: /^BEN-P5-/ });
    await Program.deleteMany({ code: /^PRG-P5-/ });

    console.log('▶ [Part 1: Beneficiary CRUD, Normalization & Safe Deletion Guard]');

    // Test 1: Create beneficiary with normalized phone, title-trimmed names, PIN, DOB
    let createdStudent1Id = '';
    try {
      const res = await apiRequest(`${BASE_URL}/students`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${staffToken}` },
        body: JSON.stringify({
          registrationNumber: 'BEN-P5-001',
          firstName: '  Priya  ',
          lastName: '  Sharma  ',
          phone: '9876543210',
          email: 'priya.sharma@example.org',
          dateOfBirth: '2005-06-15',
          gender: 'female',
          address: '42 MG Road, Bandra West',
          state: 'Maharashtra',
          pinCode: '400050',
          educationLevel: 'Secondary School',
          schoolName: 'St. Xavier High School'
        })
      });

      const ok =
        res.status === 201 &&
        res.data?.data?.student?.firstName === 'Priya' &&
        res.data?.data?.student?.lastName === 'Sharma' &&
        res.data?.data?.student?.phone === '+91 98765 43210' &&
        res.data?.data?.student?.registrationNumber === 'BEN-P5-001';
      createdStudent1Id = res.data?.data?.student?._id;
      record(1, 'Create beneficiary with normalization', ok, `HTTP ${res.status}, Phone=${res.data?.data?.student?.phone}`);
    } catch (err) {
      record(1, 'Create beneficiary with normalization', false, err.message);
    }

    // Test 2: Duplicate registration number rejected
    try {
      const res = await apiRequest(`${BASE_URL}/students`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${staffToken}` },
        body: JSON.stringify({
          registrationNumber: 'BEN-P5-001',
          firstName: 'Another',
          lastName: 'Beneficiary'
        })
      });
      const ok = res.status === 409 && res.data?.success === false;
      record(2, 'Duplicate registration number rejected', ok, `HTTP ${res.status}: ${res.data?.message}`);
    } catch (err) {
      record(2, 'Duplicate registration number rejected', false, err.message);
    }

    // Test 3: Pre-save duplicate check identifies exact registration number
    try {
      const res = await apiRequest(`${BASE_URL}/students/check-duplicate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${staffToken}` },
        body: JSON.stringify({
          registrationNumber: 'BEN-P5-001',
          firstName: 'Test',
          lastName: 'Candidate'
        })
      });
      const ok = res.status === 200 && res.data?.data?.isDuplicate === true && res.data?.data?.candidates?.length > 0;
      record(3, 'Pre-save duplicate check catches regNo collision', ok, `HTTP ${res.status}, isDuplicate=${res.data?.data?.isDuplicate}`);
    } catch (err) {
      record(3, 'Pre-save duplicate check catches regNo collision', false, err.message);
    }

    // Test 4: Pre-save duplicate check catches phone demographic similarity
    try {
      const res = await apiRequest(`${BASE_URL}/students/check-duplicate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${staffToken}` },
        body: JSON.stringify({
          firstName: 'Priya',
          lastName: 'Sharma',
          phone: '+91 98765 43210'
        })
      });
      const ok = res.status === 200 && res.data?.data?.isDuplicate === true;
      record(4, 'Pre-save duplicate check catches identical phone/name', ok, `HTTP ${res.status}, candidates=${res.data?.data?.candidateCount}`);
    } catch (err) {
      record(4, 'Pre-save duplicate check catches identical phone/name', false, err.message);
    }

    // Test 5: Pre-save duplicate check passes for unique beneficiary
    try {
      const res = await apiRequest(`${BASE_URL}/students/check-duplicate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${staffToken}` },
        body: JSON.stringify({
          registrationNumber: 'BEN-P5-UNIQUE',
          firstName: 'Kabir',
          lastName: 'Mukherjee',
          phone: '9123456789'
        })
      });
      const ok = res.status === 200 && res.data?.data?.isDuplicate === false && res.data?.data?.candidateCount === 0;
      record(5, 'Pre-save duplicate check passes for unique record', ok, `HTTP ${res.status}, isDuplicate=${res.data?.data?.isDuplicate}`);
    } catch (err) {
      record(5, 'Pre-save duplicate check passes for unique record', false, err.message);
    }

    // Test 6: Read beneficiary returns rich lifecycle payload (student, enrollments, attendance, DQI)
    try {
      const res = await apiRequest(`${BASE_URL}/students/${createdStudent1Id}`, {
        headers: { Authorization: `Bearer ${staffToken}` }
      });
      const ok =
        res.status === 200 &&
        res.data?.data?.student?.registrationNumber === 'BEN-P5-001' &&
        Array.isArray(res.data?.data?.enrollments) &&
        typeof res.data?.data?.attendance === 'object' &&
        typeof res.data?.data?.dataQuality === 'object' &&
        Array.isArray(res.data?.data?.duplicates) &&
        Array.isArray(res.data?.data?.auditLogs);
      record(6, 'Read beneficiary returns rich lifecycle payload', ok, `HTTP ${res.status}, DQI=${res.data?.data?.dataQuality?.score}`);
    } catch (err) {
      record(6, 'Read beneficiary returns rich lifecycle payload', false, err.message);
    }

    // Test 7: Update beneficiary details
    try {
      const res = await apiRequest(`${BASE_URL}/students/${createdStudent1Id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${staffToken}` },
        body: JSON.stringify({
          state: 'Karnataka',
          pinCode: '560001',
          notes: 'Transferred to Bengaluru chapter for STEM program.'
        })
      });
      const ok =
        res.status === 200 &&
        res.data?.data?.student?.state === 'Karnataka' &&
        res.data?.data?.student?.pinCode === '560001' &&
        res.data?.data?.student?.firstName === 'Priya'; // Unrelated fields preserved
      record(7, 'Update beneficiary modifies fields and preserves others', ok, `HTTP ${res.status}, State=${res.data?.data?.student?.state}`);
    } catch (err) {
      record(7, 'Update beneficiary modifies fields and preserves others', false, err.message);
    }

    // Test 8: Audit log records modified fields on update
    try {
      const audit = await AuditLog.findOne({
        entityId: String(createdStudent1Id),
        action: 'update'
      }).sort({ createdAt: -1 });
      const ok = audit && Array.isArray(audit.metadata?.modifiedFields) && audit.metadata.modifiedFields.includes('state');
      record(8, 'Audit log captures modified field keys', ok, `Modified: ${audit?.metadata?.modifiedFields?.join(', ')}`);
    } catch (err) {
      record(8, 'Audit log captures modified field keys', false, err.message);
    }

    // Test 9: Update status to inactive (safe archival)
    try {
      const res = await apiRequest(`${BASE_URL}/students/${createdStudent1Id}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${staffToken}` },
        body: JSON.stringify({ status: 'inactive' })
      });
      const ok = res.status === 200 && res.data?.data?.student?.status === 'inactive';
      record(9, 'Update status to inactive safely archives record', ok, `HTTP ${res.status}, Status=${res.data?.data?.student?.status}`);
    } catch (err) {
      record(9, 'Update status to inactive safely archives record', false, err.message);
    }

    // Test 10: Safe deletion guard blocks deletion when history exists
    try {
      const res = await apiRequest(`${BASE_URL}/students/${createdStudent1Id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      // Should fail with 400 because audit records exist for createdStudent1Id
      const ok = res.status === 400 && res.data?.message?.includes('Cannot permanently delete beneficiary');
      record(10, 'Safe deletion guard blocks record with audit history', ok, `HTTP ${res.status}: ${res.data?.message}`);
    } catch (err) {
      record(10, 'Safe deletion guard blocks record with audit history', false, err.message);
    }

    // Test 11: Safe deletion succeeds for clean beneficiary with zero history
    let cleanStudentId = '';
    try {
      const cleanDoc = await Student.create({
        ngoId: ngoAId,
        registrationNumber: 'BEN-P5-CLEAN',
        firstName: 'Temp',
        lastName: 'Ephemeral',
        status: 'active'
      });
      cleanStudentId = cleanDoc._id;

      const res = await apiRequest(`${BASE_URL}/students/${cleanStudentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      const ok = res.status === 200 && res.data?.success === true;
      const verifyDeleted = await Student.findById(cleanStudentId);
      record(11, 'Safe deletion succeeds for clean beneficiary', ok && !verifyDeleted, `HTTP ${res.status}, Exists in DB: ${Boolean(verifyDeleted)}`);
    } catch (err) {
      record(11, 'Safe deletion succeeds for clean beneficiary', false, err.message);
    }

    console.log('\n▶ [Part 2: Extended Server-Side Search, Multi-Filter & Sorting]');

    // Seed test beneficiaries for filtering and sorting
    const studentA = await Student.create({
      ngoId: ngoAId,
      registrationNumber: 'BEN-P5-FLT-01',
      firstName: 'Aarav',
      lastName: 'Patel',
      gender: 'male',
      state: 'Gujarat',
      pinCode: '380001',
      phone: '+91 98220 11111',
      status: 'active'
    });

    const studentB = await Student.create({
      ngoId: ngoAId,
      registrationNumber: 'BEN-P5-FLT-02',
      firstName: 'Bhavna',
      lastName: 'Chopra',
      gender: 'female',
      state: 'Delhi',
      pinCode: '110001',
      phone: '+91 98220 22222',
      status: 'graduated'
    });

    const studentC = await Student.create({
      ngoId: ngoAId,
      registrationNumber: 'BEN-P5-FLT-03',
      firstName: 'Chetan',
      lastName: 'Verma',
      gender: 'male',
      state: 'Maharashtra',
      pinCode: '400001',
      phone: '+91 98220 33333',
      status: 'active'
    });

    // Explicitly set timestamps via direct MongoDB collection update to avoid Mongoose schema override
    await Student.collection.updateOne(
      { _id: studentA._id },
      { $set: { createdAt: new Date('2026-01-01T10:00:00Z'), updatedAt: new Date('2026-01-05T10:00:00Z') } }
    );
    await Student.collection.updateOne(
      { _id: studentB._id },
      { $set: { createdAt: new Date('2026-02-01T10:00:00Z'), updatedAt: new Date('2026-03-01T10:00:00Z') } }
    );
    await Student.collection.updateOne(
      { _id: studentC._id },
      { $set: { createdAt: new Date('2026-03-01T10:00:00Z'), updatedAt: new Date('2026-02-15T10:00:00Z') } }
    );

    // Test 12: Search by beneficiary name
    try {
      const res = await apiRequest(`${BASE_URL}/students?search=Bhavna`, {
        headers: { Authorization: `Bearer ${staffToken}` }
      });
      const ok = res.status === 200 && res.data?.data?.students?.some((s) => s.firstName === 'Bhavna');
      record(12, 'Search by beneficiary name', ok, `Count=${res.data?.data?.students?.length}`);
    } catch (err) {
      record(12, 'Search by beneficiary name', false, err.message);
    }

    // Test 13: Search by phone number
    try {
      const res = await apiRequest(`${BASE_URL}/students?search=98220 22222`, {
        headers: { Authorization: `Bearer ${staffToken}` }
      });
      const ok = res.status === 200 && res.data?.data?.students?.some((s) => s.phone.includes('98220 22222'));
      record(13, 'Search by phone number', ok, `Found=${res.data?.data?.students?.[0]?.firstName}`);
    } catch (err) {
      record(13, 'Search by phone number', false, err.message);
    }

    // Test 14: Search by registration number
    try {
      const res = await apiRequest(`${BASE_URL}/students?search=BEN-P5-FLT-03`, {
        headers: { Authorization: `Bearer ${staffToken}` }
      });
      const ok = res.status === 200 && res.data?.data?.students?.some((s) => s.registrationNumber === 'BEN-P5-FLT-03');
      record(14, 'Search by registration number', ok, `Found=${res.data?.data?.students?.[0]?.registrationNumber}`);
    } catch (err) {
      record(14, 'Search by registration number', false, err.message);
    }

    // Test 15: Filter by state
    try {
      const res = await apiRequest(`${BASE_URL}/students?state=Gujarat`, {
        headers: { Authorization: `Bearer ${staffToken}` }
      });
      const ok = res.status === 200 && res.data?.data?.students?.every((s) => s.state?.toLowerCase() === 'gujarat');
      record(15, 'Filter by state', ok, `Count=${res.data?.data?.students?.length}`);
    } catch (err) {
      record(15, 'Filter by state', false, err.message);
    }

    // Test 16: Filter by PIN code
    try {
      const res = await apiRequest(`${BASE_URL}/students?pinCode=110001`, {
        headers: { Authorization: `Bearer ${staffToken}` }
      });
      const ok = res.status === 200 && res.data?.data?.students?.every((s) => s.pinCode === '110001');
      record(16, 'Filter by PIN code', ok, `Count=${res.data?.data?.students?.length}`);
    } catch (err) {
      record(16, 'Filter by PIN code', false, err.message);
    }

    // Test 17: Filter by gender
    try {
      const res = await apiRequest(`${BASE_URL}/students?gender=female`, {
        headers: { Authorization: `Bearer ${staffToken}` }
      });
      const ok = res.status === 200 && res.data?.data?.students?.every((s) => s.gender === 'female');
      record(17, 'Filter by gender', ok, `Count=${res.data?.data?.students?.length}`);
    } catch (err) {
      record(17, 'Filter by gender', false, err.message);
    }

    // Test 18: Filter by status
    try {
      const res = await apiRequest(`${BASE_URL}/students?status=graduated`, {
        headers: { Authorization: `Bearer ${staffToken}` }
      });
      const ok = res.status === 200 && res.data?.data?.students?.every((s) => s.status === 'graduated');
      record(18, 'Filter by status', ok, `Count=${res.data?.data?.students?.length}`);
    } catch (err) {
      record(18, 'Filter by status', false, err.message);
    }

    // Seed Program & Enrollment for filter check
    const program1 = await Program.create({
      ngoId: ngoAId,
      name: 'P5 Digital Literacy Workshop',
      code: 'PRG-P5-001',
      type: 'workshop',
      status: 'active'
    });

    await ProgramEnrollment.create({
      ngoId: ngoAId,
      programId: program1._id,
      studentId: studentA._id,
      status: 'enrolled',
      enrolledAt: new Date()
    });

    // Test 19: Filter by program participation (programId)
    try {
      const res = await apiRequest(`${BASE_URL}/students?programId=${program1._id}`, {
        headers: { Authorization: `Bearer ${staffToken}` }
      });
      const ok =
        res.status === 200 &&
        res.data?.data?.students?.length === 1 &&
        res.data?.data?.students?.[0]?.registrationNumber === studentA.registrationNumber;
      record(19, 'Filter by program enrollment', ok, `Found Student=${res.data?.data?.students?.[0]?.firstName}`);
    } catch (err) {
      record(19, 'Filter by program enrollment', false, err.message);
    }

    // Test 20: Sort by registration date (createdAt asc)
    try {
      const resAsc = await apiRequest(`${BASE_URL}/students?search=BEN-P5-FLT&sortBy=createdAt&sortOrder=asc`, {
        headers: { Authorization: `Bearer ${staffToken}` }
      });
      const students = resAsc.data?.data?.students || [];
      const ok = students.length >= 3 && students[0].firstName === 'Aarav' && students[students.length - 1].firstName === 'Chetan';
      record(20, 'Sort by registration date (createdAt asc)', ok, `First=${students[0]?.firstName}, Last=${students[students.length - 1]?.firstName}`);
    } catch (err) {
      record(20, 'Sort by registration date (createdAt asc)', false, err.message);
    }

    // Test 21: Sort by last updated date (updatedAt desc)
    try {
      const resDesc = await apiRequest(`${BASE_URL}/students?search=BEN-P5-FLT&sortBy=updatedAt&sortOrder=desc`, {
        headers: { Authorization: `Bearer ${staffToken}` }
      });
      const students = resDesc.data?.data?.students || [];
      // Bhavna was updated 2026-03-01 (newest updatedAt)
      const ok = students.length >= 3 && students[0].firstName === 'Bhavna';
      record(21, 'Sort by last updated date (updatedAt desc)', ok, `First=${students[0]?.firstName}`);
    } catch (err) {
      record(21, 'Sort by last updated date (updatedAt desc)', false, err.message);
    }

    // Test 22: Sort by name (name asc)
    try {
      const resName = await apiRequest(`${BASE_URL}/students?search=BEN-P5-FLT&sortBy=name&sortOrder=asc`, {
        headers: { Authorization: `Bearer ${staffToken}` }
      });
      const students = resName.data?.data?.students || [];
      const ok = students.length >= 3 && students[0].firstName === 'Aarav' && students[1].firstName === 'Bhavna' && students[2].firstName === 'Chetan';
      record(22, 'Sort by name (Aarav -> Bhavna -> Chetan)', ok, `Order=${students.map((s) => s.firstName).join(', ')}`);
    } catch (err) {
      record(22, 'Sort by name (Aarav -> Bhavna -> Chetan)', false, err.message);
    }

    // Test 23: Pagination works with configurable limit
    try {
      const resPage = await apiRequest(`${BASE_URL}/students?search=BEN-P5-FLT&page=1&limit=2`, {
        headers: { Authorization: `Bearer ${staffToken}` }
      });
      const pagination = resPage.data?.data?.pagination;
      const ok =
        resPage.status === 200 &&
        resPage.data?.data?.students?.length === 2 &&
        pagination?.totalStudents >= 3 &&
        pagination?.hasNextPage === true &&
        pagination?.hasPrevPage === false;
      record(23, 'Pagination with limit and total page counts', ok, `Limit=2, Total=${pagination?.totalStudents}, HasNext=${pagination?.hasNextPage}`);
    } catch (err) {
      record(23, 'Pagination with limit and total page counts', false, err.message);
    }

    console.log('\n▶ [Part 3: Program Participation & Attendance Integration]');

    // Test 24: Enrolled program appears in student profile
    try {
      const res = await apiRequest(`${BASE_URL}/students/${studentA._id}`, {
        headers: { Authorization: `Bearer ${staffToken}` }
      });
      const enrollments = res.data?.data?.enrollments || [];
      const ok =
        res.status === 200 &&
        enrollments.length === 1 &&
        enrollments[0].programId?.name === 'P5 Digital Literacy Workshop' &&
        enrollments[0].status === 'enrolled';
      record(24, 'Student profile reflects active program enrollment', ok, `Program=${enrollments[0]?.programId?.name}`);
    } catch (err) {
      record(24, 'Student profile reflects active program enrollment', false, err.message);
    }

    // Test 25: Attendance session reflected in student attendance summary & recent records
    try {
      await AttendanceSession.create({
        ngoId: ngoAId,
        programId: program1._id,
        sessionDate: new Date('2026-03-10'),
        recordedBy: adminUserId,
        entries: [
          { studentId: studentA._id, status: 'present', note: 'Active participation' }
        ]
      });

      await AttendanceSession.create({
        ngoId: ngoAId,
        programId: program1._id,
        sessionDate: new Date('2026-03-11'),
        recordedBy: adminUserId,
        entries: [
          { studentId: studentA._id, status: 'absent', note: 'Medical leave' }
        ]
      });

      const res = await apiRequest(`${BASE_URL}/students/${studentA._id}`, {
        headers: { Authorization: `Bearer ${staffToken}` }
      });
      const att = res.data?.data?.attendance;
      const ok =
        res.status === 200 &&
        att?.totalSessions === 2 &&
        att?.presentCount === 1 &&
        att?.absentCount === 1 &&
        att?.presenceRate === 50 &&
        att?.recent?.length === 2;
      record(25, 'Student profile calculates attendance stats and sessions', ok, `Sessions=${att?.totalSessions}, Rate=${att?.presenceRate}%`);
    } catch (err) {
      record(25, 'Student profile calculates attendance stats and sessions', false, err.message);
    }

    // Test 26: Duplicate active enrollment is rejected by system
    try {
      const res = await apiRequest(`${BASE_URL}/programs/${program1._id}/enrollments`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${staffToken}` },
        body: JSON.stringify({ studentId: String(studentA._id) })
      });
      const ok = (res.status === 400 || res.status === 409) && res.data?.message?.includes('already enrolled');
      record(26, 'Duplicate active program enrollment prevented', ok, `HTTP ${res.status}: ${res.data?.message}`);
    } catch (err) {
      record(26, 'Duplicate active program enrollment prevented', false, err.message);
    }

    console.log('\n▶ [Part 4: Data Quality (DQI), AI Proposals & HMAC Human Review]');

    // Configure test mock for Gemini to simulate AI proposal generation without external API dependencies
    let geminiCallCount = 0;
    geminiService.setClientForTesting({
      models: {
        generateContent: async () => {
          geminiCallCount += 1;
          const proposed = geminiCallCount === 1 ? '+91 98765 43210' : '+91 98111 22233';
          return {
            text: JSON.stringify({
              proposedValue: proposed,
              reasoning: 'Formatted standard Indian phone number with spaces',
              confidenceCategory: 'high'
            })
          };
        }
      }
    });

    // Seed student with a formatting flaw (phone has un-normalized digits starting with 9)
    const flawedStudent = await Student.create({
      ngoId: ngoAId,
      registrationNumber: 'BEN-P5-DQI-01',
      firstName: 'neha',
      lastName: 'singh',
      phone: '+919876543210', // Non-spaced format triggers inconsistent_format
      status: 'active'
    });

    // Test 27: Profile computes deterministic DQI with itemized deductions
    try {
      const res = await apiRequest(`${BASE_URL}/students/${flawedStudent._id}`, {
        headers: { Authorization: `Bearer ${staffToken}` }
      });
      const dqi = res.data?.data?.dataQuality;
      const ok =
        res.status === 200 &&
        dqi !== null &&
        typeof dqi.score === 'number' &&
        Array.isArray(dqi.deductions) &&
        ['Excellent', 'Good', 'Fair', 'Poor'].includes(dqi.rating);
      record(27, 'Profile computes deterministic DQI evaluation', ok, `Score=${dqi?.score}/100, Rating=${dqi?.rating}`);
    } catch (err) {
      record(27, 'Profile computes deterministic DQI evaluation', false, err.message);
    }

    // Test 28: Staff requests AI correction proposal
    let proposalToken = '';
    let proposedValue = '';
    try {
      const res = await apiRequest(`${BASE_URL}/assistant/ai/propose-correction`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${staffToken}` },
        body: JSON.stringify({
          recordType: 'students',
          recordId: String(flawedStudent._id),
          field: 'phone',
          issueType: 'inconsistent_format'
        })
      });
      const prop = res.data?.data?.proposal || res.data?.data;
      const ok =
        res.status === 200 &&
        prop?.available === true &&
        Boolean(prop?.proposalToken) &&
        Boolean(prop?.proposedValue);
      proposalToken = prop?.proposalToken;
      proposedValue = prop?.proposedValue;
      record(28, 'Staff requests AI proposal and receives signed HMAC token', ok, `Field=${prop?.field}, Proposed=${proposedValue}`);
    } catch (err) {
      record(28, 'Staff requests AI proposal and receives signed HMAC token', false, err.message);
    }

    // Test 29: Human review accepts proposal with cryptographic token
    try {
      const res = await apiRequest(`${BASE_URL}/assistant/clean/students/review`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${staffToken}` },
        body: JSON.stringify({
          recordId: String(flawedStudent._id),
          field: 'phone',
          issueType: 'inconsistent_format',
          decision: 'accept',
          proposedValue,
          proposalToken
        })
      });
      const ok = res.status === 200 && res.data?.success === true;
      record(29, 'Human review accepts AI proposal with verified HMAC token', ok, `HTTP ${res.status}: ${res.data?.message}`);
    } catch (err) {
      record(29, 'Human review accepts AI proposal with verified HMAC token', false, err.message);
    }

    // Test 30: Verify updated value and AI provenance in audit log
    try {
      const updatedDoc = await Student.findById(flawedStudent._id);
      const audit = await AuditLog.findOne({
        entityId: String(flawedStudent._id),
        'metadata.decision': 'accept'
      }).sort({ createdAt: -1 });

      const ok =
        updatedDoc.phone === proposedValue &&
        audit !== null &&
        audit.metadata?.targetField === 'phone';
      record(30, 'Database updated and AI provenance recorded in audit log', ok, `New Phone=${updatedDoc.phone}`);
    } catch (err) {
      record(30, 'Database updated and AI provenance recorded in audit log', false, err.message);
    }

    console.log('\n▶ [Part 5: Role Permissions, Security & Multi-Tenant NGO Isolation]');

    // Test 31: Volunteer cannot create beneficiary
    try {
      const res = await apiRequest(`${BASE_URL}/students`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${volunteerToken}` },
        body: JSON.stringify({
          registrationNumber: 'BEN-P5-VOL-DENIED',
          firstName: 'Unauthorized',
          lastName: 'User'
        })
      });
      const ok = res.status === 403;
      record(31, 'Volunteer cannot create beneficiary (HTTP 403)', ok, `HTTP ${res.status}`);
    } catch (err) {
      record(31, 'Volunteer cannot create beneficiary (HTTP 403)', false, err.message);
    }

    // Test 32: Volunteer cannot edit beneficiary
    try {
      const res = await apiRequest(`${BASE_URL}/students/${createdStudent1Id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${volunteerToken}` },
        body: JSON.stringify({ firstName: 'Hacked' })
      });
      const ok = res.status === 403;
      record(32, 'Volunteer cannot edit beneficiary (HTTP 403)', ok, `HTTP ${res.status}`);
    } catch (err) {
      record(32, 'Volunteer cannot edit beneficiary (HTTP 403)', false, err.message);
    }

    // Test 33: Volunteer can view beneficiary (read-only)
    try {
      const res = await apiRequest(`${BASE_URL}/students/${createdStudent1Id}`, {
        headers: { Authorization: `Bearer ${volunteerToken}` }
      });
      const ok = res.status === 200 && res.data?.data?.student?._id === String(createdStudent1Id);
      record(33, 'Volunteer has authorized read-only view access', ok, `HTTP ${res.status}`);
    } catch (err) {
      record(33, 'Volunteer has authorized read-only view access', false, err.message);
    }

    // Test 34: Staff cannot permanently delete beneficiary (Admin only)
    try {
      const res = await apiRequest(`${BASE_URL}/students/${createdStudent1Id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${staffToken}` }
      });
      const ok = res.status === 403;
      record(34, 'Staff cannot delete beneficiary (Admin only)', ok, `HTTP ${res.status}`);
    } catch (err) {
      record(34, 'Staff cannot delete beneficiary (Admin only)', false, err.message);
    }

    // Test 35: Student role can view their own linked profile via /students/me
    let linkedStudentDoc = null;
    try {
      linkedStudentDoc = await Student.create({
        ngoId: ngoAId,
        userId: studentUserId,
        registrationNumber: 'BEN-P5-STUDENT-ME',
        firstName: 'Self',
        lastName: 'Student',
        status: 'active'
      });

      const res = await apiRequest(`${BASE_URL}/students/me`, {
        headers: { Authorization: `Bearer ${studentToken}` }
      });
      const ok = res.status === 200 && res.data?.data?.student?.registrationNumber === 'BEN-P5-STUDENT-ME';
      record(35, 'Student role can view their own profile via /students/me', ok, `HTTP ${res.status}, Reg=${res.data?.data?.student?.registrationNumber}`);
    } catch (err) {
      record(35, 'Student role can view their own profile via /students/me', false, err.message);
    }

    // Test 36: Student role cannot access another beneficiary profile (HTTP 403)
    try {
      const res = await apiRequest(`${BASE_URL}/students/${createdStudent1Id}`, {
        headers: { Authorization: `Bearer ${studentToken}` }
      });
      const ok = res.status === 403 && res.data?.message?.includes('only authorized to view your own student profile');
      record(36, 'Student role blocked from other student profile (HTTP 403)', ok, `HTTP ${res.status}: ${res.data?.message}`);
    } catch (err) {
      record(36, 'Student role blocked from other student profile (HTTP 403)', false, err.message);
    }

    // Test 37: Cross-tenant isolation: NGO B user cannot read NGO A student (HTTP 404)
    try {
      const res = await apiRequest(`${BASE_URL}/students/${createdStudent1Id}`, {
        headers: { Authorization: `Bearer ${ngoBAdminToken}` }
      });
      const ok = res.status === 404;
      record(37, 'Cross-tenant IDOR read returns HTTP 404', ok, `HTTP ${res.status}`);
    } catch (err) {
      record(37, 'Cross-tenant IDOR read returns HTTP 404', false, err.message);
    }

    // Test 38: Cross-tenant isolation: NGO B user cannot update NGO A student (HTTP 404)
    try {
      const res = await apiRequest(`${BASE_URL}/students/${createdStudent1Id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${ngoBAdminToken}` },
        body: JSON.stringify({ firstName: 'CrossTenantExploit' })
      });
      const ok = res.status === 404;
      record(38, 'Cross-tenant IDOR update returns HTTP 404', ok, `HTTP ${res.status}`);
    } catch (err) {
      record(38, 'Cross-tenant IDOR update returns HTTP 404', false, err.message);
    }

    // Test 39: Cross-tenant isolation: NGO B user cannot delete NGO A student (HTTP 404)
    try {
      const res = await apiRequest(`${BASE_URL}/students/${createdStudent1Id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${ngoBAdminToken}` }
      });
      const ok = res.status === 404;
      record(39, 'Cross-tenant IDOR delete returns HTTP 404', ok, `HTTP ${res.status}`);
    } catch (err) {
      record(39, 'Cross-tenant IDOR delete returns HTTP 404', false, err.message);
    }

    // Test 40: Cross-tenant isolation: NGO B search returns 0 results for NGO A data
    try {
      const res = await apiRequest(`${BASE_URL}/students?search=Priya`, {
        headers: { Authorization: `Bearer ${ngoBAdminToken}` }
      });
      const ok = res.status === 200 && res.data?.data?.students?.length === 0;
      record(40, 'Cross-tenant search query isolates data completely', ok, `Count=${res.data?.data?.students?.length}`);
    } catch (err) {
      record(40, 'Cross-tenant search query isolates data completely', false, err.message);
    }

    // Test 41: Unauthenticated request rejected with HTTP 401
    try {
      const res = await apiRequest(`${BASE_URL}/students`);
      const ok = res.status === 401;
      record(41, 'Unauthenticated request rejected with HTTP 401', ok, `HTTP ${res.status}`);
    } catch (err) {
      record(41, 'Unauthenticated request rejected with HTTP 401', false, err.message);
    }

    console.log('\n▶ [Part 6: 10-Step Realistic End-to-End Operational Lifecycle]');

    // Step 1: Staff member logs in
    let e2eStaffToken = '';
    try {
      const loginRes = await apiRequest(`${BASE_URL}/auth/login`, {
        method: 'POST',
        body: JSON.stringify({ email: 'staff@ngo.org', password: 'StaffPassword123!' })
      });
      const ok = loginRes.status === 200 && Boolean(loginRes.accessToken);
      e2eStaffToken = loginRes.accessToken;
      record(42, 'E2E Step 1: Authorized staff member logs in', ok, `Token received`);
    } catch (err) {
      record(42, 'E2E Step 1: Authorized staff member logs in', false, err.message);
    }

    // Step 2: Creates a beneficiary
    let e2eStudentId = '';
    try {
      const res = await apiRequest(`${BASE_URL}/students`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${e2eStaffToken}` },
        body: JSON.stringify({
          registrationNumber: 'BEN-P5-E2E-001',
          firstName: 'Ananya',
          lastName: 'Deshmukh',
          phone: '9811122233',
          email: 'ananya.deshmukh@example.org',
          dateOfBirth: '2008-04-12',
          gender: 'female',
          state: 'Maharashtra',
          pinCode: '411001',
          educationLevel: 'High School',
          schoolName: 'Pune City Academy'
        })
      });
      const ok = res.status === 201 && res.data?.data?.student?.registrationNumber === 'BEN-P5-E2E-001';
      e2eStudentId = res.data?.data?.student?._id;
      record(43, 'E2E Step 2: Staff creates beneficiary record', ok, `ID=${e2eStudentId}`);
    } catch (err) {
      record(43, 'E2E Step 2: Staff creates beneficiary record', false, err.message);
    }

    // Step 3: Searches for that beneficiary
    try {
      const res = await apiRequest(`${BASE_URL}/students?search=BEN-P5-E2E-001`, {
        headers: { Authorization: `Bearer ${e2eStaffToken}` }
      });
      const ok = res.status === 200 && res.data?.data?.students?.some((s) => s.registrationNumber === 'BEN-P5-E2E-001');
      record(44, 'E2E Step 3: Staff searches for beneficiary', ok, `Found=${res.data?.data?.students?.[0]?.firstName}`);
    } catch (err) {
      record(44, 'E2E Step 3: Staff searches for beneficiary', false, err.message);
    }

    // Step 4: Opens the rich profile
    try {
      const res = await apiRequest(`${BASE_URL}/students/${e2eStudentId}`, {
        headers: { Authorization: `Bearer ${e2eStaffToken}` }
      });
      const ok = res.status === 200 && res.data?.data?.student?.firstName === 'Ananya';
      record(45, 'E2E Step 4: Staff opens rich profile', ok, `Loaded Reg=${res.data?.data?.student?.registrationNumber}`);
    } catch (err) {
      record(45, 'E2E Step 4: Staff opens rich profile', false, err.message);
    }

    // Step 5: Updates beneficiary details
    try {
      const res = await apiRequest(`${BASE_URL}/students/${e2eStudentId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${e2eStaffToken}` },
        body: JSON.stringify({
          guardianName: 'Sunita Deshmukh',
          guardianRelationship: 'Mother',
          notes: 'Admitted under full NGO sponsorship.'
        })
      });
      const ok = res.status === 200 && res.data?.data?.student?.guardianName === 'Sunita Deshmukh';
      record(46, 'E2E Step 5: Staff updates guardian and notes details', ok, `Guardian=${res.data?.data?.student?.guardianName}`);
    } catch (err) {
      record(46, 'E2E Step 5: Staff updates guardian and notes details', false, err.message);
    }

    // Step 6: Enrolls in program and logs attendance
    let e2eProgId = '';
    try {
      const prog = await Program.create({
        ngoId: ngoAId,
        name: 'P5 Advanced Robotics Workshop',
        code: 'PRG-P5-ROBOTICS',
        type: 'workshop',
        status: 'active'
      });
      e2eProgId = prog._id;

      await ProgramEnrollment.create({
        ngoId: ngoAId,
        programId: e2eProgId,
        studentId: e2eStudentId,
        status: 'enrolled',
        enrolledAt: new Date()
      });

      await AttendanceSession.create({
        ngoId: ngoAId,
        programId: e2eProgId,
        sessionDate: new Date(),
        recordedBy: adminUserId,
        entries: [{ studentId: e2eStudentId, status: 'present', note: 'Perfect attendance' }]
      });

      const res = await apiRequest(`${BASE_URL}/students/${e2eStudentId}`, {
        headers: { Authorization: `Bearer ${e2eStaffToken}` }
      });
      const ok =
        res.status === 200 &&
        res.data?.data?.enrollments?.some((e) => e.programId?.code === 'PRG-P5-ROBOTICS') &&
        res.data?.data?.attendance?.presenceRate === 100;
      record(47, 'E2E Step 6: Program participation and attendance verified in profile', ok, `Presence=${res.data?.data?.attendance?.presenceRate}%`);
    } catch (err) {
      record(47, 'E2E Step 6: Program participation and attendance verified in profile', false, err.message);
    }

    // Step 7: Reviews duplicate warnings
    try {
      const res = await apiRequest(`${BASE_URL}/students/${e2eStudentId}`, {
        headers: { Authorization: `Bearer ${e2eStaffToken}` }
      });
      const duplicates = res.data?.data?.duplicates || [];
      const ok = res.status === 200 && Array.isArray(duplicates);
      record(48, 'E2E Step 7: Reviews duplicate warnings in profile', ok, `Duplicate count=${duplicates.length}`);
    } catch (err) {
      record(48, 'E2E Step 7: Reviews duplicate warnings in profile', false, err.message);
    }

    // Step 8: Reviews data-quality findings
    try {
      const res = await apiRequest(`${BASE_URL}/students/${e2eStudentId}`, {
        headers: { Authorization: `Bearer ${e2eStaffToken}` }
      });
      const dqi = res.data?.data?.dataQuality;
      const ok = res.status === 200 && dqi?.score >= 90 && dqi?.rating === 'Excellent';
      record(49, 'E2E Step 8: Reviews data-quality findings (Score >= 90)', ok, `Score=${dqi?.score}/100, Rating=${dqi?.rating}`);
    } catch (err) {
      record(49, 'E2E Step 8: Reviews data-quality findings (Score >= 90)', false, err.message);
    }

    // Step 9: Performs authorized correction review where finding exists
    try {
      // Intentionally introduce an un-normalized phone into e2e student to generate finding
      await Student.findByIdAndUpdate(e2eStudentId, { phone: '+919811122233' });

      const propRes = await apiRequest(`${BASE_URL}/assistant/ai/propose-correction`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${e2eStaffToken}` },
        body: JSON.stringify({
          recordType: 'students',
          recordId: String(e2eStudentId),
          field: 'phone',
          issueType: 'inconsistent_format'
        })
      });

      const prop = propRes.data?.data?.proposal || propRes.data?.data;
      const revRes = await apiRequest(`${BASE_URL}/assistant/clean/students/review`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${e2eStaffToken}` },
        body: JSON.stringify({
          recordId: String(e2eStudentId),
          field: 'phone',
          issueType: 'inconsistent_format',
          decision: 'accept',
          proposedValue: prop.proposedValue,
          proposalToken: prop.proposalToken
        })
      });

      const ok = revRes.status === 200 && revRes.data?.success === true;
      record(50, 'E2E Step 9: Requests AI proposal and completes authorized review', ok, `Accepted fix for phone`);
    } catch (err) {
      record(50, 'E2E Step 9: Requests AI proposal and completes authorized review', false, err.message);
    }

    // Step 10: Verifies updated information and audit history
    try {
      const res = await apiRequest(`${BASE_URL}/students/${e2eStudentId}`, {
        headers: { Authorization: `Bearer ${e2eStaffToken}` }
      });
      const audit = await AuditLog.find({ entityId: String(e2eStudentId) });
      const ok =
        res.status === 200 &&
        res.data?.data?.student?.phone === '+91 98111 22233' &&
        audit.length >= 2;
      record(51, 'E2E Step 10: Final profile and audit history verified', ok, `Phone=${res.data?.data?.student?.phone}, Audit Count=${audit.length}`);
    } catch (err) {
      record(51, 'E2E Step 10: Final profile and audit history verified', false, err.message);
    }

    // Clean up
    if (linkedStudentDoc) await Student.findByIdAndDelete(linkedStudentDoc._id);
    await Student.deleteMany({ registrationNumber: /^BEN-P5-/ });
    await Program.deleteMany({ code: /^PRG-P5-/ });
    await User.findByIdAndDelete(userB._id);
    await Ngo.findByIdAndDelete(ngoBId);

  } catch (err) {
    console.error('Fatal test error:', err);
  } finally {
    geminiService.resetClientForTesting();
    await teardownTestEnvironment();
  }

  const passed = results.filter((r) => r.passed).length;
  const total = results.length;

  console.log('\n================================================================');
  console.log(`BENEFICIARY TEST SUITE: ${passed} / ${total} TESTS PASSED! ${passed === total ? '✅' : '❌'}`);
  console.log('================================================================\n');

  if (passed !== total) {
    process.exit(1);
  }
};

runTests().catch((err) => {
  console.error('Test runner failure:', err);
  process.exit(1);
});

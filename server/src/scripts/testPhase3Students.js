const mongoose = require('mongoose');
const config = require('../config/env');
const Student = require('../models/Student');
const User = require('../models/User');
const { apiRequest } = require('./apiTestClient');
const { setupTestEnvironment, teardownTestEnvironment } = require('./testHelper');

const BASE_URL = `http://localhost:${config.PORT}/api/v1`;

const results = [];

const record = (num, name, passed, details) => {
  results.push({ num, name, passed, details });
  console.log(
    `${passed ? '✅' : '❌'} Test ${num.toString().padStart(2, ' ')}: ${name.padEnd(46, ' ')} -> ${
      passed ? 'PASSED' : 'FAILED'
    } (${details})`
  );
};

const runTests = async () => {
  await setupTestEnvironment();

  console.log('\n================================================================');
  console.log('   RUNNING PHASE 3B: STUDENT MANAGEMENT AUTOMATED TEST SUITE    ');
  console.log('================================================================\n');

  let adminToken = '';
  let staffToken = '';
  let volunteerToken = '';
  let studentToken = '';
  let studentUserId = '';

  // Clean up prior test student profiles to ensure idempotency
  await Student.deleteMany({
    registrationNumber: {
      $in: [
        'NGO-TEST-001',
        'NGO-TEST-002',
        'NGO-TEST-003',
        'NGO-TEST-DUP',
        'NGO-TEST-SEARCH',
        'NGO-TEST-STATUS'
      ]
    }
  });

  // Login tokens
  try {
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

    const volRes = await apiRequest(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: 'volunteer@ngo.org', password: 'VolunteerPass123!' })
    });
    volunteerToken = volRes.accessToken;

    const stuRes = await apiRequest(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: 'student@ngo.org', password: 'StudentPass123!' })
    });
    studentToken = stuRes.accessToken;
    studentUserId = stuRes.data?.data?.user?.id;
  } catch (err) {
    console.error('Failed to obtain initial authentication tokens:', err.message);
    process.exit(1);
  }

  let createdStudent1Id = null;
  let createdStudent2Id = null;

  // 1. Admin can list students
  try {
    const res = await apiRequest(`${BASE_URL}/students`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const ok = res.status === 200 && Array.isArray(res.data?.data?.students);
    record(1, 'Admin can list students', ok, `HTTP ${res.status}`);
  } catch (err) {
    record(1, 'Admin can list students', false, err.message);
  }

  // 2. Staff can list students
  try {
    const res = await apiRequest(`${BASE_URL}/students`, {
      headers: { Authorization: `Bearer ${staffToken}` }
    });
    const ok = res.status === 200 && Array.isArray(res.data?.data?.students);
    record(2, 'Staff can list students', ok, `HTTP ${res.status}`);
  } catch (err) {
    record(2, 'Staff can list students', false, err.message);
  }

  // 3. Authorized user can create student
  try {
    const res = await apiRequest(`${BASE_URL}/students`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${staffToken}` },
      body: JSON.stringify({
        registrationNumber: 'NGO-TEST-001',
        firstName: 'Ananya',
        lastName: 'Roy',
        gender: 'female',
        email: 'ananya.roy@example.com',
        schoolName: 'City High School',
        educationLevel: 'Secondary',
        userId: studentUserId, // Link to student user account
        status: 'active'
      })
    });
    createdStudent1Id = res.data?.data?.student?.id;
    const ok = res.status === 201 && res.data?.data?.student?.registrationNumber === 'NGO-TEST-001';
    record(3, 'Authorized user can create student', ok, `HTTP ${res.status}, regNo=${res.data?.data?.student?.registrationNumber}`);
  } catch (err) {
    record(3, 'Authorized user can create student', false, err.message);
  }

  // 4. Student creation succeeds with valid data
  try {
    const res = await apiRequest(`${BASE_URL}/students`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        registrationNumber: 'NGO-TEST-002',
        firstName: 'Dev',
        lastName: 'Sharma',
        gender: 'male',
        schoolName: 'Modern Academy',
        educationLevel: 'Primary',
        guardianName: 'Ramesh Sharma',
        guardianRelationship: 'Father',
        status: 'active'
      })
    });
    createdStudent2Id = res.data?.data?.student?.id;
    const ok = res.status === 201 && res.data?.data?.student?.firstName === 'Dev';
    record(4, 'Student creation succeeds with valid data', ok, `HTTP ${res.status}, name=${res.data?.data?.student?.firstName}`);
  } catch (err) {
    record(4, 'Student creation succeeds with valid data', false, err.message);
  }

  // 5. Duplicate registration number rejected (HTTP 409)
  try {
    const res = await apiRequest(`${BASE_URL}/students`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        registrationNumber: 'NGO-TEST-001', // Already used
        firstName: 'Duplicate',
        lastName: 'Student'
      })
    });
    const ok = res.status === 409 && res.data?.message?.includes('already exists');
    record(5, 'Duplicate registration number rejected', ok, `HTTP ${res.status}: ${res.data?.message}`);
  } catch (err) {
    record(5, 'Duplicate registration number rejected', false, err.message);
  }

  // 6. Invalid email rejected (HTTP 400)
  try {
    const res = await apiRequest(`${BASE_URL}/students`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        registrationNumber: 'NGO-TEST-003',
        firstName: 'Bad',
        lastName: 'Email',
        email: 'invalid-email-format'
      })
    });
    const ok = res.status === 400 && res.data?.success === false;
    record(6, 'Invalid email rejected', ok, `HTTP ${res.status}`);
  } catch (err) {
    record(6, 'Invalid email rejected', false, err.message);
  }

  // 7. Invalid ObjectId rejected (HTTP 400)
  try {
    const res = await apiRequest(`${BASE_URL}/students/invalid-object-id-123`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const ok = res.status === 400 && res.data?.success === false;
    record(7, 'Invalid ObjectId rejected', ok, `HTTP ${res.status}: ${res.data?.message}`);
  } catch (err) {
    record(7, 'Invalid ObjectId rejected', false, err.message);
  }

  // 8. Required fields validated (HTTP 400)
  try {
    const res = await apiRequest(`${BASE_URL}/students`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({})
    });
    const ok = res.status === 400 && res.data?.success === false;
    record(8, 'Required fields validated', ok, `HTTP ${res.status}`);
  } catch (err) {
    record(8, 'Required fields validated', false, err.message);
  }

  // 9. Admin can view student
  try {
    const res = await apiRequest(`${BASE_URL}/students/${createdStudent1Id}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const ok = res.status === 200 && res.data?.data?.student?.registrationNumber === 'NGO-TEST-001';
    record(9, 'Admin can view student', ok, `HTTP ${res.status}, reg=${res.data?.data?.student?.registrationNumber}`);
  } catch (err) {
    record(9, 'Admin can view student', false, err.message);
  }

  // 10. Staff can view student
  try {
    const res = await apiRequest(`${BASE_URL}/students/${createdStudent1Id}`, {
      headers: { Authorization: `Bearer ${staffToken}` }
    });
    const ok = res.status === 200 && res.data?.data?.student?.registrationNumber === 'NGO-TEST-001';
    record(10, 'Staff can view student', ok, `HTTP ${res.status}, reg=${res.data?.data?.student?.registrationNumber}`);
  } catch (err) {
    record(10, 'Staff can view student', false, err.message);
  }

  // 11. Admin can edit student
  try {
    const res = await apiRequest(`${BASE_URL}/students/${createdStudent1Id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        firstName: 'Ananya-Updated',
        educationLevel: 'Higher Secondary',
        schoolName: 'National Academy'
      })
    });
    const ok = res.status === 200 && res.data?.data?.student?.firstName === 'Ananya-Updated';
    record(11, 'Admin can edit student', ok, `HTTP ${res.status}, name=${res.data?.data?.student?.firstName}`);
  } catch (err) {
    record(11, 'Admin can edit student', false, err.message);
  }

  // 12. Staff can edit student if permitted
  try {
    const res = await apiRequest(`${BASE_URL}/students/${createdStudent2Id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${staffToken}` },
      body: JSON.stringify({
        notes: 'Updated by staff coordinator'
      })
    });
    const ok = res.status === 200 && res.data?.data?.student?.notes === 'Updated by staff coordinator';
    record(12, 'Staff can edit student if permitted', ok, `HTTP ${res.status}`);
  } catch (err) {
    record(12, 'Staff can edit student if permitted', false, err.message);
  }

  // 13. Admin can change student status
  try {
    const res = await apiRequest(`${BASE_URL}/students/${createdStudent1Id}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ status: 'graduated' })
    });
    const ok = res.status === 200 && res.data?.data?.student?.status === 'graduated';
    record(13, 'Admin can change student status', ok, `HTTP ${res.status}, status=${res.data?.data?.student?.status}`);
  } catch (err) {
    record(13, 'Admin can change student status', false, err.message);
  }

  // 14. Invalid status rejected
  try {
    const res = await apiRequest(`${BASE_URL}/students/${createdStudent1Id}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ status: 'unknown_status_code' })
    });
    const ok = res.status === 400 && res.data?.success === false;
    record(14, 'Invalid status rejected', ok, `HTTP ${res.status}`);
  } catch (err) {
    record(14, 'Invalid status rejected', false, err.message);
  }

  // 15. Student can access only their own profile
  try {
    // Student 1 was linked to studentUserId
    const res = await apiRequest(`${BASE_URL}/students/${createdStudent1Id}`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const ok = res.status === 200 && res.data?.data?.student?.registrationNumber === 'NGO-TEST-001';
    record(15, 'Student can access their own profile', ok, `HTTP ${res.status}, reg=${res.data?.data?.student?.registrationNumber}`);
  } catch (err) {
    record(15, 'Student can access their own profile', false, err.message);
  }

  // 16. Student cannot access another student's profile
  try {
    // Student 2 is NOT linked to studentUserId
    const res = await apiRequest(`${BASE_URL}/students/${createdStudent2Id}`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const ok = res.status === 403 && res.data?.success === false;
    record(16, "Student cannot access another student's profile", ok, `HTTP ${res.status}: ${res.data?.message}`);
  } catch (err) {
    record(16, "Student cannot access another student's profile", false, err.message);
  }

  // 17. Volunteer restrictions work
  try {
    // Volunteer cannot create student
    const createRes = await apiRequest(`${BASE_URL}/students`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${volunteerToken}` },
      body: JSON.stringify({
        registrationNumber: 'NGO-TEST-VOL',
        firstName: 'Vol',
        lastName: 'Test'
      })
    });

    // Volunteer cannot edit student
    const editRes = await apiRequest(`${BASE_URL}/students/${createdStudent1Id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${volunteerToken}` },
      body: JSON.stringify({ firstName: 'Hacked' })
    });

    // Volunteer cannot change status
    const statusRes = await apiRequest(`${BASE_URL}/students/${createdStudent1Id}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${volunteerToken}` },
      body: JSON.stringify({ status: 'inactive' })
    });

    const ok = createRes.status === 403 && editRes.status === 403 && statusRes.status === 403;
    record(17, 'Volunteer restrictions work', ok, `POST=${createRes.status}, PUT=${editRes.status}, PATCH=${statusRes.status}`);
  } catch (err) {
    record(17, 'Volunteer restrictions work', false, err.message);
  }

  // 18. Unauthenticated request rejected
  try {
    const res = await apiRequest(`${BASE_URL}/students`);
    const ok = res.status === 401 && res.data?.success === false;
    record(18, 'Unauthenticated request rejected', ok, `HTTP ${res.status}: ${res.data?.message}`);
  } catch (err) {
    record(18, 'Unauthenticated request rejected', false, err.message);
  }

  // 19. Student passwords are never returned
  try {
    const res = await apiRequest(`${BASE_URL}/students/${createdStudent1Id}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const student = res.data?.data?.student;
    const hasPassword = 'password' in (student || {}) || 'password' in (student?.userId || {});
    const ok = !hasPassword;
    record(19, 'Student passwords are never returned', ok, 'No password field in student or linked user');
  } catch (err) {
    record(19, 'Student passwords are never returned', false, err.message);
  }

  // 20. Linked User information is safe
  try {
    const res = await apiRequest(`${BASE_URL}/students/${createdStudent1Id}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const fullJson = JSON.stringify(res.data);
    const hasBcryptHash = fullJson.includes('$2b$') || fullJson.includes('$2a$');
    const linkedUser = res.data?.data?.student?.userId;
    const ok = !hasBcryptHash && linkedUser && linkedUser.email === 'student@ngo.org';
    record(20, 'Linked User information is safe', ok, `No bcrypt hash in JSON; linked email=${linkedUser?.email}`);
  } catch (err) {
    record(20, 'Linked User information is safe', false, err.message);
  }

  // 21. Pagination works
  try {
    const res = await apiRequest(`${BASE_URL}/students?page=1&limit=1`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const pagination = res.data?.data?.pagination;
    const ok = res.status === 200 && res.data?.data?.students?.length === 1 && pagination?.currentPage === 1 && pagination?.limit === 1;
    record(21, 'Pagination works', ok, `Page ${pagination?.currentPage}, Limit ${pagination?.limit}, Total ${pagination?.totalStudents}`);
  } catch (err) {
    record(21, 'Pagination works', false, err.message);
  }

  // 22. Search works
  try {
    const res = await apiRequest(`${BASE_URL}/students?search=Ananya`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const ok = res.status === 200 && res.data?.data?.students?.some((s) => s.firstName.includes('Ananya'));
    record(22, 'Search works', ok, `Found ${res.data?.data?.students?.length} student(s) matching 'Ananya'`);
  } catch (err) {
    record(22, 'Search works', false, err.message);
  }

  // 23. Status filtering works
  try {
    const res = await apiRequest(`${BASE_URL}/students?status=active`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const ok = res.status === 200 && res.data?.data?.students?.every((s) => s.status === 'active');
    record(23, 'Status filtering works', ok, `All ${res.data?.data?.students?.length} returned students have status=active`);
  } catch (err) {
    record(23, 'Status filtering works', false, err.message);
  }

  // 24. Sorting works
  try {
    const res = await apiRequest(`${BASE_URL}/students?sortBy=registrationNumber&sortOrder=asc`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const students = res.data?.data?.students || [];
    let isSorted = true;
    for (let i = 1; i < students.length; i++) {
      if (students[i].registrationNumber < students[i - 1].registrationNumber) {
        isSorted = false;
        break;
      }
    }
    record(24, 'Sorting works', res.status === 200 && isSorted, `Sorted ${students.length} students by registrationNumber asc`);
  } catch (err) {
    record(24, 'Sorting works', false, err.message);
  }

  // Cleanup test documents
  await Student.deleteMany({
    registrationNumber: {
      $in: [
        'NGO-TEST-001',
        'NGO-TEST-002',
        'NGO-TEST-003',
        'NGO-TEST-DUP',
        'NGO-TEST-SEARCH',
        'NGO-TEST-STATUS'
      ]
    }
  });

  await teardownTestEnvironment();

  console.log('\n================================================================');
  const allPassed = results.every((r) => r.passed);
  console.log(
    `TEST SUITE RESULT: ${
      allPassed ? 'ALL 24 PHASE 3B TESTS PASSED SUCCESSFULLY! ✅' : 'SOME TESTS FAILED ❌'
    }`
  );
  console.log('================================================================\n');

  process.exit(allPassed ? 0 : 1);
};

runTests();

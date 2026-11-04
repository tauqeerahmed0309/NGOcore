const mongoose = require('mongoose');
const config = require('../config/env');
const User = require('../models/User');
const { apiRequest } = require('./apiTestClient');
const { setupTestEnvironment, teardownTestEnvironment } = require('./testHelper');

const BASE_URL = `http://localhost:${config.PORT}/api/v1`;

const results = [];

const record = (num, name, passed, details) => {
  results.push({ num, name, passed, details });
  console.log(
    `${passed ? '✅' : '❌'} Test ${num.toString().padStart(2, ' ')}: ${name.padEnd(42, ' ')} -> ${
      passed ? 'PASSED' : 'FAILED'
    } (${details})`
  );
};

const runTests = async () => {
  await setupTestEnvironment();

  console.log('\n================================================================');
  console.log('   RUNNING PHASE 3A: USER MANAGEMENT AUTOMATED TEST SUITE        ');
  console.log('================================================================\n');

  let adminToken = '';
  let staffToken = '';
  let volunteerToken = '';
  let studentToken = '';
  let adminId = '';

  // Step 0: Clean up any prior test users to ensure idempotency
  await User.deleteMany({
    email: {
      $in: [
        'test.staff@ngo.org',
        'test.volunteer@ngo.org',
        'test.student@ngo.org',
        'test.student.updated@ngo.org',
        'hacker.admin@ngo.org'
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
    adminId = adminRes.data?.data?.user?.id;

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
  } catch (err) {
    console.error('Failed to obtain initial authentication tokens:', err.message);
    process.exit(1);
  }

  let createdStaffId = null;
  let createdVolunteerId = null;
  let createdStudentId = null;

  // 1. Admin can list users
  try {
    const res = await apiRequest(`${BASE_URL}/users`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const ok = res.status === 200 && Array.isArray(res.data?.data?.users) && res.data?.data?.users?.length > 0;
    record(1, 'Admin can list users', ok, `HTTP ${res.status}, count=${res.data?.data?.users?.length}`);
  } catch (err) {
    record(1, 'Admin can list users', false, err.message);
  }

  // 2. Admin can create Staff
  try {
    const res = await apiRequest(`${BASE_URL}/users`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        firstName: 'Test',
        lastName: 'Staffer',
        email: 'test.staff@ngo.org',
        role: 'staff',
        password: 'StaffSecret123!'
      })
    });
    createdStaffId = res.data?.data?.user?.id;
    const ok = res.status === 201 && res.data?.data?.user?.role === 'staff' && !res.data?.data?.user?.password;
    record(2, 'Admin can create Staff', ok, `HTTP ${res.status}, role=${res.data?.data?.user?.role}`);
  } catch (err) {
    record(2, 'Admin can create Staff', false, err.message);
  }

  // 3. Admin can create Volunteer
  try {
    const res = await apiRequest(`${BASE_URL}/users`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        firstName: 'Test',
        lastName: 'Volunteer',
        email: 'test.volunteer@ngo.org',
        role: 'volunteer',
        password: 'VolunteerSecret123!'
      })
    });
    createdVolunteerId = res.data?.data?.user?.id;
    const ok = res.status === 201 && res.data?.data?.user?.role === 'volunteer';
    record(3, 'Admin can create Volunteer', ok, `HTTP ${res.status}, role=${res.data?.data?.user?.role}`);
  } catch (err) {
    record(3, 'Admin can create Volunteer', false, err.message);
  }

  // 4. Admin can create Student
  try {
    const res = await apiRequest(`${BASE_URL}/users`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        firstName: 'Test',
        lastName: 'Student',
        email: 'test.student@ngo.org',
        role: 'student',
        password: 'StudentSecret123!'
      })
    });
    createdStudentId = res.data?.data?.user?.id;
    const ok = res.status === 201 && res.data?.data?.user?.role === 'student';
    record(4, 'Admin can create Student', ok, `HTTP ${res.status}, role=${res.data?.data?.user?.role}`);
  } catch (err) {
    record(4, 'Admin can create Student', false, err.message);
  }

  // 5. Admin cannot create Admin
  try {
    const res = await apiRequest(`${BASE_URL}/users`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        firstName: 'Hacker',
        lastName: 'Admin',
        email: 'hacker.admin@ngo.org',
        role: 'admin',
        password: 'HackerSecret123!'
      })
    });
    const ok = res.status === 400 && res.data?.success === false;
    record(5, 'Admin cannot create Admin', ok, `HTTP ${res.status}: ${res.data?.message || 'Rejected'}`);
  } catch (err) {
    record(5, 'Admin cannot create Admin', false, err.message);
  }

  // 6. Duplicate email is rejected
  try {
    const res = await apiRequest(`${BASE_URL}/users`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        firstName: 'Duplicate',
        lastName: 'User',
        email: 'test.staff@ngo.org', // Already created in test 2
        role: 'staff',
        password: 'StaffSecret123!'
      })
    });
    const ok = res.status === 409 && res.data?.message?.includes('already registered');
    record(6, 'Duplicate email is rejected', ok, `HTTP ${res.status}: ${res.data?.message}`);
  } catch (err) {
    record(6, 'Duplicate email is rejected', false, err.message);
  }

  // 7. Invalid email is rejected
  try {
    const res = await apiRequest(`${BASE_URL}/users`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        firstName: 'Bad',
        lastName: 'Email',
        email: 'not-a-valid-email',
        role: 'staff',
        password: 'StaffSecret123!'
      })
    });
    const ok = res.status === 400 && res.data?.success === false;
    record(7, 'Invalid email is rejected', ok, `HTTP ${res.status}`);
  } catch (err) {
    record(7, 'Invalid email is rejected', false, err.message);
  }

  // 8. Invalid role is rejected
  try {
    const res = await apiRequest(`${BASE_URL}/users`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        firstName: 'Bad',
        lastName: 'Role',
        email: 'bad.role@ngo.org',
        role: 'superadmin',
        password: 'StaffSecret123!'
      })
    });
    const ok = res.status === 400 && res.data?.success === false;
    record(8, 'Invalid role is rejected', ok, `HTTP ${res.status}`);
  } catch (err) {
    record(8, 'Invalid role is rejected', false, err.message);
  }

  // 9. Admin can view user
  try {
    const res = await apiRequest(`${BASE_URL}/users/${createdStudentId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const ok = res.status === 200 && res.data?.data?.user?.email === 'test.student@ngo.org';
    record(9, 'Admin can view user', ok, `HTTP ${res.status}, email=${res.data?.data?.user?.email}`);
  } catch (err) {
    record(9, 'Admin can view user', false, err.message);
  }

  // 10. Admin can edit user
  try {
    const res = await apiRequest(`${BASE_URL}/users/${createdStudentId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        firstName: 'UpdatedStudent',
        lastName: 'Scholar',
        email: 'test.student.updated@ngo.org',
        role: 'student'
      })
    });
    const ok = res.status === 200 && res.data?.data?.user?.firstName === 'UpdatedStudent' && res.data?.data?.user?.email === 'test.student.updated@ngo.org';
    record(10, 'Admin can edit user', ok, `HTTP ${res.status}, name=${res.data?.data?.user?.firstName}`);
  } catch (err) {
    record(10, 'Admin can edit user', false, err.message);
  }

  // 11. Admin can deactivate user
  try {
    const res = await apiRequest(`${BASE_URL}/users/${createdStudentId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ isActive: false })
    });
    const ok = res.status === 200 && res.data?.data?.user?.isActive === false;
    record(11, 'Admin can deactivate user', ok, `HTTP ${res.status}, isActive=${res.data?.data?.user?.isActive}`);
  } catch (err) {
    record(11, 'Admin can deactivate user', false, err.message);
  }

  // 12. Admin can reactivate user
  try {
    const res = await apiRequest(`${BASE_URL}/users/${createdStudentId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ isActive: true })
    });
    const ok = res.status === 200 && res.data?.data?.user?.isActive === true;
    record(12, 'Admin can reactivate user', ok, `HTTP ${res.status}, isActive=${res.data?.data?.user?.isActive}`);
  } catch (err) {
    record(12, 'Admin can reactivate user', false, err.message);
  }

  // 13. Admin cannot deactivate themselves
  try {
    const res = await apiRequest(`${BASE_URL}/users/${adminId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ isActive: false })
    });
    const ok = res.status === 400 && res.data?.message?.includes('cannot deactivate your own admin account');
    record(13, 'Admin cannot deactivate themselves', ok, `HTTP ${res.status}: ${res.data?.message}`);
  } catch (err) {
    record(13, 'Admin cannot deactivate themselves', false, err.message);
  }

  // 14. Deactivated user cannot log in
  try {
    // 14a. Deactivate student
    await apiRequest(`${BASE_URL}/users/${createdStudentId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ isActive: false })
    });

    // 14b. Attempt login
    const loginRes = await apiRequest(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({
        email: 'test.student.updated@ngo.org',
        password: 'StudentSecret123!'
      })
    });

    const ok = loginRes.status === 401 && loginRes.data?.message?.includes('deactivated');
    record(14, 'Deactivated user cannot log in', ok, `HTTP ${loginRes.status}: ${loginRes.data?.message}`);

    // 14c. Reactivate student
    await apiRequest(`${BASE_URL}/users/${createdStudentId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ isActive: true })
    });
  } catch (err) {
    record(14, 'Deactivated user cannot log in', false, err.message);
  }

  // 15. Staff cannot access User Management API
  try {
    const res = await apiRequest(`${BASE_URL}/users`, {
      headers: { Authorization: `Bearer ${staffToken}` }
    });
    const ok = res.status === 403;
    record(15, 'Staff cannot access User Management', ok, `HTTP ${res.status}: ${res.data?.message}`);
  } catch (err) {
    record(15, 'Staff cannot access User Management', false, err.message);
  }

  // 16. Volunteer cannot access User Management API
  try {
    const res = await apiRequest(`${BASE_URL}/users`, {
      headers: { Authorization: `Bearer ${volunteerToken}` }
    });
    const ok = res.status === 403;
    record(16, 'Volunteer cannot access User Management', ok, `HTTP ${res.status}: ${res.data?.message}`);
  } catch (err) {
    record(16, 'Volunteer cannot access User Management', false, err.message);
  }

  // 17. Student cannot access User Management API
  try {
    const res = await apiRequest(`${BASE_URL}/users`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const ok = res.status === 403;
    record(17, 'Student cannot access User Management', ok, `HTTP ${res.status}: ${res.data?.message}`);
  } catch (err) {
    record(17, 'Student cannot access User Management', false, err.message);
  }

  // 18. Password is never returned
  try {
    const listRes = await apiRequest(`${BASE_URL}/users`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const getRes = await apiRequest(`${BASE_URL}/users/${createdStudentId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    const fullPayload = JSON.stringify(listRes.data) + JSON.stringify(getRes.data);
    const hasHash = fullPayload.includes('$2b$') || fullPayload.includes('$2a$');
    const hasPasswordField = 'password' in (getRes.data?.data?.user || {});

    const ok = !hasHash && !hasPasswordField;
    record(18, 'Password is never returned in API', ok, 'No password field or bcrypt hash in JSON payload');
  } catch (err) {
    record(18, 'Password is never returned in API', false, err.message);
  }

  // 19. Password is stored hashed
  try {
    const userDoc = await User.findById(createdStudentId).select('+password');
    const isHashed = userDoc && userDoc.password && userDoc.password.startsWith('$2b$') && userDoc.password !== 'StudentSecret123!';
    record(19, 'Password is stored hashed in MongoDB', !!isHashed, `Hash prefix: ${userDoc?.password?.substring(0, 7)}...`);
  } catch (err) {
    record(19, 'Password is stored hashed in MongoDB', false, err.message);
  }

  // 20. Search works
  try {
    const res = await apiRequest(`${BASE_URL}/users?search=UpdatedStudent`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const ok = res.status === 200 && res.data?.data?.users?.some((u) => u.firstName === 'UpdatedStudent');
    record(20, 'Search works', ok, `Found ${res.data?.data?.users?.length} user(s) matching 'UpdatedStudent'`);
  } catch (err) {
    record(20, 'Search works', false, err.message);
  }

  // 21. Role filter works
  try {
    const res = await apiRequest(`${BASE_URL}/users?role=staff`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const ok = res.status === 200 && res.data?.data?.users?.every((u) => u.role === 'staff');
    record(21, 'Role filter works', ok, `All ${res.data?.data?.users?.length} returned users have role=staff`);
  } catch (err) {
    record(21, 'Role filter works', false, err.message);
  }

  // 22. Status filter works
  try {
    const res = await apiRequest(`${BASE_URL}/users?status=active`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const ok = res.status === 200 && res.data?.data?.users?.every((u) => u.isActive === true);
    record(22, 'Status filter works', ok, `All ${res.data?.data?.users?.length} returned users are active`);
  } catch (err) {
    record(22, 'Status filter works', false, err.message);
  }

  // 23. Pagination works
  try {
    const res = await apiRequest(`${BASE_URL}/users?page=1&limit=2`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const pagination = res.data?.data?.pagination;
    const ok = res.status === 200 && res.data?.data?.users?.length <= 2 && pagination?.currentPage === 1 && pagination?.limit === 2;
    record(23, 'Pagination works', ok, `Page ${pagination?.currentPage}, Limit ${pagination?.limit}, Total ${pagination?.totalUsers}`);
  } catch (err) {
    record(23, 'Pagination works', false, err.message);
  }

  // Cleanup test documents
  await User.deleteMany({
    email: {
      $in: [
        'test.staff@ngo.org',
        'test.volunteer@ngo.org',
        'test.student@ngo.org',
        'test.student.updated@ngo.org',
        'hacker.admin@ngo.org'
      ]
    }
  });

  await teardownTestEnvironment();

  console.log('\n================================================================');
  const allPassed = results.every((r) => r.passed);
  console.log(
    `TEST SUITE RESULT: ${
      allPassed ? 'ALL 23 PHASE 3A TESTS PASSED SUCCESSFULLY! ✅' : 'SOME TESTS FAILED ❌'
    }`
  );
  console.log('================================================================\n');

  process.exit(allPassed ? 0 : 1);
};

runTests();

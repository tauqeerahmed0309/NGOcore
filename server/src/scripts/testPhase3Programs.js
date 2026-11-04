const mongoose = require('mongoose');
const config = require('../config/env');
const Program = require('../models/Program');
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
  console.log('   RUNNING PHASE 3C: DYNAMIC PROGRAM MANAGEMENT TEST SUITE     ');
  console.log('================================================================\n');

  let adminToken = '';
  let staffToken = '';
  let volunteerToken = '';
  let studentToken = '';

  let adminUserId = '';
  let staffUserId = '';
  let volunteerUserId = '';
  let studentUserId = '';
  let inactiveUserId = '';

  // Clean up prior test programs
  await Program.deleteMany({
    code: {
      $regex: /^(TEST|COORD|STAFF|VOL|INACT|STU|PY-|VOC-)/i
    }
  });

  // Login tokens
  try {
    const adminRes = await apiRequest(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: config.ADMIN_EMAIL, password: config.ADMIN_PASSWORD })
    });
    adminToken = adminRes.accessToken;
    adminUserId = adminRes.data?.data?.user?.id;

    const staffRes = await apiRequest(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: 'staff@ngo.org', password: 'StaffPassword123!' })
    });
    staffToken = staffRes.accessToken;
    staffUserId = staffRes.data?.data?.user?.id;

    const volRes = await apiRequest(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: 'volunteer@ngo.org', password: 'VolunteerPass123!' })
    });
    volunteerToken = volRes.accessToken;
    volunteerUserId = volRes.data?.data?.user?.id;

    const stuRes = await apiRequest(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: 'student@ngo.org', password: 'StudentPass123!' })
    });
    studentToken = stuRes.accessToken;
    studentUserId = stuRes.data?.data?.user?.id;

    // Find or create an inactive user for inactive-assignment testing
    let inactiveUser = await User.findOne({ email: 'inactive.test@ngo.org' });
    if (!inactiveUser) {
      const adminUser = await User.findOne({ email: config.ADMIN_EMAIL.toLowerCase().trim() });
      inactiveUser = await User.create({
        ngoId: adminUser.ngoId,
        email: 'inactive.test@ngo.org',
        password: 'Password123!',
        role: 'staff',
        firstName: 'Inactive',
        lastName: 'Member',
        isActive: false
      });
    } else {
      inactiveUser.isActive = false;
      await inactiveUser.save();
    }
    inactiveUserId = inactiveUser._id.toString();
  } catch (err) {
    console.error('Failed to obtain initial authentication tokens:', err.message);
    process.exit(1);
  }

  let createdProgram1Id = null;
  let createdProgram2Id = null;

  // 1. Admin can list programs
  try {
    const res = await apiRequest(`${BASE_URL}/programs`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    record(1, 'Admin can list programs', res.status === 200 && res.data?.success === true, `HTTP ${res.status}`);
  } catch (err) {
    record(1, 'Admin can list programs', false, err.message);
  }

  // 2. Admin can create program
  try {
    const res = await apiRequest(`${BASE_URL}/programs`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        name: 'Weekend Python Training',
        code: 'TEST-PROG-001',
        type: 'workshop',
        category: 'Skill Development',
        description: 'Comprehensive Python coding bootcamp for beginners',
        startDate: '2026-11-01',
        endDate: '2026-12-15',
        schedule: {
          days: ['saturday', 'sunday'],
          startTime: '10:00',
          endTime: '12:30',
          frequency: 'weekly'
        },
        location: 'Atria Community Center Room 204',
        coordinator: staffUserId,
        assignedStaff: [staffUserId],
        assignedVolunteers: [volunteerUserId],
        capacity: 25,
        status: 'active',
        customAttributes: {
          language: 'English',
          fundingOrganization: 'TechForGood Foundation',
          prerequisites: 'Basic Computer Literacy'
        }
      })
    });
    createdProgram1Id = res.data?.data?.program?._id || res.data?.data?.program?.id;
    record(
      2,
      'Admin can create program',
      res.status === 201 && res.data?.data?.program?.code === 'TEST-PROG-001',
      `HTTP ${res.status}, code=${res.data?.data?.program?.code}`
    );
  } catch (err) {
    record(2, 'Admin can create program', false, err.message);
  }

  // 3. Duplicate program code rejected (HTTP 409)
  try {
    const res = await apiRequest(`${BASE_URL}/programs`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        name: 'Duplicate Program Code',
        code: 'TEST-PROG-001',
        type: 'class'
      })
    });
    record(
      3,
      'Duplicate program code rejected',
      res.status === 409,
      `HTTP ${res.status}: ${res.data?.message || 'Conflict'}`
    );
  } catch (err) {
    record(3, 'Duplicate program code rejected', false, err.message);
  }

  // 4. Required fields validated (name, code, type)
  try {
    const res = await apiRequest(`${BASE_URL}/programs`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        description: 'Missing name, code, type'
      })
    });
    record(4, 'Required fields validated', res.status === 400, `HTTP ${res.status}`);
  } catch (err) {
    record(4, 'Required fields validated', false, err.message);
  }

  // 5. Invalid ObjectId rejected
  try {
    const res = await apiRequest(`${BASE_URL}/programs/123invalidId`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    record(5, 'Invalid ObjectId rejected', res.status === 400, `HTTP ${res.status}`);
  } catch (err) {
    record(5, 'Invalid ObjectId rejected', false, err.message);
  }

  // 6. Invalid date range rejected (endDate before startDate)
  try {
    const res = await apiRequest(`${BASE_URL}/programs`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        name: 'Invalid Date Range Program',
        code: 'TEST-DATE-ERR',
        type: 'workshop',
        startDate: '2026-12-01',
        endDate: '2026-10-01' // earlier than startDate
      })
    });
    record(6, 'Invalid date range rejected', res.status === 400, `HTTP ${res.status}`);
  } catch (err) {
    record(6, 'Invalid date range rejected', false, err.message);
  }

  // 7. Invalid capacity rejected (<= 0)
  try {
    const res = await apiRequest(`${BASE_URL}/programs`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        name: 'Invalid Capacity Program',
        code: 'TEST-CAP-ERR',
        type: 'workshop',
        capacity: -10
      })
    });
    record(7, 'Invalid capacity rejected', res.status === 400, `HTTP ${res.status}`);
  } catch (err) {
    record(7, 'Invalid capacity rejected', false, err.message);
  }

  // 8. Admin can view program
  try {
    const res = await apiRequest(`${BASE_URL}/programs/${createdProgram1Id}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    record(
      8,
      'Admin can view program',
      res.status === 200 && res.data?.data?.program?.code === 'TEST-PROG-001',
      `HTTP ${res.status}`
    );
  } catch (err) {
    record(8, 'Admin can view program', false, err.message);
  }

  // 9. Admin can edit program
  try {
    const res = await apiRequest(`${BASE_URL}/programs/${createdProgram1Id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        name: 'Advanced Python & Automation Bootcamp',
        capacity: 35
      })
    });
    record(
      9,
      'Admin can edit program',
      res.status === 200 && res.data?.data?.program?.name === 'Advanced Python & Automation Bootcamp',
      `HTTP ${res.status}, capacity=${res.data?.data?.program?.capacity}`
    );
  } catch (err) {
    record(9, 'Admin can edit program', false, err.message);
  }

  // 10. Admin can change program status
  try {
    const res = await apiRequest(`${BASE_URL}/programs/${createdProgram1Id}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ status: 'paused' })
    });
    record(
      10,
      'Admin can change program status',
      res.status === 200 && res.data?.data?.program?.status === 'paused',
      `HTTP ${res.status}, status=${res.data?.data?.program?.status}`
    );
  } catch (err) {
    record(10, 'Admin can change program status', false, err.message);
  }

  // 11. Staff can view permitted programs
  try {
    const res = await apiRequest(`${BASE_URL}/programs`, {
      headers: { Authorization: `Bearer ${staffToken}` }
    });
    record(11, 'Staff can view permitted programs', res.status === 200, `HTTP ${res.status}`);
  } catch (err) {
    record(11, 'Staff can view permitted programs', false, err.message);
  }

  // 12. Volunteer can view permitted programs (assigned programs)
  try {
    const res = await apiRequest(`${BASE_URL}/programs`, {
      headers: { Authorization: `Bearer ${volunteerToken}` }
    });
    const hasAssigned = res.data?.data?.programs?.some(
      (p) => (p._id || p.id) === createdProgram1Id
    );
    record(12, 'Volunteer can view permitted programs', res.status === 200 && hasAssigned, `HTTP ${res.status}, assigned program visible`);
  } catch (err) {
    record(12, 'Volunteer can view permitted programs', false, err.message);
  }

  // 13. Staff cannot create program (HTTP 403)
  try {
    const res = await apiRequest(`${BASE_URL}/programs`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${staffToken}` },
      body: JSON.stringify({
        name: 'Staff Created Program',
        code: 'STAFF-PROG-01',
        type: 'workshop'
      })
    });
    record(13, 'Staff cannot create program', res.status === 403, `HTTP ${res.status}`);
  } catch (err) {
    record(13, 'Staff cannot create program', false, err.message);
  }

  // 14. Volunteer cannot create program (HTTP 403)
  try {
    const res = await apiRequest(`${BASE_URL}/programs`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${volunteerToken}` },
      body: JSON.stringify({
        name: 'Volunteer Created Program',
        code: 'VOL-PROG-01',
        type: 'camp'
      })
    });
    record(14, 'Volunteer cannot create program', res.status === 403, `HTTP ${res.status}`);
  } catch (err) {
    record(14, 'Volunteer cannot create program', false, err.message);
  }

  // 15. Student cannot create program (HTTP 403)
  try {
    const res = await apiRequest(`${BASE_URL}/programs`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: JSON.stringify({
        name: 'Student Created Program',
        code: 'STU-PROG-01',
        type: 'course'
      })
    });
    record(15, 'Student cannot create program', res.status === 403, `HTTP ${res.status}`);
  } catch (err) {
    record(15, 'Student cannot create program', false, err.message);
  }

  // 16. Student cannot access unrestricted program list (HTTP 403)
  try {
    const res = await apiRequest(`${BASE_URL}/programs`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    record(16, 'Student cannot access unrestricted program list', res.status === 403, `HTTP ${res.status}`);
  } catch (err) {
    record(16, 'Student cannot access unrestricted program list', false, err.message);
  }

  // 17. Invalid coordinator rejected (non-existent user)
  try {
    const nonExistentId = new mongoose.Types.ObjectId().toString();
    const res = await apiRequest(`${BASE_URL}/programs`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        name: 'Invalid Coordinator Test',
        code: 'COORD-ERR-01',
        type: 'workshop',
        coordinator: nonExistentId
      })
    });
    record(17, 'Invalid coordinator rejected', res.status === 400, `HTTP ${res.status}`);
  } catch (err) {
    record(17, 'Invalid coordinator rejected', false, err.message);
  }

  // 18. Coordinator must have valid allowed role (Student role rejected)
  try {
    const res = await apiRequest(`${BASE_URL}/programs`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        name: 'Student As Coordinator Test',
        code: 'COORD-STU-ERR',
        type: 'workshop',
        coordinator: studentUserId
      })
    });
    record(18, 'Coordinator must have valid allowed role', res.status === 400, `HTTP ${res.status}`);
  } catch (err) {
    record(18, 'Coordinator must have valid allowed role', false, err.message);
  }

  // 19. Invalid staff assignment rejected (non-existent user)
  try {
    const nonExistentId = new mongoose.Types.ObjectId().toString();
    const res = await apiRequest(`${BASE_URL}/programs`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        name: 'Invalid Staff Test',
        code: 'STAFF-ERR-01',
        type: 'class',
        assignedStaff: [nonExistentId]
      })
    });
    record(19, 'Invalid staff assignment rejected', res.status === 400, `HTTP ${res.status}`);
  } catch (err) {
    record(19, 'Invalid staff assignment rejected', false, err.message);
  }

  // 20. Invalid volunteer assignment rejected (non-existent user)
  try {
    const nonExistentId = new mongoose.Types.ObjectId().toString();
    const res = await apiRequest(`${BASE_URL}/programs`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        name: 'Invalid Volunteer Test',
        code: 'VOL-ERR-01',
        type: 'event',
        assignedVolunteers: [nonExistentId]
      })
    });
    record(20, 'Invalid volunteer assignment rejected', res.status === 400, `HTTP ${res.status}`);
  } catch (err) {
    record(20, 'Invalid volunteer assignment rejected', false, err.message);
  }

  // 21. Inactive users cannot be assigned
  try {
    const res = await apiRequest(`${BASE_URL}/programs`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        name: 'Inactive User Assignment Test',
        code: 'INACT-ERR-01',
        type: 'training',
        assignedStaff: [inactiveUserId]
      })
    });
    record(21, 'Inactive users cannot be assigned', res.status === 400, `HTTP ${res.status}`);
  } catch (err) {
    record(21, 'Inactive users cannot be assigned', false, err.message);
  }

  // 22. Student users cannot be assigned as staff
  try {
    const res = await apiRequest(`${BASE_URL}/programs`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        name: 'Student As Staff Assignment Test',
        code: 'STU-AS-STAFF-ERR',
        type: 'training',
        assignedStaff: [studentUserId]
      })
    });
    record(22, 'Student users cannot be assigned as staff', res.status === 400, `HTTP ${res.status}`);
  } catch (err) {
    record(22, 'Student users cannot be assigned as staff', false, err.message);
  }

  // Create Program 2 for filtering & search tests
  try {
    const res = await apiRequest(`${BASE_URL}/programs`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        name: 'Vocational Carpentry Training',
        code: 'TEST-PROG-002',
        type: 'vocational',
        category: 'Skill Development',
        description: 'Hands-on woodwork and furniture crafting',
        startDate: '2026-10-15',
        status: 'active',
        location: 'Workshop Hub Room B'
      })
    });
    createdProgram2Id = res.data?.data?.program?._id || res.data?.data?.program?.id;
  } catch (err) {
    console.error('Error creating program 2 for tests:', err);
  }

  // 23. Search works (across name, code, description, location)
  try {
    const res = await apiRequest(`${BASE_URL}/programs?search=Carpentry`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const found = res.data?.data?.programs?.some((p) => p.code === 'TEST-PROG-002');
    record(23, 'Search works', res.status === 200 && found, `Found ${res.data?.data?.programs?.length || 0} matching programs`);
  } catch (err) {
    record(23, 'Search works', false, err.message);
  }

  // 24. Type filtering works
  try {
    const res = await apiRequest(`${BASE_URL}/programs?type=vocational`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const allMatch = res.data?.data?.programs?.every((p) => p.type === 'vocational');
    record(24, 'Type filtering works', res.status === 200 && allMatch && res.data?.data?.programs?.length > 0, `All returned have type=vocational`);
  } catch (err) {
    record(24, 'Type filtering works', false, err.message);
  }

  // 25. Category filtering works
  try {
    const res = await apiRequest(`${BASE_URL}/programs?category=Skill Development`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const allMatch = res.data?.data?.programs?.every((p) => p.category.toLowerCase() === 'skill development');
    record(25, 'Category filtering works', res.status === 200 && allMatch, `All returned have category='Skill Development'`);
  } catch (err) {
    record(25, 'Category filtering works', false, err.message);
  }

  // 26. Status filtering works
  try {
    const res = await apiRequest(`${BASE_URL}/programs?status=paused`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const allMatch = res.data?.data?.programs?.every((p) => p.status === 'paused');
    record(26, 'Status filtering works', res.status === 200 && allMatch && res.data?.data?.programs?.length > 0, `All returned have status=paused`);
  } catch (err) {
    record(26, 'Status filtering works', false, err.message);
  }

  // 27. Pagination works
  try {
    const res = await apiRequest(`${BASE_URL}/programs?page=1&limit=1`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    record(
      27,
      'Pagination works',
      res.status === 200 && res.data?.data?.programs?.length === 1 && res.data?.data?.pagination?.totalPages >= 2,
      `Limit=1, Total=${res.data?.data?.pagination?.totalPrograms}`
    );
  } catch (err) {
    record(27, 'Pagination works', false, err.message);
  }

  // 28. Sorting works
  try {
    const res = await apiRequest(`${BASE_URL}/programs?sortBy=code&sortOrder=asc`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const codes = res.data?.data?.programs?.map((p) => p.code) || [];
    const isSorted = codes.every((val, i, arr) => !i || arr[i - 1] <= val);
    record(28, 'Sorting works', res.status === 200 && isSorted, `Sorted ${codes.length} programs by code asc`);
  } catch (err) {
    record(28, 'Sorting works', false, err.message);
  }

  // 29. Custom program type works (custom string not in any preset enum)
  try {
    const res = await apiRequest(`${BASE_URL}/programs`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        name: 'Community Solar Awareness Campaign',
        code: 'TEST-PROG-CUSTOM',
        type: 'community_solar_camp', // totally custom type string
        category: 'Environmental Awareness',
        status: 'active'
      })
    });
    record(
      29,
      'Custom program type works',
      res.status === 201 && res.data?.data?.program?.type === 'community_solar_camp',
      `HTTP 201, custom type='${res.data?.data?.program?.type}' accepted`
    );
  } catch (err) {
    record(29, 'Custom program type works', false, err.message);
  }

  // 30. Custom attributes are stored and returned safely
  try {
    const res = await apiRequest(`${BASE_URL}/programs`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        name: 'Special Attributes Program',
        code: 'TEST-PROG-ATTR',
        type: 'training',
        customAttributes: {
          targetAgeGroup: '15-18',
          language: 'Kannada',
          fundedBy: 'ABC Foundation',
          certificateProvided: true
        }
      })
    });
    const attrs = res.data?.data?.program?.customAttributes;
    const correct =
      attrs?.targetAgeGroup === '15-18' &&
      attrs?.language === 'Kannada' &&
      attrs?.fundedBy === 'ABC Foundation';
    record(30, 'Custom attributes stored and returned safely', res.status === 201 && correct, `Custom attributes verified`);
  } catch (err) {
    record(30, 'Custom attributes stored and returned safely', false, err.message);
  }

  // 31. Passwords are never exposed
  try {
    const res = await apiRequest(`${BASE_URL}/programs/${createdProgram1Id}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const p = res.data?.data?.program;
    const coordPass = p?.coordinator?.password;
    const staffPass = p?.assignedStaff?.[0]?.password;
    const volPass = p?.assignedVolunteers?.[0]?.password;
    const safe = !coordPass && !staffPass && !volPass;
    record(31, 'Passwords are never exposed', res.status === 200 && safe, 'No password field in populated users');
  } catch (err) {
    record(31, 'Passwords are never exposed', false, err.message);
  }

  // 32. Existing authentication still works
  try {
    const res = await apiRequest(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    record(32, 'Existing authentication still works', res.status === 200 && res.data?.data?.user?.email === config.ADMIN_EMAIL, 'Verified /auth/me');
  } catch (err) {
    record(32, 'Existing authentication still works', false, err.message);
  }

  await teardownTestEnvironment();

  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = total - passed;

  console.log('\n================================================================');
  if (failed === 0) {
    console.log(`TEST SUITE RESULT: ALL ${passed}/${total} PHASE 3C TESTS PASSED SUCCESSFULLY! ✅`);
  } else {
    console.log(`TEST SUITE RESULT: ${failed}/${total} TESTS FAILED ❌`);
  }
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
};

runTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});

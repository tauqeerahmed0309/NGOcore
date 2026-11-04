const mongoose = require('mongoose');
const config = require('../config/env');
const { connectDB } = require('../config/db');
const { apiRequest } = require('./apiTestClient');
const { setupTestEnvironment, teardownTestEnvironment } = require('./testHelper');
const Student = require('../models/Student');
const Program = require('../models/Program');
const User = require('../models/User');

const BASE_URL = `http://localhost:${config.PORT}/api/v1`;

let totalTests = 0;
let passedTests = 0;

function assert(condition, testName, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`✅ Test ${totalTests.toString().padStart(2, ' ')}: ${testName} -> PASSED ${details ? `(${details})` : ''}`);
  } else {
    console.error(`❌ Test ${totalTests.toString().padStart(2, ' ')}: ${testName} -> FAILED ${details ? `(${details})` : ''}`);
  }
}

async function runFormWorkflowTests() {
  console.log('\n================================================================');
  console.log('   RUNNING STUDENT & PROGRAM FORMS END-TO-END VERIFICATION      ');
  console.log('================================================================\n');

  await setupTestEnvironment();

  // Login as admin
  const loginRes = await apiRequest(`${BASE_URL}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({
      email: config.ADMIN_EMAIL,
      password: config.ADMIN_PASSWORD
    })
  });

  assert(loginRes.status === 200, 'Admin login succeeded', `status: ${loginRes.status}`);
  const adminToken = loginRes.accessToken;

  const testSuffix = Date.now().toString().slice(-6);

  // -------------------------------------------------------------
  // PART 1: STUDENT CREATION WORKFLOWS
  // -------------------------------------------------------------
  console.log('\n▶ [Part 1: Student Creation Workflows]');

  // 1. Create student with ONLY required fields
  const minStudentReg = `STU-MIN-${testSuffix}`;
  const minStudentRes = await apiRequest(`${BASE_URL}/students`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      registrationNumber: minStudentReg,
      firstName: 'Anaya',
      lastName: 'Patel'
    })
  });

  assert(minStudentRes.status === 201, 'Create student with only required fields returns HTTP 201', `status: ${minStudentRes.status}`);
  const createdMinStudent = await Student.findOne({ registrationNumber: minStudentReg }).lean();
  assert(!!createdMinStudent, 'Minimal student persisted to MongoDB Atlas', `id: ${createdMinStudent?._id}`);
  assert(createdMinStudent?.firstName === 'Anaya' && createdMinStudent?.lastName === 'Patel', 'Minimal student names saved correctly');
  assert(!!createdMinStudent?.ngoId, 'Minimal student has correct ngoId tenant isolation', `ngoId: ${createdMinStudent?.ngoId}`);
  assert(createdMinStudent?.status === 'active', 'Default status is active');

  // 2. Create student with ALL fields populated
  const fullStudentReg = `STU-FULL-${testSuffix}`;
  const fullStudentPayload = {
    registrationNumber: fullStudentReg,
    firstName: 'Devendra',
    lastName: 'Singhania',
    dateOfBirth: '2005-08-15',
    gender: 'male',
    email: `devendra.${testSuffix}@example.org`,
    phone: '+91 98765 43210',
    address: '42 MG Road, Indiranagar',
    pinCode: '560038',
    state: 'Karnataka',
    guardianName: 'Vikram Singhania',
    guardianRelationship: 'Father',
    educationLevel: 'Higher Secondary',
    schoolName: 'St. Joseph Academy',
    status: 'active',
    notes: 'Excels in science and mathematics workshops.'
  };

  const fullStudentRes = await apiRequest(`${BASE_URL}/students`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify(fullStudentPayload)
  });

  assert(fullStudentRes.status === 201, 'Create student with all fields populated returns HTTP 201', `status: ${fullStudentRes.status}`);
  const createdFullStudent = await Student.findOne({ registrationNumber: fullStudentReg }).lean();
  assert(!!createdFullStudent, 'Full student persisted to MongoDB Atlas');
  assert(createdFullStudent?.phone === '+91 98765 43210', 'Phone number normalized and persisted', `phone: ${createdFullStudent?.phone}`);
  assert(createdFullStudent?.pinCode === '560038', 'PIN code persisted', `pinCode: ${createdFullStudent?.pinCode}`);
  assert(createdFullStudent?.state === 'Karnataka', 'State persisted', `state: ${createdFullStudent?.state}`);
  assert(createdFullStudent?.address === '42 MG Road, Indiranagar', 'Address persisted');
  assert(createdFullStudent?.guardianName === 'Vikram Singhania', 'Guardian name persisted');
  assert(createdFullStudent?.schoolName === 'St. Joseph Academy', 'School name persisted');

  // 3. Validation rejection for invalid email
  const badEmailRes = await apiRequest(`${BASE_URL}/students`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      registrationNumber: `STU-BAD-EMAIL-${testSuffix}`,
      firstName: 'Test',
      lastName: 'User',
      email: 'not-an-email-address'
    })
  });
  assert(badEmailRes.status === 400, 'Student creation rejects malformed email with HTTP 400', `status: ${badEmailRes.status}`);

  // 4. Validation rejection for invalid phone
  const badPhoneRes = await apiRequest(`${BASE_URL}/students`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      registrationNumber: `STU-BAD-PHONE-${testSuffix}`,
      firstName: 'Test',
      lastName: 'User',
      phone: '12345'
    })
  });
  assert(badPhoneRes.status === 400, 'Student creation rejects invalid phone number with HTTP 400', `status: ${badPhoneRes.status}`);

  // 5. Validation rejection for invalid PIN code
  const badPinRes = await apiRequest(`${BASE_URL}/students`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      registrationNumber: `STU-BAD-PIN-${testSuffix}`,
      firstName: 'Test',
      lastName: 'User',
      pinCode: '000123'
    })
  });
  assert(badPinRes.status === 400, 'Student creation rejects invalid PIN code with HTTP 400', `status: ${badPinRes.status}`);

  // 6. Update student preserves and modifies fields accurately
  const updateRes = await apiRequest(`${BASE_URL}/students/${createdMinStudent._id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      address: '77 Residency Road',
      state: 'Karnataka',
      pinCode: '560025'
    })
  });
  assert(updateRes.status === 200, 'Student update returns HTTP 200', `status: ${updateRes.status}`);
  const updatedStudent = await Student.findById(createdMinStudent._id).lean();
  assert(updatedStudent?.address === '77 Residency Road', 'Updated address saved');
  assert(updatedStudent?.firstName === 'Anaya', 'Unchanged first name preserved');

  // -------------------------------------------------------------
  // PART 2: PROGRAM CREATION WORKFLOWS
  // -------------------------------------------------------------
  console.log('\n▶ [Part 2: Program Creation Workflows]');

  // 7. Create program with ONLY required fields
  const minProgCode = `PRG-MIN-${testSuffix}`;
  const minProgRes = await apiRequest(`${BASE_URL}/programs`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      name: 'Youth Leadership Workshop',
      code: minProgCode,
      type: 'workshop'
    })
  });

  assert(minProgRes.status === 201, 'Create program with only required fields returns HTTP 201', `status: ${minProgRes.status}`);
  const createdMinProgram = await Program.findOne({ code: minProgCode }).lean();
  assert(!!createdMinProgram, 'Minimal program persisted to MongoDB Atlas', `id: ${createdMinProgram?._id}`);
  assert(createdMinProgram?.name === 'Youth Leadership Workshop', 'Program name saved correctly');
  assert(createdMinProgram?.type === 'workshop', 'Program type saved correctly');
  assert(!!createdMinProgram?.ngoId, 'Program has correct ngoId tenant isolation', `ngoId: ${createdMinProgram?.ngoId}`);
  assert(createdMinProgram?.status === 'active', 'Default status is active');

  // 8. Create program with ALL fields populated
  const fullProgCode = `PRG-FULL-${testSuffix}`;
  const fullProgPayload = {
    name: 'Advanced Web Development Academy',
    code: fullProgCode,
    type: 'course',
    category: 'Skill Development',
    description: 'Comprehensive 12-week course covering HTML, CSS, JavaScript, and React.',
    startDate: '2026-03-01',
    endDate: '2026-05-31',
    schedule: {
      days: ['monday', 'wednesday', 'friday'],
      startTime: '16:00',
      endTime: '18:00',
      frequency: 'weekly'
    },
    location: 'Computer Lab A, Community Tech Center',
    capacity: 30,
    status: 'active',
    customAttributes: {
      'Target Age': '16-24',
      'Certificate': 'Yes',
      'Prerequisites': 'Basic computer familiarity'
    }
  };

  const fullProgRes = await apiRequest(`${BASE_URL}/programs`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify(fullProgPayload)
  });

  assert(fullProgRes.status === 201, 'Create program with all fields returns HTTP 201', `status: ${fullProgRes.status}`);
  const createdFullProgram = await Program.findOne({ code: fullProgCode }).lean();
  assert(!!createdFullProgram, 'Full program persisted to MongoDB Atlas');
  assert(createdFullProgram?.category === 'Skill Development', 'Category persisted', `category: ${createdFullProgram?.category}`);
  assert(createdFullProgram?.capacity === 30, 'Capacity persisted as integer 30', `capacity: ${createdFullProgram?.capacity}`);
  assert(createdFullProgram?.schedule?.frequency === 'weekly', 'Schedule frequency persisted');
  assert(Array.isArray(createdFullProgram?.schedule?.days) && createdFullProgram.schedule.days.length === 3, 'Scheduled days array persisted');
  assert(createdFullProgram?.customAttributes?.['Target Age'] === '16-24', 'Custom attributes persisted');

  // 9. Validation rejection when endDate < startDate
  const badDateRes = await apiRequest(`${BASE_URL}/programs`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      name: 'Invalid Date Program',
      code: `PRG-BADDATE-${testSuffix}`,
      type: 'workshop',
      startDate: '2026-06-01',
      endDate: '2026-05-01'
    })
  });
  assert(badDateRes.status === 400, 'Program rejects endDate earlier than startDate with HTTP 400', `status: ${badDateRes.status}`);

  // 10. Validation rejection for negative or zero capacity
  const badCapRes = await apiRequest(`${BASE_URL}/programs`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      name: 'Invalid Capacity Program',
      code: `PRG-BADCAP-${testSuffix}`,
      type: 'workshop',
      capacity: -5
    })
  });
  assert(badCapRes.status === 400, 'Program rejects negative capacity with HTTP 400', `status: ${badCapRes.status}`);

  // 11. Update program preserves existing attributes
  const updateProgRes = await apiRequest(`${BASE_URL}/programs/${createdMinProgram._id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      description: 'Updated workshop description for leadership training',
      capacity: 40
    })
  });
  assert(updateProgRes.status === 200, 'Program update returns HTTP 200', `status: ${updateProgRes.status}`);
  const updatedProg = await Program.findById(createdMinProgram._id).lean();
  assert(updatedProg?.capacity === 40, 'Updated capacity saved', `capacity: ${updatedProg?.capacity}`);
  assert(updatedProg?.name === 'Youth Leadership Workshop', 'Original program name preserved');

  // Cleanup test artifacts
  await Student.deleteMany({ registrationNumber: { $in: [minStudentReg, fullStudentReg] } });
  await Program.deleteMany({ code: { $in: [minProgCode, fullProgCode] } });

  console.log('\n================================================================');
  console.log(`WORKFLOW TEST RESULT: ${passedTests} / ${totalTests} TESTS PASSED! ✅`);
  console.log('================================================================\n');

  await teardownTestEnvironment();
  process.exit(passedTests === totalTests ? 0 : 1);
}

runFormWorkflowTests().catch(async (err) => {
  console.error('Test execution failed with fatal error:', err);
  await teardownTestEnvironment();
  process.exit(1);
});


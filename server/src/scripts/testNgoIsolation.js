const mongoose = require('mongoose');
const config = require('../config/env');
const Ngo = require('../models/Ngo');
const User = require('../models/User');
const Student = require('../models/Student');
const Program = require('../models/Program');
const { hashPassword } = require('../utils/passwordHelper');
const { apiRequest } = require('./apiTestClient');
const { setupTestEnvironment, teardownTestEnvironment } = require('./testHelper');

const BASE_URL = `http://localhost:${config.PORT}/api/v1`;
const createdNgoIds = [];
const createdUserIds = [];
const createdStudentIds = [];
const createdProgramIds = [];

const assertStatus = (response, status, label) => {
  if (response.status !== status) {
    throw new Error(`${label}: expected HTTP ${status}, received ${response.status} (${response.data?.message || 'no message'})`);
  }
};

const runTests = async () => {
  await setupTestEnvironment();
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  try {
    const ngoA = await Ngo.create({ name: `Isolation NGO A ${suffix}`, status: 'approved' });
    const ngoB = await Ngo.create({ name: `Isolation NGO B ${suffix}`, status: 'approved' });
    createdNgoIds.push(ngoA._id, ngoB._id);

    const password = await hashPassword('IsolationTestPass123!');
    const userA = await User.create({
      ngoId: ngoA._id,
      email: `isolation-a-${suffix}@example.org`,
      password,
      role: 'admin',
      firstName: 'Isolation',
      lastName: 'Admin A'
    });
    const userB = await User.create({
      ngoId: ngoB._id,
      email: `isolation-b-${suffix}@example.org`,
      password,
      role: 'admin',
      firstName: 'Isolation',
      lastName: 'Admin B'
    });
    createdUserIds.push(userA._id, userB._id);

    const studentB = await Student.create({
      ngoId: ngoB._id,
      registrationNumber: `ISOLATION-ST-${suffix}`,
      firstName: 'Foreign',
      lastName: 'Student'
    });
    const programB = await Program.create({
      ngoId: ngoB._id,
      code: `ISOLATION-PG-${suffix}`,
      name: 'Foreign program',
      type: 'education'
    });
    createdStudentIds.push(studentB._id);
    createdProgramIds.push(programB._id);

    const login = await apiRequest(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: userA.email, password: 'IsolationTestPass123!' })
    });
    assertStatus(login, 200, 'NGO A login');
    if (!login.accessToken) throw new Error('Login did not issue an access cookie.');
    const authHeaders = { Authorization: `Bearer ${login.accessToken}` };

    const cases = [
      ['student read', 'GET', `/students/${studentB._id}`, undefined],
      ['student update', 'PUT', `/students/${studentB._id}`, { firstName: 'Tampered' }],
      ['student status update', 'PATCH', `/students/${studentB._id}/status`, { status: 'graduated' }],
      ['student delete route', 'DELETE', `/students/${studentB._id}`, undefined],
      ['program read', 'GET', `/programs/${programB._id}`, undefined],
      ['program update', 'PUT', `/programs/${programB._id}`, { name: 'Tampered program' }],
      ['program status update', 'PATCH', `/programs/${programB._id}/status`, { status: 'paused' }],
      ['program delete route', 'DELETE', `/programs/${programB._id}`, undefined],
      ['user read', 'GET', `/users/${userB._id}`, undefined],
      ['user update', 'PUT', `/users/${userB._id}`, {
        firstName: 'Tampered',
        lastName: 'User',
        email: userB.email,
        role: 'staff'
      }],
      ['user status update', 'PATCH', `/users/${userB._id}/status`, { isActive: false }],
      ['user delete route', 'DELETE', `/users/${userB._id}`, undefined]
    ];

    for (const [label, method, path, body] of cases) {
      const response = await apiRequest(`${BASE_URL}${path}`, {
        method,
        headers: authHeaders,
        ...(body ? { body: JSON.stringify(body) } : {})
      });
      assertStatus(response, 404, `${label} isolation`);
      console.log(`PASS ${label}: NGO B data unavailable to NGO A (404)`);
    }

    for (const resource of ['students', 'programs', 'users']) {
      const response = await apiRequest(`${BASE_URL}/${resource}?ngoId=${ngoB._id}`, {
        headers: authHeaders
      });
      assertStatus(response, 200, `${resource} list query-string isolation`);
      const records = response.data?.data?.[resource] || [];
      if (records.some((record) => record.ngoId.toString() !== ngoA._id.toString())) {
        throw new Error(`${resource} list returned a record from a different organization.`);
      }
    }
    console.log('PASS list queries ignore client-supplied ngoId and return only the authenticated organization.');

    const forgedProgram = await apiRequest(`${BASE_URL}/programs`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        ngoId: ngoB._id,
        code: `ISOLATION-INJ-${suffix}`,
        name: 'Organization-scope injection attempt',
        type: 'education'
      })
    });
    assertStatus(forgedProgram, 201, 'program scope injection test');
    const createdProgramId = forgedProgram.data?.data?.program?._id;
    const createdProgram = await Program.findById(createdProgramId);
    if (!createdProgram || createdProgram.ngoId.toString() !== ngoA._id.toString()) {
      throw new Error('Client-supplied ngoId assigned a created program to another organization.');
    }
    createdProgramIds.push(createdProgram._id);
    console.log('PASS create payload cannot assign a program outside the authenticated organization.');

    const [studentBAfter, programBAfter, userBAfter] = await Promise.all([
      Student.findById(studentB._id),
      Program.findById(programB._id),
      User.findById(userB._id)
    ]);
    if (studentBAfter.firstName !== 'Foreign' || programBAfter.name !== 'Foreign program' ||
        userBAfter.firstName !== 'Isolation') {
      throw new Error('Cross-organization update changed a foreign record.');
    }
    console.log('PASS cross-organization records remained unchanged after attempted updates.');
  } finally {
    await Promise.all([
      Student.deleteMany({ _id: { $in: createdStudentIds } }),
      Program.deleteMany({ _id: { $in: createdProgramIds } }),
      User.deleteMany({ _id: { $in: createdUserIds } }),
      Ngo.deleteMany({ _id: { $in: createdNgoIds } })
    ]);
    await teardownTestEnvironment();
  }
};

runTests().catch((error) => {
  console.error(`NGO isolation tests failed: ${error.message}`);
  process.exitCode = 1;
});

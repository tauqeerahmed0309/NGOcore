const mongoose = require('mongoose');
const config = require('../config/env');
const app = require('../app');
const AuditLog = require('../models/AuditLog');
const Ngo = require('../models/Ngo');
const Program = require('../models/Program');
const Student = require('../models/Student');
const User = require('../models/User');
const { hashPassword } = require('../utils/passwordHelper');
const aiSummaryService = require('../services/aiSummaryService');
const { apiRequest } = require('./apiTestClient');

const email = `assistant-test-${Date.now()}@example.org`;
const password = 'AssistantTest123!';
let baseUrl;
let passed = 0;

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
  passed += 1;
};

const request = (path, token, body, method = 'POST') => apiRequest(`${baseUrl}${path}`, {
  method,
  headers: token ? { Authorization: `Bearer ${token}` } : {},
  ...(body === undefined ? {} : { body: JSON.stringify(body) })
});

const runTests = async () => {
  let server;
  let ngoA;
  let ngoB;
  let user;
  let studentIds = [];
  let programIds = [];
  const mongoUri = (config.MONGODB_URI && !config.MONGODB_URI.startsWith('mongodb+srv://'))
    ? config.MONGODB_URI
    : 'mongodb://127.0.0.1:27017/ngo_records_db';
  await mongoose.connect(mongoUri);
  config.ANTHROPIC_API_KEY = '';

  try {
    ngoA = await Ngo.create({
      name: `Assistant tenant A ${Date.now()}`,
      status: 'approved',
      approvalSubmitted: true
    });
    ngoB = await Ngo.create({
      name: `Assistant tenant B ${Date.now()}`,
      status: 'approved',
      approvalSubmitted: true
    });
    user = await User.create({
      ngoId: ngoA._id,
      email,
      password: await hashPassword(password),
      role: 'ngo_admin',
      firstName: 'Assistant',
      lastName: 'Tester'
    });

    const stamp = new Date();
    const studentIdOne = new mongoose.Types.ObjectId();
    const studentIdTwo = new mongoose.Types.ObjectId();
    const studentIdThree = new mongoose.Types.ObjectId();
    const studentIdOtherTenant = new mongoose.Types.ObjectId();
    studentIds = [studentIdOne, studentIdTwo, studentIdThree, studentIdOtherTenant];
    await Student.collection.insertMany([
      {
        _id: studentIdOne,
        ngoId: ngoA._id,
        registrationNumber: ' st-001 ',
        firstName: ' Alice ',
        lastName: 'Smith ',
        email: 'ALICE@EXAMPLE.ORG ',
        status: 'active',
        createdAt: stamp,
        updatedAt: stamp
      },
      {
        _id: studentIdTwo,
        ngoId: ngoA._id,
        registrationNumber: 'ST-002',
        firstName: 'Alice',
        lastName: 'Smith',
        email: 'alice@example.org',
        status: 'active',
        createdAt: stamp,
        updatedAt: stamp
      },
      {
        _id: studentIdThree,
        ngoId: ngoA._id,
        registrationNumber: 'ST-003',
        firstName: '',
        lastName: 'Jones',
        email: '',
        status: 'active',
        createdAt: stamp,
        updatedAt: stamp
      },
      {
        _id: studentIdOtherTenant,
        ngoId: ngoB._id,
        registrationNumber: 'ST-B-001',
        firstName: 'Alice',
        lastName: 'Smith',
        email: 'alice@example.org',
        status: 'active',
        createdAt: stamp,
        updatedAt: stamp
      }
    ]);

    const programIdOne = new mongoose.Types.ObjectId();
    const programIdTwo = new mongoose.Types.ObjectId();
    const programIdOtherTenant = new mongoose.Types.ObjectId();
    programIds = [programIdOne, programIdTwo, programIdOtherTenant];
    await Program.collection.insertMany([
      {
        _id: programIdOne,
        ngoId: ngoA._id,
        name: '  Literacy Club  ',
        code: ' l-01 ',
        type: 'EDUCATION',
        status: 'active',
        startDate: new Date('2026-05-01T00:00:00.000Z'),
        endDate: new Date('2026-04-01T00:00:00.000Z'),
        createdAt: stamp,
        updatedAt: stamp
      },
      {
        _id: programIdTwo,
        ngoId: ngoA._id,
        name: 'Literacy Club',
        code: 'L-02',
        type: 'education',
        status: 'active',
        createdAt: stamp,
        updatedAt: stamp
      },
      {
        _id: programIdOtherTenant,
        ngoId: ngoB._id,
        name: 'Literacy Club',
        code: 'LB-01',
        type: 'education',
        status: 'active',
        createdAt: stamp,
        updatedAt: stamp
      }
    ]);

    server = app.listen(0, '127.0.0.1');
    await new Promise((resolve, reject) => {
      server.once('listening', resolve);
      server.once('error', reject);
    });
    baseUrl = `http://127.0.0.1:${server.address().port}/api/v1`;
    const login = await apiRequest(`${baseUrl}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    assert(login.status === 200 && login.accessToken, 'An approved organization admin must be able to authenticate.');

    const studentReview = await request('/assistant/clean/students', login.accessToken, { ngoId: ngoB._id });
    const studentFlags = studentReview.data?.data?.flags || [];
    assert(studentReview.status === 200, 'Student cleaning analysis should succeed.');
    assert(studentReview.data?.data?.scanned === 3, 'Student analysis should scan only the authenticated NGO records.');
    assert(studentFlags.some((flag) => flag.type === 'possible_duplicate' && flag.recordId === String(studentIdOne)), 'Student duplicate detection should identify matching names and email addresses.');
    assert(studentFlags.some((flag) => flag.type === 'missing_required' && flag.field === 'firstName'), 'Missing required student fields should be flagged.');
    assert(studentFlags.some((flag) => flag.type === 'inconsistent_format' && flag.field === 'registrationNumber'), 'Student identifier format issues should be flagged.');
    assert(!JSON.stringify(studentFlags).includes(String(studentIdOtherTenant)), 'Another NGO student must not appear in cleaning flags.');
    const originalStudent = await Student.collection.findOne({ _id: studentIdOne });
    assert(originalStudent.registrationNumber === ' st-001 ', 'Analysis alone must never change a record.');

    const registrationFlag = studentFlags.find((flag) => flag.recordId === String(studentIdOne) && flag.field === 'registrationNumber');
    const normalized = await request('/assistant/clean/students/review', login.accessToken, {
      recordId: registrationFlag.recordId,
      issueType: registrationFlag.type,
      field: registrationFlag.field,
      decision: 'accept'
    });
    assert(normalized.status === 200 && normalized.data?.data?.applied, 'Explicitly accepting a suggested normalization should apply only that field.');
    const normalizedStudent = await Student.collection.findOne({ _id: studentIdOne });
    assert(normalizedStudent.registrationNumber === 'ST-001', 'Accepted registration normalization should be persisted.');

    const missingNameFlag = studentFlags.find((flag) => flag.recordId === String(studentIdThree) && flag.type === 'missing_required' && flag.field === 'firstName');
    const correctedName = await request('/assistant/clean/students/review', login.accessToken, {
      recordId: studentIdThree.toString(),
      issueType: 'missing_required',
      field: 'firstName',
      decision: 'accept',
      proposedValue: 'Jordan'
    });
    assert(correctedName.status === 200 && missingNameFlag, 'A reviewer-supplied correction should be accepted for a missing field.');
    assert((await Student.collection.findOne({ _id: studentIdThree })).firstName === 'Jordan', 'Reviewer-supplied values should be saved after explicit acceptance.');

    const duplicateFlag = studentFlags.find((flag) => flag.type === 'possible_duplicate');
    const duplicateCountBefore = await Student.countDocuments({ ngoId: ngoA._id });
    const duplicateDecision = await request('/assistant/clean/students/review', login.accessToken, {
      recordId: duplicateFlag.recordId,
      relatedRecordId: duplicateFlag.relatedRecordId,
      issueType: 'possible_duplicate',
      decision: 'accept'
    });
    assert(duplicateDecision.status === 200 && !duplicateDecision.data?.data?.applied, 'Confirming a possible duplicate must not merge or delete records.');
    assert(await Student.countDocuments({ ngoId: ngoA._id }) === duplicateCountBefore, 'Duplicate review must leave all records intact.');
    console.log('PASS NGO-scoped student cleaning flags, explicit single-field fixes, and non-destructive duplicate review.');

    const programReview = await request('/assistant/clean/programs', login.accessToken, {});
    const programFlags = programReview.data?.data?.flags || [];
    assert(programReview.status === 200 && programReview.data?.data?.scanned === 2, 'Program analysis should be scoped to the authenticated NGO.');
    assert(programFlags.some((flag) => flag.type === 'possible_duplicate'), 'Fuzzy program duplicate matches should be identified.');
    assert(programFlags.some((flag) => flag.field === 'code' && flag.suggestedValue === 'L-01'), 'Program code normalization should be suggested safely.');
    assert(programFlags.some((flag) => flag.field === 'endDate' && flag.suggestedValue === null), 'Inconsistent program date ranges should require manual review.');
    assert(!JSON.stringify(programFlags).includes(String(programIdOtherTenant)), 'Another NGO program must not appear in cleaning flags.');
    console.log('PASS program data cleaning detects duplicate candidates, safe formatting suggestions, and inconsistent dates.');

    const insightResponse = await request('/assistant/insights/students', login.accessToken, undefined, 'GET');
    const insightData = insightResponse.data?.data;
    assert(insightResponse.status === 200, 'Aggregated student insights should be available.');
    assert(insightData?.metrics?.totalRecords === 3, 'Insight counts must include only the authenticated NGO.');
    assert(insightData?.metrics?.timeline.length === 6, 'Insight trends should return six monthly aggregates.');
    assert(insightData?.summary === null && insightData?.summaryUnavailable, 'Missing Anthropic configuration should return chart metrics without a summary.');
    assert(!JSON.stringify(insightData).includes('alice@example.org'), 'Insight responses must contain aggregated metrics, not raw records.');
    console.log('PASS insight endpoint returns tenant-scoped aggregate-only trends and degrades gracefully without an AI key.');

    const programInsights = await request('/assistant/insights/programs', login.accessToken, undefined, 'GET');
    assert(programInsights.status === 200 && programInsights.data?.data?.metrics?.totalRecords === 2, 'Program insights should aggregate only the authenticated NGO program records.');

    let capturedPrompt = '';
    let shouldFail = true;
    config.ANTHROPIC_API_KEY = 'test-only-key';
    aiSummaryService.setClientForTesting({
      messages: {
        async create(requestBody) {
          capturedPrompt = requestBody.messages[0].content;
          if (shouldFail) throw new Error('Synthetic Anthropic failure for integration test.');
          return { content: [{ type: 'text', text: 'Student records increased in the latest month.' }] };
        }
      }
    });
    const failedSummary = await request('/assistant/insights/students', login.accessToken, undefined, 'GET');
    assert(failedSummary.status === 200 && failedSummary.data?.data?.summaryUnavailable, 'An Anthropic API failure must preserve the metrics response and omit the summary.');
    assert(!capturedPrompt.includes(email), 'The Anthropic request must not contain raw student details.');
    shouldFail = false;
    const successfulSummary = await request('/assistant/insights/students', login.accessToken, undefined, 'GET');
    assert(successfulSummary.status === 200 && successfulSummary.data?.data?.summary === 'Student records increased in the latest month.', 'Successful AI summaries should be returned alongside aggregates.');
    console.log('PASS synthetic AI success/failure paths contain aggregate-only input and keep metrics available.');

    const auditCount = await AuditLog.countDocuments({ ngoId: ngoA._id, entityType: 'data_cleaning_review' });
    assert(auditCount >= 3, 'Per-item review decisions should be written to the append-only audit collection.');
    console.log(`PASS ${passed} data assistant integration checks.`);
  } finally {
    if (server) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    if (user) {
      await AuditLog.deleteMany({ actorId: user._id });
      await User.deleteOne({ _id: user._id });
    }
    if (studentIds.length) await Student.deleteMany({ _id: { $in: studentIds } });
    if (programIds.length) await Program.deleteMany({ _id: { $in: programIds } });
    if (ngoA) {
      await AuditLog.deleteMany({ ngoId: ngoA._id });
      await Ngo.deleteOne({ _id: ngoA._id });
    }
    if (ngoB) await Ngo.deleteOne({ _id: ngoB._id });
    await mongoose.disconnect();
  }
};

runTests().catch((error) => {
  console.error(`Data assistant tests failed: ${error.message}`);
  process.exitCode = 1;
});

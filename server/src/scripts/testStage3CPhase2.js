const mongoose = require('mongoose');
const http = require('http');
const config = require('../config/env');
const app = require('../app');
const geminiService = require('../services/geminiService');
const dataAssistantService = require('../services/dataAssistantService');
const dataQualityService = require('../services/dataQualityService');
const Ngo = require('../models/Ngo');
const User = require('../models/User');
const Student = require('../models/Student');
const Program = require('../models/Program');
const AuditLog = require('../models/AuditLog');
const { hashPassword } = require('../utils/passwordHelper');
const { apiRequest } = require('./apiTestClient');

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
  console.log('   RUNNING STAGE 3C PHASE 2: DATA QUALITY INTELLIGENCE BACKEND   ');
  console.log('================================================================\n');

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(config.MONGODB_URI);
  }

  // ============================================================================
  // SECTION 1: Deterministic Data Quality Index (DQI) Unit Tests
  // ============================================================================
  console.log('▶ [1. Deterministic DQI Engine Unit Tests]');

  const {
    calculateRecordDQI,
    calculateDatasetDQI,
    classifyRating,
    getDqiMethodology,
    DQI_WEIGHTS
  } = dataQualityService;

  // Test 1: Methodology definition
  const methodology = getDqiMethodology();
  assert(methodology.weights.completeness === 35, 'Completeness weight is 35%');
  assert(methodology.weights.validity === 35, 'Validity weight is 35%');
  assert(methodology.weights.standardization === 15, 'Standardization weight is 15%');
  assert(methodology.weights.uniqueness === 15, 'Uniqueness weight is 15%');

  // Test 2: Rating classification
  assert(classifyRating(100) === 'Excellent', '100 classified as Excellent');
  assert(classifyRating(92.5) === 'Excellent', '92.5 classified as Excellent');
  assert(classifyRating(85) === 'Good', '85 classified as Good');
  assert(classifyRating(75) === 'Good', '75 boundary classified as Good');
  assert(classifyRating(60) === 'Fair', '60 classified as Fair');
  assert(classifyRating(50) === 'Fair', '50 boundary classified as Fair');
  assert(classifyRating(45) === 'Poor', '45 classified as Poor');
  assert(classifyRating(0) === 'Poor', '0 boundary classified as Poor');

  // Test 3: Determinism: Same record and findings yield identical score across multiple runs
  const sampleRecord = {
    _id: '507f191e810c19729de860ea',
    registrationNumber: 'REG101',
    firstName: 'Aarav',
    lastName: 'Patel',
    phone: '9876543210',
    email: 'aarav@example.org'
  };
  const sampleFlags = dataAssistantService.buildRecordFlags('students', sampleRecord);
  const evalRun1 = calculateRecordDQI('students', sampleRecord, sampleFlags);
  const evalRun2 = calculateRecordDQI('students', sampleRecord, sampleFlags);
  const evalRun3 = calculateRecordDQI('students', sampleRecord, sampleFlags);

  assert(
    evalRun1.score === evalRun2.score && evalRun2.score === evalRun3.score,
    'Deterministic scoring: 3 consecutive evaluations yield identical score'
  );
  assert(
    JSON.stringify(evalRun1.dimensions) === JSON.stringify(evalRun2.dimensions),
    'Deterministic scoring: Dimension scores are strictly identical'
  );

  // Test 4: Score boundaries [0, 100]
  const cleanStudent = {
    _id: '507f191e810c19729de860eb',
    registrationNumber: 'REG201',
    firstName: 'Karan',
    lastName: 'Sharma',
    phone: '+91 98765 43210',
    email: 'karan@example.org',
    pinCode: '560001',
    state: 'Karnataka'
  };
  const cleanFlags = dataAssistantService.buildRecordFlags('students', cleanStudent);
  const cleanEval = calculateRecordDQI('students', cleanStudent, cleanFlags);
  assert(cleanEval.score === 100, 'Clean record achieves maximum DQI score of 100');
  assert(cleanEval.rating === 'Excellent', 'Clean record classified as Excellent');
  assert(cleanEval.deductions.length === 0, 'Clean record has 0 deductions');

  // Test 5: Missing optional fields do NOT penalize DQI score
  const sparseStudent = {
    _id: '507f191e810c19729de860ec',
    registrationNumber: 'REG301',
    firstName: 'Meera',
    lastName: 'Nair',
    // All optional fields empty/unprovided
    email: '',
    phone: '',
    pinCode: '',
    state: '',
    address: '',
    dateOfBirth: null,
    guardianName: '',
    notes: ''
  };
  const sparseFlags = dataAssistantService.buildRecordFlags('students', sparseStudent);
  const sparseEval = calculateRecordDQI('students', sparseStudent, sparseFlags);
  assert(
    sparseEval.score === 100,
    'Missing legitimately optional fields do NOT reduce DQI score (score = 100)'
  );
  assert(
    sparseEval.dimensions.completeness.score === 100,
    'Completeness remains 100% when all mandatory fields are present'
  );
  assert(
    sparseEval.metrics.optionalFieldsProvidedRate === 0,
    'Optional fill rate is tracked accurately as 0% without penalizing score'
  );

  // Test 6: Missing mandatory fields drop Completeness proportionally
  const missingMandatoryStudent = {
    _id: '507f191e810c19729de860ed',
    registrationNumber: '', // missing mandatory
    firstName: 'Pooja',
    lastName: '', // missing mandatory
    phone: '+91 98765 43210'
  };
  const missingFlags = dataAssistantService.buildRecordFlags('students', missingMandatoryStudent);
  const missingEval = calculateRecordDQI('students', missingMandatoryStudent, missingFlags);
  assert(
    missingEval.dimensions.completeness.score < 100,
    'Missing mandatory fields drop Completeness dimension score'
  );
  assert(
    missingEval.deductions.some((d) => d.dimension === 'completeness' && d.field === 'registrationNumber'),
    'Itemized deduction recorded for missing registrationNumber'
  );
  assert(
    missingEval.deductions.some((d) => d.dimension === 'completeness' && d.field === 'lastName'),
    'Itemized deduction recorded for missing lastName'
  );

  // Test 7: Invalid optional field (e.g. invalid phone number) drops Validity, NOT Completeness
  const invalidPhoneStudent = {
    _id: '507f191e810c19729de860ee',
    registrationNumber: 'REG401',
    firstName: 'Rohan',
    lastName: 'Verma',
    phone: '12345' // Invalid 5-digit phone
  };
  const invalidPhoneFlags = dataAssistantService.buildRecordFlags('students', invalidPhoneStudent);
  const invalidPhoneEval = calculateRecordDQI('students', invalidPhoneStudent, invalidPhoneFlags);
  assert(
    invalidPhoneEval.dimensions.completeness.score === 100,
    'Completeness remains 100% because mandatory fields are present'
  );
  assert(
    invalidPhoneEval.dimensions.validity.score < 100,
    'Validity drops due to invalid phone number'
  );
  assert(
    invalidPhoneEval.deductions.some((d) => d.dimension === 'validity' && d.field === 'phone'),
    'Deduction itemized under Validity dimension for invalid phone'
  );

  // Test 8: Duplicate candidate matches are penalized without double-counting
  const dupStudent = {
    _id: '507f191e810c19729de860ef',
    registrationNumber: 'REG501',
    firstName: 'Amit',
    lastName: 'Kumar'
  };
  // Simulate 2 flags pointing to the SAME related record via different passes
  const dupFlags = [
    {
      id: `${dupStudent._id}:possible_duplicate:related123`,
      recordId: dupStudent._id,
      type: 'possible_duplicate',
      relatedRecordId: 'related123',
      severity: 'high',
      score: 0.95,
      description: 'Phonetic match'
    },
    {
      id: `${dupStudent._id}:possible_duplicate:related123:second_pass`,
      recordId: dupStudent._id,
      type: 'possible_duplicate',
      relatedRecordId: 'related123', // Same related entity!
      severity: 'high',
      score: 0.95,
      description: 'Token sort match'
    }
  ];
  const dupEval = calculateRecordDQI('students', dupStudent, dupFlags);
  assert(
    dupEval.metrics.duplicateCandidateCount === 1,
    'Multiple blocking matches for the same duplicate entity pair are deduplicated (count = 1)'
  );
  assert(
    dupEval.deductions.filter((d) => d.dimension === 'uniqueness').length === 1,
    'Uniqueness penalty is applied once per unique matching entity, preventing double-counting'
  );

  // Test 9: Dataset DQI aggregation
  const datasetRecords = [cleanStudent, sparseStudent, invalidPhoneStudent];
  const allDatasetFlags = [
    ...cleanFlags,
    ...sparseFlags,
    ...invalidPhoneFlags
  ];
  const datasetDqi = calculateDatasetDQI('students', datasetRecords, allDatasetFlags);
  assert(datasetDqi.score > 0 && datasetDqi.score <= 100, 'Dataset DQI score is within [0, 100]');
  assert(datasetDqi.metrics.totalRecordsScanned === 3, 'Dataset DQI reports total records scanned');
  assert(datasetDqi.metrics.cleanRecordsCount === 2, 'Dataset DQI identifies 2 clean records');
  assert(datasetDqi.metrics.flaggedRecordsCount === 1, 'Dataset DQI identifies 1 flagged record');
  assert(typeof datasetDqi.summary === 'string' && datasetDqi.summary.length > 10, 'Dataset DQI provides clear executive summary');

  // ============================================================================
  // SECTION 2: AI Proposal Validation & Correction Guardrails
  // ============================================================================
  console.log('\n▶ [2. Correction Proposal Validation & Guardrail Tests]');

  const { validateCorrectionProposal, sanitizeProposedValue } = dataAssistantService;

  // Test 10: Valid proposed values pass validation
  const validPhoneCheck = validateCorrectionProposal('students', 'phone', '9876543210');
  assert(validPhoneCheck.valid === true, 'Valid phone number proposal passes validation');
  assert(validPhoneCheck.sanitizedValue === '+91 98765 43210', 'Normalized phone string returned');

  const validPinCheck = validateCorrectionProposal('students', 'pinCode', '560001');
  assert(validPinCheck.valid === true, 'Valid 6-digit Indian PIN code passes validation');
  assert(validPinCheck.sanitizedValue === '560001', 'Sanitized PIN code returned');

  const validDobCheck = validateCorrectionProposal('students', 'dateOfBirth', '2010-05-15');
  assert(validDobCheck.valid === true, 'Valid ISO Date of Birth passes validation');

  const validNameCheck = validateCorrectionProposal('students', 'firstName', 'aarav');
  assert(validNameCheck.valid === true, 'Valid lowercase name passes validation');
  assert(validNameCheck.sanitizedValue === 'Aarav', 'Name converted to Title Case');

  // Test 11: Rejects forbidden fields
  const forbiddenFieldCheck = validateCorrectionProposal('students', 'role', 'admin');
  assert(forbiddenFieldCheck.valid === false, 'Forbidden field "role" is rejected');
  assert(
    forbiddenFieldCheck.error.includes('cannot be changed'),
    'Error message indicates field is forbidden'
  );

  const passwordFieldCheck = validateCorrectionProposal('students', 'password', 'newSecret123');
  assert(passwordFieldCheck.valid === false, 'Forbidden field "password" is rejected');

  // Test 12: Rejects invalid phone numbers
  const invalidPhone1 = validateCorrectionProposal('students', 'phone', '12345');
  assert(invalidPhone1.valid === false, 'Rejects short phone number');

  const invalidPhone2 = validateCorrectionProposal('students', 'phone', 'abc9876543210');
  assert(invalidPhone2.valid === false, 'Rejects phone with alphabetic characters');

  const invalidPhone3 = validateCorrectionProposal('students', 'phone', '1876543210');
  assert(invalidPhone3.valid === false, 'Rejects invalid Indian phone prefix (starts with 1)');

  // Test 13: Rejects invalid PIN codes
  const invalidPin1 = validateCorrectionProposal('students', 'pinCode', '123');
  assert(invalidPin1.valid === false, 'Rejects short PIN code');

  const invalidPin2 = validateCorrectionProposal('students', 'pinCode', '999999');
  assert(invalidPin2.valid === false, 'Rejects PIN starting with 9');

  const invalidPin3 = validateCorrectionProposal('students', 'pinCode', '012345');
  assert(invalidPin3.valid === false, 'Rejects PIN starting with 0');

  // Test 14: Rejects invalid Date of Birth (future date & implausible age)
  const futureDobCheck = validateCorrectionProposal('students', 'dateOfBirth', '2099-01-01');
  assert(futureDobCheck.valid === false, 'Rejects future Date of Birth');
  assert(futureDobCheck.error.includes('future'), 'Reason cites future date');

  const oldDobCheck = validateCorrectionProposal('students', 'dateOfBirth', '1850-01-01');
  assert(oldDobCheck.valid === false, 'Rejects implausible age (> 100 years)');

  // Test 15: Rejects names with special characters or numbers
  const badNameCheck = validateCorrectionProposal('students', 'firstName', 'Aarav@123');
  assert(badNameCheck.valid === false, 'Rejects name containing numeric or special characters');

  // ============================================================================
  // SECTION 3: HTTP API Integration Tests (RBAC, Guardrails & DQI Endpoints)
  // ============================================================================
  console.log('\n▶ [3. API Endpoints, Audit Metadata & Security Integration Tests]');

  // Start test server
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api/v1`;

  const timestamp = Date.now();
  const ngoA = await Ngo.create({
    name: `Stage3C-Phase2 NGO A ${timestamp}`,
    status: 'approved',
    isActive: true
  });
  const ngoB = await Ngo.create({
    name: `Stage3C-Phase2 NGO B ${timestamp}`,
    status: 'approved',
    isActive: true
  });

  const staffUserA = await User.create({
    firstName: 'StaffA',
    lastName: 'NGOA',
    email: `staff-phase2-a-${timestamp}@example.org`,
    password: await hashPassword('Password123!'),
    role: 'staff',
    ngoId: ngoA._id,
    isActive: true
  });
  const staffUserB = await User.create({
    firstName: 'StaffB',
    lastName: 'NGOB',
    email: `staff-phase2-b-${timestamp}@example.org`,
    password: await hashPassword('Password123!'),
    role: 'staff',
    ngoId: ngoB._id,
    isActive: true
  });

  // Login staff A and staff B
  const loginResA = await apiRequest(`${baseUrl}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ email: staffUserA.email, password: 'Password123!' })
  });
  const tokenA = loginResA.accessToken;

  const loginResB = await apiRequest(`${baseUrl}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ email: staffUserB.email, password: 'Password123!' })
  });
  const tokenB = loginResB.accessToken;

  // Create test students in NGO A
  const studentWithPhoneIssue = await Student.create({
    ngoId: ngoA._id,
    registrationNumber: 'REG-PH-01',
    firstName: 'Dev',
    lastName: 'Patel',
    phone: '9876543210', // Needs formatting -> inconsistent_format
    email: 'dev@example.org',
    status: 'active'
  });
  const studentPhoneId = String(studentWithPhoneIssue._id);

  const studentWithInvalidPin = await Student.create({
    ngoId: ngoA._id,
    registrationNumber: 'REG-PIN-01',
    firstName: 'Anaya',
    lastName: 'Sen',
    pinCode: '012345', // Invalid PIN -> inconsistent_format (high severity)
    email: 'anaya@example.org',
    status: 'active'
  });
  const studentPinId = String(studentWithInvalidPin._id);

  // Setup Mock Gemini Client for AI Proposal tests
  config.GEMINI_ENABLED = true;
  config.GEMINI_API_KEY = 'test-fake-key-for-mock';
  config.GEMINI_PII_MODE = 'disabled';

  let currentMockOutput = JSON.stringify({
    proposedValue: '+91 98765 43210',
    reasoning: 'Formatted phone number to standard Indian mobile notation.',
    confidenceCategory: 'high'
  });

  const mockClient = {
    models: {
      async generateContent() {
        return {
          text: currentMockOutput,
          usageMetadata: { promptTokenCount: 40, candidatesTokenCount: 20, totalTokenCount: 60 }
        };
      }
    }
  };
  geminiService.setClientForTesting(mockClient);

  // Test 16: Proposal endpoint returns validated proposed value
  const proposalRes1 = await apiRequest(`${baseUrl}/assistant/ai/propose-correction`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({
      recordType: 'students',
      recordId: studentPhoneId,
      field: 'phone',
      issueType: 'inconsistent_format'
    })
  });
  assert(proposalRes1.status === 200, 'POST /assistant/ai/propose-correction returns 200');
  assert(proposalRes1.data.data.available === true, 'Proposal reports available=true');
  assert(proposalRes1.data.data.validated === true, 'Proposal reports validated=true');
  assert(proposalRes1.data.data.proposedValue === '+91 98765 43210', 'Proposed value validated and sanitized');

  // Test 17: Proposal endpoint intercepts and rejects invalid AI suggestions
  // Configure mock to return an invalid phone number from AI
  currentMockOutput = JSON.stringify({
    proposedValue: '12345', // Invalid 5-digit number
    reasoning: 'Shortened digits.',
    confidenceCategory: 'medium'
  });

  const invalidProposalRes = await apiRequest(`${baseUrl}/assistant/ai/propose-correction`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({
      recordType: 'students',
      recordId: studentPhoneId,
      field: 'phone',
      issueType: 'inconsistent_format'
    })
  });
  assert(invalidProposalRes.status === 200, 'Endpoint handles invalid AI proposal gracefully with HTTP 200');
  assert(invalidProposalRes.data.data.available === false, 'Invalid AI proposal marked available=false');
  assert(invalidProposalRes.data.data.reason === 'invalid_ai_proposal', 'Reason specifies invalid_ai_proposal');
  assert(
    invalidProposalRes.data.data.error.includes('failed field-level validation rules'),
    'Error details failure of deterministic field rules'
  );

  // Test 18: Zero writes to MongoDB during proposal generation
  const phoneStudentCheck = await Student.findById(studentPhoneId);
  assert(
    phoneStudentCheck.phone === '9876543210',
    'Database document is 100% unchanged after proposal requests (ZERO writes by AI)'
  );

  // Test 19: Dedicated DQI endpoint for dataset: GET /assistant/clean/:recordType/dqi
  const dqiRes = await apiRequest(`${baseUrl}/assistant/clean/students/dqi`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${tokenA}` }
  });
  assert(dqiRes.status === 200, 'GET /assistant/clean/students/dqi returns 200');
  assert(typeof dqiRes.data.data.dqi.score === 'number', 'DQI response includes numeric score');
  assert(dqiRes.data.data.dqi.dimensions.completeness.weight === 35, 'DQI completeness weight is 35%');
  assert(dqiRes.data.data.dqi.dimensions.validity.weight === 35, 'DQI validity weight is 35%');
  assert(dqiRes.data.data.dqi.methodology.name.includes('Deterministic Data Quality Index'), 'Includes methodology metadata');

  // Test 20: Dedicated DQI endpoint for individual record: GET /assistant/clean/:recordType/dqi/:recordId
  const recordDqiRes = await apiRequest(`${baseUrl}/assistant/clean/students/dqi/${studentPhoneId}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${tokenA}` }
  });
  assert(recordDqiRes.status === 200, 'GET /assistant/clean/students/dqi/:recordId returns 200');
  assert(recordDqiRes.data.data.recordId === studentPhoneId, 'Record DQI matches requested record ID');
  assert(typeof recordDqiRes.data.data.dqi.score === 'number', 'Record DQI provides individual score');
  assert(Array.isArray(recordDqiRes.data.data.dqi.deductions), 'Record DQI includes deductions list');

  // Test 21: Full clean analysis endpoint POST /assistant/clean/:recordType includes DQI
  const cleanAnalysisRes = await apiRequest(`${baseUrl}/assistant/clean/students`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` }
  });
  assert(cleanAnalysisRes.status === 200, 'POST /assistant/clean/students returns 200');
  assert(cleanAnalysisRes.data.data.dqi !== undefined, 'POST /clean/:recordType includes dqi in payload');
  assert(cleanAnalysisRes.data.data.dqi.rating !== undefined, 'Payload includes DQI rating');

  // Test 22: Human Review Acceptance with Rich Audit Metadata
  const reviewAcceptRes = await apiRequest(`${baseUrl}/assistant/clean/students/review`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({
      recordId: studentPhoneId,
      issueType: 'inconsistent_format',
      field: 'phone',
      decision: 'accept',
      proposedValue: '+91 98765 43210',
      aiProvider: 'gemini',
      aiModel: 'gemini-2.5-flash',
      findingId: `${studentPhoneId}:inconsistent_format:phone`
    })
  });
  assert(reviewAcceptRes.status === 200, 'Human review accept returns 200');
  assert(reviewAcceptRes.data.data.applied === true, 'Response confirms fix was applied');

  // Verify database was updated
  const updatedStudent = await Student.findById(studentPhoneId);
  assert(
    updatedStudent.phone === '+91 98765 43210',
    'Database document updated to validated phone only upon human approval'
  );

  // Verify AuditLog metadata persistence
  const acceptAuditLogs = await AuditLog.find({
    entityType: 'data_cleaning_review',
    entityId: studentPhoneId
  }).sort({ createdAt: -1 });

  assert(acceptAuditLogs.length > 0, 'Audit log entry created for human review');
  const latestAudit = acceptAuditLogs[0];
  assert(latestAudit.metadata.targetField === 'phone', 'Audit metadata records targetField');
  assert(
    latestAudit.metadata.originalValue === '[REDACTED_PHONE]' || latestAudit.metadata.originalValue === '9876543210',
    'Audit metadata records originalValue (with PII scrubbing)'
  );
  assert(
    latestAudit.metadata.proposedValue === '[REDACTED_PHONE]' || latestAudit.metadata.proposedValue === '+91 98765 43210',
    'Audit metadata records proposedValue (with PII scrubbing)'
  );
  assert(latestAudit.metadata.decision === 'accept', 'Audit metadata records decision="accept"');
  assert(latestAudit.metadata.applied === true, 'Audit metadata records applied=true');
  assert(latestAudit.metadata.aiProvider === 'gemini', 'Audit metadata records aiProvider safely');
  assert(latestAudit.metadata.aiModel === 'gemini-2.5-flash', 'Audit metadata records aiModel');
  assert(latestAudit.metadata.reviewerId === String(staffUserA._id), 'Audit metadata records reviewerId');
  assert(latestAudit.metadata.reviewedAt !== undefined, 'Audit metadata records review timestamp');

  // Test 23: Human Review Rejection (Audit metadata records rejection without modifying database)
  const pinStudentBefore = await Student.findById(studentPinId);
  const reviewRejectRes = await apiRequest(`${baseUrl}/assistant/clean/students/review`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({
      recordId: studentPinId,
      issueType: 'inconsistent_format',
      field: 'pinCode',
      decision: 'reject',
      aiProvider: 'gemini'
    })
  });
  assert(reviewRejectRes.status === 200, 'Human review rejection returns 200');
  assert(reviewRejectRes.data.data.applied === false, 'Response confirms fix was NOT applied');

  const pinStudentAfter = await Student.findById(studentPinId);
  assert(
    pinStudentAfter.pinCode === pinStudentBefore.pinCode,
    'Database document remains completely unmodified on rejection'
  );

  const rejectAuditLogs = await AuditLog.find({
    entityType: 'data_cleaning_review',
    entityId: studentPinId
  });
  assert(rejectAuditLogs.length > 0, 'Audit log entry created for human review rejection');
  const rejectAudit = rejectAuditLogs[0];
  assert(rejectAudit.metadata.decision === 'reject', 'Audit metadata records decision="reject"');
  assert(rejectAudit.metadata.applied === false, 'Audit metadata records applied=false');

  // Test 24: Rejection of invalid value in human review endpoint
  const invalidReviewRes = await apiRequest(`${baseUrl}/assistant/clean/students/review`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({
      recordId: studentPinId,
      issueType: 'inconsistent_format',
      field: 'pinCode',
      decision: 'accept',
      proposedValue: 'bad-pin-999999' // Invalid PIN
    })
  });
  assert(invalidReviewRes.status === 400, 'Human review with invalid proposedValue rejected with HTTP 400');

  // Test 25: Tenant Isolation: Staff B from NGO B cannot access records of NGO A
  const crossTenantDqi = await apiRequest(`${baseUrl}/assistant/clean/students/dqi/${studentPhoneId}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${tokenB}` }
  });
  assert(crossTenantDqi.status === 404, 'Cross-tenant GET DQI returns 404 access denied');

  const crossTenantReview = await apiRequest(`${baseUrl}/assistant/clean/students/review`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenB}` },
    body: JSON.stringify({
      recordId: studentPhoneId,
      issueType: 'inconsistent_format',
      field: 'phone',
      decision: 'accept'
    })
  });
  assert(crossTenantReview.status === 404, 'Cross-tenant review returns 404 access denied');

  // Test 26: Unauthenticated request blocked
  const unauthDqi = await apiRequest(`${baseUrl}/assistant/clean/students/dqi`);
  assert(unauthDqi.status === 401, 'Unauthenticated GET DQI returns 401');

  // Cleanup test artifacts
  await new Promise((resolve) => server.close(resolve));
  await Student.deleteMany({ ngoId: { $in: [ngoA._id, ngoB._id] } });
  await User.deleteMany({ _id: { $in: [staffUserA._id, staffUserB._id] } });
  await Ngo.deleteMany({ _id: { $in: [ngoA._id, ngoB._id] } });
  await AuditLog.deleteMany({ entityId: { $in: [studentPhoneId, studentPinId] } });

  geminiService.resetClientForTesting();

  console.log('\n================================================================');
  console.log(`STAGE 3C PHASE 2 RESULT: ALL ${passed} TESTS PASSED SUCCESSFULLY! ✅`);
  console.log('================================================================');
};

runAll()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test execution failed:', err);
    process.exit(1);
  });

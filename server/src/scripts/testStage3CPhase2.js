const mongoose = require('mongoose');
const http = require('http');
const crypto = require('crypto');
const config = require('../config/env');
const app = require('../app');
const geminiService = require('../services/geminiService');
const dataAssistantService = require('../services/dataAssistantService');
const dataQualityService = require('../services/dataQualityService');
const { createProposalToken, verifyProposalToken } = require('../controllers/assistantController');
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
    const mongoUri = (config.MONGODB_URI && !config.MONGODB_URI.startsWith('mongodb+srv://'))
      ? config.MONGODB_URI
      : 'mongodb://127.0.0.1:27017/ngo_records_db';
    await mongoose.connect(mongoUri);
  }

  // ============================================================================
  // SECTION 1: Deterministic Data Quality Index (DQI) Unit Tests & Correctness
  // ============================================================================
  console.log('▶ [1. Deterministic DQI Engine Unit Tests & Correctness]');

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

  // Test 7: Invalid optional field drops Validity, NOT Completeness
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

  // Test 8: Repeated blocking matches for the same entity are deduplicated (no double-counting)
  const dupStudent = {
    _id: '507f191e810c19729de860ef',
    registrationNumber: 'REG501',
    firstName: 'Amit',
    lastName: 'Kumar'
  };
  const dupFlagsRepeated = [
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
  const dupEvalRepeated = calculateRecordDQI('students', dupStudent, dupFlagsRepeated);
  assert(
    dupEvalRepeated.metrics.duplicateCandidateCount === 1,
    'Multiple blocking matches for the same duplicate entity pair are deduplicated (count = 1)'
  );
  assert(
    dupEvalRepeated.deductions.filter((d) => d.dimension === 'uniqueness').length === 1,
    'Uniqueness penalty is applied once per unique matching entity, preventing double-counting'
  );

  // Test 9: Multiple DISTINCT duplicate candidates are both penalized appropriately
  const dupFlagsMultiple = [
    {
      id: `${dupStudent._id}:possible_duplicate:relatedA`,
      recordId: dupStudent._id,
      type: 'possible_duplicate',
      relatedRecordId: 'relatedA',
      severity: 'medium',
      score: 0.85,
      description: 'Match with Entity A'
    },
    {
      id: `${dupStudent._id}:possible_duplicate:relatedB`,
      recordId: dupStudent._id,
      type: 'possible_duplicate',
      relatedRecordId: 'relatedB',
      severity: 'medium',
      score: 0.85,
      description: 'Match with Entity B'
    }
  ];
  const dupEvalMultiple = calculateRecordDQI('students', dupStudent, dupFlagsMultiple);
  assert(
    dupEvalMultiple.metrics.duplicateCandidateCount === 2,
    'Multiple distinct duplicate entities are correctly counted (count = 2)'
  );
  assert(
    dupEvalMultiple.deductions.filter((d) => d.dimension === 'uniqueness').length === 2,
    'Both distinct duplicate candidate deductions are itemized'
  );

  // Test 10: Invalid-versus-standardization double penalty safeguard
  // A field with an invalid value is NOT double-penalized under standardization
  const syntheticDoubleFlags = [
    {
      id: 'rec:invalid_value:phone',
      recordId: '507f191e810c19729de860f0',
      type: 'invalid_value',
      field: 'phone',
      severity: 'high',
      description: 'Invalid phone'
    },
    {
      id: 'rec:inconsistent_format:phone',
      recordId: '507f191e810c19729de860f0',
      type: 'inconsistent_format',
      field: 'phone', // Same field!
      severity: 'low',
      description: 'Phone format'
    }
  ];
  const doubleEval = calculateRecordDQI('students', { _id: '507f191e810c19729de860f0', registrationNumber: 'R1', firstName: 'A', lastName: 'B' }, syntheticDoubleFlags);
  assert(
    doubleEval.dimensions.standardization.score === 100,
    'Field with validity defect is NOT double-penalized under standardization dimension'
  );
  assert(
    doubleEval.deductions.filter((d) => d.field === 'phone').length === 1,
    'Exactly one deduction applies to the field (validity only)'
  );

  // Test 11: Empty dataset handling is mathematically defensible & semantically honest
  const emptyDqi = calculateDatasetDQI('students', [], []);
  assert(emptyDqi.score === null, 'Empty dataset reports score: null');
  assert(emptyDqi.category === 'not_assessable', 'Empty dataset classified as category: not_assessable');
  assert(emptyDqi.rating === 'not_assessable', 'Empty dataset rating is not_assessable');
  assert(emptyDqi.scanned === 0, 'Empty dataset reports scanned: 0');
  assert(emptyDqi.metrics.totalRecordsScanned === 0, 'Empty dataset reports 0 scanned records');
  assert(emptyDqi.dimensions.completeness.score === null, 'Completeness dimension score is null');
  assert(emptyDqi.dimensions.validity.score === null, 'Validity dimension score is null');
  assert(emptyDqi.dimensions.standardization.score === null, 'Standardization dimension score is null');
  assert(emptyDqi.dimensions.uniqueness.score === null, 'Uniqueness dimension score is null');
  assert(classifyRating(null) === 'not_assessable', 'classifyRating(null) returns not_assessable');

  // Test 12: Dataset DQI aggregation linear consistency
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
  // SECTION 2: DOB Consistency Across Stage 3A, Deterministic Detection & Stage 3C
  // ============================================================================
  console.log('\n▶ [2. Date of Birth (DOB) Consistency Tests (100, 105, 120, >120 years)]');

  const { validateCorrectionProposal, sanitizeProposedValue, buildRecordFlags } = dataAssistantService;
  const currentYear = new Date().getFullYear();

  // Age 100: (born currentYear - 100)
  const dob100Str = `${currentYear - 100}-01-15`;
  const studentAge100 = {
    _id: '507f191e810c19729de860f1',
    registrationNumber: 'REG-100',
    firstName: 'Centenarian',
    lastName: 'Elder',
    dateOfBirth: dob100Str
  };
  const flagsAge100 = buildRecordFlags('students', studentAge100);
  assert(
    !flagsAge100.some((f) => f.field === 'dateOfBirth' && f.severity === 'high'),
    'Age 100 is NOT flagged as an invalid date of birth'
  );
  const valCheck100 = validateCorrectionProposal('students', 'dateOfBirth', dob100Str);
  assert(valCheck100.valid === true, 'Age 100 is accepted as a valid correction proposal');

  // Age 105: (born currentYear - 105) - specifically tested to verify >100 anomaly rule no longer contradicts API
  const dob105Str = `${currentYear - 105}-06-20`;
  const studentAge105 = {
    _id: '507f191e810c19729de860f2',
    registrationNumber: 'REG-105',
    firstName: 'Senior',
    lastName: 'Citizen',
    dateOfBirth: dob105Str
  };
  const flagsAge105 = buildRecordFlags('students', studentAge105);
  assert(
    !flagsAge105.some((f) => f.field === 'dateOfBirth' && f.severity === 'high'),
    'Age 105 is NOT flagged as invalid (aligned with 120-year limit)'
  );
  const valCheck105 = validateCorrectionProposal('students', 'dateOfBirth', dob105Str);
  assert(valCheck105.valid === true, 'Age 105 is accepted as a valid correction proposal');

  // Age 120: (born currentYear - 120) - boundary test
  const dob120Str = `${currentYear - 120}-12-01`;
  const studentAge120 = {
    _id: '507f191e810c19729de860f3',
    registrationNumber: 'REG-120',
    firstName: 'Oldest',
    lastName: 'Beneficiary',
    dateOfBirth: dob120Str
  };
  const flagsAge120 = buildRecordFlags('students', studentAge120);
  assert(
    !flagsAge120.some((f) => f.field === 'dateOfBirth' && f.severity === 'high'),
    'Age 120 is accepted at the upper boundary'
  );
  const valCheck120 = validateCorrectionProposal('students', 'dateOfBirth', dob120Str);
  assert(valCheck120.valid === true, 'Age 120 is accepted as a valid correction proposal');

  // Age > 120: (e.g. 125, born currentYear - 125) - must be rejected and flagged
  const dob125Str = `${currentYear - 125}-01-01`;
  const studentAge125 = {
    _id: '507f191e810c19729de860f4',
    registrationNumber: 'REG-125',
    firstName: 'Ancient',
    lastName: 'Person',
    dateOfBirth: dob125Str
  };
  const flagsAge125 = buildRecordFlags('students', studentAge125);
  assert(
    flagsAge125.some((f) => f.field === 'dateOfBirth' && f.severity === 'high' && f.description.includes('> 120 years')),
    'Age > 120 is flagged as invalid with explicit "> 120 years" description'
  );
  const valCheck125 = validateCorrectionProposal('students', 'dateOfBirth', dob125Str);
  assert(valCheck125.valid === false, 'Age > 120 is rejected by correction validation');
  assert(valCheck125.error.includes('> 120 years'), 'Rejection error message states "> 120 years"');

  // ============================================================================
  // SECTION 3: Proposal Validation, Guardrails & Field-Level Rules
  // ============================================================================
  console.log('\n▶ [3. Correction Proposal Validation & Field-Level Guardrails]');

  // Valid proposed values pass validation
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

  // Rejection of forbidden fields
  const forbiddenFieldCheck = validateCorrectionProposal('students', 'role', 'admin');
  assert(forbiddenFieldCheck.valid === false, 'Forbidden field "role" is rejected');
  assert(
    forbiddenFieldCheck.error.includes('cannot be changed'),
    'Error message indicates field is forbidden'
  );

  const passwordFieldCheck = validateCorrectionProposal('students', 'password', 'newSecret123');
  assert(passwordFieldCheck.valid === false, 'Forbidden field "password" is rejected');

  // Rejection of invalid phone numbers
  assert(validateCorrectionProposal('students', 'phone', '12345').valid === false, 'Rejects short phone number');
  assert(validateCorrectionProposal('students', 'phone', 'abc9876543210').valid === false, 'Rejects phone with alphabetic characters');
  assert(validateCorrectionProposal('students', 'phone', '1876543210').valid === false, 'Rejects invalid Indian phone prefix (starts with 1)');

  // Rejection of invalid PIN codes
  assert(validateCorrectionProposal('students', 'pinCode', '123').valid === false, 'Rejects short PIN code');
  assert(validateCorrectionProposal('students', 'pinCode', '999999').valid === false, 'Rejects PIN starting with 9');
  assert(validateCorrectionProposal('students', 'pinCode', '012345').valid === false, 'Rejects PIN starting with 0');

  // Rejection of future Date of Birth
  const futureDobCheck = validateCorrectionProposal('students', 'dateOfBirth', '2099-01-01');
  assert(futureDobCheck.valid === false, 'Rejects future Date of Birth');

  // Rejection of names with special characters
  assert(validateCorrectionProposal('students', 'firstName', 'Aarav@123').valid === false, 'Rejects name containing numeric or special characters');

  // ============================================================================
  // SECTION 4: HTTP API, Cryptographic Audit Trust & Security Integration Tests
  // ============================================================================
  console.log('\n▶ [4. API Endpoints, Cryptographic Audit Trust & Multi-Tenant Security]');

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

  // Proposal endpoint returns proposal with trusted server proposalToken
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
  assert(typeof proposalRes1.data.data.proposalToken === 'string', 'Server returns signed proposalToken');

  // Proposal endpoint intercepts and rejects invalid AI suggestions
  currentMockOutput = JSON.stringify({
    proposedValue: '12345',
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

  // Zero writes to MongoDB during proposal generation
  const phoneStudentCheck = await Student.findById(studentPhoneId);
  assert(
    phoneStudentCheck.phone === '9876543210',
    'Database document is 100% unchanged after proposal requests (ZERO writes by AI)'
  );

  // Dedicated DQI endpoints
  const dqiRes = await apiRequest(`${baseUrl}/assistant/clean/students/dqi`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${tokenA}` }
  });
  assert(dqiRes.status === 200, 'GET /assistant/clean/students/dqi returns 200');
  assert(typeof dqiRes.data.data.dqi.score === 'number', 'DQI response includes numeric score');

  // Empty dataset API check (NGO B has 0 students)
  const emptyOrgDqiRes = await apiRequest(`${baseUrl}/assistant/clean/students/dqi`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${tokenB}` }
  });
  assert(emptyOrgDqiRes.status === 200, 'GET /assistant/clean/students/dqi on empty organization returns 200');
  assert(emptyOrgDqiRes.data.data.dqi.score === null, 'Empty organization DQI score is null');
  assert(emptyOrgDqiRes.data.data.dqi.category === 'not_assessable', 'Empty organization DQI category is not_assessable');
  assert(emptyOrgDqiRes.data.data.dqi.scanned === 0, 'Empty organization DQI reports scanned: 0');

  const recordDqiRes = await apiRequest(`${baseUrl}/assistant/clean/students/dqi/${studentPhoneId}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${tokenA}` }
  });
  assert(recordDqiRes.status === 200, 'GET /assistant/clean/students/dqi/:recordId returns 200');
  assert(recordDqiRes.data.data.recordId === studentPhoneId, 'Record DQI matches requested record ID');

  const cleanAnalysisRes = await apiRequest(`${baseUrl}/assistant/clean/students`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` }
  });
  assert(cleanAnalysisRes.status === 200, 'POST /assistant/clean/students returns 200');
  assert(cleanAnalysisRes.data.data.dqi !== undefined, 'POST /clean/:recordType includes dqi in payload');

  // ============================================================================
  // AUDIT METADATA TRUST TESTS (Forged Metadata & Token Tampering)
  // ============================================================================
  console.log('\n▶ [5. Audit Metadata Trust & Anti-Forgery Tests]');

  // Test: Client attempts to send forged aiProvider/aiModel in request body
  // Must be rejected by strict Zod schema with HTTP 400!
  const forgedBodyRes = await apiRequest(`${baseUrl}/assistant/clean/students/review`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({
      recordId: studentPhoneId,
      issueType: 'inconsistent_format',
      field: 'phone',
      decision: 'accept',
      proposedValue: '+91 98765 43210',
      aiProvider: 'rogue-super-ai', // Forged property
      aiModel: 'malicious-model-v99' // Forged property
    })
  });
  assert(forgedBodyRes.status === 400, 'Review endpoint strictly rejects client-supplied aiProvider/aiModel in body (HTTP 400)');
  assert(
    JSON.stringify(forgedBodyRes.data).includes('Unrecognized key'),
    'Rejection cites unrecognized key in body'
  );

  // Test: Client attempts to send forged findingId in request body
  const forgedFindingRes = await apiRequest(`${baseUrl}/assistant/clean/students/review`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({
      recordId: studentPhoneId,
      issueType: 'inconsistent_format',
      field: 'phone',
      decision: 'accept',
      proposedValue: '+91 98765 43210',
      findingId: 'fabricated-finding-id-12345' // Forged property
    })
  });
  assert(forgedFindingRes.status === 400, 'Review endpoint strictly rejects client-supplied findingId in body (HTTP 400)');

  // Test: Client attempts to send a tampered proposalToken (signature mismatch)
  const validToken = proposalRes1.data.data.proposalToken;
  const tamperedToken = validToken.slice(0, -6) + 'XXXXXX'; // Invalidate HMAC signature

  const tamperedReviewRes = await apiRequest(`${baseUrl}/assistant/clean/students/review`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({
      recordId: studentPhoneId,
      issueType: 'inconsistent_format',
      field: 'phone',
      decision: 'accept',
      proposedValue: '+91 98765 43210',
      proposalToken: tamperedToken
    })
  });
  assert(tamperedReviewRes.status === 200, 'Review succeeds applying valid fix');

  // Verify AuditLog metadata: tampered token resulted in aiProvider: null (NOT trusted!)
  const tamperedAudit = await AuditLog.findOne({
    entityType: 'data_cleaning_review',
    entityId: studentPhoneId
  }).sort({ createdAt: -1 });

  assert(tamperedAudit.metadata.aiProvider === null, 'Tampered proposalToken is NOT trusted; aiProvider logged as null');
  assert(tamperedAudit.metadata.aiModel === null, 'Tampered proposalToken is NOT trusted; aiModel logged as null');
  assert(
    tamperedAudit.metadata.findingId === `${studentPhoneId}:inconsistent_format:phone`,
    'findingId is strictly server-derived from canonical deterministic flag'
  );

  // Test: Legitimate review with valid server proposalToken correctly records aiProvider & aiModel
  // Reset student phone back to raw format to test legitimate token review
  await Student.updateOne({ _id: studentPhoneId }, { phone: '9876543210' });

  const legitReviewRes = await apiRequest(`${baseUrl}/assistant/clean/students/review`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({
      recordId: studentPhoneId,
      issueType: 'inconsistent_format',
      field: 'phone',
      decision: 'accept',
      proposedValue: '+91 98765 43210',
      proposalToken: validToken // Valid server-signed token
    })
  });
  assert(legitReviewRes.status === 200, 'Legitimate review with valid proposalToken returns 200');

  const legitAudit = await AuditLog.findOne({
    entityType: 'data_cleaning_review',
    entityId: studentPhoneId
  }).sort({ createdAt: -1 });

  assert(legitAudit.metadata.aiProvider === 'gemini', 'Verified proposalToken sets aiProvider to "gemini"');
  assert(legitAudit.metadata.aiModel === config.GEMINI_MODEL || legitAudit.metadata.aiModel === 'gemini-2.5-flash', 'Verified proposalToken sets aiModel to server model');
  assert(legitAudit.metadata.targetField === 'phone', 'Audit records targetField');
  assert(legitAudit.metadata.decision === 'accept', 'Audit records decision');
  assert(legitAudit.metadata.applied === true, 'Audit records applied');

  // Test: Reviewing an already-reviewed / already-resolved issue returns HTTP 409 Conflict
  const auditCountBeforeDuplicate = await AuditLog.countDocuments({
    entityType: 'data_cleaning_review',
    entityId: studentPhoneId
  });

  const duplicateReviewRes = await apiRequest(`${baseUrl}/assistant/clean/students/review`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({
      recordId: studentPhoneId,
      issueType: 'inconsistent_format',
      field: 'phone',
      decision: 'accept',
      proposedValue: '+91 98765 43210'
    })
  });
  assert(duplicateReviewRes.status === 409, 'Already-resolved issue review rejected with HTTP 409');
  assert(
    JSON.stringify(duplicateReviewRes.data).includes('no longer present'),
    'HTTP 409 error cites issue is no longer present'
  );

  const auditCountAfterDuplicate = await AuditLog.countDocuments({
    entityType: 'data_cleaning_review',
    entityId: studentPhoneId
  });
  assert(
    auditCountAfterDuplicate === auditCountBeforeDuplicate,
    'Zero duplicate audit records created on 409 conflict'
  );

  // Test: Rejection of already-resolved issue returns HTTP 409
  const rejectCleanRes = await apiRequest(`${baseUrl}/assistant/clean/students/review`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({
      recordId: studentPhoneId,
      issueType: 'inconsistent_format',
      field: 'phone',
      decision: 'reject'
    })
  });
  assert(rejectCleanRes.status === 409, 'Rejection of already-resolved issue returns HTTP 409');

  // Test: Token reuse cannot create misleading duplicate approval audit records
  // Reset student phone back to raw format to test token reuse
  await Student.updateOne({ _id: studentPhoneId }, { phone: '9876543210' });

  // Re-submit the exact same validToken that was already consumed in legitReviewRes
  const reuseTokenRes = await apiRequest(`${baseUrl}/assistant/clean/students/review`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({
      recordId: studentPhoneId,
      issueType: 'inconsistent_format',
      field: 'phone',
      decision: 'accept',
      proposedValue: '+91 98765 43210',
      proposalToken: validToken // Already consumed!
    })
  });
  assert(reuseTokenRes.status === 200, 'Review with reused token succeeds as human review');

  const reuseAudit = await AuditLog.findOne({
    entityType: 'data_cleaning_review',
    entityId: studentPhoneId
  }).sort({ createdAt: -1 });
  assert(reuseAudit.metadata.aiProvider === null, 'Reused proposalToken cannot attribute aiProvider (logged as null)');
  assert(reuseAudit.metadata.aiModel === null, 'Reused proposalToken cannot attribute aiModel (logged as null)');

  // Test: Proposed value mismatch prevents AI provenance attribution
  await Student.updateOne({ _id: studentPhoneId }, { phone: '9876543210' });
  const freshToken = createProposalToken({
    recordId: studentPhoneId,
    recordType: 'students',
    field: 'phone',
    issueType: 'inconsistent_format',
    proposedValue: '+91 98765 43210',
    provider: 'gemini',
    model: 'gemini-2.5-flash',
    ngoId: ngoA._id
  });

  const valueMismatchRes = await apiRequest(`${baseUrl}/assistant/clean/students/review`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({
      recordId: studentPhoneId,
      issueType: 'inconsistent_format',
      field: 'phone',
      decision: 'accept',
      proposedValue: '+91 91234 56789', // Different valid phone number!
      proposalToken: freshToken
    })
  });
  assert(valueMismatchRes.status === 200, 'Review with modified value succeeds as human custom fix');

  const mismatchAudit = await AuditLog.findOne({
    entityType: 'data_cleaning_review',
    entityId: studentPhoneId
  }).sort({ createdAt: -1 });
  assert(mismatchAudit.metadata.aiProvider === null, 'Modified proposedValue cannot claim AI provenance (aiProvider: null)');
  assert(mismatchAudit.metadata.aiModel === null, 'Modified proposedValue cannot claim AI provenance (aiModel: null)');

  // Test: Direct cryptographic verification & timing-safe checks
  const expiredToken = createProposalToken({
    recordId: studentPhoneId,
    recordType: 'students',
    field: 'phone',
    issueType: 'inconsistent_format',
    proposedValue: '+91 98765 43210',
    provider: 'gemini',
    model: 'gemini-2.5-flash',
    ngoId: ngoA._id
  });
  const expiredParts = expiredToken.split('.');
  const expPayload = JSON.parse(Buffer.from(expiredParts[0], 'base64url').toString('utf8'));
  expPayload.createdAt = Date.now() - 25 * 3600 * 1000; // 25 hours ago
  const expSer = Buffer.from(JSON.stringify(expPayload)).toString('base64url');
  const expSig = crypto.createHmac('sha256', config.JWT_SECRET).update(expSer).digest('base64url');
  const signedExpiredToken = `${expSer}.${expSig}`;
  assert(verifyProposalToken(signedExpiredToken) === null, 'Expired proposalToken is rejected by verifyProposalToken');

  // Timing safe comparison: byte length mismatch does not throw error
  assert(verifyProposalToken(`${expSer}.shortsig`) === null, 'Invalid signature byte length returns null safely');
  assert(verifyProposalToken('not-a-token') === null, 'Malformed token string returns null');
  assert(verifyProposalToken(null) === null, 'Null token returns null');

  // Test: Human Review Rejection
  const pinStudentBefore = await Student.findById(studentPinId);
  const reviewRejectRes = await apiRequest(`${baseUrl}/assistant/clean/students/review`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({
      recordId: studentPinId,
      issueType: 'inconsistent_format',
      field: 'pinCode',
      decision: 'reject'
    })
  });
  assert(reviewRejectRes.status === 200, 'Human review rejection returns 200');
  assert(reviewRejectRes.data.data.applied === false, 'Response confirms fix was NOT applied');

  const pinStudentAfter = await Student.findById(studentPinId);
  assert(
    pinStudentAfter.pinCode === pinStudentBefore.pinCode,
    'Database document remains completely unmodified on rejection'
  );

  const rejectAudit = await AuditLog.findOne({
    entityType: 'data_cleaning_review',
    entityId: studentPinId
  }).sort({ createdAt: -1 });
  assert(rejectAudit.metadata.decision === 'reject', 'Audit metadata records decision="reject"');
  assert(rejectAudit.metadata.applied === false, 'Audit metadata records applied=false');
  assert(
    rejectAudit.metadata.findingId === `${studentPinId}:inconsistent_format:pinCode`,
    'Rejection findingId is strictly derived by server'
  );

  // Test: Rejection of invalid value in human review endpoint
  const invalidReviewRes = await apiRequest(`${baseUrl}/assistant/clean/students/review`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({
      recordId: studentPinId,
      issueType: 'inconsistent_format',
      field: 'pinCode',
      decision: 'accept',
      proposedValue: 'bad-pin-999999'
    })
  });
  assert(invalidReviewRes.status === 400, 'Human review with invalid proposedValue rejected with HTTP 400');

  // Test: Tenant Isolation
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

  // Test: Unauthenticated request blocked
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

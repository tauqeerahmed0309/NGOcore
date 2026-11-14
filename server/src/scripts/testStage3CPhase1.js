const mongoose = require('mongoose');
const http = require('http');
const config = require('../config/env');
const app = require('../app');
const geminiService = require('../services/geminiService');
const aiProviderService = require('../services/aiProviderService');
const dataAssistantService = require('../services/dataAssistantService');
const Ngo = require('../models/Ngo');
const User = require('../models/User');
const Student = require('../models/Student');
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
  console.log('   RUNNING STAGE 3C PHASE 1: BACKEND SECURITY & AI PROPOSAL    ');
  console.log('================================================================\n');

  // Connect MongoDB if not already connected
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(config.MONGODB_URI);
  }

  // ============================================================================
  // SECTION 1: PII Sanitizer Unit Tests (14 rigorous test cases)
  // ============================================================================
  console.log('▶ [1. PII Sanitizer & Privacy Scrubbing Unit Tests]');

  const sanitize = geminiService.sanitizeText;

  // Phone test cases
  assert(
    sanitize('+91 98765 43210') === '[REDACTED_PHONE]',
    'Indian phone with +91 and spaces masked to [REDACTED_PHONE]'
  );
  assert(
    sanitize('98765 43210') === '[REDACTED_PHONE]',
    'Indian phone with 5-5 spaces without country code masked to [REDACTED_PHONE]'
  );
  assert(
    sanitize('98765-43210') === '[REDACTED_PHONE]',
    'Indian phone with hyphen masked to [REDACTED_PHONE]'
  );
  assert(
    sanitize('9876543210') === '[REDACTED_PHONE]',
    'Contiguous 10-digit Indian phone masked to [REDACTED_PHONE]'
  );
  assert(
    sanitize('+91-98765-43210') === '[REDACTED_PHONE]',
    'Indian phone with +91- prefix masked to [REDACTED_PHONE]'
  );
  assert(
    sanitize('09876543210') === '[REDACTED_PHONE]',
    'Indian phone with leading 0 masked to [REDACTED_PHONE]'
  );

  // Aadhaar test cases
  assert(
    sanitize('123456789012') === '[REDACTED_AADHAAR]',
    'Contiguous 12-digit Aadhaar masked to [REDACTED_AADHAAR]'
  );
  assert(
    sanitize('1234 5678 9012') === '[REDACTED_AADHAAR]',
    'Spaced 4-4-4 Aadhaar masked to [REDACTED_AADHAAR]'
  );
  assert(
    sanitize('1234-5678-9012') === '[REDACTED_AADHAAR]',
    'Hyphenated 4-4-4 Aadhaar masked to [REDACTED_AADHAAR]'
  );

  // PAN test cases
  assert(
    sanitize('ABCDE1234F') === '[REDACTED_PAN]',
    'Uppercase PAN (5 letters, 4 digits, 1 letter) masked to [REDACTED_PAN]'
  );
  assert(
    sanitize('abcde1234f') === '[REDACTED_PAN]',
    'Lowercase PAN masked to [REDACTED_PAN]'
  );

  // Email test case
  assert(
    sanitize('beneficiary.help@ngo-portal.org') === '[REDACTED_EMAIL]',
    'Email address masked to [REDACTED_EMAIL]'
  );

  // Multi-PII embedded in sentence
  const sentence = 'Beneficiary Aarav (email aarav.k@test.org, phone +91 98765 43210, Aadhaar 1234 5678 9012, PAN ABCDE1234F) registered.';
  const expectedSentence = 'Beneficiary Aarav (email [REDACTED_EMAIL], phone [REDACTED_PHONE], Aadhaar [REDACTED_AADHAAR], PAN [REDACTED_PAN]) registered.';
  assert(
    sanitize(sentence) === expectedSentence,
    'Multiple PII types embedded in narrative text are all masked while surrounding text is preserved'
  );

  // Unrelated non-PII numbers preserved
  const nonPii = 'Batch 2026 PIN 560001 Class 10 count 15';
  assert(
    sanitize(nonPii) === nonPii,
    'Unrelated numbers (year 2026, PIN 560001, class 10, count 15) remain intact'
  );

  // 16-digit card number not partially masked as Aadhaar
  const cardStr = '1234 5678 9012 3456 card';
  assert(
    sanitize(cardStr) === cardStr,
    '16-digit spaced number is NOT partially masked as 12-digit Aadhaar'
  );

  // ============================================================================
  // SECTION 2: AI Proposal Engine Unit Tests (Mocked Gemini Client, $0 cost)
  // ============================================================================
  console.log('\n▶ [2. Gemini Service proposeCorrection Unit Tests]');

  const originalGeminiEnabled = config.GEMINI_ENABLED;
  const originalGeminiKey = config.GEMINI_API_KEY;
  const originalPiiMode = config.GEMINI_PII_MODE;

  config.GEMINI_ENABLED = true;
  config.GEMINI_API_KEY = 'test-fake-key-for-mock';
  config.GEMINI_PII_MODE = 'disabled';

  let capturedPrompt = '';
  let mockPayload = JSON.stringify({
    proposedValue: 'REG101',
    reasoning: 'Normalized registration number by trimming whitespace and converting to uppercase.',
    confidenceCategory: 'high'
  });

  const mockClient = {
    models: {
      async generateContent(req) {
        capturedPrompt = req.contents;
        return {
          text: mockPayload,
          usageMetadata: {
            promptTokenCount: 50,
            candidatesTokenCount: 25,
            totalTokenCount: 75
          }
        };
      }
    }
  };

  geminiService.setClientForTesting(mockClient);

  // Test proposal generation
  const proposalResult = await geminiService.proposeCorrection({
    recordType: 'students',
    field: 'registrationNumber',
    currentValue: 'reg 101 ',
    issueType: 'inconsistent_format',
    recordLabel: 'Aarav Patel',
    description: 'Registration number has extra whitespace or lowercase characters.'
  });

  assert(proposalResult.success === true, 'proposeCorrection returns success=true with mock client');
  assert(proposalResult.data.proposedValue === 'REG101', 'proposeCorrection returns validated proposedValue');
  assert(proposalResult.data.confidenceCategory === 'high', 'proposeCorrection returns categorical confidence "high"');
  assert(typeof proposalResult.data.reasoning === 'string' && proposalResult.data.reasoning.length > 5, 'proposeCorrection returns non-empty reasoning');
  assert(capturedPrompt.includes('<data_input>'), 'Input prompt encapsulates data strictly inside <data_input> tags');
  assert(capturedPrompt.includes('Entity: Record'), 'Anonymizes entity label to "Record" when GEMINI_PII_MODE=disabled');

  // Test Zod rejection of invalid confidence category
  mockPayload = JSON.stringify({
    proposedValue: 'REG101',
    reasoning: 'Looks reasonable.',
    confidenceCategory: 'very_high' // Invalid enum
  });
  const invalidCategoryResult = await geminiService.proposeCorrection({
    recordType: 'students',
    field: 'registrationNumber',
    currentValue: 'reg 101 ',
    issueType: 'inconsistent_format',
    recordLabel: 'Record',
    description: 'desc'
  });
  assert(
    invalidCategoryResult.success === false && invalidCategoryResult.reason === 'api_error',
    'Strict Zod schema rejects invalid confidenceCategory (e.g. "very_high")'
  );

  // Test Zod rejection of unauthorized extra fields
  mockPayload = JSON.stringify({
    proposedValue: 'REG101',
    reasoning: 'Normalized.',
    confidenceCategory: 'high',
    targetFieldToOverwrite: 'role' // Extra property rejected by .strict()
  });
  const extraFieldsResult = await geminiService.proposeCorrection({
    recordType: 'students',
    field: 'registrationNumber',
    currentValue: 'reg 101 ',
    issueType: 'inconsistent_format',
    recordLabel: 'Record',
    description: 'desc'
  });
  assert(
    extraFieldsResult.success === false && extraFieldsResult.reason === 'api_error',
    'Strict Zod schema rejects unauthorized extra fields from model output'
  );

  // ============================================================================
  // SECTION 3: HTTP API Integration Tests (Safety Boundaries & RBAC)
  // ============================================================================
  console.log('\n▶ [3. Critical Safety Rules & API Endpoint Integration Tests]');

  // Start test server
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api/v1`;

  // Seed two distinct NGOs to test tenant isolation
  const timestamp = Date.now();
  const ngoA = await Ngo.create({
    name: `Test NGO A ${timestamp}`,
    status: 'approved',
    isActive: true
  });
  const ngoB = await Ngo.create({
    name: `Test NGO B ${timestamp}`,
    status: 'approved',
    isActive: true
  });

  const staffUserA = await User.create({
    firstName: 'Staff',
    lastName: 'UserA',
    email: `staff-a-${timestamp}@example.org`,
    password: await hashPassword('Password123!'),
    role: 'staff',
    ngoId: ngoA._id,
    isActive: true
  });

  const staffUserB = await User.create({
    firstName: 'Staff',
    lastName: 'UserB',
    email: `staff-b-${timestamp}@example.org`,
    password: await hashPassword('Password123!'),
    role: 'staff',
    ngoId: ngoB._id,
    isActive: true
  });

  // Log in staff A
  const loginResA = await apiRequest(`${baseUrl}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ email: staffUserA.email, password: 'Password123!' })
  });
  const tokenA = loginResA.accessToken;

  // Log in staff B
  const loginResB = await apiRequest(`${baseUrl}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ email: staffUserB.email, password: 'Password123!' })
  });
  const tokenB = loginResB.accessToken;

  // Create a student in NGO A with deterministic issues
  // issue 1: registrationNumber has spaces and lowercase -> inconsistent_format
  // issue 2: firstName has numbers/special characters -> inconsistent_format
  // lastName is clean and valid -> no active issue
  const studentDoc = await Student.create({
    ngoId: ngoA._id,
    registrationNumber: 'reg 101 ',
    firstName: 'rohit@123',
    lastName: 'Sharma',
    email: 'rohit@example.org',
    status: 'active'
  });
  const studentId = String(studentDoc._id);

  // Restore valid mock response
  mockPayload = JSON.stringify({
    proposedValue: 'REG101',
    reasoning: 'Converted registration code to standard uppercase without spaces.',
    confidenceCategory: 'high'
  });
  geminiService.setClientForTesting(mockClient);

  // TEST 1: Staff requests proposal for valid deterministic finding
  const validProposalRes = await apiRequest(`${baseUrl}/assistant/ai/propose-correction`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({
      recordType: 'students',
      recordId: studentId,
      field: 'registrationNumber',
      issueType: 'inconsistent_format'
    })
  });

  assert(validProposalRes.status === 200, 'POST /assistant/ai/propose-correction returns 200 for valid finding');
  assert(validProposalRes.data.data.available === true, 'Proposal response reports available=true');
  assert(validProposalRes.data.data.proposedValue === 'REG101', 'Proposal response includes expected proposedValue');
  assert(validProposalRes.data.data.confidenceCategory === 'high', 'Proposal response includes confidenceCategory');
  assert(validProposalRes.data.data.notice.includes('Human review'), 'Proposal response contains mandatory advisory human review notice');

  // TEST 2: Field Allowlist Safety Enforcement
  // Client attempts to request proposal on an arbitrary/forbidden field (e.g. role, password, ngoId)
  const forbiddenFieldRes = await apiRequest(`${baseUrl}/assistant/ai/propose-correction`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({
      recordType: 'students',
      recordId: studentId,
      field: 'role',
      issueType: 'inconsistent_format'
    })
  });
  assert(forbiddenFieldRes.status === 400, 'Request on non-allowlisted field "role" is rejected with HTTP 400');
  assert(
    forbiddenFieldRes.data.message.includes('does not support automated correction proposals'),
    'Rejection message indicates field is not in correction allowlist'
  );

  // TEST 3: Deterministic Flag Verification Safety Rule
  // Client requests proposal on allowlisted field 'lastName', but 'lastName' has NO active issue on this student!
  const noIssueRes = await apiRequest(`${baseUrl}/assistant/ai/propose-correction`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({
      recordType: 'students',
      recordId: studentId,
      field: 'lastName',
      issueType: 'inconsistent_format'
    })
  });
  assert(noIssueRes.status === 400, 'Request on field without active deterministic issue is rejected with HTTP 400');
  assert(
    noIssueRes.data.message.includes('No active deterministic data-quality issue found'),
    'Rejection message states no active issue was found for this record and field'
  );

  // TEST 4: CRITICAL SAFETY RULE — Zero Database Writes
  // Check the document directly in MongoDB to guarantee it was NOT altered by proposeCorrection
  const studentInDb = await Student.findById(studentId);
  assert(studentInDb.registrationNumber === studentDoc.registrationNumber, 'Student registrationNumber is completely unchanged in database');
  assert(studentInDb.firstName === studentDoc.firstName, 'Student firstName is completely unchanged in database');

  // TEST 5: Tenant Isolation
  // Staff from NGO B attempts to request proposal for Student belonging to NGO A
  const crossTenantRes = await apiRequest(`${baseUrl}/assistant/ai/propose-correction`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenB}` },
    body: JSON.stringify({
      recordType: 'students',
      recordId: studentId,
      field: 'registrationNumber',
      issueType: 'inconsistent_format'
    })
  });
  assert(crossTenantRes.status === 404, 'Cross-tenant request returns HTTP 404 access denied');

  // TEST 6: Unauthenticated Request Blocked
  const unauthRes = await apiRequest(`${baseUrl}/assistant/ai/propose-correction`, {
    method: 'POST',
    body: JSON.stringify({
      recordType: 'students',
      recordId: studentId,
      field: 'registrationNumber',
      issueType: 'inconsistent_format'
    })
  });
  assert(unauthRes.status === 401, 'Unauthenticated request returns HTTP 401');

  // TEST 7: AI Disabled Graceful Handling
  config.GEMINI_ENABLED = false;
  geminiService.resetClientForTesting();
  const disabledAiRes = await apiRequest(`${baseUrl}/assistant/ai/propose-correction`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({
      recordType: 'students',
      recordId: studentId,
      field: 'registrationNumber',
      issueType: 'inconsistent_format'
    })
  });
  assert(disabledAiRes.status === 200, 'Gracefully handles disabled AI service with HTTP 200');
  assert(disabledAiRes.data.data.available === false, 'Returns available=false when AI service is unavailable');
  assert(disabledAiRes.data.data.reason === 'gemini_disabled', 'Provides reason=gemini_disabled');

  // TEST 8: Deterministic Human Review Remains Required to Apply Changes
  // Apply review with decision 'accept' and verify the database is updated ONLY via review endpoint
  const reviewRes = await apiRequest(`${baseUrl}/assistant/clean/students/review`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({
      recordId: studentId,
      issueType: 'inconsistent_format',
      field: 'registrationNumber',
      decision: 'accept'
    })
  });
  assert(reviewRes.status === 200, 'Human review applyReview endpoint accepts verified fix');
  const updatedStudent = await Student.findById(studentId);
  assert(updatedStudent.registrationNumber === 'REG101', 'Database document updated only upon explicit human review acceptance');

  // Verify audit log entry was created for the human review
  const auditLogs = await AuditLog.find({
    entityType: 'data_cleaning_review',
    entityId: studentId
  });
  assert(auditLogs.length > 0, 'Audit log entry is created for accepted human review');

  // Cleanup
  await new Promise((resolve) => server.close(resolve));
  await Student.deleteMany({ ngoId: { $in: [ngoA._id, ngoB._id] } });
  await User.deleteMany({ _id: { $in: [staffUserA._id, staffUserB._id] } });
  await Ngo.deleteMany({ _id: { $in: [ngoA._id, ngoB._id] } });
  await AuditLog.deleteMany({ entityId: studentId });

  // Restore configuration
  config.GEMINI_ENABLED = originalGeminiEnabled;
  config.GEMINI_API_KEY = originalGeminiKey;
  config.GEMINI_PII_MODE = originalPiiMode;
  geminiService.resetClientForTesting();

  console.log('\n================================================================');
  console.log(`STAGE 3C PHASE 1 RESULT: ALL ${passed} TESTS PASSED SUCCESSFULLY! ✅`);
  console.log('================================================================');
};

runAll()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test execution failed:', err);
    process.exit(1);
  });

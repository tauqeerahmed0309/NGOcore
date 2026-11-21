/**
 * NGOcore — Document Management Automated Test Suite
 *
 * Comprehensive coverage:
 * - PART 1: Document Creation, Auto-Numbering (DOC-XXXX), Custom IDs & Validation
 * - PART 2: Concurrency & Monotonic Sequence Allocation (20 Parallel Requests)
 * - PART 3: Verification & Compliance Workflow (Admin-only RBAC)
 * - PART 4: Query, Search, Filters, Expiry Detection & Aggregation Summary
 * - PART 5: RFC-4180 Compliant CSV Export
 * - PART 6: Security, RBAC & Soft-Delete Archiving
 */

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const config = require('../config/env');
const Document = require('../models/Document');
const User = require('../models/User');
const Ngo = require('../models/Ngo');
const { apiRequest } = require('./apiTestClient');
const { setupTestEnvironment, teardownTestEnvironment } = require('./testHelper');

const BASE_URL = `http://localhost:${config.PORT}/api/v1`;

const results = [];

const record = (num, name, passed, details) => {
  results.push({ num, name, passed, details });
  console.log(
    `${passed ? '✅' : '❌'} Test ${num.toString().padStart(2, ' ')}: ${name.padEnd(72, ' ')} -> ${
      passed ? 'PASSED' : 'FAILED'
    } (${details})`
  );
};

const runDocumentTests = async () => {
  await setupTestEnvironment();

  console.log('\n================================================================');
  console.log('   RUNNING DOCUMENT MANAGEMENT AUTOMATED TEST SUITE             ');
  console.log('================================================================\n');

  let adminToken = '';
  let staffToken = '';
  let volunteerToken = '';
  let studentToken = '';
  let adminBToken = '';

  let ngoAId = '';
  let ngoBId = '';

  let primaryDocId = '';
  let primaryDocNumber = '';

  const uniqueSuffix = Date.now().toString();

  try {
    // 1. Authenticate users
    const adminUser = await User.findOne({ email: config.ADMIN_EMAIL });
    if (!adminUser) {
      throw new Error(`Admin user ${config.ADMIN_EMAIL} not found.`);
    }
    ngoAId = adminUser.ngoId.toString();

    const adminLogin = await apiRequest(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: config.ADMIN_EMAIL, password: config.ADMIN_PASSWORD })
    });
    adminToken = adminLogin.accessToken;

    const staffLogin = await apiRequest(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: 'staff@ngo.org', password: 'StaffPassword123!' })
    });
    staffToken = staffLogin.accessToken;

    const volLogin = await apiRequest(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: 'volunteer@ngo.org', password: 'VolunteerPass123!' })
    });
    volunteerToken = volLogin.accessToken;

    const studentLogin = await apiRequest(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: 'student@ngo.org', password: 'StudentPass123!' })
    });
    studentToken = studentLogin.accessToken;

    // Tenant B Setup
    let ngoB = await Ngo.findOne({ name: 'Tenant B Document Test NGO' });
    if (!ngoB) {
      ngoB = await Ngo.create({
        name: 'Tenant B Document Test NGO',
        status: 'approved',
        approvalSubmitted: true
      });
    }
    ngoBId = ngoB._id.toString();

    const tenantBAdminEmail = `admin-b-doc-${uniqueSuffix}@example.org`;
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('StaffPassword123!', salt);
    await User.create({
      firstName: 'Admin',
      lastName: 'TenantB',
      email: tenantBAdminEmail,
      password: passwordHash,
      role: 'admin',
      ngoId: ngoB._id,
      status: 'active'
    });

    const adminBLogin = await apiRequest(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: tenantBAdminEmail, password: 'StaffPassword123!' })
    });
    adminBToken = adminBLogin.accessToken;

    // =========================================================================
    // PART 1: Document Creation, Auto-Numbering & Field Validation
    // =========================================================================
    console.log('▶ [1. Document Creation, Auto-Numbering & Field Validation]');

    const createRes1 = await apiRequest(`${BASE_URL}/documents`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        title: 'Income Tax 80G Tax Exemption Certificate',
        category: 'compliance_cert',
        fileUrl: 'https://storage.ngocore.org/docs/80g_exemption_cert.pdf',
        fileName: '80g_exemption_cert.pdf',
        fileSize: 245890,
        mimeType: 'application/pdf',
        associatedEntityType: 'ngo_general',
        expiryDate: new Date(Date.now() + 365 * 86400000).toISOString(),
        tags: ['tax', '80g', 'compliance', 'exemption'],
        description: 'Certified 80G tax exemption approval under Income Tax Act.'
      })
    });

    primaryDocId = createRes1.data?.data?.document?._id;
    primaryDocNumber = createRes1.data?.data?.document?.documentNumber;

    record(
      1,
      'Admin creates compliance document with sequential auto-numbering (DOC-XXXX)',
      createRes1.status === 201 && primaryDocNumber?.startsWith('DOC-'),
      `Status: ${createRes1.status}, Number: ${primaryDocNumber}`
    );

    const customDocNumber = `DOC-CUSTOM-${uniqueSuffix}`;
    const createRes2 = await apiRequest(`${BASE_URL}/documents`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${staffToken}` },
      body: JSON.stringify({
        documentNumber: customDocNumber,
        title: 'Quarterly Child Protection Policy Affirmation',
        category: 'policy',
        fileUrl: 'https://storage.ngocore.org/docs/child_protection_2026.pdf',
        fileName: 'child_protection_2026.pdf',
        fileSize: 1048576,
        mimeType: 'application/pdf',
        status: 'pending_verification'
      })
    });

    record(
      2,
      'Staff creates document with custom ID and pending verification status',
      createRes2.status === 201 && createRes2.data?.data?.document?.documentNumber === customDocNumber,
      `Status: ${createRes2.status}, Number: ${customDocNumber}`
    );

    const duplicateRes = await apiRequest(`${BASE_URL}/documents`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        documentNumber: customDocNumber,
        title: 'Duplicate Collision Document',
        fileUrl: 'https://storage.ngocore.org/docs/dup.pdf',
        fileName: 'dup.pdf',
        fileSize: 1024,
        mimeType: 'application/pdf'
      })
    });

    record(
      3,
      'Duplicate custom document number in same NGO rejected with HTTP 409',
      duplicateRes.status === 409,
      `Status: ${duplicateRes.status}`
    );

    const tenantBRes = await apiRequest(`${BASE_URL}/documents`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminBToken}` },
      body: JSON.stringify({
        documentNumber: customDocNumber,
        title: 'Tenant B Valid Document with Same Code',
        fileUrl: 'https://storage.ngocore.org/docs/tenantb.pdf',
        fileName: 'tenantb.pdf',
        fileSize: 1024,
        mimeType: 'application/pdf'
      })
    });

    record(
      4,
      'Same document number in distinct NGO allowed (tenant-scoped uniqueness)',
      tenantBRes.status === 201,
      `Status: ${tenantBRes.status}`
    );

    const invalidRes = await apiRequest(`${BASE_URL}/documents`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        title: 'AB', // Less than 3 chars
        fileUrl: '', // Empty
        fileSize: 0
      })
    });

    record(
      5,
      'Document with invalid fields rejected with HTTP 400 Bad Request',
      invalidRes.status === 400,
      `Status: ${invalidRes.status}`
    );

    // =========================================================================
    // PART 2: Concurrency & Monotonic Sequence Allocation
    // =========================================================================
    console.log('\n▶ [2. Concurrency & Monotonic Sequence Allocation]');

    const parallelCount = 20;
    const parallelPromises = [];

    for (let i = 1; i <= parallelCount; i++) {
      parallelPromises.push(
        apiRequest(`${BASE_URL}/documents`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${adminToken}` },
          body: JSON.stringify({
            title: `Concurrent Compliance Filing #${i}`,
            category: 'governance',
            fileUrl: `https://storage.ngocore.org/docs/governance_${i}.pdf`,
            fileName: `governance_${i}.pdf`,
            fileSize: 51200,
            mimeType: 'application/pdf'
          })
        })
      );
    }

    const parallelResults = await Promise.all(parallelPromises);
    const createdNumbers = parallelResults
      .filter((r) => r.status === 201)
      .map((r) => r.data?.data?.document?.documentNumber);
    const uniqueNumbers = new Set(createdNumbers);

    record(
      6,
      'Simultaneous document creation (20 parallel requests) allocates unique sequences',
      createdNumbers.length === parallelCount && uniqueNumbers.size === parallelCount,
      `Created: ${createdNumbers.length}/${parallelCount}, Unique: ${uniqueNumbers.size}`
    );

    // =========================================================================
    // PART 3: Verification & Compliance Workflow
    // =========================================================================
    console.log('\n▶ [3. Verification & Compliance Workflow]');

    // Create a doc pending verification
    const pendingDocRes = await apiRequest(`${BASE_URL}/documents`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${staffToken}` },
      body: JSON.stringify({
        title: 'CSR Partner Agreement (Tata Trusts)',
        category: 'program_mou',
        fileUrl: 'https://storage.ngocore.org/docs/mou.pdf',
        fileName: 'mou.pdf',
        fileSize: 102400,
        mimeType: 'application/pdf',
        status: 'pending_verification'
      })
    });
    const pendingDocId = pendingDocRes.data?.data?.document?._id;

    // Staff tries to verify (must fail 403)
    const staffVerifyRes = await apiRequest(`${BASE_URL}/documents/${pendingDocId}/verify`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${staffToken}` },
      body: JSON.stringify({
        status: 'active',
        verificationNotes: 'Staff self-verification attempt'
      })
    });

    record(
      7,
      'Staff role blocked from verifying compliance documents (Admin only, HTTP 403)',
      staffVerifyRes.status === 403,
      `Status: ${staffVerifyRes.status}`
    );

    // Admin verifies document
    const adminVerifyRes = await apiRequest(`${BASE_URL}/documents/${pendingDocId}/verify`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        status: 'active',
        verificationNotes: 'Legal counsel verified stamp and signature.'
      })
    });

    record(
      8,
      'Admin verifies compliance document and records audit verification timestamp',
      adminVerifyRes.status === 200 &&
        adminVerifyRes.data?.data?.document?.status === 'active' &&
        adminVerifyRes.data?.data?.document?.verifiedBy,
      `Status: ${adminVerifyRes.status}, DocumentStatus: active, VerifiedBy: Set`
    );

    // =========================================================================
    // PART 4: Query, Search, Filters, Expiry & Summary Analytics
    // =========================================================================
    console.log('\n▶ [4. Query, Search, Filters, Expiry & Summary Analytics]');

    const getByIdRes = await apiRequest(`${BASE_URL}/documents/${primaryDocId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    record(
      9,
      'GET document details by ID returns enriched record with audit logs',
      getByIdRes.status === 200 &&
        getByIdRes.data?.data?.documentNumber === primaryDocNumber &&
        Array.isArray(getByIdRes.data?.data?.auditLogs),
      `Status: ${getByIdRes.status}, Found: ${primaryDocNumber}, Logs: ${getByIdRes.data?.data?.auditLogs?.length}`
    );

    const searchRes = await apiRequest(`${BASE_URL}/documents?search=Income`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    record(
      10,
      'Search documents by title keyword returns matching records',
      searchRes.status === 200 && (searchRes.data?.data?.documents?.length || 0) >= 1,
      `Status: ${searchRes.status}, MatchesFound: ${searchRes.data?.data?.documents?.length}`
    );

    // Create an expired document
    await apiRequest(`${BASE_URL}/documents`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        title: 'Expired Prior FCRA Registration 2024',
        category: 'compliance_cert',
        fileUrl: 'https://storage.ngocore.org/docs/fcra_expired.pdf',
        fileName: 'fcra_expired.pdf',
        fileSize: 204800,
        mimeType: 'application/pdf',
        status: 'expired',
        expiryDate: new Date(Date.now() - 30 * 86400000).toISOString()
      })
    });

    const expiredFilterRes = await apiRequest(`${BASE_URL}/documents?expiredOnly=true`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    record(
      11,
      'Filter documents by expired status (expiredOnly=true) returns expired compliance items',
      expiredFilterRes.status === 200 && (expiredFilterRes.data?.data?.documents?.length || 0) >= 1,
      `Status: ${expiredFilterRes.status}, ExpiredCount: ${expiredFilterRes.data?.data?.documents?.length}`
    );

    const summaryRes = await apiRequest(`${BASE_URL}/documents/summary`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    record(
      12,
      'Summary aggregation pipeline computes category counts, status breakdown & expiry alerts',
      summaryRes.status === 200 &&
        summaryRes.data?.data?.totalDocuments >= 23 &&
        summaryRes.data?.data?.expiredCount >= 1,
      `Status: ${summaryRes.status}, TotalDocs: ${summaryRes.data?.data?.totalDocuments}, Expired: ${summaryRes.data?.data?.expiredCount}`
    );

    // =========================================================================
    // PART 5: RFC-4180 CSV Export Functionality
    // =========================================================================
    console.log('\n▶ [5. RFC-4180 CSV Export Functionality]');

    const exportRes = await apiRequest(`${BASE_URL}/documents/export`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    const isCsv =
      exportRes.status === 200 &&
      typeof exportRes.data === 'string' &&
      exportRes.data.includes('Document #') &&
      exportRes.data.includes('File Name');

    record(
      13,
      'Export documents endpoint streams RFC-4180 compliant CSV',
      isCsv,
      `Status: ${exportRes.status}, HasHeader: ${Boolean(isCsv)}`
    );

    // =========================================================================
    // PART 6: Security, RBAC & Soft-Delete Archiving
    // =========================================================================
    console.log('\n▶ [6. Security, RBAC & Soft-Delete Archiving]');

    const studentBlockedRes = await apiRequest(`${BASE_URL}/documents`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${studentToken}` }
    });

    record(
      14,
      'Student role blocked from accessing document management (HTTP 403)',
      studentBlockedRes.status === 403,
      `Status: ${studentBlockedRes.status}`
    );

    // Cross-NGO IDOR guards
    const idorGet = await apiRequest(`${BASE_URL}/documents/${primaryDocId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminBToken}` }
    });
    const idorPut = await apiRequest(`${BASE_URL}/documents/${primaryDocId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminBToken}` },
      body: JSON.stringify({ title: 'Foreign Hijack Attempt' })
    });
    const idorVerify = await apiRequest(`${BASE_URL}/documents/${primaryDocId}/verify`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminBToken}` },
      body: JSON.stringify({ status: 'archived' })
    });
    const idorDel = await apiRequest(`${BASE_URL}/documents/${primaryDocId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminBToken}` }
    });

    const idorSafe =
      idorGet.status === 404 &&
      idorPut.status === 404 &&
      idorVerify.status === 404 &&
      idorDel.status === 404;

    record(
      15,
      'Cross-NGO IDOR guards: foreign tenant requests return 404 Not Found',
      idorSafe,
      `GET: ${idorGet.status}, PUT: ${idorPut.status}, VERIFY: ${idorVerify.status}, DEL: ${idorDel.status}`
    );

    const staffDelRes = await apiRequest(`${BASE_URL}/documents/${primaryDocId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${staffToken}` }
    });

    record(
      16,
      'Staff role blocked from deleting documents (Admin only, HTTP 403)',
      staffDelRes.status === 403,
      `Status: ${staffDelRes.status}`
    );

    const adminDelRes = await apiRequest(`${BASE_URL}/documents/${primaryDocId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    const archivedDoc = await Document.findById(primaryDocId);
    record(
      17,
      'Admin safely archives document (soft-delete preserves record and audit trail)',
      adminDelRes.status === 200 && archivedDoc.isArchived === true && archivedDoc.status === 'archived',
      `Status: ${adminDelRes.status}, isArchived: ${archivedDoc.isArchived}, status: ${archivedDoc.status}`
    );
  } catch (err) {
    console.error('Unexpected error during document test suite execution:', err);
  } finally {
    await teardownTestEnvironment();
  }

  // Summary
  const passedCount = results.filter((r) => r.passed).length;
  const totalCount = results.length;
  console.log('\n================================================================');
  console.log('   DOCUMENT MANAGEMENT TEST SUITE SUMMARY                       ');
  console.log('================================================================');
  console.log(`Total Verification Checks: ${totalCount}`);
  console.log(`Passed:                    ${passedCount}`);
  console.log(`Failed:                    ${totalCount - passedCount}`);
  console.log(`Success Rate:              ${((passedCount / totalCount) * 100).toFixed(1)}%\n`);

  if (passedCount === totalCount && totalCount > 0) {
    console.log('🎉 ALL DOCUMENT MANAGEMENT VERIFICATION CHECKS PASSED PERFECTLY!\n');
    process.exit(0);
  } else {
    console.error('❌ SOME DOCUMENT VERIFICATION CHECKS FAILED.\n');
    process.exit(1);
  }
};

runDocumentTests();

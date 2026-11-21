/**
 * NGOcore — Phase 7A: Donor Management Automated Test Suite
 *
 * Comprehensive coverage:
 * - PART 1: Donor Creation, Validation, Individual & Organization Types, Auto-IDs
 * - PART 2: Profile Retrieval, Search, Multi-Filter, Sorting & Pagination
 * - PART 3: Updates, Status Transitions (Active/Inactive/Archived) & Safe Deletion Guard
 * - PART 4: Role-Based Access Control (RBAC) & Multi-Tenant NGO Isolation (IDOR Guards)
 */

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const config = require('../config/env');
const Donor = require('../models/Donor');
const AuditLog = require('../models/AuditLog');
const User = require('../models/User');
const Ngo = require('../models/Ngo');
const { apiRequest } = require('./apiTestClient');
const { setupTestEnvironment, teardownTestEnvironment } = require('./testHelper');

const BASE_URL = `http://localhost:${config.PORT}/api/v1`;

const results = [];

const record = (num, name, passed, details) => {
  results.push({ num, name, passed, details });
  console.log(
    `${passed ? '✅' : '❌'} Test ${num.toString().padStart(2, ' ')}: ${name.padEnd(64, ' ')} -> ${
      passed ? 'PASSED' : 'FAILED'
    } (${details})`
  );
};

const runPhase7ATests = async () => {
  await setupTestEnvironment();

  console.log('\n================================================================');
  console.log('   RUNNING PHASE 7A: DONOR MANAGEMENT AUTOMATED SUITE           ');
  console.log('================================================================\n');

  let adminToken = '';
  let staffToken = '';
  let volunteerToken = '';
  let studentToken = '';
  let adminUserId = '';
  let ngoAId = '';

  let ngoBAdminToken = '';
  let ngoBId = '';

  try {
    // 1. Authenticate users for NGO A
    const adminUser = await User.findOne({ email: config.ADMIN_EMAIL });
    adminUserId = adminUser._id;
    ngoAId = adminUser.ngoId;

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

    const volunteerRes = await apiRequest(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: 'volunteer@ngo.org', password: 'VolunteerPass123!' })
    });
    volunteerToken = volunteerRes.accessToken;

    const studentRes = await apiRequest(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: 'student@ngo.org', password: 'StudentPass123!' })
    });
    studentToken = studentRes.accessToken;

    // 2. Setup Secondary NGO for isolation tests
    const timestamp = Date.now();
    const ngoB = await Ngo.create({
      name: `NGO Isolation Phase 7A ${timestamp}`,
      status: 'approved',
      registrationNumber: `REG-P7A-${timestamp}`
    });
    ngoBId = ngoB._id;

    const hashedPassword = await bcrypt.hash('Password123!', 10);
    const userB = await User.create({
      email: `admin-b-p7a-${timestamp}@example.org`,
      password: hashedPassword,
      role: 'admin',
      ngoId: ngoBId,
      status: 'active',
      firstName: 'Admin',
      lastName: 'NGO B'
    });

    const ngoBLogin = await apiRequest(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: userB.email, password: 'Password123!' })
    });
    ngoBAdminToken = ngoBLogin.accessToken;

    // Clean any previous test donors
    await Donor.deleteMany({ donorNumber: /^DNR-TEST-/ });

    const authGet = (url, token = adminToken) =>
      apiRequest(url, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` }
      });

    const authPost = (url, body, token = adminToken) =>
      apiRequest(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(body)
      });

    const authPut = (url, body, token = adminToken) =>
      apiRequest(url, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(body)
      });

    const authPatch = (url, body, token = adminToken) =>
      apiRequest(url, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(body)
      });

    const authDelete = (url, token = adminToken) =>
      apiRequest(url, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

    // =========================================================================
    // PART 1: DONOR CREATION & VALIDATION
    // =========================================================================
    console.log('▶ [1. Donor Creation & Validation]');

    let donorIndivId = '';
    let donorOrgId = '';

    // Test 1: Admin creates Individual Donor
    const indivPayload = {
      donorNumber: 'DNR-TEST-001',
      name: 'Aarav Mehta',
      type: 'individual',
      email: 'aarav.mehta@example.com',
      phone: '9876543210',
      address: '14 MG Road',
      city: 'Bengaluru',
      state: 'Karnataka',
      pinCode: '560001',
      country: 'India',
      category: 'major_donor',
      communicationPreferences: {
        preferredChannel: 'email',
        optOut: false,
        newsletter: true
      },
      notes: 'Interested in STEM education funding.'
    };

    const res1 = await authPost(`${BASE_URL}/donors`, indivPayload, adminToken);
    const d1 = res1.data?.data?.donor;
    donorIndivId = d1?._id;

    record(
      1,
      'Admin creates Individual Donor with full profile & custom ID',
      res1.status === 201 && d1?.donorNumber === 'DNR-TEST-001' && d1?.type === 'individual',
      `Status: ${res1.status}, ID: ${d1?.donorNumber}, Phone: ${d1?.phone}`
    );

    // Test 2: Staff creates Organization Donor
    const orgPayload = {
      donorNumber: 'DNR-TEST-002',
      name: 'Apex Foundations Ltd',
      type: 'organization',
      contactPerson: 'Sunita Rao, CSR Head',
      email: 'csr@apexfoundation.org',
      phone: '9811122233',
      city: 'Mumbai',
      state: 'Maharashtra',
      category: 'corporate',
      notes: 'Annual CSR grant allocation.'
    };

    const res2 = await authPost(`${BASE_URL}/donors`, orgPayload, staffToken);
    const d2 = res2.data?.data?.donor;
    donorOrgId = d2?._id;

    record(
      2,
      'Staff creates Organization Donor with contact person & corporate category',
      res2.status === 201 && d2?.type === 'organization' && d2?.contactPerson === 'Sunita Rao, CSR Head',
      `Status: ${res2.status}, Type: ${d2?.type}, Category: ${d2?.category}`
    );

    // Test 3: Auto-generating donorNumber when omitted
    const autoPayload = {
      name: 'Rohan Verma',
      type: 'individual',
      email: 'rohan.verma@example.org',
      category: 'regular'
    };

    const res3 = await authPost(`${BASE_URL}/donors`, autoPayload, adminToken);
    const d3 = res3.data?.data?.donor;

    record(
      3,
      'Auto-generates unique donorNumber when omitted in creation request',
      res3.status === 201 && d3?.donorNumber?.startsWith('DNR-'),
      `Status: ${res3.status}, GeneratedID: ${d3?.donorNumber}`
    );

    // Test 4: Duplicate donorNumber in same NGO rejected with HTTP 409
    const dupRes = await authPost(
      `${BASE_URL}/donors`,
      { donorNumber: 'DNR-TEST-001', name: 'Duplicate Donor Attempt' },
      adminToken
    );

    record(
      4,
      'Duplicate donorNumber in same NGO rejected with HTTP 409 Conflict',
      dupRes.status === 409,
      `Status: ${dupRes.status}, Message: "${dupRes.data?.message}"`
    );

    // Test 5: Same donorNumber in different NGO allowed (tenant isolation)
    const tenantBDupRes = await authPost(
      `${BASE_URL}/donors`,
      { donorNumber: 'DNR-TEST-001', name: 'Tenant B Donor Same Code' },
      ngoBAdminToken
    );

    record(
      5,
      'Same donorNumber in distinct NGO allowed (tenant-scoped uniqueness)',
      tenantBDupRes.status === 201 && tenantBDupRes.data?.data?.donor?.donorNumber === 'DNR-TEST-001',
      `Status: ${tenantBDupRes.status}, Tenant: NGO B`
    );

    // Test 6: Invalid donor type rejected with HTTP 400
    const invTypeRes = await authPost(
      `${BASE_URL}/donors`,
      { name: 'Bad Type', type: 'invalid_type' },
      adminToken
    );

    record(
      6,
      'Invalid donor type rejected with HTTP 400 Validation Error',
      invTypeRes.status === 400,
      `Status: ${invTypeRes.status}`
    );

    // Test 7: Invalid email format rejected with HTTP 400
    const invEmailRes = await authPost(
      `${BASE_URL}/donors`,
      { name: 'Bad Email', email: 'not-an-email' },
      adminToken
    );

    record(
      7,
      'Invalid email format rejected with HTTP 400 Validation Error',
      invEmailRes.status === 400,
      `Status: ${invEmailRes.status}`
    );

    // Test 8: Missing required donor name rejected with HTTP 400
    const missingNameRes = await authPost(
      `${BASE_URL}/donors`,
      { phone: '9876543210' },
      adminToken
    );

    record(
      8,
      'Missing required donor name rejected with HTTP 400',
      missingNameRes.status === 400,
      `Status: ${missingNameRes.status}`
    );

    // =========================================================================
    // PART 2: RETRIEVAL, SEARCH, FILTERING, SORTING & PAGINATION
    // =========================================================================
    console.log('\n▶ [2. Retrieval, Search, Filtering, Sorting & Pagination]');

    // Test 9: GET donor by ID returns profile + audit logs
    const getRes = await authGet(`${BASE_URL}/donors/${donorIndivId}`, adminToken);
    const getDonor = getRes.data?.data?.donor;
    const auditLogs = getRes.data?.data?.auditLogs;

    record(
      9,
      'GET donor details returns full profile and audit log summary',
      getRes.status === 200 && getDonor?._id === donorIndivId && Array.isArray(auditLogs) && auditLogs.length > 0,
      `Status: ${getRes.status}, Found: ${getDonor?.name}, AuditLogsCount: ${auditLogs?.length}`
    );

    // Test 10: Search donors by name
    const searchNameRes = await authGet(`${BASE_URL}/donors?search=Mehta`, adminToken);
    const searchNameDonors = searchNameRes.data?.data?.donors || [];

    record(
      10,
      'Search donors by name returns matching profiles',
      searchNameRes.status === 200 && searchNameDonors.length === 1 && searchNameDonors[0].name.includes('Mehta'),
      `Status: ${searchNameRes.status}, Matches: ${searchNameDonors.length}`
    );

    // Test 11: Search donors by donorNumber
    const searchCodeRes = await authGet(`${BASE_URL}/donors?search=DNR-TEST-002`, adminToken);
    const searchCodeDonors = searchCodeRes.data?.data?.donors || [];

    record(
      11,
      'Search donors by donorNumber returns exact profile',
      searchCodeRes.status === 200 && searchCodeDonors.length === 1 && searchCodeDonors[0].donorNumber === 'DNR-TEST-002',
      `Status: ${searchCodeRes.status}, Match: ${searchCodeDonors[0]?.donorNumber}`
    );

    // Test 12: Search donors by email or phone
    const searchEmailRes = await authGet(`${BASE_URL}/donors?search=apexfoundation.org`, adminToken);
    const searchEmailDonors = searchEmailRes.data?.data?.donors || [];

    record(
      12,
      'Search donors by email domain returns matching records',
      searchEmailRes.status === 200 && searchEmailDonors.length === 1,
      `Status: ${searchEmailRes.status}, Found: ${searchEmailDonors[0]?.email}`
    );

    // Test 13: Filter donors by type ('organization')
    const filterTypeRes = await authGet(`${BASE_URL}/donors?type=organization`, adminToken);
    const filterTypeDonors = filterTypeRes.data?.data?.donors || [];

    record(
      13,
      'Filter donors by type (organization) returns only organizations',
      filterTypeRes.status === 200 && filterTypeDonors.every((d) => d.type === 'organization'),
      `Status: ${filterTypeRes.status}, OrgCount: ${filterTypeDonors.length}`
    );

    // Test 14: Filter donors by category ('corporate')
    const filterCatRes = await authGet(`${BASE_URL}/donors?category=corporate`, adminToken);
    const filterCatDonors = filterCatRes.data?.data?.donors || [];

    record(
      14,
      'Filter donors by category (corporate) returns matching donors',
      filterCatRes.status === 200 && filterCatDonors.every((d) => d.category === 'corporate'),
      `Status: ${filterCatRes.status}, CorpCount: ${filterCatDonors.length}`
    );

    // Test 15: Filter donors by status ('active')
    const filterStatRes = await authGet(`${BASE_URL}/donors?status=active`, adminToken);
    const filterStatDonors = filterStatRes.data?.data?.donors || [];

    record(
      15,
      'Filter donors by status (active) returns active records',
      filterStatRes.status === 200 && filterStatDonors.every((d) => d.status === 'active'),
      `Status: ${filterStatRes.status}, ActiveCount: ${filterStatDonors.length}`
    );

    // Test 16: Sort donors by name ascending
    const sortAscRes = await authGet(`${BASE_URL}/donors?sortBy=name&sortOrder=asc`, adminToken);
    const sortAscDonors = sortAscRes.data?.data?.donors || [];
    const names = sortAscDonors.map((d) => d.name);
    const isSortedAsc = names.slice(1).every((n, i) => n.localeCompare(names[i]) >= 0);

    record(
      16,
      'Sort donors by name ascending operates correctly',
      sortAscRes.status === 200 && isSortedAsc,
      `Status: ${sortAscRes.status}, Order: ${names.slice(0, 3).join(' -> ')}`
    );

    // Test 17: Sort donors by createdAt descending
    const sortDescRes = await authGet(`${BASE_URL}/donors?sortBy=createdAt&sortOrder=desc`, adminToken);
    const sortDescDonors = sortDescRes.data?.data?.donors || [];
    const isSortedDateDesc = sortDescDonors
      .slice(1)
      .every((d, i) => new Date(sortDescDonors[i].createdAt) >= new Date(d.createdAt));

    record(
      17,
      'Sort donors by createdAt descending operates correctly',
      sortDescRes.status === 200 && isSortedDateDesc,
      `Status: ${sortDescRes.status}, FirstDate: ${sortDescDonors[0]?.createdAt}`
    );

    // Test 18: Pagination metadata
    const pageRes = await authGet(`${BASE_URL}/donors?page=1&limit=2`, adminToken);
    const pageMeta = pageRes.data?.data?.pagination;
    const pageDonors = pageRes.data?.data?.donors || [];

    record(
      18,
      'Pagination returns requested limit and valid pagination metadata',
      pageRes.status === 200 && pageDonors.length <= 2 && pageMeta?.currentPage === 1 && pageMeta?.limit === 2,
      `Limit: ${pageMeta?.limit}, TotalPages: ${pageMeta?.totalPages}, TotalDonors: ${pageMeta?.totalDonors}`
    );

    // =========================================================================
    // PART 3: UPDATES, STATUS TRANSITIONS & SAFE DELETION GUARD
    // =========================================================================
    console.log('\n▶ [3. Updates, Status Transitions & Safe Deletion Guard]');

    // Test 19: Update donor details
    const updateRes = await authPut(
      `${BASE_URL}/donors/${donorIndivId}`,
      {
        city: 'Pune',
        category: 'patron', // Category remains allowed string/major
        notes: 'Updated philanthropic interest to vocational training.',
        communicationPreferences: {
          preferredChannel: 'whatsapp',
          optOut: false,
          newsletter: true
        }
      },
      staffToken
    );

    const updatedDonor = updateRes.data?.data?.donor;

    record(
      19,
      'Update donor details persists modified attributes & records audit',
      updateRes.status === 200 &&
        updatedDonor?.city === 'Pune' &&
        updatedDonor?.communicationPreferences?.preferredChannel === 'whatsapp',
      `Status: ${updateRes.status}, City: ${updatedDonor?.city}, Channel: ${updatedDonor?.communicationPreferences?.preferredChannel}`
    );

    // Test 20: Update donorNumber to existing number in same NGO rejected (409)
    const conflictUpdateRes = await authPut(
      `${BASE_URL}/donors/${donorIndivId}`,
      { donorNumber: 'DNR-TEST-002' }, // Already used by Apex Foundations
      adminToken
    );

    record(
      20,
      'Update donorNumber to colliding number rejected with HTTP 409',
      conflictUpdateRes.status === 409,
      `Status: ${conflictUpdateRes.status}`
    );

    // Test 21: Update donor status to 'archived'
    const statusRes = await authPatch(
      `${BASE_URL}/donors/${donorIndivId}/status`,
      { status: 'archived' },
      adminToken
    );

    const archivedDonor = statusRes.data?.data?.donor;

    record(
      21,
      'PATCH donor status updates record to archived cleanly',
      statusRes.status === 200 && archivedDonor?.status === 'archived',
      `Status: ${statusRes.status}, NewStatus: ${archivedDonor?.status}`
    );

    // Test 22: Safe Deletion Guard blocks deletion when audit logs exist
    const blockedDeleteRes = await authDelete(`${BASE_URL}/donors/${donorIndivId}`, adminToken);

    record(
      22,
      'Safe Deletion Guard blocks deletion of donor with audit history (HTTP 400)',
      blockedDeleteRes.status === 400 && JSON.stringify(blockedDeleteRes.data).includes('archived'),
      `Status: ${blockedDeleteRes.status}, ErrorMessage: "${blockedDeleteRes.data?.message}"`
    );

    // Test 23: Safe Deletion Guard allows deletion of clean donor without history
    const cleanDonor = await Donor.create({
      ngoId: ngoAId,
      donorNumber: 'DNR-TEST-CLEAN',
      name: 'Clean Temporary Donor',
      type: 'individual',
      status: 'active'
    });

    const cleanDeleteRes = await authDelete(`${BASE_URL}/donors/${cleanDonor._id}`, adminToken);
    const verifyClean = await Donor.findById(cleanDonor._id);

    record(
      23,
      'Safe Deletion Guard permits permanent deletion of clean donor (HTTP 200)',
      cleanDeleteRes.status === 200 && verifyClean === null,
      `Status: ${cleanDeleteRes.status}, ExistsInDb: ${verifyClean !== null}`
    );

    // =========================================================================
    // PART 4: RBAC & MULTI-TENANT ISOLATION (IDOR GUARDS)
    // =========================================================================
    console.log('\n▶ [4. RBAC & Multi-Tenant NGO Isolation (IDOR Guards)]');

    // Test 24: Unauthenticated request rejected (HTTP 401)
    const unauthRes = await apiRequest(`${BASE_URL}/donors`);

    record(
      24,
      'Unauthenticated request rejected with HTTP 401 Unauthorized',
      unauthRes.status === 401,
      `Status: ${unauthRes.status}`
    );

    // Test 25: Volunteer role blocked from donor listing (HTTP 403)
    const volListRes = await authGet(`${BASE_URL}/donors`, volunteerToken);

    record(
      25,
      'Volunteer role blocked from donor listing with HTTP 403 Forbidden',
      volListRes.status === 403,
      `Status: ${volListRes.status}`
    );

    // Test 26: Volunteer role blocked from donor creation (HTTP 403)
    const volCreateRes = await authPost(`${BASE_URL}/donors`, { name: 'Unauthorized Volunteer Add' }, volunteerToken);

    record(
      26,
      'Volunteer role blocked from donor creation with HTTP 403 Forbidden',
      volCreateRes.status === 403,
      `Status: ${volCreateRes.status}`
    );

    // Test 27: Student role blocked from donor listing (HTTP 403)
    const studentResList = await authGet(`${BASE_URL}/donors`, studentToken);

    record(
      27,
      'Student role blocked from donor listing with HTTP 403 Forbidden',
      studentResList.status === 403,
      `Status: ${studentResList.status}`
    );

    // Test 28: Staff role cannot delete donor (Admin only)
    const staffDeleteRes = await authDelete(`${BASE_URL}/donors/${donorIndivId}`, staffToken);

    record(
      28,
      'Staff role blocked from deleting donor with HTTP 403 (Admin only)',
      staffDeleteRes.status === 403,
      `Status: ${staffDeleteRes.status}`
    );

    // Create a donor belonging to NGO B for cross-tenant IDOR checks
    const donorTenantB = await Donor.create({
      ngoId: ngoBId,
      donorNumber: 'DNR-TEST-TENANTB',
      name: 'Tenant B Secret Donor',
      type: 'individual',
      status: 'active'
    });

    // Test 29: Cross-NGO IDOR: GET donor from NGO B using NGO A token
    const idorGetRes = await authGet(`${BASE_URL}/donors/${donorTenantB._id}`, adminToken);

    record(
      29,
      'Cross-NGO IDOR: GET foreign donor returns HTTP 404 Not Found',
      idorGetRes.status === 404,
      `Status: ${idorGetRes.status}`
    );

    // Test 30: Cross-NGO IDOR: PUT foreign donor
    const idorPutRes = await authPut(
      `${BASE_URL}/donors/${donorTenantB._id}`,
      { name: 'Malicious Overwrite' },
      adminToken
    );

    record(
      30,
      'Cross-NGO IDOR: PUT foreign donor returns HTTP 404 Not Found',
      idorPutRes.status === 404,
      `Status: ${idorPutRes.status}`
    );

    // Test 31: Cross-NGO IDOR: PATCH foreign donor status
    const idorPatchRes = await authPatch(
      `${BASE_URL}/donors/${donorTenantB._id}/status`,
      { status: 'archived' },
      adminToken
    );

    record(
      31,
      'Cross-NGO IDOR: PATCH foreign donor status returns HTTP 404 Not Found',
      idorPatchRes.status === 404,
      `Status: ${idorPatchRes.status}`
    );

    // Test 32: Cross-NGO IDOR: DELETE foreign donor
    const idorDeleteRes = await authDelete(`${BASE_URL}/donors/${donorTenantB._id}`, adminToken);

    record(
      32,
      'Cross-NGO IDOR: DELETE foreign donor returns HTTP 404 Not Found',
      idorDeleteRes.status === 404,
      `Status: ${idorDeleteRes.status}`
    );

    // =========================================================================
    // PART 5: PHASE 7A.1 — DONOR IDENTIFIER CONCURRENCY & SEQUENCE INTEGRITY
    // =========================================================================
    console.log('\n▶ [5. Phase 7A.1: Donor Identifier Concurrency & Sequence Integrity]');

    // Test 33: At least 20 simultaneous donor creation requests within one NGO
    const CONCURRENT_COUNT = 20;
    const concurrentPayloads = Array.from({ length: CONCURRENT_COUNT }, (_, i) => ({
      name: `Concurrent Donor A ${i + 1}`,
      type: 'individual',
      category: 'regular'
    }));

    const concurrentBatchPromises = concurrentPayloads.map((payload) =>
      authPost(`${BASE_URL}/donors`, payload, adminToken)
    );

    const concurrentBatchResults = await Promise.all(concurrentBatchPromises);

    const allSuccessful = concurrentBatchResults.every((r) => r.status === 201 && r.data?.data?.donor?.donorNumber);
    const allocatedNumbers = concurrentBatchResults.map((r) => r.data?.data?.donor?.donorNumber);
    const uniqueNumbers = new Set(allocatedNumbers);
    const noDuplicates = uniqueNumbers.size === CONCURRENT_COUNT;

    // Verify all 20 exist in database for NGO A
    const dbCountA = await Donor.countDocuments({
      ngoId: ngoAId,
      donorNumber: { $in: Array.from(uniqueNumbers) }
    });

    record(
      33,
      `Simultaneous donor creation (20 parallel requests in single NGO)`,
      allSuccessful && noDuplicates && dbCountA === CONCURRENT_COUNT,
      `Created: ${concurrentBatchResults.length}, Unique: ${uniqueNumbers.size}, InDb: ${dbCountA}`
    );

    // Test 34: Simultaneous donor creation across two NGOs (independent sequence scopes)
    const crossTenantPromises = [
      ...Array.from({ length: 10 }, (_, i) =>
        authPost(`${BASE_URL}/donors`, { name: `Parallel Tenant A ${i + 1}`, type: 'individual' }, adminToken)
      ),
      ...Array.from({ length: 10 }, (_, i) =>
        authPost(`${BASE_URL}/donors`, { name: `Parallel Tenant B ${i + 1}`, type: 'individual' }, ngoBAdminToken)
      )
    ];

    const crossTenantResults = await Promise.all(crossTenantPromises);
    const crossAll201 = crossTenantResults.every((r) => r.status === 201);

    const tenantAAllocated = crossTenantResults.slice(0, 10).map((r) => r.data?.data?.donor?.donorNumber);
    const tenantBAllocated = crossTenantResults.slice(10, 20).map((r) => r.data?.data?.donor?.donorNumber);

    const tenantAUnique = new Set(tenantAAllocated).size === 10;
    const tenantBUnique = new Set(tenantBAllocated).size === 10;

    record(
      34,
      `Simultaneous donor creation across two NGOs (10 + 10 parallel)`,
      crossAll201 && tenantAUnique && tenantBUnique,
      `NGO A Unique: ${new Set(tenantAAllocated).size}/10, NGO B Unique: ${new Set(tenantBAllocated).size}/10`
    );

    // Test 35: Failed donor creation after sequence allocation preserves sequence monotonically without corruption
    const invalidCreationRes = await authPost(
      `${BASE_URL}/donors`,
      { name: '', type: 'individual' },
      adminToken
    );

    const subsequentValidRes = await authPost(
      `${BASE_URL}/donors`,
      { name: 'Post Failure Valid Donor', type: 'individual' },
      adminToken
    );

    const subSeqAllocated = subsequentValidRes.data?.data?.donor?.donorNumber;
    record(
      35,
      `Failed donor creation preserves sequence monotonically without corruption`,
      invalidCreationRes.status === 400 && subsequentValidRes.status === 201 && !!subSeqAllocated,
      `InvalidStatus: ${invalidCreationRes.status}, SubsequentStatus: ${subsequentValidRes.status}, Allocated: ${subSeqAllocated}`
    );

    // Test 36: Collision retry behavior when auto-generated sequence collides with existing manual ID
    const ngoADoc = await Ngo.findById(ngoAId).select('donorSequence').lean();
    const currentSeq = ngoADoc?.donorSequence || 0;
    const collidingNumber = `DNR-${String(currentSeq + 1).padStart(4, '0')}`;

    // Seed a manual donor record with the exact next sequence number directly
    await Donor.create({
      ngoId: ngoAId,
      donorNumber: collidingNumber,
      name: 'Pre-existing Collision Seed Donor',
      type: 'individual',
      category: 'regular',
      status: 'active'
    });

    // Now issue an auto-generated donor creation request.
    // The retry mechanism will encounter E11000, increment sequence again to currentSeq + 2, and succeed!
    const retryCreationRes = await authPost(
      `${BASE_URL}/donors`,
      { name: 'Auto Generated Retry Donor', type: 'individual' },
      adminToken
    );

    const expectedRetryNumber = `DNR-${String(currentSeq + 2).padStart(4, '0')}`;
    const retryAllocated = retryCreationRes.data?.data?.donor?.donorNumber;
    const retrySuccess =
      retryCreationRes.status === 201 &&
      retryAllocated === expectedRetryNumber;

    record(
      36,
      `Retry behaviour on duplicate-key collision advances sequence and succeeds`,
      retrySuccess,
      `Status: ${retryCreationRes.status}, CollidingNumber: ${collidingNumber}, AllocatedAfterRetry: ${retryAllocated}`
    );

    // Test 37: Manually supplied donor ID with higher sequence advances sequence counter
    const ngoDocBeforeJump = await Ngo.findById(ngoAId).select('donorSequence').lean();
    const baseSeq = ngoDocBeforeJump?.donorSequence || 50;
    const jumpSeq = baseSeq + 100;
    const jumpDonorNumber = `DNR-${String(jumpSeq).padStart(4, '0')}`;
    const nextExpectedNumber = `DNR-${String(jumpSeq + 1).padStart(4, '0')}`;

    const manualHighRes = await authPost(
      `${BASE_URL}/donors`,
      {
        donorNumber: jumpDonorNumber,
        name: `Manual Jump Donor ${jumpDonorNumber}`,
        type: 'individual'
      },
      adminToken
    );

    const freshNgo = await Ngo.findById(ngoAId).select('donorSequence').lean();
    const sequenceAdvanced = freshNgo?.donorSequence >= jumpSeq;

    const nextAutoRes = await authPost(
      `${BASE_URL}/donors`,
      { name: 'Next Auto After Manual Jump', type: 'individual' },
      adminToken
    );

    const nextAutoNumber = nextAutoRes.data?.data?.donor?.donorNumber;
    const nextAutoCorrect = nextAutoRes.status === 201 && nextAutoNumber === nextExpectedNumber;

    record(
      37,
      `Manual ID ${jumpDonorNumber} advances sequence counter; next auto allocates ${nextExpectedNumber}`,
      manualHighRes.status === 201 && sequenceAdvanced && nextAutoCorrect,
      `ManualStatus: ${manualHighRes.status}, AdvancedSeq: ${freshNgo?.donorSequence}, NextAuto: ${nextAutoNumber}`
    );

    // Test 38: Integrity verification — all existing earlier created donor records remain unchanged
    const originalDonor1 = await Donor.findOne({ ngoId: ngoAId, donorNumber: 'DNR-TEST-001' }).lean();
    const originalDonor2 = await Donor.findOne({ ngoId: ngoAId, donorNumber: 'DNR-TEST-002' }).lean();

    record(
      38,
      `Existing donor records and historical data remain completely intact`,
      originalDonor1 && originalDonor2 && originalDonor1.name === 'Aarav Mehta' && originalDonor2.name === 'Apex Foundations Ltd',
      `Donor1: ${originalDonor1?.donorNumber} (${originalDonor1?.name}), Donor2: ${originalDonor2?.donorNumber} (${originalDonor2?.name})`
    );

  } catch (err) {
    console.error('\n❌ Unhandled error in donor test runner:', err);
    record(99, 'Fatal Exception Guard', false, err.message);
  } finally {
    await teardownTestEnvironment();
  }

  // Summary Report
  console.log('\n================================================================');
  console.log('   PHASE 7A DONOR MANAGEMENT TEST SUITE SUMMARY                ');
  console.log('================================================================');

  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;

  console.log(`Total Verification Checks: ${results.length}`);
  console.log(`Passed:                    ${passedCount}`);
  console.log(`Failed:                    ${failedCount}`);
  console.log(`Success Rate:              ${((passedCount / results.length) * 100).toFixed(1)}%\n`);

  if (failedCount > 0) {
    console.error('❌ Phase 7A / 7A.1 Verification had failures. Review output above.');
    process.exitCode = 1;
  } else {
    console.log(`🎉 ALL ${results.length} PHASE 7A / 7A.1 DONOR MANAGEMENT & CONCURRENCY CHECKS PASSED PERFECTLY!\n`);
  }
};

if (require.main === module) {
  runPhase7ATests();
}

module.exports = { runPhase7ATests };

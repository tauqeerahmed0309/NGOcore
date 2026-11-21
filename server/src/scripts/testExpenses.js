/**
 * NGOcore — Expense Management Automated Test Suite
 *
 * Comprehensive coverage:
 * - PART 1: Expense Creation, Auto-Numbering, Custom IDs & Field Validation
 * - PART 2: Concurrency & Sequence Integrity (20 Parallel Single NGO + Multi-NGO)
 * - PART 3: Monetary Precision & Decimal Safeguards (>2 Decimals Rejected)
 * - PART 4: Approval Workflow & Separation of Duties (RBAC)
 * - PART 5: Rejection Workflow with Audit Reason
 * - PART 6: Query, Search, Multi-Filter, Sorting & Pagination
 * - PART 7: Single-Roundtrip MongoDB Aggregation Summary & KPI Analytics
 * - PART 8: CSV Export Functionality
 * - PART 9: Security, Multi-Tenant NGO Isolation (IDOR) & Role Access Controls
 */

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const config = require('../config/env');
const Expense = require('../models/Expense');
const Program = require('../models/Program');
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
    `${passed ? '✅' : '❌'} Test ${num.toString().padStart(2, ' ')}: ${name.padEnd(68, ' ')} -> ${
      passed ? 'PASSED' : 'FAILED'
    } (${details})`
  );
};

const runExpenseTests = async () => {
  await setupTestEnvironment();

  console.log('\n================================================================');
  console.log('   RUNNING EXPENSE MANAGEMENT AUTOMATED TEST SUITE              ');
  console.log('================================================================\n');

  let adminToken = '';
  let staffToken = '';
  let staff2Token = '';
  let volunteerToken = '';
  let studentToken = '';
  let ngoBAdminToken = '';

  let ngoAId = '';
  let ngoBId = '';
  let expense1Id = '';
  let testProgramId = '';

  const timestamp = Date.now();

  try {
    // -------------------------------------------------------------------------
    // Setup Authentication Tokens & Users
    // -------------------------------------------------------------------------
    const adminUser = await User.findOne({ email: config.ADMIN_EMAIL });
    if (!adminUser) {
      throw new Error(`Admin user ${config.ADMIN_EMAIL} not found in database.`);
    }
    ngoAId = adminUser.ngoId;

    const adminLoginRes = await apiRequest(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: config.ADMIN_EMAIL, password: config.ADMIN_PASSWORD })
    });
    adminToken = adminLoginRes.accessToken;

    const staffLoginRes = await apiRequest(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: 'staff@ngo.org', password: 'StaffPassword123!' })
    });
    staffToken = staffLoginRes.accessToken;

    // Create a secondary staff user in NGO A for separation of duties approval testing
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('StaffPassword123!', salt);

    const staff2User = await User.findOneAndUpdate(
      { email: `staff2-exp-${timestamp}@ngo.org` },
      {
        firstName: 'StaffTwo',
        lastName: 'ExpenseApprover',
        password: hashedPassword,
        role: 'staff',
        ngoId: ngoAId,
        status: 'active'
      },
      { upsert: true, returnDocument: 'after' }
    );

    const staff2LoginRes = await apiRequest(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: staff2User.email, password: 'StaffPassword123!' })
    });
    staff2Token = staff2LoginRes.accessToken;

    const volLoginRes = await apiRequest(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: 'volunteer@ngo.org', password: 'VolunteerPass123!' })
    });
    volunteerToken = volLoginRes.accessToken;

    const stuLoginRes = await apiRequest(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: 'student@ngo.org', password: 'StudentPass123!' })
    });
    studentToken = stuLoginRes.accessToken;

    // Create a secondary NGO B and admin for IDOR / cross-tenant isolation testing
    const ngoB = await Ngo.create({
      name: `Tenant NGO B (Expenses) ${timestamp}`,
      status: 'approved',
      registrationNumber: `REG-EXP-${timestamp}`
    });
    ngoBId = ngoB._id;

    const adminBUser = await User.findOneAndUpdate(
      { email: `admin-b-exp-${timestamp}@example.org` },
      {
        firstName: 'AdminB',
        lastName: 'TenantB',
        password: hashedPassword,
        role: 'admin',
        ngoId: ngoBId,
        status: 'active'
      },
      { upsert: true, returnDocument: 'after' }
    );

    const adminBLoginRes = await apiRequest(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: adminBUser.email, password: 'StaffPassword123!' })
    });
    ngoBAdminToken = adminBLoginRes.accessToken;

    // Helper authenticated requests
    const authPost = (url, body, token) =>
      apiRequest(url, { method: 'POST', body: JSON.stringify(body), headers: { Authorization: `Bearer ${token}` } });
    const authGet = (url, token) =>
      apiRequest(url, { method: 'GET', headers: { Authorization: `Bearer ${token}` } });
    const authPut = (url, body, token) =>
      apiRequest(url, { method: 'PUT', body: JSON.stringify(body), headers: { Authorization: `Bearer ${token}` } });
    const authPatch = (url, body, token) =>
      apiRequest(url, { method: 'PATCH', body: JSON.stringify(body), headers: { Authorization: `Bearer ${token}` } });
    const authDelete = (url, token) =>
      apiRequest(url, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });

    // Seed a Program in NGO A to test linked expenses
    const program = await Program.create({
      code: `EXP-PRG-${timestamp}`,
      name: 'Vocational Training Initiative',
      type: 'course',
      category: 'Education',
      capacity: 25,
      ngoId: ngoAId,
      status: 'active',
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    });
    testProgramId = program._id;

    // =========================================================================
    // PART 1: EXPENSE CREATION, AUTO-NUMBERING & VALIDATION
    // =========================================================================
    console.log('▶ [1. Expense Creation, Auto-Numbering & Field Validation]');

    // Test 1: Admin records operational expense with auto-numbering (EXP-XXXX)
    const exp1Res = await authPost(
      `${BASE_URL}/expenses`,
      {
        title: 'Office Broadband Internet & Utilities',
        amount: 3500.5,
        currency: 'INR',
        category: 'operational',
        paymentMethod: 'bank_transfer',
        vendor: 'Airtel Enterprise Solutions',
        transactionReference: `BB-EXP-${timestamp}`,
        notes: 'Monthly high-speed fiber lease line'
      },
      adminToken
    );

    const exp1 = exp1Res.data?.data?.expense;
    expense1Id = exp1?._id;

    record(
      1,
      'Admin records operational expense with auto-numbering & vendor details',
      exp1Res.status === 201 && exp1?.expenseNumber?.startsWith('EXP-') && exp1?.amount === 3500.5,
      `Status: ${exp1Res.status}, ID: ${exp1?.expenseNumber}, Amount: ${exp1?.currency} ${exp1?.amount}`
    );

    // Test 2: Staff records program-linked expense with custom fields
    const exp2Res = await authPost(
      `${BASE_URL}/expenses`,
      {
        title: 'Classroom Study Materials & Textbooks',
        amount: 14500,
        currency: 'INR',
        category: 'education',
        paymentMethod: 'upi',
        vendor: 'Orient Blackswan Publishers',
        programId: String(testProgramId),
        status: 'pending' // Created as pending for approval workflow testing
      },
      staffToken
    );

    const exp2 = exp2Res.data?.data?.expense;

    record(
      2,
      'Staff records program-linked expense in pending status for approval',
      exp2Res.status === 201 && exp2?.programId?._id === String(testProgramId) && exp2?.status === 'pending',
      `Status: ${exp2Res.status}, Program: ${exp2?.programId?.code}, Status: ${exp2?.status}`
    );

    // Test 3: Custom expense number accepted and validated
    const customNumber = `EXP-CUSTOM-${timestamp}`;
    const customExpRes = await authPost(
      `${BASE_URL}/expenses`,
      {
        expenseNumber: customNumber,
        title: 'Annual Auditing & Legal Compliance Fees',
        amount: 25000,
        category: 'operational',
        paymentMethod: 'cheque',
        vendor: 'KPMG India Advisory'
      },
      adminToken
    );

    record(
      3,
      'Custom expense number accepted and persisted cleanly',
      customExpRes.status === 201 && customExpRes.data?.data?.expense?.expenseNumber === customNumber,
      `Status: ${customExpRes.status}, Number: ${customExpRes.data?.data?.expense?.expenseNumber}`
    );

    // Test 4: Duplicate custom expense number in same NGO rejected with HTTP 409 Conflict
    const dupExpRes = await authPost(
      `${BASE_URL}/expenses`,
      {
        expenseNumber: customNumber,
        title: 'Collision Attempt on Custom Number',
        amount: 5000,
        paymentMethod: 'cash'
      },
      adminToken
    );

    record(
      4,
      'Duplicate custom expense number in same NGO rejected with HTTP 409 Conflict',
      dupExpRes.status === 409,
      `Status: ${dupExpRes.status}, Error: "${dupExpRes.data?.message}"`
    );

    // Test 5: Same expense number in distinct NGO tenant allowed (tenant-scoped uniqueness)
    const crossNgoExpRes = await authPost(
      `${BASE_URL}/expenses`,
      {
        expenseNumber: customNumber,
        title: 'Tenant B Legitimate Expense with Same Code',
        amount: 8000,
        paymentMethod: 'cash'
      },
      ngoBAdminToken
    );

    record(
      5,
      'Same expense number in distinct NGO allowed (tenant-scoped uniqueness)',
      crossNgoExpRes.status === 201,
      `Status: ${crossNgoExpRes.status}, Tenant: NGO B`
    );

    // Test 6: Missing title rejected with HTTP 400 Bad Request
    const missingTitleRes = await authPost(
      `${BASE_URL}/expenses`,
      { amount: 5000, paymentMethod: 'cash' },
      adminToken
    );

    record(
      6,
      'Missing required title rejected with HTTP 400 Bad Request',
      missingTitleRes.status === 400,
      `Status: ${missingTitleRes.status}`
    );

    // Test 7: Invalid payment method rejected with HTTP 400 Bad Request
    const invalidMethodRes = await authPost(
      `${BASE_URL}/expenses`,
      { title: 'Test Invalid Method', amount: 5000, paymentMethod: 'bitcoin' },
      adminToken
    );

    record(
      7,
      'Invalid payment method rejected with HTTP 400 Bad Request',
      invalidMethodRes.status === 400,
      `Status: ${invalidMethodRes.status}`
    );

    // =========================================================================
    // PART 2: CONCURRENCY & SEQUENCE INTEGRITY (ATOMIC ALLOCATION)
    // =========================================================================
    console.log('\n▶ [2. Concurrency & Sequence Integrity (Atomic Allocation)]');

    // Test 8: 20 simultaneous expense creation requests in single NGO
    const CONCURRENT_COUNT = 20;
    const concurrentPromises = Array.from({ length: CONCURRENT_COUNT }, (_, i) =>
      authPost(
        `${BASE_URL}/expenses`,
        {
          title: `Concurrent Field Expense ${i + 1}`,
          amount: 500 + i * 25,
          currency: 'INR',
          category: 'supplies',
          paymentMethod: 'cash'
        },
        adminToken
      )
    );

    const concurrentResults = await Promise.all(concurrentPromises);
    const all20Created = concurrentResults.every(
      (r) => r.status === 201 && r.data?.data?.expense?.expenseNumber
    );
    const allocatedExpNumbers = concurrentResults.map((r) => r.data?.data?.expense?.expenseNumber);
    const uniqueExpNumbers = new Set(allocatedExpNumbers);
    const noDuplicates = uniqueExpNumbers.size === CONCURRENT_COUNT;

    const dbExpCount = await Expense.countDocuments({
      ngoId: ngoAId,
      expenseNumber: { $in: Array.from(uniqueExpNumbers) }
    });

    record(
      8,
      'Simultaneous expense creation (20 parallel requests in single NGO)',
      all20Created && noDuplicates && dbExpCount === CONCURRENT_COUNT,
      `Created: ${concurrentResults.length}, Unique: ${uniqueExpNumbers.size}, InDb: ${dbExpCount}`
    );

    // Test 9: Simultaneous expense creation across two NGOs (10 for NGO A, 10 for NGO B)
    const crossTenantPromises = [
      ...Array.from({ length: 10 }, (_, i) =>
        authPost(
          `${BASE_URL}/expenses`,
          { title: `Parallel Tenant A ${i + 1}`, amount: 1200, paymentMethod: 'cash' },
          adminToken
        )
      ),
      ...Array.from({ length: 10 }, (_, i) =>
        authPost(
          `${BASE_URL}/expenses`,
          { title: `Parallel Tenant B ${i + 1}`, amount: 2400, paymentMethod: 'cash' },
          ngoBAdminToken
        )
      )
    ];

    const crossTenantResults = await Promise.all(crossTenantPromises);
    const crossAll201 = crossTenantResults.every((r) => r.status === 201);
    const tenantAExp = crossTenantResults.slice(0, 10).map((r) => r.data?.data?.expense?.expenseNumber);
    const tenantBExp = crossTenantResults.slice(10, 20).map((r) => r.data?.data?.expense?.expenseNumber);

    const tenantAUnique = new Set(tenantAExp).size === 10;
    const tenantBUnique = new Set(tenantBExp).size === 10;

    record(
      9,
      'Simultaneous expense creation across two NGOs (10 + 10 parallel)',
      crossAll201 && tenantAUnique && tenantBUnique,
      `NGO A Unique: ${new Set(tenantAExp).size}/10, NGO B Unique: ${new Set(tenantBExp).size}/10`
    );

    // =========================================================================
    // PART 3: MONETARY PRECISION & DECIMAL SAFEGUARDS
    // =========================================================================
    console.log('\n▶ [3. Monetary Precision & Decimal Safeguards]');

    // Test 10: Amounts with >2 decimal places strictly rejected with HTTP 400
    const excessive1 = await authPost(
      `${BASE_URL}/expenses`,
      { title: 'Bad Decimals 1', amount: 199.999, paymentMethod: 'cash' },
      adminToken
    );
    const excessive2 = await authPost(
      `${BASE_URL}/expenses`,
      { title: 'Bad Decimals 2', amount: 12.3456, paymentMethod: 'cash' },
      adminToken
    );
    const excessive3 = await authPost(
      `${BASE_URL}/expenses`,
      { title: 'Bad Decimals 3', amount: 0.004, paymentMethod: 'cash' },
      adminToken
    );

    // Valid 2-decimal amount accepted
    const validAmountRes = await authPost(
      `${BASE_URL}/expenses`,
      { title: 'Valid 2 Decimals', amount: 199.99, paymentMethod: 'cash' },
      adminToken
    );

    const precisionPassed =
      excessive1.status === 400 &&
      excessive2.status === 400 &&
      excessive3.status === 400 &&
      validAmountRes.status === 201 &&
      validAmountRes.data?.data?.expense?.amount === 199.99;

    record(
      10,
      'Monetary precision rejects >2 decimals (400) and accepts valid 2-decimal amounts (201)',
      precisionPassed,
      `199.999: ${excessive1.status}, 12.3456: ${excessive2.status}, 0.004: ${excessive3.status}, 199.99: ${validAmountRes.status}`
    );

    // Test 11: Negative or zero amounts rejected with HTTP 400 Bad Request
    const zeroRes = await authPost(
      `${BASE_URL}/expenses`,
      { title: 'Zero Amount', amount: 0, paymentMethod: 'cash' },
      adminToken
    );
    const negRes = await authPost(
      `${BASE_URL}/expenses`,
      { title: 'Negative Amount', amount: -50, paymentMethod: 'cash' },
      adminToken
    );

    record(
      11,
      'Negative and zero expense amounts rejected with HTTP 400 Bad Request',
      zeroRes.status === 400 && negRes.status === 400,
      `Zero: ${zeroRes.status}, Negative: ${negRes.status}`
    );

    // =========================================================================
    // PART 4: APPROVAL WORKFLOW & SEPARATION OF DUTIES (RBAC)
    // =========================================================================
    console.log('\n▶ [4. Approval Workflow & Separation of Duties (RBAC)]');

    // Test 12: Separation of duties: Staff member who created expense CANNOT approve it (403)
    const selfApproveRes = await authPatch(`${BASE_URL}/expenses/${exp2._id}/approve`, {}, staffToken);

    record(
      12,
      'Separation of duties: Staff who recorded expense blocked from approving it (403)',
      selfApproveRes.status === 403,
      `Status: ${selfApproveRes.status}, Message: "${selfApproveRes.data?.message}"`
    );

    // Test 13: Secondary staff member CAN approve the expense recorded by first staff
    const peerApproveRes = await authPatch(`${BASE_URL}/expenses/${exp2._id}/approve`, {}, staff2Token);

    record(
      13,
      'Secondary staff member approves expense recorded by peer staff member',
      peerApproveRes.status === 200 && peerApproveRes.data?.data?.expense?.status === 'approved',
      `Status: ${peerApproveRes.status}, ApprovedBy: ${peerApproveRes.data?.data?.expense?.approvedBy?.email}`
    );

    // Test 14: Approving an already approved expense rejected with HTTP 400 Bad Request
    const doubleApproveRes = await authPatch(`${BASE_URL}/expenses/${exp2._id}/approve`, {}, adminToken);

    record(
      14,
      'Approving already approved expense rejected with HTTP 400 Bad Request',
      doubleApproveRes.status === 400,
      `Status: ${doubleApproveRes.status}, Message: "${doubleApproveRes.data?.message}"`
    );

    // Test 15: Financial lock: updating amount on approved expense rejected for staff
    const updateAmountRes = await authPut(
      `${BASE_URL}/expenses/${exp2._id}`,
      { amount: 99999 },
      staff2Token
    );

    record(
      15,
      'Financial integrity safeguard blocks modifying amount on approved expense',
      updateAmountRes.status === 400,
      `Status: ${updateAmountRes.status}, Error: "${updateAmountRes.data?.message}"`
    );

    // Test 16: Non-financial update (notes, vendor) on approved expense is permitted
    const updateNoteRes = await authPut(
      `${BASE_URL}/expenses/${exp2._id}`,
      { notes: 'Updated vendor invoice serial number verified' },
      staff2Token
    );

    record(
      16,
      'Non-financial update (notes/vendor) on approved expense is permitted',
      updateNoteRes.status === 200 &&
        updateNoteRes.data?.data?.expense?.notes === 'Updated vendor invoice serial number verified',
      `Status: ${updateNoteRes.status}`
    );

    // =========================================================================
    // PART 5: REJECTION WORKFLOW WITH AUDIT REASON
    // =========================================================================
    console.log('\n▶ [5. Rejection Workflow with Audit Reason]');

    // Create a pending expense to test rejection
    const pendingToReject = await authPost(
      `${BASE_URL}/expenses`,
      {
        title: 'Dubious Hardware Purchase Claim',
        amount: 8500,
        paymentMethod: 'cash',
        status: 'pending'
      },
      staffToken
    );
    const rejectTargetId = pendingToReject.data?.data?.expense?._id;

    // Test 17: Rejection without mandatory reason rejected with HTTP 400
    const rejectNoReasonRes = await authPost(
      `${BASE_URL}/expenses/${rejectTargetId}/reject`,
      { reason: 'bad' }, // Too short (< 5 chars)
      adminToken
    );

    record(
      17,
      'Rejecting expense without mandatory descriptive reason rejected (HTTP 400)',
      rejectNoReasonRes.status === 400,
      `Status: ${rejectNoReasonRes.status}`
    );

    // Test 18: Rejecting expense with valid justification sets status to 'rejected'
    const rejectValidRes = await authPost(
      `${BASE_URL}/expenses/${rejectTargetId}/reject`,
      { reason: 'Missing official tax invoice and vendor GST proof' },
      adminToken
    );

    record(
      18,
      'Rejecting expense with justification sets status to "rejected" cleanly',
      rejectValidRes.status === 200 && rejectValidRes.data?.data?.expense?.status === 'rejected',
      `Status: ${rejectValidRes.status}, Reason: "${rejectValidRes.data?.data?.expense?.rejectionReason}"`
    );

    // Test 19: Approving or modifying a rejected expense is rejected with HTTP 400
    const modifyRejectedRes = await authPut(
      `${BASE_URL}/expenses/${rejectTargetId}`,
      { title: 'Attempt to revive' },
      adminToken
    );
    const approveRejectedRes = await authPatch(
      `${BASE_URL}/expenses/${rejectTargetId}/approve`,
      {},
      adminToken
    );

    record(
      19,
      'Modifying or approving a rejected expense is blocked (HTTP 400 Bad Request)',
      modifyRejectedRes.status === 400 && approveRejectedRes.status === 400,
      `Modify: ${modifyRejectedRes.status}, Approve: ${approveRejectedRes.status}`
    );

    // =========================================================================
    // PART 6: QUERY, SEARCH, MULTI-FILTER, SORTING & PAGINATION
    // =========================================================================
    console.log('\n▶ [6. Query, Search, Multi-Filter, Sorting & Pagination]');

    // Test 20: GET expense details by ID returns enriched record with audit logs
    const getDetailRes = await authGet(`${BASE_URL}/expenses/${expense1Id}`, adminToken);
    const fetchedExpense = getDetailRes.data?.data?.expense;
    const auditLogs = getDetailRes.data?.data?.auditLogs;

    record(
      20,
      'GET expense details by ID returns enriched record with creator and audit trail',
      getDetailRes.status === 200 && fetchedExpense?._id === String(expense1Id) && Array.isArray(auditLogs),
      `Status: ${getDetailRes.status}, Found: ${fetchedExpense?.expenseNumber}, AuditLogs: ${auditLogs?.length}`
    );

    // Test 21: Search expenses by title and vendor name
    const searchRes = await authGet(`${BASE_URL}/expenses?search=Broadband`, adminToken);
    const searchMatches = searchRes.data?.data?.expenses || [];

    record(
      21,
      'Search expenses by keyword returns matching records',
      searchRes.status === 200 && searchMatches.some((e) => e.title.includes('Broadband')),
      `Status: ${searchRes.status}, MatchesFound: ${searchMatches.length}`
    );

    // Test 22: Filter expenses by category, payment method, and status
    const filterRes = await authGet(
      `${BASE_URL}/expenses?category=education&paymentMethod=upi&status=approved`,
      adminToken
    );
    const filterMatches = filterRes.data?.data?.expenses || [];
    const allMatch = filterMatches.every(
      (e) => e.category === 'education' && e.paymentMethod === 'upi' && e.status === 'approved'
    );

    record(
      22,
      'Filter expenses by category, payment method, and status returns precise matches',
      filterRes.status === 200 && filterMatches.length > 0 && allMatch,
      `Status: ${filterRes.status}, MatchesCount: ${filterMatches.length}`
    );

    // Test 23: Sorting by amount and pagination metadata
    const pageRes = await authGet(`${BASE_URL}/expenses?limit=5&page=1&sortBy=amount&sortOrder=desc`, adminToken);
    const pageItems = pageRes.data?.data?.expenses || [];
    const pagination = pageRes.data?.data?.pagination;
    const isSortedDesc =
      pageItems.length < 2 || pageItems[0].amount >= pageItems[pageItems.length - 1].amount;

    record(
      23,
      'Pagination and amount sorting returns paginated records with metadata',
      pageRes.status === 200 && pageItems.length <= 5 && isSortedDesc && pagination?.totalExpenses > 0,
      `Limit: ${pagination?.limit}, TotalPages: ${pagination?.totalPages}, Total: ${pagination?.totalExpenses}`
    );

    // =========================================================================
    // PART 7: SINGLE-ROUNDTRIP MONGODB AGGREGATION SUMMARY & KPI ANALYTICS
    // =========================================================================
    console.log('\n▶ [7. Single-Roundtrip MongoDB Aggregation Summary & KPI Analytics]');

    // Test 24: GET expense summary computes currency-separated totals and breakdowns
    const summaryRes = await authGet(`${BASE_URL}/expenses/summary`, adminToken);
    const summary = summaryRes.data?.data?.summary;
    const inrSummary = summary?.totalsByCurrency?.INR;

    const summaryValid =
      summaryRes.status === 200 &&
      inrSummary &&
      inrSummary.gross > 0 &&
      inrSummary.approved > 0 &&
      summary?.statusCounts?.total > 0 &&
      summary?.categoryBreakdown &&
      summary?.paymentMethodBreakdown;

    record(
      24,
      'Summary aggregation pipeline computes multi-currency gross, approved & breakdowns',
      summaryValid,
      `Status: ${summaryRes.status}, INR Gross: ₹${inrSummary?.gross}, Approved: ₹${inrSummary?.approved}, Total: ${summary?.statusCounts?.total}`
    );

    // =========================================================================
    // PART 8: CSV EXPORT FUNCTIONALITY
    // =========================================================================
    console.log('\n▶ [8. CSV Export Functionality]');

    // Test 25: Export expenses to CSV generates RFC-4180 compliant file
    const csvExportRes = await apiRequest(`${BASE_URL}/expenses/export?format=csv`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    const isCsv = typeof csvExportRes.data === 'string' && csvExportRes.data.includes('Expense Records Report');

    record(
      25,
      'Export expenses endpoint generates RFC-4180 compliant CSV export',
      csvExportRes.status === 200 && isCsv,
      `Status: ${csvExportRes.status}, HasHeader: ${isCsv}`
    );

    // =========================================================================
    // PART 9: SECURITY, MULTI-TENANT NGO ISOLATION (IDOR) & RBAC
    // =========================================================================
    console.log('\n▶ [9. Security, Multi-Tenant NGO Isolation (IDOR) & RBAC]');

    // Test 26: Volunteer and Student roles blocked from accessing expenses (HTTP 403 Forbidden)
    const volListRes = await authGet(`${BASE_URL}/expenses`, volunteerToken);
    const stuListRes = await authGet(`${BASE_URL}/expenses`, studentToken);

    record(
      26,
      'Volunteer and Student roles blocked from accessing expense records (403)',
      volListRes.status === 403 && stuListRes.status === 403,
      `Volunteer: ${volListRes.status}, Student: ${stuListRes.status}`
    );

    // Test 27: Unauthenticated request rejected with HTTP 401 Unauthorized
    const unauthRes = await apiRequest(`${BASE_URL}/expenses`, { method: 'GET' });

    record(
      27,
      'Unauthenticated request rejected with HTTP 401 Unauthorized',
      unauthRes.status === 401,
      `Status: ${unauthRes.status}`
    );

    // Test 28: Cross-NGO IDOR protection: GET, PUT, APPROVE, REJECT, DELETE return HTTP 404 for foreign tenant
    const idorGetRes = await authGet(`${BASE_URL}/expenses/${expense1Id}`, ngoBAdminToken);
    const idorPutRes = await authPut(`${BASE_URL}/expenses/${expense1Id}`, { notes: 'IDOR attempt' }, ngoBAdminToken);
    const idorApproveRes = await authPatch(`${BASE_URL}/expenses/${expense1Id}/approve`, {}, ngoBAdminToken);
    const idorRejectRes = await authPost(`${BASE_URL}/expenses/${expense1Id}/reject`, { reason: 'Cross tenant reject' }, ngoBAdminToken);
    const idorDeleteRes = await authDelete(`${BASE_URL}/expenses/${expense1Id}`, ngoBAdminToken);

    const allIdor404 =
      idorGetRes.status === 404 &&
      idorPutRes.status === 404 &&
      idorApproveRes.status === 404 &&
      idorRejectRes.status === 404 &&
      idorDeleteRes.status === 404;

    record(
      28,
      'Cross-NGO IDOR guards: GET, PUT, APPROVE, REJECT, DELETE return 404 for foreign tenant',
      allIdor404,
      `GET: ${idorGetRes.status}, PUT: ${idorPutRes.status}, APPROVE: ${idorApproveRes.status}, REJECT: ${idorRejectRes.status}, DELETE: ${idorDeleteRes.status}`
    );

    // Test 29: Staff cannot delete an expense (Admin only)
    const staffDeleteRes = await authDelete(`${BASE_URL}/expenses/${expense1Id}`, staffToken);

    record(
      29,
      'Staff role blocked from deleting expense records (Admin only, 403)',
      staffDeleteRes.status === 403,
      `Status: ${staffDeleteRes.status}`
    );

    // Test 30: Admin safely archives expense with audit record
    const adminDeleteRes = await authDelete(`${BASE_URL}/expenses/${expense1Id}`, adminToken);
    const archivedExpenseInDb = await Expense.findById(expense1Id).lean();

    record(
      30,
      'Admin safely archives expense (soft-delete preserves audit trail)',
      adminDeleteRes.status === 200 && archivedExpenseInDb?.isArchived === true,
      `Status: ${adminDeleteRes.status}, isArchived: ${archivedExpenseInDb?.isArchived}`
    );

  } catch (err) {
    console.error('\n❌ Unhandled error in expense test runner:', err);
    record(99, 'Fatal Exception Guard', false, err.message);
  } finally {
    await teardownTestEnvironment();
  }

  // Summary Report
  console.log('\n================================================================');
  console.log('   EXPENSE MANAGEMENT TEST SUITE SUMMARY                        ');
  console.log('================================================================');

  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;

  console.log(`Total Verification Checks: ${results.length}`);
  console.log(`Passed:                    ${passedCount}`);
  console.log(`Failed:                    ${failedCount}`);
  console.log(`Success Rate:              ${((passedCount / results.length) * 100).toFixed(1)}%\n`);

  if (failedCount > 0) {
    console.error('❌ Expense Management Verification had failures. Review output above.');
    process.exitCode = 1;
  } else {
    console.log(`🎉 ALL ${results.length} EXPENSE MANAGEMENT VERIFICATION CHECKS PASSED PERFECTLY!\n`);
  }
};

if (require.main === module) {
  runExpenseTests();
}

module.exports = { runExpenseTests };

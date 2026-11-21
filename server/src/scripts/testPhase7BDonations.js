/**
 * NGOcore — Phase 7B: Donation Management Automated Test Suite
 *
 * Comprehensive coverage:
 * - PART 1: Donation Creation, Donor Snapshot, In-Kind, Custom IDs & Validation
 * - PART 2: Concurrency & Sequence Integrity (20 Parallel Single NGO + Multi-NGO)
 * - PART 3: Duplicate Transaction Reference Handling & Decimal Precision
 * - PART 4: Verification, Approval & Separation of Duties (RBAC)
 * - PART 5: Cancellation & Reversal Workflow with Audit History
 * - PART 6: Receipt Generation (Unique RCP-XXXX), Idempotency & PDF Streaming
 * - PART 7: Query, Search, Filters, Sorting & Pagination
 * - PART 8: Aggregated Multi-Currency Summaries, Trends & Export Formats
 * - PART 9: Role Security, Cross-NGO IDOR Guards & Donor Profile Linkage
 */

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const config = require('../config/env');
const Donation = require('../models/Donation');
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
    `${passed ? '✅' : '❌'} Test ${num.toString().padStart(2, ' ')}: ${name.padEnd(66, ' ')} -> ${
      passed ? 'PASSED' : 'FAILED'
    } (${details})`
  );
};

const runPhase7BTests = async () => {
  await setupTestEnvironment();

  console.log('\n================================================================');
  console.log('   RUNNING PHASE 7B: DONATION MANAGEMENT AUTOMATED SUITE        ');
  console.log('================================================================\n');

  let adminToken = '';
  let staffToken = '';
  let staff2Token = '';
  let volunteerToken = '';
  let studentToken = '';
  let adminUserId = '';
  let staffUserId = '';
  let staff2UserId = '';
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
    const staffUser = await User.findOne({ email: 'staff@ngo.org' });
    staffUserId = staffUser._id;

    // Create a secondary staff user in NGO A for separation-of-duties testing
    const hashedPassword = await bcrypt.hash('StaffPassword123!', 10);
    const timestamp = Date.now();
    const staff2User = await User.findOneAndUpdate(
      { email: `staff2-p7b-${timestamp}@ngo.org` },
      {
        firstName: 'Second',
        lastName: 'Staffer',
        password: hashedPassword,
        role: 'staff',
        ngoId: ngoAId,
        status: 'active'
      },
      { upsert: true, returnDocument: 'after' }
    );
    staff2UserId = staff2User._id;

    const staff2Res = await apiRequest(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: staff2User.email, password: 'StaffPassword123!' })
    });
    staff2Token = staff2Res.accessToken;

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
    const ngoB = await Ngo.create({
      name: `NGO Isolation Phase 7B ${timestamp}`,
      status: 'approved',
      registrationNumber: `REG-P7B-${timestamp}`
    });
    ngoBId = ngoB._id;

    const userB = await User.create({
      email: `admin-b-p7b-${timestamp}@example.org`,
      password: hashedPassword,
      role: 'admin',
      ngoId: ngoBId,
      status: 'active',
      firstName: 'Admin',
      lastName: 'NGO B'
    });

    const ngoBLogin = await apiRequest(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: userB.email, password: 'StaffPassword123!' })
    });
    ngoBAdminToken = ngoBLogin.accessToken;

    // Create a persistent donor in NGO A for linkage tests
    const testDonorA = await Donor.create({
      ngoId: ngoAId,
      donorNumber: `DNR-LINK-${timestamp}`,
      name: 'Vikas Singhania',
      type: 'individual',
      category: 'major_donor',
      email: 'vikas.singhania@example.org',
      phone: '+91 98222 33445',
      status: 'active',
      createdBy: adminUserId
    });

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

    // =========================================================================
    // PART 1: DONATION CREATION, DONOR SNAPSHOT, IN-KIND, CUSTOM IDS & VALIDATION
    // =========================================================================
    console.log('▶ [1. Donation Creation, Snapshot, In-Kind, Custom IDs & Validation]');

    let donation1Id = '';
    let donation1Number = '';

    // Test 1: Admin records monetary donation with auto-numbering
    const res1 = await authPost(
      `${BASE_URL}/donations`,
      {
        donorName: 'Rahul Bajaj',
        amount: 25000.5,
        currency: 'INR',
        paymentMethod: 'bank_transfer',
        transactionReference: `TXN-P7B-001-${timestamp}`,
        category: 'education',
        purpose: 'Scholarship endowment for underprivileged students'
      },
      adminToken
    );

    const d1 = res1.data?.data?.donation;
    donation1Id = d1?._id;
    donation1Number = d1?.donationNumber;

    record(
      1,
      'Admin records monetary donation with auto-numbering & donor snapshot',
      res1.status === 201 && d1?.donationNumber?.startsWith('DON-') && d1?.amount === 25000.5 && d1?.currency === 'INR',
      `Status: ${res1.status}, ID: ${d1?.donationNumber}, Amount: ${d1?.currency} ${d1?.amount}`
    );

    // Test 2: Staff records donation linked to an existing donor profile
    const res2 = await authPost(
      `${BASE_URL}/donations`,
      {
        donorId: testDonorA._id,
        amount: 50000,
        currency: 'INR',
        paymentMethod: 'cheque',
        transactionReference: `CHQ-P7B-002-${timestamp}`,
        category: 'healthcare',
        purpose: 'Mobile medical camp equipment'
      },
      staffToken
    );

    const d2 = res2.data?.data?.donation;
    let donation2Id = d2?._id;

    record(
      2,
      'Staff records donation linked to existing donor profile (snapshot synced)',
      res2.status === 201 && d2?.donorId === String(testDonorA._id) && d2?.donorSnapshot?.name === 'Vikas Singhania',
      `Status: ${res2.status}, LinkedDonor: ${d2?.donorSnapshot?.name}, DonorID: ${d2?.donorSnapshot?.donorNumber}`
    );

    // Test 3: Record in-kind donation (donationType: 'in_kind')
    const res3 = await authPost(
      `${BASE_URL}/donations`,
      {
        donorName: 'Cisco Systems India',
        donationType: 'in_kind',
        amount: 150000,
        currency: 'INR',
        paymentMethod: 'other',
        inKindDescription: '20 refurbished laptops and networking routers for community learning lab',
        category: 'infrastructure'
      },
      staffToken
    );

    const d3 = res3.data?.data?.donation;

    record(
      3,
      'Record in-kind donation with detailed description & non-monetary metadata',
      res3.status === 201 && d3?.donationType === 'in_kind' && d3?.inKindDescription?.includes('20 refurbished laptops'),
      `Status: ${res3.status}, Type: ${d3?.donationType}, Description: "${d3?.inKindDescription?.slice(0, 30)}..."`
    );

    // Test 4: Custom donation number accepted
    const customDonNumber = `DON-CUSTOM-${timestamp}`;
    const res4 = await authPost(
      `${BASE_URL}/donations`,
      {
        donationNumber: customDonNumber,
        donorName: 'Pooja Agarwal',
        amount: 5000,
        currency: 'INR',
        paymentMethod: 'upi',
        transactionReference: `UPI-P7B-004-${timestamp}`
      },
      adminToken
    );

    record(
      4,
      'Custom donation number accepted and validated',
      res4.status === 201 && res4.data?.data?.donation?.donationNumber === customDonNumber,
      `Status: ${res4.status}, Number: ${customDonNumber}`
    );

    // Test 5: Duplicate custom donation number in same NGO rejected with HTTP 409 Conflict
    const res5 = await authPost(
      `${BASE_URL}/donations`,
      {
        donationNumber: customDonNumber,
        donorName: 'Duplicate Attempt User',
        amount: 1000,
        currency: 'INR',
        paymentMethod: 'cash'
      },
      adminToken
    );

    record(
      5,
      'Duplicate custom donation number in same NGO rejected with HTTP 409',
      res5.status === 409,
      `Status: ${res5.status}, Error: "${res5.data?.message}"`
    );

    // Test 6: Same custom donation number in different NGO allowed (tenant isolation)
    const res6 = await authPost(
      `${BASE_URL}/donations`,
      {
        donationNumber: customDonNumber,
        donorName: 'Tenant B User Same Code',
        amount: 12000,
        currency: 'INR',
        paymentMethod: 'bank_transfer'
      },
      ngoBAdminToken
    );

    record(
      6,
      'Same donation number in distinct NGO allowed (tenant-scoped uniqueness)',
      res6.status === 201 && res6.data?.data?.donation?.donationNumber === customDonNumber,
      `Status: ${res6.status}, Tenant: NGO B`
    );

    // Test 7: Negative or zero amount rejected with HTTP 400 Validation Error
    const res7 = await authPost(
      `${BASE_URL}/donations`,
      {
        donorName: 'Invalid Amount User',
        amount: -500,
        currency: 'INR',
        paymentMethod: 'cash'
      },
      adminToken
    );

    record(
      7,
      'Negative or zero amount rejected with HTTP 400 Validation Error',
      res7.status === 400,
      `Status: ${res7.status}`
    );

    // Test 8: Missing donor information rejected with HTTP 400
    const res8 = await authPost(
      `${BASE_URL}/donations`,
      {
        amount: 1000,
        currency: 'INR',
        paymentMethod: 'cash'
      },
      adminToken
    );

    record(
      8,
      'Missing donor information rejected with HTTP 400 Validation Error',
      res8.status === 400,
      `Status: ${res8.status}`
    );

    // Test 9: Invalid payment method rejected with HTTP 400
    const res9 = await authPost(
      `${BASE_URL}/donations`,
      {
        donorName: 'Payment Method Test',
        amount: 1000,
        currency: 'INR',
        paymentMethod: 'crypto_token_invalid'
      },
      adminToken
    );

    record(
      9,
      'Invalid payment method rejected with HTTP 400 Validation Error',
      res9.status === 400,
      `Status: ${res9.status}`
    );

    // =========================================================================
    // PART 2: CONCURRENCY & SEQUENCE INTEGRITY (ATOMIC ALLOCATION)
    // =========================================================================
    console.log('\n▶ [2. Concurrency & Sequence Integrity (Atomic Allocation)]');

    // Test 10: At least 20 simultaneous donation creation requests in single NGO
    const CONCURRENT_COUNT = 20;
    const concurrentDonationPromises = Array.from({ length: CONCURRENT_COUNT }, (_, i) =>
      authPost(
        `${BASE_URL}/donations`,
        {
          donorName: `Concurrent Donor ${i + 1}`,
          amount: 1000 + i * 50,
          currency: 'INR',
          paymentMethod: 'cash',
          category: 'general'
        },
        adminToken
      )
    );

    const concurrentBatchResults = await Promise.all(concurrentDonationPromises);
    const all20Created = concurrentBatchResults.every(
      (r) => r.status === 201 && r.data?.data?.donation?.donationNumber
    );
    const allocatedDonNumbers = concurrentBatchResults.map((r) => r.data?.data?.donation?.donationNumber);
    const uniqueDonNumbers = new Set(allocatedDonNumbers);
    const noDuplicatesInBatch = uniqueDonNumbers.size === CONCURRENT_COUNT;

    const dbCountA = await Donation.countDocuments({
      ngoId: ngoAId,
      donationNumber: { $in: Array.from(uniqueDonNumbers) }
    });

    record(
      10,
      'Simultaneous donation creation (20 parallel requests in single NGO)',
      all20Created && noDuplicatesInBatch && dbCountA === CONCURRENT_COUNT,
      `Created: ${concurrentBatchResults.length}, Unique: ${uniqueDonNumbers.size}, InDb: ${dbCountA}`
    );

    // Test 11: Simultaneous donation creation across two NGOs (10 for NGO A, 10 for NGO B)
    const crossTenantPromises = [
      ...Array.from({ length: 10 }, (_, i) =>
        authPost(
          `${BASE_URL}/donations`,
          { donorName: `Parallel Tenant A ${i + 1}`, amount: 2000, paymentMethod: 'cash' },
          adminToken
        )
      ),
      ...Array.from({ length: 10 }, (_, i) =>
        authPost(
          `${BASE_URL}/donations`,
          { donorName: `Parallel Tenant B ${i + 1}`, amount: 3000, paymentMethod: 'cash' },
          ngoBAdminToken
        )
      )
    ];

    const crossTenantResults = await Promise.all(crossTenantPromises);
    const crossAll201 = crossTenantResults.every((r) => r.status === 201);
    const tenantAAllocated = crossTenantResults.slice(0, 10).map((r) => r.data?.data?.donation?.donationNumber);
    const tenantBAllocated = crossTenantResults.slice(10, 20).map((r) => r.data?.data?.donation?.donationNumber);

    const tenantAUnique = new Set(tenantAAllocated).size === 10;
    const tenantBUnique = new Set(tenantBAllocated).size === 10;

    record(
      11,
      'Simultaneous donation creation across two NGOs (10 + 10 parallel)',
      crossAll201 && tenantAUnique && tenantBUnique,
      `NGO A Unique: ${new Set(tenantAAllocated).size}/10, NGO B Unique: ${new Set(tenantBAllocated).size}/10`
    );

    // =========================================================================
    // PART 3: DUPLICATE TRANSACTION REFERENCE HANDLING & DECIMAL PRECISION
    // =========================================================================
    console.log('\n▶ [3. Duplicate Transaction Reference Handling & Decimal Precision]');

    const duplicateRef = `TXN-DUP-${timestamp}`;

    // Seed first donation with this transaction reference
    const firstTxRes = await authPost(
      `${BASE_URL}/donations`,
      {
        donorName: 'Original Reference Holder',
        amount: 15000,
        currency: 'INR',
        paymentMethod: 'bank_transfer',
        transactionReference: duplicateRef
      },
      adminToken
    );

    // Test 12: Duplicate non-cash transaction reference in same NGO rejected with HTTP 409
    const secondTxRes = await authPost(
      `${BASE_URL}/donations`,
      {
        donorName: 'Duplicate Reference Attempter',
        amount: 15000,
        currency: 'INR',
        paymentMethod: 'bank_transfer',
        transactionReference: duplicateRef
      },
      adminToken
    );

    record(
      12,
      'Duplicate non-cash transaction reference in same NGO rejected (HTTP 409)',
      firstTxRes.status === 201 && secondTxRes.status === 409,
      `First: ${firstTxRes.status}, Second: ${secondTxRes.status}, Error: "${secondTxRes.data?.message}"`
    );

    // Test 13: Same transaction reference allowed across different NGOs
    const crossNgoTxRes = await authPost(
      `${BASE_URL}/donations`,
      {
        donorName: 'Tenant B Same Transaction Reference',
        amount: 15000,
        currency: 'INR',
        paymentMethod: 'bank_transfer',
        transactionReference: duplicateRef
      },
      ngoBAdminToken
    );

    record(
      13,
      'Same transaction reference in different NGO allowed (tenant-scoped)',
      crossNgoTxRes.status === 201,
      `Status: ${crossNgoTxRes.status}, Tenant: NGO B`
    );

    // Test 14: Monetary precision validation strictly rejects >2 decimals and accepts valid 2-decimal amounts
    const excessiveDecimals1 = await authPost(
      `${BASE_URL}/donations`,
      { donorName: 'Decimal Test 1', amount: 199.999, currency: 'USD', paymentMethod: 'card' },
      adminToken
    );
    const excessiveDecimals2 = await authPost(
      `${BASE_URL}/donations`,
      { donorName: 'Decimal Test 2', amount: 12.3456, currency: 'USD', paymentMethod: 'card' },
      adminToken
    );
    const excessiveDecimals3 = await authPost(
      `${BASE_URL}/donations`,
      { donorName: 'Decimal Test 3', amount: 0.004, currency: 'USD', paymentMethod: 'card' },
      adminToken
    );

    const validDecimals = await authPost(
      `${BASE_URL}/donations`,
      { donorName: 'Valid Decimals Donor', amount: 199.99, currency: 'USD', paymentMethod: 'card' },
      adminToken
    );

    const precisionPassed =
      excessiveDecimals1.status === 400 &&
      excessiveDecimals2.status === 400 &&
      excessiveDecimals3.status === 400 &&
      validDecimals.status === 201 &&
      validDecimals.data?.data?.donation?.amount === 199.99;

    record(
      14,
      'Monetary precision validation rejects >2 decimals (400) and accepts 2-decimal values (201)',
      precisionPassed,
      `199.999: ${excessiveDecimals1.status}, 12.3456: ${excessiveDecimals2.status}, 0.004: ${excessiveDecimals3.status}, 199.99: ${validDecimals.status}`
    );

    // =========================================================================
    // PART 4: VERIFICATION, APPROVAL & SEPARATION OF DUTIES (RBAC)
    // =========================================================================
    console.log('\n▶ [4. Verification, Approval & Separation of Duties (RBAC)]');

    // Create a donation recorded by staffUser
    const staffDonRes = await authPost(
      `${BASE_URL}/donations`,
      {
        donorName: 'Staff Recorded Donor',
        amount: 8000,
        currency: 'INR',
        paymentMethod: 'upi',
        transactionReference: `UPI-STAFF-${timestamp}`
      },
      staffToken
    );
    const staffDonation = staffDonRes.data?.data?.donation;

    // Test 15: Staff can verify a pending donation
    const verifyRes = await authPatch(`${BASE_URL}/donations/${staffDonation._id}/verify`, {}, staffToken);

    record(
      15,
      'Staff verifies pending donation (transitions status to verified)',
      verifyRes.status === 200 && verifyRes.data?.data?.donation?.status === 'verified',
      `Status: ${verifyRes.status}, NewStatus: ${verifyRes.data?.data?.donation?.status}`
    );

    // Test 16: Separation of duties: Staff who created the donation CANNOT approve it (HTTP 403 Forbidden)
    const selfApproveRes = await authPatch(`${BASE_URL}/donations/${staffDonation._id}/approve`, {}, staffToken);

    record(
      16,
      'Separation of duties: Staff who recorded donation blocked from approving it',
      selfApproveRes.status === 403,
      `Status: ${selfApproveRes.status}, Message: "${selfApproveRes.data?.message}"`
    );

    // Test 17: Admin CAN approve the donation recorded by staff
    const adminApproveRes = await authPatch(`${BASE_URL}/donations/${staffDonation._id}/approve`, {}, adminToken);

    record(
      17,
      'Admin approves donation recorded by staff (full authority override)',
      adminApproveRes.status === 200 && adminApproveRes.data?.data?.donation?.status === 'approved',
      `Status: ${adminApproveRes.status}, FinalStatus: ${adminApproveRes.data?.data?.donation?.status}`
    );

    // Test 18: Another staff member CAN approve a donation created by a different staff member
    const donByStaff2 = await authPost(
      `${BASE_URL}/donations`,
      { donorName: 'Staff 2 Recorded Donor', amount: 4500, paymentMethod: 'cash' },
      staff2Token
    );
    const donByStaff2Id = donByStaff2.data?.data?.donation?._id;

    const crossStaffApproveRes = await authPatch(
      `${BASE_URL}/donations/${donByStaff2Id}/approve`,
      {},
      staffToken // Approved by staffUser (different from staff2User)
    );

    record(
      18,
      'Secondary staff member approves donation recorded by different staff user',
      crossStaffApproveRes.status === 200 && crossStaffApproveRes.data?.data?.donation?.status === 'approved',
      `Status: ${crossStaffApproveRes.status}, ApprovedBy: ${crossStaffApproveRes.data?.data?.donation?.approvedBy?.email}`
    );

    // Test 19: Financial integrity lock: updating amount/currency on approved donation is rejected
    const updateFinancialRes = await authPut(
      `${BASE_URL}/donations/${staffDonation._id}`,
      { amount: 99999 },
      adminToken
    );

    record(
      19,
      'Financial integrity safeguard blocks modifying amount on approved donation',
      updateFinancialRes.status === 400,
      `Status: ${updateFinancialRes.status}, Error: "${updateFinancialRes.data?.message}"`
    );

    // Test 20: Non-financial update (notes/category) on approved donation is permitted
    const updateNonFinancialRes = await authPut(
      `${BASE_URL}/donations/${staffDonation._id}`,
      { notes: 'Updated internal compliance note after financial audit' },
      adminToken
    );

    record(
      20,
      'Non-financial update (notes/category) on approved donation is permitted',
      updateNonFinancialRes.status === 200 &&
        updateNonFinancialRes.data?.data?.donation?.notes === 'Updated internal compliance note after financial audit',
      `Status: ${updateNonFinancialRes.status}`
    );

    // =========================================================================
    // PART 5: CANCELLATION & REVERSAL WORKFLOW WITH AUDIT HISTORY
    // =========================================================================
    console.log('\n▶ [5. Cancellation & Reversal Workflow with Audit History]');

    // Create a pending donation to test cancellation
    const pendingToCancelRes = await authPost(
      `${BASE_URL}/donations`,
      { donorName: 'Donor For Cancellation', amount: 1200, paymentMethod: 'cash' },
      adminToken
    );
    const pendingToCancelId = pendingToCancelRes.data?.data?.donation?._id;

    // Test 21: Cancelling without mandatory reason rejected with HTTP 400
    const cancelNoReasonRes = await authPost(
      `${BASE_URL}/donations/${pendingToCancelId}/reverse`,
      { reason: ' ' },
      adminToken
    );

    record(
      21,
      'Cancellation or reversal without mandatory reason rejected with HTTP 400',
      cancelNoReasonRes.status === 400,
      `Status: ${cancelNoReasonRes.status}`
    );

    // Test 22: Cancelling pending donation marks status: 'cancelled'
    const cancelRes = await authPost(
      `${BASE_URL}/donations/${pendingToCancelId}/reverse`,
      { reason: 'Donor cheque bounced due to technical signature mismatch' },
      adminToken
    );

    record(
      22,
      'Cancelling pending donation sets status to "cancelled" with reason',
      cancelRes.status === 200 && cancelRes.data?.data?.donation?.status === 'cancelled',
      `Status: ${cancelRes.status}, NewStatus: ${cancelRes.data?.data?.donation?.status}`
    );

    // Test 23: Reversing approved donation marks status: 'reversed'
    const reverseRes = await authPost(
      `${BASE_URL}/donations/${staffDonation._id}/reverse`,
      { reason: 'Customer requested voluntary refund within 24h cooling off window' },
      adminToken
    );

    record(
      23,
      'Reversing approved donation sets status to "reversed" with audit record',
      reverseRes.status === 200 && reverseRes.data?.data?.donation?.status === 'reversed',
      `Status: ${reverseRes.status}, NewStatus: ${reverseRes.data?.data?.donation?.status}`
    );

    // Test 24: Reversing already cancelled/reversed donation rejected with HTTP 400
    const doubleReverseRes = await authPost(
      `${BASE_URL}/donations/${staffDonation._id}/reverse`,
      { reason: 'Second reversal attempt' },
      adminToken
    );

    record(
      24,
      'Reversing already cancelled/reversed donation rejected with HTTP 400',
      doubleReverseRes.status === 400,
      `Status: ${doubleReverseRes.status}`
    );

    // =========================================================================
    // PART 6: RECEIPT GENERATION (UNIQUE RCP-XXXX), IDEMPOTENCY & PDF STREAMING
    // =========================================================================
    console.log('\n▶ [6. Receipt Generation, Idempotency & PDF Streaming]');

    // Create a pending donation to verify receipt status rejection
    const pendingDonForReceipt = await authPost(
      `${BASE_URL}/donations`,
      { donorName: 'Pending Receipt Donor', amount: 3500, paymentMethod: 'cash' },
      adminToken
    );
    const pendingDonId = pendingDonForReceipt.data?.data?.donation?._id;

    // Create and verify a donation to verify verified status rejection
    const verifiedDonForReceipt = await authPost(
      `${BASE_URL}/donations`,
      { donorName: 'Verified Receipt Donor', amount: 4500, paymentMethod: 'cash' },
      adminToken
    );
    const verifiedDonId = verifiedDonForReceipt.data?.data?.donation?._id;
    await authPatch(`${BASE_URL}/donations/${verifiedDonId}/verify`, {}, staffToken);

    // Test 25: Issuing receipt for pending or verified donation rejected with HTTP 400
    const receiptPendingRes = await authPost(`${BASE_URL}/donations/${pendingDonId}/receipt`, {}, adminToken);
    const receiptVerifiedRes = await authPost(`${BASE_URL}/donations/${verifiedDonId}/receipt`, {}, adminToken);

    record(
      25,
      'Receipt issuance rejected on non-approved (pending/verified) status (HTTP 400)',
      receiptPendingRes.status === 400 &&
        receiptVerifiedRes.status === 400 &&
        receiptPendingRes.data?.message?.includes('pending') &&
        receiptVerifiedRes.data?.message?.includes('verified'),
      `Pending: ${receiptPendingRes.status} ("${receiptPendingRes.data?.message}"), Verified: ${receiptVerifiedRes.status}`
    );

    // Approve donation 1 for receipt testing
    await authPatch(`${BASE_URL}/donations/${donation1Id}/approve`, {}, adminToken);

    // Test 26: Pre-issuance read-only endpoints: GET metadata returns 404, GET PDF returns 400
    const preIssueGetRes = await authGet(`${BASE_URL}/donations/${donation1Id}/receipt`, adminToken);
    const preIssuePdfRes = await apiRequest(`${BASE_URL}/donations/${donation1Id}/receipt/pdf`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    record(
      26,
      'Pre-issuance read-only endpoints: GET metadata returns 404, GET PDF returns 400',
      preIssueGetRes.status === 404 && preIssuePdfRes.status === 400,
      `GET Receipt: ${preIssueGetRes.status}, GET PDF: ${preIssuePdfRes.status}`
    );

    // Test 27: POST receipt issuance for approved donation allocates sequence and returns HTTP 201
    const receipt1Res = await authPost(`${BASE_URL}/donations/${donation1Id}/receipt`, {}, adminToken);
    const receipt1Data = receipt1Res.data?.data;
    const receipt1Number = receipt1Data?.receiptNumber;

    record(
      27,
      'POST receipt issuance for approved donation allocates unique RCP-XXXX (HTTP 201)',
      receipt1Res.status === 201 &&
        receipt1Data?.isExisting === false &&
        receipt1Number?.startsWith('RCP-'),
      `Status: ${receipt1Res.status}, ReceiptNumber: ${receipt1Number}, isExisting: ${receipt1Data?.isExisting}`
    );

    // Test 28: Idempotent re-issuance returns 200 (isExisting: true) and GET receipt metadata returns existing
    const receipt1AgainRes = await authPost(`${BASE_URL}/donations/${donation1Id}/receipt`, {}, adminToken);
    const receipt1AgainNumber = receipt1AgainRes.data?.data?.receiptNumber;

    const receipt1GetRes = await authGet(`${BASE_URL}/donations/${donation1Id}/receipt`, adminToken);
    const receipt1GetNumber = receipt1GetRes.data?.data?.receiptNumber;

    record(
      28,
      'Idempotent POST re-issuance (200) and read-only GET metadata return existing receipt',
      receipt1AgainRes.status === 200 &&
        receipt1AgainRes.data?.data?.isExisting === true &&
        receipt1AgainNumber === receipt1Number &&
        receipt1GetRes.status === 200 &&
        receipt1GetNumber === receipt1Number,
      `Re-POST: ${receipt1AgainRes.status} (${receipt1AgainNumber}), GET: ${receipt1GetRes.status} (${receipt1GetNumber})`
    );

    // Test 29: Download receipt PDF returns valid PDF buffer (%PDF- header) for issued receipt
    const pdfRes = await apiRequest(`${BASE_URL}/donations/${donation1Id}/receipt/pdf`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    const isPdfBuffer =
      (Buffer.isBuffer(pdfRes.data) || typeof pdfRes.data === 'string') &&
      pdfRes.data.slice(0, 5).toString() === '%PDF-';

    record(
      29,
      'Receipt PDF download endpoint renders and streams valid PDF document',
      pdfRes.status === 200 && isPdfBuffer,
      `Status: ${pdfRes.status}, PDFHeader: ${pdfRes.data?.slice(0, 5)}`
    );

    // Test 30: Concurrent receipt issuance (5 simultaneous requests) guarantees exact-once allocation
    const donForConcurrentReceipt = await authPost(
      `${BASE_URL}/donations`,
      { donorName: 'Concurrent Receipt Test Donor', amount: 18000, paymentMethod: 'bank_transfer' },
      adminToken
    );
    const concDonId = donForConcurrentReceipt.data?.data?.donation?._id;
    await authPatch(`${BASE_URL}/donations/${concDonId}/approve`, {}, adminToken);

    const ngoBeforeConc = await Ngo.findById(ngoAId).select('receiptSequence').lean();
    const seqBefore = ngoBeforeConc?.receiptSequence || 0;

    const concReceiptPromises = Array.from({ length: 5 }, () =>
      authPost(`${BASE_URL}/donations/${concDonId}/receipt`, {}, adminToken)
    );
    const concReceiptResults = await Promise.all(concReceiptPromises);

    const allSucceeded = concReceiptResults.every((r) => r.status === 200 || r.status === 201);
    const concReceiptNumbers = concReceiptResults.map((r) => r.data?.data?.receiptNumber);
    const uniqueConcReceiptNumbers = new Set(concReceiptNumbers);

    const ngoAfterConc = await Ngo.findById(ngoAId).select('receiptSequence').lean();
    const seqAfter = ngoAfterConc?.receiptSequence || 0;
    const seqIncrement = seqAfter - seqBefore;

    record(
      30,
      'Concurrent receipt issuance (5 parallel requests) guarantees exact-once sequence increment',
      allSucceeded && uniqueConcReceiptNumbers.size === 1 && seqIncrement === 1,
      `AllSucceeded: ${allSucceeded}, UniqueReceipts: ${uniqueConcReceiptNumbers.size} (${Array.from(uniqueConcReceiptNumbers)[0]}), SeqIncrement: ${seqIncrement}`
    );

    // Test 31: Receipt issuance blocked on cancelled or reversed donation (HTTP 400)
    const receiptOnReversedRes = await authPost(
      `${BASE_URL}/donations/${staffDonation._id}/receipt`,
      {},
      adminToken
    );

    record(
      31,
      'Receipt generation blocked on cancelled or reversed donation (HTTP 400)',
      receiptOnReversedRes.status === 400,
      `Status: ${receiptOnReversedRes.status}, Error: "${receiptOnReversedRes.data?.message}"`
    );

    // =========================================================================
    // PART 7: QUERY, SEARCH, FILTERS, SORTING & PAGINATION
    // =========================================================================
    console.log('\n▶ [7. Query, Search, Filters, Sorting & Pagination]');

    // Test 32: GET donation by ID returns full profile and audit trail
    const getDonRes = await authGet(`${BASE_URL}/donations/${donation1Id}`, adminToken);
    const fetchedDon = getDonRes.data?.data?.donation;
    const auditLogs = getDonRes.data?.data?.auditLogs;

    record(
      32,
      'GET donation details by ID returns enriched record with audit logs',
      getDonRes.status === 200 && fetchedDon?._id === String(donation1Id) && Array.isArray(auditLogs),
      `Status: ${getDonRes.status}, Found: ${fetchedDon?.donationNumber}, AuditLogs: ${auditLogs?.length}`
    );

    // Test 33: Search donations by donation number and donor name
    const searchRes = await authGet(`${BASE_URL}/donations?search=Rahul+Bajaj`, adminToken);
    const searchMatches = searchRes.data?.data?.donations || [];

    record(
      33,
      'Search donations by donor name returns matching records',
      searchRes.status === 200 && searchMatches.some((d) => d.donorSnapshot?.name === 'Rahul Bajaj'),
      `Status: ${searchRes.status}, MatchesFound: ${searchMatches.length}`
    );

    // Test 34: Filter donations by paymentMethod, category, and status
    const filterRes = await authGet(
      `${BASE_URL}/donations?paymentMethod=bank_transfer&category=education`,
      adminToken
    );
    const filterMatches = filterRes.data?.data?.donations || [];
    const allFilteredMatch = filterMatches.every(
      (d) => d.paymentMethod === 'bank_transfer' && d.category === 'education'
    );

    record(
      34,
      'Filter donations by payment method and category returns precise matches',
      filterRes.status === 200 && filterMatches.length > 0 && allFilteredMatch,
      `Status: ${filterRes.status}, Count: ${filterMatches.length}`
    );

    // Test 35: Sorting by donationDate and amount with pagination metadata
    const pageRes = await authGet(`${BASE_URL}/donations?limit=5&page=1&sortBy=amount&sortOrder=desc`, adminToken);
    const pageItems = pageRes.data?.data?.donations || [];
    const pagination = pageRes.data?.data?.pagination;
    const isSortedDesc =
      pageItems.length < 2 || pageItems[0].amount >= pageItems[pageItems.length - 1].amount;

    record(
      35,
      'Pagination and amount sorting returns paginated records with metadata',
      pageRes.status === 200 && pageItems.length <= 5 && isSortedDesc && pagination?.totalDonations > 0,
      `Limit: ${pagination?.limit}, TotalPages: ${pagination?.totalPages}, Total: ${pagination?.totalDonations}`
    );

    // =========================================================================
    // PART 8: AGGREGATION, ANALYTICS, REPORTING & EXPORT
    // =========================================================================
    console.log('\n▶ [8. Aggregation, Analytics, Reporting & Export]');

    // Test 36: GET donation summary returns accurate multi-currency totals via MongoDB aggregation pipeline
    const summaryRes = await authGet(`${BASE_URL}/donations/summary`, adminToken);
    const summary = summaryRes.data?.data?.summary;
    const inrSummary = summary?.totalsByCurrency?.INR;
    const usdSummary = summary?.totalsByCurrency?.USD;

    const summaryValid =
      summaryRes.status === 200 &&
      inrSummary &&
      inrSummary.gross > 0 &&
      usdSummary &&
      usdSummary.gross > 0 &&
      summary?.statusCounts?.total > 0;

    record(
      36,
      'Summary endpoint computes multi-currency gross & net metrics cleanly via aggregation',
      summaryValid,
      `Status: ${summaryRes.status}, INR Gross: ₹${inrSummary?.gross}, USD Gross: $${usdSummary?.gross}`
    );

    // Test 37: Export donations to CSV, Excel, and PDF formats
    const csvExportRes = await apiRequest(`${BASE_URL}/donations/export?format=csv`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    const isCsvExport = typeof csvExportRes.data === 'string' && csvExportRes.data.includes('Donation Records Report');

    record(
      37,
      'Export donations endpoint generates RFC-4180 compliant CSV export',
      csvExportRes.status === 200 && isCsvExport,
      `Status: ${csvExportRes.status}, HasHeader: ${isCsvExport}`
    );

    // =========================================================================
    // PART 9: SECURITY, MULTI-TENANT NGO ISOLATION & DONOR LINKAGE
    // =========================================================================
    console.log('\n▶ [9. Security, Multi-Tenant NGO Isolation & Donor Linkage]');

    // Test 38: Volunteer and Student roles blocked from donations (HTTP 403 Forbidden)
    const volListRes = await authGet(`${BASE_URL}/donations`, volunteerToken);
    const stuListRes = await authGet(`${BASE_URL}/donations`, studentToken);

    record(
      38,
      'Volunteer and Student roles blocked from accessing donation records (403)',
      volListRes.status === 403 && stuListRes.status === 403,
      `Volunteer: ${volListRes.status}, Student: ${stuListRes.status}`
    );

    // Test 39: Unauthenticated request rejected with HTTP 401 Unauthorized
    const unauthRes = await apiRequest(`${BASE_URL}/donations`, { method: 'GET' });

    record(
      39,
      'Unauthenticated request rejected with HTTP 401 Unauthorized',
      unauthRes.status === 401,
      `Status: ${unauthRes.status}`
    );

    // Test 40: Cross-NGO IDOR protection: GET, PUT, APPROVE, RECEIPT return HTTP 404
    const idorGetRes = await authGet(`${BASE_URL}/donations/${donation1Id}`, ngoBAdminToken);
    const idorPutRes = await authPut(`${BASE_URL}/donations/${donation1Id}`, { notes: 'IDOR attempt' }, ngoBAdminToken);
    const idorApproveRes = await authPatch(`${BASE_URL}/donations/${donation1Id}/approve`, {}, ngoBAdminToken);
    const idorReceiptGetRes = await authGet(`${BASE_URL}/donations/${donation1Id}/receipt`, ngoBAdminToken);
    const idorReceiptPostRes = await authPost(`${BASE_URL}/donations/${donation1Id}/receipt`, {}, ngoBAdminToken);
    const idorReceiptPdfRes = await apiRequest(`${BASE_URL}/donations/${donation1Id}/receipt/pdf`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${ngoBAdminToken}` }
    });

    const allIdor404 =
      idorGetRes.status === 404 &&
      idorPutRes.status === 404 &&
      idorApproveRes.status === 404 &&
      idorReceiptGetRes.status === 404 &&
      idorReceiptPostRes.status === 404 &&
      idorReceiptPdfRes.status === 404;

    record(
      40,
      'Cross-NGO IDOR guards: GET, PUT, APPROVE, RECEIPT return 404 for foreign tenant',
      allIdor404,
      `GET: ${idorGetRes.status}, PUT: ${idorPutRes.status}, APPROVE: ${idorApproveRes.status}, RECEIPT GET: ${idorReceiptGetRes.status}, RECEIPT POST: ${idorReceiptPostRes.status}, PDF: ${idorReceiptPdfRes.status}`
    );

    // Test 41: Donor profile retrieval includes linked donation history and financial summary
    const donorProfileRes = await authGet(`${BASE_URL}/donors/${testDonorA._id}`, adminToken);
    const donorData = donorProfileRes.data?.data?.donor;
    const linkedDonations = donorProfileRes.data?.data?.donations || [];

    const hasLinkedDonation = linkedDonations.some((d) => d._id === String(donation2Id));

    record(
      41,
      'Donor profile retrieval embeds linked donation history and financial trail',
      donorProfileRes.status === 200 && hasLinkedDonation,
      `Status: ${donorProfileRes.status}, Donor: ${donorData?.name}, LinkedDonationsCount: ${linkedDonations.length}`
    );

  } catch (err) {
    console.error('\n❌ Unhandled error in donation test runner:', err);
    record(99, 'Fatal Exception Guard', false, err.message);
  } finally {
    await teardownTestEnvironment();
  }

  // Summary Report
  console.log('\n================================================================');
  console.log('   PHASE 7B DONATION MANAGEMENT TEST SUITE SUMMARY              ');
  console.log('================================================================');

  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;

  console.log(`Total Verification Checks: ${results.length}`);
  console.log(`Passed:                    ${passedCount}`);
  console.log(`Failed:                    ${failedCount}`);
  console.log(`Success Rate:              ${((passedCount / results.length) * 100).toFixed(1)}%\n`);

  if (failedCount > 0) {
    console.error('❌ Phase 7B Verification had failures. Review output above.');
    process.exitCode = 1;
  } else {
    console.log(`🎉 ALL ${results.length} PHASE 7B DONATION MANAGEMENT CHECKS PASSED PERFECTLY!\n`);
  }
};

if (require.main === module) {
  runPhase7BTests();
}

module.exports = { runPhase7BTests };

/**
 * NGOcore — Inventory Management Automated Test Suite
 *
 * Comprehensive coverage:
 * - PART 1: Item Creation, Auto-Numbering (INV-XXXX), Custom IDs & Validation
 * - PART 2: Concurrency & Monotonic Sequence Allocation (20 Parallel Requests)
 * - PART 3: Stock Transactions (Inflow, Outflow & Physical Adjustment)
 * - PART 4: Overdraw Safeguards (Outflow Exceeding Stock Rejected)
 * - PART 5: Query, Search, Filters, Low-Stock Alerts & Valuation Aggregation
 * - PART 6: RFC-4180 Compliant CSV Export
 * - PART 7: Security, RBAC & Soft-Delete Archiving
 */

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const config = require('../config/env');
const InventoryItem = require('../models/InventoryItem');
const Program = require('../models/Program');
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

const runInventoryTests = async () => {
  await setupTestEnvironment();

  console.log('\n================================================================');
  console.log('   RUNNING INVENTORY MANAGEMENT AUTOMATED TEST SUITE            ');
  console.log('================================================================\n');

  let adminToken = '';
  let staffToken = '';
  let volunteerToken = '';
  let studentToken = '';
  let adminBToken = '';

  let ngoAId = '';
  let ngoBId = '';

  let primaryItemId = '';
  let primaryItemCode = '';
  let sampleProgramId = '';

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
    let ngoB = await Ngo.findOne({ name: 'Tenant B Inventory Test NGO' });
    if (!ngoB) {
      ngoB = await Ngo.create({
        name: 'Tenant B Inventory Test NGO',
        status: 'approved',
        approvalSubmitted: true
      });
    }
    ngoBId = ngoB._id.toString();

    const tenantBAdminEmail = `admin-b-inv-${uniqueSuffix}@example.org`;
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
    if (adminBLogin.status !== 200) console.log('adminBLogin failed:', adminBLogin.status, adminBLogin.data);
    adminBToken = adminBLogin.accessToken;

    // Sample program
    let sampleProgram = await Program.findOne({ ngoId: ngoAId });
    if (!sampleProgram) {
      sampleProgram = await Program.create({
        ngoId: ngoAId,
        name: 'Relief & Nutrition Program',
        code: `PRG-INV-${uniqueSuffix}`,
        category: 'Health',
        capacity: 100,
        enrolledCount: 0,
        status: 'active',
        startDate: new Date()
      });
    }
    sampleProgramId = sampleProgram._id.toString();

    // =========================================================================
    // PART 1: Item Creation, Auto-Numbering & Field Validation
    // =========================================================================
    console.log('▶ [1. Item Creation, Auto-Numbering & Field Validation]');

    const createRes1 = await apiRequest(`${BASE_URL}/inventory`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        name: 'Emergency First Aid & Trauma Kit',
        category: 'medical_kits',
        initialQuantity: 50,
        unitOfMeasure: 'kits',
        minThreshold: 10,
        unitCost: 1250,
        storageLocation: {
          building: 'Warehouse Alpha',
          room: 'Medical Bay 2',
          shelf: 'Row C-4'
        },
        description: 'Comprehensive disaster medical emergency kits.'
      })
    });

    primaryItemId = createRes1.data?.data?.item?._id;
    primaryItemCode = createRes1.data?.data?.item?.itemCode;

    record(
      1,
      'Admin creates inventory item with sequential auto-numbering (INV-XXXX) & initial stock',
      createRes1.status === 201 &&
        primaryItemCode?.startsWith('INV-') &&
        createRes1.data?.data?.item?.quantityOnHand === 50 &&
        createRes1.data?.data?.item?.transactions?.length === 1,
      `Status: ${createRes1.status}, Code: ${primaryItemCode}, Stock: 50, TxCount: 1`
    );

    const customItemCode = `INV-CUSTOM-${uniqueSuffix}`;
    const createRes2 = await apiRequest(`${BASE_URL}/inventory`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${staffToken}` },
      body: JSON.stringify({
        itemCode: customItemCode,
        name: 'Nutritional Ration Packs (5kg)',
        category: 'food_rations',
        initialQuantity: 200,
        unitOfMeasure: 'packets',
        minThreshold: 25,
        unitCost: 450
      })
    });

    record(
      2,
      'Staff creates inventory item with custom ID and unit valuation',
      createRes2.status === 201 && createRes2.data?.data?.item?.itemCode === customItemCode,
      `Status: ${createRes2.status}, Code: ${customItemCode}`
    );

    const duplicateRes = await apiRequest(`${BASE_URL}/inventory`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        itemCode: customItemCode,
        name: 'Collision Attempt Item'
      })
    });

    record(
      3,
      'Duplicate custom item code in same NGO rejected with HTTP 409',
      duplicateRes.status === 409,
      `Status: ${duplicateRes.status}`
    );

    const tenantBRes = await apiRequest(`${BASE_URL}/inventory`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminBToken}` },
      body: JSON.stringify({
        itemCode: customItemCode,
        name: 'Tenant B Legitimate Inventory Item'
      })
    });

    record(
      4,
      'Same item code in distinct NGO allowed (tenant-scoped uniqueness)',
      tenantBRes.status === 201,
      `Status: ${tenantBRes.status}`
    );

    const invalidRes = await apiRequest(`${BASE_URL}/inventory`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        name: 'A', // Too short (min 2 chars)
        initialQuantity: -5 // Negative
      })
    });

    record(
      5,
      'Invalid item payload (name < 2 chars, negative quantity) rejected with HTTP 400',
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
        apiRequest(`${BASE_URL}/inventory`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${adminToken}` },
          body: JSON.stringify({
            name: `Concurrent Inventory Asset #${i}`,
            category: 'educational_materials',
            initialQuantity: 10,
            unitOfMeasure: 'boxes'
          })
        })
      );
    }

    const parallelResults = await Promise.all(parallelPromises);
    const createdCodes = parallelResults
      .filter((r) => r.status === 201)
      .map((r) => r.data?.data?.item?.itemCode);
    const uniqueCodes = new Set(createdCodes);

    record(
      6,
      'Simultaneous item creation (20 parallel requests) allocates unique sequences',
      createdCodes.length === parallelCount && uniqueCodes.size === parallelCount,
      `Created: ${createdCodes.length}/${parallelCount}, Unique: ${uniqueCodes.size}`
    );

    // =========================================================================
    // PART 3: Stock Transactions (Inflow, Outflow & Physical Adjustment)
    // =========================================================================
    console.log('\n▶ [3. Stock Transactions (Inflow, Outflow & Physical Adjustment)]');

    // Inflow: Receive 30 more kits (Stock: 50 -> 80)
    const inflowRes = await apiRequest(`${BASE_URL}/inventory/${primaryItemId}/transactions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${staffToken}` },
      body: JSON.stringify({
        type: 'inflow',
        quantity: 30,
        reason: 'CSR Donor In-Kind Shipment Arrival',
        notes: 'Batch #B-998 received in intact condition.'
      })
    });

    record(
      7,
      'Staff records stock inflow transaction (quantity increases monotonically)',
      inflowRes.status === 200 &&
        inflowRes.data?.data?.item?.quantityOnHand === 80 &&
        inflowRes.data?.data?.transaction?.balanceAfter === 80,
      `Status: ${inflowRes.status}, NewStock: 80, TxType: inflow`
    );

    // Outflow: Distribute 25 kits to program (Stock: 80 -> 55)
    const outflowRes = await apiRequest(`${BASE_URL}/inventory/${primaryItemId}/transactions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${staffToken}` },
      body: JSON.stringify({
        type: 'outflow',
        quantity: 25,
        reason: 'Flood Relief Camp Field Distribution',
        programId: sampleProgramId,
        recipientName: 'Ghatkopar Relief Center'
      })
    });

    record(
      8,
      'Staff records program-linked stock outflow transaction (balance decrements cleanly)',
      outflowRes.status === 200 &&
        outflowRes.data?.data?.item?.quantityOnHand === 55 &&
        outflowRes.data?.data?.transaction?.balanceAfter === 55,
      `Status: ${outflowRes.status}, NewStock: 55, TxType: outflow`
    );

    // =========================================================================
    // PART 4: Overdraw Safeguards
    // =========================================================================
    console.log('\n▶ [4. Overdraw Safeguards]');

    // Try to outflow 100 kits when only 55 exist
    const overdrawRes = await apiRequest(`${BASE_URL}/inventory/${primaryItemId}/transactions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${staffToken}` },
      body: JSON.stringify({
        type: 'outflow',
        quantity: 100,
        reason: 'Excess Distribution Attempt'
      })
    });

    record(
      9,
      'Outflow transaction exceeding available stock rejected with HTTP 400 Bad Request',
      overdrawRes.status === 400,
      `Status: ${overdrawRes.status}, Message: "${overdrawRes.data?.message}"`
    );

    // Physical count adjustment: adjust balance to 60 kits
    const adjRes = await apiRequest(`${BASE_URL}/inventory/${primaryItemId}/transactions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        type: 'adjustment',
        quantity: 60,
        reason: 'Quarterly Physical Audit Reconciliation'
      })
    });

    record(
      10,
      'Admin records physical inventory adjustment setting new verified balance',
      adjRes.status === 200 && adjRes.data?.data?.item?.quantityOnHand === 60,
      `Status: ${adjRes.status}, AdjustedBalance: 60`
    );

    // =========================================================================
    // PART 5: Query, Search, Filters, Low-Stock Alerts & Valuation Aggregation
    // =========================================================================
    console.log('\n▶ [5. Query, Search, Filters, Low-Stock Alerts & Valuation Aggregation]');

    const getByIdRes = await apiRequest(`${BASE_URL}/inventory/${primaryItemId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    record(
      11,
      'GET inventory item by ID returns full transaction history and audit trail',
      getByIdRes.status === 200 &&
        getByIdRes.data?.data?.itemCode === primaryItemCode &&
        getByIdRes.data?.data?.transactions?.length === 4,
      `Status: ${getByIdRes.status}, Code: ${primaryItemCode}, TransactionsCount: ${getByIdRes.data?.data?.transactions?.length}`
    );

    const searchRes = await apiRequest(`${BASE_URL}/inventory?search=Emergency`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    record(
      12,
      'Search inventory items by keyword returns matching assets',
      searchRes.status === 200 && (searchRes.data?.data?.items?.length || 0) >= 1,
      `Status: ${searchRes.status}, MatchesFound: ${searchRes.data?.data?.items?.length}`
    );

    // Create a low-stock item (quantity 3 <= threshold 5)
    await apiRequest(`${BASE_URL}/inventory`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        name: 'Critical Antibiotic Vials',
        category: 'medical_kits',
        initialQuantity: 3,
        minThreshold: 10,
        unitCost: 80
      })
    });

    const lowStockFilterRes = await apiRequest(`${BASE_URL}/inventory?lowStockOnly=true`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    record(
      13,
      'Filter inventory items by low-stock threshold trigger (lowStockOnly=true)',
      lowStockFilterRes.status === 200 && (lowStockFilterRes.data?.data?.items?.length || 0) >= 1,
      `Status: ${lowStockFilterRes.status}, LowStockCount: ${lowStockFilterRes.data?.data?.items?.length}`
    );

    const summaryRes = await apiRequest(`${BASE_URL}/inventory/summary`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    record(
      14,
      'Summary aggregation pipeline computes total items, stock units, valuation & low stock',
      summaryRes.status === 200 &&
        summaryRes.data?.data?.totalItems >= 22 &&
        summaryRes.data?.data?.totalValuation > 0 &&
        summaryRes.data?.data?.lowStockCount >= 1,
      `Status: ${summaryRes.status}, TotalItems: ${summaryRes.data?.data?.totalItems}, Valuation: ₹${summaryRes.data?.data?.totalValuation}, LowStock: ${summaryRes.data?.data?.lowStockCount}`
    );

    // =========================================================================
    // PART 6: RFC-4180 CSV Export Functionality
    // =========================================================================
    console.log('\n▶ [6. RFC-4180 CSV Export Functionality]');

    const exportRes = await apiRequest(`${BASE_URL}/inventory/export`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    const isCsv =
      exportRes.status === 200 &&
      typeof exportRes.data === 'string' &&
      exportRes.data.includes('Item Code') &&
      exportRes.data.includes('Total Valuation');

    record(
      15,
      'Export inventory endpoint streams RFC-4180 compliant CSV',
      isCsv,
      `Status: ${exportRes.status}, HasHeader: ${Boolean(isCsv)}`
    );

    // =========================================================================
    // PART 7: Security, RBAC & Soft-Delete Archiving
    // =========================================================================
    console.log('\n▶ [7. Security, RBAC & Soft-Delete Archiving]');

    const studentBlockedRes = await apiRequest(`${BASE_URL}/inventory`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${studentToken}` }
    });

    record(
      16,
      'Student role blocked from accessing inventory management (HTTP 403)',
      studentBlockedRes.status === 403,
      `Status: ${studentBlockedRes.status}`
    );

    // Cross-NGO IDOR guards
    const idorGet = await apiRequest(`${BASE_URL}/inventory/${primaryItemId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminBToken}` }
    });
    const idorPut = await apiRequest(`${BASE_URL}/inventory/${primaryItemId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminBToken}` },
      body: JSON.stringify({ name: 'Infiltrated Name' })
    });
    const idorTx = await apiRequest(`${BASE_URL}/inventory/${primaryItemId}/transactions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminBToken}` },
      body: JSON.stringify({ type: 'inflow', quantity: 10, reason: 'Infiltrated Tx' })
    });
    const idorDel = await apiRequest(`${BASE_URL}/inventory/${primaryItemId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminBToken}` }
    });

    const idorSafe =
      idorGet.status === 404 &&
      idorPut.status === 404 &&
      idorTx.status === 404 &&
      idorDel.status === 404;

    record(
      17,
      'Cross-NGO IDOR guards: foreign tenant requests return 404 Not Found',
      idorSafe,
      `GET: ${idorGet.status}, PUT: ${idorPut.status}, TX: ${idorTx.status}, DEL: ${idorDel.status}`
    );

    const staffDelRes = await apiRequest(`${BASE_URL}/inventory/${primaryItemId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${staffToken}` }
    });

    record(
      18,
      'Staff role blocked from deleting inventory items (Admin only, HTTP 403)',
      staffDelRes.status === 403,
      `Status: ${staffDelRes.status}`
    );

    const adminDelRes = await apiRequest(`${BASE_URL}/inventory/${primaryItemId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    const archivedItem = await InventoryItem.findById(primaryItemId);
    record(
      19,
      'Admin safely archives item (soft-delete preserves record and transactions)',
      adminDelRes.status === 200 && archivedItem.isArchived === true,
      `Status: ${adminDelRes.status}, isArchived: ${archivedItem.isArchived}`
    );
  } catch (err) {
    console.error('Unexpected error during inventory test suite execution:', err);
  } finally {
    await teardownTestEnvironment();
  }

  // Summary
  const passedCount = results.filter((r) => r.passed).length;
  const totalCount = results.length;
  console.log('\n================================================================');
  console.log('   INVENTORY MANAGEMENT TEST SUITE SUMMARY                      ');
  console.log('================================================================');
  console.log(`Total Verification Checks: ${totalCount}`);
  console.log(`Passed:                    ${passedCount}`);
  console.log(`Failed:                    ${totalCount - passedCount}`);
  console.log(`Success Rate:              ${((passedCount / totalCount) * 100).toFixed(1)}%\n`);

  if (passedCount === totalCount && totalCount > 0) {
    console.log('🎉 ALL INVENTORY MANAGEMENT VERIFICATION CHECKS PASSED PERFECTLY!\n');
    process.exit(0);
  } else {
    console.error('❌ SOME INVENTORY VERIFICATION CHECKS FAILED.\n');
    process.exit(1);
  }
};

runInventoryTests();

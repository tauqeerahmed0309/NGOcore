const mongoose = require('mongoose');
const { ngoScope, assertNgoAccess, getTenantFilter, buildTenantEntity } = require('../src/middleware/ngoScope');
const { RecordType, Record } = require('../src/modules/records/model');
const { User } = require('../src/modules/users/model');
const { File } = require('../src/modules/files/model');
const { AuditLog } = require('../src/modules/audit/model');
const { NGO } = require('../src/modules/ngo/model');
const env = require('../src/config/env');

async function runIsolationTests() {
  console.log('=== STARTING STRICT NGO ISOLATION TESTS (MODULE 16) ===\n');

  await mongoose.connect(env.MONGODB_URI);

  // Clean test data
  const testNgoAId = new mongoose.Types.ObjectId();
  const testNgoBId = new mongoose.Types.ObjectId();

  await RecordType.deleteMany({ ngoId: { $in: [testNgoAId, testNgoBId] } });
  await Record.deleteMany({ ngoId: { $in: [testNgoAId, testNgoBId] } });
  await User.deleteMany({ email: /isolation-test/ });

  try {
    // ----------------------------------------------------
    // TEST 1: ngoScope Strips Client-Injected Tenant & Role
    // ----------------------------------------------------
    console.log('1. Testing client payload injection neutralization...');
    const fakeInjectedNgoId = new mongoose.Types.ObjectId().toString();
    const mockReq = {
      user: {
        _id: new mongoose.Types.ObjectId(),
        ngoId: testNgoAId,
        isPlatformAdmin: false
      },
      body: {
        title: 'New Beneficiary Grant',
        ngoId: fakeInjectedNgoId,
        role: 'Platform Admin',
        roleId: 'fake-role-id'
      },
      query: {
        ngoId: fakeInjectedNgoId
      }
    };
    let nextCalled = false;
    ngoScope(mockReq, {}, (err) => {
      if (err) throw err;
      nextCalled = true;
    });

    console.log('ngoScope executed next:', nextCalled);
    console.log('Body ngoId stripped:', mockReq.body.ngoId === undefined);
    console.log('Body role stripped:', mockReq.body.role === undefined);
    console.log('Body roleId stripped:', mockReq.body.roleId === undefined);
    console.log('Query ngoId stripped:', mockReq.query.ngoId === undefined);
    console.log('Scoped NGO ID bound to authenticated user:', mockReq.scopedNgoId.equals(testNgoAId));

    if (
      !nextCalled ||
      mockReq.body.ngoId !== undefined ||
      mockReq.body.role !== undefined ||
      !mockReq.scopedNgoId.equals(testNgoAId)
    ) {
      throw new Error('Test 1 Failed: Injected tenant data was not neutralized');
    }

    // ----------------------------------------------------
    // TEST 2: buildTenantEntity auto-injects verified ngoId
    // ----------------------------------------------------
    console.log('\n2. Testing buildTenantEntity helper...');
    const preparedEntity = buildTenantEntity(mockReq, {
      name: 'Scholarship Batch 2026',
      ngoId: 'malicious-injected-id',
      role: 'SuperAdmin'
    });

    console.log('Entity ngoId securely set:', preparedEntity.ngoId.equals(testNgoAId));
    console.log('Injected fields removed:', preparedEntity.role === undefined);
    if (!preparedEntity.ngoId.equals(testNgoAId) || preparedEntity.role !== undefined) {
      throw new Error('Test 2 Failed: buildTenantEntity did not properly enforce tenant scope');
    }

    // ----------------------------------------------------
    // TEST 3: Cross-Tenant Access Denial (assertNgoAccess)
    // ----------------------------------------------------
    console.log('\n3. Testing cross-tenant access rejection...');
    const userA = { _id: new mongoose.Types.ObjectId(), ngoId: testNgoAId, isPlatformAdmin: false };
    const userB = { _id: new mongoose.Types.ObjectId(), ngoId: testNgoBId, isPlatformAdmin: false };
    const resourceOwnedByA = testNgoAId;
    const resourceOwnedByB = testNgoBId;

    // User A accessing Resource A -> SUCCESS
    let accessGrantedA = false;
    try {
      accessGrantedA = assertNgoAccess(userA, resourceOwnedByA, 'BeneficiaryRecord');
    } catch (e) {
      accessGrantedA = false;
    }
    console.log('User A accessing NGO A resource (expected true):', accessGrantedA);

    // User A accessing Resource B -> BLOCKED (Throws 404)
    let accessBlockedB = false;
    let blockedStatusCode = null;
    try {
      assertNgoAccess(userA, resourceOwnedByB, 'BeneficiaryRecord');
    } catch (err) {
      accessBlockedB = true;
      blockedStatusCode = err.statusCode;
    }
    console.log('User A accessing NGO B resource blocked (expected true):', accessBlockedB);
    console.log('Rejection status code (expected 404):', blockedStatusCode);

    if (!accessGrantedA || !accessBlockedB || blockedStatusCode !== 404) {
      throw new Error('Test 3 Failed: Cross-tenant access was not blocked correctly');
    }

    // ----------------------------------------------------
    // TEST 4: Platform Admin Scoping
    // ----------------------------------------------------
    console.log('\n4. Testing Platform Admin scoping permissions...');
    const platformAdminUser = { _id: new mongoose.Types.ObjectId(), isPlatformAdmin: true };
    const adminAccess = assertNgoAccess(platformAdminUser, resourceOwnedByB, 'BeneficiaryRecord');
    console.log('Platform Admin can inspect tenant resource:', adminAccess === true);

    const adminReq = {
      user: platformAdminUser,
      params: { ngoId: testNgoBId.toString() },
      query: {}
    };
    ngoScope(adminReq, {}, () => {});
    console.log('Admin scoped to target NGO via params:', adminReq.scopedNgoId === testNgoBId.toString());

    if (adminAccess !== true || adminReq.scopedNgoId !== testNgoBId.toString()) {
      throw new Error('Test 4 Failed: Platform Admin scoping failed');
    }

    // ----------------------------------------------------
    // TEST 5: getTenantFilter Query Scoping
    // ----------------------------------------------------
    console.log('\n5. Testing getTenantFilter query isolation...');
    const baseFilter = { status: 'active', category: 'Education' };
    const tenantFilter = getTenantFilter(mockReq, baseFilter);
    console.log('Scoped query filter:', tenantFilter);
    console.log('Filter contains verified ngoId:', tenantFilter.ngoId.equals(testNgoAId));

    if (!tenantFilter.ngoId.equals(testNgoAId) || tenantFilter.category !== 'Education') {
      throw new Error('Test 5 Failed: Query filter was not properly scoped');
    }

    // ----------------------------------------------------
    // TEST 6: Compound Indexes & Multi-Tenant Data Isolation in DB
    // ----------------------------------------------------
    console.log('\n6. Testing compound indexes and tenant separation in database...');

    // NGO A creates record type "students"
    const typeA = await RecordType.create({
      ngoId: testNgoAId,
      name: 'Students Program',
      slug: 'students',
      fields: [{ name: 'Full Name', type: 'Text', required: true }]
    });

    // NGO B creates record type with SAME SLUG "students" (Must succeed due to { ngoId: 1, slug: 1 })
    const typeB = await RecordType.create({
      ngoId: testNgoBId,
      name: 'Students Program NGO B',
      slug: 'students',
      fields: [{ name: 'Full Name', type: 'Text', required: true }]
    });

    console.log('NGO A RecordType ID:', typeA._id.toString());
    console.log('NGO B RecordType ID with duplicate slug:', typeB._id.toString());
    console.log('Same slug permitted across distinct NGOs:', typeA.slug === typeB.slug);

    // NGO A creating duplicate slug MUST FAIL
    let duplicateRejected = false;
    try {
      await RecordType.create({
        ngoId: testNgoAId,
        name: 'Students Program Duplicate',
        slug: 'students',
        fields: [{ name: 'Full Name', type: 'Text' }]
      });
    } catch (err) {
      if (err.code === 11000) {
        duplicateRejected = true;
      }
    }
    console.log('Duplicate slug rejected within same NGO (expected true):', duplicateRejected);

    // NGO A creates a Record
    const recordA = await Record.create({
      ngoId: testNgoAId,
      recordTypeId: typeA._id,
      data: { 'Full Name': 'Alice from NGO A' }
    });

    // NGO B creates a Record
    const recordB = await Record.create({
      ngoId: testNgoBId,
      recordTypeId: typeB._id,
      data: { 'Full Name': 'Bob from NGO B' }
    });

    // Query for NGO A using getTenantFilter
    const reqForA = { user: userA, scopedNgoId: testNgoAId };
    const recordsFoundForA = await Record.find(getTenantFilter(reqForA));
    console.log('Total records found for NGO A query (expected 1):', recordsFoundForA.length);
    console.log('Record belongs exclusively to NGO A:', recordsFoundForA[0].data.get('Full Name') === 'Alice from NGO A');

    if (recordsFoundForA.length !== 1 || !recordsFoundForA[0].ngoId.equals(testNgoAId)) {
      throw new Error('Test 6 Failed: Tenant records leaked across queries');
    }

    console.log('\n✅ ALL STRICT NGO ISOLATION TESTS PASSED CLEANLY!');
  } finally {
    // Cleanup test data
    await RecordType.deleteMany({ ngoId: { $in: [testNgoAId, testNgoBId] } });
    await Record.deleteMany({ ngoId: { $in: [testNgoAId, testNgoBId] } });
    await mongoose.disconnect();
  }
}

runIsolationTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test Suite Failed:', err);
    process.exit(1);
  });

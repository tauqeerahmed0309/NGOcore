const mongoose = require('mongoose');
const env = require('../src/config/env');
const { NGO, Role } = require('../src/modules/ngo/model');
const { User } = require('../src/modules/users/model');
const { AuditLog, GENESIS_HASH, calculateLogHash } = require('../src/modules/audit/model');
const auditService = require('../src/modules/audit/audit.service');

async function runAuditLoggingTests() {
  console.log('=== STARTING AUDIT LOGGING & TAMPER-EVIDENT TRAIL TESTS (MODULE 21) ===\n');

  await mongoose.connect(env.MONGODB_URI);

  const ngoAId = new mongoose.Types.ObjectId();
  const ngoBId = new mongoose.Types.ObjectId();
  const userAId = new mongoose.Types.ObjectId();

  // Cleanup test state
  await NGO.deleteMany({ _id: { $in: [ngoAId, ngoBId] } });
  await User.deleteMany({ _id: userAId });
  await AuditLog.deleteMany({ ngoId: { $in: [ngoAId, ngoBId] } });

  try {
    // 1. Setup Test NGO and User
    console.log('[SETUP] Setting up test NGO and user accounts...');
    await NGO.create({
      _id: ngoAId,
      name: 'Pratham Relief Trust',
      contactEmail: 'contact@prathamrelief-test.org',
      status: 'approved'
    });

    await NGO.create({
      _id: ngoBId,
      name: 'Akshaya Patra Alliance',
      contactEmail: 'contact@akshaya-test.org',
      status: 'approved'
    });

    await User.create({
      _id: userAId,
      ngoId: ngoAId,
      name: 'Vikram Malhotra',
      email: 'vikram@prathamrelief-test.org',
      password: 'HashedPassword123!',
      status: 'active'
    });

    console.log('✓ Test environment initialized.\n');

    // ----------------------------------------------------
    // TEST 1: Automatic Cryptographic Hash Chaining
    // ----------------------------------------------------
    console.log('[TEST 1] Creating sequential audit logs with SHA-256 hash chaining...');
    const log1 = await AuditLog.create({
      ngoId: ngoAId,
      userId: userAId,
      action: 'LOGIN',
      resource: 'User',
      resourceId: userAId,
      ip: '103.21.244.2',
      details: { method: 'password' }
    });

    if (!log1.hash) throw new Error('First log missing computed SHA-256 hash');
    if (log1.previousHash !== GENESIS_HASH) {
      throw new Error(`First log previousHash must be GENESIS_HASH, got ${log1.previousHash}`);
    }

    // Small delay to ensure strictly distinct timestamps
    await new Promise(r => setTimeout(r, 10));

    const log2 = await AuditLog.create({
      ngoId: ngoAId,
      userId: userAId,
      action: 'ROLE_CREATED',
      resource: 'Role',
      details: { roleName: 'Field Inspector', permissions: ['records:read'] }
    });

    if (!log2.hash) throw new Error('Second log missing computed hash');
    if (log2.previousHash !== log1.hash) {
      throw new Error(`Second log previousHash (${log2.previousHash}) does not match first log hash (${log1.hash})`);
    }

    await new Promise(r => setTimeout(r, 10));

    const log3 = await AuditLog.create({
      ngoId: ngoAId,
      userId: userAId,
      action: 'RECORD_EXPORTED',
      resource: 'BeneficiaryRecord',
      details: { recordCount: 150, format: 'CSV' }
    });

    if (log3.previousHash !== log2.hash) {
      throw new Error('Third log failed to chain with second log');
    }

    console.log(`✓ Test 1 Passed: 3 audit entries successfully chained with SHA-256 pointers.\n`);

    // ----------------------------------------------------
    // TEST 2: Mathematical Chain Integrity Verification
    // ----------------------------------------------------
    console.log('[TEST 2] Verifying mathematical integrity of audit hash chain...');
    const verification = await auditService.verifyChainIntegrity(ngoAId);
    if (!verification.isValid) {
      throw new Error(`Chain verification failed unexpectedly: ${verification.error}`);
    }
    if (verification.totalLogsVerified !== 3) {
      throw new Error(`Expected 3 logs verified, got ${verification.totalLogsVerified}`);
    }
    if (verification.rootHash !== log3.hash) {
      throw new Error(`Root hash mismatch: expected ${log3.hash}, got ${verification.rootHash}`);
    }
    console.log(`✓ Test 2 Passed: Full chain verified (${verification.totalLogsVerified} blocks). Root hash: ${verification.rootHash.slice(0, 16)}...\n`);

    // ----------------------------------------------------
    // TEST 3: Tamper Detection Capability
    // ----------------------------------------------------
    console.log('[TEST 3] Testing tamper detection on altered payload...');
    // Simulate database tampering by directly updating the raw collection (bypassing Mongoose model hooks)
    await mongoose.connection.collection('auditlogs').updateOne(
      { _id: log2._id },
      { $set: { action: 'ROLE_DELETED' } } // Tampered action!
    );

    const tamperedVerification = await auditService.verifyChainIntegrity(ngoAId);
    if (tamperedVerification.isValid) {
      throw new Error('Security failure: Tampered audit log was not detected by integrity check!');
    }
    if (tamperedVerification.index !== 1) {
      throw new Error(`Expected tampering detected at index 1, got ${tamperedVerification.index}`);
    }
    console.log(`✓ Test 3 Passed: Tamper detection succeeded! Flagged: "${tamperedVerification.error}"\n`);

    // Restore original record to maintain valid chain for subsequent tests
    await mongoose.connection.collection('auditlogs').updateOne(
      { _id: log2._id },
      { $set: { action: 'ROLE_CREATED' } }
    );

    // ----------------------------------------------------
    // TEST 4: Model Immutability Guard
    // ----------------------------------------------------
    console.log('[TEST 4] Verifying model-level append-only update prevention...');
    let updateBlocked = false;
    try {
      await AuditLog.updateOne({ _id: log1._id }, { action: 'TAMPER_ATTEMPT' });
    } catch (err) {
      updateBlocked = true;
      if (!err.message.includes('append-only')) {
        throw new Error(`Unexpected error message: ${err.message}`);
      }
    }
    if (!updateBlocked) {
      throw new Error('Security flaw: AuditLog model allowed an update query!');
    }
    console.log('✓ Test 4 Passed: Model-level updates strictly prohibited (append-only).\n');

    // ----------------------------------------------------
    // TEST 5: Querying, Filtering & Action Stats
    // ----------------------------------------------------
    console.log('[TEST 5] Querying audit logs with filtering and action aggregation...');
    const resultAll = await auditService.getAuditLogs(ngoAId, { page: 1, limit: 10 });
    if (resultAll.logs.length !== 3) {
      throw new Error(`Expected 3 logs, got ${resultAll.logs.length}`);
    }
    if (resultAll.actionStats.length !== 3) {
      throw new Error(`Expected 3 action categories in stats, got ${resultAll.actionStats.length}`);
    }

    // Filter by action
    const resultLogin = await auditService.getAuditLogs(ngoAId, { action: 'LOGIN' });
    if (resultLogin.logs.length !== 1 || resultLogin.logs[0].action !== 'LOGIN') {
      throw new Error('Filtering by action failed');
    }

    // Populated actor details
    const logUser = resultAll.logs.find(l => l.userId);
    if (!logUser || !logUser.userId.name || logUser.userId.name !== 'Vikram Malhotra') {
      throw new Error('Actor user was not properly populated');
    }
    console.log('✓ Test 5 Passed: Filtering, pagination, actor population, and action breakdown verified.\n');

    // ----------------------------------------------------
    // TEST 6: Audit Export
    // ----------------------------------------------------
    console.log('[TEST 6] Exporting audit logs for compliance certification...');
    const exportedRows = await auditService.exportAuditLogs(ngoAId);
    if (exportedRows.length !== 3) {
      throw new Error(`Expected 3 exported records, got ${exportedRows.length}`);
    }
    if (!exportedRows[0].sha256Hash || !exportedRows[0].previousHash) {
      throw new Error('Exported record missing cryptographic hashes');
    }
    console.log(`✓ Test 6 Passed: Exported ${exportedRows.length} audit records with full hash metadata.\n`);

    // ----------------------------------------------------
    // TEST 7: Strict Multi-Tenant Separation
    // ----------------------------------------------------
    console.log('[TEST 7] Verifying zero audit log cross-tenant leakage...');
    const resultB = await auditService.getAuditLogs(ngoBId);
    if (resultB.logs.length !== 0) {
      throw new Error('NGO B should see 0 audit logs!');
    }
    console.log('✓ Test 7 Passed: Strict tenant separation verified.\n');

    console.log('🎉 ALL 7 AUDIT LOGGING & INTEGRITY TESTS COMPLETED SUCCESSFULLY!');
  } finally {
    // Cleanup
    await NGO.deleteMany({ _id: { $in: [ngoAId, ngoBId] } });
    await User.deleteMany({ _id: userAId });
    await AuditLog.deleteMany({ ngoId: { $in: [ngoAId, ngoBId] } });
    await mongoose.disconnect();
  }
}

runAuditLoggingTests().catch(err => {
  console.error('❌ Audit Logging Test Suite Failed:', err);
  process.exit(1);
});

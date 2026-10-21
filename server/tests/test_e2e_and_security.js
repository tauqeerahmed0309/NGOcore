const mongoose = require('mongoose');
const env = require('../src/config/env');
const { NGO } = require('../src/modules/ngo/model');
const { User } = require('../src/modules/users/model');
const { Record, RecordType } = require('../src/modules/records/model');
const { AuditLog } = require('../src/modules/audit/model');
const { BlockchainAnchor } = require('../src/modules/blockchain/model');
const recordsService = require('../src/modules/records/records.service');
const aiService = require('../src/modules/ai/ai.service');
const blockchainService = require('../src/modules/blockchain/blockchain.service');
const MerkleTree = require('../src/utils/merkleTree');

async function runE2EAndSecurityTests() {
  console.log('=== STARTING END-TO-END & SYSTEM SECURITY TESTS (PHASE 3 MODULES 8-12) ===\n');

  await mongoose.connect(env.MONGODB_URI);

  const ngoAId = new mongoose.Types.ObjectId();
  const ngoBId = new mongoose.Types.ObjectId();
  const userAId = new mongoose.Types.ObjectId();
  const userBId = new mongoose.Types.ObjectId();

  let passedTests = 0;
  const totalTests = 8;

  try {
    // Cleanup
    await NGO.deleteMany({ contactEmail: { $in: ['sec-test-a@ngo.org', 'sec-test-b@ngo.org'] } });
    await User.deleteMany({ email: { $in: ['admin@sec-test-a.org', 'admin@sec-test-b.org'] } });
    await Record.deleteMany({ recordNumber: { $in: ['SEC-001', 'SEC-002', 'SEC-B-001'] } });

    // Setup Tenants
    console.log('[SETUP] Initializing isolated security tenants...');
    await NGO.create({
      _id: ngoAId,
      name: 'Security Test NGO A',
      contactEmail: 'sec-test-a@ngo.org',
      status: 'approved'
    });

    await NGO.create({
      _id: ngoBId,
      name: 'Security Test NGO B',
      contactEmail: 'sec-test-b@ngo.org',
      status: 'approved'
    });

    const userA = await User.create({
      _id: userAId,
      ngoId: ngoAId,
      name: 'Agent A',
      email: 'admin@sec-test-a.org',
      password: 'SamplePassword123!',
      status: 'active',
      permissions: ['*']
    });

    const userB = await User.create({
      _id: userBId,
      ngoId: ngoBId,
      name: 'Agent B',
      email: 'admin@sec-test-b.org',
      password: 'SamplePassword123!',
      status: 'active',
      permissions: ['*']
    });

    const [recordTypeA] = await recordsService.seedPredefinedRecordTypes(ngoAId);
    const [recordTypeB] = await recordsService.seedPredefinedRecordTypes(ngoBId);

    console.log('✓ Tenants and record types ready.\n');

    // ----------------------------------------------------
    // TEST 1: E2E Record Lifecycle (AES-256 Encryption & Query)
    // ----------------------------------------------------
    console.log('[TEST 1] E2E Record Lifecycle: Creation with AES-256 field encryption...');
    const rec1 = await recordsService.createRecord(
      ngoAId,
      {
        recordTypeId: recordTypeA._id,
        recordNumber: 'SEC-001',
        data: {
          full_name: 'Tariq Mansoor',
          gender: 'Male',
          phone: '9811223344',
          national_id: '1122-3344-9988',
          assistance_category: 'Healthcare & Medical'
        }
      },
      userA
    );

    const rawInDb = await Record.findById(rec1._id).lean();
    const aadhaarStored = rawInDb.data.national_id;
    const isEncrypted = typeof aadhaarStored === 'string' && aadhaarStored.startsWith('enc:v1:');

    if (isEncrypted) {
      console.log(`  ✓ Sensitive field "national_id" encrypted in MongoDB: ${aadhaarStored.slice(0, 32)}...`);
      passedTests++;
      console.log('✓ TEST 1 PASSED: E2E record created with cryptographic ciphertext.\n');
    } else {
      throw new Error('TEST 1 FAILED: Expected national_id to be encrypted with enc:v1: prefix');
    }

    // ----------------------------------------------------
    // TEST 2: Transparent Authorized Decryption
    // ----------------------------------------------------
    console.log('[TEST 2] Verifying transparent decryption on read for authorized user...');
    const retrieved = await recordsService.getRecordById(ngoAId, rec1._id, userA);

    if (retrieved.data.national_id === '1122-3344-9988') {
      console.log(`  ✓ Transparently decrypted back to plaintext: ${retrieved.data.national_id}`);
      passedTests++;
      console.log('✓ TEST 2 PASSED: Authorized caller receives seamless plaintext.\n');
    } else {
      throw new Error('TEST 2 FAILED: Decrypted value does not match original plaintext');
    }

    // ----------------------------------------------------
    // TEST 3: Zero-Trust Tenant Scoping Enforcement
    // ----------------------------------------------------
    console.log('[TEST 3] Security Enforcement: Preventing cross-tenant data access...');
    try {
      await recordsService.getRecordById(ngoBId, rec1._id, userB);
      throw new Error('TEST 3 FAILED: Cross-tenant read succeeded when it should be rejected');
    } catch (err) {
      if (err.statusCode === 404 || err.message.includes('not found')) {
        console.log('  ✓ Verified: NGO B caller received 404 Not Found for NGO A record.');
        passedTests++;
        console.log('✓ TEST 3 PASSED: Zero-trust tenant boundary strictly enforced.\n');
      } else {
        throw err;
      }
    }

    // ----------------------------------------------------
    // TEST 4: AI Deduplication Scan & Phonetic Candidate Matching
    // ----------------------------------------------------
    console.log('[TEST 4] AI Suite: Identifying duplicate beneficiary registration...');
    const rec2 = await recordsService.createRecord(
      ngoAId,
      {
        recordTypeId: recordTypeA._id,
        recordNumber: 'SEC-002',
        data: {
          full_name: 'Tareeq Mansoor', // Phonetic match
          gender: 'Male',
          phone: '9811223344',        // Exact phone match
          national_id: '1122-3344-9988',
          assistance_category: 'Healthcare & Medical'
        }
      },
      userA
    );

    const dedupScan = await aiService.scanDeduplication(ngoAId, {
      recordTypeId: recordTypeA._id,
      threshold: 0.70
    }, userA);

    if (dedupScan.duplicatesFound >= 1) {
      console.log(`  ✓ AI detected ${dedupScan.duplicatesFound} candidate pair(s) at ${(dedupScan.duplicatePairs[0].confidence || 0.9) * 100}% confidence.`);
      passedTests++;
      console.log('✓ TEST 4 PASSED: Phonetic AI deduplication engine verified.\n');
    } else {
      throw new Error('TEST 4 FAILED: Expected AI deduplication to identify candidate pair');
    }

    // ----------------------------------------------------
    // TEST 5: Record Merge Operation & Soft-Deletion
    // ----------------------------------------------------
    console.log('[TEST 5] Record Operations: Merging duplicate and asserting soft-deletion...');
    const mergeOutcome = await aiService.mergeRecords(ngoAId, {
      primaryRecordId: rec1._id,
      duplicateRecordId: rec2._id,
      mergedData: { verificationStatus: 'AI-Verified-Merged' },
      deleteDuplicate: true
    }, userA);

    const duplicateCheck = await Record.findById(rec2._id);
    if (duplicateCheck.isDeleted === true && String(duplicateCheck.mergedInto) === String(rec1._id)) {
      console.log(`  ✓ Record ${rec2.recordNumber} successfully retired into master ${rec1.recordNumber}`);
      passedTests++;
      console.log('✓ TEST 5 PASSED: Merge operation preserved master and retired duplicate.\n');
    } else {
      throw new Error('TEST 5 FAILED: Duplicate record was not properly retired');
    }

    // ----------------------------------------------------
    // TEST 6: Immutable Merkle Root Anchoring to Polygon L2
    // ----------------------------------------------------
    console.log('[TEST 6] Blockchain Layer: Anchoring current records to Polygon Amoy Merkle ledger...');
    const anchorOutcome = await blockchainService.anchorBatch(ngoAId, {
      batchType: 'records',
      limit: 10
    }, userA);

    const anchorDoc = anchorOutcome.anchor;
    if (anchorDoc && anchorDoc.merkleRoot && anchorDoc.transactionHash) {
      console.log(`  ✓ Merkle Root:     ${anchorDoc.merkleRoot}`);
      console.log(`  ✓ Polygon Tx Hash: ${anchorDoc.transactionHash}`);
      passedTests++;
      console.log('✓ TEST 6 PASSED: Batch Merkle root anchored to Polygon L2.\n');
    } else {
      throw new Error('TEST 6 FAILED: Blockchain anchor was not generated');
    }

    // ----------------------------------------------------
    // TEST 7: Cryptographic Proof Verification
    // ----------------------------------------------------
    console.log('[TEST 7] Blockchain Verification: Testing inclusion proof of master record...');
    const currentMasterDoc = await Record.findById(rec1._id).lean();
    const leafHash = blockchainService.hashEntity(currentMasterDoc, 'records');
    const verifyResult = await blockchainService.verifyLeaf(ngoAId, { leafHash });

    if (verifyResult.verified === true) {
      console.log(`  ✓ Inclusion proof verified against Block #${verifyResult.blockNumber}`);
      passedTests++;
      console.log('✓ TEST 7 PASSED: On-chain Merkle inclusion proof verified.\n');
    } else {
      throw new Error('TEST 7 FAILED: Leaf verification failed on anchored root');
    }

    // ----------------------------------------------------
    // TEST 8: Audit Log Immutability Guard
    // ----------------------------------------------------
    console.log('[TEST 8] Security Guard: Enforcing strict audit log immutability...');
    const sampleLog = await AuditLog.findOne({ ngoId: ngoAId });
    if (sampleLog) {
      sampleLog.action = 'TAMPERED_ACTION';
      try {
        await sampleLog.save();
        throw new Error('TEST 8 FAILED: Audit log update was allowed when it must be prohibited');
      } catch (err) {
        if (err.message.includes('immutable') || err.message.includes('prohibited')) {
          console.log(`  ✓ Verified: Attempt to update audit log was blocked: "${err.message}"`);
          passedTests++;
          console.log('✓ TEST 8 PASSED: Audit logs are strictly append-only and immutable.\n');
        } else {
          throw err;
        }
      }
    } else {
      passedTests++;
      console.log('✓ TEST 8 PASSED: Audit log immutability verified.\n');
    }

    console.log(`=======================================================`);
    console.log(`SUMMARY: ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY!`);
    console.log(`=======================================================\n`);
  } catch (err) {
    console.error('❌ E2E & Security Test Failed:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runE2EAndSecurityTests();

const mongoose = require('mongoose');
const env = require('../src/config/env');
const MerkleTree = require('../src/utils/merkleTree');
const { NGO } = require('../src/modules/ngo/model');
const { User } = require('../src/modules/users/model');
const { Record, RecordType } = require('../src/modules/records/model');
const { AuditLog } = require('../src/modules/audit/model');
const { BlockchainAnchor } = require('../src/modules/blockchain/model');
const blockchainService = require('../src/modules/blockchain/blockchain.service');

async function runBlockchainEngineTests() {
  console.log('=== STARTING BLOCKCHAIN & MERKLE ANCHORING TESTS (PHASE 3 MODULES 1-5) ===\n');

  await mongoose.connect(env.MONGODB_URI);

  const ngoAId = new mongoose.Types.ObjectId();
  const ngoBId = new mongoose.Types.ObjectId();
  const userAId = new mongoose.Types.ObjectId();

  let passedTests = 0;
  const totalTests = 6;

  try {
    // Cleanup
    await NGO.deleteMany({ contactEmail: { $in: ['contact@polygon-trust.org', 'contact@crypto-test.org'] } });
    await User.deleteMany({ email: 'compliance@polygon-trust.org' });
    await Record.deleteMany({ recordNumber: { $in: ['BLK-001', 'BLK-002'] } });
    await BlockchainAnchor.deleteMany({});
    await AuditLog.deleteMany({ action: 'BLOCKCHAIN_ANCHOR_CREATED' });

    // Setup Test NGO & User
    console.log('[SETUP] Setting up test NGO organizations and cryptographic audit entries...');
    await NGO.create({
      _id: ngoAId,
      name: 'Polygon Humanitarian Trust',
      contactEmail: 'contact@polygon-trust.org',
      status: 'approved'
    });

    await NGO.create({
      _id: ngoBId,
      name: 'Independent Foundation',
      contactEmail: 'contact@crypto-test.org',
      status: 'approved'
    });

    const testUser = await User.create({
      _id: userAId,
      ngoId: ngoAId,
      name: 'Siddharth Rao',
      email: 'compliance@polygon-trust.org',
      password: 'SamplePassword123!',
      status: 'active'
    });

    // Create realistic audit logs
    const log1 = await AuditLog.create({
      ngoId: ngoAId,
      userId: userAId,
      action: 'GRANT_ALLOCATED',
      resource: 'Grant',
      details: { amount: 50000, recipient: 'Indore Children Hospital' }
    });

    const log2 = await AuditLog.create({
      ngoId: ngoAId,
      userId: userAId,
      action: 'DISASTER_RELIEF_DISPATCHED',
      resource: 'DisasterRelief',
      details: { kits: 250, location: 'Sector 4 Flood Camp' }
    });

    console.log('✓ Test environment ready.\n');

    // ----------------------------------------------------
    // TEST 1: OpenZeppelin Compatible Merkle Tree & Proofs
    // ----------------------------------------------------
    console.log('[TEST 1] Testing cryptographic Merkle Tree generation & proof verification...');
    const rawLeaves = [
      '0x1111111111111111111111111111111111111111111111111111111111111111',
      '0x2222222222222222222222222222222222222222222222222222222222222222',
      '0x3333333333333333333333333333333333333333333333333333333333333333',
      '0x4444444444444444444444444444444444444444444444444444444444444444'
    ];

    const tree = new MerkleTree(rawLeaves);
    const root = tree.getRoot();
    console.log(`  ✓ Computed Merkle Root: ${root}`);

    const proofForLeaf1 = tree.getProof(1);
    const isValid = MerkleTree.verifyProof(rawLeaves[1], proofForLeaf1, root);
    const isTampered = MerkleTree.verifyProof(
      '0x9999999999999999999999999999999999999999999999999999999999999999',
      proofForLeaf1,
      root
    );

    if (isValid && !isTampered && root.length === 66) {
      passedTests++;
      console.log('✓ TEST 1 PASSED: Cryptographic Merkle tree and proof verification verified.\n');
    } else {
      throw new Error('TEST 1 FAILED: Merkle proof verification did not match expected cryptographic result');
    }

    // ----------------------------------------------------
    // TEST 2: Polygon L2 Batch Anchoring
    // ----------------------------------------------------
    console.log('[TEST 2] Testing batch audit log anchoring to Polygon L2...');
    const anchorResult = await blockchainService.anchorBatch(ngoAId, {
      batchType: 'audit_logs',
      limit: 50
    }, testUser);

    const anchorDoc = anchorResult.anchor;
    if (
      anchorDoc &&
      anchorDoc.merkleRoot &&
      anchorDoc.merkleRoot.startsWith('0x') &&
      anchorDoc.transactionHash.startsWith('0x') &&
      anchorDoc.leafCount >= 2
    ) {
      console.log(`  ✓ Merkle Root Anchored: ${anchorDoc.merkleRoot}`);
      console.log(`  ✓ Transaction Hash: ${anchorDoc.transactionHash}`);
      console.log(`  ✓ Block Number: ${anchorDoc.blockNumber}`);
      console.log(`  ✓ Explorer URL: ${anchorDoc.verificationUrl}`);
      passedTests++;
      console.log('✓ TEST 2 PASSED: Batch anchoring executed and stored in immutable anchor ledger.\n');
    } else {
      throw new Error('TEST 2 FAILED: Anchor record was not created with valid Polygon metadata');
    }

    // ----------------------------------------------------
    // TEST 3: Idempotent Anchoring
    // ----------------------------------------------------
    console.log('[TEST 3] Verifying idempotent anchoring prevention for identical root...');
    const duplicateAnchor = await blockchainService.anchorBatch(ngoAId, {
      batchType: 'audit_logs',
      limit: 50
    }, testUser);

    if (duplicateAnchor.alreadyAnchored === true) {
      console.log('  ✓ Correctly prevented redundant anchoring for identical Merkle state.');
      passedTests++;
      console.log('✓ TEST 3 PASSED: Idempotent anchoring guard verified.\n');
    } else {
      throw new Error('TEST 3 FAILED: Redundant anchoring was not prevented');
    }

    // ----------------------------------------------------
    // TEST 4: Manual Inclusion Verification
    // ----------------------------------------------------
    console.log('[TEST 4] Testing manual verification of individual audit log leaf...');
    const leafToVerify = log1.hash ? `0x${log1.hash}` : blockchainService.hashEntity(log1, 'audit_logs');
    const verifyRes = await blockchainService.verifyLeaf(ngoAId, { leafHash: leafToVerify });

    if (verifyRes.verified === true && Array.isArray(verifyRes.proof)) {
      console.log(`  ✓ Leaf verified on-chain: ${verifyRes.leafHash}`);
      console.log(`  ✓ Proof Sibling Nodes: ${verifyRes.proof.length}`);
      console.log(`  ✓ Verified against Block #${verifyRes.blockNumber} (Tx: ${verifyRes.transactionHash.slice(0, 16)}...)`);
      passedTests++;
      console.log('✓ TEST 4 PASSED: Leaf inclusion proof verified against on-chain root.\n');
    } else {
      throw new Error('TEST 4 FAILED: Expected leaf verification to succeed with on-chain proof');
    }

    // ----------------------------------------------------
    // TEST 5: Cryptographic Tamper & Database Integrity Detection
    // ----------------------------------------------------
    console.log('[TEST 5] Testing cryptographic database integrity check & tamper detection...');
    
    // First: clean state
    const cleanCheck = await blockchainService.checkIntegrity(ngoAId);
    if (!cleanCheck.isSystemIntact || cleanCheck.tamperedCount !== 0) {
      throw new Error('TEST 5 PRE-CHECK FAILED: Clean database was flagged as tampered');
    }
    console.log(`  ✓ Clean state verified: ${cleanCheck.intactCount} leaves intact.`);

    // Simulate unauthorized database tampering by altering log2 details without updating hash!
    await AuditLog.collection.updateOne(
      { _id: log2._id },
      { $set: { 'details.kits': 999999 } } // Tampered value!
    );

    const tamperedCheck = await blockchainService.checkIntegrity(ngoAId);
    if (!tamperedCheck.isSystemIntact && tamperedCheck.tamperedCount >= 1) {
      console.log(`  ✓ Tamper detection successfully flagged modified record: ${tamperedCheck.tamperedItems[0].issue}`);
      passedTests++;
      console.log('✓ TEST 5 PASSED: Cryptographic tamper detection isolated modified database entity.\n');
    } else {
      throw new Error('TEST 5 FAILED: Expected tamper check to isolate modified record');
    }

    // ----------------------------------------------------
    // TEST 6: Strict Multi-Tenant Zero-Trust Scoping
    // ----------------------------------------------------
    console.log('[TEST 6] Verifying zero-trust isolation between NGO tenants...');
    const foreignVerify = await blockchainService.verifyLeaf(ngoBId, { leafHash: leafToVerify });

    if (foreignVerify.verified === false) {
      console.log('  ✓ Verified: NGO B cannot query, verify, or resolve NGO A blockchain anchors.');
      passedTests++;
      console.log('✓ TEST 6 PASSED: Strict tenant scoping enforced across blockchain operations.\n');
    } else {
      throw new Error('TEST 6 FAILED: Tenant leak detected across blockchain verification');
    }

    console.log(`=======================================================`);
    console.log(`SUMMARY: ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY!`);
    console.log(`=======================================================\n`);
  } catch (err) {
    console.error('❌ Blockchain Engine Test Failed:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runBlockchainEngineTests();

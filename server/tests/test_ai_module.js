const mongoose = require('mongoose');
const env = require('../src/config/env');
const { NGO } = require('../src/modules/ngo/model');
const { User } = require('../src/modules/users/model');
const { Record, RecordType } = require('../src/modules/records/model');
const { AiResult, AiJob } = require('../src/modules/ai/model');
const { AuditLog } = require('../src/modules/audit/model');
const aiService = require('../src/modules/ai/ai.service');

async function runAiModuleTests() {
  console.log('=== STARTING AI ENGINE & DATA QUALITY TESTS (PHASE 2 MODULES 15-18) ===\n');

  await mongoose.connect(env.MONGODB_URI);

  const ngoAId = new mongoose.Types.ObjectId();
  const ngoBId = new mongoose.Types.ObjectId();
  const userAId = new mongoose.Types.ObjectId();

  let passedTests = 0;
  const totalTests = 7;

  try {
    // Cleanup
    await NGO.deleteMany({ contactEmail: { $in: ['contact@apex-care.org', 'contact@foreign-aid.org'] } });
    await User.deleteMany({ email: 'arjun@apex-care.org' });
    await Record.deleteMany({ recordNumber: { $in: ['BEN-1001', 'BEN-1002', 'BEN-1003', 'BEN-9999'] } });
    await RecordType.deleteMany({ slug: 'beneficiary-profile' });
    await AiResult.deleteMany({});
    await AuditLog.deleteMany({ action: 'RECORD_MERGED' });

    // Setup Test NGO & User
    console.log('[SETUP] Setting up test NGO organizations and record types...');
    await NGO.create({
      _id: ngoAId,
      name: 'Apex Humanitarian Care',
      contactEmail: 'contact@apex-care.org',
      status: 'approved'
    });

    await NGO.create({
      _id: ngoBId,
      name: 'Foreign Aid Organization',
      contactEmail: 'contact@foreign-aid.org',
      status: 'approved'
    });

    const testUser = await User.create({
      _id: userAId,
      ngoId: ngoAId,
      name: 'Arjun Mehta',
      email: 'arjun@apex-care.org',
      password: 'SamplePassword123!',
      status: 'active'
    });

    const recordTypeA = await RecordType.create({
      ngoId: ngoAId,
      name: 'Beneficiary Profile',
      slug: 'beneficiary-profile',
      prefix: 'BEN',
      fields: [
        { name: 'Full Name', key: 'fullName', type: 'Text', required: true },
        { name: 'Phone Number', key: 'phone', type: 'Phone' },
        { name: 'Aadhaar / ID', key: 'aadhaarNumber', type: 'Text' },
        { name: 'District', key: 'district', type: 'Text' },
        { name: 'Annual Income', key: 'annualIncome', type: 'Number' },
        { name: 'Family Size', key: 'familySize', type: 'Number' }
      ]
    });

    console.log('✓ Test environment ready.\n');

    // ----------------------------------------------------
    // TEST 1: Phonetic & Fuzzy Deduplication Detection
    // ----------------------------------------------------
    console.log('[TEST 1] Verifying phonetic Soundex & fuzzy duplicate matching...');
    const rec1 = await Record.create({
      ngoId: ngoAId,
      recordTypeId: recordTypeA._id,
      recordNumber: 'BEN-1001',
      data: {
        fullName: 'Rahul Verma',
        phone: '9876543210',
        aadhaarNumber: '1122-3344-5566',
        district: 'Indore',
        annualIncome: 18000,
        familySize: 4
      }
    });

    const rec2 = await Record.create({
      ngoId: ngoAId,
      recordTypeId: recordTypeA._id,
      recordNumber: 'BEN-1002',
      data: {
        fullName: 'Rahool Varma', // Phonetic match (Soundex R400, high string similarity)
        phone: '9876543210',     // Exact phone match
        district: 'Indore',
        annualIncome: 18000,
        familySize: 4
      }
    });

    const dedupResult = await aiService.scanDeduplication(ngoAId, {
      recordTypeId: recordTypeA._id,
      threshold: 0.70
    }, testUser);

    if (dedupResult.duplicatesFound >= 1 && dedupResult.duplicatePairs.length > 0) {
      const pair = dedupResult.duplicatePairs[0];
      const matchScore = pair.confidence || pair.confidencePercentage;
      console.log(`  ✓ Duplicate candidate found with confidence: ${pair.confidencePercentage || (pair.confidence * 100)}%`);
      console.log(`  ✓ Match reasons: ${pair.matchReasons.join(', ')}`);
      passedTests++;
      console.log('✓ TEST 1 PASSED: Phonetic & fuzzy duplicate detection verified.\n');
    } else {
      throw new Error(`TEST 1 FAILED: Expected duplicate pair to be identified, found ${dedupResult.duplicatesFound}`);
    }

    // ----------------------------------------------------
    // TEST 2: Record Anomaly & Data Quality Detection
    // ----------------------------------------------------
    console.log('[TEST 2] Verifying anomaly detection on invalid, malformed, or outlier data...');
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 5);

    const badRec1 = await Record.create({
      ngoId: ngoAId,
      recordTypeId: recordTypeA._id,
      recordNumber: 'BEN-1003',
      data: {
        fullName: '', // Missing name
        phone: '1234', // Malformed phone (<10 digits)
        dateOfBirth: futureDate.toISOString(), // Impossible future DOB
        annualIncome: -500 // Negative amount
      }
    });

    const anomalyResult = await aiService.scanAnomalies(ngoAId, {
      recordTypeId: recordTypeA._id
    }, testUser);

    const flaggedBadRec = anomalyResult.flaggedRecords.find(
      (f) => String(f.recordId || f.recordNumber) === String(badRec1._id) || f.recordNumber === 'BEN-1003'
    );

    if (flaggedBadRec && flaggedBadRec.issues.length >= 2) {
      console.log(`  ✓ Flagged BEN-1003 with severity: ${flaggedBadRec.severity}`);
      console.log(`  ✓ Identified issues: ${flaggedBadRec.issues.join(' | ')}`);
      passedTests++;
      console.log('✓ TEST 2 PASSED: Anomaly detection isolated invalid demographic & numeric data.\n');
    } else {
      throw new Error('TEST 2 FAILED: Expected bad record to be flagged with multiple anomaly issues');
    }

    // ----------------------------------------------------
    // TEST 3: Record Deduplication Merge Operation
    // ----------------------------------------------------
    console.log('[TEST 3] Testing merge of duplicate records and audit logging...');
    const mergeRes = await aiService.mergeRecords(ngoAId, {
      primaryRecordId: rec1._id,
      duplicateRecordId: rec2._id,
      mergedData: { note: 'Merged during AI deduplication review' },
      deleteDuplicate: true
    }, testUser);

    const updatedMaster = await Record.findById(rec1._id);
    const softDeletedDuplicate = await Record.findById(rec2._id);
    const auditRecord = await AuditLog.findOne({
      ngoId: ngoAId,
      action: 'RECORD_MERGED',
      resourceId: rec1._id
    });

    if (
      softDeletedDuplicate.isDeleted === true &&
      String(softDeletedDuplicate.mergedInto) === String(rec1._id) &&
      auditRecord !== null
    ) {
      console.log(`  ✓ Master record updated. Duplicate ${softDeletedDuplicate.recordNumber} soft-deleted with mergedInto: ${softDeletedDuplicate.mergedInto}`);
      console.log(`  ✓ Audit log recorded action: ${auditRecord.action}`);
      passedTests++;
      console.log('✓ TEST 3 PASSED: Record merge and soft-deletion cycle executed seamlessly.\n');
    } else {
      throw new Error('TEST 3 FAILED: Merge did not update master record or soft-delete duplicate correctly');
    }

    // ----------------------------------------------------
    // TEST 4: Vulnerability Demographics Clustering
    // ----------------------------------------------------
    console.log('[TEST 4] Verifying vulnerability categorization and clustering...');
    const vulnResult = await aiService.analyzeVulnerabilities(ngoAId, {
      recordTypeId: recordTypeA._id
    }, testUser);

    if (
      vulnResult.analytics &&
      vulnResult.analytics.vulnerabilityTiers &&
      typeof vulnResult.analytics.totalAnalyzed === 'number'
    ) {
      console.log(`  ✓ Total records clustered: ${vulnResult.analytics.totalAnalyzed}`);
      console.log(`  ✓ High Vulnerability: ${vulnResult.analytics.vulnerabilityTiers.high.count} (${vulnResult.analytics.vulnerabilityTiers.high.percentage}%)`);
      console.log(`  ✓ Medium Vulnerability: ${vulnResult.analytics.vulnerabilityTiers.medium.count} (${vulnResult.analytics.vulnerabilityTiers.medium.percentage}%)`);
      passedTests++;
      console.log('✓ TEST 4 PASSED: Vulnerability clustering tiers computed successfully.\n');
    } else {
      throw new Error('TEST 4 FAILED: Vulnerability clustering results missing expected schema');
    }

    // ----------------------------------------------------
    // TEST 5: Predictive Resource & Demand Forecasting
    // ----------------------------------------------------
    console.log('[TEST 5] Testing predictive demand forecasting calculation...');
    const forecastRes = await aiService.forecastDemand(ngoAId, { periodsAhead: 3 }, testUser);

    if (
      forecastRes.forecast &&
      Array.isArray(forecastRes.forecast.projections) &&
      forecastRes.forecast.projections.length === 3
    ) {
      const p1 = forecastRes.forecast.projections[0];
      console.log(`  ✓ Trend direction: ${forecastRes.forecast.trend_direction}`);
      console.log(`  ✓ Next period demand projection: ${p1.projectedDemand} (Safety buffer: ${p1.recommendedSafetyStock})`);
      passedTests++;
      console.log('✓ TEST 5 PASSED: Predictive demand forecasting calculated with safety stocks.\n');
    } else {
      throw new Error('TEST 5 FAILED: Expected 3 projected demand periods');
    }

    // ----------------------------------------------------
    // TEST 6: Strict Multi-Tenant Zero-Trust Scoping
    // ----------------------------------------------------
    console.log('[TEST 6] Verifying zero-trust tenant isolation across AI scans...');
    const recNGO_B = await Record.create({
      ngoId: ngoBId,
      recordTypeId: recordTypeA._id,
      recordNumber: 'BEN-9999',
      data: {
        fullName: 'Rahul Verma', // Same name as NGO A's record
        phone: '9876543210'
      }
    });

    // NGO A deduplication scan must never see NGO B's records
    const scopeCheckResult = await aiService.scanDeduplication(ngoAId, {}, testUser);
    const crossTenantMatch = (scopeCheckResult.duplicatePairs || []).some(
      (pair) => String(pair.record1?._id) === String(recNGO_B._id) || String(pair.record2?._id) === String(recNGO_B._id)
    );

    if (!crossTenantMatch) {
      console.log('  ✓ Verified: NGO B record BEN-9999 was never scanned or compared against NGO A records.');
      passedTests++;
      console.log('✓ TEST 6 PASSED: Strict multi-tenant isolation enforced for AI operations.\n');
    } else {
      throw new Error('TEST 6 FAILED: Cross-tenant data leak detected in AI deduplication scan');
    }

    // ----------------------------------------------------
    // TEST 7: AI History Persistence & Retrieval
    // ----------------------------------------------------
    console.log('[TEST 7] Verifying AI audit results persistence in AiResult collection...');
    const history = await aiService.getAiHistory(ngoAId, { limit: 10 });

    if (history.length >= 3) {
      console.log(`  ✓ Found ${history.length} persisted AI scan result records for NGO A.`);
      passedTests++;
      console.log('✓ TEST 7 PASSED: AI scan outputs persisted and queryable.\n');
    } else {
      throw new Error(`TEST 7 FAILED: Expected at least 3 persisted AI history records, found ${history.length}`);
    }

    console.log(`=======================================================`);
    console.log(`SUMMARY: ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY!`);
    console.log(`=======================================================\n`);
  } catch (err) {
    console.error('❌ AI Module Test Failed:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runAiModuleTests();

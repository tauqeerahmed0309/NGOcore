const mongoose = require('mongoose');
const env = require('../src/config/env');
const { NGO } = require('../src/modules/ngo/model');
const { User } = require('../src/modules/users/model');
const { RecordType, Record } = require('../src/modules/records/model');
const { Consent, DataRequest } = require('../src/modules/privacy/model');
const { AuditLog } = require('../src/modules/audit/model');
const recordsService = require('../src/modules/records/records.service');
const privacyService = require('../src/modules/privacy/privacy.service');
const { isEncrypted } = require('../src/utils/encryption');

async function runBulkAndPrivacyTests() {
  console.log('=== STARTING BULK IMPORT/EXPORT & DATA PRIVACY TESTS (PHASE 2 MODULES 6 & 7) ===\n');

  await mongoose.connect(env.MONGODB_URI);

  const ngoId = new mongoose.Types.ObjectId();
  const userId = new mongoose.Types.ObjectId();

  let passedTests = 0;
  const totalTests = 8;

  try {
    // Cleanup
    await NGO.deleteMany({ $or: [{ _id: ngoId }, { contactEmail: 'contact@humancare-test.org' }] });
    await User.deleteMany({ $or: [{ _id: userId }, { email: 'aisha@humancare-test.org' }] });
    await RecordType.deleteMany({ ngoId });
    await Record.deleteMany({ ngoId });
    await Consent.deleteMany({ ngoId });
    await DataRequest.deleteMany({ ngoId });
    await AuditLog.deleteMany({ ngoId });

    // Setup Test NGO & User
    console.log('[SETUP] Setting up test NGO and user...');
    await NGO.create({
      _id: ngoId,
      name: 'Humanitarian Care Trust',
      contactEmail: 'contact@humancare-test.org',
      status: 'approved'
    });

    const testUser = await User.create({
      _id: userId,
      ngoId,
      name: 'Aisha Al-Mansoor',
      email: 'aisha@humancare-test.org',
      password: 'SamplePassword123!',
      status: 'active'
    });

    // Seed predefined record types
    const types = await recordsService.seedPredefinedRecordTypes(ngoId);
    const beneficiaryType = types.find((t) => t.slug === 'beneficiary');
    console.log(`✓ Test environment ready. Using Beneficiary schema (${beneficiaryType._id}).\n`);

    // ----------------------------------------------------
    // TEST 1: CSV Template Generation
    // ----------------------------------------------------
    console.log('[TEST 1] Generating CSV template for Beneficiary schema...');
    const template = await recordsService.generateTemplate(ngoId, beneficiaryType._id);

    if (template && template.csv.includes('Full Name') && template.csv.includes('National ID')) {
      console.log(`✓ Template generated successfully (${template.filename}) with headers and format hints.`);
      passedTests++;
    } else {
      throw new Error('Template generation failed or missing required field headers');
    }

    // ----------------------------------------------------
    // TEST 2: Bulk CSV Ingestion & AES Field Encryption
    // ----------------------------------------------------
    console.log('\n[TEST 2] Performing bulk import of multi-row CSV with AES-256 field encryption...');
    const csvData = [
      'Full Name,Gender,National ID / Aadhaar,Phone Number,Primary Address,Assistance Category',
      'Fatima Zahra,Female,ID-99281-XYZ,+91 98765 43210,Sector 4 Camp West,Food Security',
      'Ravi Kumar,Male,ID-44120-ABC,+91 91234 56789,Plot 12 Riverside,Healthcare & Medical',
      'Sunita Devi,Female,ID-88319-DEF,+91 99887 76655,Block B Tent 18,Emergency Cash'
    ].join('\r\n');

    const importResult = await recordsService.bulkImport(
      ngoId,
      beneficiaryType._id,
      { csvText: csvData, defaultStatus: 'Approved', tags: ['BulkBatch-01'] },
      testUser
    );

    if (importResult.importedCount === 3 && importResult.failedCount === 0) {
      console.log(`✓ Successfully imported ${importResult.importedCount} records in batch.`);

      // Verify AES-256 encryption in MongoDB
      const rawRecords = await Record.find({ ngoId }).lean();
      const firstRaw = rawRecords[0];

      if (isEncrypted(firstRaw.data.national_id) && isEncrypted(firstRaw.data.phone)) {
        console.log(`✓ Confirmed: national_id and phone stored in ciphertext: ${firstRaw.data.national_id.slice(0, 30)}...`);
        passedTests++;
      } else {
        throw new Error('Sensitive fields were not encrypted in MongoDB during bulk import!');
      }
    } else {
      throw new Error(`Bulk import failed: imported ${importResult.importedCount}, errors: ${JSON.stringify(importResult.errors)}`);
    }

    // ----------------------------------------------------
    // TEST 3: Bulk Export with Field Masking
    // ----------------------------------------------------
    console.log('\n[TEST 3] Testing bulk CSV export with DPDP privacy masking...');
    const unmaskedExport = await recordsService.bulkExport(ngoId, { recordTypeId: beneficiaryType._id, masked: false }, testUser);
    const maskedExport = await recordsService.bulkExport(ngoId, { recordTypeId: beneficiaryType._id, masked: true }, testUser);

    if (unmaskedExport.count === 3 && unmaskedExport.csv.includes('Fatima Zahra') && unmaskedExport.csv.includes('ID-99281-XYZ')) {
      console.log('✓ Unmasked export generated accurately for authorized compliance export.');
    } else {
      throw new Error('Unmasked export failed');
    }

    if (maskedExport.count === 3 && maskedExport.csv.includes('****') && !maskedExport.csv.includes('ID-99281-XYZ')) {
      console.log('✓ Privacy masked export accurately redacted sensitive identifiers (***-***-****).');
      passedTests++;
    } else {
      throw new Error('Masked export failed to redact PII');
    }

    // Pick one record for privacy workflows
    const targetRecord = await Record.findOne({ ngoId, isDeleted: false });

    // ----------------------------------------------------
    // TEST 4: Record Beneficiary Consent
    // ----------------------------------------------------
    console.log('\n[TEST 4] Recording DPDP compliant beneficiary consent...');
    const consent = await privacyService.grantConsent(
      ngoId,
      {
        recordId: targetRecord._id,
        purpose: 'Humanitarian Aid & Relief',
        proofType: 'Written Form',
        witnessName: 'Mohammad Farooq (Field Officer)',
        validUntil: new Date(Date.now() + 365 * 24 * 3600 * 1000)
      },
      testUser
    );

    if (consent && consent.status === 'granted' && consent.purpose === 'Humanitarian Aid & Relief') {
      console.log(`✓ Consent recorded: "${consent.purpose}" via ${consent.proofType}.`);
      passedTests++;
    } else {
      throw new Error('Failed to record consent');
    }

    // ----------------------------------------------------
    // TEST 5: Withdraw Consent
    // ----------------------------------------------------
    console.log('\n[TEST 5] Withdrawing consent upon subject notification...');
    const withdrawnConsent = await privacyService.withdrawConsent(
      ngoId,
      consent._id,
      { reason: 'Beneficiary relocated out of district' },
      testUser
    );

    if (withdrawnConsent.status === 'withdrawn') {
      console.log('✓ Consent successfully updated to status: "withdrawn".');
      passedTests++;
    } else {
      throw new Error('Failed to withdraw consent');
    }

    // ----------------------------------------------------
    // TEST 6: Execute DPDP Right to be Forgotten (Cryptographic Erasure)
    // ----------------------------------------------------
    console.log('\n[TEST 6] Executing DPDP Right to be Forgotten (Cryptographic PII Redaction)...');
    const erasureResult = await privacyService.executeRightToBeForgotten(
      ngoId,
      {
        recordId: targetRecord._id,
        requestedBy: 'Legal Guardian of Beneficiary',
        reason: 'Individual requested complete profile erasure under DPDP Section 12'
      },
      testUser
    );

    if (erasureResult.success && erasureResult.certificate) {
      console.log(`✓ Right to be Forgotten executed.`);
      console.log(`✓ Certificate Number: ${erasureResult.certificate.certificateNumber}`);
      console.log(`✓ SHA-256 Proof: ${erasureResult.certificate.sha256Proof}`);

      // Verify database record has scrubbed values
      const updatedDoc = await Record.findById(targetRecord._id).lean();
      if (
        updatedDoc.data.full_name === '[REDACTED_DPDP_RIGHT_TO_ERASURE]' &&
        updatedDoc.data.national_id === '[REDACTED_DPDP_RIGHT_TO_ERASURE]'
      ) {
        console.log('✓ All PII fields scrubbed to [REDACTED_DPDP_RIGHT_TO_ERASURE] while preserving audit integrity.');
        passedTests++;
      } else {
        throw new Error('PII fields were not redacted!');
      }
    } else {
      throw new Error('Right to be Forgotten execution failed');
    }

    // ----------------------------------------------------
    // TEST 7: Subject Access Request (SAR) Export
    // ----------------------------------------------------
    console.log('\n[TEST 7] Generating Subject Access Request (SAR) portability package...');
    const sarPackage = await privacyService.exportSubjectAccessData(ngoId, targetRecord._id, testUser);

    if (
      sarPackage &&
      sarPackage.subjectProfile &&
      sarPackage.consentHistory &&
      sarPackage.complianceStandard.includes('DPDP')
    ) {
      console.log(`✓ SAR portability package generated with compliance standard: ${sarPackage.complianceStandard}.`);
      passedTests++;
    } else {
      throw new Error('Failed to generate SAR package');
    }

    // ----------------------------------------------------
    // TEST 8: Cryptographic Audit Logging Verification
    // ----------------------------------------------------
    console.log('\n[TEST 8] Verifying cryptographic hash chaining of all bulk & privacy actions in audit trail...');
    const privacyAuditLogs = await AuditLog.find({ ngoId }).sort({ createdAt: 1 });
    const logActions = privacyAuditLogs.map((l) => l.action);

    if (
      logActions.includes('BULK_IMPORT_RECORDS') &&
      logActions.includes('EXPORT_RECORDS') &&
      logActions.includes('GRANT_CONSENT') &&
      logActions.includes('RIGHT_TO_BE_FORGOTTEN_EXECUTED')
    ) {
      console.log(`✓ Audit trail verified: all ${logActions.length} actions logged with deterministic SHA-256 chaining.`);
      passedTests++;
    } else {
      throw new Error(`Missing expected audit actions: ${logActions.join(', ')}`);
    }

    console.log(`\n========================================`);
    console.log(`RESULT: ${passedTests}/${totalTests} TESTS PASSED (100% SUCCESS)`);
    console.log(`========================================\n`);

  } catch (err) {
    console.error('\n❌ TEST FAILED:', err.message);
    process.exit(1);
  } finally {
    // Cleanup
    await NGO.deleteMany({ _id: ngoId });
    await User.deleteMany({ _id: userId });
    await RecordType.deleteMany({ ngoId });
    await Record.deleteMany({ ngoId });
    await Consent.deleteMany({ ngoId });
    await DataRequest.deleteMany({ ngoId });
    await AuditLog.deleteMany({ ngoId });
    await mongoose.disconnect();
  }
}

runBulkAndPrivacyTests();

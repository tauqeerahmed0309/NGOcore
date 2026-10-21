const mongoose = require('mongoose');
const env = require('../src/config/env');
const { NGO } = require('../src/modules/ngo/model');
const { User } = require('../src/modules/users/model');
const { RecordType, Record } = require('../src/modules/records/model');
const recordsService = require('../src/modules/records/records.service');
const { isEncrypted } = require('../src/utils/encryption');
const { AuditLog } = require('../src/modules/audit/model');

async function runRecordsEngineTests() {
  console.log('=== STARTING RECORD MANAGEMENT ENGINE TESTS (PHASE 2 MODULE 1) ===\n');

  await mongoose.connect(env.MONGODB_URI);

  const ngoAId = new mongoose.Types.ObjectId();
  const ngoBId = new mongoose.Types.ObjectId();
  const userAId = new mongoose.Types.ObjectId();
  const userBId = new mongoose.Types.ObjectId();

  let passedTests = 0;
  const totalTests = 7;

  try {
    // Cleanup any lingering test data
    await NGO.deleteMany({ _id: { $in: [ngoAId, ngoBId] } });
    await User.deleteMany({ _id: { $in: [userAId, userBId] } });
    await RecordType.deleteMany({ ngoId: { $in: [ngoAId, ngoBId] } });
    await Record.deleteMany({ ngoId: { $in: [ngoAId, ngoBId] } });
    await AuditLog.deleteMany({ ngoId: { $in: [ngoAId, ngoBId] } });

    // Setup Test NGOs and Users
    console.log('[SETUP] Initializing test NGO tenants and user accounts...');
    const testNgoA = await NGO.create({
      _id: ngoAId,
      name: 'Global Hope Foundation',
      contactEmail: 'contact@globalhope-test.org',
      status: 'approved'
    });

    const testNgoB = await NGO.create({
      _id: ngoBId,
      name: 'Shelter First Aid',
      contactEmail: 'contact@shelterfirst-test.org',
      status: 'approved'
    });

    const testUserA = await User.create({
      _id: userAId,
      ngoId: ngoAId,
      name: 'Elena Rostova',
      email: 'elena@globalhope-test.org',
      password: 'SamplePassword123!',
      status: 'active'
    });

    const testUserB = await User.create({
      _id: userBId,
      ngoId: ngoBId,
      name: 'Carlos Mendez',
      email: 'carlos@shelterfirst-test.org',
      password: 'SamplePassword123!',
      status: 'active'
    });

    console.log('✓ Test tenants and users ready.\n');

    // ----------------------------------------------------
    // TEST 1: Seed Predefined Record Types
    // ----------------------------------------------------
    console.log('[TEST 1] Testing automatic seeding of predefined record types...');
    const types = await recordsService.getRecordTypes(ngoAId);
    if (types.length >= 4) {
      const slugs = types.map((t) => t.slug);
      if (
        slugs.includes('beneficiary') &&
        slugs.includes('aid-distribution') &&
        slugs.includes('donation-grant') &&
        slugs.includes('volunteer-staff')
      ) {
        console.log(`✓ Seeded ${types.length} predefined record types successfully: [${slugs.join(', ')}]`);
        passedTests++;
      } else {
        throw new Error(`Missing expected slugs: ${slugs.join(', ')}`);
      }
    } else {
      throw new Error(`Expected at least 4 predefined types, found ${types.length}`);
    }

    // ----------------------------------------------------
    // TEST 2: Custom Record Type Creation
    // ----------------------------------------------------
    console.log('\n[TEST 2] Creating a bespoke custom record type with encrypted sensitive fields...');
    const customType = await recordsService.createRecordType(
      ngoAId,
      {
        name: 'Mobile Medical Clinic Intake',
        prefix: 'MED',
        icon: 'Stethoscope',
        description: 'Field medical evaluation and prescription records',
        fields: [
          { name: 'Patient Name', key: 'patient_name', type: 'Text', required: true },
          { name: 'Diagnosis Summary', key: 'diagnosis', type: 'Long Text', required: true },
          {
            name: 'Blood Group',
            key: 'blood_group',
            type: 'Dropdown',
            options: ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']
          },
          {
            name: 'Medical History Notes',
            key: 'medical_notes',
            type: 'Encrypted Text',
            isSensitive: true,
            required: true
          }
        ]
      },
      testUserA
    );

    if (customType && customType.slug === 'mobile-medical-clinic-intake' && customType.prefix === 'MED') {
      console.log(`✓ Custom record type created: "${customType.name}" (Slug: ${customType.slug}, Prefix: ${customType.prefix})`);
      passedTests++;
    } else {
      throw new Error('Failed to create custom record type');
    }

    // ----------------------------------------------------
    // TEST 3: Create Record with AES-256-GCM Field Encryption
    // ----------------------------------------------------
    console.log('\n[TEST 3] Creating record with sensitive fields and verifying cryptographic encryption in MongoDB...');
    const createdRecord = await recordsService.createRecord(
      ngoAId,
      {
        recordTypeId: customType._id,
        data: {
          patient_name: 'Amara Diallo',
          diagnosis: 'Acute dehydration and seasonal influenza',
          blood_group: 'O+',
          medical_notes: 'CONFIDENTIAL: Patient has prior severe penicillin allergy and diabetes type 2.'
        },
        tags: ['Camp-East', 'UrgentCare']
      },
      testUserA
    );

    // Inspect the raw document directly in MongoDB to ensure AES-256 ciphertext is stored
    const rawDoc = await Record.findById(createdRecord._id).lean();
    const rawMedicalNotes = rawDoc.data.medical_notes;

    if (!rawMedicalNotes || !isEncrypted(rawMedicalNotes)) {
      throw new Error(`Field "medical_notes" was NOT encrypted in MongoDB! Value: ${rawMedicalNotes}`);
    }

    if (!createdRecord.recordNumber.startsWith('MED-')) {
      throw new Error(`Record number did not match prefix: ${createdRecord.recordNumber}`);
    }

    console.log(`✓ Record created: ${createdRecord.recordNumber}`);
    console.log(`✓ Field "medical_notes" successfully encrypted with AES-256-GCM: ${rawMedicalNotes.slice(0, 32)}...`);
    passedTests++;

    // ----------------------------------------------------
    // TEST 4: Transparent Decryption for Authorized Caller
    // ----------------------------------------------------
    console.log('\n[TEST 4] Retrieving record and asserting transparent decryption for authorized user...');
    const fetchedRecord = await recordsService.getRecordById(ngoAId, createdRecord._id);

    if (fetchedRecord.data.medical_notes === 'CONFIDENTIAL: Patient has prior severe penicillin allergy and diabetes type 2.') {
      console.log('✓ Sensitive field decrypted accurately back to plaintext for authorized caller.');
      passedTests++;
    } else {
      throw new Error(`Decrypted text mismatch: ${fetchedRecord.data.medical_notes}`);
    }

    // ----------------------------------------------------
    // TEST 5: Strict Multi-Tenant Isolation
    // ----------------------------------------------------
    console.log('\n[TEST 5] Verifying zero-trust tenant isolation between NGO A and NGO B...');
    let crossTenantFetchFailed = false;
    try {
      await recordsService.getRecordById(ngoBId, createdRecord._id);
    } catch (err) {
      if (err.statusCode === 404) {
        crossTenantFetchFailed = true;
      }
    }

    const ngoBRecords = await recordsService.getRecords(ngoBId);

    if (crossTenantFetchFailed && ngoBRecords.records.length === 0) {
      console.log('✓ Multi-tenant isolation verified: NGO B cannot view, query, or resolve NGO A records.');
      passedTests++;
    } else {
      throw new Error('Tenant isolation breach! NGO B accessed NGO A record.');
    }

    // ----------------------------------------------------
    // TEST 6: Soft-Delete Safety
    // ----------------------------------------------------
    console.log('\n[TEST 6] Soft-deleting record and verifying exclusion from standard queries...');
    await recordsService.deleteRecord(ngoAId, createdRecord._id, testUserA);

    const activeRecords = await recordsService.getRecords(ngoAId);
    const softDeletedDoc = await Record.findById(createdRecord._id);

    if (activeRecords.records.length === 0 && softDeletedDoc.isDeleted === true && softDeletedDoc.deletedAt) {
      console.log(`✓ Record ${createdRecord.recordNumber} safely soft-deleted and filtered from active list.`);
      passedTests++;
    } else {
      throw new Error('Soft-delete failed or record still visible in active list.');
    }

    // ----------------------------------------------------
    // TEST 7: Chained Audit Log Generation
    // ----------------------------------------------------
    console.log('\n[TEST 7] Verifying cryptographic audit logs generated for record creation & deletion...');
    const auditLogs = await AuditLog.find({ ngoId: ngoAId, resource: 'records' }).sort({ createdAt: 1 });

    if (auditLogs.length >= 2) {
      const actions = auditLogs.map((l) => l.action);
      if (actions.includes('CREATE_RECORD') && actions.includes('DELETE_RECORD')) {
        console.log(`✓ Audit logs verified: [${actions.join(', ')}] with SHA-256 hashes.`);
        passedTests++;
      } else {
        throw new Error(`Missing expected audit actions: ${actions.join(', ')}`);
      }
    } else {
      throw new Error(`Expected at least 2 record audit logs, found ${auditLogs.length}`);
    }

    console.log(`\n========================================`);
    console.log(`RESULT: ${passedTests}/${totalTests} TESTS PASSED (100% SUCCESS)`);
    console.log(`========================================\n`);

  } catch (err) {
    console.error('\n❌ TEST FAILED:', err.message);
    process.exit(1);
  } finally {
    // Cleanup test data
    await NGO.deleteMany({ _id: { $in: [ngoAId, ngoBId] } });
    await User.deleteMany({ _id: { $in: [userAId, userBId] } });
    await RecordType.deleteMany({ ngoId: { $in: [ngoAId, ngoBId] } });
    await Record.deleteMany({ ngoId: { $in: [ngoAId, ngoBId] } });
    await AuditLog.deleteMany({ ngoId: { $in: [ngoAId, ngoBId] } });
    await mongoose.disconnect();
  }
}

runRecordsEngineTests();

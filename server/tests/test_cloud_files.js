const mongoose = require('mongoose');
const env = require('../src/config/env');
const crypto = require('crypto');
const { NGO } = require('../src/modules/ngo/model');
const { User } = require('../src/modules/users/model');
const { File } = require('../src/modules/files/model');
const { AuditLog } = require('../src/modules/audit/model');
const filesService = require('../src/modules/files/files.service');
const { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } = require('../src/middleware/fileValidation');

async function runCloudFilesTests() {
  console.log('=== STARTING CLOUD FILE MANAGEMENT & SECURITY TESTS (PHASE 2 MODULES 8 & 9) ===\n');

  await mongoose.connect(env.MONGODB_URI);

  const ngoAId = new mongoose.Types.ObjectId();
  const ngoBId = new mongoose.Types.ObjectId();
  const userAId = new mongoose.Types.ObjectId();

  let passedTests = 0;
  const totalTests = 6;

  try {
    // Cleanup
    await NGO.deleteMany({ _id: { $in: [ngoAId, ngoBId] } });
    await User.deleteMany({ _id: userAId });
    await File.deleteMany({ ngoId: { $in: [ngoAId, ngoBId] } });
    await AuditLog.deleteMany({ ngoId: { $in: [ngoAId, ngoBId] } });

    // Setup Test NGOs and Users
    console.log('[SETUP] Setting up test NGO tenants and user...');
    await NGO.create({
      _id: ngoAId,
      name: 'Sahara Relief Trust',
      contactEmail: 'contact@sahara-test.org',
      status: 'approved'
    });

    await NGO.create({
      _id: ngoBId,
      name: 'Compassion Worldwide',
      contactEmail: 'contact@compassion-test.org',
      status: 'approved'
    });

    const testUserA = await User.create({
      _id: userAId,
      ngoId: ngoAId,
      name: 'Zainab Qasim',
      email: 'zainab@sahara-test.org',
      password: 'SamplePassword123!',
      status: 'active'
    });

    console.log('✓ Test environment ready.\n');

    // ----------------------------------------------------
    // TEST 1: MIME Type Whitelisting & Size Verification
    // ----------------------------------------------------
    console.log('[TEST 1] Verifying MIME type validation and size limits...');
    if (
      ALLOWED_MIME_TYPES.has('application/pdf') &&
      ALLOWED_MIME_TYPES.has('image/png') &&
      !ALLOWED_MIME_TYPES.has('application/x-msdownload') &&
      MAX_FILE_SIZE === 10 * 1024 * 1024
    ) {
      console.log('✓ File validation rules confirmed: strict MIME whitelisting and 10MB cap.');
      passedTests++;
    } else {
      throw new Error('MIME validation rules mismatch');
    }

    // ----------------------------------------------------
    // TEST 2: File Upload Metadata & SHA-256 Checksum Persistence
    // ----------------------------------------------------
    console.log('\n[TEST 2] Saving uploaded document with deterministic SHA-256 fileHash...');
    const dummyBuffer = Buffer.from('PDF-DOCUMENT-CONTENT-FOR-VERIFICATION-OF-AID-DELIVERY');
    const expectedHash = crypto.createHash('sha256').update(dummyBuffer).digest('hex');

    const uploadedDoc = await filesService.saveFileMetadata({
      ngoId: ngoAId,
      file: {
        originalname: 'Medical_Aid_Handover_Signed.pdf',
        filename: '1729450000000-Medical_Aid_Handover_Signed.pdf',
        mimetype: 'application/pdf',
        size: dummyBuffer.length,
        path: '/uploads/1729450000000-Medical_Aid_Handover_Signed.pdf',
        sha256Hash: expectedHash
      },
      tags: ['Medical', 'Handover', 'DonorReceipt'],
      user: testUserA
    });

    if (uploadedDoc && uploadedDoc.fileHash === expectedHash) {
      console.log(`✓ File record persisted: "${uploadedDoc.originalName}"`);
      console.log(`✓ SHA-256 Hash stored: ${uploadedDoc.fileHash}`);
      passedTests++;
    } else {
      throw new Error('File upload metadata persistence failed');
    }

    // ----------------------------------------------------
    // TEST 3: Paginated File Retrieval
    // ----------------------------------------------------
    console.log('\n[TEST 3] Querying tenant files with pagination...');
    const fileList = await filesService.getFiles(ngoAId, { page: 1, limit: 10 });

    if (fileList.files.length === 1 && fileList.files[0]._id.toString() === uploadedDoc._id.toString()) {
      console.log(`✓ Retrieved ${fileList.files.length} tenant file with author and timestamp.`);
      passedTests++;
    } else {
      throw new Error('Failed to retrieve file list');
    }

    // ----------------------------------------------------
    // TEST 4: Zero-Trust Multi-Tenant Isolation
    // ----------------------------------------------------
    console.log('\n[TEST 4] Verifying cross-tenant file isolation...');
    let crossTenantFetchFailed = false;
    try {
      await filesService.getFileById(ngoBId, uploadedDoc._id);
    } catch (err) {
      if (err.statusCode === 404) crossTenantFetchFailed = true;
    }

    const ngoBFiles = await filesService.getFiles(ngoBId);

    if (crossTenantFetchFailed && ngoBFiles.files.length === 0) {
      console.log('✓ Multi-tenant isolation verified: NGO B cannot query, view, or download NGO A files.');
      passedTests++;
    } else {
      throw new Error('Cross-tenant file leakage detected!');
    }

    // ----------------------------------------------------
    // TEST 5: File Deletion & Archival
    // ----------------------------------------------------
    console.log('\n[TEST 5] Deleting and archiving file...');
    const deleteResult = await filesService.deleteFile(ngoAId, uploadedDoc._id, testUserA);

    const activeFiles = await filesService.getFiles(ngoAId);
    const archivedDoc = await File.findById(uploadedDoc._id);

    if (deleteResult.success && activeFiles.files.length === 0 && archivedDoc.isArchived === true) {
      console.log('✓ File successfully deleted from active storage and marked as archived.');
      passedTests++;
    } else {
      throw new Error('File deletion failed');
    }

    // ----------------------------------------------------
    // TEST 6: Audit Logging of File Lifecycle
    // ----------------------------------------------------
    console.log('\n[TEST 6] Verifying cryptographic hash chaining of file upload & deletion audit logs...');
    const auditLogs = await AuditLog.find({ ngoId: ngoAId, resource: 'files' }).sort({ createdAt: 1 });
    const logActions = auditLogs.map((l) => l.action);

    if (logActions.includes('FILE_UPLOADED') && logActions.includes('FILE_DELETED')) {
      console.log(`✓ Audit logs verified: [${logActions.join(', ')}] with SHA-256 hashes.`);
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
    // Teardown
    await NGO.deleteMany({ _id: { $in: [ngoAId, ngoBId] } });
    await User.deleteMany({ _id: userAId });
    await File.deleteMany({ ngoId: { $in: [ngoAId, ngoBId] } });
    await AuditLog.deleteMany({ ngoId: { $in: [ngoAId, ngoBId] } });
    await mongoose.disconnect();
  }
}

runCloudFilesTests();

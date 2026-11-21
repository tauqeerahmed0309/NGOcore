const assert = require('assert');
const storageService = require('../services/storageService');

(async () => {
  console.log('\n================================================================');
  console.log('   RUNNING STORAGE ABSTRACTION VERIFICATION TEST SUITE         ');
  console.log('================================================================\n');

  try {
    // 1. Store private document
    const sampleBuffer = Buffer.from('Confidential NGO Audit Document 2026', 'utf-8');
    const ngoId = '6ac752282229004b449084a4';
    
    const stored = await storageService.storeFile({
      buffer: sampleBuffer,
      originalname: 'audit_certificate.pdf',
      mimetype: 'application/pdf',
      ngoId,
      category: 'compliance',
      isPrivate: true
    });

    assert(stored.storageKey.startsWith(`${ngoId}/compliance/`), 'Storage key must include tenant ID and category');
    assert(stored.fileName === 'audit_certificate.pdf', 'Original filename preserved');
    assert(stored.fileSize === sampleBuffer.length, 'File size matches buffer length');
    assert(stored.isPrivate === true, 'Flagged as private document');
    console.log('✅ Test 1: Store private compliance document with tenant prefix  -> PASSED');

    // 2. Retrieve file stream and verify content
    const stream = await storageService.getFileStream(stored.storageKey, true);
    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    const retrievedContent = Buffer.concat(chunks).toString('utf-8');
    assert(retrievedContent === 'Confidential NGO Audit Document 2026', 'Streamed content matches original buffer');
    console.log('✅ Test 2: Retrieve private file stream without corruption       -> PASSED');

    // 3. Path traversal attack rejection
    let pathTraversalCaught = false;
    try {
      await storageService.getFileStream('../../etc/passwd', true);
    } catch (err) {
      pathTraversalCaught = err.message.includes('Invalid storage path traversal attempt');
    }
    assert(pathTraversalCaught, 'Path traversal attempt blocked with security exception');
    console.log('✅ Test 3: Path traversal attempt is strictly blocked            -> PASSED');

    // 4. Store public asset
    const publicBuffer = Buffer.from('Public Logo Image Bytes', 'utf-8');
    const publicStored = await storageService.storeFile({
      buffer: publicBuffer,
      originalname: 'ngo_logo.png',
      mimetype: 'image/png',
      ngoId,
      category: 'logos',
      isPrivate: false
    });
    assert(publicStored.fileUrl.startsWith('/uploads/'), 'Public file URL uses public static mount');
    console.log('✅ Test 4: Store public asset with /uploads/ routing             -> PASSED');

    // 5. Cleanup stored files
    await storageService.deleteFile(stored.storageKey, true);
    await storageService.deleteFile(publicStored.storageKey, false);
    console.log('✅ Test 5: Safe deletion cleans up test files cleanly            -> PASSED');

    console.log('\n================================================================');
    console.log('ALL STORAGE ABSTRACTION VERIFICATION TESTS PASSED! ✅');
    console.log('================================================================\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Storage test failed:', err);
    process.exit(1);
  }
})();

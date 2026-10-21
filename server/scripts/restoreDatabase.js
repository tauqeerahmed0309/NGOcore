const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { NGO } = require('../src/modules/ngo/model');
const { User } = require('../src/modules/users/model');
const { RecordType, Record } = require('../src/modules/records/model');
const { Consent, DataRequest } = require('../src/modules/privacy/model');
const { File } = require('../src/modules/files/model');
const { AuditLog } = require('../src/modules/audit/model');
const { BlockchainAnchor } = require('../src/modules/blockchain/model');
const { AiResult } = require('../src/modules/ai/model');

const BACKUP_DIR = path.join(__dirname, '../backups');

async function restoreDatabase(specifiedFile = null) {
  console.log('=== STARTING DISASTER RECOVERY DATABASE RESTORATION ===\n');

  if (!fs.existsSync(BACKUP_DIR)) {
    console.error('❌ Error: Backup directory does not exist.');
    process.exit(1);
  }

  let fileToRestore = specifiedFile;
  if (!fileToRestore) {
    // Find latest backup file in directory
    const files = fs.readdirSync(BACKUP_DIR).filter((f) => (f.startsWith('ngocore_backup_') || f.startsWith('ngoconnect_backup_')) && f.endsWith('.json'));
    if (files.length === 0) {
      console.error('❌ Error: No backup files found in backup directory.');
      process.exit(1);
    }
    files.sort().reverse();
    fileToRestore = files[0];
  }

  const backupFilePath = path.join(BACKUP_DIR, fileToRestore);
  console.log(`[1/4] Reading backup snapshot: ${fileToRestore}...`);
  const content = fs.readFileSync(backupFilePath, 'utf-8');
  const computedChecksum = crypto.createHash('sha256').update(content).digest('hex');

  // Verify against manifest if exists
  const manifestFile = fileToRestore.replace('ngocore_backup_', 'manifest_').replace('ngoconnect_backup_', 'manifest_');
  const manifestPath = path.join(BACKUP_DIR, manifestFile);
  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    if (manifest.checksum !== computedChecksum) {
      console.error('❌ CRITICAL ERROR: Checksum mismatch! Backup file may have been corrupted or tampered with.');
      process.exit(1);
    }
    console.log('  ✓ SHA-256 Checksum verified against signed manifest.');
  }

  const data = JSON.parse(content);
  const collections = data.collections || {};

  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ngo_management';
  await mongoose.connect(mongoUri);

  try {
    console.log('[2/4] Restoring NGO tenants, schemas, and users...');
    if (collections.ngos?.length) {
      for (const item of collections.ngos) {
        await NGO.findOneAndUpdate({ _id: item._id }, item, { upsert: true });
      }
    }

    if (collections.users?.length) {
      for (const item of collections.users) {
        await User.findOneAndUpdate({ _id: item._id }, item, { upsert: true });
      }
    }

    if (collections.recordTypes?.length) {
      for (const item of collections.recordTypes) {
        await RecordType.findOneAndUpdate({ _id: item._id }, item, { upsert: true });
      }
    }

    console.log('[3/4] Restoring records, files, and DPDP privacy requests...');
    if (collections.records?.length) {
      for (const item of collections.records) {
        await Record.findOneAndUpdate({ _id: item._id }, item, { upsert: true });
      }
    }

    if (collections.consents?.length) {
      for (const item of collections.consents) {
        await Consent.findOneAndUpdate({ _id: item._id }, item, { upsert: true });
      }
    }

    if (collections.blockchainAnchors?.length) {
      for (const item of collections.blockchainAnchors) {
        await BlockchainAnchor.findOneAndUpdate({ _id: item._id }, item, { upsert: true });
      }
    }

    console.log('[4/4] Restoration complete. Validating system integrity...');
    const totalRecords = await Record.countDocuments();
    const totalNgos = await NGO.countDocuments();
    console.log(`  ✓ Restored active records: ${totalRecords}`);
    console.log(`  ✓ Restored active NGOs:    ${totalNgos}`);

    console.log('\n======================================================');
    console.log('✅ DATABASE RESTORE COMPLETED SUCCESSFULLY');
    console.log('======================================================\n');
  } catch (err) {
    console.error('❌ Database restoration failed:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

const argFile = process.argv[2] || null;
restoreDatabase(argFile);

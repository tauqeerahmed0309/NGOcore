const mongoose = require('mongoose');
const argon2 = require('argon2');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { NGO } = require('../src/modules/ngo/model');
const { User } = require('../src/modules/users/model');
const { Role } = require('../src/modules/ngo/model');
const { RecordType, Record } = require('../src/modules/records/model');
const { Consent } = require('../src/modules/privacy/model');
const { BlockchainAnchor } = require('../src/modules/blockchain/model');
const { AuditLog } = require('../src/modules/audit/model');
const recordsService = require('../src/modules/records/records.service');
const blockchainService = require('../src/modules/blockchain/blockchain.service');
const { encrypt } = require('../src/utils/encryption');

async function seedDemoData() {
  console.log('=== SEEDING REALISTIC DEMO DATASET (PHASE 3 MODULE 7) ===\n');

  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ngo_management';
  await mongoose.connect(mongoUri);

  try {
    // 1. Setup Demo NGO
    console.log('[1/7] Initializing Asha Hope Foundation NGO...');
    let ngo = await NGO.findOne({ contactEmail: 'asha@hope-foundation.org' });
    const ngoIndianData = {
      name: 'Asha Hope Foundation',
      contactEmail: 'asha@hope-foundation.org',
      status: 'approved',
      contactPhone: '+91 98260 12345',
      registrationType: 'Registered Public Charitable Trust',
      registrationNumber: 'TRUST/IND/2024/8849',
      registrationYear: 2018,
      pan: 'AABTA4582K',
      registration12A: 'AAETA1234FE20214',
      registration80G: 'AAETA1234FE20215',
      ngoDarpanId: 'MP/2021/0284918',
      csr1Number: 'CSR00018492',
      gstin: '23AABTA4582K1Z5',
      addressLine1: '12 Civil Lines, Residency Area',
      city: 'Indore',
      district: 'Indore',
      state: 'Madhya Pradesh',
      pincode: '452001',
      country: 'India',
      address: '12 Civil Lines, Residency Area, Indore, Madhya Pradesh - 452001, India',
      settings: {
        currency: 'INR',
        timezone: 'Asia/Kolkata',
        dateFormat: 'DD/MM/YYYY',
        twoFactorRequired: false,
        sessionTimeoutMinutes: 60,
        retentionDays: 1825,
        allowedIpRanges: []
      }
    };

    if (!ngo) {
      ngo = await NGO.create(ngoIndianData);
      console.log(`  ✓ NGO created with ID: ${ngo._id}`);
    } else {
      Object.assign(ngo, ngoIndianData);
      await ngo.save();
      console.log(`  ✓ Using updated NGO ID: ${ngo._id}`);
    }

    // 2. Setup Roles & Users
    console.log('[2/7] Seeding staff user accounts...');
    const defaultPassword = 'Password@123!';
    const hashedPassword = await argon2.hash(defaultPassword);

    const usersToSeed = [
      {
        name: 'Aarav Sharma',
        email: 'admin@hope-foundation.org',
        role: 'NGO Admin',
        permissions: ['*'],
        title: 'Executive Director'
      },
      {
        name: 'Priya Nair',
        email: 'priya@hope-foundation.org',
        role: 'Program Director',
        permissions: ['records:read', 'records:create', 'records:update', 'audit:read', 'files:read', 'files:create'],
        title: 'Senior Relief Coordinator'
      },
      {
        name: 'Vikram Patel',
        email: 'vikram@hope-foundation.org',
        role: 'Field Caseworker',
        permissions: ['records:read', 'records:create'],
        title: 'Field Officer'
      }
    ];

    const seededUsers = [];
    for (const u of usersToSeed) {
      let roleDoc = await Role.findOne({ ngoId: ngo._id, name: u.role });
      if (!roleDoc) {
        roleDoc = await Role.create({
          ngoId: ngo._id,
          name: u.role,
          description: u.title,
          permissions: u.permissions,
          isSystem: u.role === 'NGO Admin'
        });
      }

      let user = await User.findOne({ email: u.email });
      if (!user) {
        user = await User.create({
          ngoId: ngo._id,
          name: u.name,
          email: u.email,
          password: hashedPassword,
          roleId: roleDoc._id,
          designation: u.title,
          status: 'active'
        });
        console.log(`  ✓ Seeded User: ${u.name} (${u.email}) [${u.role}]`);
      } else {
        user.roleId = roleDoc._id;
        user.designation = u.title;
        user.status = 'active';
        await user.save();
        console.log(`  ✓ User updated with role: ${u.email} [${u.role}]`);
      }
      seededUsers.push(user);
    }

    const adminUser = seededUsers[0];

    // 3. Predefined & Custom Record Types
    console.log('[3/7] Seeding record schemas...');
    const recordTypes = await recordsService.seedPredefinedRecordTypes(ngo._id);
    const beneficiaryType = recordTypes.find((t) => t.slug === 'beneficiary');
    const aidType = recordTypes.find((t) => t.slug === 'aid-distribution');

    console.log(`  ✓ Predefined schemas ready: ${recordTypes.map((t) => t.slug).join(', ')}`);

    // 4. Seed Beneficiary Records (Including AI Deduplication Test Pairs)
    console.log('[4/7] Seeding realistic beneficiary records with AES-256 field encryption...');
    const beneficiaries = [
      {
        recordNumber: 'BEN-2026-00001',
        data: {
          full_name: 'Sunita Devi',
          phone: '+91 98261 12233',
          national_id: 'XXXX XXXX 6677',
          date_of_birth: '1984-04-12',
          gender: 'Female',
          district: 'Indore',
          state: 'Madhya Pradesh',
          pincode: '452001',
          village_ward: 'Ward 14, Pardeshipura',
          annualIncome: 180000,
          familySize: 5,
          vulnerability_index: 'High Priority (Widow / Destitute / PwD)',
          assistance_category: 'Disaster Relief',
          ration_card_category: 'Below Poverty Line (BPL)',
          caste_category: 'OBC'
        }
      },
      {
        recordNumber: 'BEN-2026-00002',
        // Phonetic duplicate of BEN-2026-00001 for AI scanning demo
        data: {
          full_name: 'Suneeta Daivy', // Phonetic match
          phone: '+91 98261 12233',   // Exact phone match
          national_id: 'XXXX XXXX 6677',
          district: 'Indore',
          state: 'Madhya Pradesh',
          pincode: '452001',
          village_ward: 'Ward 14, Pardeshipura',
          annualIncome: 180000,
          familySize: 5,
          vulnerability_index: 'High Priority (Widow / Destitute / PwD)',
          assistance_category: 'Disaster Relief',
          ration_card_category: 'Below Poverty Line (BPL)',
          caste_category: 'OBC'
        }
      },
      {
        recordNumber: 'BEN-2026-00003',
        data: {
          full_name: 'Mohammad Farooq',
          phone: '+91 98765 43210',
          national_id: 'XXXX XXXX 9900',
          date_of_birth: '1976-11-20',
          gender: 'Male',
          district: 'Bhopal',
          state: 'Madhya Pradesh',
          pincode: '462001',
          village_ward: 'Old City, Ward 22',
          annualIncome: 350000,
          familySize: 4,
          vulnerability_index: 'Moderate Need',
          assistance_category: 'Healthcare Camp',
          ration_card_category: 'Above Poverty Line (APL)',
          caste_category: 'General'
        }
      },
      {
        recordNumber: 'BEN-2026-00004',
        data: {
          full_name: 'Kavita Rathore',
          phone: '+91 91234 56780',
          national_id: 'XXXX XXXX 7788',
          date_of_birth: '1992-08-15',
          gender: 'Female',
          district: 'Ujjain',
          state: 'Madhya Pradesh',
          pincode: '456001',
          village_ward: 'Mahakal Marg, Ward 5',
          annualIncome: 120000,
          familySize: 6,
          vulnerability_index: 'High Priority (Widow / Destitute / PwD)',
          assistance_category: 'Nutrition & Food Relief',
          ration_card_category: 'Antyodaya Anna Yojana (AAY)',
          caste_category: 'SC'
        }
      },
      {
        recordNumber: 'BEN-2026-00005',
        data: {
          full_name: 'Rajesh Malviya',
          phone: '+91 99887 76655',
          national_id: 'XXXX XXXX 2233',
          date_of_birth: '1988-03-05',
          gender: 'Male',
          district: 'Dewas',
          state: 'Madhya Pradesh',
          pincode: '455001',
          village_ward: 'Gram Panchayat Siya',
          annualIncome: 480000,
          familySize: 3,
          vulnerability_index: 'Standard',
          assistance_category: 'Skill Training',
          ration_card_category: 'Above Poverty Line (APL)',
          caste_category: 'General'
        }
      }
    ];

    for (const b of beneficiaries) {
      const exists = await Record.findOne({ ngoId: ngo._id, recordNumber: b.recordNumber });
      if (!exists) {
        await Record.create({
          ngoId: ngo._id,
          recordTypeId: beneficiaryType._id,
          recordNumber: b.recordNumber,
          data: b.data,
          status: 'Approved',
          createdBy: adminUser._id
        });
        console.log(`  ✓ Created Beneficiary: ${b.recordNumber} (${b.data.fullName})`);
      }
    }

    // 5. Seed Aid Distribution History (Past 4 Months for Demand Forecasting)
    console.log('[5/7] Seeding historical aid distribution events...');
    const aidDistributions = [
      {
        recordNumber: 'AID-2026-00101',
        data: {
          reliefType: 'Emergency Ration Kit',
          quantity: 150,
          unit: 'Kits',
          campLocation: 'Indore Flood Shelter 2',
          distributionDate: new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString()
        }
      },
      {
        recordNumber: 'AID-2026-00102',
        data: {
          reliefType: 'Pediatric Healthcare Packs',
          quantity: 220,
          unit: 'Packs',
          campLocation: 'Ujjain Community Clinic',
          distributionDate: new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString()
        }
      },
      {
        recordNumber: 'AID-2026-00103',
        data: {
          reliefType: 'Clean Water Filtration Units',
          quantity: 310,
          unit: 'Units',
          campLocation: 'Dewas Water Point',
          distributionDate: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()
        }
      },
      {
        recordNumber: 'AID-2026-00104',
        data: {
          reliefType: 'Winter Thermal Blankets',
          quantity: 420,
          unit: 'Blankets',
          campLocation: 'Residency Area Night Shelter',
          distributionDate: new Date().toISOString()
        }
      }
    ];

    for (const a of aidDistributions) {
      const exists = await Record.findOne({ ngoId: ngo._id, recordNumber: a.recordNumber });
      if (!exists) {
        await Record.create({
          ngoId: ngo._id,
          recordTypeId: aidType._id,
          recordNumber: a.recordNumber,
          data: a.data,
          status: 'Approved',
          createdBy: adminUser._id
        });
        console.log(`  ✓ Created Aid Distribution: ${a.recordNumber} (${a.data.reliefType})`);
      }
    }

    // 6. Seed DPDP Consent Record
    console.log('[6/7] Seeding DPDP compliant beneficiary consent...');
    const sunitaRecord = await Record.findOne({ ngoId: ngo._id, recordNumber: 'BEN-2026-00001' });
    if (sunitaRecord) {
      const consentExists = await Consent.findOne({ ngoId: ngo._id, recordId: sunitaRecord._id });
      if (!consentExists) {
        await Consent.create({
          ngoId: ngo._id,
          recordId: sunitaRecord._id,
          purpose: 'Humanitarian Aid & Relief',
          status: 'granted',
          proofType: 'Written Form',
          witnessName: 'Priya Nair (Field Coordinator)',
          validUntil: new Date(Date.now() + 365 * 24 * 3600 * 1000)
        });
        console.log('  ✓ DPDP Consent certificate seeded.');
      }
    }

    // 7. Seed Blockchain Merkle Root Anchor on Polygon Amoy
    console.log('[7/7] Anchoring baseline audit trail to Polygon L2 Merkle ledger...');
    const existingAnchor = await BlockchainAnchor.findOne({ ngoId: ngo._id });
    if (!existingAnchor) {
      const anchorRes = await blockchainService.anchorBatch(ngo._id, {
        batchType: 'records',
        limit: 50
      }, adminUser);

      console.log(`  ✓ Blockchain Merkle Root: ${anchorRes.anchor.merkleRoot}`);
      console.log(`  ✓ Polygon Tx Hash:       ${anchorRes.anchor.transactionHash}`);
      console.log(`  ✓ Block Number:           #${anchorRes.anchor.blockNumber}`);
    } else {
      console.log(`  ✓ Blockchain anchor already active: ${existingAnchor.merkleRoot}`);
    }

    console.log('\n======================================================');
    console.log('✅ DEMO DATA SEEDED SUCCESSFULLY FOR NGO: ASHA HOPE FOUNDATION');
    console.log('======================================================');
    console.log('Credentials to log in:');
    console.log('  Email:    admin@hope-foundation.org');
    console.log('  Password: Password@123!');
    console.log('  Role:     NGO Administrator (Full Access)');
    console.log('------------------------------------------------------');
    console.log('Additional accounts:');
    console.log('  Program Director: priya@hope-foundation.org / Password@123!');
    console.log('  Caseworker:       vikram@hope-foundation.org / Password@123!');
    console.log('======================================================\n');

  } catch (err) {
    console.error('❌ Error seeding demo data:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

seedDemoData();

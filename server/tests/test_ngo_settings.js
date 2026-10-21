const mongoose = require('mongoose');
const env = require('../src/config/env');
const { NGO, Role, Invitation } = require('../src/modules/ngo/model');
const { User } = require('../src/modules/users/model');
const { AuditLog } = require('../src/modules/audit/model');
const ngoService = require('../src/modules/ngo/ngo.service');

async function runNgoSettingsTests() {
  console.log('=== STARTING NGO PROFILE & SETTINGS TESTS (MODULE 19) ===\n');

  await mongoose.connect(env.MONGODB_URI);

  const ngoAId = new mongoose.Types.ObjectId();
  const ngoBId = new mongoose.Types.ObjectId();
  const adminAId = new mongoose.Types.ObjectId();
  const adminBId = new mongoose.Types.ObjectId();

  // Cleanup test state
  await NGO.deleteMany({ _id: { $in: [ngoAId, ngoBId] } });
  await Role.deleteMany({ ngoId: { $in: [ngoAId, ngoBId] } });
  await User.deleteMany({ ngoId: { $in: [ngoAId, ngoBId] } });
  await Invitation.deleteMany({ ngoId: { $in: [ngoAId, ngoBId] } });
  await AuditLog.deleteMany({ ngoId: { $in: [ngoAId, ngoBId] } });

  try {
    // 1. Setup Test NGOs
    console.log('[SETUP] Initializing test NGOs, roles, staff, and invitations...');
    await NGO.create({
      _id: ngoAId,
      name: 'Vikas Foundation',
      type: 'Society',
      registrationNumber: 'SOC-9876-MH',
      address: 'Andheri East, Mumbai, Maharashtra 400069',
      contactEmail: 'contact@vikasfoundation-test.org',
      contactPhone: '+91 22 2834 5678',
      status: 'approved'
    });

    await NGO.create({
      _id: ngoBId,
      name: 'Seva Samarpan Trust',
      type: 'Trust',
      registrationNumber: 'TR-1122-DL',
      address: 'Connaught Place, New Delhi 110001',
      contactEmail: 'contact@sevasamarpan-test.org',
      contactPhone: '+91 11 2345 6789',
      status: 'approved'
    });

    // Create staff & roles for NGO A
    const adminRoleA = await Role.create({
      ngoId: ngoAId,
      name: 'NGO Admin',
      description: 'Full administrative access',
      permissions: ['*'],
      isSystem: true
    });

    await User.create({
      _id: adminAId,
      ngoId: ngoAId,
      name: 'Priya Deshmukh',
      email: 'priya@vikasfoundation-test.org',
      password: 'SampleHashedPassword',
      status: 'active',
      roleId: adminRoleA._id
    });

    await User.create({
      ngoId: ngoAId,
      name: 'Rohan Joshi',
      email: 'rohan@vikasfoundation-test.org',
      password: 'SampleHashedPassword',
      status: 'active',
      roleId: adminRoleA._id
    });

    await Invitation.create({
      ngoId: ngoAId,
      email: 'new.member@vikasfoundation-test.org',
      roleId: adminRoleA._id,
      token: 'test_invitation_token_123',
      status: 'pending',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });

    console.log('✓ Test environment setup complete.\n');

    // ----------------------------------------------------
    // TEST 1: Retrieve NGO Profile & Aggregated Stats
    // ----------------------------------------------------
    console.log('[TEST 1] Fetching NGO profile and computed organization telemetry...');
    const ngoProfile = await ngoService.getNgoProfile(ngoAId);
    if (!ngoProfile) throw new Error('NGO profile was null');
    if (ngoProfile.name !== 'Vikas Foundation') throw new Error(`Unexpected name: ${ngoProfile.name}`);
    if (ngoProfile.stats.staffCount !== 2) {
      throw new Error(`Expected staffCount=2, got ${ngoProfile.stats.staffCount}`);
    }
    if (ngoProfile.stats.rolesCount !== 1) {
      throw new Error(`Expected rolesCount=1, got ${ngoProfile.stats.rolesCount}`);
    }
    if (ngoProfile.stats.pendingInvitationsCount !== 1) {
      throw new Error(`Expected pendingInvitationsCount=1, got ${ngoProfile.stats.pendingInvitationsCount}`);
    }
    // Verify default settings initialized
    if (!ngoProfile.settings || ngoProfile.settings.currency !== 'INR') {
      throw new Error('Default currency was not INR');
    }
    console.log(`✓ Test 1 Passed: NGO profile loaded with ${ngoProfile.stats.staffCount} staff, ${ngoProfile.stats.rolesCount} role, and default settings.\n`);

    // ----------------------------------------------------
    // TEST 2: Update NGO Profile (Logo, Contact, Website, Mission)
    // ----------------------------------------------------
    console.log('[TEST 2] Updating NGO organization details, contact info, and website...');
    const updated = await ngoService.updateNgoProfile(
      ngoAId,
      {
        name: 'Vikas Global Foundation',
        type: 'Section 8',
        registrationNumber: 'SEC8-2024-MH-999',
        address: 'BKC, Bandra East, Mumbai, Maharashtra 400051',
        contactPhone: '+91 22 6677 8899',
        website: 'https://vikasglobal.org',
        description: 'Empowering underprivileged communities through education and primary healthcare.',
        logoUrl: 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=300'
      },
      null, // logoFile
      adminAId,
      { ip: '127.0.0.1', userAgent: 'Test Runner' }
    );

    if (updated.name !== 'Vikas Global Foundation') throw new Error(`Name mismatch: ${updated.name}`);
    if (updated.type !== 'Section 8') throw new Error(`Type mismatch: ${updated.type}`);
    if (updated.website !== 'https://vikasglobal.org') throw new Error(`Website mismatch: ${updated.website}`);
    if (updated.logoUrl !== 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=300') {
      throw new Error(`Logo URL mismatch: ${updated.logoUrl}`);
    }

    // Verify Audit Log
    const auditProfile = await AuditLog.findOne({
      ngoId: ngoAId,
      action: 'NGO_PROFILE_UPDATED'
    });
    if (!auditProfile) throw new Error('NGO_PROFILE_UPDATED audit log missing');
    console.log('✓ Test 2 Passed: NGO details and logo updated with verified AuditLog entry.\n');

    // ----------------------------------------------------
    // TEST 3: Update Organizational Settings & DPDP Policy
    // ----------------------------------------------------
    console.log('[TEST 3] Updating tenant operational settings, timezone, and security policies...');
    const updatedSettings = await ngoService.updateNgoSettings(
      ngoAId,
      {
        currency: 'USD',
        timezone: 'UTC',
        dateFormat: 'YYYY-MM-DD',
        retentionDays: 2555, // 7 years
        require2FA: true,
        sessionTimeoutMinutes: 60,
        emailNotifications: {
          notifyOnNewMember: true,
          notifyOnRecordExport: true,
          notifyOnSecurityAlert: true
        }
      },
      adminAId,
      { ip: '127.0.0.1', userAgent: 'Test Runner' }
    );

    if (updatedSettings.currency !== 'USD') throw new Error(`Currency not updated: ${updatedSettings.currency}`);
    if (updatedSettings.timezone !== 'UTC') throw new Error(`Timezone not updated: ${updatedSettings.timezone}`);
    if (updatedSettings.dateFormat !== 'YYYY-MM-DD') throw new Error(`DateFormat not updated: ${updatedSettings.dateFormat}`);
    if (updatedSettings.retentionDays !== 2555) throw new Error(`RetentionDays not updated: ${updatedSettings.retentionDays}`);
    if (updatedSettings.require2FA !== true) throw new Error(`require2FA not updated: ${updatedSettings.require2FA}`);
    if (updatedSettings.sessionTimeoutMinutes !== 60) throw new Error(`sessionTimeoutMinutes not updated: ${updatedSettings.sessionTimeoutMinutes}`);
    if (updatedSettings.emailNotifications.notifyOnRecordExport !== true) {
      throw new Error('emailNotifications not updated');
    }

    // Verify Audit Log
    const auditSettings = await AuditLog.findOne({
      ngoId: ngoAId,
      action: 'NGO_SETTINGS_UPDATED'
    });
    if (!auditSettings) throw new Error('NGO_SETTINGS_UPDATED audit log missing');
    console.log('✓ Test 3 Passed: Tenant settings, DPDP retention, and 2FA policy persisted with AuditLog.\n');

    // ----------------------------------------------------
    // TEST 4: Immutability Protection & Security
    // ----------------------------------------------------
    console.log('[TEST 4] Verifying critical fields (status, contactEmail) cannot be altered via profile update...');
    // Attempting to pass status='unverified' or new contactEmail
    await ngoService.updateNgoProfile(
      ngoAId,
      {
        status: 'unverified', // Should be ignored
        contactEmail: 'hacker@malicious.org' // Should be ignored
      },
      null,
      adminAId
    );

    const checkNgo = await NGO.findById(ngoAId);
    if (checkNgo.status !== 'approved') {
      throw new Error(`Security breach: Status was modified to ${checkNgo.status}`);
    }
    if (checkNgo.contactEmail !== 'contact@vikasfoundation-test.org') {
      throw new Error(`Security breach: Contact email was modified to ${checkNgo.contactEmail}`);
    }
    console.log('✓ Test 4 Passed: Protected tenant fields are tamper-proof.\n');

    // ----------------------------------------------------
    // TEST 5: Strict Multi-Tenant Separation
    // ----------------------------------------------------
    console.log('[TEST 5] Verifying NGO A and NGO B remain completely isolated in settings...');
    const ngoBProfile = await ngoService.getNgoProfile(ngoBId);
    if (ngoBProfile.settings.currency !== 'INR') {
      throw new Error(`NGO B settings were contaminated by NGO A! Got ${ngoBProfile.settings.currency}`);
    }
    if (ngoBProfile.name !== 'Seva Samarpan Trust') {
      throw new Error('NGO B name was altered!');
    }
    console.log('✓ Test 5 Passed: Zero cross-tenant leakage between organizations.\n');

    console.log('🎉 ALL 5 NGO PROFILE & SETTINGS TESTS COMPLETED SUCCESSFULLY!');
  } finally {
    // Cleanup
    await NGO.deleteMany({ _id: { $in: [ngoAId, ngoBId] } });
    await Role.deleteMany({ ngoId: { $in: [ngoAId, ngoBId] } });
    await User.deleteMany({ ngoId: { $in: [ngoAId, ngoBId] } });
    await Invitation.deleteMany({ ngoId: { $in: [ngoAId, ngoBId] } });
    await AuditLog.deleteMany({ ngoId: { $in: [ngoAId, ngoBId] } });
    await mongoose.disconnect();
  }
}

runNgoSettingsTests().catch(err => {
  console.error('❌ NGO Settings Test Suite Failed:', err);
  process.exit(1);
});

const mongoose = require('mongoose');
const argon2 = require('argon2');
const env = require('../src/config/env');
const { NGO, Role } = require('../src/modules/ngo/model');
const { User } = require('../src/modules/users/model');
const { Session } = require('../src/modules/auth/model');
const { AuditLog } = require('../src/modules/audit/model');
const userService = require('../src/modules/users/user.service');

async function runUserProfileTests() {
  console.log('=== STARTING USER PROFILE & SECURITY SETTINGS TESTS (MODULE 18) ===\n');

  await mongoose.connect(env.MONGODB_URI);

  const testNgoId = new mongoose.Types.ObjectId();
  const testUserId = new mongoose.Types.ObjectId();
  const testOtherUserId = new mongoose.Types.ObjectId();
  const testRoleId = new mongoose.Types.ObjectId();

  // Cleanup test state
  await NGO.deleteMany({ _id: testNgoId });
  await Role.deleteMany({ _id: testRoleId });
  await User.deleteMany({ _id: { $in: [testUserId, testOtherUserId] } });
  await Session.deleteMany({ userId: { $in: [testUserId, testOtherUserId] } });
  await AuditLog.deleteMany({ ngoId: testNgoId });

  try {
    // 1. Setup Test NGO, Role and User
    console.log('[SETUP] Creating Test NGO, Role, and Users...');
    await NGO.create({
      _id: testNgoId,
      name: 'Sahara Welfare Trust',
      contactEmail: 'contact@saharawelfare.org',
      type: 'Trust',
      registrationNumber: 'REG-2024-9988',
      status: 'approved',
      phone: '+91 9876543210',
      address: 'Nariman Point, Mumbai, Maharashtra 400021, India'
    });

    await Role.create({
      _id: testRoleId,
      ngoId: testNgoId,
      name: 'Field Operations Director',
      description: 'Oversees relief delivery, volunteers and logistics',
      permissions: ['records:create', 'records:read', 'records:update', 'files:upload', 'files:read', 'reports:generate'],
      isSystem: false
    });

    const hashedPassword = await argon2.hash('OldSecurePass@123!');
    const user = await User.create({
      _id: testUserId,
      ngoId: testNgoId,
      name: 'Arjun Sharma',
      email: 'arjun.sharma@saharawelfare.org',
      password: hashedPassword,
      phone: '+91 9123456789',
      designation: 'Operations Lead',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
      status: 'active',
      roleId: testRoleId
    });

    const otherUser = await User.create({
      _id: testOtherUserId,
      ngoId: testNgoId,
      name: 'Pooja Patel',
      email: 'pooja.patel@saharawelfare.org',
      password: hashedPassword,
      status: 'active',
      roleId: testRoleId
    });

    console.log('✓ Test environment initialized.\n');

    // ----------------------------------------------------
    // TEST 1: Retrieve Profile with Full Role & NGO Details
    // ----------------------------------------------------
    console.log('[TEST 1] Retrieving user profile with populated Role and NGO info...');
    const profile = await userService.getProfile(testUserId);
    if (!profile) throw new Error('Profile was null');
    if (profile.password) throw new Error('Profile leaked password hash!');
    if (profile.name !== 'Arjun Sharma') throw new Error(`Unexpected name: ${profile.name}`);
    if (profile.designation !== 'Operations Lead') throw new Error(`Unexpected designation: ${profile.designation}`);
    if (!profile.roleId || profile.roleId.name !== 'Field Operations Director') {
      throw new Error('Role was not populated properly');
    }
    if (!profile.roleId.permissions || !profile.roleId.permissions.includes('records:create')) {
      throw new Error('Permissions list missing from populated role');
    }
    if (!profile.ngoId || profile.ngoId.name !== 'Sahara Welfare Trust') {
      throw new Error('NGO was not populated properly');
    }
    console.log(`✓ Test 1 Passed: Profile returned without password, role="${profile.roleId.name}" with ${profile.roleId.permissions.length} permissions.\n`);

    // ----------------------------------------------------
    // TEST 2: Update Profile (Name, Phone, Designation, Avatar)
    // ----------------------------------------------------
    console.log('[TEST 2] Updating profile details & avatar...');
    const updated = await userService.updateProfile({
      userId: testUserId,
      updateData: {
        name: 'Arjun V. Sharma',
        phone: '+91 9988776655',
        designation: 'Chief Operations Officer (COO)',
        avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200'
      },
      ip: '127.0.0.1',
      userAgent: 'Mozilla/5.0 Test Suite'
    });

    if (updated.name !== 'Arjun V. Sharma') throw new Error(`Name not updated: ${updated.name}`);
    if (updated.phone !== '+91 9988776655') throw new Error(`Phone not updated: ${updated.phone}`);
    if (updated.designation !== 'Chief Operations Officer (COO)') throw new Error(`Designation not updated: ${updated.designation}`);
    if (updated.avatarUrl !== 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200') {
      throw new Error(`Avatar URL not updated: ${updated.avatarUrl}`);
    }

    // Check Audit Log
    const auditUpdate = await AuditLog.findOne({
      userId: testUserId,
      action: 'PROFILE_UPDATED'
    });
    if (!auditUpdate) throw new Error('PROFILE_UPDATED audit log was not recorded');
    console.log('✓ Test 2 Passed: Profile fields and avatar updated with verified AuditLog entry.\n');

    // ----------------------------------------------------
    // TEST 3: Active Device Sessions Management
    // ----------------------------------------------------
    console.log('[TEST 3] Managing active device sessions...');
    const tokenChrome = 'refresh_token_chrome_desktop_111';
    const tokenIphone = 'refresh_token_iphone_safari_222';
    const tokenFirefox = 'refresh_token_linux_firefox_333';

    const sessionChrome = await Session.create({
      userId: testUserId,
      refreshToken: tokenChrome,
      deviceInfo: 'Chrome on Windows 11',
      ip: '103.21.244.2',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });

    const sessionIphone = await Session.create({
      userId: testUserId,
      refreshToken: tokenIphone,
      deviceInfo: 'Safari on iPhone 15 Pro',
      ip: '49.36.120.45',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });

    const sessionFirefox = await Session.create({
      userId: testUserId,
      refreshToken: tokenFirefox,
      deviceInfo: 'Firefox on Ubuntu Desktop',
      ip: '157.240.198.35',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });

    // List sessions for testUserId with tokenChrome as current session
    const sessions = await userService.getUserSessions(testUserId, tokenChrome);
    if (sessions.length !== 3) {
      throw new Error(`Expected 3 active sessions, got ${sessions.length}`);
    }

    const currentSession = sessions.find(s => s.isCurrent);
    if (!currentSession || currentSession.deviceInfo !== 'Chrome on Windows 11') {
      throw new Error('Current session was not correctly identified');
    }

    // Ensure refreshToken is NEVER leaked to client
    const hasLeakedToken = sessions.some(s => s.refreshToken);
    if (hasLeakedToken) {
      throw new Error('Security vulnerability: Refresh tokens leaked in session list!');
    }
    console.log(`✓ Test 3 Passed: 3 active sessions returned, current session identified, zero token leaks.\n`);

    // ----------------------------------------------------
    // TEST 4: Revoke Specific Session (Safari on iPhone)
    // ----------------------------------------------------
    console.log('[TEST 4] Revoking specific session (iPhone)...');
    const revokeResult = await userService.revokeSession(
      testUserId,
      sessionIphone._id,
      '127.0.0.1',
      'Test Runner'
    );
    if (!revokeResult.message) throw new Error('Revoke response missing message');

    const sessionsAfterRevoke = await userService.getUserSessions(testUserId, tokenChrome);
    if (sessionsAfterRevoke.length !== 2) {
      throw new Error(`Expected 2 sessions remaining, got ${sessionsAfterRevoke.length}`);
    }
    const iphoneStillExists = sessionsAfterRevoke.some(s => s._id.toString() === sessionIphone._id.toString());
    if (iphoneStillExists) throw new Error('Revoked iPhone session is still present in active sessions!');

    const revokeAudit = await AuditLog.findOne({
      userId: testUserId,
      action: 'SESSION_REVOKED',
      resourceId: sessionIphone._id
    });
    if (!revokeAudit) throw new Error('SESSION_REVOKED audit log missing');
    console.log('✓ Test 4 Passed: Specific session terminated with audit log.\n');

    // ----------------------------------------------------
    // TEST 5: Cross-User Session Revocation Blocked
    // ----------------------------------------------------
    console.log('[TEST 5] Verifying other user cannot revoke foreign session...');
    let crossRevokeFailed = false;
    try {
      // testOtherUserId tries to revoke testUserId's sessionFirefox
      await userService.revokeSession(testOtherUserId, sessionFirefox._id, '127.0.0.1', 'Hacker Agent');
    } catch (err) {
      crossRevokeFailed = true;
      if (err.statusCode !== 404) {
        throw new Error(`Expected 404 for foreign session revocation, got ${err.statusCode}`);
      }
    }
    if (!crossRevokeFailed) {
      throw new Error('Security Breach: User was able to revoke another user\'s session!');
    }
    console.log('✓ Test 5 Passed: Cross-user session revocation prevented.\n');

    // ----------------------------------------------------
    // TEST 6: Revoke All Other Sessions (keep current)
    // ----------------------------------------------------
    console.log('[TEST 6] Revoking all other sessions except current...');
    const revokeAllRes = await userService.revokeAllOtherSessions(
      testUserId,
      tokenChrome,
      '127.0.0.1',
      'Test Runner'
    );
    if (revokeAllRes.revokedCount !== 1) {
      throw new Error(`Expected 1 other session revoked, got ${revokeAllRes.revokedCount}`);
    }

    const sessionsAfterWipe = await userService.getUserSessions(testUserId, tokenChrome);
    if (sessionsAfterWipe.length !== 1) {
      throw new Error(`Expected exactly 1 session left, got ${sessionsAfterWipe.length}`);
    }
    if (!sessionsAfterWipe[0].isCurrent || sessionsAfterWipe[0].deviceInfo !== 'Chrome on Windows 11') {
      throw new Error('The remaining session is not the current active session!');
    }

    const revokeAllAudit = await AuditLog.findOne({
      userId: testUserId,
      action: 'ALL_OTHER_SESSIONS_REVOKED'
    });
    if (!revokeAllAudit) throw new Error('ALL_OTHER_SESSIONS_REVOKED audit log missing');
    console.log('✓ Test 6 Passed: All other sessions terminated, current session preserved.\n');

    // ----------------------------------------------------
    // TEST 7: Change Password with Session Invalidation
    // ----------------------------------------------------
    console.log('[TEST 7] Changing password with current session preservation...');
    // Create an extra session to test invalidation on password change
    await Session.create({
      userId: testUserId,
      refreshToken: 'extra_session_token',
      deviceInfo: 'Temporary Device',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });

    const passResult = await userService.changePassword({
      userId: testUserId,
      currentPassword: 'OldSecurePass@123!',
      newPassword: 'NewSuperPass@999!',
      currentRefreshToken: tokenChrome,
      ip: '127.0.0.1',
      userAgent: 'Test Runner'
    });
    if (!passResult.message) throw new Error('Password change missing response message');

    // Verify new password hashes
    const updatedUserDoc = await User.findById(testUserId);
    const isNewPassValid = await argon2.verify(updatedUserDoc.password, 'NewSuperPass@999!');
    if (!isNewPassValid) throw new Error('New password was not properly hashed/verified');

    // Verify extra session was killed, current session remained
    const sessionsAfterPass = await Session.find({ userId: testUserId });
    if (sessionsAfterPass.length !== 1 || sessionsAfterPass[0].refreshToken !== tokenChrome) {
      throw new Error('Password change did not terminate other sessions properly');
    }

    const passAudit = await AuditLog.findOne({
      userId: testUserId,
      action: 'PASSWORD_CHANGED'
    });
    if (!passAudit) throw new Error('PASSWORD_CHANGED audit log missing');
    console.log('✓ Test 7 Passed: Password updated with Argon2, extra sessions invalidated, audit recorded.\n');

    console.log('🎉 ALL 7 USER PROFILE & SECURITY TESTS COMPLETED SUCCESSFULLY!');
  } finally {
    // Cleanup
    await NGO.deleteMany({ _id: testNgoId });
    await Role.deleteMany({ _id: testRoleId });
    await User.deleteMany({ _id: { $in: [testUserId, testOtherUserId] } });
    await Session.deleteMany({ userId: { $in: [testUserId, testOtherUserId] } });
    await AuditLog.deleteMany({ ngoId: testNgoId });
    await mongoose.disconnect();
  }
}

runUserProfileTests().catch(err => {
  console.error('❌ User Profile Test Suite Failed:', err);
  process.exit(1);
});

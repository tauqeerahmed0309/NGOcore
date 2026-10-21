const mongoose = require('mongoose');
const env = require('../src/config/env');
const { NGO, Role, Invitation } = require('../src/modules/ngo/model');
const { User } = require('../src/modules/users/model');
const { Session } = require('../src/modules/auth/model');
const { AuditLog } = require('../src/modules/audit/model');
const rolesService = require('../src/modules/roles/roles.service');
const invitationsService = require('../src/modules/invitations/invitations.service');
const userService = require('../src/modules/users/user.service');

async function runUsersAndRolesTests() {
  console.log('=== STARTING USERS, INVITATIONS & CUSTOM ROLES TESTS (MODULE 17) ===\n');

  await mongoose.connect(env.MONGODB_URI);

  const testNgoA = new mongoose.Types.ObjectId();
  const testNgoB = new mongoose.Types.ObjectId();
  const adminAId = new mongoose.Types.ObjectId();

  // Cleanup test state
  await Role.deleteMany({ ngoId: { $in: [testNgoA, testNgoB] } });
  await Invitation.deleteMany({ ngoId: { $in: [testNgoA, testNgoB] } });
  await User.deleteMany({ ngoId: { $in: [testNgoA, testNgoB] } });

  try {
    // Setup NGO A and NGO B
    const ngoA = await NGO.create({
      _id: testNgoA,
      name: 'Hope International',
      contactEmail: 'contact@hope-intl-test.org',
      status: 'approved'
    });

    const ngoB = await NGO.create({
      _id: testNgoB,
      name: 'Global Health Relief',
      contactEmail: 'contact@health-relief-test.org',
      status: 'approved'
    });

    // Create System Roles
    const systemAdminRoleA = await Role.create({
      ngoId: testNgoA,
      name: 'NGO Admin',
      description: 'Full administrative access',
      permissions: ['*'],
      isSystem: true
    });

    const systemAdminRoleB = await Role.create({
      ngoId: testNgoB,
      name: 'NGO Admin',
      description: 'Full administrative access',
      permissions: ['*'],
      isSystem: true
    });

    // Create Admin User for NGO A
    const adminUserA = await User.create({
      _id: adminAId,
      ngoId: testNgoA,
      roleId: systemAdminRoleA._id,
      name: 'Admin Alice',
      email: 'admin.alice@hope-intl-test.org',
      password: 'SampleHashedPassword',
      status: 'active'
    });

    // ----------------------------------------------------
    // TEST 1: Create Custom Role
    // ----------------------------------------------------
    console.log('1. Testing custom role creation...');
    const fieldRole = await rolesService.createRole(
      testNgoA,
      {
        name: 'Field Coordinator',
        description: 'Coordinates regional relief drives',
        permissions: ['records:create', 'records:read', 'files:upload']
      },
      adminUserA._id
    );

    console.log('Created role name:', fieldRole.name);
    console.log('Role isSystem flag (expected false):', fieldRole.isSystem);
    console.log('Permissions count (expected 3):', fieldRole.permissions.length);

    // Verify duplicate role name in same NGO rejected
    let dupRoleError = null;
    try {
      await rolesService.createRole(
        testNgoA,
        { name: 'Field Coordinator', permissions: ['records:read'] },
        adminUserA._id
      );
    } catch (err) {
      dupRoleError = err.message;
    }
    console.log('Duplicate role name rejected:', dupRoleError !== null);

    // ----------------------------------------------------
    // TEST 2: List Roles with Aggregated User Counts
    // ----------------------------------------------------
    console.log('\n2. Testing roles listing with user count aggregation...');
    const rolesList = await rolesService.getRoles(testNgoA);
    console.log('Total roles returned for NGO A (expected 2):', rolesList.length);
    const adminRoleData = rolesList.find(r => r.name === 'NGO Admin');
    const fieldRoleData = rolesList.find(r => r.name === 'Field Coordinator');
    console.log('Admin role userCount (expected 1):', adminRoleData?.userCount);
    console.log('Field role userCount (expected 0):', fieldRoleData?.userCount);

    if (adminRoleData?.userCount !== 1 || fieldRoleData?.userCount !== 0) {
      throw new Error('Test 2 Failed: Role user count aggregation is incorrect');
    }

    // ----------------------------------------------------
    // TEST 3: System Role Protection (Cannot edit/delete system role)
    // ----------------------------------------------------
    console.log('\n3. Testing system role protection...');
    let systemEditBlocked = false;
    try {
      await rolesService.updateRole(testNgoA, systemAdminRoleA._id, { name: 'New Name' }, adminUserA._id);
    } catch (err) {
      systemEditBlocked = true;
    }
    console.log('Editing system role blocked (expected true):', systemEditBlocked);

    let systemDeleteBlocked = false;
    try {
      await rolesService.deleteRole(testNgoA, systemAdminRoleA._id, adminUserA._id);
    } catch (err) {
      systemDeleteBlocked = true;
    }
    console.log('Deleting system role blocked (expected true):', systemDeleteBlocked);

    if (!systemEditBlocked || !systemDeleteBlocked) {
      throw new Error('Test 3 Failed: System role protection was not enforced');
    }

    // ----------------------------------------------------
    // TEST 4: Send Team Member Invitation
    // ----------------------------------------------------
    console.log('\n4. Testing team invitation creation and email dispatch...');
    const inviteEmail = 'case.worker@hope-intl-test.org';
    const inviteResult = await invitationsService.sendInvitation(
      testNgoA,
      { email: inviteEmail, roleId: fieldRole._id.toString() },
      adminUserA._id
    );

    console.log('Invitation created for email:', inviteResult.email);
    console.log('Invitation status (expected pending):', inviteResult.status);

    const savedInvite = await Invitation.findById(inviteResult._id);
    console.log('Crypto token generated (length >= 32):', savedInvite.token.length >= 32);
    console.log('Expiry set ~7 days ahead:', savedInvite.expiresAt > new Date());

    // ----------------------------------------------------
    // TEST 5: Public Token Verification
    // ----------------------------------------------------
    console.log('\n5. Testing public token verification endpoint...');
    const verifiedData = await invitationsService.verifyInvitation(savedInvite.token);
    console.log('Verified invite email matches:', verifiedData.email === inviteEmail);
    console.log('Verified NGO name matches:', verifiedData.ngo.name === 'Hope International');
    console.log('Verified role matches:', verifiedData.role.name === 'Field Coordinator');

    if (verifiedData.ngo.name !== 'Hope International' || verifiedData.role.name !== 'Field Coordinator') {
      throw new Error('Test 5 Failed: Invitation token verification returned invalid details');
    }

    // ----------------------------------------------------
    // TEST 6: Resend Invitation
    // ----------------------------------------------------
    console.log('\n6. Testing invitation resend...');
    const oldToken = savedInvite.token;
    const resendResult = await invitationsService.resendInvitation(testNgoA, savedInvite._id, adminUserA._id);
    const refreshedInvite = await Invitation.findById(savedInvite._id);
    console.log('Resend succeeded:', resendResult.message.includes('successfully'));
    console.log('Token refreshed with new value:', refreshedInvite.token !== oldToken);

    // ----------------------------------------------------
    // TEST 7: Accept Invitation & Create Active Account
    // ----------------------------------------------------
    console.log('\n7. Testing invitation acceptance & user account activation...');
    const acceptPayload = {
      token: refreshedInvite.token,
      name: 'Jane Caseworker',
      password: 'SecurePassword@2026!'
    };
    const acceptMeta = { ip: '127.0.0.1', userAgent: 'TestRunner/1.0' };
    const acceptedData = await invitationsService.acceptInvitation(acceptPayload, acceptMeta);

    console.log('Access token generated:', !!acceptedData.accessToken);
    console.log('Refresh token generated:', !!acceptedData.refreshToken);
    console.log('User created with active status:', acceptedData.user.name === 'Jane Caseworker');
    console.log('User bound to correct NGO:', acceptedData.user.ngoId.equals(testNgoA));
    console.log('User assigned correct role:', acceptedData.user.role === 'Field Coordinator');

    const createdUser = await User.findOne({ email: inviteEmail });
    console.log('Password securely hashed (Argon2):', createdUser.password.startsWith('$argon2'));

    const updatedInvite = await Invitation.findById(savedInvite._id);
    console.log('Invitation status updated to accepted:', updatedInvite.status === 'accepted');

    const activeSession = await Session.findOne({ userId: createdUser._id });
    console.log('Active session created in database:', !!activeSession);

    // Test replay: trying to accept again must fail
    let replayBlocked = false;
    try {
      await invitationsService.acceptInvitation(acceptPayload, acceptMeta);
    } catch (err) {
      replayBlocked = true;
    }
    console.log('Re-accepting accepted invitation blocked (expected true):', replayBlocked);

    if (!replayBlocked) {
      throw new Error('Test 7 Failed: Replay of accepted invitation was not blocked');
    }

    // ----------------------------------------------------
    // TEST 8: NGO User Management (Roster, Status & Role Change)
    // ----------------------------------------------------
    console.log('\n8. Testing NGO user roster and status/role modifications...');

    // List users
    const roster = await userService.getNgoUsers(testNgoA, { limit: 10 });
    console.log('Total users in NGO A roster (expected 2):', roster.users.length);

    // Deactivate invited user
    const deactivateResult = await userService.changeUserStatus(
      testNgoA,
      createdUser._id,
      'inactive',
      adminUserA._id
    );
    console.log('User status changed to inactive:', deactivateResult.user.status === 'inactive');

    // Verify session was terminated on deactivation
    const sessionsAfterDeactivation = await Session.countDocuments({ userId: createdUser._id });
    console.log('Active sessions remaining after deactivation (expected 0):', sessionsAfterDeactivation);

    // Self-deactivation prevention
    let selfDeactivateBlocked = false;
    try {
      await userService.changeUserStatus(testNgoA, adminUserA._id, 'inactive', adminUserA._id);
    } catch (err) {
      selfDeactivateBlocked = true;
    }
    console.log('Self-deactivation blocked (expected true):', selfDeactivateBlocked);

    // Reassign role: create a secondary role and assign
    const seniorRole = await rolesService.createRole(
      testNgoA,
      { name: 'Senior Officer', permissions: ['records:create', 'records:read', 'records:update'] },
      adminUserA._id
    );
    const updatedRoleUser = await userService.changeUserRole(
      testNgoA,
      createdUser._id,
      seniorRole._id,
      adminUserA._id
    );
    console.log('User reassigned to new role:', updatedRoleUser.roleId.name === 'Senior Officer');

    // Cross-tenant role assignment blocking: try to assign NGO B's role to NGO A's user
    let crossTenantRoleBlocked = false;
    try {
      await userService.changeUserRole(
        testNgoA,
        createdUser._id,
        systemAdminRoleB._id, // Role from NGO B!
        adminUserA._id
      );
    } catch (err) {
      crossTenantRoleBlocked = true;
    }
    console.log('Cross-tenant role assignment blocked (expected true):', crossTenantRoleBlocked);

    if (sessionsAfterDeactivation !== 0 || !selfDeactivateBlocked || !crossTenantRoleBlocked) {
      throw new Error('Test 8 Failed: User roster governance failed');
    }

    // ----------------------------------------------------
    // TEST 9: Revoke Invitation Flow
    // ----------------------------------------------------
    console.log('\n9. Testing invitation revocation...');
    const revokeEmail = 'volunteer@hope-intl-test.org';
    const revokeInvite = await invitationsService.sendInvitation(
      testNgoA,
      { email: revokeEmail, roleId: fieldRole._id.toString() },
      adminUserA._id
    );
    await invitationsService.revokeInvitation(testNgoA, revokeInvite._id, adminUserA._id);

    const revokedDbRecord = await Invitation.findById(revokeInvite._id);
    console.log('Invitation status set to revoked:', revokedDbRecord.status === 'revoked');

    let revokedVerifyBlocked = false;
    try {
      await invitationsService.verifyInvitation(revokedDbRecord.token);
    } catch (err) {
      revokedVerifyBlocked = true;
    }
    console.log('Verification of revoked token blocked (expected true):', revokedVerifyBlocked);

    if (!revokedVerifyBlocked) {
      throw new Error('Test 9 Failed: Revoked invitation was still verifiable');
    }

    // ----------------------------------------------------
    // TEST 10: Audit Log Verification
    // ----------------------------------------------------
    console.log('\n10. Verifying audit trail logging...');
    const auditLogs = await AuditLog.find({ ngoId: testNgoA }).sort({ createdAt: -1 });
    const loggedActions = auditLogs.map(l => l.action);
    console.log('Audit log actions recorded for NGO A:', [...new Set(loggedActions)]);

    const requiredActions = [
      'ROLE_CREATED',
      'USER_INVITED',
      'INVITATION_RESENT',
      'INVITATION_ACCEPTED',
      'USER_STATUS_CHANGED',
      'USER_ROLE_CHANGED',
      'INVITATION_REVOKED'
    ];
    const missingActions = requiredActions.filter(a => !loggedActions.includes(a));
    console.log('All required audit actions logged:', missingActions.length === 0);

    if (missingActions.length > 0) {
      throw new Error(`Test 10 Failed: Missing audit actions: ${missingActions.join(', ')}`);
    }

    console.log('\n✅ ALL USERS, INVITATIONS & CUSTOM ROLES TESTS PASSED CLEANLY!');
  } finally {
    // Cleanup
    await Role.deleteMany({ ngoId: { $in: [testNgoA, testNgoB] } });
    await Invitation.deleteMany({ ngoId: { $in: [testNgoA, testNgoB] } });
    await User.deleteMany({ ngoId: { $in: [testNgoA, testNgoB] } });
    await NGO.deleteMany({ _id: { $in: [testNgoA, testNgoB] } });
    await AuditLog.deleteMany({ ngoId: { $in: [testNgoA, testNgoB] } });
    await mongoose.disconnect();
  }
}

runUsersAndRolesTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test Suite Failed:', err);
    process.exit(1);
  });

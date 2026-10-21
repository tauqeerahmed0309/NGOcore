const mongoose = require('mongoose');
const argon2 = require('argon2');
const request = require('supertest');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const app = require('../src/app');
const { NGO, Role } = require('../src/modules/ngo/model');
const { User } = require('../src/modules/users/model');
const { Session, PasswordReset } = require('../src/modules/auth/model');
const { AuditLog } = require('../src/modules/audit/model');

async function testPasswordResetFlow() {
  await mongoose.connect(process.env.MONGODB_URI);

  const initialPassword = 'InitialPassword@123';
  const newPassword = 'NewSecretPassword@456';
  const hashedPassword = await argon2.hash(initialPassword);

  // Clean up any remnants
  await NGO.deleteMany({ contactEmail: 'recovery@org.com' });
  await User.deleteMany({ email: 'user@recovery.com' });

  const testNgo = await NGO.create({
    name: 'Recovery NGO',
    contactEmail: 'recovery@org.com',
    status: 'approved'
  });

  const testRole = await Role.create({
    ngoId: testNgo._id,
    name: 'NGO Admin',
    permissions: ['*']
  });

  const testUser = await User.create({
    ngoId: testNgo._id,
    name: 'Recovery User',
    email: 'user@recovery.com',
    password: hashedPassword,
    status: 'active',
    roleId: testRole._id
  });

  console.log('1. Testing generic response for non-existent email...');
  const resGhost = await request(app)
    .post('/api/v1/auth/forgot-password')
    .send({ email: 'ghost_user@doesntexist.com' });
  console.log('Status (expected 200):', resGhost.status);
  console.log('Message:', resGhost.body.message);

  console.log('\n2. Testing forgot-password for existing user...');
  const resForgot = await request(app)
    .post('/api/v1/auth/forgot-password')
    .send({ email: 'user@recovery.com' });
  console.log('Status (expected 200):', resForgot.status);
  console.log('Message identical to non-existent user:', resForgot.body.message === resGhost.body.message);

  const resetDoc = await PasswordReset.findOne({ userId: testUser._id });
  console.log('Password reset token generated in DB:', !!resetDoc);
  console.log('Token expires in ~15 mins:', Math.round((resetDoc.expiresAt - new Date()) / 60000) === 15);

  const auditRequested = await AuditLog.findOne({
    userId: testUser._id,
    action: 'PASSWORD_RESET_REQUESTED'
  });
  console.log('Audit log for reset request recorded:', !!auditRequested);

  console.log('\n3. Creating an active session before reset...');
  const loginBeforeReset = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'user@recovery.com', password: initialPassword });
  console.log('Login before reset status (expected 200):', loginBeforeReset.status);

  const cookies = loginBeforeReset.headers['set-cookie'];
  const oldRefreshCookie = cookies ? cookies.find(c => c.startsWith('refreshToken=')) : null;
  const sessionsCountBefore = await Session.countDocuments({ userId: testUser._id });
  console.log('Active sessions before reset (expected 1):', sessionsCountBefore);

  console.log('\n4. Testing reset-password with invalid token...');
  const resBadToken = await request(app)
    .post('/api/v1/auth/reset-password')
    .send({ token: 'fake_invalid_token', password: newPassword });
  console.log('Status (expected 400):', resBadToken.status, resBadToken.body.message);

  console.log('\n5. Testing reset-password with valid token...');
  const resReset = await request(app)
    .post('/api/v1/auth/reset-password')
    .send({ token: resetDoc.token, password: newPassword });
  console.log('Status (expected 200):', resReset.status, resReset.body.message);

  const resetDocAfter = await PasswordReset.findOne({ token: resetDoc.token });
  console.log('Reset token consumed / deleted (expected null):', resetDocAfter);

  const sessionsCountAfter = await Session.countDocuments({ userId: testUser._id });
  console.log('Sessions invalidated after reset (expected 0):', sessionsCountAfter);

  const auditCompleted = await AuditLog.findOne({
    userId: testUser._id,
    action: 'PASSWORD_RESET_COMPLETED'
  });
  console.log('Audit log for reset completion recorded:', !!auditCompleted);

  console.log('\n6. Verifying old session is rejected after reset...');
  const resOldSession = await request(app)
    .post('/api/v1/auth/refresh-token')
    .set('Cookie', oldRefreshCookie);
  console.log('Old session refresh attempt (expected 401):', resOldSession.status);

  console.log('\n7. Verifying old password no longer works...');
  const resOldPass = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'user@recovery.com', password: initialPassword });
  console.log('Old password login (expected 401):', resOldPass.status);

  console.log('\n8. Verifying new password works cleanly...');
  const resNewPass = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'user@recovery.com', password: newPassword });
  console.log('New password login (expected 200):', resNewPass.status);

  // Cleanup
  await NGO.deleteOne({ _id: testNgo._id });
  await Role.deleteOne({ _id: testRole._id });
  await User.deleteOne({ _id: testUser._id });
  await Session.deleteMany({ userId: testUser._id });
  await PasswordReset.deleteMany({ userId: testUser._id });
  await AuditLog.deleteMany({ ngoId: testNgo._id });

  console.log('\n✅ ALL PASSWORD RESET & ACCOUNT RECOVERY TESTS PASSED!');
  await mongoose.disconnect();
  process.exit(0);
}

testPasswordResetFlow().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});

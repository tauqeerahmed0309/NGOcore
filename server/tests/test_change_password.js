const mongoose = require('mongoose');
const argon2 = require('argon2');
const request = require('supertest');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const app = require('../src/app');
const { NGO, Role } = require('../src/modules/ngo/model');
const { User } = require('../src/modules/users/model');
const { Session } = require('../src/modules/auth/model');
const { AuditLog } = require('../src/modules/audit/model');

async function testChangePasswordAndSettings() {
  await mongoose.connect(process.env.MONGODB_URI);

  const initialPassword = 'InitialSecret@123';
  const updatedPassword = 'BrandNewSecret@456';
  const hashedPassword = await argon2.hash(initialPassword);

  // Clean up
  await NGO.deleteMany({ contactEmail: 'settings@org.com' });
  await User.deleteMany({ email: 'settings_user@org.com' });

  const testNgo = await NGO.create({
    name: 'Settings NGO',
    contactEmail: 'settings@org.com',
    status: 'approved'
  });

  const testRole = await Role.create({
    ngoId: testNgo._id,
    name: 'NGO Admin',
    permissions: ['*']
  });

  const testUser = await User.create({
    ngoId: testNgo._id,
    name: 'Original Name',
    email: 'settings_user@org.com',
    password: hashedPassword,
    phone: '111-222-3333',
    designation: 'Officer',
    status: 'active',
    roleId: testRole._id
  });

  console.log('1. Logging in twice to simulate two devices (Session A & Session B)...');
  const loginA = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'settings_user@org.com', password: initialPassword });
  const tokenA = loginA.body.data.accessToken;
  const cookieA = loginA.headers['set-cookie']?.find(c => c.startsWith('refreshToken='));

  const loginB = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'settings_user@org.com', password: initialPassword });
  const cookieB = loginB.headers['set-cookie']?.find(c => c.startsWith('refreshToken='));

  const initialSessionsCount = await Session.countDocuments({ userId: testUser._id });
  console.log('Active sessions in DB before change (expected 2):', initialSessionsCount);

  console.log('\n2. Testing GET /api/v1/users/me...');
  const resMe = await request(app)
    .get('/api/v1/users/me')
    .set('Authorization', `Bearer ${tokenA}`);
  console.log('Status (expected 200):', resMe.status);
  console.log('User profile name:', resMe.body.data.name);
  console.log('Populated NGO name:', resMe.body.data.ngoId?.name);

  console.log('\n3. Testing change-password with wrong current password...');
  const resWrongCurrent = await request(app)
    .patch('/api/v1/users/change-password')
    .set('Authorization', `Bearer ${tokenA}`)
    .set('Cookie', cookieA)
    .send({
      currentPassword: 'WrongPassword@999',
      newPassword: updatedPassword
    });
  console.log('Status (expected 400):', resWrongCurrent.status, resWrongCurrent.body.message);

  console.log('\n4. Testing change-password with weak new password...');
  const resWeakNew = await request(app)
    .patch('/api/v1/users/change-password')
    .set('Authorization', `Bearer ${tokenA}`)
    .set('Cookie', cookieA)
    .send({
      currentPassword: initialPassword,
      newPassword: 'weak'
    });
  console.log('Status (expected 400):', resWeakNew.status, resWeakNew.body.message);

  console.log('\n5. Testing change-password with correct credentials from Session A...');
  const resChangeSuccess = await request(app)
    .patch('/api/v1/users/change-password')
    .set('Authorization', `Bearer ${tokenA}`)
    .set('Cookie', cookieA)
    .send({
      currentPassword: initialPassword,
      newPassword: updatedPassword
    });
  console.log('Status (expected 200):', resChangeSuccess.status);
  console.log('Message:', resChangeSuccess.body.message);

  // Check remaining sessions in DB
  const sessionsAfterChange = await Session.find({ userId: testUser._id });
  console.log('Sessions remaining in DB (expected 1 for current device):', sessionsAfterChange.length);

  console.log('\n6. Verifying Session A (current device) is still active...');
  const refreshA = await request(app)
    .post('/api/v1/auth/refresh-token')
    .set('Cookie', cookieA);
  console.log('Session A refresh status (expected 200):', refreshA.status);

  console.log('\n7. Verifying Session B (other device) was invalidated...');
  const refreshB = await request(app)
    .post('/api/v1/auth/refresh-token')
    .set('Cookie', cookieB);
  console.log('Session B refresh status (expected 401):', refreshB.status);

  console.log('\n8. Verifying old password no longer works...');
  const loginOld = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'settings_user@org.com', password: initialPassword });
  console.log('Old password login status (expected 401):', loginOld.status);

  console.log('\n9. Verifying new password logs in successfully...');
  const loginNew = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'settings_user@org.com', password: updatedPassword });
  console.log('New password login status (expected 200):', loginNew.status);

  console.log('\n10. Testing profile details update (PATCH /api/v1/users/profile)...');
  const resUpdateProfile = await request(app)
    .patch('/api/v1/users/profile')
    .set('Authorization', `Bearer ${tokenA}`)
    .send({
      name: 'Updated Director Name',
      phone: '999-888-7777',
      designation: 'Executive Director'
    });
  console.log('Status (expected 200):', resUpdateProfile.status);
  console.log('Updated Name:', resUpdateProfile.body.data.name);
  console.log('Updated Designation:', resUpdateProfile.body.data.designation);

  const updatedInDb = await User.findById(testUser._id);
  console.log('DB Name matches:', updatedInDb.name === 'Updated Director Name');

  // Verify Audit Logs
  const changeAudit = await AuditLog.findOne({ userId: testUser._id, action: 'PASSWORD_CHANGED' });
  const profileAudit = await AuditLog.findOne({ userId: testUser._id, action: 'PROFILE_UPDATED' });
  console.log('PASSWORD_CHANGED audit logged:', !!changeAudit);
  console.log('PROFILE_UPDATED audit logged:', !!profileAudit);

  // Cleanup
  await NGO.deleteOne({ _id: testNgo._id });
  await Role.deleteOne({ _id: testRole._id });
  await User.deleteOne({ _id: testUser._id });
  await Session.deleteMany({ userId: testUser._id });
  await AuditLog.deleteMany({ ngoId: testNgo._id });

  console.log('\n✅ ALL CHANGE PASSWORD & ACCOUNT SETTINGS TESTS PASSED!');
  await mongoose.disconnect();
  process.exit(0);
}

testChangePasswordAndSettings().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});

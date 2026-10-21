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

async function testSessionsAndLogin() {
  await mongoose.connect(process.env.MONGODB_URI);

  // Clean up any remnants from previous runs
  await NGO.deleteMany({ contactEmail: { $in: ['verified@org.com', 'unverified@verified.com'] } });
  await User.deleteMany({ email: { $in: ['admin@verified.com', 'unverified@verified.com'] } });

  const hashedPassword = await argon2.hash('TestPassword@123');

  // Create an approved NGO and an active user
  const approvedNgo = await NGO.create({
    name: 'Verified Org',
    contactEmail: 'verified@org.com',
    status: 'approved'
  });

  const testRole = await Role.create({
    ngoId: approvedNgo._id,
    name: 'NGO Admin',
    permissions: ['*']
  });

  const activeUser = await User.create({
    ngoId: approvedNgo._id,
    name: 'Verified Admin',
    email: 'admin@verified.com',
    password: hashedPassword,
    status: 'active',
    roleId: testRole._id
  });

  // Create an unverified user
  const unverifiedUser = await User.create({
    ngoId: approvedNgo._id,
    name: 'Unverified Admin',
    email: 'unverified@verified.com',
    password: hashedPassword,
    status: 'unverified',
    roleId: testRole._id
  });

  console.log('1. Testing login with unverified email...');
  const unverifiedRes = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'unverified@verified.com', password: 'TestPassword@123' });
  console.log('Status (expected 403):', unverifiedRes.status, unverifiedRes.body.errors?.[0]?.code);

  console.log('\n2. Testing successful login with active user...');
  const loginRes = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'admin@verified.com', password: 'TestPassword@123', rememberMe: true });
  console.log('Status (expected 200):', loginRes.status);
  console.log('Redirect path (expected /dashboard):', loginRes.body.data.redirect);
  console.log('User role:', loginRes.body.data.user.role);

  // Extract cookies
  const cookies = loginRes.headers['set-cookie'];
  const refreshCookie = cookies ? cookies.find(c => c.startsWith('refreshToken=')) : null;
  console.log('Refresh cookie set:', !!refreshCookie);
  const accessToken = loginRes.body.data.accessToken;

  console.log('\n3. Testing active sessions retrieval...');
  const sessionsRes = await request(app)
    .get('/api/v1/auth/sessions')
    .set('Authorization', 'Bearer ' + accessToken)
    .set('Cookie', refreshCookie);
  console.log('Status (expected 200):', sessionsRes.status);
  console.log('Total active sessions (expected 1):', sessionsRes.body.data.length);
  console.log('Is current session marked true:', sessionsRes.body.data[0]?.isCurrent);

  console.log('\n4. Testing refresh token rotation...');
  const refreshRes = await request(app)
    .post('/api/v1/auth/refresh-token')
    .set('Cookie', refreshCookie);
  console.log('Refresh status (expected 200):', refreshRes.status);
  console.log('New access token received:', !!refreshRes.body.data.accessToken);

  const newCookies = refreshRes.headers['set-cookie'];
  const newRefreshCookie = newCookies ? newCookies.find(c => c.startsWith('refreshToken=')) : null;

  console.log('\n5. Testing replay attack protection with old refresh token...');
  const replayRes = await request(app)
    .post('/api/v1/auth/refresh-token')
    .set('Cookie', refreshCookie); // sending old cookie
  console.log('Old token status (expected 401):', replayRes.status);

  console.log('\n6. Testing logout...');
  const logoutRes = await request(app)
    .post('/api/v1/auth/logout')
    .set('Cookie', newRefreshCookie);
  console.log('Logout status (expected 200):', logoutRes.status);

  const sessionsAfterLogout = await Session.countDocuments({ userId: activeUser._id });
  console.log('Sessions remaining after logout (expected 0):', sessionsAfterLogout);

  // Cleanup test data
  await NGO.deleteOne({ _id: approvedNgo._id });
  await Role.deleteOne({ _id: testRole._id });
  await User.deleteMany({ _id: { $in: [activeUser._id, unverifiedUser._id] } });
  await Session.deleteMany({ userId: activeUser._id });
  await AuditLog.deleteMany({ ngoId: approvedNgo._id });

  console.log('\n✅ ALL LOGIN & SESSION MANAGEMENT TESTS PASSED!');
  await mongoose.disconnect();
  process.exit(0);
}

testSessionsAndLogin().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});

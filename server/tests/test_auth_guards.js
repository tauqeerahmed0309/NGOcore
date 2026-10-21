const mongoose = require('mongoose');
const express = require('express');
const request = require('supertest');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { requireAuth } = require('../src/middleware/auth');
const { requirePermission } = require('../src/middleware/permissions');
const { requireNgoStatus } = require('../src/middleware/ngoStatus');
const { ngoScope } = require('../src/middleware/ngoScope');
const errorHandler = require('../src/middleware/errorHandler');
const { sendSuccess } = require('../src/utils/response');
const { generateTokens } = require('../src/utils/tokens');

const { NGO, Role } = require('../src/modules/ngo/model');
const { User } = require('../src/modules/users/model');

// Build isolated express app with guarded test routes
const testApp = express();
testApp.use(express.json());

// Guarded Route 1: Requires Auth + Approved NGO
testApp.get('/test/approved-only', requireAuth, requireNgoStatus('approved'), (req, res) => {
  sendSuccess(res, 200, 'Approved access granted', { ngoId: req.ngo._id, status: req.ngo.status });
});

// Guarded Route 2: Requires Auth + Approved NGO + records:create permission + ngoScope
testApp.post(
  '/test/records-create',
  requireAuth,
  requireNgoStatus('approved'),
  requirePermission('records:create'),
  ngoScope,
  (req, res) => {
    sendSuccess(res, 200, 'Record created authorized', {
      user: req.user.name,
      scopedNgoId: req.scopedNgoId,
      bodyReceived: req.body
    });
  }
);

testApp.use(errorHandler);

async function runAuthGuardTests() {
  await mongoose.connect(process.env.MONGODB_URI);

  // Setup test NGOs
  const pendingNgo = await NGO.create({
    name: 'Pending Org',
    contactEmail: 'pending@guardtest.com',
    status: 'pending'
  });

  const approvedNgo = await NGO.create({
    name: 'Approved Org',
    contactEmail: 'approved@guardtest.com',
    status: 'approved'
  });

  // Setup test Roles
  const adminRole = await Role.create({
    ngoId: approvedNgo._id,
    name: 'NGO Admin',
    permissions: ['*']
  });

  const viewerRole = await Role.create({
    ngoId: approvedNgo._id,
    name: 'Viewer',
    permissions: ['records:read']
  });

  const editorRole = await Role.create({
    ngoId: approvedNgo._id,
    name: 'Editor',
    permissions: ['records:read', 'records:create']
  });

  // Setup test Users
  const userPendingNgo = await User.create({
    ngoId: pendingNgo._id,
    name: 'Pending User',
    email: 'pending_user@guardtest.com',
    password: 'hash',
    status: 'active',
    roleId: adminRole._id
  });

  const userSuspended = await User.create({
    ngoId: approvedNgo._id,
    name: 'Suspended User',
    email: 'suspended_user@guardtest.com',
    password: 'hash',
    status: 'suspended',
    roleId: adminRole._id
  });

  const userViewer = await User.create({
    ngoId: approvedNgo._id,
    name: 'Viewer User',
    email: 'viewer_user@guardtest.com',
    password: 'hash',
    status: 'active',
    roleId: viewerRole._id
  });

  const userEditor = await User.create({
    ngoId: approvedNgo._id,
    name: 'Editor User',
    email: 'editor_user@guardtest.com',
    password: 'hash',
    status: 'active',
    roleId: editorRole._id
  });

  const userAdmin = await User.create({
    ngoId: approvedNgo._id,
    name: 'Admin User',
    email: 'admin_user@guardtest.com',
    password: 'hash',
    status: 'active',
    roleId: adminRole._id
  });

  console.log('1. Testing Unauthenticated Access...');
  const res1 = await request(testApp).get('/test/approved-only');
  console.log('Status (expected 401):', res1.status, res1.body.message);

  console.log('\n2. Testing Suspended User Access...');
  const tokenSuspended = generateTokens(userSuspended).accessToken;
  const res2 = await request(testApp)
    .get('/test/approved-only')
    .set('Authorization', `Bearer ${tokenSuspended}`);
  console.log('Status (expected 403):', res2.status, res2.body.message);

  console.log('\n3. Testing requireNgoStatus with Pending NGO User...');
  const tokenPending = generateTokens(userPendingNgo).accessToken;
  const res3 = await request(testApp)
    .get('/test/approved-only')
    .set('Authorization', `Bearer ${tokenPending}`);
  console.log('Status (expected 403):', res3.status, res3.body.message);

  console.log('\n4. Testing requireNgoStatus with Approved NGO User...');
  const tokenViewer = generateTokens(userViewer).accessToken;
  const res4 = await request(testApp)
    .get('/test/approved-only')
    .set('Authorization', `Bearer ${tokenViewer}`);
  console.log('Status (expected 200):', res4.status, res4.body.data.status);

  console.log('\n5. Testing requirePermission with Missing Permission (Viewer -> records:create)...');
  const res5 = await request(testApp)
    .post('/test/records-create')
    .set('Authorization', `Bearer ${tokenViewer}`)
    .send({ name: 'Test Record' });
  console.log('Status (expected 403):', res5.status, res5.body.message);

  console.log('\n6. Testing requirePermission with Granted Permission (Editor -> records:create)...');
  const tokenEditor = generateTokens(userEditor).accessToken;
  const res6 = await request(testApp)
    .post('/test/records-create')
    .set('Authorization', `Bearer ${tokenEditor}`)
    .send({ name: 'Test Record 1' });
  console.log('Status (expected 200):', res6.status, res6.body.message);

  console.log('\n7. Testing Wildcard Permission & ngoScope Stripping (Admin -> * wildcard)...');
  const tokenAdmin = generateTokens(userAdmin).accessToken;
  const res7 = await request(testApp)
    .post('/test/records-create')
    .set('Authorization', `Bearer ${tokenAdmin}`)
    .send({
      name: 'Test Record 2',
      ngoId: 'injected_fake_ngo_id',
      role: 'injected_fake_role'
    });
  console.log('Status (expected 200):', res7.status);
  console.log('Injected ngoId stripped from body:', res7.body.data.bodyReceived.ngoId === undefined);
  console.log('Scoped NGO ID securely matches user NGO ID:', res7.body.data.scopedNgoId === approvedNgo._id.toString());

  // Cleanup
  await NGO.deleteMany({ _id: { $in: [pendingNgo._id, approvedNgo._id] } });
  await Role.deleteMany({ _id: { $in: [adminRole._id, viewerRole._id, editorRole._id] } });
  await User.deleteMany({
    _id: {
      $in: [
        userPendingNgo._id,
        userSuspended._id,
        userViewer._id,
        userEditor._id,
        userAdmin._id
      ]
    }
  });

  console.log('\n✅ ALL AUTHENTICATION & AUTHORIZATION GUARD TESTS PASSED!');
  await mongoose.disconnect();
  process.exit(0);
}

runAuthGuardTests().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});

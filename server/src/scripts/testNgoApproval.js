const mongoose = require('mongoose');
const config = require('../config/env');
const Ngo = require('../models/Ngo');
const User = require('../models/User');
const { hashPassword } = require('../utils/passwordHelper');
const { apiRequest } = require('./apiTestClient');
const { setupTestEnvironment, teardownTestEnvironment } = require('./testHelper');

const BASE_URL = `http://localhost:${config.PORT}/api/v1`;
const password = 'PendingApprovalTest123!';

const runTests = async () => {
  await setupTestEnvironment();
  let ngo;
  let user;
  try {
    ngo = await Ngo.create({
      name: `Pending approval test NGO ${Date.now()}`,
      status: 'pending',
      contactEmail: `pending-test-${Date.now()}@example.org`
    });
    user = await User.create({
      ngoId: ngo._id,
      email: ngo.contactEmail,
      password: await hashPassword(password),
      role: 'admin',
      firstName: 'Pending',
      lastName: 'Applicant'
    });

    const pending = await apiRequest(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: user.email, password })
    });
    if (pending.status !== 403 || !pending.data?.message?.toLowerCase().includes('pending approval')) {
      throw new Error(`Pending NGO sign-in should be rejected with a clear message; got HTTP ${pending.status}.`);
    }
    console.log('PASS pending organization login is blocked with a pending-approval message.');

    ngo.status = 'approved';
    await ngo.save();
    const approved = await apiRequest(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: user.email, password })
    });
    if (approved.status !== 200 || !approved.accessToken) {
      throw new Error(`Approved NGO login should succeed; got HTTP ${approved.status}.`);
    }
    console.log('PASS approved organization login succeeds and receives an access cookie.');

    for (const status of ['rejected', 'suspended']) {
      ngo.status = status;
      await ngo.save();
      const blocked = await apiRequest(`${BASE_URL}/auth/login`, {
        method: 'POST',
        body: JSON.stringify({ email: user.email, password })
      });
      if (blocked.status !== 403) {
        throw new Error(`${status} organization sign-in should be rejected; got HTTP ${blocked.status}.`);
      }
    }
    console.log('PASS rejected and suspended organizations cannot sign in.');
  } finally {
    if (user) await User.deleteOne({ _id: user._id });
    if (ngo) await Ngo.deleteOne({ _id: ngo._id });
    await teardownTestEnvironment();
  }
};

runTests().catch((error) => {
  console.error(`NGO approval tests failed: ${error.message}`);
  process.exitCode = 1;
});

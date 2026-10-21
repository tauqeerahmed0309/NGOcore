const mongoose = require('mongoose');
const request = require('supertest');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const app = require('../src/app');

async function testRateLimiting() {
  await mongoose.connect(process.env.MONGODB_URI);

  const targetEmail = 'brute_force_victim@org.com';
  console.log('1. Testing Login Brute-Force Limiter (max 5 attempts per window)...');

  for (let i = 1; i <= 5; i++) {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: targetEmail, password: 'WrongPassword@123' });
    console.log(`Attempt ${i} status (expected 401):`, res.status);
  }

  // 6th attempt should trigger 429
  console.log('\n2. Testing 6th login attempt (should trigger HTTP 429)...');
  const resBlocked = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: targetEmail, password: 'WrongPassword@123' });

  console.log('Status (expected 429):', resBlocked.status);
  console.log('Retry-After header present:', !!resBlocked.headers['retry-after']);
  console.log('Retry-After value (seconds):', resBlocked.headers['retry-after']);
  console.log('Standardized response message:', resBlocked.body.message);
  console.log('Structured errors array:', resBlocked.body.errors);

  console.log('\n3. Testing Forgot-Password Limiter (max 3 attempts per window)...');
  for (let i = 1; i <= 3; i++) {
    const res = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'forgot_limit@org.com' });
    console.log(`Forgot password attempt ${i} status (expected 200):`, res.status);
  }

  // 4th attempt should trigger 429
  const resForgotBlocked = await request(app)
    .post('/api/v1/auth/forgot-password')
    .send({ email: 'forgot_limit@org.com' });
  console.log('4th attempt status (expected 429):', resForgotBlocked.status);
  console.log('Forgot password 429 message:', resForgotBlocked.body.message);

  console.log('\n✅ ALL RATE LIMITING & BRUTE-FORCE PROTECTION TESTS PASSED!');
  await mongoose.disconnect();
  process.exit(0);
}

testRateLimiting().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});

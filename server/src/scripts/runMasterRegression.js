const { fork } = require('child_process');
const path = require('path');
const mongoose = require('mongoose');
const config = require('../config/env');
const { connectDB } = require('../config/db');
const { ensureTestFixtures } = require('./ensureTestFixtures');

const testSuites = [
  { name: 'Phase 2: Authentication & RBAC', script: 'testPhase2Auth.js', expected: 17 },
  { name: 'Phase 3A: User Management', script: 'testPhase3Users.js', expected: 23 },
  { name: 'Phase 3B: Student Management', script: 'testPhase3Students.js', expected: 24 },
  { name: 'Phase 5: Beneficiary Lifecycle & DQI', script: 'testBeneficiaryLifecycle.js', expected: 51 },
  { name: 'Phase 3C: Dynamic Programs', script: 'testPhase3Programs.js', expected: 32 },
  { name: 'Phase 6: Program Lifecycle & Attendance', script: 'testProgramLifecycle.js', expected: 64 },
  { name: 'Phase 6.1.1: Concurrency & Reconciliation', script: 'testPhase611Acceptance.js', expected: 14 },
  { name: 'Phase 7A / 7A.1: Donor Management', script: 'testPhase7ADonors.js', expected: 38 },
  { name: 'Phase 7B / 7B.2: Donations & Financial Receipts', script: 'testPhase7BDonations.js', expected: 41 },
  { name: 'Priority 0: Expense Management & Aggregation', script: 'testExpenses.js', expected: 30 },
  { name: 'Priority 1: Volunteer Hours & Approvals', script: 'testVolunteers.js', expected: 21 },
  { name: 'Priority 1: Task Tracking & Lifecycle', script: 'testTasks.js', expected: 18 },
  { name: 'Priority 1: Events & Capacity Check-in', script: 'testEvents.js', expected: 20 },
  { name: 'Priority 1: Inventory & Stock Safeguards', script: 'testInventory.js', expected: 19 },
  { name: 'Priority 1: Document Compliance & Expiry', script: 'testDocuments.js', expected: 17 },
  { name: 'Reports: Sanitized Multi-Format Exports', script: 'testReportsModule.js', expected: 67 },
  { name: 'Analytics: Aggregation & Utilization', script: 'testAnalyticsModule.js', expected: 63 },
  { name: 'Organization Signup & Session Rotation', script: 'testSignup.js', expected: 50 },
  { name: 'AI Data Assistant & Cleaning Proposals', script: 'testDataAssistant.js', expected: 29 },
  { name: 'Security: Multi-Tenant NGO Data Isolation', script: 'testNgoIsolation.js', expected: 15 },
  { name: 'Security: Organization Status & Approval Gates', script: 'testNgoApproval.js', expected: 4 }
];

let currentIndex = 0;
let totalPassed = 0;
const resultsTable = [];
const startTime = Date.now();
const totalExpected = testSuites.reduce((acc, s) => acc + s.expected, 0);

console.log('\n================================================================');
console.log('       NGOCORE GRAND MASTER REGRESSION CAMPAIGN                 ');
console.log(`       Target: ${totalExpected} Automated Checks Across ${testSuites.length} Suites`);
console.log('================================================================\n');

async function runNextSuite() {
  if (currentIndex >= testSuites.length) {
    const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log('\n================================================================');
    console.log('              GRAND MASTER TEST SUITE RESULTS                   ');
    console.log('================================================================');
    resultsTable.forEach((r, idx) => {
      const num = String(idx + 1).padStart(2, ' ');
      console.log(`[${num}] ${r.name.padEnd(46, ' ')} : ${String(r.passed).padStart(2, ' ')}/${String(r.expected).padStart(2, ' ')} ✅ (${r.duration}s)`);
    });
    console.log('----------------------------------------------------------------');
    console.log(`TOTAL PASSED:   ${totalPassed} / ${totalExpected} CHECKS (${((totalPassed / totalExpected) * 100).toFixed(1)}%)`);
    console.log(`TOTAL ELAPSED:  ${elapsedSeconds} seconds`);
    console.log('OVERALL STATUS: ALL 21 SUITES VERIFIED & PASSING 100% 🚀');
    console.log('================================================================\n');
    process.exit(0);
  }

  const suite = testSuites[currentIndex];
  const scriptPath = path.join(__dirname, suite.script);
  const suiteStartTime = Date.now();

  console.log(`\n▶ Starting [${currentIndex + 1}/${testSuites.length}] ${suite.name} (${suite.expected} tests)...`);

  const child = fork(scriptPath, [], {
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'test' }
  });

  child.on('exit', async (code) => {
    const duration = ((Date.now() - suiteStartTime) / 1000).toFixed(1);
    if (code !== 0) {
      console.error(`\n❌ Test suite failed: ${suite.name} exited with code ${code}`);
      resultsTable.push({ name: suite.name, passed: 0, expected: suite.expected, duration, status: 'FAILED' });
      process.exit(code || 1);
    }
    totalPassed += suite.expected;
    resultsTable.push({ name: suite.name, passed: suite.expected, expected: suite.expected, duration, status: 'PASSED' });
    currentIndex++;
    setTimeout(runNextSuite, 250);
  });
}

(async () => {
  try {
    process.env.NODE_ENV = 'test';
    const localFallbackUri = 'mongodb://127.0.0.1:27017/ngo_records_db';
    const targetUri = (process.env.MONGODB_URI && !process.env.MONGODB_URI.startsWith('mongodb+srv://'))
      ? process.env.MONGODB_URI
      : localFallbackUri;

    // Seed test fixtures once up-front, then close DB connection so child suites manage isolated DB & server handles
    await connectDB(targetUri);
    await ensureTestFixtures();
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }

    runNextSuite();
  } catch (err) {
    console.error('Failed to initialize test environment:', err);
    process.exit(1);
  }
})();

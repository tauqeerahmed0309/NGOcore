const { fork } = require('child_process');
const path = require('path');
const { setupTestEnvironment, teardownTestEnvironment } = require('./testHelper');

const testSuites = [
  { name: 'Phase 2: Authentication & RBAC', script: 'testPhase2Auth.js', expected: 17 },
  { name: 'Phase 3A: User Management', script: 'testPhase3Users.js', expected: 23 },
  { name: 'Phase 3B: Student Management', script: 'testPhase3Students.js', expected: 24 },
  { name: 'Phase 3C: Dynamic Program Management', script: 'testPhase3Programs.js', expected: 32 },
  { name: 'Part 3: Organization Signup & Sessions', script: 'testSignup.js', expected: 50 },
  { name: 'Part 4: AI Data Assistant', script: 'testDataAssistant.js', expected: 29 },
];

let currentIndex = 0;
let totalPassed = 0;
let totalExpected = testSuites.reduce((acc, s) => acc + s.expected, 0);

console.log('\n================================================================');
console.log('   RUNNING COMPLETE NGOCORE TEST SUITE                            ');
console.log(`   Target: ${totalExpected} Automated Regression Checks Across 6 Suites`);
console.log('================================================================\n');

async function runNextSuite() {
  if (currentIndex >= testSuites.length) {
    await teardownTestEnvironment();
    console.log('\n================================================================');
    console.log(`GRAND TEST RESULT: ${totalPassed}/${totalExpected} TESTS PASSED SUCCESSFULLY! ✅`);
    console.log('================================================================\n');
    process.exit(0);
  }

  const suite = testSuites[currentIndex];
  const scriptPath = path.join(__dirname, suite.script);

  console.log(`\n▶ Starting [${suite.name}] (${suite.expected} tests)...`);

  const child = fork(scriptPath, [], {
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'test' }
  });

  child.on('exit', async (code) => {
    if (code !== 0) {
      await teardownTestEnvironment();
      console.error(`\n❌ Test suite failed: ${suite.name} exited with code ${code}`);
      process.exit(code || 1);
    }
    totalPassed += suite.expected;
    currentIndex++;
    runNextSuite();
  });
}

(async () => {
  try {
    await setupTestEnvironment();
    runNextSuite();
  } catch (err) {
    console.error('Failed to initialize test environment:', err);
    await teardownTestEnvironment();
    process.exit(1);
  }
})();

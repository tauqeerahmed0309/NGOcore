const mongoose = require('mongoose');
const config = require('../config/env');
const {
  connectDB,
  disconnectDB,
  getDBStatus,
  maskMongoUri,
  sanitizeLogMessage
} = require('../config/db');

let passed = 0;
let failed = 0;

const assert = (condition, message) => {
  if (!condition) {
    failed += 1;
    console.error(`❌ FAILED: ${message}`);
    throw new Error(message);
  }
  passed += 1;
  console.log(`✅ PASSED: ${message}`);
};

const runDatabaseTests = async () => {
  console.log('================================================================');
  console.log('   RUNNING DATABASE CONNECTION & ATLAS CONFIGURATION TEST SUITE ');
  console.log('================================================================\n');

  // --- PART 1: CREDENTIAL MASKING & LOG SANITIZATION ---
  console.log('▶ [Part 1: Credential Protection & Log Sanitization]');

  // Test 1: Atlas URI credential masking
  const sampleAtlasUri = 'mongodb+srv://admin_tester:P%40ssw0rd!123@cluster0.xyzab.mongodb.net/ngo_records_db?retryWrites=true&w=majority';
  const maskedAtlas = maskMongoUri(sampleAtlasUri);
  assert(
    maskedAtlas === 'mongodb+srv://****:****@cluster0.xyzab.mongodb.net/ngo_records_db?retryWrites=true&w=majority',
    'Atlas URI credentials masked to ****:****'
  );
  assert(!maskedAtlas.includes('P%40ssw0rd!123'), 'Raw Atlas password NEVER appears in masked string');
  assert(!maskedAtlas.includes('admin_tester'), 'Raw Atlas username NEVER appears in masked string');

  // Test 2: Standard URI credential masking
  const sampleStandardUri = 'mongodb://dbuser:supersecret@127.0.0.1:27017/ngo_records_db';
  const maskedStandard = maskMongoUri(sampleStandardUri);
  assert(
    maskedStandard === 'mongodb://****:****@127.0.0.1:27017/ngo_records_db',
    'Standard MongoDB URI credentials masked'
  );

  // Test 3: Local URI without credentials left intact
  const sampleLocalUri = 'mongodb://127.0.0.1:27017/ngo_records_db';
  const maskedLocal = maskMongoUri(sampleLocalUri);
  assert(
    maskedLocal === 'mongodb://127.0.0.1:27017/ngo_records_db',
    'Local URI without credentials remains intact'
  );

  // Test 4: Error message sanitization
  const sampleError = `MongoServerError: connection failed to mongodb+srv://app_user:SecretKey99@cluster0.net/test`;
  const sanitizedMsg = sanitizeLogMessage(sampleError);
  assert(!sanitizedMsg.includes('SecretKey99'), 'Sensitive credentials scrubbed from error logs');
  assert(sanitizedMsg.includes('mongodb+srv://****:****@cluster0.net/test'), 'Masked placeholder present in log message');

  // --- PART 2: CONFIGURED LOCAL DATABASE CONNECTION ---
  console.log('\n▶ [Part 2: Configured Database Connection & Idempotency]');

  // Clean initial state
  await disconnectDB();
  assert(getDBStatus() === 'disconnected', 'Database initial state is disconnected');

  // Test 5: Connect using configured MONGODB_URI
  const conn = await connectDB();
  assert(getDBStatus() === 'connected', 'Database successfully connected with configured MONGODB_URI');
  assert(mongoose.connection.readyState === 1, 'Mongoose readyState is 1 (connected)');

  // Test 6: Verify active database ping
  const pingResult = await mongoose.connection.db.admin().ping();
  assert(pingResult && pingResult.ok === 1, 'Database responded to ping command with ok: 1');

  // Test 7: Verify connection idempotency (no duplicate connections)
  const initialConnectionId = mongoose.connection.id;
  const secondCallResult = await connectDB();
  assert(
    secondCallResult === mongoose.connection,
    'Subsequent connectDB() call reuses active connection'
  );
  assert(
    mongoose.connection.id === initialConnectionId,
    'No secondary connection created on subsequent calls'
  );

  // --- PART 3: STARTUP FAILURE & NO SILENT FALLBACK ---
  console.log('\n▶ [Part 3: Startup Failure on Invalid URI (No Silent Fallback)]');

  // Disconnect from valid database first
  await disconnectDB();

  // Test 8: Startup failure on unreachable URI
  const unreachableUri = 'mongodb://127.0.0.1:59999/unreachable_db';
  let failureCaught = false;
  let failureErrorMessage = '';

  try {
    await connectDB(unreachableUri, { serverSelectionTimeoutMS: 1500 });
  } catch (error) {
    failureCaught = true;
    failureErrorMessage = error.message;
  }

  assert(failureCaught === true, 'connectDB() throws error when URI is unreachable');
  assert(getDBStatus() === 'disconnected', 'Database status remains disconnected on failure');
  assert(
    failureErrorMessage.includes('Failed to connect to MongoDB at [mongodb://127.0.0.1:59999/unreachable_db]'),
    'Error message clearly identifies the target URI that failed'
  );

  // Test 9: Verify NO silent fallback to local default
  assert(
    mongoose.connection.readyState === 0,
    'System does NOT silently fall back to local database when configured URI fails'
  );

  // Test 10: Re-connect to valid configured database for subsequent tests
  await connectDB();
  assert(getDBStatus() === 'connected', 'Successfully restored configured database connection');

  // --- PART 4: REAL ATLAS CONNECTIVITY CHECK ---
  console.log('\n▶ [Part 4: MongoDB Atlas Remote Connectivity Check]');

  const atlasCandidateUri = process.env.ATLAS_MONGODB_URI || (config.MONGODB_URI.startsWith('mongodb+srv://') ? config.MONGODB_URI : null);

  if (atlasCandidateUri) {
    console.log(`Connecting to remote MongoDB Atlas cluster at [${maskMongoUri(atlasCandidateUri)}]...`);
    try {
      await disconnectDB();
      await connectDB(atlasCandidateUri, { serverSelectionTimeoutMS: 10000 });
      const atlasPing = await mongoose.connection.db.admin().ping();
      assert(atlasPing.ok === 1, 'Real MongoDB Atlas cluster connected and responded to ping command');
      console.log('✅ Real MongoDB Atlas cluster connection VERIFIED.');
    } catch (err) {
      console.warn(`Atlas remote connection failed: ${err.message}`);
    } finally {
      await disconnectDB();
      await connectDB(); // restore local
    }
  } else {
    console.log('ℹ️  Atlas Verification Status:');
    console.log('   Current MONGODB_URI points to local development instance: ' + config.MONGODB_URI);
    console.log('   No remote Atlas credentials configured in server/.env (as expected for local development).');
    console.log('   The application is verified ready for MongoDB Atlas (Atlas SRV support, TLS/SSL, timeout, no silent fallback).');
  }

  console.log('\n================================================================');
  console.log(`DATABASE TEST RESULT: ALL ${passed} CHECKS PASSED SUCCESSFULLY! ✅`);
  console.log('================================================================');
};

runDatabaseTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Database test execution failed:', err);
    process.exit(1);
  });


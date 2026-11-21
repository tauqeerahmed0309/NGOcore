const mongoose = require('mongoose');
const app = require('../app');
const config = require('../config/env');
const { connectDB } = require('../config/db');
const { ensureTestFixtures } = require('./ensureTestFixtures');

let serverInstance = null;

const isServerListening = async () => {
  try {
    const res = await fetch(`http://localhost:${config.PORT}/api/v1/health`, {
      signal: AbortSignal.timeout(800)
    });
    return res.ok;
  } catch {
    return false;
  }
};

const setupTestEnvironment = async () => {
  process.env.NODE_ENV = 'test';
  const localFallbackUri = 'mongodb://127.0.0.1:27017/ngo_records_db';
  const targetUri = (process.env.MONGODB_URI && !process.env.MONGODB_URI.startsWith('mongodb+srv://'))
    ? process.env.MONGODB_URI
    : localFallbackUri;
  await connectDB(targetUri);
  await ensureTestFixtures();

  const listening = await isServerListening();
  if (!listening) {
    serverInstance = app.listen(config.PORT, '0.0.0.0');
    await new Promise((resolve, reject) => {
      serverInstance.once('listening', resolve);
      serverInstance.once('error', reject);
    });
  }
  return serverInstance;
};

const teardownTestEnvironment = async () => {
  if (serverInstance) {
    await new Promise((resolve) => serverInstance.close(resolve));
    serverInstance = null;
  }
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
};

module.exports = {
  setupTestEnvironment,
  teardownTestEnvironment,
  isServerListening
};

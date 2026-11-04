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
  await connectDB();
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

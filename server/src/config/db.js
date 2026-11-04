const mongoose = require('mongoose');
const config = require('./env');
const logger = require('../utils/logger');

let isConnected = false;
let connectingPromise = null;

/**
 * Masks credentials in MongoDB connection URIs to prevent secret leakage in logs.
 * Example: mongodb+srv://user:pass@cluster.mongodb.net/db -> mongodb+srv://****:****@cluster.mongodb.net/db
 */
const maskMongoUri = (uri) => {
  if (!uri || typeof uri !== 'string') return '';
  return uri.replace(/(mongodb(?:\+srv)?:\/\/)(?:[^:@\s]+):(?:[^@\s]+)@/gi, '$1****:****@');
};

/**
 * Sanitizes any log message or error string that might contain raw MongoDB connection credentials.
 */
const sanitizeLogMessage = (message) => {
  if (!message) return '';
  return String(message).replace(/(mongodb(?:\+srv)?:\/\/)(?:[^:@\s]+):(?:[^@\s]+)@/gi, '$1****:****@');
};

/**
 * Connects to MongoDB (Local or Atlas) using the configured MONGODB_URI.
 * - Does not silently fall back if connection fails.
 * - Throws a sanitized Error if connection cannot be established.
 * - Reuses existing connection if already established.
 */
const connectDB = async (customUri, options = {}) => {
  // If already connected, reuse existing connection
  if (mongoose.connection.readyState === 1) {
    isConnected = true;
    logger.info('Using existing MongoDB connection');
    return mongoose.connection;
  }

  // If a connection is already in flight, wait for it
  if (connectingPromise) {
    return connectingPromise;
  }

  const targetUri = (customUri || config.MONGODB_URI || '').trim();
  const maskedUri = maskMongoUri(targetUri);

  if (!targetUri) {
    const err = new Error('FATAL: MONGODB_URI environment variable is not defined.');
    logger.error(err.message);
    throw err;
  }

  const isAtlas = targetUri.startsWith('mongodb+srv://');
  const timeoutMs = options.serverSelectionTimeoutMS || (isAtlas ? 10000 : 5000);

  connectingPromise = (async () => {
    try {
      logger.info(`Initiating MongoDB connection [${isAtlas ? 'Atlas Remote' : 'Local'}]: ${maskedUri}`);

      const conn = await mongoose.connect(targetUri, {
        serverSelectionTimeoutMS: timeoutMs,
        autoIndex: options.autoIndex !== undefined ? options.autoIndex : true
      });

      isConnected = conn.connection.readyState === 1;
      const host = conn.connection.host || 'cluster';
      const dbName = conn.connection.name || 'default';

      logger.info(`MongoDB connected successfully [${isAtlas ? 'Atlas Remote' : 'Local'}]: ${host}/${dbName}`);
      return conn;
    } catch (error) {
      isConnected = false;
      const sanitizedError = sanitizeLogMessage(error.message);
      logger.error(`MongoDB connection error [${maskedUri}]: ${sanitizedError}`);
      throw new Error(`Failed to connect to MongoDB at [${maskedUri}]: ${sanitizedError}`);
    } finally {
      connectingPromise = null;
    }
  })();

  return connectingPromise;
};

/**
 * Gracefully disconnects from MongoDB.
 */
const disconnectDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    isConnected = false;
    connectingPromise = null;
    logger.info('MongoDB disconnected.');
  }
};

mongoose.connection.on('disconnected', () => {
  isConnected = false;
  logger.warn('MongoDB connection lost. Reconnecting...');
});

mongoose.connection.on('reconnected', () => {
  isConnected = true;
  logger.info('MongoDB reconnected.');
});

const getDBStatus = () => {
  return mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
};

module.exports = {
  connectDB,
  disconnectDB,
  getDBStatus,
  maskMongoUri,
  sanitizeLogMessage
};

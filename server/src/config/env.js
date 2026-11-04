const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env file (server directory or root)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '20m';
const refreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
const parseIntegerEnv = (name, fallback, min, max) => {
  const value = process.env[name];
  if (value === undefined || value === '') return fallback;
  if (!/^\d+$/.test(value)) {
    throw new Error(`FATAL: ${name} must be an integer between ${min} and ${max}.`);
  }
  const parsed = Number.parseInt(value, 10);
  if (parsed < min || parsed > max) {
    throw new Error(`FATAL: ${name} must be an integer between ${min} and ${max}.`);
  }
  return parsed;
};

if (!/^\d+m$/.test(jwtExpiresIn) || Number.parseInt(jwtExpiresIn, 10) < 15 || Number.parseInt(jwtExpiresIn, 10) > 30) {
  throw new Error('FATAL: JWT_EXPIRES_IN must be between 15m and 30m.');
}
if (!/^\d+d$/.test(refreshExpiresIn) || Number.parseInt(refreshExpiresIn, 10) < 1 || Number.parseInt(refreshExpiresIn, 10) > 30) {
  throw new Error('FATAL: JWT_REFRESH_EXPIRES_IN must be between 1d and 30d.');
}

const config = {
  PORT: parseIntegerEnv('PORT', 5000, 1, 65535),
  NODE_ENV: process.env.NODE_ENV || 'development',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ngocore_db',
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: jwtExpiresIn,
  JWT_REFRESH_EXPIRES_IN: refreshExpiresIn,
  MAX_FILE_SIZE_MB: parseIntegerEnv('MAX_FILE_SIZE_MB', 10, 1, 100),
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || '',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
  SMTP_HOST: process.env.SMTP_HOST || '',
  SMTP_PORT: parseIntegerEnv('SMTP_PORT', 587, 1, 65535),
  SMTP_SECURE: process.env.SMTP_SECURE === 'true',
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASSWORD: process.env.SMTP_PASSWORD || '',
  MAIL_FROM: process.env.MAIL_FROM || '',
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '',
  ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001'
};

if (!config.JWT_SECRET || config.JWT_SECRET.length < 32) {
  throw new Error('FATAL: Set JWT_SECRET to a random value of at least 32 characters.');
}

if (process.env.ADMIN_EMAIL && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.ADMIN_EMAIL)) {
  throw new Error('FATAL: ADMIN_EMAIL must be a valid email address.');
}
if (process.env.MONGODB_URI && !/^mongodb(?:\+srv)?:\/\//.test(config.MONGODB_URI)) {
  throw new Error('FATAL: MONGODB_URI must use the mongodb:// or mongodb+srv:// protocol.');
}
if (Boolean(config.SMTP_USER) !== Boolean(config.SMTP_PASSWORD)) {
  throw new Error('FATAL: Configure both SMTP_USER and SMTP_PASSWORD, or leave both empty.');
}
if (Boolean(config.SMTP_HOST) !== Boolean(config.MAIL_FROM)) {
  throw new Error('FATAL: Configure both SMTP_HOST and MAIL_FROM to enable email delivery.');
}
if (process.env.SMTP_SECURE !== undefined && !['true', 'false'].includes(process.env.SMTP_SECURE)) {
  throw new Error('FATAL: SMTP_SECURE must be either true or false.');
}

if (config.NODE_ENV === 'production') {
  if (!process.env.MONGODB_URI) {
    throw new Error('FATAL: MONGODB_URI must be provided in production.');
  }
  if (process.env.MONGODB_URI.includes('127.0.0.1') || process.env.MONGODB_URI.includes('localhost')) {
    throw new Error('FATAL: Production MONGODB_URI cannot point to localhost or 127.0.0.1. Please configure your remote MongoDB Atlas connection string.');
  }
}

module.exports = config;

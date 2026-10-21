const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const env = require('./config/env');
const errorHandler = require('./middleware/errorHandler');
const { sendSuccess } = require('./utils/response');

const path = require('path');
const app = express();

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: false // Allow images/files to be loaded cross-origin
}));

// CORS configuration
app.use(cors({
  origin: env.CLIENT_URL,
  credentials: true,
}));

// Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Static file serving for uploads (avatars, documents)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Rate Limiter for general endpoints
const { generalLimiter } = require('./middleware/rateLimiter');
app.use(generalLimiter);

// Health Check Endpoint
app.get('/api/v1/health', (req, res) => {
  sendSuccess(res, 200, 'System is healthy and running', {
    timestamp: new Date().toISOString(),
    env: env.NODE_ENV
  });
});

// API Routes
app.use('/api/v1/auth', require('./modules/auth/auth.routes'));
app.use('/api/v1/ngo', require('./modules/ngo/ngo.routes'));
app.use('/api/v1/platform', require('./modules/platform/platform.routes'));
app.use('/api/v1/users', require('./modules/users/user.routes'));
app.use('/api/v1/roles', require('./modules/roles/roles.routes'));
app.use('/api/v1/invitations', require('./modules/invitations/invitations.routes'));
app.use('/api/v1/notifications', require('./modules/notifications/notifications.routes'));
app.use('/api/v1/audit', require('./modules/audit/audit.routes'));
app.use('/api/v1/records', require('./modules/records/records.routes'));
app.use('/api/v1/privacy', require('./modules/privacy/privacy.routes'));
app.use('/api/v1/files', require('./modules/files/files.routes'));
app.use('/api/v1/ai', require('./modules/ai/ai.routes'));
app.use('/api/v1/blockchain', require('./modules/blockchain/blockchain.routes'));

// Unknown Routes Handler
app.use((req, res, next) => {
  const { AppError } = require('./utils/errors');
  next(new AppError(404, 'Route not found'));
});

// Global Error Handler
app.use(errorHandler);

module.exports = app;

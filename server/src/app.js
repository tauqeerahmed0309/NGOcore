const express = require('express');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

const config = require('./config/env');
const apiRoutes = require('./routes');
const { notFoundHandler, errorHandler } = require('./middlewares/errorMiddleware');
const { successResponse } = require('./utils/apiResponse');

const app = express();

// 1. Security Headers with Helmet
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: [
        "'self'",
        'http://localhost:5000',
        'http://127.0.0.1:5000',
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'https://*.onrender.com',
        'https://*.vercel.app'
      ],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
      imgSrc: ["'self'", 'data:', 'blob:', 'https:']
    }
  }
}));
app.use(compression());

// 2. CORS Configuration
// Parse CLIENT_URL (supports single URL, comma-separated URLs, and removes trailing slashes)
const configuredOrigins = (config.CLIENT_URL || '')
  .split(',')
  .map((url) => url.trim().replace(/\/+$/, ''))
  .filter(Boolean);

const defaultOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://localhost:5000',
  'http://127.0.0.1:5000'
];

const allowedOrigins = Array.from(new Set([...configuredOrigins, ...defaultOrigins]));

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, health-checks, or server-to-server)
    if (!origin) {
      return callback(null, true);
    }

    const normalizedOrigin = origin.trim().replace(/\/+$/, '');

    // Check against configured and default allowed origins
    if (
      allowedOrigins.includes(normalizedOrigin) ||
      allowedOrigins.includes('*') ||
      normalizedOrigin.includes('localhost') ||
      normalizedOrigin.includes('127.0.0.1')
    ) {
      return callback(null, true);
    }

    // Allow Vercel preview deployments if a Vercel domain is configured
    try {
      const parsed = new URL(origin);
      if (parsed.hostname.endsWith('.vercel.app') && allowedOrigins.some((o) => o.includes('.vercel.app'))) {
        return callback(null, true);
      }
    } catch (_) {
      // Ignore invalid URL parse
    }

    return callback(new Error('Blocked by CORS policy'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// 3. Rate Limiter (Prevents Brute Force / DoS)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test' ? 10000 : 300,
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  skip: () => process.env.NODE_ENV === 'test',
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes.',
    data: null,
    errors: null
  }
});
app.use('/api/', apiLimiter);

// 4. Request Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 5. Static File Serving (Uploaded Documents)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// 6. Mount API Routes
app.use('/api/v1', apiRoutes);

// 7. Client Single-Page App (SPA) Serving in Production
const clientDistPath = path.resolve(__dirname, '../../client/dist');
const shouldServeClient = process.env.SERVE_CLIENT === 'true' ||
  (process.env.NODE_ENV === 'production' && fs.existsSync(clientDistPath));

if (shouldServeClient && fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.use((req, res, next) => {
    if (req.method !== 'GET') return next();
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    return res.sendFile(path.join(clientDistPath, 'index.html'));
  });
} else {
  // Root route for API server
  app.get('/', (req, res) => {
    return successResponse(res, 200, 'NGOcore Backend API Server', {
      version: '1.0.0',
      documentation: '/api/v1/health'
    });
  });
}

// 7. Centralized Error Handling Middlewares
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;

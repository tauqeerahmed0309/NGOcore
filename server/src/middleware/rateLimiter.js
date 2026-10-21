const { rateLimit } = require('express-rate-limit');

/**
 * Creates a rate limiter instance with standardized 429 response structure and retry headers.
 */
const createLimiter = ({ windowMs, max, message, keyGenerator }) => {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true, // draft-6/draft-7 RateLimit headers and Retry-After
    legacyHeaders: false,
    validate: false,
    keyGenerator: keyGenerator || undefined,
    handler: (req, res) => {
      const retryAfter = res.getHeader('Retry-After');
      return res.status(429).json({
        success: false,
        message: message || 'Too many requests. Please try again later.',
        data: {
          retryAfterSeconds: retryAfter ? parseInt(retryAfter, 10) : Math.ceil(windowMs / 1000)
        },
        errors: [
          {
            field: 'rateLimit',
            message: message || 'Rate limit exceeded'
          }
        ]
      });
    }
  });
};

// 1. General API traffic limiter: 100 requests per 15 minutes per IP
const generalLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'General API rate limit exceeded. Please try again in 15 minutes.'
});

// 2. Login Brute-Force Limiter: 5 attempts per 15 minutes per IP + email combination
const loginLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts. Please wait 15 minutes before attempting to log in again.',
  keyGenerator: (req) => {
    const email = (req.body?.email || '').toLowerCase().trim();
    const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown_ip';
    return `${ip}_${email}`;
  }
});

// 3. Password Reset Limiter: 3 requests per 15 minutes per IP + email
const forgotPasswordLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 3,
  message: 'Too many password reset requests. Please wait 15 minutes before requesting another reset.',
  keyGenerator: (req) => {
    const email = (req.body?.email || '').toLowerCase().trim();
    const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown_ip';
    return `${ip}_${email}`;
  }
});

// 4. OTP Generation Limiter: 3 requests per 5 minutes per IP + email
const otpResendLimiter = createLimiter({
  windowMs: 5 * 60 * 1000,
  max: 3,
  message: 'Too many OTP requests. Please wait 5 minutes before requesting another verification code.',
  keyGenerator: (req) => {
    const email = (req.body?.email || '').toLowerCase().trim();
    const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown_ip';
    return `${ip}_${email}`;
  }
});

// 5. File Upload Limiter: 10 uploads per minute per user/IP
const uploadLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 10,
  message: 'File upload rate limit reached. Please wait 1 minute before uploading additional files.'
});

// 6. AI & Blockchain Limiter: 20 operations per minute per user/IP
const aiBlockchainLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 20,
  message: 'AI & Blockchain operation rate limit reached. Please slow down your requests.'
});

module.exports = {
  createLimiter,
  generalLimiter,
  loginLimiter,
  forgotPasswordLimiter,
  otpResendLimiter,
  uploadLimiter,
  aiBlockchainLimiter
};

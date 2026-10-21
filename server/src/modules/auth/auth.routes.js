const express = require('express');
const validate = require('../../middleware/validate');
const { requireAuth } = require('../../middleware/auth');
const { 
  signupSchema, 
  emailSchema, 
  verifyOtpSchema, 
  loginSchema,
  sessionIdParamsSchema,
  forgotPasswordSchema,
  resetPasswordSchema
} = require('./auth.validation');
const authController = require('./auth.controller');

const { 
  loginLimiter,
  forgotPasswordLimiter,
  otpResendLimiter
} = require('../../middleware/rateLimiter');

const router = express.Router();

router.post('/signup', validate(signupSchema), authController.signup);
router.post('/send-otp', otpResendLimiter, validate(emailSchema), authController.requestOtp);
router.post('/verify-otp', validate(verifyOtpSchema), authController.verifyOtp);

// Login and Session Routes
router.post('/login', loginLimiter, validate(loginSchema), authController.login);
router.post('/refresh-token', authController.refreshToken);
router.post('/logout', authController.logout);
router.post('/logout-all', requireAuth, authController.logoutAll);
router.get('/sessions', requireAuth, authController.getActiveSessions);
router.delete('/sessions/:sessionId', requireAuth, validate(sessionIdParamsSchema), authController.revokeSession);

// Password Reset Routes
router.post('/forgot-password', forgotPasswordLimiter, validate(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword);

module.exports = router;

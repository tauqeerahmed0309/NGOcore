const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const passwordResetController = require('../controllers/passwordResetController');
const signupController = require('../controllers/signupController');
const authMiddleware = require('../middlewares/authMiddleware');
const signupOnboardingMiddleware = require('../middlewares/signupOnboardingMiddleware');
const { uploadSupportingDocument } = require('../middlewares/onboardingUpload');
const rateLimit = require('express-rate-limit');
const { validateBody } = require('../middlewares/validationMiddleware');
const {
  loginSchema,
  studentLoginSchema,
  googleLoginSchema,
  studentPasswordSetupSchema,
  changePasswordSchema,
  signupSchema,
  signupEmailSchema,
  passwordResetRequestSchema,
  passwordResetSchema,
  verifySignupOtpSchema,
  onboardingSchema
} = require('../validations/authValidation');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test' ? 1000 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: {
    success: false,
    message: 'Too many login attempts from this IP. Please try again in 15 minutes.',
    data: null,
    errors: null
  }
});

const signupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: { success: false, message: 'Too many organization sign-up requests from this IP. Please try again later.', data: null, errors: null }
});

const signupOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: {
    success: false,
    message: 'Too many email verification requests from this IP. Please try again later.',
    data: null,
    errors: null
  }
});

const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: {
    success: false,
    message: 'Too many password reset attempts from this IP. Please try again later.',
    data: null,
    errors: null
  }
});

router.post('/login', loginLimiter, validateBody(loginSchema), authController.login);
router.post('/student/login', loginLimiter, validateBody(studentLoginSchema), authController.studentLogin);
router.post('/google', loginLimiter, validateBody(googleLoginSchema), authController.googleLogin);
router.post(
  '/password/setup',
  passwordResetLimiter,
  validateBody(studentPasswordSetupSchema),
  authController.completeStudentPasswordSetup
);
router.post('/password/forgot', passwordResetLimiter, validateBody(passwordResetRequestSchema), passwordResetController.requestPasswordReset);
router.post('/password/reset', passwordResetLimiter, validateBody(passwordResetSchema), passwordResetController.resetPassword);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);
router.post('/logout-all', authMiddleware, authController.logoutAll);
router.post('/signup', signupLimiter, validateBody(signupSchema), signupController.signup);
router.post('/signup/verify', signupOtpLimiter, validateBody(verifySignupOtpSchema), signupController.verifyOtp);
router.post('/signup/resend', signupOtpLimiter, validateBody(signupEmailSchema), signupController.resendOtp);
router.post(
  '/onboarding/document',
  signupOnboardingMiddleware,
  uploadSupportingDocument,
  signupController.uploadSupportingDocument
);
router.post(
  '/onboarding',
  signupOnboardingMiddleware,
  validateBody(onboardingSchema),
  signupController.completeOnboarding
);

// Protected routes
router.get('/me', authMiddleware, authController.getMe);
router.post('/change-password', authMiddleware, validateBody(changePasswordSchema), authController.changePassword);

module.exports = router;

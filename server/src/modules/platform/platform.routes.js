const express = require('express');
const validate = require('../../middleware/validate');
const { requirePlatformAdmin } = require('../../middleware/auth');
const { 
  loginSchema, 
  verify2FASchema,
  getNgosQuerySchema,
  getNgoParamsSchema,
  updateNgoStatusSchema
} = require('./platform.validation');
const { loginLimiter } = require('../../middleware/rateLimiter');
const platformController = require('./platform.controller');

const router = express.Router();

// Dedicated platform admin authentication routes
router.post('/login', loginLimiter, validate(loginSchema), platformController.login);
router.post('/verify-2fa', validate(verify2FASchema), platformController.verify2FA);

// Protected platform admin profile
router.get('/me', requirePlatformAdmin, platformController.getMe);

// Protected NGO review and approval routes
router.get('/ngos', requirePlatformAdmin, validate(getNgosQuerySchema), platformController.getNgos);
router.get('/ngos/:ngoId', requirePlatformAdmin, validate(getNgoParamsSchema), platformController.getNgoById);
router.patch('/ngos/:ngoId/status', requirePlatformAdmin, validate(updateNgoStatusSchema), platformController.updateNgoStatus);

module.exports = router;

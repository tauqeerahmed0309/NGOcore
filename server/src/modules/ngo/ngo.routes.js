const express = require('express');
const upload = require('../../middleware/upload');
const validate = require('../../middleware/validate');
const { requireAuth } = require('../../middleware/auth');
const { requireNgoStatus } = require('../../middleware/ngoStatus');
const { requireAnyPermission } = require('../../middleware/permissions');
const { ngoScope } = require('../../middleware/ngoScope');
const { uploadLimiter } = require('../../middleware/rateLimiter');
const { updateNgoProfileSchema, updateNgoSettingsSchema } = require('./ngo.validation');
const ngoController = require('./ngo.controller');

const router = express.Router();

// NGO Onboarding (unverified NGOs uploading initial verification documents)
router.post('/onboard', requireAuth, uploadLimiter, upload.array('documents', 5), ngoController.onboardNgo);

// Fetch Organization Profile & Settings (Approved NGOs)
router.get(
  '/profile',
  requireAuth,
  requireNgoStatus('approved'),
  ngoScope,
  ngoController.getNgoProfile
);

// Update Organization Profile & Logo
router.patch(
  '/profile',
  requireAuth,
  requireNgoStatus('approved'),
  ngoScope,
  requireAnyPermission('settings:manage', 'roles:manage'),
  upload.single('logo'),
  validate(updateNgoProfileSchema),
  ngoController.updateNgoProfile
);

// Update Organization Tenant Settings (Currency, Timezone, Retention, 2FA, Security)
router.patch(
  '/settings',
  requireAuth,
  requireNgoStatus('approved'),
  ngoScope,
  requireAnyPermission('settings:manage', 'roles:manage'),
  validate(updateNgoSettingsSchema),
  ngoController.updateNgoSettings
);

module.exports = router;

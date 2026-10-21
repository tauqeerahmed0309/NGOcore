const express = require('express');
const validate = require('../../middleware/validate');
const { requireAuth } = require('../../middleware/auth');
const { requireNgoStatus } = require('../../middleware/ngoStatus');
const { requirePermission } = require('../../middleware/permissions');
const { ngoScope } = require('../../middleware/ngoScope');
const upload = require('../../middleware/upload');
const { changePasswordSchema, updateProfileSchema } = require('./user.validation');
const userController = require('./user.controller');

const router = express.Router();

// Get authenticated user profile (personal)
router.get('/me', requireAuth, userController.getProfile);

// Change password (invalidates all sessions except current)
router.patch('/change-password', requireAuth, validate(changePasswordSchema), userController.changePassword);

// Update account settings and optional avatar upload
router.patch('/profile', requireAuth, upload.single('avatar'), validate(updateProfileSchema), userController.updateProfile);

// Active device session management (Security tab)
router.get('/me/sessions', requireAuth, userController.getUserSessions);
router.delete('/me/sessions/:sessionId', requireAuth, userController.revokeSession);
router.delete('/me/sessions', requireAuth, userController.revokeAllOtherSessions);

// NGO Staff Roster & User Management (requires tenant isolation & permissions)
router.get(
  '/',
  requireAuth,
  requireNgoStatus('approved'),
  ngoScope,
  requirePermission('users:read'),
  userController.getNgoUsers
);

router.patch(
  '/:userId/status',
  requireAuth,
  requireNgoStatus('approved'),
  ngoScope,
  requirePermission('users:update'),
  userController.changeUserStatus
);

router.patch(
  '/:userId/role',
  requireAuth,
  requireNgoStatus('approved'),
  ngoScope,
  requirePermission('users:update'),
  userController.changeUserRole
);

module.exports = router;

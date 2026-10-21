const express = require('express');
const { requireAuth } = require('../../middleware/auth');
const { requireNgoStatus } = require('../../middleware/ngoStatus');
const { requirePermission } = require('../../middleware/permissions');
const { ngoScope } = require('../../middleware/ngoScope');
const validate = require('../../middleware/validate');
const { createInvitationSchema, acceptInvitationSchema } = require('./invitations.validation');
const invitationsController = require('./invitations.controller');

const router = express.Router();

// Public routes (no auth required to verify and accept invite)
router.get('/verify/:token', invitationsController.verifyInvitation);
router.post('/accept', validate(acceptInvitationSchema), invitationsController.acceptInvitation);

// Protected management routes
router.use(requireAuth);
router.use(requireNgoStatus('approved'));
router.use(ngoScope);

router.get('/', requirePermission('users:invite'), invitationsController.getInvitations);
router.post('/', requirePermission('users:invite'), validate(createInvitationSchema), invitationsController.sendInvitation);
router.post('/:invitationId/resend', requirePermission('users:invite'), invitationsController.resendInvitation);
router.delete('/:invitationId', requirePermission('users:invite'), invitationsController.revokeInvitation);

module.exports = router;

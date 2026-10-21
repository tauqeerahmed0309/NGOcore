const invitationsService = require('./invitations.service');
const { sendSuccess } = require('../../utils/response');

class InvitationsController {
  async sendInvitation(req, res, next) {
    try {
      const result = await invitationsService.sendInvitation(req.scopedNgoId, req.body, req.user._id);
      sendSuccess(res, 201, 'Invitation sent successfully', result);
    } catch (err) {
      next(err);
    }
  }

  async getInvitations(req, res, next) {
    try {
      const list = await invitationsService.getInvitations(req.scopedNgoId);
      sendSuccess(res, 200, 'Invitations retrieved successfully', list);
    } catch (err) {
      next(err);
    }
  }

  async resendInvitation(req, res, next) {
    try {
      const result = await invitationsService.resendInvitation(req.scopedNgoId, req.params.invitationId, req.user._id);
      sendSuccess(res, 200, result.message, result);
    } catch (err) {
      next(err);
    }
  }

  async revokeInvitation(req, res, next) {
    try {
      const result = await invitationsService.revokeInvitation(req.scopedNgoId, req.params.invitationId, req.user._id);
      sendSuccess(res, 200, result.message);
    } catch (err) {
      next(err);
    }
  }

  async verifyInvitation(req, res, next) {
    try {
      const details = await invitationsService.verifyInvitation(req.params.token);
      sendSuccess(res, 200, 'Invitation is valid', details);
    } catch (err) {
      next(err);
    }
  }

  async acceptInvitation(req, res, next) {
    try {
      const meta = {
        ip: req.ip,
        userAgent: req.get('user-agent')
      };
      const result = await invitationsService.acceptInvitation(req.body, meta);

      // Set httpOnly refresh cookie
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      sendSuccess(res, 201, 'Invitation accepted successfully. Welcome to the organization!', {
        accessToken: result.accessToken,
        user: result.user
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new InvitationsController();

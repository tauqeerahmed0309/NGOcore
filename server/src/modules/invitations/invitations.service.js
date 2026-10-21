const crypto = require('crypto');
const argon2 = require('argon2');
const { Invitation, Role, NGO } = require('../ngo/model');
const { User } = require('../users/model');
const { Session } = require('../auth/model');
const { AuditLog } = require('../audit/model');
const { queueEmail } = require('../../jobs/emailJob');
const { generateTokens } = require('../../utils/tokens');
const { AppError } = require('../../utils/errors');
const env = require('../../config/env');
const { createNotification } = require('../notifications/notifications.service');

class InvitationsService {
  /**
   * Send an invitation to a new team member
   */
  async sendInvitation(ngoId, { email, roleId }, invitingUserId) {
    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      throw new AppError(400, 'A user account with this email address already exists');
    }

    // Verify role belongs to this NGO
    const role = await Role.findOne({ _id: roleId, ngoId });
    if (!role) {
      throw new AppError(400, 'Invalid role selected for your organization');
    }

    // Check existing pending invitation
    let invitation = await Invitation.findOne({
      ngoId,
      email: normalizedEmail,
      status: 'pending'
    });

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    if (invitation) {
      invitation.token = token;
      invitation.roleId = role._id;
      invitation.invitedBy = invitingUserId;
      invitation.expiresAt = expiresAt;
      await invitation.save();
    } else {
      invitation = await Invitation.create({
        ngoId,
        email: normalizedEmail,
        roleId: role._id,
        token,
        invitedBy: invitingUserId,
        status: 'pending',
        expiresAt
      });
    }

    // Fetch NGO details for the email
    const ngo = await NGO.findById(ngoId);
    const inviteUrl = `${env.CLIENT_URL}/accept-invitation?token=${token}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; rounded: 16px;">
        <h2 style="color: #4f46e5; margin-bottom: 8px;">Invitation to Join ${ngo ? ngo.name : 'NGO Platform'}</h2>
        <p style="color: #475569; font-size: 15px; line-height: 1.5;">
          You have been invited to join <strong>${ngo ? ngo.name : 'the organization'}</strong> on NGOcore as <strong>${role.name}</strong>.
        </p>
        <p style="color: #64748b; font-size: 14px;">
          Click the link below to accept your invitation and activate your account:
        </p>
        <div style="margin: 28px 0;">
          <a href="${inviteUrl}" style="background-color: #4f46e5; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block;">
            Accept Invitation & Setup Password
          </a>
        </div>
        <p style="color: #94a3b8; font-size: 12px;">
          This invitation link expires in 7 days. If you did not expect this invitation, you can safely ignore this email.
        </p>
      </div>
    `;

    await queueEmail({
      to: normalizedEmail,
      subject: `Invitation to join ${ngo ? ngo.name : 'NGO Platform'} on NGOcore`,
      html
    });

    await AuditLog.create({
      ngoId,
      userId: invitingUserId,
      action: 'USER_INVITED',
      resource: 'Invitation',
      resourceId: invitation._id,
      details: { email: normalizedEmail, roleName: role.name }
    });

    return {
      _id: invitation._id,
      email: invitation.email,
      roleName: role.name,
      status: invitation.status,
      expiresAt: invitation.expiresAt
    };
  }

  /**
   * List all invitations for an NGO
   */
  async getInvitations(ngoId) {
    return await Invitation.find({ ngoId })
      .populate('roleId', 'name description')
      .populate('invitedBy', 'name email')
      .sort({ createdAt: -1 })
      .lean();
  }

  /**
   * Resend an existing pending invitation
   */
  async resendInvitation(ngoId, invitationId, userId) {
    const invitation = await Invitation.findOne({ _id: invitationId, ngoId }).populate('roleId', 'name');
    if (!invitation) {
      throw new AppError(404, 'Invitation not found');
    }

    if (invitation.status !== 'pending') {
      throw new AppError(400, `Cannot resend an invitation with status "${invitation.status}"`);
    }

    invitation.token = crypto.randomBytes(32).toString('hex');
    invitation.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await invitation.save();

    const ngo = await NGO.findById(ngoId);
    const inviteUrl = `${env.CLIENT_URL}/accept-invitation?token=${invitation.token}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px;">
        <h2 style="color: #4f46e5;">Invitation Reminder</h2>
        <p style="color: #475569; font-size: 15px;">
          Reminder: You have been invited to join <strong>${ngo ? ngo.name : 'the organization'}</strong> as <strong>${invitation.roleId?.name || 'Team Member'}</strong>.
        </p>
        <div style="margin: 28px 0;">
          <a href="${inviteUrl}" style="background-color: #4f46e5; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block;">
            Accept Invitation
          </a>
        </div>
        <p style="color: #94a3b8; font-size: 12px;">This link will expire in 7 days.</p>
      </div>
    `;

    await queueEmail({
      to: invitation.email,
      subject: `Reminder: Invitation to join ${ngo ? ngo.name : 'NGO Platform'}`,
      html
    });

    await AuditLog.create({
      ngoId,
      userId,
      action: 'INVITATION_RESENT',
      resource: 'Invitation',
      resourceId: invitation._id,
      details: { email: invitation.email }
    });

    return {
      message: 'Invitation resent successfully',
      expiresAt: invitation.expiresAt
    };
  }

  /**
   * Revoke a pending invitation
   */
  async revokeInvitation(ngoId, invitationId, userId) {
    const invitation = await Invitation.findOne({ _id: invitationId, ngoId });
    if (!invitation) {
      throw new AppError(404, 'Invitation not found');
    }

    if (invitation.status !== 'pending') {
      throw new AppError(400, `Cannot revoke invitation with status "${invitation.status}"`);
    }

    invitation.status = 'revoked';
    await invitation.save();

    await AuditLog.create({
      ngoId,
      userId,
      action: 'INVITATION_REVOKED',
      resource: 'Invitation',
      resourceId: invitation._id,
      details: { email: invitation.email }
    });

    return { message: 'Invitation has been revoked' };
  }

  /**
   * Public: Verify invitation token validity
   */
  async verifyInvitation(token) {
    const invitation = await Invitation.findOne({ token, status: 'pending' })
      .populate('ngoId', 'name logoUrl type')
      .populate('roleId', 'name description permissions');

    if (!invitation) {
      throw new AppError(400, 'Invalid or expired invitation link');
    }

    if (new Date() > invitation.expiresAt) {
      throw new AppError(400, 'This invitation has expired. Please ask your administrator to resend it.');
    }

    return {
      email: invitation.email,
      ngo: {
        _id: invitation.ngoId._id,
        name: invitation.ngoId.name,
        logoUrl: invitation.ngoId.logoUrl,
        type: invitation.ngoId.type
      },
      role: {
        _id: invitation.roleId._id,
        name: invitation.roleId.name,
        description: invitation.roleId.description
      }
    };
  }

  /**
   * Public: Accept invitation and setup user password
   */
  async acceptInvitation({ token, name, password }, meta = {}) {
    const invitation = await Invitation.findOne({ token, status: 'pending' })
      .populate('ngoId')
      .populate('roleId');

    if (!invitation) {
      throw new AppError(400, 'Invalid or expired invitation link');
    }

    if (new Date() > invitation.expiresAt) {
      throw new AppError(400, 'This invitation has expired. Please ask your administrator to resend it.');
    }

    // Check duplicate email
    const existing = await User.findOne({ email: invitation.email });
    if (existing) {
      throw new AppError(400, 'An account with this email address already exists');
    }

    // Hash password with Argon2
    const hashedPassword = await argon2.hash(password);

    // Create user in active status
    const user = await User.create({
      ngoId: invitation.ngoId._id,
      roleId: invitation.roleId._id,
      name,
      email: invitation.email,
      password: hashedPassword,
      status: 'active'
    });

    // Mark invitation accepted
    invitation.status = 'accepted';
    await invitation.save();

    // Create active session
    const { accessToken, refreshToken } = generateTokens(user);

    await Session.create({
      userId: user._id,
      refreshToken,
      deviceInfo: meta.userAgent || 'Unknown',
      ip: meta.ip || '127.0.0.1',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });

    await AuditLog.create({
      ngoId: user.ngoId,
      userId: user._id,
      action: 'INVITATION_ACCEPTED',
      resource: 'User',
      resourceId: user._id,
      ip: meta.ip,
      userAgent: meta.userAgent,
      details: { email: user.email, role: invitation.roleId.name }
    });

    // Notify newly joined user
    await createNotification({
      ngoId: user.ngoId,
      userId: user._id,
      title: 'Welcome to the Organization Vault',
      message: `Your account has been activated with role "${invitation.roleId.name}".`,
      type: 'invitation',
      link: '/profile'
    });

    // Notify the inviter if available
    if (invitation.invitedBy) {
      await createNotification({
        ngoId: user.ngoId,
        userId: invitation.invitedBy,
        title: 'Team Member Joined',
        message: `${user.name} (${user.email}) has accepted the invitation and joined as "${invitation.roleId.name}".`,
        type: 'invitation',
        link: '/users'
      });
    }

    return {
      accessToken,
      refreshToken,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        ngoId: user.ngoId,
        role: invitation.roleId.name,
        permissions: invitation.roleId.permissions || []
      }
    };
  }
}

module.exports = new InvitationsService();

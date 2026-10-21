const argon2 = require('argon2');
const speakeasy = require('speakeasy');
const jwt = require('jsonwebtoken');
const { PlatformAdmin } = require('./model');
const { AuditLog } = require('../audit/model');
const { AppError } = require('../../utils/errors');
const env = require('../../config/env');
const { generatePlatformAdminTokens } = require('../../utils/tokens');

const login = async ({ email, password }) => {
  const admin = await PlatformAdmin.findOne({ email });
  if (!admin) {
    throw new AppError(401, 'Invalid platform admin credentials');
  }

  const isPasswordValid = await argon2.verify(admin.password, password);
  if (!isPasswordValid) {
    throw new AppError(401, 'Invalid platform admin credentials');
  }

  // Two-Factor Authentication is required for all Platform Admins
  const tempToken = jwt.sign(
    {
      adminId: admin._id,
      email: admin.email,
      type: '2fa_pending'
    },
    env.JWT_ACCESS_SECRET,
    { expiresIn: '5m' }
  );

  return {
    requires2FA: true,
    tempToken,
    message: '2FA authentication required. Please submit your 6-digit TOTP code.'
  };
};

const verify2FA = async ({ tempToken, totpCode }, ip, userAgent) => {
  let decoded;
  try {
    decoded = jwt.verify(tempToken, env.JWT_ACCESS_SECRET);
  } catch (error) {
    throw new AppError(401, '2FA session expired or invalid. Please log in again.');
  }

  if (decoded.type !== '2fa_pending' || !decoded.adminId) {
    throw new AppError(400, 'Invalid 2FA verification token');
  }

  const admin = await PlatformAdmin.findById(decoded.adminId);
  if (!admin) {
    throw new AppError(404, 'Platform admin account not found');
  }

  const isTotpValid = speakeasy.totp.verify({
    secret: admin.twoFactorSecret,
    encoding: 'base32',
    token: totpCode,
    window: 1 // allows 30s clock drift
  });

  if (!isTotpValid) {
    throw new AppError(400, 'Invalid two-factor authentication code');
  }

  const tokens = generatePlatformAdminTokens(admin);

  // Append-only audit log entry
  await AuditLog.create({
    userId: admin._id,
    action: 'PLATFORM_ADMIN_LOGIN',
    resource: 'PlatformAdmin',
    resourceId: admin._id,
    ip,
    userAgent,
    details: { email: admin.email, method: '2FA_TOTP' }
  });

  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    admin: {
      id: admin._id,
      name: admin.name,
      email: admin.email,
      role: 'platform_admin'
    }
  };
};

const { NGO } = require('../ngo/model');
const { User } = require('../users/model');
const { File } = require('../files/model');
const { sendNgoStatusNotificationEmail } = require('./email.service');
const { notifyUsers } = require('../notifications/notifications.service');

const getProfile = async (adminId) => {
  const admin = await PlatformAdmin.findById(adminId).select('-password -twoFactorSecret');
  if (!admin) {
    throw new AppError(404, 'Platform admin account not found');
  }
  return admin;
};

const getNgos = async ({ status, search, page = 1, limit = 10 }) => {
  const query = {};

  if (status && status !== 'all') {
    query.status = status;
  }

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { contactEmail: { $regex: search, $options: 'i' } },
      { registrationNumber: { $regex: search, $options: 'i' } }
    ];
  }

  const skip = (page - 1) * limit;

  const [ngos, total] = await Promise.all([
    NGO.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    NGO.countDocuments(query)
  ]);

  // Enrich with admin user and document count
  const ngoIds = ngos.map(n => n._id);
  const [admins, fileCounts] = await Promise.all([
    User.find({ ngoId: { $in: ngoIds } }).select('name email phone status ngoId').lean(),
    File.aggregate([
      { $match: { ngoId: { $in: ngoIds } } },
      { $group: { _id: '$ngoId', count: { $sum: 1 } } }
    ])
  ]);

  const fileCountMap = fileCounts.reduce((acc, curr) => {
    acc[curr._id.toString()] = curr.count;
    return acc;
  }, {});

  const adminMap = admins.reduce((acc, curr) => {
    acc[curr.ngoId.toString()] = curr;
    return acc;
  }, {});

  const enrichedNgos = ngos.map(ngo => ({
    ...ngo,
    adminUser: adminMap[ngo._id.toString()] || null,
    documentCount: fileCountMap[ngo._id.toString()] || 0
  }));

  return {
    ngos: enrichedNgos,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  };
};

const getNgoById = async (ngoId) => {
  const ngo = await NGO.findById(ngoId).lean();
  if (!ngo) {
    throw new AppError(404, 'NGO not found');
  }

  const [adminUser, documents] = await Promise.all([
    User.findOne({ ngoId: ngo._id }).select('-password').lean(),
    File.find({ ngoId: ngo._id }).lean()
  ]);

  return {
    ...ngo,
    adminUser,
    documents
  };
};

const updateNgoStatus = async ({ ngoId, status, reason, adminId, ip, userAgent }) => {
  const ngo = await NGO.findById(ngoId);
  if (!ngo) {
    throw new AppError(404, 'NGO not found');
  }

  const oldStatus = ngo.status;

  if (oldStatus === status) {
    throw new AppError(400, `NGO is already in "${status}" state`);
  }

  ngo.status = status;
  ngo.statusReason = reason || null;
  ngo.reviewedBy = adminId;
  ngo.reviewedAt = new Date();

  await ngo.save();

  // If NGO is suspended, also suspend all user accounts under this NGO
  if (status === 'suspended') {
    await User.updateMany({ ngoId: ngo._id }, { status: 'suspended' });
  } else if (oldStatus === 'suspended' && status === 'approved') {
    // If reactivated from suspended, reactivate users
    await User.updateMany({ ngoId: ngo._id, status: 'suspended' }, { status: 'active' });
  }

  // Create append-only audit log entry
  await AuditLog.create({
    ngoId: ngo._id,
    userId: adminId,
    action: 'NGO_STATUS_UPDATED',
    resource: 'NGO',
    resourceId: ngo._id,
    ip,
    userAgent,
    details: {
      oldStatus,
      newStatus: status,
      reason: reason || 'N/A'
    }
  });

  // Asynchronously dispatch transactional email via Agenda queue
  await sendNgoStatusNotificationEmail({
    to: ngo.contactEmail,
    ngoName: ngo.name,
    status,
    reason
  });

  // Dispatch in-app notification to all users belonging to this NGO
  try {
    const ngoUsers = await User.find({ ngoId: ngo._id }).select('_id');
    if (ngoUsers.length > 0) {
      const userIds = ngoUsers.map(u => u._id);
      let notifTitle = 'Organization Status Updated';
      let notifType = 'info';
      let notifMsg = `Your organization status has been changed to ${status.toUpperCase()}.`;

      if (status === 'approved') {
        notifTitle = 'Organization Approved & Verified!';
        notifType = 'approval';
        notifMsg = 'Congratulations! Your organization verification documents have been approved by platform administration.';
      } else if (status === 'rejected') {
        notifTitle = 'Organization Verification Rejected';
        notifType = 'warning';
        notifMsg = `Your organization application was rejected: ${reason || 'Compliance requirements not met.'}`;
      } else if (status === 're-upload-required') {
        notifTitle = 'Action Required: Re-upload Verification Documents';
        notifType = 'warning';
        notifMsg = `Please re-upload requested verification documents: ${reason || 'Additional compliance documents needed.'}`;
      } else if (status === 'suspended') {
        notifTitle = 'Organization Account Suspended';
        notifType = 'security';
        notifMsg = `Your organization vault has been administratively suspended: ${reason || 'Administrative policy review.'}`;
      }

      await notifyUsers({
        userIds,
        ngoId: ngo._id,
        title: notifTitle,
        message: notifMsg,
        type: notifType,
        link: status === 'approved' ? '/dashboard' : '/onboarding'
      });
    }
  } catch (err) {
    console.error('Failed to dispatch in-app status notification:', err);
  }

  return {
    id: ngo._id,
    name: ngo.name,
    status: ngo.status,
    statusReason: ngo.statusReason,
    reviewedAt: ngo.reviewedAt
  };
};

module.exports = {
  login,
  verify2FA,
  getProfile,
  getNgos,
  getNgoById,
  updateNgoStatus
};

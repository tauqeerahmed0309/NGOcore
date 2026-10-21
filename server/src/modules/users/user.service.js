const argon2 = require('argon2');
const { User } = require('./model');
const { Role } = require('../ngo/model');
const { Session } = require('../auth/model');
const { AuditLog } = require('../audit/model');
const { AppError } = require('../../utils/errors');
const { createNotification } = require('../notifications/notifications.service');

const getProfile = async (userId) => {
  const user = await User.findById(userId)
    .select('-password')
    .populate('roleId', 'name description permissions isSystem')
    .populate('ngoId', 'name status type registrationNumber logoUrl email phone address');

  if (!user) {
    throw new AppError(404, 'User profile not found');
  }

  return user;
};

const changePassword = async ({ userId, currentPassword, newPassword, currentRefreshToken, ip, userAgent }) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError(404, 'User account not found');
  }

  const isCurrentValid = await argon2.verify(user.password, currentPassword);
  if (!isCurrentValid) {
    throw new AppError(400, 'Current password is incorrect');
  }

  // Hash new password securely with argon2
  user.password = await argon2.hash(newPassword);
  await user.save();

  // Invalidate all active sessions for this user EXCEPT the current session
  if (currentRefreshToken) {
    await Session.deleteMany({
      userId: user._id,
      refreshToken: { $ne: currentRefreshToken }
    });
  } else {
    await Session.deleteMany({ userId: user._id });
  }

  // Record audit log
  await AuditLog.create({
    ngoId: user.ngoId,
    userId: user._id,
    action: 'PASSWORD_CHANGED',
    resource: 'User',
    resourceId: user._id,
    ip,
    userAgent,
    details: { email: user.email }
  });

  // Dispatch in-app security notification
  await createNotification({
    ngoId: user.ngoId,
    userId: user._id,
    title: 'Password Changed Successfully',
    message: 'Your account password was updated. All other active device sessions have been terminated.',
    type: 'security',
    link: '/profile'
  });

  return {
    message: 'Password changed successfully. All other active sessions have been terminated.'
  };
};

const updateProfile = async ({ userId, updateData = {}, avatarFile, ip, userAgent }) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError(404, 'User account not found');
  }

  if (avatarFile) {
    user.avatarUrl = avatarFile.secure_url || avatarFile.url || (avatarFile.filename ? `/uploads/${avatarFile.filename}` : avatarFile.path);
  } else if (updateData.avatarUrl !== undefined) {
    user.avatarUrl = updateData.avatarUrl;
  }

  if (updateData.name) {
    user.name = updateData.name;
  }

  if (updateData.phone !== undefined) {
    user.phone = updateData.phone;
  }

  if (updateData.designation !== undefined) {
    user.designation = updateData.designation;
  }

  await user.save();

  // Record audit log
  await AuditLog.create({
    ngoId: user.ngoId,
    userId: user._id,
    action: 'PROFILE_UPDATED',
    resource: 'User',
    resourceId: user._id,
    ip,
    userAgent,
    details: {
      updatedFields: Object.keys(updateData),
      hasAvatar: !!(avatarFile || updateData.avatarUrl)
    }
  });

  const updatedProfile = await User.findById(userId)
    .select('-password')
    .populate('roleId', 'name description permissions isSystem')
    .populate('ngoId', 'name status type registrationNumber logoUrl email phone address');

  return updatedProfile;
};

/**
 * List all users belonging to an NGO
 */
const getNgoUsers = async (ngoId, { page = 1, limit = 20, search, status, roleId } = {}) => {
  const query = { ngoId };

  if (status) {
    query.status = status;
  }

  if (roleId) {
    query.roleId = roleId;
  }

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
  }

  const skip = (Math.max(1, page) - 1) * limit;

  const [users, total] = await Promise.all([
    User.find(query)
      .select('-password')
      .populate('roleId', 'name isSystem permissions')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    User.countDocuments(query)
  ]);

  return {
    users,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit)
    }
  };
};

/**
 * Activate or deactivate an NGO team member
 */
const changeUserStatus = async (ngoId, targetUserId, newStatus, actingUserId, meta = {}) => {
  if (targetUserId.toString() === actingUserId.toString()) {
    throw new AppError(400, 'You cannot change your own account status');
  }

  const validStatuses = ['active', 'inactive', 'suspended'];
  if (!validStatuses.includes(newStatus)) {
    throw new AppError(400, `Invalid status. Must be one of: ${validStatuses.join(', ')}`);
  }

  const user = await User.findOne({ _id: targetUserId, ngoId });
  if (!user) {
    throw new AppError(404, 'User not found in your organization');
  }

  user.status = newStatus;
  await user.save();

  // If deactivated or suspended, kill all active sessions immediately
  if (newStatus !== 'active') {
    await Session.deleteMany({ userId: user._id });
  }

  await AuditLog.create({
    ngoId,
    userId: actingUserId,
    action: 'USER_STATUS_CHANGED',
    resource: 'User',
    resourceId: user._id,
    ip: meta.ip,
    userAgent: meta.userAgent,
    details: {
      targetEmail: user.email,
      newStatus
    }
  });

  return {
    message: `User status successfully updated to ${newStatus}`,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      status: user.status
    }
  };
};

/**
 * Reassign an NGO user's role
 */
const changeUserRole = async (ngoId, targetUserId, newRoleId, actingUserId, meta = {}) => {
  if (targetUserId.toString() === actingUserId.toString()) {
    throw new AppError(400, 'You cannot change your own role to prevent accidental privilege lock-out');
  }

  const role = await Role.findOne({ _id: newRoleId, ngoId });
  if (!role) {
    throw new AppError(400, 'Invalid role selected for your organization');
  }

  const user = await User.findOne({ _id: targetUserId, ngoId });
  if (!user) {
    throw new AppError(404, 'User not found in your organization');
  }

  user.roleId = role._id;
  await user.save();

  await AuditLog.create({
    ngoId,
    userId: actingUserId,
    action: 'USER_ROLE_CHANGED',
    resource: 'User',
    resourceId: user._id,
    ip: meta.ip,
    userAgent: meta.userAgent,
    details: {
      targetEmail: user.email,
      newRoleName: role.name
    }
  });

  return await User.findById(user._id)
    .select('-password')
    .populate('roleId', 'name permissions');
};

/**
 * List all active sessions for a user
 */
const getUserSessions = async (userId, currentRefreshToken) => {
  const sessions = await Session.find({
    userId,
    expiresAt: { $gt: new Date() }
  })
    .sort({ createdAt: -1 })
    .lean();

  return sessions.map(session => ({
    _id: session._id,
    deviceInfo: session.deviceInfo || 'Unknown Device',
    ip: session.ip || 'Unknown IP',
    expiresAt: session.expiresAt,
    createdAt: session.createdAt,
    isCurrent: !!(currentRefreshToken && session.refreshToken === currentRefreshToken)
  }));
};

/**
 * Revoke a specific active session
 */
const revokeSession = async (userId, sessionId, ip, userAgent) => {
  const session = await Session.findOne({ _id: sessionId, userId });
  if (!session) {
    throw new AppError(404, 'Active session not found or already terminated');
  }

  await Session.deleteOne({ _id: session._id });

  const user = await User.findById(userId);
  if (user) {
    await AuditLog.create({
      ngoId: user.ngoId,
      userId: user._id,
      action: 'SESSION_REVOKED',
      resource: 'Session',
      resourceId: session._id,
      ip,
      userAgent,
      details: {
        revokedSessionId: session._id,
        deviceInfo: session.deviceInfo,
        ip: session.ip
      }
    });

    await createNotification({
      ngoId: user.ngoId,
      userId: user._id,
      title: 'Active Session Terminated',
      message: `A login session (${session.deviceInfo || 'Unknown Device'}) was terminated.`,
      type: 'security',
      link: '/profile'
    });
  }

  return { message: 'Session terminated successfully' };
};

/**
 * Revoke all other active sessions except the current session
 */
const revokeAllOtherSessions = async (userId, currentRefreshToken, ip, userAgent) => {
  let filter = { userId };
  if (currentRefreshToken) {
    filter.refreshToken = { $ne: currentRefreshToken };
  }

  const result = await Session.deleteMany(filter);

  const user = await User.findById(userId);
  if (user) {
    await AuditLog.create({
      ngoId: user.ngoId,
      userId: user._id,
      action: 'ALL_OTHER_SESSIONS_REVOKED',
      resource: 'Session',
      resourceId: user._id,
      ip,
      userAgent,
      details: {
        revokedCount: result.deletedCount
      }
    });

    await createNotification({
      ngoId: user.ngoId,
      userId: user._id,
      title: 'All Other Sessions Terminated',
      message: `${result.deletedCount} active device session(s) were terminated.`,
      type: 'security',
      link: '/profile'
    });
  }

  return {
    message: `All other sessions terminated successfully (${result.deletedCount} session${result.deletedCount === 1 ? '' : 's'} closed).`,
    revokedCount: result.deletedCount
  };
};

module.exports = {
  getProfile,
  changePassword,
  updateProfile,
  getNgoUsers,
  changeUserStatus,
  changeUserRole,
  getUserSessions,
  revokeSession,
  revokeAllOtherSessions
};


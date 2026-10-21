const argon2 = require('argon2');
const crypto = require('crypto');
const { AppError } = require('../../utils/errors');
const { NGO, Role } = require('../ngo/model');
const { User } = require('../users/model');
const { EmailVerification, Session, PasswordReset } = require('./model');
const { AuditLog } = require('../audit/model');
const { sendOtpEmail, sendPasswordResetEmail } = require('./email.service');
const { generateTokens } = require('../../utils/tokens');
const env = require('../../config/env');

const signup = async ({ name, email, phone, password }) => {
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) throw new AppError(400, 'Email is already registered');

    const hashedPassword = await argon2.hash(password);

    const newNgo = await NGO.create({
      name: name + "'s NGO", 
      contactEmail: email,
      status: 'unverified'
    });

    const adminRole = await Role.create({
      ngoId: newNgo._id,
      name: 'NGO Admin',
      description: 'Full administrative access',
      permissions: ['*'],
      isSystem: true
    });

    const newUser = await User.create({
      ngoId: newNgo._id,
      name,
      email,
      phone,
      password: hashedPassword,
      status: 'unverified',
      roleId: adminRole._id
    });

    await AuditLog.create({
      ngoId: newNgo._id,
      userId: newUser._id,
      action: 'SIGNUP',
      resource: 'User',
      resourceId: newUser._id,
      details: { email }
    });

    // Automatically trigger OTP sending
    await requestOtp(email);

    return {
      userId: newUser._id,
      ngoId: newNgo._id,
      email: newUser.email,
      status: newUser.status
    };
  } catch (error) {
    throw error;
  }
};

const requestOtp = async (email) => {
  const user = await User.findOne({ email });
  if (!user) throw new AppError(404, 'User not found');

  // Cooldown check (1 minute)
  const existingOtp = await EmailVerification.findOne({ email });
  if (existingOtp && Date.now() - existingOtp.updatedAt.getTime() < 60000) {
    throw new AppError(429, 'Please wait 1 minute before requesting another OTP');
  }

  const otp = crypto.randomInt(100000, 999999).toString();
  const expiresAt = new Date(Date.now() + 15 * 60000); // 15 mins

  await EmailVerification.findOneAndUpdate(
    { email },
    { otp, expiresAt, attempts: 0 },
    { upsert: true, new: true }
  );

  await sendOtpEmail(email, otp);
  return { message: 'OTP sent successfully' };
};

const verifyOtp = async (email, otp) => {
  const verification = await EmailVerification.findOne({ email });
  if (!verification) throw new AppError(400, 'No pending verification for this email');

  if (verification.expiresAt < new Date()) {
    throw new AppError(400, 'OTP has expired. Please request a new one.');
  }

  if (verification.attempts >= 5) {
    throw new AppError(429, 'Too many failed attempts. Please request a new OTP.');
  }

  if (verification.otp !== otp) {
    verification.attempts += 1;
    await verification.save();
    throw new AppError(400, 'Invalid OTP');
  }

  // OTP matches
  await EmailVerification.deleteOne({ _id: verification._id });

  const user = await User.findOne({ email });
  user.status = 'active';
  await user.save();

  const tokens = generateTokens(user);
  return tokens;
};

const login = async ({ email, password, rememberMe = false }, ip, userAgent) => {
  const user = await User.findOne({ email }).populate('roleId');
  if (!user) {
    throw new AppError(401, 'Invalid email or password');
  }

  const isPasswordValid = await argon2.verify(user.password, password);
  if (!isPasswordValid) {
    await AuditLog.create({
      ngoId: user.ngoId,
      userId: user._id,
      action: 'LOGIN_FAILED',
      resource: 'User',
      resourceId: user._id,
      ip,
      userAgent,
      details: { email }
    });
    throw new AppError(401, 'Invalid email or password');
  }

  // Check User Status
  if (user.status === 'unverified') {
    throw new AppError(403, 'Your email has not been verified yet. Please verify your email before logging in.', [
      { code: 'UNVERIFIED_EMAIL', email: user.email }
    ]);
  }

  if (user.status === 'suspended') {
    throw new AppError(403, 'Your account has been suspended. Please contact platform administration.');
  }

  // Check NGO Status
  const ngo = await NGO.findById(user.ngoId);
  if (!ngo) {
    throw new AppError(404, 'Associated NGO not found');
  }

  if (ngo.status === 'rejected') {
    throw new AppError(403, `Organization application was rejected: ${ngo.statusReason || 'Compliance requirements not met.'}`);
  }

  if (ngo.status === 'suspended') {
    throw new AppError(403, `Organization account has been suspended: ${ngo.statusReason || 'Administrative suspension.'}`);
  }

  // Status-aware redirects
  let redirect = '/dashboard';
  let statusNotice = null;

  if (ngo.status === 'unverified') {
    redirect = '/onboarding';
    statusNotice = 'Please complete your organization onboarding details.';
  } else if (ngo.status === 'pending') {
    redirect = '/pending-approval';
    statusNotice = 'Your organization verification is currently under review by platform administrators.';
  } else if (ngo.status === 're-upload-required') {
    redirect = '/onboarding';
    statusNotice = `Additional documents required: ${ngo.statusReason || 'Please re-upload requested verification files.'}`;
  }

  // Determine session expiry (30 days for rememberMe, 7 days default)
  const sessionDays = rememberMe ? 30 : 7;
  const expiresAt = new Date(Date.now() + sessionDays * 24 * 60 * 60 * 1000);

  // Generate rotating random refresh token
  const refreshToken = crypto.randomBytes(32).toString('hex');

  // Store Session in DB
  await Session.create({
    userId: user._id,
    refreshToken,
    deviceInfo: userAgent || 'Unknown Device',
    ip: ip || 'Unknown IP',
    expiresAt
  });

  const tokens = generateTokens(user);

  // Write audit log
  await AuditLog.create({
    ngoId: user.ngoId,
    userId: user._id,
    action: 'LOGIN',
    resource: 'User',
    resourceId: user._id,
    ip,
    userAgent,
    details: { rememberMe, status: ngo.status }
  });

  return {
    accessToken: tokens.accessToken,
    refreshToken,
    expiresAt,
    redirect,
    statusNotice,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      designation: user.designation,
      avatarUrl: user.avatarUrl,
      role: user.roleId?.name || 'NGO User',
      permissions: user.roleId?.permissions || [],
      ngoId: ngo._id,
      ngoName: ngo.name,
      ngoStatus: ngo.status
    }
  };
};

const rotateRefreshToken = async (oldRefreshToken, ip, userAgent) => {
  if (!oldRefreshToken) {
    throw new AppError(401, 'Refresh token required');
  }

  const session = await Session.findOne({ refreshToken: oldRefreshToken });
  if (!session) {
    throw new AppError(401, 'Invalid or expired session. Please log in again.');
  }

  if (session.expiresAt < new Date()) {
    await Session.deleteOne({ _id: session._id });
    throw new AppError(401, 'Session has expired. Please log in again.');
  }

  const user = await User.findById(session.userId).populate('roleId');
  if (!user || user.status === 'suspended') {
    await Session.deleteOne({ _id: session._id });
    throw new AppError(401, 'User account is inactive or suspended');
  }

  // Rotate token: update session with brand new refresh token
  const newRefreshToken = crypto.randomBytes(32).toString('hex');
  session.refreshToken = newRefreshToken;
  session.ip = ip || session.ip;
  session.deviceInfo = userAgent || session.deviceInfo;
  await session.save();

  const tokens = generateTokens(user);

  return {
    accessToken: tokens.accessToken,
    newRefreshToken,
    expiresAt: session.expiresAt
  };
};

const logout = async (refreshToken) => {
  if (refreshToken) {
    await Session.deleteOne({ refreshToken });
  }
  return { message: 'Logged out successfully' };
};

const logoutAll = async (userId) => {
  await Session.deleteMany({ userId });
  return { message: 'Logged out from all devices successfully' };
};

const getActiveSessions = async (userId, currentRefreshToken) => {
  const sessions = await Session.find({
    userId,
    expiresAt: { $gt: new Date() }
  }).sort({ createdAt: -1 });

  return sessions.map(s => ({
    id: s._id,
    ip: s.ip,
    deviceInfo: s.deviceInfo,
    createdAt: s.createdAt,
    expiresAt: s.expiresAt,
    isCurrent: s.refreshToken === currentRefreshToken
  }));
};

const revokeSession = async (userId, sessionId) => {
  const session = await Session.findOneAndDelete({ _id: sessionId, userId });
  if (!session) {
    throw new AppError(404, 'Session not found');
  }
  return { message: 'Session revoked successfully' };
};

const forgotPassword = async ({ email }, ip, userAgent) => {
  const user = await User.findOne({ email });

  if (user) {
    // Invalidate existing reset tokens for this user
    await PasswordReset.deleteMany({ userId: user._id });

    // Generate cryptographic single-use token (valid for 15 minutes)
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await PasswordReset.create({
      userId: user._id,
      token,
      expiresAt
    });

    const resetUrl = `${env.CLIENT_URL}/reset-password?token=${token}`;

    // Queue transactional password reset email
    await sendPasswordResetEmail(user.email, resetUrl);

    // Audit log
    await AuditLog.create({
      ngoId: user.ngoId,
      userId: user._id,
      action: 'PASSWORD_RESET_REQUESTED',
      resource: 'User',
      resourceId: user._id,
      ip,
      userAgent,
      details: { email }
    });
  }

  // Generic response so account existence is not revealed
  return {
    message: 'If an account with that email exists, a password reset link has been sent to it.'
  };
};

const resetPassword = async ({ token, password }, ip, userAgent) => {
  const resetDoc = await PasswordReset.findOne({ token });
  if (!resetDoc) {
    throw new AppError(400, 'Invalid or expired password reset link. Please request a new one.');
  }

  if (resetDoc.expiresAt < new Date()) {
    await PasswordReset.deleteOne({ _id: resetDoc._id });
    throw new AppError(400, 'Password reset link has expired. Please request a new one.');
  }

  const user = await User.findById(resetDoc.userId);
  if (!user) {
    await PasswordReset.deleteOne({ _id: resetDoc._id });
    throw new AppError(404, 'Associated user account not found');
  }

  // Hash new password securely with argon2
  user.password = await argon2.hash(password);
  await user.save();

  // Invalidate the single-use reset token
  await PasswordReset.deleteOne({ _id: resetDoc._id });

  // Invalidate all active sessions across all devices
  await Session.deleteMany({ userId: user._id });

  // Audit log
  await AuditLog.create({
    ngoId: user.ngoId,
    userId: user._id,
    action: 'PASSWORD_RESET_COMPLETED',
    resource: 'User',
    resourceId: user._id,
    ip,
    userAgent,
    details: { email: user.email }
  });

  return {
    message: 'Password has been reset successfully. All previous sessions have been invalidated. Please log in with your new password.'
  };
};

module.exports = {
  signup,
  requestOtp,
  verifyOtp,
  login,
  rotateRefreshToken,
  logout,
  logoutAll,
  getActiveSessions,
  revokeSession,
  forgotPassword,
  resetPassword
};

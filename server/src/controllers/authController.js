const User = require('../models/User');
const Ngo = require('../models/Ngo');
const Student = require('../models/Student');
const Session = require('../models/Session');
const mongoose = require('mongoose');
const { OAuth2Client } = require('google-auth-library');
const { comparePassword, hashPassword } = require('../utils/passwordHelper');
const { signToken, verifyToken } = require('../utils/jwtHelper');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const logger = require('../utils/logger');
const config = require('../config/env');
const {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  readCookie,
  setAuthCookies,
  clearAuthCookies
} = require('../utils/authCookies');
const { writeAuditLog } = require('../services/auditService');
const crypto = require('crypto');
const googleClient = new OAuth2Client();
const refreshTokenLifetimeMs = Number.parseInt(config.JWT_REFRESH_EXPIRES_IN, 10) * 24 * 60 * 60 * 1000;
const hashRefreshToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const userPayload = (user) => ({
  id: user._id,
  email: user.email,
  firstName: user.firstName,
  lastName: user.lastName,
  role: user.role,
  avatar: user.avatar || ''
});

const issueTokens = (user, sessionId) => ({
  accessToken: signToken({
    id: user._id,
    sid: String(sessionId),
    role: user.role,
    email: user.email,
    sessionVersion: user.sessionVersion || 0,
    tokenType: 'access'
  }),
  refreshToken: signToken({
    id: user._id,
    sid: String(sessionId),
    sessionVersion: user.sessionVersion || 0,
    tokenType: 'refresh'
  }, config.JWT_REFRESH_EXPIRES_IN)
});

const recordFailedLogin = async (req, email, actor = null) => {
  await writeAuditLog({
    req,
    actor,
    action: 'login_failed',
    entityType: 'auth',
    metadata: { email }
  });
};

const completeLogin = async (req, res, user) => {
  if (!user.isActive) {
    await recordFailedLogin(req, user.email, user);
    return errorResponse(res, 401, 'Account has been deactivated. Please contact an administrator.');
  }
  if (user.isPasswordSetupRequired) {
    return errorResponse(res, 403, 'Set your password using the invitation sent to your email before signing in.');
  }
  if (!user.isEmailVerified) {
    await recordFailedLogin(req, user.email, user);
    return errorResponse(res, 403, 'Please verify your email address before signing in. Check your inbox for the verification code.');
  }

  const ngo = await Ngo.findById(user.ngoId);
  if (!ngo) {
    await recordFailedLogin(req, user.email, user);
    return errorResponse(res, 403, 'Your organization is not configured. Contact the platform administrator.');
  }
  if (ngo.status !== 'approved') {
    await recordFailedLogin(req, user.email, user);
    const statusMessage = ngo.status === 'pending'
      ? 'Your organization is pending approval. You will be able to sign in after approval.'
      : `Your organization is ${ngo.status}. Contact the platform administrator.`;
    return errorResponse(res, 403, statusMessage);
  }

  user.lastLogin = new Date();
  await user.save();

  const sessionId = new mongoose.Types.ObjectId();
  const { accessToken, refreshToken } = issueTokens(user, sessionId);
  await Session.create({
    _id: sessionId,
    userId: user._id,
    refreshTokenHash: hashRefreshToken(refreshToken),
    expiresAt: new Date(Date.now() + refreshTokenLifetimeMs)
  });
  await writeAuditLog({
    req,
    actor: user,
    action: 'login',
    entityType: 'auth'
  });
  setAuthCookies(res, accessToken, refreshToken);
  logger.info(`User logged in successfully: ${user.email} [${user.role}]`);

  return successResponse(res, 200, 'Login successful', {
    user: userPayload(user)
  });
};

const completeStudentPasswordSetup = async (req, res, next) => {
  try {
    const tokenHash = crypto.createHash('sha256').update(req.body.token).digest('hex');
    const user = await User.findOne({
      passwordSetupTokenHash: tokenHash,
      passwordSetupExpiresAt: { $gt: new Date() },
      isPasswordSetupRequired: true,
      isActive: true
    }).select('+passwordSetupTokenHash +passwordSetupExpiresAt');
    if (!user) {
      return errorResponse(res, 400, 'This setup link is invalid or has expired. Ask your NGO administrator to resend the invitation.');
    }

    user.password = await hashPassword(req.body.password);
    user.isPasswordSetupRequired = false;
    user.passwordSetupTokenHash = null;
    user.passwordSetupExpiresAt = null;
    user.isEmailVerified = true;
    user.emailVerifiedAt = new Date();
    user.sessionVersion = (user.sessionVersion || 0) + 1;
    await user.save();

    await writeAuditLog({
      req,
      actor: user,
      action: 'update',
      entityType: 'user',
      entityId: user._id,
      metadata: { event: 'student_account_setup' }
    });
    return successResponse(res, 200, 'Password set successfully. You can now sign in to the student portal.');
  } catch (error) {
    return next(error);
  }
};

/**
 * @desc    Authenticate user and issue httpOnly session cookies
 * @route   POST /api/v1/auth/login
 * @access  Public
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Search user with password field explicitly included
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      await recordFailedLogin(req, email);
      return errorResponse(res, 401, 'Invalid email or password');
    }

    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
      await recordFailedLogin(req, email, user);
      return errorResponse(res, 401, 'Invalid email or password');
    }
    return await completeLogin(req, res, user);
  } catch (error) {
    next(error);
  }
};

const studentLogin = async (req, res, next) => {
  try {
    const student = await Student.findById(req.body.studentId).select('userId');
    if (!student?.userId) {
      await recordFailedLogin(req, req.body.studentId);
      return errorResponse(res, 401, 'Invalid student ID or password.');
    }

    const user = await User.findOne({ _id: student.userId, role: 'student' }).select('+password');
    if (!user) {
      await recordFailedLogin(req, req.body.studentId);
      return errorResponse(res, 401, 'Invalid student ID or password.');
    }
    const isMatch = await comparePassword(req.body.password, user.password);
    if (!isMatch) {
      await recordFailedLogin(req, user.email, user);
      return errorResponse(res, 401, 'Invalid student ID or password.');
    }
    return await completeLogin(req, res, user);
  } catch (error) {
    return next(error);
  }
};

const googleLogin = async (req, res, next) => {
  try {
    if (!config.GOOGLE_CLIENT_ID) {
      return errorResponse(res, 503, 'Google sign-in is not configured. Contact the platform administrator.');
    }

    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: req.body.credential,
        audience: config.GOOGLE_CLIENT_ID
      });
      payload = ticket.getPayload();
    } catch (error) {
      logger.warn(`Google sign-in token verification failed: ${error.message}`);
      return errorResponse(res, 401, 'Google sign-in could not be verified. Please try again.');
    }

    // Verify token issuer
    const validIssuers = ['accounts.google.com', 'https://accounts.google.com'];
    if (!payload?.iss || !validIssuers.includes(payload.iss)) {
      logger.warn(`Google sign-in token issuer invalid: ${payload?.iss}`);
      return errorResponse(res, 401, 'Google sign-in token issuer is invalid.');
    }

    // Verify token expiration
    if (!payload?.exp || payload.exp * 1000 <= Date.now()) {
      logger.warn(`Google sign-in token expired (exp: ${payload?.exp})`);
      return errorResponse(res, 401, 'Google sign-in token has expired. Please sign in again.');
    }

    // Verify email verification from Google
    if (!payload?.email || payload.email_verified !== true) {
      return errorResponse(res, 401, 'Google must confirm your email address before you can sign in.');
    }

    const email = payload.email.toLowerCase().trim();
    // Allow login only for existing, registered users
    const user = await User.findOne({ email });
    if (!user) {
      logger.warn(`Google sign-in attempted for non-existent user: ${email}`);
      return errorResponse(res, 401, 'No existing verified NGOcore account is linked to this Google email.');
    }

    // Reject deactivated or suspended accounts
    if (user.status === 'suspended' || !user.isActive) {
      await recordFailedLogin(req, email, user);
      return errorResponse(res, 401, 'Account has been deactivated or suspended. Please contact an administrator.');
    }

    // Reject unverified email in NGOcore system
    if (!user.isEmailVerified) {
      await recordFailedLogin(req, email, user);
      return errorResponse(res, 403, 'Please verify your email address before signing in.');
    }

    if (req.body.role && user.role !== req.body.role) {
      return errorResponse(res, 403, 'This Google account does not have access to the requested portal.');
    }

    return await completeLogin(req, res, user);
  } catch (error) {
    return next(error);
  }
};

const refresh = async (req, res, next) => {
  try {
    const refreshToken = readCookie(req, REFRESH_COOKIE);
    if (!refreshToken) {
      clearAuthCookies(res);
      return errorResponse(res, 401, 'Refresh session is missing. Please sign in again.');
    }

    let decoded;
    try {
      decoded = verifyToken(refreshToken);
    } catch {
      clearAuthCookies(res);
      return errorResponse(res, 401, 'Refresh session has expired or is invalid. Please sign in again.');
    }
    if (
      !decoded?.id ||
      !decoded.sid ||
      !mongoose.Types.ObjectId.isValid(decoded.sid) ||
      decoded.tokenType !== 'refresh'
    ) {
      clearAuthCookies(res);
      return errorResponse(res, 401, 'Invalid refresh session. Please sign in again.');
    }

    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) {
      clearAuthCookies(res);
      return errorResponse(res, 401, 'User account is unavailable. Please sign in again.');
    }
    if ((decoded.sessionVersion || 0) !== (user.sessionVersion || 0)) {
      clearAuthCookies(res);
      return errorResponse(res, 401, 'Your password has changed. Please sign in again.');
    }

    if (!user.isEmailVerified) {
      clearAuthCookies(res);
      return errorResponse(res, 403, 'Please verify your email address before signing in.');
    }
    const ngo = await Ngo.findById(user.ngoId).select('status').lean();
    if (!ngo || ngo.status !== 'approved') {
      clearAuthCookies(res);
      const statusMessage = !ngo
        ? 'Your organization is not configured. Contact the platform administrator.'
        : ngo.status === 'pending'
          ? 'Your organization is pending approval. You will be able to sign in after approval.'
          : `Your organization is ${ngo.status}. Contact the platform administrator.`;
      return errorResponse(res, 403, statusMessage);
    }

    const sessionId = decoded.sid;
    const { accessToken, refreshToken: rotatedRefreshToken } = issueTokens(user, sessionId);
    const now = new Date();
    const session = await Session.findOneAndUpdate(
      {
        _id: sessionId,
        userId: user._id,
        refreshTokenHash: hashRefreshToken(refreshToken),
        expiresAt: { $gt: now },
        revokedAt: null
      },
      {
        $set: {
          refreshTokenHash: hashRefreshToken(rotatedRefreshToken),
          expiresAt: new Date(now.getTime() + refreshTokenLifetimeMs),
          lastUsedAt: now
        }
      },
      { returnDocument: 'after' }
    ).select('_id');
    if (!session) {
      await Session.updateOne(
        { _id: sessionId, userId: user._id, revokedAt: null },
        { $set: { revokedAt: now } }
      );
      clearAuthCookies(res);
      return errorResponse(res, 401, 'This refresh session has already been used or revoked. Please sign in again.');
    }

    setAuthCookies(res, accessToken, rotatedRefreshToken);
    return successResponse(res, 200, 'Session refreshed', { user: userPayload(user) });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get current authenticated user profile
 * @route   GET /api/v1/auth/me
 * @access  Protected
 */
const getMe = async (req, res, next) => {
  try {
    const safeUser = {
      id: req.user._id,
      email: req.user.email,
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      role: req.user.role,
      avatar: req.user.avatar || '',
      isActive: req.user.isActive,
      lastLogin: req.user.lastLogin,
      createdAt: req.user.createdAt
    };

    return successResponse(res, 200, 'User profile retrieved successfully', {
      user: safeUser
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Change current user's password
 * @route   POST /api/v1/auth/change-password
 * @access  Protected
 */
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (currentPassword === newPassword) {
      return errorResponse(res, 400, 'New password cannot be identical to the current password');
    }

    // Re-fetch user with password included
    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      return errorResponse(res, 404, 'User not found');
    }

    // Verify current password
    const isCurrentMatch = await comparePassword(currentPassword, user.password);
    if (!isCurrentMatch) {
      return errorResponse(res, 400, 'Current password verification failed. Please enter your correct current password.');
    }

    // Hash new password and save
    user.password = await hashPassword(newPassword);
    await user.save();

    logger.info(`Password successfully changed for user: ${user.email}`);

    return successResponse(res, 200, 'Password changed successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Stateless logout endpoint
 * @route   POST /api/v1/auth/logout
 * @access  Protected / Public
 */
const logout = async (req, res, next) => {
  try {
    const accessToken = readCookie(req, ACCESS_COOKIE);
    let decoded;
    if (accessToken) {
      try {
        decoded = verifyToken(accessToken, { ignoreExpiration: true });
      } catch {
        decoded = null;
      }
    }
    const sessionId = decoded?.tokenType === 'access' && mongoose.Types.ObjectId.isValid(decoded.sid)
      ? decoded.sid
      : null;
    if (sessionId && decoded?.id) {
      await Session.updateOne(
        { _id: sessionId, userId: decoded.id, revokedAt: null },
        { $set: { revokedAt: new Date() } }
      );
    }

    const actor = req.user || (decoded?.id ? await User.findById(decoded.id) : null);
    if (actor) {
      await writeAuditLog({
        req,
        actor,
        action: 'logout',
        entityType: 'auth',
        metadata: { scope: 'current_session' }
      });
    }
    clearAuthCookies(res);
    return successResponse(res, 200, 'Logged out successfully');
  } catch (error) {
    return next(error);
  }
};

const logoutAll = async (req, res, next) => {
  try {
    await User.updateOne({ _id: req.user._id }, { $inc: { sessionVersion: 1 } });
    await Session.updateMany(
      { userId: req.user._id, revokedAt: null },
      { $set: { revokedAt: new Date() } }
    );
    await writeAuditLog({
      req,
      action: 'logout',
      entityType: 'auth',
      metadata: { scope: 'all_devices' }
    });
    clearAuthCookies(res);
    return successResponse(res, 200, 'Signed out from all devices successfully.');
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  login,
  studentLogin,
  googleLogin,
  completeStudentPasswordSetup,
  refresh,
  getMe,
  changePassword,
  logout,
  logoutAll
};

const userService = require('./user.service');
const { sendSuccess } = require('../../utils/response');

const getProfile = async (req, res, next) => {
  try {
    const profile = await userService.getProfile(req.user.userId || req.user._id);
    sendSuccess(res, 200, 'Profile retrieved successfully', profile);
  } catch (error) {
    next(error);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const ip = req.ip || req.headers['x-forwarded-for'];
    const userAgent = req.headers['user-agent'];
    const currentRefreshToken = req.cookies?.refreshToken;

    const result = await userService.changePassword({
      userId: req.user.userId || req.user._id,
      currentPassword: req.body.currentPassword,
      newPassword: req.body.newPassword,
      currentRefreshToken,
      ip,
      userAgent
    });

    sendSuccess(res, 200, result.message);
  } catch (error) {
    next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const ip = req.ip || req.headers['x-forwarded-for'];
    const userAgent = req.headers['user-agent'];
    const avatarFile = req.file;

    const updatedUser = await userService.updateProfile({
      userId: req.user.userId || req.user._id,
      updateData: req.body,
      avatarFile,
      ip,
      userAgent
    });

    sendSuccess(res, 200, 'Profile updated successfully', updatedUser);
  } catch (error) {
    next(error);
  }
};

const getNgoUsers = async (req, res, next) => {
  try {
    const result = await userService.getNgoUsers(req.scopedNgoId, req.query);
    sendSuccess(res, 200, 'Organization users retrieved successfully', result.users, null, {
      pagination: result.pagination
    });
  } catch (error) {
    next(error);
  }
};

const changeUserStatus = async (req, res, next) => {
  try {
    const meta = {
      ip: req.ip,
      userAgent: req.get('user-agent')
    };
    const result = await userService.changeUserStatus(
      req.scopedNgoId,
      req.params.userId,
      req.body.status,
      req.user.userId || req.user._id,
      meta
    );
    sendSuccess(res, 200, result.message, result.user);
  } catch (error) {
    next(error);
  }
};

const changeUserRole = async (req, res, next) => {
  try {
    const meta = {
      ip: req.ip,
      userAgent: req.get('user-agent')
    };
    const updatedUser = await userService.changeUserRole(
      req.scopedNgoId,
      req.params.userId,
      req.body.roleId,
      req.user.userId || req.user._id,
      meta
    );
    sendSuccess(res, 200, 'User role successfully updated', updatedUser);
  } catch (error) {
    next(error);
  }
};

const getUserSessions = async (req, res, next) => {
  try {
    const userId = req.user.userId || req.user._id;
    const currentRefreshToken = req.cookies?.refreshToken;
    const sessions = await userService.getUserSessions(userId, currentRefreshToken);
    sendSuccess(res, 200, 'Active sessions retrieved successfully', sessions);
  } catch (error) {
    next(error);
  }
};

const revokeSession = async (req, res, next) => {
  try {
    const userId = req.user.userId || req.user._id;
    const ip = req.ip || req.headers['x-forwarded-for'];
    const userAgent = req.headers['user-agent'];
    const result = await userService.revokeSession(userId, req.params.sessionId, ip, userAgent);
    sendSuccess(res, 200, result.message);
  } catch (error) {
    next(error);
  }
};

const revokeAllOtherSessions = async (req, res, next) => {
  try {
    const userId = req.user.userId || req.user._id;
    const currentRefreshToken = req.cookies?.refreshToken;
    const ip = req.ip || req.headers['x-forwarded-for'];
    const userAgent = req.headers['user-agent'];
    const result = await userService.revokeAllOtherSessions(userId, currentRefreshToken, ip, userAgent);
    sendSuccess(res, 200, result.message, { revokedCount: result.revokedCount });
  } catch (error) {
    next(error);
  }
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


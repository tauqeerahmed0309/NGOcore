const { verifyToken } = require('../utils/jwtHelper');
const { errorResponse } = require('../utils/apiResponse');
const User = require('../models/User');
const Session = require('../models/Session');
const { ACCESS_COOKIE, readCookie } = require('../utils/authCookies');

const authMiddleware = async (req, res, next) => {
  try {
    const token = readCookie(req, ACCESS_COOKIE);
    if (!token) {
      return errorResponse(res, 401, 'Authentication cookie is missing or invalid. Please sign in.');
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return errorResponse(res, 401, 'Authentication token has expired. Refresh your session or sign in again.');
      }
      return errorResponse(res, 401, 'Invalid authentication token');
    }

    if (
      !decoded?.id ||
      !decoded.sid ||
      decoded.tokenType !== 'access'
    ) {
      return errorResponse(res, 401, 'Invalid access token');
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return errorResponse(res, 401, 'User account no longer exists');
    }
    if (!user.isActive) {
      return errorResponse(res, 401, 'User account is deactivated. Contact an administrator.');
    }
    if ((decoded.sessionVersion || 0) !== (user.sessionVersion || 0)) {
      return errorResponse(res, 401, 'Your password has changed. Please sign in again.');
    }
    const session = await Session.findOne({
      _id: decoded.sid,
      userId: user._id,
      expiresAt: { $gt: new Date() },
      revokedAt: null
    }).select('_id').lean();
    if (!session) {
      return errorResponse(res, 401, 'This session has ended. Please sign in again.');
    }

    req.user = user;
    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = authMiddleware;

const jwt = require('jsonwebtoken');
const { AppError } = require('../utils/errors');
const env = require('../config/env');
const { User } = require('../modules/users/model');
const { PlatformAdmin } = require('../modules/platform/model');

const requireAuth = async (req, res, next) => {
  let token = req.cookies?.accessToken;

  if (!token && req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new AppError(401, 'Authentication required. Please log in.'));
  }

  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);

    // Case 1: Platform Admin
    if (decoded.role === 'platform_admin' || decoded.adminId) {
      const admin = await PlatformAdmin.findById(decoded.adminId || decoded.userId).select('-password -twoFactorSecret');
      if (!admin) {
        return next(new AppError(401, 'Platform administrator account not found or removed'));
      }

      req.user = {
        adminId: admin._id,
        userId: admin._id,
        email: admin.email,
        name: admin.name,
        role: 'platform_admin',
        permissions: ['*'],
        isPlatformAdmin: true
      };
      return next();
    }

    // Case 2: Standard NGO User / Admin
    if (decoded.userId) {
      const user = await User.findById(decoded.userId).populate('roleId');
      if (!user) {
        return next(new AppError(401, 'User account no longer exists'));
      }

      if (user.status !== 'active') {
        return next(new AppError(403, `User account is currently "${user.status}". Access denied.`));
      }

      req.user = {
        userId: user._id,
        ngoId: user.ngoId,
        email: user.email,
        name: user.name,
        role: user.roleId?.name || 'NGO User',
        permissions: user.roleId?.permissions || [],
        isPlatformAdmin: false
      };
      return next();
    }

    return next(new AppError(401, 'Invalid authentication token payload'));
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(new AppError(401, 'Access token expired. Please refresh your session.'));
    }
    return next(new AppError(401, 'Invalid authentication token'));
  }
};

const requirePlatformAdmin = (req, res, next) => {
  requireAuth(req, res, (err) => {
    if (err) return next(err);
    if (!req.user?.isPlatformAdmin && req.user?.role !== 'platform_admin') {
      return next(new AppError(403, 'Platform admin access required'));
    }
    next();
  });
};

module.exports = {
  requireAuth,
  requirePlatformAdmin
};

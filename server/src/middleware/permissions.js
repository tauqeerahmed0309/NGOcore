const { AppError } = require('../utils/errors');

/**
 * Middleware factory requiring that the authenticated user possesses all specified permissions.
 * Supports '*' wildcard for full administrative access.
 * @param  {...string} requiredPermissions
 */
const requirePermission = (...requiredPermissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError(401, 'Authentication required'));
    }

    const userPermissions = req.user.permissions || [];

    // Wildcard permission grant (Platform Admin or full NGO Admin)
    if (userPermissions.includes('*') || req.user.isPlatformAdmin) {
      return next();
    }

    const missingPermissions = requiredPermissions.filter(
      (perm) => !userPermissions.includes(perm)
    );

    if (missingPermissions.length > 0) {
      return next(
        new AppError(
          403,
          `Permission denied: Missing required permission(s): [${missingPermissions.join(', ')}]`
        )
      );
    }

    next();
  };
};

/**
 * Middleware factory requiring that the authenticated user possesses at least one of the specified permissions.
 * @param  {...string} permissions
 */
const requireAnyPermission = (...permissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError(401, 'Authentication required'));
    }

    const userPermissions = req.user.permissions || [];

    if (userPermissions.includes('*') || req.user.isPlatformAdmin) {
      return next();
    }

    const hasAny = permissions.some((perm) => userPermissions.includes(perm));

    if (!hasAny) {
      return next(
        new AppError(
          403,
          `Permission denied: Requires at least one of [${permissions.join(', ')}]`
        )
      );
    }

    next();
  };
};

module.exports = {
  requirePermission,
  requireAnyPermission
};

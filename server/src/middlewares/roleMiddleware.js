const { errorResponse } = require('../utils/apiResponse');

/**
 * Role-Based Access Control (RBAC) Middleware
 * Usage: roleMiddleware('admin') or roleMiddleware('admin', 'staff') or roleMiddleware(['admin', 'staff'])
 */
const roleMiddleware = (...roles) => {
  // Flatten if passed as an array or comma-separated strings
  const allowedRoles = roles.flat();

  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, 401, 'Authentication required before role check');
    }

    const hasPermission = allowedRoles.includes(req.user.role) ||
      (req.user.role === 'ngo_admin' && allowedRoles.includes('admin'));
    if (!hasPermission) {
      return errorResponse(
        res,
        403,
        `Access denied. Your role '${req.user.role}' is not authorized to access this resource. Required role: [${allowedRoles.join(', ')}]`
      );
    }

    next();
  };
};

module.exports = roleMiddleware;

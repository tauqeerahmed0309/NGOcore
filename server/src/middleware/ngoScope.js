const { AppError } = require('../utils/errors');

/**
 * Asserts that a resource's ngoId matches the authenticated user's ngoId.
 * If user is platform admin, access is permitted.
 * Otherwise, throws a 404 error to prevent leaking the existence of another NGO's resource.
 */
const assertNgoAccess = (user, resourceNgoId, resourceName = 'Resource') => {
  if (!user) {
    throw new AppError(401, 'Authentication required');
  }

  if (user.isPlatformAdmin) {
    return true;
  }

  const userNgoId = user.ngoId ? user.ngoId.toString() : null;
  const targetNgoId = resourceNgoId ? resourceNgoId.toString() : null;

  if (!userNgoId || !targetNgoId || userNgoId !== targetNgoId) {
    throw new AppError(404, `${resourceName} not found or access denied`);
  }

  return true;
};

/**
 * Builds a query filter scoped strictly to the authenticated user's ngoId.
 */
const getTenantFilter = (req, baseFilter = {}) => {
  if (req.user?.isPlatformAdmin && !req.scopedNgoId) {
    return { ...baseFilter };
  }
  return {
    ...baseFilter,
    ngoId: req.scopedNgoId || req.user?.ngoId
  };
};

/**
 * Prepares an entity payload for creation, strictly enforcing the authenticated user's ngoId
 * and stripping any client-supplied tenant or role identifiers.
 */
const buildTenantEntity = (req, data = {}) => {
  const sanitized = { ...data };
  delete sanitized.ngoId;
  delete sanitized.role;
  delete sanitized.roleId;

  return {
    ...sanitized,
    ngoId: req.scopedNgoId || req.user?.ngoId
  };
};

/**
 * Express middleware to enforce strict NGO data isolation:
 * 1. Strips any injected ngoId, role, or roleId from req.body, req.query, and req.params.
 * 2. Injects the authenticated user's verified ngoId onto req.scopedNgoId.
 * 3. Blocks unverified or unassigned users.
 */
const ngoScope = (req, res, next) => {
  if (!req.user) {
    return next(new AppError(401, 'Authentication required'));
  }

  // Platform admin can operate across NGOs or inspect a specific NGO if specified
  if (req.user.isPlatformAdmin) {
    req.scopedNgoId = req.params?.ngoId || req.query?.ngoId || null;
    return next();
  }

  if (!req.user.ngoId) {
    return next(new AppError(403, 'User is not bound to an organization'));
  }

  // Enforce isolation: never trust client body or query for ngoId or role
  if (req.body) {
    delete req.body.ngoId;
    delete req.body.role;
    delete req.body.roleId;
  }

  if (req.query) {
    delete req.query.ngoId;
  }

  req.scopedNgoId = req.user.ngoId;
  next();
};

module.exports = {
  ngoScope,
  assertNgoAccess,
  getTenantFilter,
  buildTenantEntity
};

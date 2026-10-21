const { NGO } = require('../modules/ngo/model');
const { AppError } = require('../utils/errors');

/**
 * Middleware requiring the user's organization to have a specific approval status.
 * Defaults to requiring status === 'approved'.
 * @param {string} requiredStatus
 */
const requireNgoStatus = (requiredStatus = 'approved') => {
  return async (req, res, next) => {
    if (!req.user) {
      return next(new AppError(401, 'Authentication required'));
    }

    // Platform Admins operating platform-wide bypass NGO status checks
    if (req.user.isPlatformAdmin) {
      return next();
    }

    if (!req.user.ngoId) {
      return next(new AppError(400, 'User is not associated with an organization'));
    }

    try {
      const ngo = await NGO.findById(req.user.ngoId);
      if (!ngo) {
        return next(new AppError(404, 'Associated organization not found'));
      }

      if (ngo.status !== requiredStatus) {
        let hint = '';
        if (ngo.status === 'pending') {
          hint = ' Your organization verification is currently under review.';
        } else if (ngo.status === 're-upload-required') {
          hint = ` Action required: ${ngo.statusReason || 'Additional documents needed.'}`;
        } else if (ngo.status === 'suspended') {
          hint = ` Notice: ${ngo.statusReason || 'Account suspended by platform administration.'}`;
        } else if (ngo.status === 'rejected') {
          hint = ` Notice: ${ngo.statusReason || 'Application rejected.'}`;
        }

        return next(
          new AppError(
            403,
            `Access restricted: Organization status is "${ngo.status}". Required: "${requiredStatus}".${hint}`
          )
        );
      }

      req.ngo = ngo;
      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = {
  requireNgoStatus
};

const { errorResponse } = require('../utils/apiResponse');

const ngoScope = (req, res, next) => {
  if (!req.user?.ngoId) {
    return errorResponse(res, 403, 'Your account is not associated with an organization. Contact an administrator.');
  }

  const ngoId = req.user.ngoId;
  req.ngoFilter = (conditions = {}) => ({ ...conditions, ngoId });
  return next();
};

module.exports = ngoScope;

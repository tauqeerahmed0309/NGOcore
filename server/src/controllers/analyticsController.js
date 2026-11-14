const { successResponse } = require('../utils/apiResponse');
const { getOrganizationDashboardAnalytics } = require('../services/analyticsService');
const logger = require('../utils/logger');

/**
 * Controller for retrieving consolidated organization dashboard analytics
 * Route: GET /api/v1/analytics/dashboard
 * Access: admin, ngo_admin, staff (tenant-scoped)
 */
const getDashboardAnalytics = async (req, res, next) => {
  try {
    const { months, timezone } = req.query;

    const data = await getOrganizationDashboardAnalytics({
      ngoId: req.user.ngoId,
      months: months !== undefined ? Number(months) : 6,
      timezone: timezone || 'UTC'
    });

    return successResponse(res, 200, 'Organization analytics dashboard ready.', data);
  } catch (error) {
    logger.error('Failed to retrieve organization dashboard analytics:', error);
    return next(error);
  }
};

module.exports = {
  getDashboardAnalytics
};


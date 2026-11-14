import api from '../../services/api';

/**
 * Service for Organization Analytics API
 * Endpoint: GET /api/v1/analytics/dashboard
 * Protected: Requires JWT authentication + NGO tenant scope + admin/staff role
 */
export const analyticsService = {
  /**
   * Fetch consolidated organization dashboard analytics
   * @param {Object} params - Query parameters
   * @param {number} [params.months=6] - Timeframe window in months (1-24)
   * @param {string} [params.timezone='UTC'] - Desired timezone string
   * @param {Object} [config={}] - Additional request configuration (e.g. AbortSignal)
   * @returns {Promise<Object>} API response payload
   */
  getDashboardAnalytics: (params = {}, config = {}) => api.get('/analytics/dashboard', { params, ...config })
};

export default analyticsService;


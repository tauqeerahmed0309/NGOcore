const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const ngoScope = require('../middlewares/ngoScope');
const roleMiddleware = require('../middlewares/roleMiddleware');
const { validateQuery } = require('../middlewares/validationMiddleware');
const { dashboardAnalyticsQuerySchema } = require('../validations/analyticsValidation');
const analyticsController = require('../controllers/analyticsController');

const router = express.Router();

router.use(authMiddleware, ngoScope);

router.get(
  '/dashboard',
  roleMiddleware('admin', 'staff'),
  validateQuery(dashboardAnalyticsQuerySchema),
  analyticsController.getDashboardAnalytics
);

module.exports = router;


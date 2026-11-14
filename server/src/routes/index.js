const express = require('express');
const router = express.Router();
const healthRoutes = require('./healthRoutes');
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const studentRoutes = require('./studentRoutes');
const programRoutes = require('./programRoutes');
const testRoutes = require('./testRoutes');
const assistantRoutes = require('./assistantRoutes');
const analyticsRoutes = require('./analyticsRoutes');
const reportController = require('../controllers/reportController');
const authMiddleware = require('../middlewares/authMiddleware');
const ngoScope = require('../middlewares/ngoScope');
const roleMiddleware = require('../middlewares/roleMiddleware');
const { validateQuery } = require('../middlewares/validationMiddleware');
const { participationReportQuerySchema } = require('../validations/programActivityValidation');
const {
  beneficiaryReportQuerySchema,
  programReportQuerySchema,
  orgSummaryQuerySchema
} = require('../validations/reportValidation');

// Health Check Route
router.use('/health', healthRoutes);

// Authentication & Profile Routes
router.use('/auth', authRoutes);

// User Management Routes (Admin only)
router.use('/users', userRoutes);

// Student Management Routes
router.use('/students', studentRoutes);

// Dynamic Program Management Routes
router.use('/programs', programRoutes);

// RBAC Test Routes (for role verification)
router.use('/test', testRoutes);
router.use('/assistant', assistantRoutes);
router.use('/analytics', analyticsRoutes);

router.get(
  '/reports/beneficiaries',
  authMiddleware,
  ngoScope,
  roleMiddleware('admin', 'staff'),
  validateQuery(beneficiaryReportQuerySchema),
  reportController.getBeneficiaryReport
);
router.get(
  '/reports/programs',
  authMiddleware,
  ngoScope,
  roleMiddleware('admin', 'staff'),
  validateQuery(programReportQuerySchema),
  reportController.getProgramReport
);
router.get(
  '/reports/summary',
  authMiddleware,
  ngoScope,
  roleMiddleware('admin', 'staff'),
  validateQuery(orgSummaryQuerySchema),
  reportController.getOrgSummaryReport
);
router.get(
  '/reports/reminders',
  authMiddleware,
  ngoScope,
  roleMiddleware('admin', 'staff'),
  reportController.getReminders
);
router.get(
  '/reports/participation.csv',
  authMiddleware,
  ngoScope,
  roleMiddleware('admin', 'staff'),
  validateQuery(participationReportQuerySchema),
  reportController.exportParticipation
);

module.exports = router;

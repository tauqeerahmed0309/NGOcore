const express = require('express');
const router = express.Router();
const healthRoutes = require('./healthRoutes');
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const studentRoutes = require('./studentRoutes');
const programRoutes = require('./programRoutes');
const testRoutes = require('./testRoutes');
const assistantRoutes = require('./assistantRoutes');
const reportController = require('../controllers/reportController');
const authMiddleware = require('../middlewares/authMiddleware');
const ngoScope = require('../middlewares/ngoScope');
const roleMiddleware = require('../middlewares/roleMiddleware');
const { validateQuery } = require('../middlewares/validationMiddleware');
const { participationReportQuerySchema } = require('../validations/programActivityValidation');

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

const express = require('express');
const router = express.Router();

const programController = require('../controllers/programController');
const activityController = require('../controllers/programActivityController');
const authMiddleware = require('../middlewares/authMiddleware');
const ngoScope = require('../middlewares/ngoScope');
const roleMiddleware = require('../middlewares/roleMiddleware');
const {
  validateBody,
  validateParams,
  validateQuery
} = require('../middlewares/validationMiddleware');
const {
  createProgramSchema,
  updateProgramSchema,
  updateProgramStatusSchema,
  programIdParamSchema,
  assignStaffSchema,
  staffParamSchema,
  listProgramsQuerySchema
} = require('../validations/programValidation');
const {
  programIdParamSchema: activityProgramIdParamSchema,
  enrollmentParamsSchema,
  enrollmentSchema,
  sessionDateQuerySchema,
  attendanceSchema,
  enrollmentStatusSchema,
  attendanceHistoryQuerySchema,
  enrollmentListQuerySchema
} = require('../validations/programActivityValidation');

// All program routes require authentication
router.use(authMiddleware);
router.use(ngoScope);

// 1. List programs (Admin, Staff, Volunteer)
router.get(
  '/',
  roleMiddleware('admin', 'staff', 'volunteer'),
  validateQuery(listProgramsQuerySchema),
  programController.listPrograms
);

router.get(
  '/my-enrollments',
  roleMiddleware('student'),
  validateQuery(enrollmentListQuerySchema),
  activityController.getMyEnrollments
);

router.get(
  '/:id/enrollments',
  roleMiddleware('admin', 'staff'),
  validateParams(activityProgramIdParamSchema),
  validateQuery(enrollmentListQuerySchema),
  activityController.listEnrollments
);
router.post(
  '/:id/enrollments',
  roleMiddleware('admin', 'staff'),
  validateParams(activityProgramIdParamSchema),
  validateBody(enrollmentSchema),
  activityController.enrollStudent
);
router.patch(
  '/:id/enrollments/:studentId',
  roleMiddleware('admin', 'staff'),
  validateParams(enrollmentParamsSchema),
  validateBody(enrollmentStatusSchema),
  activityController.updateEnrollment
);
router.get(
  '/:id/attendance',
  roleMiddleware('admin', 'staff'),
  validateParams(activityProgramIdParamSchema),
  validateQuery(sessionDateQuerySchema),
  activityController.getAttendance
);
router.put(
  '/:id/attendance',
  roleMiddleware('admin', 'staff'),
  validateParams(activityProgramIdParamSchema),
  validateBody(attendanceSchema),
  activityController.saveAttendance
);

// 2. Create program (Admin only)
router.post(
  '/',
  roleMiddleware('admin'),
  validateBody(createProgramSchema),
  programController.createProgram
);

// 3. Get program details by ID (Admin, Staff, Volunteer)
router.get(
  '/:id',
  roleMiddleware('admin', 'staff', 'volunteer'),
  validateParams(programIdParamSchema),
  programController.getProgramById
);

router.get(
  '/:id/attendance-history',
  roleMiddleware('admin', 'staff'),
  validateParams(activityProgramIdParamSchema),
  validateQuery(attendanceHistoryQuerySchema),
  activityController.getAttendanceHistory
);

// 4. Update program (Admin only)
router.put(
  '/:id',
  roleMiddleware('admin'),
  validateParams(programIdParamSchema),
  validateBody(updateProgramSchema),
  programController.updateProgram
);

// 5. Update program status (Admin only)
router.patch(
  '/:id/status',
  roleMiddleware('admin'),
  validateParams(programIdParamSchema),
  validateBody(updateProgramStatusSchema),
  programController.updateProgramStatus
);

// 6. Assign staff member to program (Admin only)
router.post(
  '/:id/staff',
  roleMiddleware('admin'),
  validateParams(programIdParamSchema),
  validateBody(assignStaffSchema),
  programController.assignStaff
);

// 7. Remove assigned staff member from program (Admin only)
router.delete(
  '/:id/staff/:staffId',
  roleMiddleware('admin'),
  validateParams(staffParamSchema),
  programController.removeStaff
);

// 8. Permanently delete program with safe dependency guard (Admin only)
router.delete(
  '/:id',
  roleMiddleware('admin'),
  validateParams(programIdParamSchema),
  programController.deleteProgram
);

module.exports = router;

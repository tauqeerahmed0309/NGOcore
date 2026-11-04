const express = require('express');
const router = express.Router();

const studentController = require('../controllers/studentController');
const authMiddleware = require('../middlewares/authMiddleware');
const ngoScope = require('../middlewares/ngoScope');
const roleMiddleware = require('../middlewares/roleMiddleware');
const {
  validateBody,
  validateParams,
  validateQuery
} = require('../middlewares/validationMiddleware');
const {
  createStudentSchema,
  updateStudentSchema,
  updateStudentStatusSchema,
  studentIdParamSchema,
  listStudentsQuerySchema
} = require('../validations/studentValidation');

// All student routes require an authenticated user
router.use(authMiddleware);
router.use(ngoScope);

// 1. Get logged in student's own linked profile
router.get('/me', studentController.getMyProfile);

// 2. List students with search, filters, pagination (Admin, Staff, Volunteer)
router.get(
  '/',
  roleMiddleware('admin', 'staff', 'volunteer'),
  validateQuery(listStudentsQuerySchema),
  studentController.listStudents
);

// 3. Create student profile (Admin, Staff)
router.post(
  '/',
  roleMiddleware('admin', 'staff'),
  validateBody(createStudentSchema),
  studentController.createStudent
);

// 4. Get student profile by ID (Admin, Staff, Volunteer, or Student if self)
router.get(
  '/:id',
  validateParams(studentIdParamSchema),
  studentController.getStudentById
);

// 5. Update student profile (Admin, Staff)
router.put(
  '/:id',
  roleMiddleware('admin', 'staff'),
  validateParams(studentIdParamSchema),
  validateBody(updateStudentSchema),
  studentController.updateStudent
);

// 6. Update student status (Admin, Staff)
router.patch(
  '/:id/status',
  roleMiddleware('admin', 'staff'),
  validateParams(studentIdParamSchema),
  validateBody(updateStudentStatusSchema),
  studentController.updateStudentStatus
);

module.exports = router;

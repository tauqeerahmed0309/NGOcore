const express = require('express');
const router = express.Router();

const userController = require('../controllers/userController');
const authMiddleware = require('../middlewares/authMiddleware');
const ngoScope = require('../middlewares/ngoScope');
const roleMiddleware = require('../middlewares/roleMiddleware');
const {
  validateBody,
  validateParams,
  validateQuery
} = require('../middlewares/validationMiddleware');
const {
  createUserSchema,
  updateUserSchema,
  updateStatusSchema,
  userIdParamSchema,
  listUsersQuerySchema
} = require('../validations/userValidation');

// Global route guard: All User Management endpoints require authentication and admin role
router.use(authMiddleware);
router.use(ngoScope);
router.use(roleMiddleware('admin'));

// 1. List users with search, role/status filter, pagination
router.get('/', validateQuery(listUsersQuerySchema), userController.listUsers);

// 2. Create new user (Staff, Volunteer, Student only)
router.post('/', validateBody(createUserSchema), userController.createUser);

// 3. Get user details by ID
router.get('/:id', validateParams(userIdParamSchema), userController.getUserById);

// 4. Update user details
router.put(
  '/:id',
  validateParams(userIdParamSchema),
  validateBody(updateUserSchema),
  userController.updateUser
);

// 5. Soft activate / deactivate user status
router.patch(
  '/:id/status',
  validateParams(userIdParamSchema),
  validateBody(updateStatusSchema),
  userController.updateStatus
);
router.post(
  '/:id/setup-invite',
  validateParams(userIdParamSchema),
  userController.resendStudentSetupInvite
);

module.exports = router;

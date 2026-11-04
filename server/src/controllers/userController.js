const userService = require('../services/userService');
const { successResponse } = require('../utils/apiResponse');
const { writeAuditLog } = require('../services/auditService');

/**
 * @desc    Get all users with search, filtering and pagination
 * @route   GET /api/v1/users
 * @access  Admin only
 */
const listUsers = async (req, res, next) => {
  try {
    const result = await userService.listUsers(req.query, req.ngoFilter);
    return successResponse(
      res,
      200,
      'Users retrieved successfully',
      {
        users: result.users,
        pagination: result.pagination
      }
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new Staff, Volunteer, or Student user
 * @route   POST /api/v1/users
 * @access  Admin only
 */
const createUser = async (req, res, next) => {
  try {
    const user = await userService.createUser(req.body, req.user.ngoId);
    await writeAuditLog({
      req,
      action: 'create',
      entityType: 'user',
      entityId: user._id
    });
    const message = user.role === 'student' && user.isPasswordSetupRequired
      ? 'Student account created. A password setup invitation was sent to the student.'
      : 'User created successfully';
    return successResponse(res, 201, message, { user });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get user details by ID
 * @route   GET /api/v1/users/:id
 * @access  Admin only
 */
const getUserById = async (req, res, next) => {
  try {
    const user = await userService.getUserById(req.params.id, req.ngoFilter);
    return successResponse(res, 200, 'User details retrieved successfully', { user });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update user details (firstName, lastName, email, role)
 * @route   PUT /api/v1/users/:id
 * @access  Admin only
 */
const updateUser = async (req, res, next) => {
  try {
    const user = await userService.updateUser(req.params.id, req.body, req.ngoFilter);
    await writeAuditLog({
      req,
      action: 'update',
      entityType: 'user',
      entityId: user._id
    });
    return successResponse(res, 200, 'User updated successfully', { user });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Activate or Deactivate user (soft status change)
 * @route   PATCH /api/v1/users/:id/status
 * @access  Admin only
 */
const updateStatus = async (req, res, next) => {
  try {
    const { isActive } = req.body;
    const user = await userService.updateUserStatus(req.params.id, isActive, req.user._id, req.ngoFilter);
    await writeAuditLog({
      req,
      action: 'update',
      entityType: 'user',
      entityId: user._id,
      metadata: { field: 'isActive', value: user.isActive }
    });
    const action = user.isActive ? 'activated' : 'deactivated';
    return successResponse(res, 200, `User account ${action} successfully`, { user });
  } catch (error) {
    next(error);
  }
};

const resendStudentSetupInvite = async (req, res, next) => {
  try {
    const user = await userService.resendStudentSetupInvite(req.params.id, req.ngoFilter);
    await writeAuditLog({
      req,
      action: 'update',
      entityType: 'user',
      entityId: user._id,
      metadata: { event: 'student_setup_invite_resent' }
    });
    return successResponse(res, 200, 'A new password setup invitation was sent.', { user });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  listUsers,
  createUser,
  getUserById,
  updateUser,
  updateStatus,
  resendStudentSetupInvite
};

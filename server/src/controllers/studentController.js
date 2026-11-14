const studentService = require('../services/studentService');
const { successResponse } = require('../utils/apiResponse');
const { writeAuditLog } = require('../services/auditService');

/**
 * @desc    Get all students with search, filters, sorting and pagination
 * @route   GET /api/v1/students
 * @access  Admin, Staff, Volunteer (Student: self-only)
 */
const listStudents = async (req, res, next) => {
  try {
    const result = await studentService.listStudents(req.query, req.user, req.ngoFilter);
    return successResponse(
      res,
      200,
      'Students retrieved successfully',
      {
        students: result.students,
        pagination: result.pagination
      }
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Pre-save duplicate candidate verification
 * @route   POST /api/v1/students/check-duplicate
 * @access  Admin, Staff
 */
const checkDuplicate = async (req, res, next) => {
  try {
    const result = await studentService.checkDuplicate(req.body, req.ngoFilter);
    return successResponse(res, 200, 'Duplicate check completed successfully', result);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new student profile
 * @route   POST /api/v1/students
 * @access  Admin, Staff
 */
const createStudent = async (req, res, next) => {
  try {
    const student = await studentService.createStudent(req.body, req.user._id, req.user.ngoId, req.ngoFilter);
    await writeAuditLog({
      req,
      action: 'create',
      entityType: 'student',
      entityId: student._id
    });
    return successResponse(res, 201, 'Student profile created successfully', { student });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get student profile by ID with enriched lifecycle data
 * @route   GET /api/v1/students/:id
 * @access  Admin, Staff, Volunteer (Student: self-only)
 */
const getStudentById = async (req, res, next) => {
  try {
    const result = await studentService.getStudentById(req.params.id, req.user, req.ngoFilter);
    return successResponse(res, 200, 'Student profile retrieved successfully', {
      student: result.student,
      enrollments: result.enrollments,
      attendance: result.attendance,
      dataQuality: result.dataQuality,
      duplicates: result.duplicates,
      auditLogs: result.auditLogs
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get logged in student's own linked profile
 * @route   GET /api/v1/students/me
 * @access  Authenticated user
 */
const getMyProfile = async (req, res, next) => {
  try {
    const result = await studentService.getMyStudentProfile(req.user._id, req.ngoFilter);
    return successResponse(res, 200, 'Your student profile retrieved successfully', {
      student: result.student,
      enrollments: result.enrollments,
      attendance: result.attendance,
      dataQuality: result.dataQuality,
      duplicates: result.duplicates,
      auditLogs: result.auditLogs
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update student profile details
 * @route   PUT /api/v1/students/:id
 * @access  Admin, Staff
 */
const updateStudent = async (req, res, next) => {
  try {
    const { student, modifiedFields } = await studentService.updateStudent(req.params.id, req.body, req.ngoFilter);
    await writeAuditLog({
      req,
      action: 'update',
      entityType: 'student',
      entityId: student._id,
      metadata: { modifiedFields }
    });
    return successResponse(res, 200, 'Student profile updated successfully', { student });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update student status
 * @route   PATCH /api/v1/students/:id/status
 * @access  Admin, Staff
 */
const updateStudentStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const student = await studentService.updateStudentStatus(req.params.id, status, req.ngoFilter);
    await writeAuditLog({
      req,
      action: 'update',
      entityType: 'student',
      entityId: student._id,
      metadata: { field: 'status', value: status }
    });
    return successResponse(res, 200, `Student status updated to '${status}' successfully`, { student });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Safely delete student profile (only if no enrollments, attendance, or audit history exist)
 * @route   DELETE /api/v1/students/:id
 * @access  Admin
 */
const deleteStudent = async (req, res, next) => {
  try {
    const result = await studentService.deleteStudent(req.params.id, req.ngoFilter);
    await writeAuditLog({
      req,
      action: 'delete',
      entityType: 'student',
      entityId: req.params.id
    });
    return successResponse(res, 200, result.message, { studentId: result.studentId });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listStudents,
  checkDuplicate,
  createStudent,
  getStudentById,
  getMyProfile,
  updateStudent,
  updateStudentStatus,
  deleteStudent
};
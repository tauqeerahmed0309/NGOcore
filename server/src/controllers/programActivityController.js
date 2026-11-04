const activityService = require('../services/programActivityService');
const { successResponse } = require('../utils/apiResponse');
const { writeAuditLog } = require('../services/auditService');

const listEnrollments = async (req, res, next) => {
  try {
    const result = await activityService.listEnrollments(req.params.id, req.query, req.ngoFilter);
    return successResponse(res, 200, 'Program enrollments retrieved.', result);
  } catch (error) {
    return next(error);
  }
};

const enrollStudent = async (req, res, next) => {
  try {
    const enrollment = await activityService.enrollStudent(
      req.params.id,
      req.body.studentId,
      req.user.ngoId,
      req.ngoFilter
    );
    await writeAuditLog({
      req,
      action: 'create',
      entityType: 'program_enrollment',
      entityId: enrollment._id,
      metadata: { programId: req.params.id, studentId: req.body.studentId }
    });
    return successResponse(res, 201, 'Student enrolled in program.', { enrollment });
  } catch (error) {
    return next(error);
  }
};

const updateEnrollment = async (req, res, next) => {
  try {
    const enrollment = await activityService.changeEnrollmentStatus(
      req.params.id,
      req.params.studentId,
      req.body.status,
      req.ngoFilter
    );
    await writeAuditLog({
      req,
      action: 'update',
      entityType: 'program_enrollment',
      entityId: enrollment._id,
      metadata: { status: enrollment.status }
    });
    return successResponse(res, 200, 'Enrollment status updated.', { enrollment });
  } catch (error) {
    return next(error);
  }
};

const getAttendance = async (req, res, next) => {
  try {
    const attendance = await activityService.getAttendance(req.params.id, req.query.date, req.ngoFilter);
    return successResponse(res, 200, 'Attendance roster retrieved.', attendance);
  } catch (error) {
    return next(error);
  }
};

const saveAttendance = async (req, res, next) => {
  try {
    const session = await activityService.saveAttendance(
      req.params.id,
      req.body.date,
      req.body.entries,
      req.user._id,
      req.user.ngoId,
      req.ngoFilter
    );
    await writeAuditLog({
      req,
      action: 'update',
      entityType: 'attendance_session',
      entityId: session._id,
      metadata: { programId: req.params.id, sessionDate: req.body.date, studentCount: req.body.entries.length }
    });
    return successResponse(res, 200, 'Attendance saved.', { session });
  } catch (error) {
    return next(error);
  }
};

const getMyEnrollments = async (req, res, next) => {
  try {
    const result = await activityService.getMyEnrollments(req.user._id, req.query, req.ngoFilter);
    return successResponse(res, 200, 'Your program enrollments retrieved.', result);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  listEnrollments,
  enrollStudent,
  updateEnrollment,
  getAttendance,
  saveAttendance,
  getMyEnrollments
};

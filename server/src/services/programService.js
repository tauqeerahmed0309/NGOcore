const mongoose = require('mongoose');
const Program = require('../models/Program');
const ProgramEnrollment = require('../models/ProgramEnrollment');
const AttendanceSession = require('../models/AttendanceSession');
const AuditLog = require('../models/AuditLog');
const User = require('../models/User');
const logger = require('../utils/logger');

/**
 * Validate assignment integrity and role requirements
 * - Coordinator must be active User with role 'admin' or 'staff'
 * - Assigned staff must be active Users with role 'staff' (Students/Volunteers blocked)
 * - Assigned volunteers must be active Users with role 'volunteer'
 */
const validateAssignments = async ({ coordinator, assignedStaff, assignedVolunteers }, ngoFilter) => {
  const ids = [coordinator, ...(assignedStaff || []), ...(assignedVolunteers || [])].filter(Boolean);
  if (!ids.length) return;

  const users = await User.find(ngoFilter({ _id: { $in: ids } }))
    .select('email role isActive')
    .lean();
  const usersById = new Map(users.map((user) => [String(user._id), user]));
  const getAssignedUser = (id, label) => {
    const user = usersById.get(String(id));
    if (!user) {
      const error = new Error(`${label} user '${id}' not found.`);
      error.statusCode = 400;
      throw error;
    }
    return user;
  };

  if (coordinator) {
    const user = getAssignedUser(coordinator, 'Coordinator');
    if (!user.isActive) {
      const error = new Error(`Coordinator '${user.email}' is inactive. Inactive users cannot be assigned.`);
      error.statusCode = 400;
      throw error;
    }
    if (!['admin', 'ngo_admin', 'staff'].includes(user.role)) {
      const error = new Error(`Coordinator must have Staff or Admin role. Found: '${user.role}'.`);
      error.statusCode = 400;
      throw error;
    }
  }

  for (const staffId of assignedStaff || []) {
    const user = getAssignedUser(staffId, 'Assigned staff');
    if (!user.isActive) {
      const error = new Error(`Assigned staff member '${user.email}' is inactive. Inactive users cannot be assigned.`);
      error.statusCode = 400;
      throw error;
    }
    if (user.role !== 'staff') {
      const error = new Error(
        `Assigned staff must have the 'staff' role. User '${user.email}' has role '${user.role}'. Student or Volunteer users cannot be assigned as staff.`
      );
      error.statusCode = 400;
      throw error;
    }
  }

  for (const volunteerId of assignedVolunteers || []) {
    const user = getAssignedUser(volunteerId, 'Assigned volunteer');
    if (!user.isActive) {
      const error = new Error(`Assigned volunteer '${user.email}' is inactive. Inactive users cannot be assigned.`);
      error.statusCode = 400;
      throw error;
    }
    if (user.role !== 'volunteer') {
      const error = new Error(
        `Assigned volunteer must have the 'volunteer' role. User '${user.email}' has role '${user.role}'.`
      );
      error.statusCode = 400;
      throw error;
    }
  }
};

/**
 * List programs with search, filtering, pagination, and role scoping
 */
const listPrograms = async (
  {
    page = 1,
    limit = 10,
    search = '',
    type = 'all',
    category = 'all',
    status = 'all',
    sortBy = 'createdAt',
    sortOrder = 'desc'
  },
  currentUser,
  ngoFilter
) => {
  // Role checks: Students cannot access administrative program list
  if (currentUser && currentUser.role === 'student') {
    const error = new Error('Access denied. Students are not authorized to view the administrative program list.');
    error.statusCode = 403;
    throw error;
  }

  const query = ngoFilter({});

  // Volunteers can only view programs they are assigned to
  if (currentUser && currentUser.role === 'volunteer') {
    query.$or = [
      { assignedVolunteers: currentUser._id },
      { coordinator: currentUser._id }
    ];
  }

  // Search across name, code, type, category, description, location
  if (search && search.trim() !== '') {
    const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const searchRegex = new RegExp(escaped, 'i');
    const searchConditions = [
      { name: searchRegex },
      { code: searchRegex },
      { type: searchRegex },
      { category: searchRegex },
      { description: searchRegex },
      { location: searchRegex }
    ];

    if (query.$or) {
      query.$and = [{ $or: query.$or }, { $or: searchConditions }];
      delete query.$or;
    } else {
      query.$or = searchConditions;
    }
  }

  // Type filter (flexible match)
  if (type && type !== 'all') {
    query.type = type.trim().toLowerCase();
  }

  // Category filter (case-insensitive exact match)
  if (category && category !== 'all') {
    query.category = new RegExp('^' + category.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i');
  }

  // Status filter
  if (status && status !== 'all') {
    query.status = status;
  }

  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 10;
  const skip = (pageNum - 1) * limitNum;
  const sortDirection = sortOrder === 'asc' ? 1 : -1;

  const totalPrograms = await Program.countDocuments(query);
  const totalPages = Math.ceil(totalPrograms / limitNum) || 1;

  const programs = await Program.find(query)
    .populate('coordinator', 'email firstName lastName role isActive avatar')
    .populate('assignedStaff', 'email firstName lastName role isActive avatar')
    .populate('assignedVolunteers', 'email firstName lastName role isActive avatar')
    .populate('createdBy', 'email firstName lastName role')
    .sort({ [sortBy]: sortDirection })
    .skip(skip)
    .limit(limitNum)
    .lean({ virtuals: true });

  // Batch calculate active enrollment counts for returned programs
  const progIds = programs.map((p) => p._id);
  let countMap = new Map();
  if (progIds.length > 0) {
    const userNgoId = (currentUser && currentUser.ngoId) || (programs[0] && programs[0].ngoId);
    if (userNgoId) {
      const enrollmentCounts = await ProgramEnrollment.aggregate([
        {
          $match: {
            ngoId: new mongoose.Types.ObjectId(String(userNgoId)),
            programId: { $in: progIds },
            status: 'enrolled'
          }
        },
        { $group: { _id: '$programId', count: { $sum: 1 } } }
      ]);
      countMap = new Map(enrollmentCounts.map((e) => [String(e._id), e.count]));
    }
  }

  programs.forEach((program) => {
    delete program.__v;
    if (program.customAttributes instanceof Map) {
      program.customAttributes = Object.fromEntries(program.customAttributes);
    } else if (!program.customAttributes || typeof program.customAttributes !== 'object') {
      program.customAttributes = {};
    }
    const enrolled = countMap.get(String(program._id)) || 0;
    program.enrolledCount = enrolled;
    program.availableSeats = program.capacity != null ? Math.max(0, program.capacity - enrolled) : null;
    program.isFull = program.capacity != null ? enrolled >= program.capacity : false;
  });

  return {
    programs,
    pagination: {
      totalPrograms,
      totalPages,
      currentPage: pageNum,
      limit: limitNum,
      hasNextPage: pageNum < totalPages,
      hasPrevPage: pageNum > 1
    }
  };
};

/**
 * Create a new program (Admin only)
 */
const createProgram = async (data, createdById, ngoId, ngoFilter) => {
  const cleanCode = data.code.trim().toUpperCase();

  // 1. Check unique program code
  const existing = await Program.findOne(ngoFilter({ code: cleanCode }));
  if (existing) {
    const error = new Error(`Program with code '${cleanCode}' already exists.`);
    error.statusCode = 409;
    throw error;
  }

  // 2. Validate assignments
  const targetCoordinator = data.coordinator || data.coordinatorId;
  await validateAssignments({
    coordinator: targetCoordinator,
    assignedStaff: data.assignedStaff,
    assignedVolunteers: data.assignedVolunteers
  }, ngoFilter);

  // 3. Create program
  const newProgram = await Program.create({
    ...data,
    coordinator: targetCoordinator || undefined,
    ngoId,
    code: cleanCode,
    type: data.type.trim().toLowerCase(),
    createdBy: createdById
  });

  await newProgram.populate([
    { path: 'coordinator', select: 'email firstName lastName role isActive avatar' },
    { path: 'assignedStaff', select: 'email firstName lastName role isActive avatar' },
    { path: 'assignedVolunteers', select: 'email firstName lastName role isActive avatar' },
    { path: 'createdBy', select: 'email firstName lastName role' }
  ]);

  logger.info(`Program created: [${newProgram.code}] ${newProgram.name} (type: ${newProgram.type})`);
  return newProgram;
};

/**
 * Retrieve program by ID with role-based access check and rich operational stats
 */
const getProgramById = async (id, currentUser, ngoFilter) => {
  const program = await Program.findOne(ngoFilter({ _id: id }))
    .populate('coordinator', 'email firstName lastName role isActive avatar')
    .populate('assignedStaff', 'email firstName lastName role isActive avatar')
    .populate('assignedVolunteers', 'email firstName lastName role isActive avatar')
    .populate('createdBy', 'email firstName lastName role');

  if (!program) {
    const error = new Error(`Program with ID '${id}' not found.`);
    error.statusCode = 404;
    throw error;
  }

  // Role permissions
  if (currentUser && currentUser.role === 'student') {
    const error = new Error('Access denied. Students are not authorized to view this program.');
    error.statusCode = 403;
    throw error;
  }

  if (currentUser && currentUser.role === 'volunteer') {
    const isAssigned =
      program.assignedVolunteers?.some((v) => v._id.toString() === currentUser._id.toString()) ||
      (program.coordinator && program.coordinator._id.toString() === currentUser._id.toString());

    if (!isAssigned) {
      const error = new Error('Access denied. You are only authorized to view programs assigned to you.');
      error.statusCode = 403;
      throw error;
    }
  }

  // Compute rich lifecycle stats
  const [
    enrolledCount,
    completedCount,
    withdrawnCount,
    sessionsCount,
    attendanceStats,
    recentEnrollments,
    recentAttendance
  ] = await Promise.all([
    ProgramEnrollment.countDocuments(ngoFilter({ programId: id, status: 'enrolled' })),
    ProgramEnrollment.countDocuments(ngoFilter({ programId: id, status: 'completed' })),
    ProgramEnrollment.countDocuments(ngoFilter({ programId: id, status: 'withdrawn' })),
    AttendanceSession.countDocuments(ngoFilter({ programId: id })),
    AttendanceSession.aggregate([
      { $match: ngoFilter({ programId: new mongoose.Types.ObjectId(String(id)) }) },
      { $unwind: '$entries' },
      {
        $group: {
          _id: null,
          present: { $sum: { $cond: [{ $eq: ['$entries.status', 'present'] }, 1, 0] } },
          absent: { $sum: { $cond: [{ $eq: ['$entries.status', 'absent'] }, 1, 0] } },
          excused: { $sum: { $cond: [{ $eq: ['$entries.status', 'excused'] }, 1, 0] } },
          total: { $sum: 1 }
        }
      }
    ]),
    ProgramEnrollment.find(ngoFilter({ programId: id }))
      .populate('studentId', 'registrationNumber firstName lastName email phone status')
      .sort({ enrolledAt: -1 })
      .limit(10)
      .lean({ virtuals: true }),
    AttendanceSession.find(ngoFilter({ programId: id }))
      .populate('recordedBy', 'firstName lastName email')
      .sort({ sessionDate: -1 })
      .limit(5)
      .lean()
  ]);

  const attAgg = attendanceStats[0] || { present: 0, absent: 0, excused: 0, total: 0 };
  const presenceDenom = attAgg.present + attAgg.absent;
  const presenceRate = presenceDenom > 0 ? Math.round((attAgg.present / presenceDenom) * 100) : 0;
  const availableSeats = program.capacity != null ? Math.max(0, program.capacity - enrolledCount) : null;
  const isFull = program.capacity != null ? enrolledCount >= program.capacity : false;

  const stats = {
    enrolledCount,
    completedCount,
    withdrawnCount,
    totalEnrollments: enrolledCount + completedCount + withdrawnCount,
    capacity: program.capacity || null,
    availableSeats,
    isFull,
    totalSessions: sessionsCount,
    attendance: {
      totalEntries: attAgg.total,
      presentCount: attAgg.present,
      absentCount: attAgg.absent,
      excusedCount: attAgg.excused,
      presenceRate
    }
  };

  const doc = program.toObject({ virtuals: true });
  return {
    ...doc,
    stats,
    enrolledCount,
    completedCount,
    withdrawnCount,
    totalEnrollments: enrolledCount + completedCount + withdrawnCount,
    availableSeats,
    isFull,
    totalSessions: sessionsCount,
    attendance: stats.attendance,
    recentEnrollments,
    recentAttendance,
    program: doc
  };
};

/**
 * Update an existing program (Admin only)
 */
const updateProgram = async (id, data, currentUser, ngoFilter) => {
  const program = await Program.findOne(ngoFilter({ _id: id }));
  if (!program) {
    const error = new Error(`Program with ID '${id}' not found.`);
    error.statusCode = 404;
    throw error;
  }

  // 1. If code is changed, check uniqueness
  if (data.code && data.code.trim().toUpperCase() !== program.code) {
    const cleanCode = data.code.trim().toUpperCase();
    const existing = await Program.findOne(ngoFilter({ code: cleanCode, _id: { $ne: id } }));
    if (existing) {
      const error = new Error(`Program with code '${cleanCode}' already exists.`);
      error.statusCode = 409;
      throw error;
    }
    data.code = cleanCode;
  }

  // 2. Validate assignments if any were provided
  const targetCoordinator = data.coordinator !== undefined 
    ? data.coordinator 
    : data.coordinatorId !== undefined 
      ? data.coordinatorId 
      : program.coordinator;
  const targetStaff = data.assignedStaff !== undefined ? data.assignedStaff : program.assignedStaff;
  const targetVolunteers = data.assignedVolunteers !== undefined ? data.assignedVolunteers : program.assignedVolunteers;

  await validateAssignments({
    coordinator: targetCoordinator,
    assignedStaff: targetStaff,
    assignedVolunteers: targetVolunteers
  }, ngoFilter);

  // 3. Validate capacity change against active enrollments
  if (data.capacity !== undefined && data.capacity !== null) {
    const newCap = parseInt(data.capacity, 10);
    if (!isNaN(newCap) && newCap > 0) {
      const currentEnrolled = await ProgramEnrollment.countDocuments(
        ngoFilter({ programId: id, status: 'enrolled' })
      );
      if (newCap < currentEnrolled) {
        const error = new Error(
          `Capacity cannot be reduced below the current active enrollment count (${currentEnrolled} currently enrolled).`
        );
        error.statusCode = 400;
        throw error;
      }
    }
  }

  // 4. Handle customAttributes update properly if provided
  if (data.customAttributes !== undefined) {
    program.customAttributes = data.customAttributes;
  }

  // 5. Update fields
  Object.keys(data).forEach((key) => {
    if (key !== 'customAttributes' && key !== 'ngoId' && data[key] !== undefined) {
      if (key === 'type' && typeof data[key] === 'string') {
        program[key] = data[key].trim().toLowerCase();
      } else {
        program[key] = data[key];
      }
    }
  });

  await program.save();

  await program.populate([
    { path: 'coordinator', select: 'email firstName lastName role isActive avatar' },
    { path: 'assignedStaff', select: 'email firstName lastName role isActive avatar' },
    { path: 'assignedVolunteers', select: 'email firstName lastName role isActive avatar' },
    { path: 'createdBy', select: 'email firstName lastName role' }
  ]);

  logger.info(`Program updated: [${program.code}] ${program.name}`);
  return program;
};

/**
 * Soft update program status (Admin only)
 */
const updateProgramStatus = async (id, status, currentUser, ngoFilter) => {
  const program = await Program.findOne(ngoFilter({ _id: id }));
  if (!program) {
    const error = new Error(`Program with ID '${id}' not found.`);
    error.statusCode = 404;
    throw error;
  }

  program.status = status;
  await program.save();

  await program.populate([
    { path: 'coordinator', select: 'email firstName lastName role isActive avatar' },
    { path: 'assignedStaff', select: 'email firstName lastName role isActive avatar' },
    { path: 'assignedVolunteers', select: 'email firstName lastName role isActive avatar' },
    { path: 'createdBy', select: 'email firstName lastName role' }
  ]);

  logger.info(`Program status updated: [${program.code}] -> ${status}`);
  return program;
};

/**
 * Safe Program Deletion Guard
 * Blocks permanent deletion if program enrollments, attendance records, or audit history exist.
 * Clean programs without history can be permanently deleted.
 */
const deleteProgram = async (id, currentUser, ngoFilter) => {
  const program = await Program.findOne(ngoFilter({ _id: id }));
  if (!program) {
    const error = new Error(`Program with ID '${id}' not found.`);
    error.statusCode = 404;
    throw error;
  }

  // Check historical dependencies (operational activity beyond creation)
  const [enrollmentCount, sessionCount, operationalAuditCount] = await Promise.all([
    ProgramEnrollment.countDocuments(ngoFilter({ programId: id })),
    AttendanceSession.countDocuments(ngoFilter({ programId: id })),
    AuditLog.countDocuments({ entityId: String(id), action: { $ne: 'create' } })
  ]);

  if (enrollmentCount > 0 || sessionCount > 0 || operationalAuditCount > 0) {
    const error = new Error(
      'Cannot permanently delete program with existing enrollments, attendance records, or audit history. Please set status to \'completed\' or \'cancelled\' to safely archive or close this program.'
    );
    error.statusCode = 400;
    throw error;
  }

  await Program.deleteOne({ _id: id });
  await AuditLog.deleteMany({ entityId: String(id) });
  logger.info(`Program permanently deleted (clean record with no history): [${program.code}] ${program.name}`);
  return { success: true, programId: id };
};

/**
 * Assign a staff member to a program
 */
const assignStaffMember = async (id, staffId, currentUser, ngoFilter) => {
  const program = await Program.findOne(ngoFilter({ _id: id }));
  if (!program) {
    const error = new Error(`Program with ID '${id}' not found.`);
    error.statusCode = 404;
    throw error;
  }

  const staffUser = await User.findOne(ngoFilter({ _id: staffId }));
  if (!staffUser) {
    const error = new Error(`User with ID '${staffId}' not found in this organization.`);
    error.statusCode = 404;
    throw error;
  }

  if (!staffUser.isActive) {
    const error = new Error(`Staff member '${staffUser.email}' is inactive. Inactive users cannot be assigned.`);
    error.statusCode = 400;
    throw error;
  }

  if (!['staff', 'admin', 'ngo_admin'].includes(staffUser.role)) {
    const error = new Error(
      `Assigned staff must have the 'staff' or 'admin' role. User '${staffUser.email}' has role '${staffUser.role}'.`
    );
    error.statusCode = 400;
    throw error;
  }

  const isAlreadyAssigned = (program.assignedStaff || []).some((sid) => String(sid) === String(staffId));
  if (isAlreadyAssigned) {
    const error = new Error(`Staff member '${staffUser.email}' is already assigned to this program.`);
    error.statusCode = 409;
    throw error;
  }

  program.assignedStaff.push(staffUser._id);
  await program.save();

  await program.populate([
    { path: 'coordinator', select: 'email firstName lastName role isActive avatar' },
    { path: 'assignedStaff', select: 'email firstName lastName role isActive avatar' },
    { path: 'assignedVolunteers', select: 'email firstName lastName role isActive avatar' },
    { path: 'createdBy', select: 'email firstName lastName role' }
  ]);

  logger.info(`Staff member ${staffUser.email} assigned to program [${program.code}]`);
  return program;
};

/**
 * Remove a staff member from a program
 */
const removeStaffMember = async (id, staffId, currentUser, ngoFilter) => {
  const program = await Program.findOne(ngoFilter({ _id: id }));
  if (!program) {
    const error = new Error(`Program with ID '${id}' not found.`);
    error.statusCode = 404;
    throw error;
  }

  const staffIndex = (program.assignedStaff || []).findIndex((sid) => String(sid) === String(staffId));
  if (staffIndex === -1) {
    const error = new Error(`Staff member with ID '${staffId}' is not assigned to this program.`);
    error.statusCode = 404;
    throw error;
  }

  program.assignedStaff.splice(staffIndex, 1);
  await program.save();

  await program.populate([
    { path: 'coordinator', select: 'email firstName lastName role isActive avatar' },
    { path: 'assignedStaff', select: 'email firstName lastName role isActive avatar' },
    { path: 'assignedVolunteers', select: 'email firstName lastName role isActive avatar' },
    { path: 'createdBy', select: 'email firstName lastName role' }
  ]);

  logger.info(`Staff member ${staffId} removed from program [${program.code}]`);
  return program;
};

module.exports = {
  listPrograms,
  createProgram,
  getProgramById,
  updateProgram,
  updateProgramStatus,
  deleteProgram,
  assignStaffMember,
  removeStaffMember,
  validateAssignments
};

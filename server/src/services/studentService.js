const Student = require('../models/Student');
const User = require('../models/User');
const ProgramEnrollment = require('../models/ProgramEnrollment');
const AttendanceSession = require('../models/AttendanceSession');
const AuditLog = require('../models/AuditLog');
const dataAssistantService = require('./dataAssistantService');
const dataQualityService = require('./dataQualityService');
const logger = require('../utils/logger');

/**
 * List students with search, filter, sorting and pagination
 */
const listStudents = async (
  {
    page = 1,
    limit = 10,
    search = '',
    status = 'all',
    gender = 'all',
    state = '',
    pinCode = '',
    programId = '',
    sortBy = 'createdAt',
    sortOrder = 'desc'
  },
  currentUser,
  ngoFilter
) => {
  const query = ngoFilter({});

  // Role restriction: Students can only view their own linked record
  if (currentUser && currentUser.role === 'student') {
    query.userId = currentUser._id;
  }

  // 1. Text search across registrationNumber, names, email, phone, and schoolName
  if (search && search.trim() !== '') {
    const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const searchRegex = new RegExp(escaped, 'i');
    query.$or = [
      { registrationNumber: searchRegex },
      { firstName: searchRegex },
      { lastName: searchRegex },
      { email: searchRegex },
      { phone: searchRegex },
      { schoolName: searchRegex }
    ];
  }

  // 2. Status filter
  if (status && status !== 'all') {
    query.status = status;
  }

  // 3. Gender filter
  if (gender && gender !== 'all') {
    query.gender = gender;
  }

  // 4. State filter
  if (state && state !== 'all' && state.trim() !== '') {
    const escapedState = state.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    query.state = new RegExp(`^${escapedState}$`, 'i');
  }

  // 5. PIN code filter
  if (pinCode && pinCode.trim() !== '') {
    query.pinCode = pinCode.trim();
  }

  // 6. Program enrollment filter
  if (programId && programId.trim() !== '') {
    const enrollments = await ProgramEnrollment.find(
      ngoFilter({ programId: programId.trim(), status: { $in: ['enrolled', 'completed'] } })
    )
      .select('studentId')
      .lean();
    const studentIds = enrollments.map((e) => e.studentId);
    query._id = { $in: studentIds };
  }

  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 10;

  const totalStudents = await Student.countDocuments(query);
  const totalPages = Math.ceil(totalStudents / limitNum) || 1;
  const skip = (pageNum - 1) * limitNum;

  const sortDirection = sortOrder === 'asc' ? 1 : -1;
  let sortOptions = {};
  if (sortBy === 'name') {
    sortOptions = { firstName: sortDirection, lastName: sortDirection };
  } else if (sortBy === 'registrationDate') {
    sortOptions = { createdAt: sortDirection };
  } else if (sortBy === 'lastUpdatedDate') {
    sortOptions = { updatedAt: sortDirection };
  } else {
    sortOptions = { [sortBy]: sortDirection };
  }

  const students = await Student.find(query)
    .populate('userId', 'email firstName lastName role isActive lastLogin')
    .sort(sortOptions)
    .skip(skip)
    .limit(limitNum)
    .lean({ virtuals: true });
  students.forEach((student) => { delete student.__v; });

  return {
    students,
    pagination: {
      totalStudents,
      totalPages,
      currentPage: pageNum,
      limit: limitNum,
      hasNextPage: pageNum < totalPages,
      hasPrevPage: pageNum > 1
    }
  };
};

/**
 * Pre-save duplicate check against existing NGO records
 */
const checkDuplicate = async (data, ngoFilter) => {
  const candidates = [];
  const cleanRegNo = data.registrationNumber ? data.registrationNumber.trim().toUpperCase() : '';

  // 1. Exact registration number collision
  if (cleanRegNo) {
    const existingReg = await Student.findOne(
      ngoFilter({
        registrationNumber: cleanRegNo,
        ...(data.excludeId ? { _id: { $ne: data.excludeId } } : {})
      })
    ).lean();
    if (existingReg) {
      candidates.push({
        recordId: existingReg._id,
        registrationNumber: existingReg.registrationNumber,
        name: `${existingReg.firstName} ${existingReg.lastName}`,
        score: 1.0,
        confidence: 'high',
        reason: `Identical registration number '${cleanRegNo}' is already registered`,
        matchedFields: ['registrationNumber']
      });
    }
  }

  // 2. Multi-factor duplicate candidate detection (phone, email, name, DOB)
  const candidateRecord = {
    _id: data.excludeId || 'candidate_temp_id',
    firstName: data.firstName || '',
    lastName: data.lastName || '',
    email: data.email || '',
    phone: data.phone || '',
    dateOfBirth: data.dateOfBirth || null
  };

  const existingPool = await Student.find(
    ngoFilter({
      ...(data.excludeId ? { _id: { $ne: data.excludeId } } : {})
    })
  )
    .select('registrationNumber firstName lastName email phone dateOfBirth address state pinCode status')
    .limit(200)
    .lean();

  for (const existing of existingPool) {
    // Fast path: exact phone match
    if (candidateRecord.phone && existing.phone && candidateRecord.phone === existing.phone) {
      if (!candidates.some((c) => String(c.recordId) === String(existing._id))) {
        candidates.push({
          recordId: existing._id,
          registrationNumber: existing.registrationNumber,
          name: `${existing.firstName} ${existing.lastName}`,
          score: 0.95,
          confidence: 'high',
          reason: 'Identical phone number match',
          matchedFields: ['phone']
        });
        continue;
      }
    }

    // Similarity scoring using dataAssistantService.scorePair
    try {
      const match = dataAssistantService.scorePair('students', candidateRecord, existing);
      if (match && match.isMatch) {
        if (!candidates.some((c) => String(c.recordId) === String(existing._id))) {
          candidates.push({
            recordId: existing._id,
            registrationNumber: existing.registrationNumber,
            name: `${existing.firstName} ${existing.lastName}`,
            score: match.score || 0.85,
            confidence: match.confidence || 'medium',
            reason: match.reason || 'High demographic similarity detected',
            matchedFields: match.matchedFields || ['name']
          });
        }
      }
    } catch (pairErr) {
      logger.warn(`scorePair error during checkDuplicate: ${pairErr.message}`);
    }
  }

  return {
    isDuplicate: candidates.length > 0,
    candidateCount: candidates.length,
    candidates
  };
};

/**
 * Create a new student profile
 */
const createStudent = async (data, createdById, ngoId, ngoFilter) => {
  const cleanRegNo = data.registrationNumber.trim().toUpperCase();

  // Check unique registrationNumber
  const existing = await Student.findOne(ngoFilter({ registrationNumber: cleanRegNo }));
  if (existing) {
    const error = new Error(`Student with registration number '${cleanRegNo}' already exists.`);
    error.statusCode = 409;
    throw error;
  }

  // If userId is provided, verify user account existence
  if (data.userId) {
    const userDoc = await User.findOne(ngoFilter({ _id: data.userId }));
    if (!userDoc) {
      const error = new Error('Specified user account does not exist.');
      error.statusCode = 404;
      throw error;
    }
  }

  const parseFlexibleDate = (val) => {
    if (!val) return val;
    if (val instanceof Date) return val;
    const str = String(val).trim();
    const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (dmyMatch) {
      const day = parseInt(dmyMatch[1], 10);
      const month = parseInt(dmyMatch[2], 10);
      const year = parseInt(dmyMatch[3], 10);
      return new Date(Date.UTC(year, month - 1, day));
    }
    return val;
  };

  const normalizePhone = (val) => {
    if (!val) return val;
    const cleaned = String(val).replace(/[\s\-\(\)\.]/g, '');
    let digits = cleaned;
    if (digits.startsWith('+91')) digits = digits.slice(3);
    else if (digits.startsWith('91') && digits.length === 12) digits = digits.slice(2);
    else if (digits.startsWith('0') && digits.length === 11) digits = digits.slice(1);
    if (/^[6-9]\d{9}$/.test(digits)) {
      return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
    }
    return val;
  };

  const newStudent = await Student.create({
    ...data,
    phone: normalizePhone(data.phone),
    dateOfBirth: parseFlexibleDate(data.dateOfBirth),
    ngoId,
    registrationNumber: cleanRegNo,
    createdBy: createdById
  });

  await newStudent.populate('userId', 'email firstName lastName role isActive lastLogin');

  logger.info(`Student created: ${newStudent.registrationNumber} - ${newStudent.firstName} ${newStudent.lastName}`);
  return newStudent;
};

/**
 * Retrieve student profile by ID with role check and rich lifecycle data:
 * - Program Enrollments
 * - Attendance summary & recent sessions
 * - Deterministic Data Quality Index (DQI)
 * - Potential Duplicate Warnings
 * - Audit History timeline
 */
const getStudentById = async (id, currentUser, ngoFilter) => {
  const student = await Student.findOne(ngoFilter({ _id: id })).populate(
    'userId',
    'email firstName lastName role isActive lastLogin'
  );

  if (!student) {
    const error = new Error('Student not found');
    error.statusCode = 404;
    throw error;
  }

  // Student role can ONLY view their own linked student profile
  if (currentUser && currentUser.role === 'student') {
    const isOwner =
      student.userId &&
      (student.userId._id.toString() === currentUser._id.toString() ||
        student.userId.id?.toString() === currentUser._id.toString());

    if (!isOwner) {
      const error = new Error('Access denied. You are only authorized to view your own student profile.');
      error.statusCode = 403;
      throw error;
    }
  }

  // 1. Program Enrollments
  const enrollments = await ProgramEnrollment.find(ngoFilter({ studentId: id }))
    .populate('programId', 'name code type category status startDate endDate capacity coordinator')
    .sort({ enrolledAt: -1 })
    .lean();

  // 2. Attendance History & Summary
  const attendanceSessions = await AttendanceSession.find(ngoFilter({ 'entries.studentId': id }))
    .populate('programId', 'name code')
    .sort({ sessionDate: -1 })
    .limit(30)
    .lean();

  let presentCount = 0;
  let absentCount = 0;
  let excusedCount = 0;
  const recentAttendance = [];

  for (const session of attendanceSessions) {
    const entry = (session.entries || []).find((e) => String(e.studentId) === String(id));
    if (entry) {
      if (entry.status === 'present') presentCount++;
      else if (entry.status === 'absent') absentCount++;
      else if (entry.status === 'excused') excusedCount++;
      recentAttendance.push({
        sessionId: session._id,
        programId: session.programId?._id || session.programId,
        programName: session.programId?.name || 'Unknown Program',
        programCode: session.programId?.code || '',
        sessionDate: session.sessionDate,
        status: entry.status,
        note: entry.note || ''
      });
    }
  }
  const presenceRate =
    presentCount + absentCount > 0 ? Math.round((presentCount / (presentCount + absentCount)) * 100) : 0;

  // 3. Data Quality (DQI) & Deterministic Findings
  let dqi = null;
  let recordFlags = [];
  try {
    const rawStudent = student.toObject ? student.toObject() : student;
    recordFlags = dataAssistantService.buildRecordFlags('students', rawStudent) || [];
    dqi = dataQualityService.calculateRecordDQI('students', rawStudent, recordFlags);
  } catch (dqiErr) {
    logger.warn(`Could not compute DQI for student ${id}: ${dqiErr.message}`);
  }

  // 4. Duplicate Warnings
  let duplicates = [];
  try {
    const rawStudent = student.toObject ? student.toObject() : student;
    const otherStudents = await Student.find(ngoFilter({ _id: { $ne: id } }))
      .select('registrationNumber firstName lastName email phone dateOfBirth')
      .limit(100)
      .lean();
    for (const other of otherStudents) {
      const match = dataAssistantService.scorePair('students', rawStudent, other);
      if (match && match.isMatch) {
        duplicates.push({
          recordId: other._id,
          registrationNumber: other.registrationNumber || '',
          name: `${other.firstName} ${other.lastName}`,
          score: match.score || 0.85,
          confidence: match.confidence || 'medium',
          reason: match.reason || 'High demographic similarity detected',
          matchedFields: match.matchedFields || ['name']
        });
      }
    }
  } catch (dupErr) {
    logger.warn(`Could not compute duplicate warnings for student ${id}: ${dupErr.message}`);
  }

  // 5. Audit History
  let auditLogs = [];
  try {
    auditLogs = await AuditLog.find(ngoFilter({ entityId: String(id) }))
      .populate('actorId', 'firstName lastName email role')
      .sort({ createdAt: -1 })
      .limit(15)
      .lean();
  } catch (auditErr) {
    logger.warn(`Could not load audit logs for student ${id}: ${auditErr.message}`);
  }

  return {
    student,
    enrollments,
    attendance: {
      totalSessions: attendanceSessions.length,
      presentCount,
      absentCount,
      excusedCount,
      presenceRate,
      recent: recentAttendance
    },
    dataQuality: {
      ...dqi,
      findings: recordFlags
    },
    duplicates,
    auditLogs
  };
};

/**
 * Retrieve student profile for currently logged in student user
 */
const getMyStudentProfile = async (currentUserId, ngoFilter) => {
  const student = await Student.findOne(ngoFilter({ userId: currentUserId })).populate(
    'userId',
    'email firstName lastName role isActive lastLogin'
  );

  if (!student) {
    const error = new Error('No student record is linked to your user account.');
    error.statusCode = 404;
    throw error;
  }

  return getStudentById(student._id, { role: 'student', _id: currentUserId }, ngoFilter);
};

/**
 * Update student profile details
 */
const updateStudent = async (id, data, ngoFilter) => {
  const student = await Student.findOne(ngoFilter({ _id: id }));

  if (!student) {
    const error = new Error('Student not found');
    error.statusCode = 404;
    throw error;
  }

  const modifiedFields = [];

  // If registration number is changing, verify uniqueness
  if (data.registrationNumber) {
    const cleanRegNo = data.registrationNumber.trim().toUpperCase();
    if (cleanRegNo !== student.registrationNumber) {
      const conflict = await Student.findOne(
        ngoFilter({
          registrationNumber: cleanRegNo,
          _id: { $ne: id }
        })
      );
      if (conflict) {
        const error = new Error(`Student with registration number '${cleanRegNo}' already exists.`);
        error.statusCode = 409;
        throw error;
      }
      student.registrationNumber = cleanRegNo;
      modifiedFields.push('registrationNumber');
    }
  }

  // If userId is changing, verify existence
  if (data.userId !== undefined && data.userId !== null) {
    const userDoc = await User.findOne(ngoFilter({ _id: data.userId }));
    if (!userDoc) {
      const error = new Error('Specified user account does not exist.');
      error.statusCode = 404;
      throw error;
    }
    if (String(student.userId) !== String(data.userId)) {
      student.userId = data.userId;
      modifiedFields.push('userId');
    }
  } else if (data.userId === null) {
    if (student.userId !== null) {
      student.userId = null;
      modifiedFields.push('userId');
    }
  }

  // Update remaining fields
  const updatableFields = [
    'firstName',
    'lastName',
    'dateOfBirth',
    'gender',
    'email',
    'phone',
    'address',
    'pinCode',
    'state',
    'guardianName',
    'guardianRelationship',
    'educationLevel',
    'schoolName',
    'status',
    'notes'
  ];

  updatableFields.forEach((field) => {
    if (data[field] !== undefined) {
      if (field === 'phone' && data[field]) {
        const cleaned = String(data[field]).replace(/[\s\-\(\)\.]/g, '');
        let digits = cleaned;
        if (digits.startsWith('+91')) digits = digits.slice(3);
        else if (digits.startsWith('91') && digits.length === 12) digits = digits.slice(2);
        else if (digits.startsWith('0') && digits.length === 11) digits = digits.slice(1);
        if (/^[6-9]\d{9}$/.test(digits)) {
          const formatted = `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
          if (student[field] !== formatted) {
            student[field] = formatted;
            modifiedFields.push(field);
          }
          return;
        }
      }
      if (field === 'dateOfBirth') {
        const val = data[field];
        if (val && typeof val === 'string') {
          const dmyMatch = val.trim().match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
          if (dmyMatch) {
            const day = parseInt(dmyMatch[1], 10);
            const month = parseInt(dmyMatch[2], 10);
            const year = parseInt(dmyMatch[3], 10);
            student[field] = new Date(Date.UTC(year, month - 1, day));
            modifiedFields.push(field);
            return;
          }
        }
      }
      if (student[field] !== data[field]) {
        student[field] = data[field];
        modifiedFields.push(field);
      }
    }
  });

  await student.save();
  await student.populate('userId', 'email firstName lastName role isActive lastLogin');

  logger.info(`Student updated: ${student.registrationNumber} - ${student.firstName} ${student.lastName}`);
  student.modifiedFields = modifiedFields;
  student.student = student;
  return student;
};

/**
 * Update student status (active, graduated, transferred, inactive)
 */
const updateStudentStatus = async (id, status, ngoFilter) => {
  const student = await Student.findOne(ngoFilter({ _id: id }));

  if (!student) {
    const error = new Error('Student not found');
    error.statusCode = 404;
    throw error;
  }

  student.status = status;
  await student.save();
  await student.populate('userId', 'email firstName lastName role isActive lastLogin');

  logger.info(`Student status updated: ${student.registrationNumber} -> ${student.status}`);
  return student;
};

/**
 * Delete student record with safe dependency guard:
 * Blocks deletion if the beneficiary has existing program enrollments,
 * attendance records, or audit history.
 */
const deleteStudent = async (id, ngoFilter) => {
  const student = await Student.findOne(ngoFilter({ _id: id }));

  if (!student) {
    const error = new Error('Student not found');
    error.statusCode = 404;
    throw error;
  }

  // Safety Guard: Check if student has associated program enrollments, attendance, or audit history
  const [enrollmentCount, attendanceCount, auditCount] = await Promise.all([
    ProgramEnrollment.countDocuments(ngoFilter({ studentId: id })),
    AttendanceSession.countDocuments(ngoFilter({ 'entries.studentId': id })),
    AuditLog.countDocuments(ngoFilter({ entityType: 'student', entityId: String(id) }))
  ]);

  if (enrollmentCount > 0 || attendanceCount > 0 || auditCount > 0) {
    const error = new Error(
      'Cannot permanently delete beneficiary with existing program enrollments, attendance records, or audit history. Please set status to \'inactive\' to safely deactivate or archive this record.'
    );
    error.statusCode = 400;
    error.details = { enrollmentCount, attendanceCount, auditCount };
    throw error;
  }

  await Student.deleteOne(ngoFilter({ _id: id }));
  logger.info(`Student permanently deleted (clean record with no history): ${student.registrationNumber} [${id}]`);
  return { success: true, message: 'Student record deleted successfully', studentId: id };
};

module.exports = {
  listStudents,
  checkDuplicate,
  createStudent,
  getStudentById,
  getMyStudentProfile,
  updateStudent,
  updateStudentStatus,
  deleteStudent
};
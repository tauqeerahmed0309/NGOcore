const AttendanceSession = require('../models/AttendanceSession');
const Program = require('../models/Program');
const ProgramEnrollment = require('../models/ProgramEnrollment');
const Student = require('../models/Student');

const httpError = (statusCode, message) => Object.assign(new Error(message), { statusCode });

const getProgram = async (programId, ngoFilter) => {
  const program = await Program.findOne(ngoFilter({ _id: programId })).select('status capacity').lean();
  if (!program) throw httpError(404, 'Program not found.');
  return program;
};

const makePagination = (totalItems, page, limit) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));
  return {
    totalItems,
    totalPages,
    currentPage: page,
    limit,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1
  };
};

const listEnrollments = async (programId, { page = 1, limit = 100 }, ngoFilter) => {
  await getProgram(programId, ngoFilter);
  const query = ngoFilter({ programId, status: { $ne: 'withdrawn' } });
  const [totalItems, enrollments] = await Promise.all([
    ProgramEnrollment.countDocuments(query),
    ProgramEnrollment.find(query)
    .populate('studentId', 'registrationNumber firstName lastName email status userId')
      .sort({ enrolledAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean({ virtuals: true })
  ]);
  return { enrollments, pagination: makePagination(totalItems, page, limit) };
};

const enrollStudent = async (programId, studentId, ngoId, ngoFilter, enrolledById = null) => {
  const [program, student] = await Promise.all([
    getProgram(programId, ngoFilter),
    Student.findOne(ngoFilter({ _id: studentId, status: 'active' }))
  ]);
  if (!student) throw httpError(404, 'Active student record not found in this organization.');
  if (program.status !== 'active') throw httpError(400, 'Only active programs can accept enrollments.');

  // Pre-creation capacity verification
  const currentCount = await ProgramEnrollment.countDocuments(ngoFilter({
    programId,
    status: 'enrolled'
  }));
  if (program.capacity && currentCount >= program.capacity) {
    throw httpError(409, 'This program has reached its enrollment capacity.');
  }

  const existing = await ProgramEnrollment.findOne(ngoFilter({ programId, studentId }));
  let enrollment;

  if (existing) {
    if (existing.status === 'enrolled') {
      throw httpError(409, 'Student is already enrolled in this program.');
    }
    // Reactivate previous withdrawn or completed enrollment
    existing.status = 'enrolled';
    existing.enrolledAt = new Date();
    existing.withdrawnAt = null;
    existing.withdrawalReason = '';
    existing.enrolledBy = enrolledById;
    await existing.save();
    enrollment = existing;
  } else {
    enrollment = await ProgramEnrollment.create({
      ngoId,
      programId,
      studentId,
      enrolledBy: enrolledById
    });
  }

  // Post-creation concurrency verification:
  // If concurrent requests raced, re-verify total active enrollments against capacity
  if (program.capacity) {
    const postCount = await ProgramEnrollment.countDocuments(ngoFilter({
      programId,
      status: 'enrolled'
    }));
    if (postCount > program.capacity) {
      // Revert the enrollment to prevent oversubscription
      if (!existing) {
        await ProgramEnrollment.deleteOne({ _id: enrollment._id });
      } else {
        existing.status = 'withdrawn';
        existing.withdrawnAt = new Date();
        existing.withdrawalReason = 'Capacity exceeded during concurrent enrollment';
        await existing.save();
      }
      throw httpError(409, 'This program has reached its enrollment capacity.');
    }
  }

  return enrollment.populate('studentId', 'registrationNumber firstName lastName email status userId');
};

const changeEnrollmentStatus = async (programId, studentId, status, reason = '', ngoFilter) => {
  const updateData = { status };
  if (status === 'withdrawn') {
    updateData.withdrawnAt = new Date();
    updateData.withdrawalReason = reason || '';
  } else if (status === 'completed') {
    updateData.completedAt = new Date();
  } else if (status === 'enrolled') {
    updateData.withdrawnAt = null;
    updateData.withdrawalReason = '';
  }

  const enrollment = await ProgramEnrollment.findOneAndUpdate(
    ngoFilter({ programId, studentId }),
    { $set: updateData },
    { returnDocument: 'after', runValidators: true }
  ).populate('studentId', 'registrationNumber firstName lastName email status userId');
  if (!enrollment) throw httpError(404, 'Program enrollment not found.');
  return enrollment;
};

const getAttendance = async (programId, date, ngoFilter) => {
  await getProgram(programId, ngoFilter);
  const sessionDate = new Date(`${date}T00:00:00.000Z`);
  const enrolledQuery = ngoFilter({ programId, status: 'enrolled' });
  const enrollmentCount = await ProgramEnrollment.countDocuments(enrolledQuery);
  if (enrollmentCount > 1000) {
    throw httpError(413, 'Attendance rosters are limited to 1,000 enrolled students per session.');
  }
  const [enrollments, session] = await Promise.all([
    ProgramEnrollment.find(enrolledQuery)
      .populate('studentId', 'registrationNumber firstName lastName')
      .sort({ enrolledAt: 1 })
      .limit(1000)
      .lean({ virtuals: true }),
    AttendanceSession.findOne(ngoFilter({ programId, sessionDate })).lean()
  ]);
  const entriesByStudentId = new Map(
    (session?.entries || []).map((entry) => [String(entry.studentId), entry])
  );
  const roster = enrollments.map(({ studentId }) => {
    const entry = entriesByStudentId.get(String(studentId._id));
    return {
      student: studentId,
      status: entry?.status || '',
      note: entry?.note || ''
    };
  });
  return { date, roster, recordedAt: session?.updatedAt || null };
};

const getAttendanceHistory = async (programId, { page = 1, limit = 50 }, ngoFilter) => {
  await getProgram(programId, ngoFilter);
  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 50;
  const skip = (pageNum - 1) * limitNum;

  const query = ngoFilter({ programId });
  const [totalSessions, rawSessions, overallAgg] = await Promise.all([
    AttendanceSession.countDocuments(query),
    AttendanceSession.find(query)
      .populate('recordedBy', 'firstName lastName email role')
      .sort({ sessionDate: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    AttendanceSession.aggregate([
      { $match: ngoFilter({ programId: new Program.base.Types.ObjectId(String(programId)) }) },
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
    ])
  ]);

  const sessions = rawSessions.map((s) => {
    const present = s.entries.filter((e) => e.status === 'present').length;
    const absent = s.entries.filter((e) => e.status === 'absent').length;
    const excused = s.entries.filter((e) => e.status === 'excused').length;
    const total = s.entries.length;
    const denom = present + absent;
    const presenceRate = denom > 0 ? Math.round((present / denom) * 100) : 0;
    return {
      id: s._id,
      sessionDate: s.sessionDate ? s.sessionDate.toISOString().slice(0, 10) : null,
      presentCount: present,
      absentCount: absent,
      excusedCount: excused,
      totalEntries: total,
      presenceRate,
      recordedBy: s.recordedBy,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt
    };
  });

  const totals = overallAgg[0] || { present: 0, absent: 0, excused: 0, total: 0 };
  const overallDenom = totals.present + totals.absent;
  const overallPresenceRate = overallDenom > 0 ? Math.round((totals.present / overallDenom) * 100) : 0;

  const overallStats = {
    totalSessions,
    totalEntries: totals.total,
    presentCount: totals.present,
    absentCount: totals.absent,
    excusedCount: totals.excused,
    presenceRate: overallPresenceRate,
    overallPresenceRate
  };

  return {
    sessions,
    pagination: makePagination(totalSessions, pageNum, limitNum),
    overallStats,
    stats: overallStats
  };
};

const saveAttendance = async (programId, date, entries, userId, ngoId, ngoFilter) => {
  await getProgram(programId, ngoFilter);
  const sessionDate = new Date(`${date}T00:00:00.000Z`);

  // Prevent duplicate students within the same session payload
  const studentIds = entries.map(({ studentId }) => String(studentId));
  const uniqueStudentIds = new Set(studentIds);
  if (uniqueStudentIds.size !== studentIds.length) {
    throw httpError(400, 'Attendance entries cannot contain duplicate students for the same session.');
  }

  const enrollmentIds = await ProgramEnrollment.find(ngoFilter({
    programId,
    status: 'enrolled',
    studentId: { $in: entries.map(({ studentId }) => studentId) }
  })).distinct('studentId');
  if (enrollmentIds.length !== entries.length) {
    throw httpError(400, 'Attendance can only be recorded for currently enrolled students.');
  }
  const session = await AttendanceSession.findOneAndUpdate(
    ngoFilter({ programId, sessionDate }),
    {
      $set: {
        ngoId,
        programId,
        sessionDate,
        entries,
        recordedBy: userId
      }
    },
    { upsert: true, returnDocument: 'after', runValidators: true, setDefaultsOnInsert: true }
  );
  return session;
};

const getMyEnrollments = async (userId, { page = 1, limit = 100 }, ngoFilter) => {
  const student = await Student.findOne(ngoFilter({ userId })).select('_id').lean();
  if (!student) throw httpError(404, 'No student record is linked to your account.');
  const query = ngoFilter({ studentId: student._id, status: { $ne: 'withdrawn' } });
  const [totalItems, enrollments] = await Promise.all([
    ProgramEnrollment.countDocuments(query),
    ProgramEnrollment.find(query)
      .populate('programId', 'name code type category description startDate endDate schedule location status')
      .sort({ enrolledAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean({ virtuals: true })
  ]);
  return { enrollments, pagination: makePagination(totalItems, page, limit) };
};

module.exports = {
  listEnrollments,
  enrollStudent,
  changeEnrollmentStatus,
  getAttendance,
  getAttendanceHistory,
  saveAttendance,
  getMyEnrollments
};

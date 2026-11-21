const AttendanceSession = require('../models/AttendanceSession');
const Program = require('../models/Program');
const ProgramEnrollment = require('../models/ProgramEnrollment');
const Student = require('../models/Student');
const logger = require('../utils/logger');

const httpError = (statusCode, message) => Object.assign(new Error(message), { statusCode });

const getProgram = async (programId, ngoFilter) => {
  const program = await Program.findOne(ngoFilter({ _id: programId })).select('status capacity enrolledCount').lean();
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

const ensureEnrolledCountSynchronized = async (program, ngoFilter) => {
  if (program.enrolledCount === undefined || program.enrolledCount === null) {
    const trueCount = await ProgramEnrollment.countDocuments(
      ngoFilter({ programId: program._id, status: 'enrolled' })
    );
    // Conditional update: only sets enrolledCount if it is missing or null in DB
    await Program.updateOne(
      ngoFilter({
        _id: program._id,
        $or: [{ enrolledCount: { $exists: false } }, { enrolledCount: null }]
      }),
      { $set: { enrolledCount: trueCount } }
    );
    const fresh = await Program.findOne(ngoFilter({ _id: program._id })).select('enrolledCount').lean();
    program.enrolledCount = fresh?.enrolledCount ?? trueCount;
  }
  return program.enrolledCount;
};

const enrollStudent = async (programId, studentId, ngoId, ngoFilter, enrolledById = null) => {
  const [program, student] = await Promise.all([
    getProgram(programId, ngoFilter),
    Student.findOne(ngoFilter({ _id: studentId, status: 'active' }))
  ]);
  if (!student) throw httpError(404, 'Active student record not found in this organization.');
  if (program.status !== 'active') throw httpError(400, 'Only active programs can accept enrollments.');

  // Pre-check duplicate active enrollment
  const existing = await ProgramEnrollment.findOne(ngoFilter({ programId, studentId }));
  if (existing && existing.status === 'enrolled') {
    throw httpError(409, 'Student is already enrolled in this program.');
  }

  // Ensure program enrolledCount is synchronized before checking or reserving capacity
  await ensureEnrolledCountSynchronized(program, ngoFilter);

  // ATOMIC RESERVATION STRATEGY:
  // If program has finite capacity, atomically reserve a seat on the Program document.
  // Unsafe fallback `{ enrolledCount: { $exists: false } }` has been completely removed.
  let reserved = false;
  if (program.capacity !== null && program.capacity !== undefined) {
    // Immediate pre-check against synchronized counter
    if (program.enrolledCount >= program.capacity) {
      throw httpError(409, 'This program has reached its enrollment capacity.');
    }

    const reservationUpdate = await Program.findOneAndUpdate(
      ngoFilter({
        _id: programId,
        enrolledCount: { $lt: program.capacity }
      }),
      { $inc: { enrolledCount: 1 } },
      { returnDocument: 'after' }
    );

    if (!reservationUpdate) {
      const checkProg = await Program.findOne(ngoFilter({ _id: programId }));
      if (!checkProg) throw httpError(404, 'Program not found.');
      throw httpError(409, 'This program has reached its enrollment capacity.');
    }
    reserved = true;
  } else {
    await Program.updateOne(ngoFilter({ _id: programId }), { $inc: { enrolledCount: 1 } });
    reserved = true;
  }

  const now = new Date();
  let enrollment;
  try {
    if (existing) {
      // Re-enrollment of previously withdrawn or completed enrollment:
      // PRESERVE previous enrollment history without wiping it
      const historyEntry = {
        status: 'enrolled',
        changedAt: now,
        reason: 'Re-enrollment',
        changedBy: enrolledById
      };

      // Perform atomic CAS state transition on the enrollment document
      const updated = await ProgramEnrollment.findOneAndUpdate(
        ngoFilter({
          _id: existing._id,
          status: { $ne: 'enrolled' } // CAS guard: only if currently withdrawn or completed
        }),
        {
          $set: {
            status: 'enrolled',
            enrolledAt: now,
            withdrawnAt: null,
            withdrawalReason: '',
            completedAt: null,
            enrolledBy: enrolledById
          },
          $push: { history: historyEntry }
        },
        { returnDocument: 'after', runValidators: true }
      );

      if (!updated) {
        // Another concurrent request already re-enrolled this student!
        // Release reservation seat to prevent over-counting
        if (reserved) {
          await Program.updateOne(ngoFilter({ _id: programId, enrolledCount: { $gt: 0 } }), { $inc: { enrolledCount: -1 } });
        }
        throw httpError(409, 'Student is already enrolled in this program.');
      }
      enrollment = updated;
    } else {
      // New enrollment
      const historyEntry = {
        status: 'enrolled',
        changedAt: now,
        reason: 'Initial enrollment',
        changedBy: enrolledById
      };

      enrollment = await ProgramEnrollment.create({
        ngoId,
        programId,
        studentId,
        status: 'enrolled',
        enrolledAt: now,
        enrolledBy: enrolledById,
        history: [historyEntry]
      });
    }
  } catch (createErr) {
    // Release atomic reservation on document creation failure or collision
    if (reserved) {
      await Program.updateOne({ _id: programId, enrolledCount: { $gt: 0 } }, { $inc: { enrolledCount: -1 } });
    }
    throw createErr;
  }

  return enrollment.populate('studentId', 'registrationNumber firstName lastName email status userId');
};

const changeEnrollmentStatus = async (programId, studentId, status, reason = '', ngoFilter, userId = null) => {
  const current = await ProgramEnrollment.findOne(ngoFilter({ programId, studentId }));
  if (!current) throw httpError(404, 'Program enrollment not found.');

  // Idempotency: If already in target status, return consistently without altering counters or duplicate history
  if (current.status === status) {
    return current.populate('studentId', 'registrationNumber firstName lastName email status userId');
  }

  const now = new Date();

  // CASE 1: Transitioning AWAY from active 'enrolled' ('enrolled' -> 'withdrawn' OR 'enrolled' -> 'completed')
  if (current.status === 'enrolled' && (status === 'withdrawn' || status === 'completed')) {
    const historyEntry = {
      status,
      changedAt: now,
      reason: reason || (status === 'completed' ? 'Program completed' : 'Beneficiary withdrawn'),
      changedBy: userId
    };

    // CONDITIONAL ATOMIC CAS TRANSITION on ProgramEnrollment:
    // Only matches and updates if the document is still in 'enrolled' status at the instant of the write.
    const updatedEnrollment = await ProgramEnrollment.findOneAndUpdate(
      ngoFilter({
        programId,
        studentId,
        status: 'enrolled' // Atomic CAS condition: prevents double-withdrawals under concurrency
      }),
      {
        $set: {
          status,
          withdrawnAt: status === 'withdrawn' ? now : null,
          withdrawalReason: status === 'withdrawn' ? (reason || '') : '',
          completedAt: status === 'completed' ? now : null
        },
        $push: { history: historyEntry }
      },
      { returnDocument: 'after', runValidators: true }
    );

    if (updatedEnrollment) {
      // ONLY the request that successfully executed the atomic transition decrements the program counter
      try {
        await Program.updateOne(
          ngoFilter({ _id: programId, enrolledCount: { $gt: 0 } }),
          { $inc: { enrolledCount: -1 } }
        );
      } catch (counterErr) {
        // Recovery mechanism: If the subsequent program update fails, reconcile program counter
        logger.error(`Failed to decrement enrolledCount for program ${programId}: ${counterErr.message}`);
        const actualCount = await ProgramEnrollment.countDocuments(
          ngoFilter({ programId, status: 'enrolled' })
        );
        await Program.updateOne(ngoFilter({ _id: programId }), { $set: { enrolledCount: actualCount } });
      }
      return updatedEnrollment.populate('studentId', 'registrationNumber firstName lastName email status userId');
    } else {
      // Another concurrent request already transitioned this record away from 'enrolled'.
      // Return the current document state consistently without decrementing the program counter again.
      const freshDoc = await ProgramEnrollment.findOne(ngoFilter({ programId, studentId }))
        .populate('studentId', 'registrationNumber firstName lastName email status userId');
      return freshDoc;
    }
  }

  // CASE 2: Transitioning BACK TO active 'enrolled' from 'withdrawn' or 'completed' (Re-enrollment)
  if (current.status !== 'enrolled' && status === 'enrolled') {
    const prog = await getProgram(programId, ngoFilter);
    if (prog.status !== 'active') {
      throw httpError(400, 'Only active programs can accept enrollments.');
    }

    await ensureEnrolledCountSynchronized(prog, ngoFilter);

    // Atomically reserve capacity first
    let reserved = false;
    if (prog.capacity !== null && prog.capacity !== undefined) {
      if (prog.enrolledCount >= prog.capacity) {
        throw httpError(409, 'This program has reached its enrollment capacity.');
      }

      const reservation = await Program.findOneAndUpdate(
        ngoFilter({
          _id: programId,
          enrolledCount: { $lt: prog.capacity }
        }),
        { $inc: { enrolledCount: 1 } },
        { returnDocument: 'after' }
      );
      if (!reservation) {
        throw httpError(409, 'This program has reached its enrollment capacity.');
      }
      reserved = true;
    } else {
      await Program.updateOne(ngoFilter({ _id: programId }), { $inc: { enrolledCount: 1 } });
      reserved = true;
    }

    const historyEntry = {
      status: 'enrolled',
      changedAt: now,
      reason: reason || 'Re-enrollment',
      changedBy: userId
    };

    // CONDITIONAL ATOMIC CAS on ProgramEnrollment:
    // Only matches if current status is NOT 'enrolled'
    const updatedEnrollment = await ProgramEnrollment.findOneAndUpdate(
      ngoFilter({
        programId,
        studentId,
        status: { $ne: 'enrolled' }
      }),
      {
        $set: {
          status: 'enrolled',
          enrolledAt: now,
          withdrawnAt: null,
          withdrawalReason: '',
          completedAt: null,
          enrolledBy: userId
        },
        $push: { history: historyEntry }
      },
      { returnDocument: 'after', runValidators: true }
    );

    if (!updatedEnrollment) {
      // Another concurrent request already re-enrolled this student. Release the reserved seat!
      if (reserved) {
        await Program.updateOne(
          ngoFilter({ _id: programId, enrolledCount: { $gt: 0 } }),
          { $inc: { enrolledCount: -1 } }
        );
      }
      const freshDoc = await ProgramEnrollment.findOne(ngoFilter({ programId, studentId }))
        .populate('studentId', 'registrationNumber firstName lastName email status userId');
      return freshDoc;
    }

    return updatedEnrollment.populate('studentId', 'registrationNumber firstName lastName email status userId');
  }

  // CASE 3: Status transition between non-active states (e.g., 'withdrawn' -> 'completed')
  const historyEntry = {
    status,
    changedAt: now,
    reason: reason || `Status updated to ${status}`,
    changedBy: userId
  };

  const updateData = { status };
  if (status === 'withdrawn') {
    updateData.withdrawnAt = now;
    updateData.withdrawalReason = reason || '';
  } else if (status === 'completed') {
    updateData.completedAt = now;
  }

  const enrollment = await ProgramEnrollment.findOneAndUpdate(
    ngoFilter({ programId, studentId }),
    {
      $set: updateData,
      $push: { history: historyEntry }
    },
    { returnDocument: 'after', runValidators: true }
  ).populate('studentId', 'registrationNumber firstName lastName email status userId');

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

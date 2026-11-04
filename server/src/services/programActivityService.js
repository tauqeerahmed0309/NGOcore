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

const enrollStudent = async (programId, studentId, ngoId, ngoFilter) => {
  const [program, student] = await Promise.all([
    getProgram(programId, ngoFilter),
    Student.findOne(ngoFilter({ _id: studentId, status: 'active' }))
  ]);
  if (!student) throw httpError(404, 'Active student record not found in this organization.');
  if (program.status !== 'active') throw httpError(400, 'Only active programs can accept enrollments.');

  const currentCount = await ProgramEnrollment.countDocuments(ngoFilter({
    programId,
    status: 'enrolled'
  }));
  if (program.capacity && currentCount >= program.capacity) {
    throw httpError(409, 'This program has reached its enrollment capacity.');
  }

  const existing = await ProgramEnrollment.findOne(ngoFilter({ programId, studentId }));
  if (existing) {
    if (existing.status !== 'withdrawn') throw httpError(409, 'Student is already enrolled in this program.');
    existing.status = 'enrolled';
    existing.enrolledAt = new Date();
    await existing.save();
    return existing.populate('studentId', 'registrationNumber firstName lastName email status userId');
  }

  const enrollment = await ProgramEnrollment.create({ ngoId, programId, studentId });
  return enrollment.populate('studentId', 'registrationNumber firstName lastName email status userId');
};

const changeEnrollmentStatus = async (programId, studentId, status, ngoFilter) => {
  const enrollment = await ProgramEnrollment.findOneAndUpdate(
    ngoFilter({ programId, studentId }),
    { $set: { status } },
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

const saveAttendance = async (programId, date, entries, userId, ngoId, ngoFilter) => {
  await getProgram(programId, ngoFilter);
  const sessionDate = new Date(`${date}T00:00:00.000Z`);
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
  saveAttendance,
  getMyEnrollments
};

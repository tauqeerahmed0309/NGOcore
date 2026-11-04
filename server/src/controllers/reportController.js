const AttendanceSession = require('../models/AttendanceSession');
const Program = require('../models/Program');
const ProgramEnrollment = require('../models/ProgramEnrollment');
const Student = require('../models/Student');
const { errorResponse, successResponse } = require('../utils/apiResponse');

const csvCell = (value) => {
  let text = value == null ? '' : String(value);
  if (/^[\s]*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
};

const exportParticipation = async (req, res, next) => {
  try {
    const from = new Date(`${req.query.from}T00:00:00.000Z`);
    const to = new Date(`${req.query.to}T23:59:59.999Z`);
    const enrollments = await ProgramEnrollment.find(req.ngoFilter({ status: { $ne: 'withdrawn' } }))
      .populate('studentId', 'registrationNumber firstName lastName')
      .populate('programId', 'name code')
      .sort({ programId: 1, studentId: 1 })
      .limit(20001);
    if (enrollments.length > 20000) {
      return errorResponse(res, 413, 'The report exceeds 20,000 enrollment rows. Narrow the reporting period or contact support.');
    }

    const sessions = await AttendanceSession.find(req.ngoFilter({ sessionDate: { $gte: from, $lte: to } }))
      .select('programId entries')
      .limit(50001);
    if (sessions.length > 50000) {
      return errorResponse(res, 413, 'The report exceeds 50,000 attendance sessions. Narrow the reporting period or contact support.');
    }
    const counts = new Map();
    for (const session of sessions) {
      for (const entry of session.entries) {
        const key = `${session.programId}:${entry.studentId}`;
        const aggregate = counts.get(key) || { present: 0, absent: 0, excused: 0, sessions: 0 };
        aggregate[entry.status] += 1;
        aggregate.sessions += 1;
        counts.set(key, aggregate);
      }
    }

    const header = [
      'Program code', 'Program', 'Student record ID', 'Registration number',
      'Student name', 'Enrollment status', 'Enrolled at', 'Sessions recorded',
      'Present', 'Absent', 'Excused', 'Attendance rate'
    ];
    const rows = enrollments
      .filter(({ studentId, programId }) => studentId && programId)
      .map((enrollment) => {
        const student = enrollment.studentId;
        const program = enrollment.programId;
        const stats = counts.get(`${program._id}:${student._id}`) || { present: 0, absent: 0, excused: 0, sessions: 0 };
        const counted = stats.present + stats.absent;
        const rate = counted ? `${Math.round((stats.present / counted) * 100)}%` : '';
        return [
          program.code,
          program.name,
          student._id,
          student.registrationNumber,
          `${student.firstName} ${student.lastName}`.trim(),
          enrollment.status,
          enrollment.enrolledAt?.toISOString(),
          stats.sessions,
          stats.present,
          stats.absent,
          stats.excused,
          rate
        ].map(csvCell).join(',');
      });

    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="ngocore-participation-${req.query.from}-to-${req.query.to}.csv"`,
      'Cache-Control': 'no-store'
    });
    return res.status(200).send([header.map(csvCell).join(','), ...rows].join('\r\n'));
  } catch (error) {
    return next(error);
  }
};

const getReminders = async (req, res, next) => {
  try {
    const now = new Date();
    const weekAhead = new Date(now);
    weekAhead.setDate(weekAhead.getDate() + 7);
    const [incompleteStudentCount, upcomingPrograms, activePrograms, activeEnrollments] = await Promise.all([
      Student.countDocuments(req.ngoFilter({
        status: 'active',
        $or: [{ email: '' }, { schoolName: '' }, { educationLevel: '' }]
      })),
      Program.find(req.ngoFilter({
        status: 'active',
        startDate: { $gte: now, $lte: weekAhead }
      })).select('name code startDate location').sort({ startDate: 1 }).limit(10),
      Program.find(req.ngoFilter({ status: 'active' })).select('_id name code').limit(500),
      ProgramEnrollment.aggregate([
        { $match: req.ngoFilter({ status: 'enrolled' }) },
        { $group: { _id: '$programId', count: { $sum: 1 } } }
      ])
    ]);

    const countsByProgram = new Map(activeEnrollments.map(({ _id, count }) => [String(_id), count]));
    const unfilledPrograms = activePrograms
      .filter((program) => !countsByProgram.get(String(program._id)))
      .map((program) => ({ id: program._id, name: program.name, code: program.code }));

    return successResponse(res, 200, 'Dashboard reminders retrieved.', {
      generatedAt: now,
      incompleteStudentCount,
      upcomingPrograms,
      unfilledPrograms
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = { exportParticipation, getReminders };

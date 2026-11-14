const AttendanceSession = require('../models/AttendanceSession');
const Program = require('../models/Program');
const ProgramEnrollment = require('../models/ProgramEnrollment');
const Student = require('../models/Student');
const Ngo = require('../models/Ngo');
const { errorResponse, successResponse } = require('../utils/apiResponse');
const { writeAuditLog } = require('../services/auditService');
const { generateCsv, generateExcel, generatePdf } = require('../utils/exportGenerators');
const {
  getBeneficiaryReportData,
  getProgramReportData,
  getOrgSummaryReportData
} = require('../services/reportService');
const logger = require('../utils/logger');

const csvCell = (value) => {
  let text = value == null ? '' : String(value);
  if (/^[\s]*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
};

/**
 * Universal dispatcher for JSON preview or formatted export file stream
 */
const handleExportResponse = async ({ res, req, reportResult, filePrefix }) => {
  const format = (req.query.format || 'json').toLowerCase();
  const ngo = await Ngo.findById(req.user.ngoId).select('name').lean();
  const ngoName = ngo?.name || 'NGO Organization';
  const generatedAt = new Date().toISOString();
  const timestamp = generatedAt.slice(0, 10);

  // Write Audit Log for accountability
  await writeAuditLog({
    req,
    actor: req.user,
    action: 'create',
    entityType: 'report_export',
    entityId: filePrefix,
    metadata: {
      report: reportResult.title,
      format,
      recordCount: reportResult.data.length,
      filters: reportResult.meta.filters || {}
    }
  }).catch((err) => {
    logger.warn(`Failed to write audit log for report export: ${err.message}`);
  });

  if (format === 'json') {
    return successResponse(res, 200, `${reportResult.title} ready.`, {
      title: reportResult.title,
      ngoName,
      generatedAt,
      columns: reportResult.columns,
      data: reportResult.data,
      meta: reportResult.meta,
      summaryCards: reportResult.summaryCards
    });
  }

  if (format === 'csv') {
    const csvContent = generateCsv({
      title: reportResult.title,
      ngoName,
      generatedAt,
      filters: reportResult.meta.filters,
      columns: reportResult.columns,
      data: reportResult.data
    });

    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="ngocore-${filePrefix}-${timestamp}.csv"`,
      'Cache-Control': 'no-store'
    });
    return res.status(200).send(csvContent);
  }

  if (format === 'xlsx') {
    const excelBuffer = await generateExcel({
      title: reportResult.title,
      ngoName,
      generatedAt,
      filters: reportResult.meta.filters,
      columns: reportResult.columns,
      data: reportResult.data
    });

    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="ngocore-${filePrefix}-${timestamp}.xlsx"`,
      'Content-Length': excelBuffer.length,
      'Cache-Control': 'no-store'
    });
    return res.status(200).send(Buffer.from(excelBuffer));
  }

  if (format === 'pdf') {
    const pdfBuffer = await generatePdf({
      title: reportResult.title,
      ngoName,
      generatedAt,
      filters: reportResult.meta.filters,
      columns: reportResult.columns,
      data: reportResult.data,
      isLandscape: true
    });

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="ngocore-${filePrefix}-${timestamp}.pdf"`,
      'Content-Length': pdfBuffer.length,
      'Cache-Control': 'no-store'
    });
    return res.status(200).send(pdfBuffer);
  }

  return errorResponse(res, 400, 'Unsupported export format.');
};

/**
 * Report 1: Beneficiary Master Report
 */
const getBeneficiaryReport = async (req, res, next) => {
  try {
    const { status, from, to, search, limit } = req.query;
    const reportResult = await getBeneficiaryReportData({
      ngoId: req.user.ngoId,
      status,
      from,
      to,
      search,
      limit: limit || (req.query.format && req.query.format !== 'json' ? 5000 : 100)
    });

    return handleExportResponse({
      res,
      req,
      reportResult,
      filePrefix: 'beneficiaries'
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Report 2: Program Activity & Capacity Report
 */
const getProgramReport = async (req, res, next) => {
  try {
    const { status, type, from, to, search, limit } = req.query;
    const reportResult = await getProgramReportData({
      ngoId: req.user.ngoId,
      status,
      type,
      from,
      to,
      search,
      limit: limit || (req.query.format && req.query.format !== 'json' ? 5000 : 100)
    });

    return handleExportResponse({
      res,
      req,
      reportResult,
      filePrefix: 'programs'
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Report 3: Organization Summary Report
 */
const getOrgSummaryReport = async (req, res, next) => {
  try {
    const reportResult = await getOrgSummaryReportData({
      ngoId: req.user.ngoId
    });

    return handleExportResponse({
      res,
      req,
      reportResult,
      filePrefix: 'org-summary'
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Legacy Participation CSV Report (preserved for backwards compatibility)
 */
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

/**
 * Dashboard reminders helper
 */
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

module.exports = {
  getBeneficiaryReport,
  getProgramReport,
  getOrgSummaryReport,
  exportParticipation,
  getReminders
};

const mongoose = require('mongoose');
const Student = require('../models/Student');
const Program = require('../models/Program');
const ProgramEnrollment = require('../models/ProgramEnrollment');
const AttendanceSession = require('../models/AttendanceSession');
const Ngo = require('../models/Ngo');

const formatDate = (val) => {
  if (!val) return 'N/A';
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return 'N/A';
  return d.toISOString().slice(0, 10);
};

const formatDateTime = (val) => {
  if (!val) return 'N/A';
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return 'N/A';
  return d.toISOString().replace('T', ' ').slice(0, 19);
};

/**
 * Beneficiary / Student Master Report
 */
const getBeneficiaryReportData = async ({ ngoId, status = 'all', from, to, search, limit = 5000 }) => {
  const query = { ngoId: new mongoose.Types.ObjectId(String(ngoId)) };

  if (status && status !== 'all') {
    query.status = status;
  }

  if (from || to) {
    query.createdAt = {};
    if (from) query.createdAt.$gte = new Date(`${from}T00:00:00.000Z`);
    if (to) query.createdAt.$lte = new Date(`${to}T23:59:59.999Z`);
  }

  if (search && search.trim()) {
    const s = search.trim();
    query.$or = [
      { firstName: new RegExp(s, 'i') },
      { lastName: new RegExp(s, 'i') },
      { registrationNumber: new RegExp(s, 'i') },
      { email: new RegExp(s, 'i') }
    ];
  }

  const students = await Student.find(query)
    .select('registrationNumber firstName lastName gender dateOfBirth phone email state address pinCode schoolName educationLevel status createdAt')
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  const columns = [
    { header: 'Registration No.', key: 'registrationNumber', widthWeight: 1.3 },
    { header: 'Full Name', key: 'fullName', widthWeight: 1.6 },
    { header: 'Gender', key: 'gender', widthWeight: 0.8 },
    { header: 'Date of Birth', key: 'dob', widthWeight: 1.0 },
    { header: 'Phone Number', key: 'phone', widthWeight: 1.2 },
    { header: 'Email Address', key: 'email', widthWeight: 1.6 },
    { header: 'State', key: 'state', widthWeight: 1.0 },
    { header: 'Address', key: 'address', widthWeight: 1.6 },
    { header: 'PIN Code', key: 'pinCode', widthWeight: 0.8 },
    { header: 'School / College', key: 'schoolName', widthWeight: 1.4 },
    { header: 'Education Level', key: 'educationLevel', widthWeight: 1.1 },
    { header: 'Status', key: 'status', widthWeight: 0.9 },
    { header: 'Registered On', key: 'createdAt', widthWeight: 1.0 }
  ];

  const data = students.map((s) => ({
    registrationNumber: s.registrationNumber || 'N/A',
    fullName: `${s.firstName || ''} ${s.lastName || ''}`.trim() || 'Unnamed',
    gender: s.gender || 'N/A',
    dob: formatDate(s.dateOfBirth),
    phone: s.phone || 'N/A',
    email: s.email || 'N/A',
    state: s.state || 'N/A',
    address: s.address || 'N/A',
    pinCode: s.pinCode || 'N/A',
    schoolName: s.schoolName || 'N/A',
    educationLevel: s.educationLevel || 'N/A',
    status: (s.status || 'active').toUpperCase(),
    createdAt: formatDate(s.createdAt)
  }));

  // Summary aggregation metrics for preview header
  const countsByStatus = {};
  students.forEach((s) => {
    const st = s.status || 'active';
    countsByStatus[st] = (countsByStatus[st] || 0) + 1;
  });

  return {
    title: 'Beneficiary Master Report',
    columns,
    data,
    meta: {
      total: students.length,
      countsByStatus,
      filters: { status, from: from || null, to: to || null, search: search || null }
    }
  };
};

/**
 * Program Activity & Capacity Report
 */
const getProgramReportData = async ({ ngoId, status = 'all', type, from, to, search, limit = 5000 }) => {
  const query = { ngoId: new mongoose.Types.ObjectId(String(ngoId)) };

  if (status && status !== 'all') {
    query.status = status;
  }

  if (type && type.trim()) {
    query.type = new RegExp(`^${type.trim()}$`, 'i');
  }

  if (from || to) {
    query.createdAt = {};
    if (from) query.createdAt.$gte = new Date(`${from}T00:00:00.000Z`);
    if (to) query.createdAt.$lte = new Date(`${to}T23:59:59.999Z`);
  }

  if (search && search.trim()) {
    const s = search.trim();
    query.$or = [
      { name: new RegExp(s, 'i') },
      { code: new RegExp(s, 'i') },
      { category: new RegExp(s, 'i') }
    ];
  }

  const [programs, enrollmentCounts] = await Promise.all([
    Program.find(query)
      .populate('coordinator', 'firstName lastName')
      .populate('assignedStaff', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean(),
    ProgramEnrollment.aggregate([
      { $match: { ngoId: new mongoose.Types.ObjectId(String(ngoId)), status: { $ne: 'withdrawn' } } },
      { $group: { _id: '$programId', count: { $sum: 1 } } }
    ])
  ]);

  const countMap = new Map(enrollmentCounts.map((e) => [String(e._id), e.count]));

  const columns = [
    { header: 'Program Code', key: 'code', widthWeight: 1.1 },
    { header: 'Program Name', key: 'name', widthWeight: 1.8 },
    { header: 'Type', key: 'type', widthWeight: 1.0 },
    { header: 'Category', key: 'category', widthWeight: 1.2 },
    { header: 'Status', key: 'status', widthWeight: 0.9 },
    { header: 'Start Date', key: 'startDate', widthWeight: 1.0 },
    { header: 'End Date', key: 'endDate', widthWeight: 1.0 },
    { header: 'Capacity', key: 'capacity', widthWeight: 0.9, align: 'right' },
    { header: 'Enrolled', key: 'enrolledCount', widthWeight: 0.9, align: 'right' },
    { header: 'Location / Venue', key: 'location', widthWeight: 1.3 },
    { header: 'Coordinator', key: 'coordinatorName', widthWeight: 1.3 },
    { header: 'Assigned Staff', key: 'assignedStaffNames', widthWeight: 1.5 },
    { header: 'Created On', key: 'createdAt', widthWeight: 1.0 }
  ];

  const data = programs.map((p) => {
    const coord = p.coordinator ? `${p.coordinator.firstName || ''} ${p.coordinator.lastName || ''}`.trim() : 'Unassigned';
    const staffNames = Array.isArray(p.assignedStaff) && p.assignedStaff.length > 0
      ? p.assignedStaff.map((s) => `${s.firstName || ''} ${s.lastName || ''}`.trim()).filter(Boolean).join(', ')
      : 'None';
    const enrolled = countMap.get(String(p._id)) || 0;

    return {
      code: p.code || 'N/A',
      name: p.name || 'Unnamed Program',
      type: p.type || 'general',
      category: p.category || 'N/A',
      status: (p.status || 'active').toUpperCase(),
      startDate: formatDate(p.startDate),
      endDate: formatDate(p.endDate),
      capacity: p.capacity != null ? p.capacity : 'Unlimited',
      enrolledCount: enrolled,
      location: p.location || 'N/A',
      coordinatorName: coord,
      assignedStaffNames: staffNames,
      createdAt: formatDate(p.createdAt)
    };
  });

  const countsByStatus = {};
  programs.forEach((p) => {
    const st = p.status || 'active';
    countsByStatus[st] = (countsByStatus[st] || 0) + 1;
  });

  return {
    title: 'Program Activity & Capacity Report',
    columns,
    data,
    meta: {
      total: programs.length,
      countsByStatus,
      filters: { status, type: type || null, from: from || null, to: to || null, search: search || null }
    }
  };
};

/**
 * Organization Comprehensive Operational Summary
 */
const getOrgSummaryReportData = async ({ ngoId }) => {
  const ngoObjId = new mongoose.Types.ObjectId(String(ngoId));

  const [
    ngo,
    studentStats,
    programStats,
    enrollmentStats,
    totalAttendanceSessions
  ] = await Promise.all([
    Ngo.findById(ngoId).select('name registrationNumber organizationType status contactEmail address createdAt').lean(),
    Student.aggregate([
      { $match: { ngoId: ngoObjId } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]),
    Program.aggregate([
      { $match: { ngoId: ngoObjId } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]),
    ProgramEnrollment.aggregate([
      { $match: { ngoId: ngoObjId } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]),
    AttendanceSession.countDocuments({ ngoId: ngoObjId })
  ]);

  // Process Beneficiary counts
  const beneficiaryMap = new Map(studentStats.map((s) => [s._id || 'unspecified', s.count]));
  const totalBeneficiaries = Array.from(beneficiaryMap.values()).reduce((a, b) => a + b, 0);
  const activeBeneficiaries = beneficiaryMap.get('active') || 0;
  const graduatedBeneficiaries = beneficiaryMap.get('graduated') || 0;
  const transferredBeneficiaries = beneficiaryMap.get('transferred') || 0;
  const inactiveBeneficiaries = beneficiaryMap.get('inactive') || 0;

  // Process Program counts
  const programMap = new Map(programStats.map((p) => [p._id || 'unspecified', p.count]));
  const totalPrograms = Array.from(programMap.values()).reduce((a, b) => a + b, 0);
  const activePrograms = programMap.get('active') || 0;
  const draftPrograms = programMap.get('draft') || 0;
  const pausedPrograms = programMap.get('paused') || 0;
  const completedPrograms = programMap.get('completed') || 0;
  const cancelledPrograms = programMap.get('cancelled') || 0;

  // Process Enrollment counts
  const enrollmentMap = new Map(enrollmentStats.map((e) => [e._id || 'unspecified', e.count]));
  const totalEnrollments = Array.from(enrollmentMap.values()).reduce((a, b) => a + b, 0);
  const activeEnrollments = enrollmentMap.get('enrolled') || 0;
  const completedEnrollments = enrollmentMap.get('completed') || 0;
  const withdrawnEnrollments = enrollmentMap.get('withdrawn') || 0;

  // Tabular representation for Excel / CSV / PDF exports
  const columns = [
    { header: 'Operational Metric Category', key: 'category', widthWeight: 1.8 },
    { header: 'Indicator / Dimension', key: 'indicator', widthWeight: 2.2 },
    { header: 'Recorded Value', key: 'value', widthWeight: 1.5, align: 'right' }
  ];

  const data = [
    { category: 'Organization Profile', indicator: 'Organization Name', value: ngo?.name || 'NGO Organization' },
    { category: 'Organization Profile', indicator: 'Registration Number', value: ngo?.registrationNumber || 'N/A' },
    { category: 'Organization Profile', indicator: 'Organization Type', value: ngo?.organizationType || 'N/A' },
    { category: 'Organization Profile', indicator: 'Account Status', value: (ngo?.status || 'approved').toUpperCase() },
    { category: 'Beneficiary Metrics', indicator: 'Total Beneficiaries Registered', value: totalBeneficiaries },
    { category: 'Beneficiary Metrics', indicator: 'Active Beneficiaries', value: activeBeneficiaries },
    { category: 'Beneficiary Metrics', indicator: 'Graduated Beneficiaries', value: graduatedBeneficiaries },
    { category: 'Beneficiary Metrics', indicator: 'Transferred Beneficiaries', value: transferredBeneficiaries },
    { category: 'Beneficiary Metrics', indicator: 'Inactive Beneficiaries', value: inactiveBeneficiaries },
    { category: 'Program Metrics', indicator: 'Total Programs Created', value: totalPrograms },
    { category: 'Program Metrics', indicator: 'Active Running Programs', value: activePrograms },
    { category: 'Program Metrics', indicator: 'Draft Programs', value: draftPrograms },
    { category: 'Program Metrics', indicator: 'Paused Programs', value: pausedPrograms },
    { category: 'Program Metrics', indicator: 'Completed Programs', value: completedPrograms },
    { category: 'Program Metrics', indicator: 'Cancelled Programs', value: cancelledPrograms },
    { category: 'Enrollment & Participation', indicator: 'Total Program Enrollments', value: totalEnrollments },
    { category: 'Enrollment & Participation', indicator: 'Currently Enrolled Students', value: activeEnrollments },
    { category: 'Enrollment & Participation', indicator: 'Program Completions', value: completedEnrollments },
    { category: 'Enrollment & Participation', indicator: 'Withdrawn Enrollments', value: withdrawnEnrollments },
    { category: 'Enrollment & Participation', indicator: 'Recorded Attendance Sessions', value: totalAttendanceSessions }
  ];

  const summaryCards = {
    totalBeneficiaries,
    activeBeneficiaries,
    inactiveBeneficiaries,
    graduatedBeneficiaries,
    totalPrograms,
    activePrograms,
    completedPrograms,
    totalEnrollments,
    activeEnrollments,
    totalAttendanceSessions
  };

  return {
    title: 'Organization Operational Summary',
    ngoName: ngo?.name || 'NGO Organization',
    columns,
    data,
    summaryCards,
    meta: {
      generatedAt: new Date().toISOString(),
      organization: {
        name: ngo?.name || 'NGO Organization',
        registrationNumber: ngo?.registrationNumber || 'N/A',
        status: ngo?.status || 'approved'
      }
    }
  };
};

module.exports = {
  getBeneficiaryReportData,
  getProgramReportData,
  getOrgSummaryReportData
};


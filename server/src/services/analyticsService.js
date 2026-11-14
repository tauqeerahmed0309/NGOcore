const mongoose = require('mongoose');
const Student = require('../models/Student');
const Program = require('../models/Program');
const ProgramEnrollment = require('../models/ProgramEnrollment');
const AttendanceSession = require('../models/AttendanceSession');
const AuditLog = require('../models/AuditLog');

/**
 * Generate standardized monthly buckets for timeline trend charts
 */
const generateMonthBuckets = (monthsCount = 6) => {
  const now = new Date();
  const buckets = [];
  for (let i = monthsCount - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    const label = new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(d);
    buckets.push({ key, label });
  }
  return buckets;
};

/**
 * Calculate the earliest date boundary for the requested month window
 */
const getRangeStartDate = (monthsCount = 6) => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (monthsCount - 1), 1));
};

/**
 * Beneficiary Demographics, Registration Trends, and Age Distribution
 */
const getBeneficiaryAnalytics = async (ngoId, months = 6) => {
  const rangeStart = getRangeStartDate(months);
  const monthBuckets = generateMonthBuckets(months);

  const [facetResult] = await Student.aggregate([
    { $match: { ngoId } },
    {
      $facet: {
        byStatus: [
          { $group: { _id: '$status', count: { $sum: 1 } } }
        ],
        byGender: [
          {
            $group: {
              _id: {
                $cond: [
                  { $or: [{ $eq: ['$gender', ''] }, { $eq: ['$gender', null] }] },
                  'unspecified',
                  '$gender'
                ]
              },
              count: { $sum: 1 }
            }
          }
        ],
        byState: [
          { $match: { state: { $exists: true, $ne: '' } } },
          { $group: { _id: '$state', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 8 }
        ],
        timeline: [
          { $match: { createdAt: { $gte: rangeStart } } },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m', date: '$createdAt', timezone: 'UTC' } },
              count: { $sum: 1 }
            }
          },
          { $sort: { _id: 1 } }
        ],
        dobData: [
          {
            $project: {
              dateOfBirth: 1,
              hasDob: { $ne: ['$dateOfBirth', null] },
              isFuture: { $gt: ['$dateOfBirth', '$$NOW'] },
              ageInYears: {
                $cond: [
                  { $and: [{ $ne: ['$dateOfBirth', null] }, { $lte: ['$dateOfBirth', '$$NOW'] }] },
                  { $divide: [{ $subtract: ['$$NOW', '$dateOfBirth'] }, 365.25 * 24 * 3600 * 1000] },
                  null
                ]
              }
            }
          }
        ]
      }
    }
  ]);

  // 1. Status Breakdown
  const statusMap = new Map((facetResult?.byStatus || []).map((s) => [s._id, s.count]));
  const activeCount = statusMap.get('active') || 0;
  const graduatedCount = statusMap.get('graduated') || 0;
  const transferredCount = statusMap.get('transferred') || 0;
  const inactiveCount = statusMap.get('inactive') || 0;
  const totalBeneficiaries = activeCount + graduatedCount + transferredCount + inactiveCount;

  // 2. Gender Distribution
  const genderMap = new Map((facetResult?.byGender || []).map((g) => [g._id, g.count]));
  const genderDistribution = ['female', 'male', 'other', 'prefer_not_to_say', 'unspecified'].map((key) => {
    const count = genderMap.get(key) || 0;
    const label = key === 'prefer_not_to_say'
      ? 'Prefer not to say'
      : key === 'unspecified'
        ? 'Unspecified'
        : key.charAt(0).toUpperCase() + key.slice(1);
    return {
      gender: key,
      label,
      count,
      percentage: totalBeneficiaries > 0 ? Math.round((count / totalBeneficiaries) * 100) : 0
    };
  });

  // 3. Reliable Age Distribution & Invalid DOB handling
  let missingOrInvalidDobCount = 0;
  const ageBuckets = {
    under_6: 0,
    primary_6_12: 0,
    secondary_13_17: 0,
    young_adult_18_24: 0,
    adult_25_plus: 0
  };

  for (const item of (facetResult?.dobData || [])) {
    if (!item.hasDob || item.isFuture || item.ageInYears == null || item.ageInYears > 100) {
      missingOrInvalidDobCount++;
    } else if (item.ageInYears < 6) {
      ageBuckets.under_6++;
    } else if (item.ageInYears < 13) {
      ageBuckets.primary_6_12++;
    } else if (item.ageInYears < 18) {
      ageBuckets.secondary_13_17++;
    } else if (item.ageInYears < 25) {
      ageBuckets.young_adult_18_24++;
    } else {
      ageBuckets.adult_25_plus++;
    }
  }

  const reliableDobTotal = (facetResult?.dobData?.length || 0) - missingOrInvalidDobCount;
  const ageDistribution = [
    {
      bracket: 'under_6',
      label: 'Early Childhood (< 6)',
      count: ageBuckets.under_6,
      percentage: reliableDobTotal > 0 ? Math.round((ageBuckets.under_6 / reliableDobTotal) * 100) : 0
    },
    {
      bracket: '6_to_12',
      label: 'Primary (6 - 12)',
      count: ageBuckets.primary_6_12,
      percentage: reliableDobTotal > 0 ? Math.round((ageBuckets.primary_6_12 / reliableDobTotal) * 100) : 0
    },
    {
      bracket: '13_to_17',
      label: 'Secondary (13 - 17)',
      count: ageBuckets.secondary_13_17,
      percentage: reliableDobTotal > 0 ? Math.round((ageBuckets.secondary_13_17 / reliableDobTotal) * 100) : 0
    },
    {
      bracket: '18_to_24',
      label: 'Young Adult (18 - 24)',
      count: ageBuckets.young_adult_18_24,
      percentage: reliableDobTotal > 0 ? Math.round((ageBuckets.young_adult_18_24 / reliableDobTotal) * 100) : 0
    },
    {
      bracket: '25_plus',
      label: 'Adult (25+)',
      count: ageBuckets.adult_25_plus,
      percentage: reliableDobTotal > 0 ? Math.round((ageBuckets.adult_25_plus / reliableDobTotal) * 100) : 0
    }
  ];

  // 4. Monthly Registration Trends (Zero-padded)
  const timelineCounts = new Map((facetResult?.timeline || []).map((t) => [t._id, t.count]));
  const monthlyTrends = monthBuckets.map((b) => ({
    key: b.key,
    month: b.label,
    count: timelineCounts.get(b.key) || 0
  }));

  // 5. State-wise Distribution
  const totalWithState = (facetResult?.byState || []).reduce((acc, curr) => acc + curr.count, 0);
  const topStates = (facetResult?.byState || []).map((s) => ({
    state: s._id,
    count: s.count,
    percentage: totalWithState > 0 ? Math.round((s.count / totalWithState) * 100) : 0
  }));

  return {
    total: totalBeneficiaries,
    byStatus: {
      active: activeCount,
      graduated: graduatedCount,
      transferred: transferredCount,
      inactive: inactiveCount
    },
    genderDistribution,
    ageDistribution,
    missingOrInvalidDobCount,
    reliableDobTotal,
    monthlyRegistrationTrends: monthlyTrends,
    topStates
  };
};

/**
 * Program Analytics, Enrollment Counts, and Capacity Utilization
 */
const getProgramAnalytics = async (ngoId, months = 6) => {
  const rangeStart = getRangeStartDate(months);
  const monthBuckets = generateMonthBuckets(months);

  const [statusAgg, enrollmentTimeline, activeProgramsRoster] = await Promise.all([
    // 1. Program Status Breakdown
    Program.aggregate([
      { $match: { ngoId } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]),

    // 2. Monthly Enrollment Trends
    ProgramEnrollment.aggregate([
      { $match: { ngoId, enrolledAt: { $gte: rangeStart } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$enrolledAt', timezone: 'UTC' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]),

    // 3. Active Programs Capacity vs Actual Enrolled Roster (with strict tenant isolation in lookup)
    Program.aggregate([
      { $match: { ngoId, status: 'active' } },
      {
        $lookup: {
          from: 'programenrollments',
          let: { progId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$ngoId', ngoId] }, // Strictly enforce NGO boundary in join
                    { $eq: ['$programId', '$$progId'] },
                    { $eq: ['$status', 'enrolled'] }
                  ]
                }
              }
            },
            { $count: 'enrolledCount' }
          ],
          as: 'enrolledStats'
        }
      },
      {
        $project: {
          _id: 1,
          code: 1,
          name: 1,
          type: 1,
          capacity: 1,
          enrolledCount: { $ifNull: [{ $arrayElemAt: ['$enrolledStats.enrolledCount', 0] }, 0] }
        }
      },
      { $sort: { enrolledCount: -1 } }
    ])
  ]);

  // Map status counts
  const statusMap = new Map(statusAgg.map((s) => [s._id, s.count]));
  const activeCount = statusMap.get('active') || 0;
  const completedCount = statusMap.get('completed') || 0;
  const draftCount = statusMap.get('draft') || 0;
  const pausedCount = statusMap.get('paused') || 0;
  const cancelledCount = statusMap.get('cancelled') || 0;
  const totalPrograms = activeCount + completedCount + draftCount + pausedCount + cancelledCount;

  // Compute capacity metrics across active programs
  let totalFiniteCapacity = 0;
  let totalEnrolledInFinite = 0;
  let totalUnlimitedPrograms = 0;
  let totalEnrolledInUnlimited = 0;

  const roster = activeProgramsRoster.map((prog) => {
    const hasCapacity = prog.capacity != null && prog.capacity > 0;
    const capacityVal = hasCapacity ? prog.capacity : null;
    const enrolled = prog.enrolledCount || 0;
    const utilizationRate = hasCapacity ? Math.round((enrolled / capacityVal) * 100) : null;

    if (hasCapacity) {
      totalFiniteCapacity += capacityVal;
      totalEnrolledInFinite += enrolled;
    } else {
      totalUnlimitedPrograms++;
      totalEnrolledInUnlimited += enrolled;
    }

    return {
      id: String(prog._id),
      code: prog.code,
      name: prog.name,
      type: prog.type,
      capacity: capacityVal,
      enrolledCount: enrolled,
      utilizationRate
    };
  });

  const overallCapacityUtilizationRate = totalFiniteCapacity > 0
    ? Math.round((totalEnrolledInFinite / totalFiniteCapacity) * 100)
    : null;

  // Monthly enrollment timeline (zero-padded)
  const timelineCounts = new Map(enrollmentTimeline.map((e) => [e._id, e.count]));
  const monthlyEnrollmentTrends = monthBuckets.map((b) => ({
    key: b.key,
    month: b.label,
    count: timelineCounts.get(b.key) || 0
  }));

  const totalActiveEnrollments = totalEnrolledInFinite + totalEnrolledInUnlimited;

  return {
    total: totalPrograms,
    byStatus: {
      active: activeCount,
      completed: completedCount,
      draft: draftCount,
      paused: pausedCount,
      cancelled: cancelledCount
    },
    capacityMetrics: {
      totalActivePrograms: activeCount,
      totalFiniteCapacity,
      totalEnrolledInFinite,
      totalUnlimitedPrograms,
      totalEnrolledInUnlimited,
      totalActiveEnrollments,
      overallCapacityUtilizationRate
    },
    activeProgramsRoster: roster.slice(0, 10), // Top 10 by enrollment for UI dashboard
    monthlyEnrollmentTrends
  };
};

/**
 * Attendance Analytics and Presence Rate
 */
const getAttendanceAnalytics = async (ngoId, months = 6) => {
  const rangeStart = getRangeStartDate(months);

  const [sessionCount, statusAgg] = await Promise.all([
    AttendanceSession.countDocuments({ ngoId, sessionDate: { $gte: rangeStart } }),
    AttendanceSession.aggregate([
      { $match: { ngoId, sessionDate: { $gte: rangeStart } } },
      { $unwind: '$entries' },
      { $group: { _id: '$entries.status', count: { $sum: 1 } } }
    ])
  ]);

  const statusMap = new Map(statusAgg.map((s) => [s._id, s.count]));
  const presentCount = statusMap.get('present') || 0;
  const absentCount = statusMap.get('absent') || 0;
  const excusedCount = statusMap.get('excused') || 0;
  const totalEntries = presentCount + absentCount + excusedCount;

  // Explicitly defined denominator: presence rate is based on attended vs absent opportunities
  const rateDenominator = presentCount + absentCount;
  const overallPresenceRate = rateDenominator > 0
    ? Math.round((presentCount / rateDenominator) * 100)
    : 0;

  return {
    totalSessionsRecorded: sessionCount,
    presentCount,
    absentCount,
    excusedCount,
    totalRecordedEntries: totalEntries,
    rateDenominator,
    overallPresenceRate
  };
};

/**
 * Recent Organizational Audit Activity (Strictly Sanitized, Zero PII)
 */
const getRecentActivity = async (ngoId, limit = 8) => {
  const logs = await AuditLog.find({ ngoId })
    .populate('actorId', 'firstName lastName role')
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return logs.map((log) => {
    const actorName = log.actorId
      ? `${log.actorId.firstName || ''} ${log.actorId.lastName || ''}`.trim() || 'Staff'
      : 'System';
    const actorRole = log.actorId?.role || 'system';

    return {
      id: String(log._id),
      actorName,
      actorRole,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId || null,
      timestamp: log.createdAt
    };
  });
};

/**
 * Master Aggregator for Organization Analytics Dashboard
 */
const getOrganizationDashboardAnalytics = async ({ ngoId, months = 6, timezone = 'UTC' }) => {
  const ngoObjId = new mongoose.Types.ObjectId(String(ngoId));

  const [beneficiaries, programs, attendance, recentActivity] = await Promise.all([
    getBeneficiaryAnalytics(ngoObjId, months),
    getProgramAnalytics(ngoObjId, months),
    getAttendanceAnalytics(ngoObjId, months),
    getRecentActivity(ngoObjId, 8)
  ]);

  return {
    generatedAt: new Date().toISOString(),
    timeframeMonths: months,
    timezone,
    beneficiaries,
    programs,
    attendance,
    recentActivity
  };
};

module.exports = {
  getBeneficiaryAnalytics,
  getProgramAnalytics,
  getAttendanceAnalytics,
  getRecentActivity,
  getOrganizationDashboardAnalytics
};

const mongoose = require('mongoose');
const Volunteer = require('../models/Volunteer');
const Ngo = require('../models/Ngo');
const AuditLog = require('../models/AuditLog');
const { writeAuditLog } = require('./auditService');
const logger = require('../utils/logger');

/**
 * Format volunteer sequence number (e.g. VOL-0001)
 */
const formatVolunteerNumber = (seq) => {
  return `VOL-${String(seq).padStart(4, '0')}`;
};

/**
 * Atomically allocates next sequential volunteer number for an NGO
 */
const allocateNextVolunteerNumber = async (ngoId) => {
  const ngo = await Ngo.findOneAndUpdate(
    { _id: ngoId },
    { $inc: { volunteerSequence: 1 } },
    { returnDocument: 'after', upsert: false }
  );

  if (!ngo) {
    throw new Error('Organization not found for volunteer sequence allocation.');
  }

  return formatVolunteerNumber(ngo.volunteerSequence);
};

/**
 * Synchronize Ngo.volunteerSequence if manual jump occurred
 */
const syncVolunteerSequenceIfHigher = async (ngoId, customNumber) => {
  const match = customNumber.match(/^VOL-(\d+)$/i);
  if (match) {
    const customSeq = parseInt(match[1], 10);
    if (!isNaN(customSeq)) {
      await Ngo.updateOne(
        { _id: ngoId, volunteerSequence: { $lt: customSeq } },
        { $set: { volunteerSequence: customSeq } }
      );
    }
  }
};

/**
 * Create a new volunteer record with atomic auto-numbering and collision retry
 */
const createVolunteer = async (volunteerData, ngoId, actorUser) => {
  const maxRetries = 5;
  let attempt = 0;
  const isCustomNumber = Boolean(volunteerData.volunteerNumber?.trim());

  while (attempt < maxRetries) {
    attempt++;
    let candidateNumber;

    if (isCustomNumber) {
      candidateNumber = volunteerData.volunteerNumber.trim();
      const existing = await Volunteer.findOne({ ngoId, volunteerNumber: candidateNumber });
      if (existing) {
        const err = new Error(`Volunteer with number '${candidateNumber}' already exists in this organization.`);
        err.statusCode = 409;
        throw err;
      }
    } else {
      candidateNumber = await allocateNextVolunteerNumber(ngoId);
    }

    try {
      const volunteer = await Volunteer.create({
        ...volunteerData,
        volunteerNumber: candidateNumber,
        ngoId,
        createdBy: actorUser._id
      });

      if (isCustomNumber) {
        await syncVolunteerSequenceIfHigher(ngoId, candidateNumber);
      }

      // Record audit log
      try {
        await writeAuditLog({
          actor: actorUser,
          ngoId,
          action: 'create',
          entityType: 'volunteer',
          entityId: volunteer._id,
          metadata: {
            volunteerNumber: candidateNumber,
            name: volunteer.name,
            email: volunteer.email
          }
        });
      } catch (auditErr) {
        logger.warn(`Failed to create audit log for volunteer creation: ${auditErr.message}`);
      }

      logger.info(`Volunteer created: [${candidateNumber}] ${volunteer.name} (${volunteer.email})`);
      return volunteer;
    } catch (createErr) {
      if (createErr.code === 11000 && createErr.keyPattern?.volunteerNumber && !isCustomNumber) {
        logger.warn(
          `Collision on auto-generated volunteer ID '${candidateNumber}'. Retrying (attempt ${attempt}/${maxRetries})...`
        );
        continue;
      }

      if (createErr.code === 11000 && createErr.keyPattern?.volunteerNumber) {
        const err = new Error(`Volunteer with number '${candidateNumber}' already exists in this organization.`);
        err.statusCode = 409;
        throw err;
      }

      throw createErr;
    }
  }

  throw new Error('Failed to allocate unique volunteer number after multiple retries.');
};

/**
 * Fetch paginated volunteers with multi-filter and keyword search
 */
const getVolunteers = async (query = {}, ngoId) => {
  const {
    page = 1,
    limit = 10,
    search,
    status = 'all',
    availability = 'all',
    skill,
    programId,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    includeArchived = false
  } = query;

  const filter = { ngoId };

  if (!includeArchived) {
    filter.isArchived = { $ne: true };
  }

  if (status !== 'all') {
    filter.status = status;
  }

  if (availability !== 'all') {
    filter.availability = availability;
  }

  if (skill?.trim()) {
    filter.skills = { $in: [new RegExp(skill.trim(), 'i')] };
  }

  if (programId) {
    filter.assignedPrograms = programId;
  }

  if (search?.trim()) {
    const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const searchRegex = new RegExp(escaped, 'i');
    filter.$or = [
      { name: searchRegex },
      { volunteerNumber: searchRegex },
      { email: searchRegex },
      { phone: searchRegex },
      { skills: { $in: [searchRegex] } }
    ];
  }

  const sort = {};
  sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

  const skip = (page - 1) * limit;

  const [volunteers, totalVolunteers] = await Promise.all([
    Volunteer.find(filter)
      .populate('assignedPrograms', 'code name status')
      .populate('userId', 'firstName lastName email role')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Volunteer.countDocuments(filter)
  ]);

  const totalPages = Math.ceil(totalVolunteers / limit) || 1;

  return {
    volunteers,
    pagination: {
      totalVolunteers,
      totalPages,
      currentPage: page,
      limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    }
  };
};

/**
 * Get volunteer by ID with full relations and populated logs
 */
const getVolunteerById = async (id, ngoId) => {
  const volunteer = await Volunteer.findOne({ _id: id, ngoId })
    .populate('assignedPrograms', 'code name status startDate endDate')
    .populate('userId', 'firstName lastName email role isActive')
    .populate('createdBy', 'firstName lastName email')
    .populate('hoursLogs.programId', 'code name')
    .populate('hoursLogs.loggedBy', 'firstName lastName email')
    .populate('hoursLogs.approvedBy', 'firstName lastName email');

  if (!volunteer) {
    const err = new Error('Volunteer record not found.');
    err.statusCode = 404;
    throw err;
  }

  const auditLogs = await AuditLog.find({
    ngoId,
    entityType: 'volunteer',
    entityId: String(volunteer._id)
  })
    .sort({ createdAt: -1 })
    .limit(20)
    .populate('actorId', 'firstName lastName email')
    .lean();

  return { volunteer, auditLogs };
};

/**
 * Update volunteer details
 */
const updateVolunteer = async (id, updateData, ngoId, actorUser) => {
  const volunteer = await Volunteer.findOne({ _id: id, ngoId });
  if (!volunteer) {
    const err = new Error('Volunteer record not found.');
    err.statusCode = 404;
    throw err;
  }

  if (updateData.volunteerNumber && updateData.volunteerNumber !== volunteer.volunteerNumber) {
    const existing = await Volunteer.findOne({
      ngoId,
      volunteerNumber: updateData.volunteerNumber.trim(),
      _id: { $ne: id }
    });
    if (existing) {
      const err = new Error(`Volunteer number '${updateData.volunteerNumber}' already in use.`);
      err.statusCode = 409;
      throw err;
    }
  }

  const updatedVolunteer = await Volunteer.findOneAndUpdate(
    { _id: id, ngoId },
    { ...updateData, updatedBy: actorUser._id },
    { returnDocument: 'after', runValidators: true }
  )
    .populate('assignedPrograms', 'code name status')
    .populate('userId', 'firstName lastName email role');

  try {
    await writeAuditLog({
      actor: actorUser,
      ngoId,
      action: 'update',
      entityType: 'volunteer',
      entityId: id,
      metadata: {
        volunteerNumber: volunteer.volunteerNumber,
        updatedFields: Object.keys(updateData)
      }
    });
  } catch (auditErr) {
    logger.warn(`Failed to log volunteer update: ${auditErr.message}`);
  }

  return updatedVolunteer;
};

/**
 * Log hours for a volunteer
 */
const logHours = async (volunteerId, logData, ngoId, actorUser) => {
  const volunteer = await Volunteer.findOne({ _id: volunteerId, ngoId });
  if (!volunteer) {
    const err = new Error('Volunteer record not found.');
    err.statusCode = 404;
    throw err;
  }

  const newLog = {
    date: logData.date ? new Date(logData.date) : new Date(),
    programId: logData.programId || null,
    hours: logData.hours,
    activityDescription: logData.activityDescription,
    status: 'pending',
    loggedBy: actorUser._id
  };

  volunteer.hoursLogs.push(newLog);
  await volunteer.save();

  try {
    await writeAuditLog({
      actor: actorUser,
      ngoId,
      action: 'update',
      entityType: 'volunteer',
      entityId: volunteerId,
      metadata: {
        event: 'hours_logged',
        hours: logData.hours,
        description: logData.activityDescription
      }
    });
  } catch (auditErr) {
    logger.warn(`Failed to log volunteer hours audit: ${auditErr.message}`);
  }

  return volunteer;
};

/**
 * Review (Approve/Reject) logged volunteer hours
 */
const reviewHours = async (volunteerId, logId, reviewData, ngoId, actorUser) => {
  const volunteer = await Volunteer.findOne({ _id: volunteerId, ngoId });
  if (!volunteer) {
    const err = new Error('Volunteer record not found.');
    err.statusCode = 404;
    throw err;
  }

  const logEntry = volunteer.hoursLogs.id(logId);
  if (!logEntry) {
    const err = new Error('Hours log entry not found.');
    err.statusCode = 404;
    throw err;
  }

  if (logEntry.status !== 'pending') {
    const err = new Error(`Hours log entry has already been ${logEntry.status}.`);
    err.statusCode = 400;
    throw err;
  }

  logEntry.status = reviewData.status;
  if (reviewData.status === 'approved') {
    logEntry.approvedBy = actorUser._id;
    logEntry.approvedAt = new Date();
  } else if (reviewData.status === 'rejected') {
    logEntry.rejectionReason = reviewData.rejectionReason || 'Rejected by administrator/staff';
  }

  // Recalculate totalApprovedHours
  const approvedTotal = volunteer.hoursLogs
    .filter((l) => l.status === 'approved')
    .reduce((sum, l) => sum + (Number(l.hours) || 0), 0);

  volunteer.totalApprovedHours = Math.round(approvedTotal * 100) / 100;
  await volunteer.save();

  try {
    await writeAuditLog({
      actor: actorUser,
      ngoId,
      action: 'update',
      entityType: 'volunteer',
      entityId: volunteerId,
      metadata: {
        event: `hours_${reviewData.status}`,
        logId,
        hours: logEntry.hours,
        status: reviewData.status,
        reason: reviewData.rejectionReason || undefined
      }
    });
  } catch (auditErr) {
    logger.warn(`Failed to log hours review audit: ${auditErr.message}`);
  }

  return volunteer;
};

/**
 * Get volunteer summary metrics via MongoDB aggregation
 */
const getVolunteerSummary = async (ngoId) => {
  const [counts, hoursAgg] = await Promise.all([
    Volunteer.aggregate([
      { $match: { ngoId: new mongoose.Types.ObjectId(ngoId), isArchived: { $ne: true } } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalHours: { $sum: '$totalApprovedHours' }
        }
      }
    ]),
    Volunteer.aggregate([
      { $match: { ngoId: new mongoose.Types.ObjectId(ngoId), isArchived: { $ne: true } } },
      { $unwind: '$hoursLogs' },
      {
        $group: {
          _id: '$hoursLogs.status',
          count: { $sum: 1 },
          hours: { $sum: '$hoursLogs.hours' }
        }
      }
    ])
  ]);

  const statusMap = {
    active: 0,
    inactive: 0,
    on_leave: 0,
    pending_approval: 0,
    total: 0
  };

  let totalApprovedHours = 0;
  counts.forEach((c) => {
    if (statusMap[c._id] !== undefined) {
      statusMap[c._id] = c.count;
    }
    statusMap.total += c.count;
    totalApprovedHours += c.totalHours || 0;
  });

  const hoursMap = {
    pendingCount: 0,
    pendingHours: 0,
    approvedCount: 0,
    approvedHours: 0,
    rejectedCount: 0
  };

  hoursAgg.forEach((h) => {
    if (h._id === 'pending') {
      hoursMap.pendingCount = h.count;
      hoursMap.pendingHours = Math.round(h.hours * 100) / 100;
    } else if (h._id === 'approved') {
      hoursMap.approvedCount = h.count;
      hoursMap.approvedHours = Math.round(h.hours * 100) / 100;
    } else if (h._id === 'rejected') {
      hoursMap.rejectedCount = h.count;
    }
  });

  return {
    statusCounts: statusMap,
    hoursMetrics: hoursMap,
    totalApprovedHours: Math.round(totalApprovedHours * 100) / 100
  };
};

/**
 * Safe archive volunteer (soft delete)
 */
const deleteVolunteer = async (id, ngoId, actorUser) => {
  const volunteer = await Volunteer.findOne({ _id: id, ngoId });
  if (!volunteer) {
    const err = new Error('Volunteer record not found.');
    err.statusCode = 404;
    throw err;
  }

  volunteer.isArchived = true;
  volunteer.status = 'inactive';
  await volunteer.save();

  try {
    await writeAuditLog({
      actor: actorUser,
      ngoId,
      action: 'delete',
      entityType: 'volunteer',
      entityId: id,
      metadata: {
        volunteerNumber: volunteer.volunteerNumber
      }
    });
  } catch (auditErr) {
    logger.warn(`Failed to log volunteer archive audit: ${auditErr.message}`);
  }

  return { message: 'Volunteer record archived successfully.' };
};

/**
 * Export volunteers to CSV
 */
const exportVolunteersCsv = async (query = {}, ngoId) => {
  const result = await getVolunteers({ ...query, limit: 10000 }, ngoId);
  const volunteers = result.volunteers;

  const headers = [
    'Volunteer ID',
    'Full Name',
    'Email Address',
    'Phone',
    'Status',
    'Availability',
    'Skills',
    'Total Approved Hours',
    'Joined Date'
  ];

  const escapeCsv = (val) => {
    if (val === null || val === undefined) return '""';
    let str = String(val).replace(/"/g, '""');
    if (/^[=+@\-\t\r]/.test(str)) {
      str = `'${str}`;
    }
    return `"${str}"`;
  };

  const rows = volunteers.map((v) => [
    escapeCsv(v.volunteerNumber),
    escapeCsv(v.name),
    escapeCsv(v.email),
    escapeCsv(v.phone || ''),
    escapeCsv(v.status),
    escapeCsv(v.availability),
    escapeCsv((v.skills || []).join('; ')),
    escapeCsv(v.totalApprovedHours || 0),
    escapeCsv(v.joinedDate ? new Date(v.joinedDate).toISOString().slice(0, 10) : '')
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
};

module.exports = {
  createVolunteer,
  getVolunteers,
  getVolunteerById,
  updateVolunteer,
  logHours,
  reviewHours,
  getVolunteerSummary,
  deleteVolunteer,
  exportVolunteersCsv
};

const mongoose = require('mongoose');
const Event = require('../models/Event');
const Ngo = require('../models/Ngo');
const AuditLog = require('../models/AuditLog');
const { writeAuditLog } = require('./auditService');
const logger = require('../utils/logger');

const formatEventNumber = (seq) => `EVT-${String(seq).padStart(4, '0')}`;

const allocateNextEventNumber = async (ngoId) => {
  const ngo = await Ngo.findOneAndUpdate(
    { _id: ngoId },
    { $inc: { eventSequence: 1 } },
    { returnDocument: 'after', upsert: false }
  );

  if (!ngo) {
    throw new Error('Organization not found for event sequence allocation.');
  }

  return formatEventNumber(ngo.eventSequence);
};

const syncEventSequenceIfHigher = async (ngoId, customNumber) => {
  const match = customNumber.match(/^EVT-(\d+)$/i);
  if (match) {
    const customSeq = parseInt(match[1], 10);
    if (!isNaN(customSeq)) {
      await Ngo.updateOne(
        { _id: ngoId, eventSequence: { $lt: customSeq } },
        { $set: { eventSequence: customSeq } }
      );
    }
  }
};

const createEvent = async (eventData, ngoId, actorUser) => {
  const maxRetries = 5;
  let attempt = 0;
  const isCustom = Boolean(eventData.eventNumber?.trim());

  while (attempt < maxRetries) {
    attempt++;
    let candidateNumber;

    if (isCustom) {
      candidateNumber = eventData.eventNumber.trim();
      const existing = await Event.findOne({ ngoId, eventNumber: candidateNumber });
      if (existing) {
        const err = new Error(`Event with number '${candidateNumber}' already exists in this organization.`);
        err.statusCode = 409;
        throw err;
      }
    } else {
      candidateNumber = await allocateNextEventNumber(ngoId);
    }

    try {
      const event = await Event.create({
        ...eventData,
        eventNumber: candidateNumber,
        ngoId,
        createdBy: actorUser._id
      });

      if (isCustom) {
        await syncEventSequenceIfHigher(ngoId, candidateNumber);
      }

      try {
        await writeAuditLog({
          actor: actorUser,
          ngoId,
          action: 'create',
          entityType: 'event',
          entityId: event._id,
          metadata: {
            eventNumber: event.eventNumber,
            title: event.title,
            category: event.category,
            startDate: event.startDate
          }
        });
      } catch (auditErr) {
        logger.warn(`Failed to log event creation audit: ${auditErr.message}`);
      }

      logger.info(`Event created: [${event.eventNumber}] "${event.title}"`);
      return event;
    } catch (err) {
      if (err.code === 11000 && attempt < maxRetries && !isCustom) {
        logger.warn(`Event sequence collision on ${candidateNumber}. Retrying (attempt ${attempt}/${maxRetries})...`);
        continue;
      }
      throw err;
    }
  }

  throw new Error('Failed to generate a unique event number after maximum retries.');
};

const getEvents = async (query = {}, ngoId) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 10));
  const skip = (page - 1) * limit;

  const filter = { ngoId, isArchived: false };

  if (query.status && query.status !== 'all') {
    filter.status = query.status;
  }

  if (query.category && query.category !== 'all') {
    filter.category = query.category;
  }

  if (query.programId) {
    filter.programId = query.programId;
  }

  if (query.coordinatorId) {
    filter.coordinatorId = query.coordinatorId;
  }

  if (query.startDate) {
    filter.startDate = { $gte: new Date(query.startDate) };
  }

  if (query.endDate) {
    filter.endDate = { ...(filter.endDate || {}), $lte: new Date(query.endDate) };
  }

  if (query.search && query.search.trim()) {
    const term = query.search.trim();
    const regex = new RegExp(term, 'i');
    filter.$or = [
      { title: regex },
      { eventNumber: regex },
      { description: regex },
      { 'venue.name': regex },
      { 'venue.city': regex }
    ];
  }

  const sortField = query.sortBy || 'startDate';
  const sortDirection = query.sortOrder === 'desc' ? -1 : 1;
  const sort = { [sortField]: sortDirection };

  const [events, total] = await Promise.all([
    Event.find(filter)
      .populate('programId', 'name code')
      .populate('coordinatorId', 'firstName lastName email')
      .populate('assignedVolunteers', 'volunteerNumber name phone email')
      .populate('createdBy', 'firstName lastName email')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Event.countDocuments(filter)
  ]);

  return {
    events,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1
    }
  };
};

const getEventById = async (id, ngoId) => {
  const event = await Event.findOne({ _id: id, ngoId })
    .populate('programId', 'name code category status')
    .populate('coordinatorId', 'firstName lastName email phone')
    .populate('assignedVolunteers', 'volunteerNumber name phone email skills status')
    .populate('createdBy', 'firstName lastName email')
    .lean();

  if (!event) {
    const err = new Error('Event record not found.');
    err.statusCode = 404;
    throw err;
  }

  const auditLogs = await AuditLog.find({
    ngoId,
    entityType: 'event',
    entityId: id
  })
    .sort({ timestamp: -1 })
    .limit(20)
    .populate('actorId', 'firstName lastName email role')
    .lean();

  return {
    ...event,
    auditLogs
  };
};

const updateEvent = async (id, updateData, ngoId, actorUser) => {
  const event = await Event.findOne({ _id: id, ngoId });
  if (!event) {
    const err = new Error('Event record not found.');
    err.statusCode = 404;
    throw err;
  }

  const modifiedFields = [];
  const allowedFields = [
    'title',
    'description',
    'category',
    'startDate',
    'endDate',
    'venue',
    'programId',
    'coordinatorId',
    'assignedVolunteers',
    'capacity',
    'budget',
    'actualExpenses',
    'status',
    'notes'
  ];

  allowedFields.forEach((field) => {
    if (updateData[field] !== undefined) {
      event[field] = updateData[field];
      modifiedFields.push(field);
    }
  });

  await event.save();

  try {
    await writeAuditLog({
      actor: actorUser,
      ngoId,
      action: 'update',
      entityType: 'event',
      entityId: event._id,
      metadata: {
        eventNumber: event.eventNumber,
        modifiedFields
      }
    });
  } catch (auditErr) {
    logger.warn(`Failed to log event update audit: ${auditErr.message}`);
  }

  return event;
};

const registerAttendee = async (id, attendeeData, ngoId, actorUser) => {
  const event = await Event.findOne({ _id: id, ngoId });
  if (!event) {
    const err = new Error('Event record not found.');
    err.statusCode = 404;
    throw err;
  }

  if (event.isArchived || event.status === 'cancelled') {
    const err = new Error(`Cannot register attendees for ${event.status} event.`);
    err.statusCode = 400;
    throw err;
  }

  if (event.capacity && event.registeredAttendees.length >= event.capacity) {
    const err = new Error(`Event has reached maximum capacity of ${event.capacity} attendees.`);
    err.statusCode = 400;
    throw err;
  }

  const email = attendeeData.email ? attendeeData.email.trim().toLowerCase() : '';
  if (email) {
    const alreadyRegistered = event.registeredAttendees.some(
      (a) => a.email && a.email.toLowerCase() === email
    );
    if (alreadyRegistered) {
      const err = new Error(`An attendee with email '${email}' is already registered for this event.`);
      err.statusCode = 409;
      throw err;
    }
  }

  event.registeredAttendees.push({
    name: attendeeData.name.trim(),
    email,
    phone: attendeeData.phone ? attendeeData.phone.trim() : '',
    registeredAt: new Date(),
    attended: false
  });

  await event.save();

  try {
    await writeAuditLog({
      actor: actorUser,
      ngoId,
      action: 'update',
      entityType: 'event',
      entityId: event._id,
      metadata: {
        eventNumber: event.eventNumber,
        actionDetail: 'attendee_registered',
        attendeeName: attendeeData.name
      }
    });
  } catch (auditErr) {
    logger.warn(`Failed to log attendee registration audit: ${auditErr.message}`);
  }

  return event.registeredAttendees[event.registeredAttendees.length - 1];
};

const checkInAttendee = async (id, attendeeId, ngoId, actorUser) => {
  const event = await Event.findOne({ _id: id, ngoId });
  if (!event) {
    const err = new Error('Event record not found.');
    err.statusCode = 404;
    throw err;
  }

  const attendee = event.registeredAttendees.id(attendeeId);
  if (!attendee) {
    const err = new Error('Attendee record not found.');
    err.statusCode = 404;
    throw err;
  }

  if (attendee.attended) {
    const err = new Error('Attendee is already checked in.');
    err.statusCode = 400;
    throw err;
  }

  attendee.attended = true;
  attendee.checkedInAt = new Date();

  await event.save();

  try {
    await writeAuditLog({
      actor: actorUser,
      ngoId,
      action: 'update',
      entityType: 'event',
      entityId: event._id,
      metadata: {
        eventNumber: event.eventNumber,
        actionDetail: 'attendee_checked_in',
        attendeeId,
        attendeeName: attendee.name
      }
    });
  } catch (auditErr) {
    logger.warn(`Failed to log check-in audit: ${auditErr.message}`);
  }

  return attendee;
};

const getEventSummary = async (ngoId) => {
  const objectIdNgo = new mongoose.Types.ObjectId(ngoId);

  const [aggregationResult] = await Event.aggregate([
    { $match: { ngoId: objectIdNgo, isArchived: false } },
    {
      $facet: {
        statusCounts: [
          { $group: { _id: '$status', count: { $sum: 1 } } }
        ],
        categoryCounts: [
          { $group: { _id: '$category', count: { $sum: 1 } } }
        ],
        attendeeMetrics: [
          { $unwind: { path: '$registeredAttendees', preserveNullAndEmptyArrays: false } },
          {
            $group: {
              _id: null,
              totalRegistered: { $sum: 1 },
              totalAttended: {
                $sum: { $cond: [{ $eq: ['$registeredAttendees.attended', true] }, 1, 0] }
              }
            }
          }
        ],
        budgetMetrics: [
          {
            $group: {
              _id: null,
              totalBudget: { $sum: '$budget' },
              totalExpenses: { $sum: '$actualExpenses' },
              totalEvents: { $sum: 1 }
            }
          }
        ],
        upcomingEvents: [
          {
            $match: {
              startDate: { $gte: new Date() },
              status: { $in: ['scheduled', 'ongoing'] }
            }
          },
          { $count: 'count' }
        ]
      }
    }
  ]);

  const statusMap = {
    scheduled: 0,
    ongoing: 0,
    completed: 0,
    cancelled: 0
  };

  (aggregationResult?.statusCounts || []).forEach((s) => {
    if (statusMap[s._id] !== undefined) statusMap[s._id] = s.count;
  });

  const categoryMap = {};
  (aggregationResult?.categoryCounts || []).forEach((c) => {
    categoryMap[c._id] = c.count;
  });

  const attendeeMetrics = aggregationResult?.attendeeMetrics?.[0] || {
    totalRegistered: 0,
    totalAttended: 0
  };

  const budgetMetrics = aggregationResult?.budgetMetrics?.[0] || {
    totalBudget: 0,
    totalExpenses: 0,
    totalEvents: 0
  };

  const upcomingCount = aggregationResult?.upcomingEvents?.[0]?.count || 0;

  return {
    totalEvents: budgetMetrics.totalEvents,
    statusCounts: statusMap,
    categoryCounts: categoryMap,
    upcomingCount,
    totalRegisteredAttendees: attendeeMetrics.totalRegistered,
    totalCheckedInAttendees: attendeeMetrics.totalAttended,
    totalBudget: budgetMetrics.totalBudget,
    totalExpenses: budgetMetrics.totalExpenses
  };
};

const deleteEvent = async (id, ngoId, actorUser) => {
  const event = await Event.findOne({ _id: id, ngoId });
  if (!event) {
    const err = new Error('Event record not found.');
    err.statusCode = 404;
    throw err;
  }

  event.isArchived = true;
  event.status = 'cancelled';
  await event.save();

  try {
    await writeAuditLog({
      actor: actorUser,
      ngoId,
      action: 'delete',
      entityType: 'event',
      entityId: id,
      metadata: {
        eventNumber: event.eventNumber,
        title: event.title
      }
    });
  } catch (auditErr) {
    logger.warn(`Failed to log event archive audit: ${auditErr.message}`);
  }

  return { message: 'Event record archived successfully.' };
};

const exportEventsCsv = async (query = {}, ngoId) => {
  const result = await getEvents({ ...query, limit: 10000 }, ngoId);
  const events = result.events;

  const headers = [
    'Event #',
    'Title',
    'Category',
    'Status',
    'Start Date',
    'End Date',
    'Venue Name',
    'Venue City',
    'Program',
    'Coordinator',
    'Capacity',
    'Registered Attendees',
    'Checked-In Attendees',
    'Budget',
    'Actual Expenses'
  ];

  const escapeCsv = (val) => {
    if (val === null || val === undefined) return '""';
    let str = String(val).replace(/"/g, '""');
    if (/^[=+@\-\t\r]/.test(str)) {
      str = `'${str}`;
    }
    return `"${str}"`;
  };

  const rows = events.map((e) => {
    const regCount = (e.registeredAttendees || []).length;
    const attCount = (e.registeredAttendees || []).filter((a) => a.attended).length;
    return [
      escapeCsv(e.eventNumber),
      escapeCsv(e.title),
      escapeCsv(e.category),
      escapeCsv(e.status),
      escapeCsv(e.startDate ? new Date(e.startDate).toISOString() : ''),
      escapeCsv(e.endDate ? new Date(e.endDate).toISOString() : ''),
      escapeCsv(e.venue?.name || ''),
      escapeCsv(e.venue?.city || ''),
      escapeCsv(e.programId?.code || ''),
      escapeCsv(e.coordinatorId ? `${e.coordinatorId.firstName} ${e.coordinatorId.lastName}` : ''),
      escapeCsv(e.capacity ?? 'Unlimited'),
      escapeCsv(regCount),
      escapeCsv(attCount),
      escapeCsv(e.budget || 0),
      escapeCsv(e.actualExpenses || 0)
    ];
  });

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
};

module.exports = {
  createEvent,
  getEvents,
  getEventById,
  updateEvent,
  registerAttendee,
  checkInAttendee,
  getEventSummary,
  deleteEvent,
  exportEventsCsv
};

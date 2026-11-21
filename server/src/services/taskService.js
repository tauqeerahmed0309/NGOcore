const mongoose = require('mongoose');
const Task = require('../models/Task');
const Ngo = require('../models/Ngo');
const AuditLog = require('../models/AuditLog');
const { writeAuditLog } = require('./auditService');
const logger = require('../utils/logger');

const formatTaskNumber = (seq) => `TSK-${String(seq).padStart(4, '0')}`;

const allocateNextTaskNumber = async (ngoId) => {
  const ngo = await Ngo.findOneAndUpdate(
    { _id: ngoId },
    { $inc: { taskSequence: 1 } },
    { returnDocument: 'after', upsert: false }
  );

  if (!ngo) {
    throw new Error('Organization not found for task sequence allocation.');
  }

  return formatTaskNumber(ngo.taskSequence);
};

const syncTaskSequenceIfHigher = async (ngoId, customNumber) => {
  const match = customNumber.match(/^TSK-(\d+)$/i);
  if (match) {
    const customSeq = parseInt(match[1], 10);
    if (!isNaN(customSeq)) {
      await Ngo.updateOne(
        { _id: ngoId, taskSequence: { $lt: customSeq } },
        { $set: { taskSequence: customSeq } }
      );
    }
  }
};

const createTask = async (taskData, ngoId, actorUser) => {
  const maxRetries = 5;
  let attempt = 0;
  const isCustom = Boolean(taskData.taskNumber?.trim());

  while (attempt < maxRetries) {
    attempt++;
    let candidateNumber;

    if (isCustom) {
      candidateNumber = taskData.taskNumber.trim();
      const existing = await Task.findOne({ ngoId, taskNumber: candidateNumber });
      if (existing) {
        const err = new Error(`Task with number '${candidateNumber}' already exists in this organization.`);
        err.statusCode = 409;
        throw err;
      }
    } else {
      candidateNumber = await allocateNextTaskNumber(ngoId);
    }

    try {
      const task = await Task.create({
        ...taskData,
        taskNumber: candidateNumber,
        ngoId,
        createdBy: actorUser._id
      });

      if (isCustom) {
        await syncTaskSequenceIfHigher(ngoId, candidateNumber);
      }

      try {
        await writeAuditLog({
          actor: actorUser,
          ngoId,
          action: 'create',
          entityType: 'task',
          entityId: task._id,
          metadata: {
            taskNumber: candidateNumber,
            title: task.title,
            priority: task.priority,
            category: task.category
          }
        });
      } catch (auditErr) {
        logger.warn(`Failed to create task audit log: ${auditErr.message}`);
      }

      logger.info(`Task created: [${candidateNumber}] "${task.title}"`);
      return task;
    } catch (createErr) {
      if (createErr.code === 11000 && createErr.keyPattern?.taskNumber && !isCustom) {
        logger.warn(`Collision on task number '${candidateNumber}'. Retrying (attempt ${attempt}/${maxRetries})...`);
        continue;
      }

      if (createErr.code === 11000 && createErr.keyPattern?.taskNumber) {
        const err = new Error(`Task with number '${candidateNumber}' already exists in this organization.`);
        err.statusCode = 409;
        throw err;
      }

      throw createErr;
    }
  }

  throw new Error('Failed to allocate unique task number after multiple retries.');
};

const getTasks = async (query = {}, ngoId) => {
  const {
    page = 1,
    limit = 10,
    search,
    status = 'all',
    priority = 'all',
    category = 'all',
    assignedTo,
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

  if (priority !== 'all') {
    filter.priority = priority;
  }

  if (category !== 'all') {
    filter.category = category;
  }

  if (assignedTo) {
    filter.assignedTo = assignedTo;
  }

  if (programId) {
    filter.programId = programId;
  }

  if (search?.trim()) {
    const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const searchRegex = new RegExp(escaped, 'i');
    filter.$or = [
      { title: searchRegex },
      { taskNumber: searchRegex },
      { description: searchRegex }
    ];
  }

  const sort = {};
  sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
  const skip = (page - 1) * limit;

  const [tasks, totalTasks] = await Promise.all([
    Task.find(filter)
      .populate('assignedTo', 'firstName lastName email role')
      .populate('assignedVolunteerId', 'volunteerNumber name email')
      .populate('programId', 'code name status')
      .populate('createdBy', 'firstName lastName email')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Task.countDocuments(filter)
  ]);

  const totalPages = Math.ceil(totalTasks / limit) || 1;

  return {
    tasks,
    pagination: {
      totalTasks,
      totalPages,
      currentPage: page,
      limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    }
  };
};

const getTaskById = async (id, ngoId) => {
  const task = await Task.findOne({ _id: id, ngoId })
    .populate('assignedTo', 'firstName lastName email role')
    .populate('assignedVolunteerId', 'volunteerNumber name email phone skills')
    .populate('programId', 'code name status startDate endDate')
    .populate('createdBy', 'firstName lastName email')
    .populate('completedBy', 'firstName lastName email');

  if (!task) {
    const err = new Error('Task record not found.');
    err.statusCode = 404;
    throw err;
  }

  const auditLogs = await AuditLog.find({
    ngoId,
    entityType: 'task',
    entityId: String(task._id)
  })
    .sort({ createdAt: -1 })
    .limit(20)
    .populate('actorId', 'firstName lastName email')
    .lean();

  return { task, auditLogs };
};

const updateTask = async (id, updateData, ngoId, actorUser) => {
  const task = await Task.findOne({ _id: id, ngoId });
  if (!task) {
    const err = new Error('Task record not found.');
    err.statusCode = 404;
    throw err;
  }

  if (updateData.taskNumber && updateData.taskNumber !== task.taskNumber) {
    const existing = await Task.findOne({
      ngoId,
      taskNumber: updateData.taskNumber.trim(),
      _id: { $ne: id }
    });
    if (existing) {
      const err = new Error(`Task number '${updateData.taskNumber}' already in use.`);
      err.statusCode = 409;
      throw err;
    }
  }

  const updatedTask = await Task.findOneAndUpdate(
    { _id: id, ngoId },
    { ...updateData, updatedBy: actorUser._id },
    { returnDocument: 'after', runValidators: true }
  )
    .populate('assignedTo', 'firstName lastName email role')
    .populate('assignedVolunteerId', 'volunteerNumber name email')
    .populate('programId', 'code name status');

  try {
    await writeAuditLog({
      actor: actorUser,
      ngoId,
      action: 'update',
      entityType: 'task',
      entityId: id,
      metadata: {
        taskNumber: task.taskNumber,
        updatedFields: Object.keys(updateData)
      }
    });
  } catch (auditErr) {
    logger.warn(`Failed to log task update audit: ${auditErr.message}`);
  }

  return updatedTask;
};

const updateTaskStatus = async (id, { status, completionNotes }, ngoId, actorUser) => {
  const task = await Task.findOne({ _id: id, ngoId });
  if (!task) {
    const err = new Error('Task record not found.');
    err.statusCode = 404;
    throw err;
  }

  const updateFields = {
    status,
    updatedBy: actorUser._id
  };

  if (status === 'completed') {
    updateFields.completedAt = new Date();
    updateFields.completedBy = actorUser._id;
    if (completionNotes) updateFields.completionNotes = completionNotes;
  } else if (status !== 'completed' && task.completedAt) {
    updateFields.completedAt = null;
    updateFields.completedBy = null;
  }

  const updatedTask = await Task.findOneAndUpdate(
    { _id: id, ngoId },
    { $set: updateFields },
    { returnDocument: 'after' }
  )
    .populate('assignedTo', 'firstName lastName email role')
    .populate('assignedVolunteerId', 'volunteerNumber name email')
    .populate('programId', 'code name status');

  try {
    await writeAuditLog({
      actor: actorUser,
      ngoId,
      action: 'update',
      entityType: 'task',
      entityId: id,
      metadata: {
        taskNumber: task.taskNumber,
        newStatus: status,
        completionNotes: completionNotes || undefined
      }
    });
  } catch (auditErr) {
    logger.warn(`Failed to log task status update: ${auditErr.message}`);
  }

  return updatedTask;
};

const getTaskSummary = async (ngoId) => {
  const [statusCounts, priorityCounts, overdueCount] = await Promise.all([
    Task.aggregate([
      { $match: { ngoId: new mongoose.Types.ObjectId(ngoId), isArchived: { $ne: true } } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]),
    Task.aggregate([
      { $match: { ngoId: new mongoose.Types.ObjectId(ngoId), isArchived: { $ne: true } } },
      { $group: { _id: '$priority', count: { $sum: 1 } } }
    ]),
    Task.countDocuments({
      ngoId,
      isArchived: { $ne: true },
      status: { $nin: ['completed', 'cancelled'] },
      dueDate: { $lt: new Date() }
    })
  ]);

  const statusMap = {
    todo: 0,
    in_progress: 0,
    review: 0,
    completed: 0,
    cancelled: 0,
    total: 0
  };

  statusCounts.forEach((s) => {
    if (statusMap[s._id] !== undefined) statusMap[s._id] = s.count;
    statusMap.total += s.count;
  });

  const priorityMap = {
    urgent: 0,
    high: 0,
    medium: 0,
    low: 0
  };

  priorityCounts.forEach((p) => {
    if (priorityMap[p._id] !== undefined) priorityMap[p._id] = p.count;
  });

  return {
    statusCounts: statusMap,
    priorityCounts: priorityMap,
    overdueCount
  };
};

const deleteTask = async (id, ngoId, actorUser) => {
  const task = await Task.findOne({ _id: id, ngoId });
  if (!task) {
    const err = new Error('Task record not found.');
    err.statusCode = 404;
    throw err;
  }

  task.isArchived = true;
  task.status = 'cancelled';
  await task.save();

  try {
    await writeAuditLog({
      actor: actorUser,
      ngoId,
      action: 'delete',
      entityType: 'task',
      entityId: id,
      metadata: {
        taskNumber: task.taskNumber
      }
    });
  } catch (auditErr) {
    logger.warn(`Failed to log task archive audit: ${auditErr.message}`);
  }

  return { message: 'Task record archived successfully.' };
};

const exportTasksCsv = async (query = {}, ngoId) => {
  const result = await getTasks({ ...query, limit: 10000 }, ngoId);
  const tasks = result.tasks;

  const headers = [
    'Task #',
    'Title',
    'Category',
    'Priority',
    'Status',
    'Due Date',
    'Assigned User',
    'Assigned Volunteer',
    'Program',
    'Completed At'
  ];

  const escapeCsv = (val) => {
    if (val === null || val === undefined) return '""';
    let str = String(val).replace(/"/g, '""');
    if (/^[=+@\-\t\r]/.test(str)) {
      str = `'${str}`;
    }
    return `"${str}"`;
  };

  const rows = tasks.map((t) => [
    escapeCsv(t.taskNumber),
    escapeCsv(t.title),
    escapeCsv(t.category),
    escapeCsv(t.priority),
    escapeCsv(t.status),
    escapeCsv(t.dueDate ? new Date(t.dueDate).toISOString().slice(0, 10) : ''),
    escapeCsv(t.assignedTo ? `${t.assignedTo.firstName} ${t.assignedTo.lastName}` : ''),
    escapeCsv(t.assignedVolunteerId ? t.assignedVolunteerId.name : ''),
    escapeCsv(t.programId ? t.programId.code : ''),
    escapeCsv(t.completedAt ? new Date(t.completedAt).toISOString().slice(0, 10) : '')
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
};

module.exports = {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  updateTaskStatus,
  getTaskSummary,
  deleteTask,
  exportTasksCsv
};

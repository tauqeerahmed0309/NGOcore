const taskService = require('../services/taskService');
const {
  createTaskSchema,
  updateTaskSchema,
  updateTaskStatusSchema,
  taskQuerySchema
} = require('../validations/taskValidation');

const createTask = async (req, res, next) => {
  try {
    const ngoId = req.ngoId || req.user?.ngoId;
    const validatedData = createTaskSchema.parse(req.body);
    const task = await taskService.createTask(validatedData, ngoId, req.user);
    res.status(201).json({
      success: true,
      message: 'Task created successfully.',
      data: { task }
    });
  } catch (err) {
    next(err);
  }
};

const getTasks = async (req, res, next) => {
  try {
    const ngoId = req.ngoId || req.user?.ngoId;
    const validatedQuery = taskQuerySchema.parse(req.query);
    const result = await taskService.getTasks(validatedQuery, ngoId);
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
};

const getTaskById = async (req, res, next) => {
  try {
    const ngoId = req.ngoId || req.user?.ngoId;
    const result = await taskService.getTaskById(req.params.id, ngoId);
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
};

const updateTask = async (req, res, next) => {
  try {
    const ngoId = req.ngoId || req.user?.ngoId;
    const validatedData = updateTaskSchema.parse(req.body);
    const task = await taskService.updateTask(req.params.id, validatedData, ngoId, req.user);
    res.status(200).json({
      success: true,
      message: 'Task updated successfully.',
      data: { task }
    });
  } catch (err) {
    next(err);
  }
};

const updateTaskStatus = async (req, res, next) => {
  try {
    const ngoId = req.ngoId || req.user?.ngoId;
    const validatedData = updateTaskStatusSchema.parse(req.body);
    const task = await taskService.updateTaskStatus(req.params.id, validatedData, ngoId, req.user);
    res.status(200).json({
      success: true,
      message: `Task status updated to ${validatedData.status}.`,
      data: { task }
    });
  } catch (err) {
    next(err);
  }
};

const getTaskSummary = async (req, res, next) => {
  try {
    const ngoId = req.ngoId || req.user?.ngoId;
    const summary = await taskService.getTaskSummary(ngoId);
    res.status(200).json({
      success: true,
      data: summary
    });
  } catch (err) {
    next(err);
  }
};

const deleteTask = async (req, res, next) => {
  try {
    const ngoId = req.ngoId || req.user?.ngoId;
    const result = await taskService.deleteTask(req.params.id, ngoId, req.user);
    res.status(200).json({
      success: true,
      message: result.message
    });
  } catch (err) {
    next(err);
  }
};

const exportTasks = async (req, res, next) => {
  try {
    const ngoId = req.ngoId || req.user?.ngoId;
    const validatedQuery = taskQuerySchema.parse(req.query);
    const csvContent = await taskService.exportTasksCsv(validatedQuery, ngoId);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="tasks_export_${new Date().toISOString().slice(0, 10)}.csv"`
    );
    res.status(200).send(csvContent);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  updateTaskStatus,
  getTaskSummary,
  deleteTask,
  exportTasks
};

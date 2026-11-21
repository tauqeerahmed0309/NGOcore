const expenseService = require('../services/expenseService');
const { successResponse } = require('../utils/apiResponse');
const { writeAuditLog } = require('../services/auditService');
const Ngo = require('../models/Ngo');

/**
 * @desc    Get all expenses with pagination, search, and multi-filters
 * @route   GET /api/v1/expenses
 * @access  Admin, Staff
 */
const listExpenses = async (req, res, next) => {
  try {
    const result = await expenseService.listExpenses(req.query, req.ngoFilter);
    return successResponse(res, 200, 'Expenses retrieved successfully', {
      expenses: result.expenses,
      pagination: result.pagination
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get expense summary analytics
 * @route   GET /api/v1/expenses/summary
 * @access  Admin, Staff
 */
const getExpenseSummary = async (req, res, next) => {
  try {
    const summary = await expenseService.getExpenseSummary(req.ngoFilter);
    return successResponse(res, 200, 'Expense summary retrieved successfully', { summary });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Export expense records to CSV / Excel / PDF
 * @route   GET /api/v1/expenses/export
 * @access  Admin, Staff
 */
const exportExpenses = async (req, res, next) => {
  try {
    const ngo = await Ngo.findById(req.user.ngoId).select('name').lean();
    const ngoName = ngo?.name || 'NGO Organization';
    const format = (req.query.format || 'csv').toLowerCase();

    const result = await expenseService.exportExpenses(req.query, format, req.ngoFilter, ngoName);

    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);

    if (result.content) {
      return res.send(result.content);
    }
    return res.send(result.buffer);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get expense details by ID
 * @route   GET /api/v1/expenses/:id
 * @access  Admin, Staff
 */
const getExpenseById = async (req, res, next) => {
  try {
    const { expense, auditLogs } = await expenseService.getExpenseById(req.params.id, req.ngoFilter);
    return successResponse(res, 200, 'Expense details retrieved successfully', {
      expense,
      auditLogs
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Record a new expense
 * @route   POST /api/v1/expenses
 * @access  Admin, Staff
 */
const createExpense = async (req, res, next) => {
  try {
    const expense = await expenseService.createExpense(
      req.body,
      req.user,
      req.user.ngoId,
      req.ngoFilter
    );

    await writeAuditLog({
      req,
      action: 'create',
      entityType: 'expense',
      entityId: expense._id,
      metadata: {
        expenseNumber: expense.expenseNumber,
        title: expense.title,
        amount: expense.amount,
        currency: expense.currency,
        category: expense.category,
        paymentMethod: expense.paymentMethod,
        status: expense.status
      }
    });

    return successResponse(res, 201, 'Expense recorded successfully', { expense });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update permitted fields on an expense record
 * @route   PUT /api/v1/expenses/:id
 * @access  Admin, Staff
 */
const updateExpense = async (req, res, next) => {
  try {
    const { expense, modifiedFields } = await expenseService.updateExpense(
      req.params.id,
      req.body,
      req.user,
      req.ngoFilter
    );

    if (modifiedFields.length > 0) {
      await writeAuditLog({
        req,
        action: 'update',
        entityType: 'expense',
        entityId: expense._id,
        metadata: { modifiedFields }
      });
    }

    return successResponse(res, 200, 'Expense updated successfully', { expense });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Approve a pending expense
 * @route   PATCH /api/v1/expenses/:id/approve
 * @access  Admin, Staff (separation of duties enforced)
 */
const approveExpense = async (req, res, next) => {
  try {
    const expense = await expenseService.approveExpense(req.params.id, req.user, req.ngoFilter);

    await writeAuditLog({
      req,
      action: 'update',
      entityType: 'expense',
      entityId: expense._id,
      metadata: { newStatus: 'approved', approvedBy: req.user.email }
    });

    return successResponse(res, 200, 'Expense approved successfully', { expense });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reject an expense
 * @route   POST /api/v1/expenses/:id/reject
 * @access  Admin, Staff
 */
const rejectExpense = async (req, res, next) => {
  try {
    const expense = await expenseService.rejectExpense(
      req.params.id,
      req.body.reason,
      req.user,
      req.ngoFilter
    );

    await writeAuditLog({
      req,
      action: 'update',
      entityType: 'expense',
      entityId: expense._id,
      metadata: {
        newStatus: 'rejected',
        reason: expense.rejectionReason,
        rejectedBy: req.user.email
      }
    });

    return successResponse(res, 200, 'Expense marked as rejected', { expense });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Archive / delete an expense record
 * @route   DELETE /api/v1/expenses/:id
 * @access  Admin
 */
const deleteExpense = async (req, res, next) => {
  try {
    const result = await expenseService.deleteExpense(req.params.id, req.user, req.ngoFilter);

    await writeAuditLog({
      req,
      action: 'delete',
      entityType: 'expense',
      entityId: req.params.id,
      metadata: { archivedBy: req.user.email }
    });

    return successResponse(res, 200, result.message);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listExpenses,
  getExpenseSummary,
  exportExpenses,
  getExpenseById,
  createExpense,
  updateExpense,
  approveExpense,
  rejectExpense,
  deleteExpense
};

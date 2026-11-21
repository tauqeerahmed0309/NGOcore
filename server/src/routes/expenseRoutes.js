const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expenseController');
const authMiddleware = require('../middlewares/authMiddleware');
const ngoScope = require('../middlewares/ngoScope');
const roleMiddleware = require('../middlewares/roleMiddleware');
const {
  validateBody,
  validateParams,
  validateQuery
} = require('../middlewares/validationMiddleware');
const {
  expenseIdParamSchema,
  createExpenseSchema,
  updateExpenseSchema,
  rejectExpenseSchema,
  listExpensesQuerySchema
} = require('../validations/expenseValidation');

// All expense operations require authenticated session and NGO tenant scoping
router.use(authMiddleware);
router.use(ngoScope);

// Only admin, ngo_admin, and staff can access expense records (financial data)
router.use(roleMiddleware('admin', 'ngo_admin', 'staff'));

// Aggregations and exports (must precede /:id)
router.get('/summary', expenseController.getExpenseSummary);
router.get(
  '/export',
  validateQuery(listExpensesQuerySchema),
  expenseController.exportExpenses
);

// Standard collection operations
router.get(
  '/',
  validateQuery(listExpensesQuerySchema),
  expenseController.listExpenses
);

router.post(
  '/',
  validateBody(createExpenseSchema),
  expenseController.createExpense
);

// Item operations
router.get(
  '/:id',
  validateParams(expenseIdParamSchema),
  expenseController.getExpenseById
);

router.put(
  '/:id',
  validateParams(expenseIdParamSchema),
  validateBody(updateExpenseSchema),
  expenseController.updateExpense
);

router.patch(
  '/:id/approve',
  validateParams(expenseIdParamSchema),
  expenseController.approveExpense
);

router.post(
  '/:id/reject',
  validateParams(expenseIdParamSchema),
  validateBody(rejectExpenseSchema),
  expenseController.rejectExpense
);

router.delete(
  '/:id',
  roleMiddleware('admin', 'ngo_admin'),
  validateParams(expenseIdParamSchema),
  expenseController.deleteExpense
);

module.exports = router;

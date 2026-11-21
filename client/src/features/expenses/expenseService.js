import api from '../../services/api';

/**
 * Expense Management API Service Client
 */
export const expenseService = {
  /**
   * Fetch paginated list of expenses with search, filtering, and sorting
   */
  getExpenses: async (params = {}) => {
    return await api.get('/expenses', { params });
  },

  /**
   * Fetch specific expense record by ID with linked program and audit history
   */
  getExpenseById: async (id) => {
    return await api.get(`/expenses/${id}`);
  },

  /**
   * Fetch multi-currency expense summaries and category breakdowns
   */
  getExpenseSummary: async (params = {}) => {
    return await api.get('/expenses/summary', { params });
  },

  /**
   * Record a new expense
   */
  createExpense: async (expenseData) => {
    return await api.post('/expenses', expenseData);
  },

  /**
   * Update permitted fields of an expense record
   */
  updateExpense: async (id, expenseData) => {
    return await api.put(`/expenses/${id}`, expenseData);
  },

  /**
   * Approve an expense (separation of duties enforced by backend)
   */
  approveExpense: async (id) => {
    return await api.patch(`/expenses/${id}/approve`);
  },

  /**
   * Reject an expense with a mandatory descriptive justification
   */
  rejectExpense: async (id, reason) => {
    return await api.post(`/expenses/${id}/reject`, { reason });
  },

  /**
   * Archive / soft-delete an expense (Admin only)
   */
  deleteExpense: async (id) => {
    return await api.delete(`/expenses/${id}`);
  },

  /**
   * Download RFC-4180 compliant CSV export
   */
  exportExpenses: async (params = {}) => {
    return await api.get('/expenses/export', {
      params,
      responseType: 'blob'
    });
  }
};

export default expenseService;

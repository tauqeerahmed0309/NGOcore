import api from '../../services/api';

/**
 * Task Management API Service Client
 */
export const taskService = {
  /**
   * Fetch paginated tasks with search, filtering, and sorting
   */
  getTasks: async (params = {}) => {
    return await api.get('/tasks', { params });
  },

  /**
   * Fetch specific task record by ID with full relations and audit logs
   */
  getTaskById: async (id) => {
    return await api.get(`/tasks/${id}`);
  },

  /**
   * Fetch task summary counts by status, priority, and overdue count
   */
  getTaskSummary: async () => {
    return await api.get('/tasks/summary');
  },

  /**
   * Create a new task
   */
  createTask: async (taskData) => {
    return await api.post('/tasks', taskData);
  },

  /**
   * Update task details
   */
  updateTask: async (id, taskData) => {
    return await api.put(`/tasks/${id}`, taskData);
  },

  /**
   * Quick status transition (todo, in_progress, review, completed, cancelled)
   */
  updateTaskStatus: async (id, statusData) => {
    return await api.patch(`/tasks/${id}/status`, statusData);
  },

  /**
   * Archive / soft-delete task record (Admin only)
   */
  deleteTask: async (id) => {
    return await api.delete(`/tasks/${id}`);
  },

  /**
   * Export tasks as CSV
   */
  exportTasks: async (params = {}) => {
    return await api.get('/tasks/export', {
      params,
      responseType: 'blob'
    });
  }
};

export default taskService;

import api from '../../services/api';

/**
 * Dynamic Program Management API Service Client
 */
export const programService = {
  /**
   * Fetch paginated list of programs with search and filter parameters
   */
  getPrograms: async (params = {}) => {
    return await api.get('/programs', { params });
  },

  /**
   * Fetch specific program details by ID
   */
  getProgramById: async (id) => {
    return await api.get(`/programs/${id}`);
  },

  /**
   * Create a new program (Admin only)
   */
  createProgram: async (programData) => {
    return await api.post('/programs', programData);
  },

  /**
   * Update program details (Admin only)
   */
  updateProgram: async (id, programData) => {
    return await api.put(`/programs/${id}`, programData);
  },

  /**
   * Delete program (Admin only - guarded against records with history)
   */
  deleteProgram: async (id) => {
    return await api.delete(`/programs/${id}`);
  },

  /**
   * Change program status (Admin only)
   */
  updateStatus: async (id, status) => {
    return await api.patch(`/programs/${id}/status`, { status });
  },

  /**
   * Assign staff member to program (Admin only)
   */
  assignStaff: async (id, staffId) => {
    return await api.post(`/programs/${id}/staff`, { staffId });
  },

  /**
   * Remove staff member from program (Admin only)
   */
  removeStaff: async (id, staffId) => {
    return await api.delete(`/programs/${id}/staff/${staffId}`);
  },

  getMyEnrollments: async (params = {}) => api.get('/programs/my-enrollments', { params }),
  getEnrollments: async (id, params = {}) => api.get(`/programs/${id}/enrollments`, { params }),
  enrollStudent: async (id, studentId) => api.post(`/programs/${id}/enrollments`, { studentId }),
  updateEnrollment: async (id, studentId, status, reason = '') => (
    api.patch(`/programs/${id}/enrollments/${studentId}`, { status, reason })
  ),
  getAttendance: async (id, date) => api.get(`/programs/${id}/attendance`, { params: { date } }),
  saveAttendance: async (id, date, entries) => api.put(`/programs/${id}/attendance`, { date, entries }),
  getAttendanceHistory: async (id, params = {}) => api.get(`/programs/${id}/attendance-history`, { params })
};

export default programService;

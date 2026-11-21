import api from '../../services/api';

/**
 * Volunteer Management API Service Client
 */
export const volunteerService = {
  /**
   * Fetch paginated list of volunteers with search, filtering, and sorting
   */
  getVolunteers: async (params = {}) => {
    return await api.get('/volunteers', { params });
  },

  /**
   * Fetch specific volunteer profile with audit logs and hours entries
   */
  getVolunteerById: async (id) => {
    return await api.get(`/volunteers/${id}`);
  },

  /**
   * Fetch overall volunteer statistics, hours totals, and status counts
   */
  getVolunteerSummary: async () => {
    return await api.get('/volunteers/summary');
  },

  /**
   * Register a new volunteer
   */
  createVolunteer: async (volunteerData) => {
    return await api.post('/volunteers', volunteerData);
  },

  /**
   * Update volunteer details
   */
  updateVolunteer: async (id, volunteerData) => {
    return await api.put(`/volunteers/${id}`, volunteerData);
  },

  /**
   * Log service hours for a volunteer
   */
  logHours: async (volunteerId, logData) => {
    return await api.post(`/volunteers/${volunteerId}/hours`, logData);
  },

  /**
   * Approve or reject logged hours (Admin/Staff)
   */
  reviewHours: async (volunteerId, logId, reviewData) => {
    return await api.patch(`/volunteers/${volunteerId}/hours/${logId}`, reviewData);
  },

  /**
   * Archive / soft-delete volunteer record (Admin only)
   */
  deleteVolunteer: async (id) => {
    return await api.delete(`/volunteers/${id}`);
  },

  /**
   * Export volunteers as RFC-4180 CSV
   */
  exportVolunteers: async (params = {}) => {
    return await api.get('/volunteers/export', {
      params,
      responseType: 'blob'
    });
  }
};

export default volunteerService;

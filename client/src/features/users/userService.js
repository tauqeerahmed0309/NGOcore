import api from '../../services/api';

/**
 * User Management API Service Client
 */
export const userService = {
  /**
   * Fetch paginated list of users with search and filter parameters
   */
  getUsers: async (params = {}) => {
    return await api.get('/users', { params });
  },

  /**
   * Fetch specific user details by ID
   */
  getUserById: async (id) => {
    return await api.get(`/users/${id}`);
  },

  /**
   * Create a new Staff, Volunteer, or Student user
   */
  createUser: async (userData) => {
    return await api.post('/users', userData);
  },

  /**
   * Update user details (name, email, role)
   */
  updateUser: async (id, userData) => {
    return await api.put(`/users/${id}`, userData);
  },

  /**
   * Toggle user active status (soft activate / deactivate)
   */
  updateStatus: async (id, isActive) => {
    return await api.patch(`/users/${id}/status`, { isActive });
  },
  resendStudentSetupInvite: async (id) => api.post(`/users/${id}/setup-invite`)
};

export default userService;

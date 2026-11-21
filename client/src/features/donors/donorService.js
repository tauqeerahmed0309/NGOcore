import api from '../../services/api';

/**
 * Donor Management API Service Client
 */
export const donorService = {
  /**
   * Fetch paginated list of donors with search, filter, and sort parameters
   */
  getDonors: async (params = {}) => {
    return await api.get('/donors', { params });
  },

  /**
   * Fetch specific donor details by ID with audit logs summary
   */
  getDonorById: async (id) => {
    return await api.get(`/donors/${id}`);
  },

  /**
   * Create a new donor profile
   */
  createDonor: async (donorData) => {
    return await api.post('/donors', donorData);
  },

  /**
   * Update donor profile details
   */
  updateDonor: async (id, donorData) => {
    return await api.put(`/donors/${id}`, donorData);
  },

  /**
   * Change donor status (active, inactive, archived)
   */
  updateStatus: async (id, status) => {
    return await api.patch(`/donors/${id}/status`, { status });
  },

  /**
   * Safely delete donor record (only if clean with no audit history)
   */
  deleteDonor: async (id) => {
    return await api.delete(`/donors/${id}`);
  }
};

export default donorService;

import api from './api';

export const recordService = {
  /**
   * Fetch all record types (schemas) for current NGO
   */
  async getRecordTypes() {
    const res = await api.get('/records/types');
    return res.data?.data || [];
  },

  /**
   * Create a new custom record type
   */
  async createRecordType(data) {
    const res = await api.post('/records/types', data);
    return res.data?.data;
  },

  /**
   * Seed standard non-profit predefined types
   */
  async seedPredefinedTypes() {
    const res = await api.post('/records/types/seed');
    return res.data?.data || [];
  },

  /**
   * Query paginated records with optional filters
   */
  async getRecords(params = {}) {
    const res = await api.get('/records', { params });
    return res.data?.data || { records: [], pagination: {} };
  },

  /**
   * Get single record details by ID
   */
  async getRecordById(id) {
    const res = await api.get(`/records/${id}`);
    return res.data?.data;
  },

  /**
   * Create a new record
   */
  async createRecord(payload) {
    const res = await api.post('/records', payload);
    return res.data?.data;
  },

  /**
   * Update an existing record
   */
  async updateRecord(id, payload) {
    const res = await api.patch(`/records/${id}`, payload);
    return res.data?.data;
  },

  /**
   * Soft-delete a record
   */
  async deleteRecord(id) {
    const res = await api.delete(`/records/${id}`);
    return res.data;
  },

  /**
   * Download CSV template for a record type
   */
  async downloadTemplate(recordTypeId) {
    const res = await api.get(`/records/template/${recordTypeId}`, {
      responseType: 'blob'
    });
    return res.data;
  },

  /**
   * Bulk import records via CSV or JSON rows
   */
  async bulkImport(recordTypeId, { csvText, rows, defaultStatus = 'Submitted', tags = [] }) {
    const res = await api.post(`/records/import/${recordTypeId}`, {
      csvText,
      rows,
      defaultStatus,
      tags
    });
    return res.data?.data;
  },

  /**
   * Export records to CSV
   */
  async exportRecords({ recordTypeId, status, search, masked = false }) {
    const res = await api.get('/records/export', {
      params: { recordTypeId, status, search, masked },
      responseType: 'blob'
    });
    return res.data;
  }
};

export default recordService;

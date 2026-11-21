import api from '../../services/api';

/**
 * Document & Compliance Management API Service Client
 */
export const documentService = {
  /**
   * Fetch paginated documents with search, category, status, and expiry filters
   */
  getDocuments: async (params = {}) => {
    return await api.get('/documents', { params });
  },

  /**
   * Fetch specific document by ID with verification details & audit logs
   */
  getDocumentById: async (id) => {
    return await api.get(`/documents/${id}`);
  },

  /**
   * Fetch document compliance summary metrics
   */
  getDocumentSummary: async () => {
    return await api.get('/documents/summary');
  },

  /**
   * Create a new document record
   */
  createDocument: async (documentData) => {
    return await api.post('/documents', documentData);
  },

  /**
   * Update document details
   */
  updateDocument: async (id, documentData) => {
    return await api.put(`/documents/${id}`, documentData);
  },

  /**
   * Verify document status (Admin only)
   */
  verifyDocument: async (id, verificationData) => {
    return await api.patch(`/documents/${id}/verify`, verificationData);
  },

  /**
   * Archive / soft-delete document record (Admin only)
   */
  deleteDocument: async (id) => {
    return await api.delete(`/documents/${id}`);
  },

  /**
   * Export documents catalog as CSV
   */
  exportDocuments: async (params = {}) => {
    return await api.get('/documents/export', {
      params,
      responseType: 'blob'
    });
  }
};

export default documentService;

import api from '../../services/api';

/**
 * Donation Management API Service Client
 */
export const donationService = {
  /**
   * Fetch paginated list of donations with search, filtering, and sorting
   */
  getDonations: async (params = {}) => {
    return await api.get('/donations', { params });
  },

  /**
   * Fetch specific donation record by ID with donor profile and audit logs
   */
  getDonationById: async (id) => {
    return await api.get(`/donations/${id}`);
  },

  /**
   * Fetch multi-currency summary totals and status counts
   */
  getDonationSummary: async (params = {}) => {
    return await api.get('/donations/summary', { params });
  },

  /**
   * Record a new donation (monetary or in-kind)
   */
  createDonation: async (donationData) => {
    return await api.post('/donations', donationData);
  },

  /**
   * Update permitted fields of a donation record
   */
  updateDonation: async (id, donationData) => {
    return await api.put(`/donations/${id}`, donationData);
  },

  /**
   * Verify a pending donation
   */
  verifyDonation: async (id) => {
    return await api.patch(`/donations/${id}/verify`);
  },

  /**
   * Approve a pending or verified donation (separation of duties enforced)
   */
  approveDonation: async (id) => {
    return await api.patch(`/donations/${id}/approve`);
  },

  /**
   * Reverse or cancel a donation record with a mandatory audit reason
   */
  reverseDonation: async (id, reason) => {
    return await api.post(`/donations/${id}/reverse`, { reason });
  },

  /**
   * Issue official receipt for an approved donation (state-mutating)
   */
  issueReceipt: async (id) => {
    return await api.post(`/donations/${id}/receipt`);
  },

  /**
   * Fetch existing receipt metadata (strictly read-only)
   */
  getReceipt: async (id) => {
    return await api.get(`/donations/${id}/receipt`);
  },

  /**
   * Stream and download official PDF receipt
   */
  downloadReceiptPdf: async (id, receiptNumber = 'Receipt') => {
    const response = await api.get(`/donations/${id}/receipt/pdf`, {
      responseType: 'blob'
    });

    const blob = new Blob([response.data], { type: 'application/pdf' });
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `${receiptNumber}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  },

  /**
   * Export donations dataset in CSV, Excel, or PDF format
   */
  exportDonations: async (format = 'csv', queryParams = {}) => {
    const mimeTypes = {
      csv: 'text/csv',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      pdf: 'application/pdf'
    };

    const response = await api.get('/donations/export', {
      params: { ...queryParams, format },
      responseType: 'blob'
    });

    const blob = new Blob([response.data], { type: mimeTypes[format] || 'application/octet-stream' });
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `Donations_Export_${new Date().toISOString().slice(0, 10)}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  }
};

export default donationService;

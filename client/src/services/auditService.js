import api from './api';

export const auditService = {
  /**
   * Fetch paginated audit trail logs with filtering
   */
  async getAuditLogs(params = {}) {
    const res = await api.get('/audit', { params });
    return res.data;
  },

  /**
   * Run cryptographic SHA-256 hash chain verification
   */
  async verifyChainIntegrity() {
    const res = await api.get('/audit/verify');
    return res.data?.data;
  },

  /**
   * Export audit trail to CSV or JSON
   */
  async exportAuditLogs(format = 'csv') {
    if (format === 'csv') {
      const res = await api.get('/audit/export', {
        params: { format: 'csv' },
        responseType: 'blob'
      });
      // Trigger browser download
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit_trail_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      return { success: true };
    }

    const res = await api.get('/audit/export', { params: { format: 'json' } });
    return res.data?.data;
  }
};

export default auditService;

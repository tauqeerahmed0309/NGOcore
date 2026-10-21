import api from './api';

export const aiService = {
  /**
   * Run phonetic and fuzzy duplicate detection scan
   */
  async scanDuplicates(params = {}) {
    const res = await api.post('/ai/deduplicate', params);
    return res.data?.data || { scannedCount: 0, duplicatesFound: 0, duplicatePairs: [] };
  },

  /**
   * Run data quality and anomaly detection scan
   */
  async scanAnomalies(params = {}) {
    const res = await api.post('/ai/anomalies', params);
    return res.data?.data || { scannedCount: 0, anomaliesFound: 0, flaggedRecords: [] };
  },

  /**
   * Merge duplicate records into a master record
   */
  async mergeRecords(payload) {
    const res = await api.post('/ai/merge', payload);
    return res.data?.data;
  },

  /**
   * Analyze vulnerability clustering tiers
   */
  async analyzeVulnerability(params = {}) {
    const res = await api.post('/ai/vulnerability', params);
    return res.data?.data?.analytics || null;
  },

  /**
   * Forecast future aid relief demand
   */
  async getForecast(periodsAhead = 3) {
    const res = await api.get('/ai/forecast', { params: { periodsAhead } });
    return res.data?.data?.forecast || null;
  },

  /**
   * Get past AI run history
   */
  async getHistory(params = {}) {
    const res = await api.get('/ai/history', { params });
    return res.data?.data || [];
  }
};

import api from './api';

const dataAssistantService = {
  analyze: async (recordType) => api.post(`/assistant/clean/${recordType}`),

  review: async (recordType, decision) => api.post(`/assistant/clean/${recordType}/review`, decision),

  getInsights: async (recordType) => api.get(`/assistant/insights/${recordType}`, { timeout: 30000 }),

  getAiStatus: async () => api.get('/assistant/ai/status'),

  explainFinding: async (payload) => api.post('/assistant/ai/explain-finding', payload),

  explainDuplicate: async (payload) => api.post('/assistant/ai/explain-duplicate', payload),

  normalizeText: async (payload) => api.post('/assistant/ai/normalize-text', payload)
};

export default dataAssistantService;

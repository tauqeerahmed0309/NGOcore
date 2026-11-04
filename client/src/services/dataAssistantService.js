import api from './api';

const dataAssistantService = {
  analyze: async (recordType) => api.post(`/assistant/clean/${recordType}`),

  review: async (recordType, decision) => api.post(`/assistant/clean/${recordType}/review`, decision),

  getInsights: async (recordType) => api.get(`/assistant/insights/${recordType}`, { timeout: 30000 })
};

export default dataAssistantService;

import api from '../../services/api';

export const reportService = {
  getReminders: () => api.get('/reports/reminders'),

  getBeneficiaryReport: (params = {}) => {
    const isBlob = params.format && params.format !== 'json';
    return api.get('/reports/beneficiaries', {
      params,
      responseType: isBlob ? 'blob' : 'json'
    });
  },

  getProgramReport: (params = {}) => {
    const isBlob = params.format && params.format !== 'json';
    return api.get('/reports/programs', {
      params,
      responseType: isBlob ? 'blob' : 'json'
    });
  },

  getOrgSummaryReport: (params = {}) => {
    const isBlob = params.format && params.format !== 'json';
    return api.get('/reports/summary', {
      params,
      responseType: isBlob ? 'blob' : 'json'
    });
  },

  downloadParticipation: (from, to) => api.get('/reports/participation.csv', {
    params: { from, to },
    responseType: 'blob'
  })
};

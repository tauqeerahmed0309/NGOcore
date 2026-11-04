import api from '../../services/api';

export const reportService = {
  getReminders: () => api.get('/reports/reminders'),
  downloadParticipation: (from, to) => api.get('/reports/participation.csv', {
    params: { from, to },
    responseType: 'blob'
  })
};

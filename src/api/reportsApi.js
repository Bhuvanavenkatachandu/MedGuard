import apiClient from './axios';

export const reportsApi = {
  getSummary: async () => {
    const res = await apiClient.get('/reports/summary');
    return res.data;
  },

  getEmailLogs: async () => {
    const res = await apiClient.get('/reports/email-logs');
    return res.data;
  },
};

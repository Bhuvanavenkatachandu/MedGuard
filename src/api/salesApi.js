import apiClient from './axios';

export const salesApi = {
  getSales: async () => {
    const res = await apiClient.get('/sales');
    return res.data;
  },

  checkout: async (payload) => {
    const res = await apiClient.post('/sales/checkout', payload);
    return res.data;
  },
};

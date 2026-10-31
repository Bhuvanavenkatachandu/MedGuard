import apiClient from './axios';

export const medicinesApi = {
  getMedicines: async () => {
    const res = await apiClient.get('/medicines');
    return res.data;
  },

  createMedicine: async (payload) => {
    const res = await apiClient.post('/medicines', payload);
    return res.data;
  },
};

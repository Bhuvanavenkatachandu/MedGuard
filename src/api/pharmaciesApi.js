import apiClient from './axios';

export const pharmaciesApi = {
  getMyPharmacy: async () => {
    const res = await apiClient.get('/pharmacies/me');
    return res.data;
  },

  createPharmacy: async (payload) => {
    const res = await apiClient.post('/pharmacies', payload);
    return res.data;
  },

  updatePharmacy: async (payload) => {
    const res = await apiClient.put('/pharmacies/me', payload);
    return res.data;
  },
};

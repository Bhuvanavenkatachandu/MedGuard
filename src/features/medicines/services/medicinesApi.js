import apiClient from '../../../shared/api/axios';

export const medicinesApi = {
  getMedicines: async () => {
    const res = await apiClient.get('/medicines');
    return res.data;
  },

  getMedicine: async (id) => {
    const res = await apiClient.get(`/medicines/${id}`);
    return res.data;
  },

  createMedicine: async (payload) => {
    const res = await apiClient.post('/medicines', payload);
    return res.data;
  },

  updateMedicine: async (id, payload) => {
    const res = await apiClient.put(`/medicines/${id}`, payload);
    return res.data;
  },

  deleteMedicine: async (id) => {
    const res = await apiClient.delete(`/medicines/${id}`);
    return res.data;
  },
};

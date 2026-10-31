import apiClient from './axios';

export const batchesApi = {
  getBatches: async () => {
    const res = await apiClient.get('/batches');
    return res.data;
  },

  getFefoBatches: async (medicineId) => {
    const res = await apiClient.get(`/batches/fefo/${medicineId}`);
    return res.data;
  },
};

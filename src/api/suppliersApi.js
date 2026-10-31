import apiClient from './axios';

export const suppliersApi = {
  getSuppliers: async () => {
    const res = await apiClient.get('/suppliers');
    return res.data;
  },

  createSupplier: async (payload) => {
    const res = await apiClient.post('/suppliers', payload);
    return res.data;
  },
};

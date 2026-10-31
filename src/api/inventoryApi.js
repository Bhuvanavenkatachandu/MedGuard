import apiClient from './axios';

export const inventoryApi = {
  getInventory: async () => {
    const res = await apiClient.get('/inventory');
    return res.data;
  },

  addStock: async (payload) => {
    const res = await apiClient.post('/inventory', payload);
    return res.data;
  },

  adjustStock: async (inventoryId, newTotalPieces, reason) => {
    const res = await apiClient.put(`/inventory/${inventoryId}/adjust`, {
      newTotalPieces,
      reason,
    });
    return res.data;
  },

  deleteInventory: async (inventoryId) => {
    const res = await apiClient.delete(`/inventory/${inventoryId}`);
    return res.data;
  },

  markBatchExpired: async (batchId) => {
    const res = await apiClient.post(`/inventory/batches/${batchId}/expire`);
    return res.data;
  },
};

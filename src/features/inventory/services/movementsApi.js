import apiClient from '../../../shared/api/axios';

export const movementsApi = {
  getMovements: async () => {
    const res = await apiClient.get('/movements');
    return res.data;
  },
};

import apiClient from './axios';

export const customersApi = {
  getCustomers: async () => {
    const res = await apiClient.get('/customers');
    return res.data;
  },

  getCustomerByPhone: async (phone) => {
    const res = await apiClient.get(`/customers/by-phone/${encodeURIComponent(phone)}`);
    return res.data;
  },

  createCustomer: async (payload) => {
    const res = await apiClient.post('/customers', payload);
    return res.data;
  },
};

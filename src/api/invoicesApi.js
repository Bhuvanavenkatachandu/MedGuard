import apiClient from './axios';

export const invoicesApi = {
  getInvoices: async () => {
    const res = await apiClient.get('/invoices');
    return res.data;
  },

  resendEmail: async (invoiceId) => {
    const res = await apiClient.post(`/invoices/${invoiceId}/resend-email`);
    return res.data;
  },

  getPdfUrl: (invoiceId) => {
    const base = apiClient.defaults.baseURL || 'http://localhost:8000/api';
    return `${base}/invoices/${invoiceId}/pdf`;
  },
};

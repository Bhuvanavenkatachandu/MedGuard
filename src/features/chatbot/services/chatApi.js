import apiClient from '../../../shared/api/axios';

export const chatApi = {
  sendMessage: async ({ message, session_id, pharmacy_id }) => {
    const res = await apiClient.post('/chat/query', {
      message,
      session_id,
      pharmacy_id,
    });
    return res.data;
  },

  getSessions: async (pharmacy_id) => {
    const params = pharmacy_id ? { pharmacy_id } : {};
    const res = await apiClient.get('/chat/sessions', { params });
    return res.data;
  },

  getSessionDetail: async (session_id) => {
    const res = await apiClient.get(`/chat/sessions/${session_id}`);
    return res.data;
  },

  deleteSession: async (session_id) => {
    const res = await apiClient.delete(`/chat/sessions/${session_id}`);
    return res.data;
  },
};

export default chatApi;

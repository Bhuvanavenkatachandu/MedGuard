import apiClient from '../../../shared/api/axios';

export const knowledgeApi = {
  getDocuments: async (category) => {
    const params = category && category !== 'ALL' ? { category } : {};
    const res = await apiClient.get('/knowledge', { params });
    return res.data;
  },

  getDocument: async (id) => {
    const res = await apiClient.get(`/knowledge/${id}`);
    return res.data;
  },

  createDocument: async (data) => {
    const res = await apiClient.post('/knowledge', data);
    return res.data;
  },

  uploadFile: async (formData) => {
    const res = await apiClient.post('/knowledge/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },

  updateDocument: async (id, data) => {
    const res = await apiClient.put(`/knowledge/${id}`, data);
    return res.data;
  },

  deleteDocument: async (id) => {
    const res = await apiClient.delete(`/knowledge/${id}`);
    return res.data;
  },
};

export default knowledgeApi;

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

/**
 * MedGuard Unified API Client
 * Clean HTTP client for REST API calls across frontend components
 */
const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auto-attach Bearer JWT token if user is authenticated
client.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('medguard_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error unwrapping
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config.url.includes('/auth/me')) {
      console.warn('Unauthorized session. Re-authentication required.');
    }
    return Promise.reject(error);
  }
);

export const api = {
  get: async (url, config = {}) => {
    const res = await client.get(url, config);
    return res.data;
  },
  post: async (url, data = {}, config = {}) => {
    const res = await client.post(url, data, config);
    return res.data;
  },
  put: async (url, data = {}, config = {}) => {
    const res = await client.put(url, data, config);
    return res.data;
  },
  delete: async (url, config = {}) => {
    const res = await client.delete(url, config);
    return res.data;
  },
  client,
};

export default api;

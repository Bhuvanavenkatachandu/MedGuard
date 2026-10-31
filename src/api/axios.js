import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Automatically attach Bearer JWT token if user is authenticated
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('medguard_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Intercept 401s and handle token expiration
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Don't auto-clear if checking /me on initial load
      if (!error.config.url.includes('/auth/me')) {
        console.warn('Session expired or unauthorized. Please re-authenticate.');
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;

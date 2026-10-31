import apiClient from './axios';

export const authApi = {
  register: async ({ email, password, fullName, phone }) => {
    const res = await apiClient.post('/auth/register', {
      email,
      password,
      fullName,
      phone,
    });
    return res.data;
  },

  login: async (emailOrObj, passwordArg) => {
    let email = '';
    let password = '';
    if (typeof emailOrObj === 'object' && emailOrObj !== null) {
      email = emailOrObj.email;
      password = emailOrObj.password;
    } else {
      email = emailOrObj;
      password = passwordArg;
    }
    const res = await apiClient.post('/auth/login', {
      email: (email || '').trim(),
      password: password || '',
    });
    return res.data;
  },

  getMe: async () => {
    const res = await apiClient.get('/auth/me');
    return res.data;
  },

  logout: async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (e) {
      // Ignored
    }
  },
};

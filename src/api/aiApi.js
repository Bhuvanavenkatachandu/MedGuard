import apiClient from './axios';

export const aiApi = {
  scanMedicine: async (imageBase64) => {
    const res = await apiClient.post('/ai/scan-medicine', {
      image_base64: imageBase64,
    });
    return res.data;
  },

  scanMedicineFile: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post('/ai/scan-medicine', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },
};

import apiClient from './axios';

export const publicApi = {
  searchMedicines: async ({ query, lat, lng, maxDistanceKm, sessionToken }) => {
    const params = {};
    if (query) params.query = query;
    if (lat !== undefined) params.lat = lat;
    if (lng !== undefined) params.lng = lng;
    if (maxDistanceKm) params.max_distance_km = maxDistanceKm;
    if (sessionToken) params.session_token = sessionToken;

    const res = await apiClient.get('/public/medicines/search', { params });
    return res.data;
  },

  recordSearchSession: async ({ sessionToken, query, lat, lng }) => {
    try {
      await apiClient.post('/public/search-session', {
        session_token: sessionToken,
        search_query: query,
        user_lat: lat,
        user_lng: lng,
      });
    } catch (e) {
      // Ignored for non-blocking analytics
    }
  },

  getPharmacies: async () => {
    const res = await apiClient.get('/public/pharmacies');
    return res.data;
  },
};

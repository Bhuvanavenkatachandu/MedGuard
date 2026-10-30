/**
 * Geolocation & Distance Calculation Utilities
 */

/**
 * Calculates great-circle distance between two points on the Earth (Haversine formula)
 * @param {number} lat1 Latitude of point 1
 * @param {number} lon1 Longitude of point 1
 * @param {number} lat2 Latitude of point 2
 * @param {number} lon2 Longitude of point 2
 * @returns {number} Distance in kilometers
 */
export const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
  if (lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined) {
    return 0;
  }

  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;

  return Math.round(d * 10) / 10; // Round to 1 decimal place
};

/**
 * Generates Google Maps Directions URL
 */
export const getGoogleMapsDirectionsUrl = (destLat, destLng, pharmacyName = '') => {
  const query = `${destLat},${destLng}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${query}&travelmode=driving`;
};

/**
 * Popular location presets for rapid demo testing
 */
export const DEMO_LOCATIONS = [
  { name: 'Indiranagar Metro (Current Spot)', lat: 12.9784, lng: 77.6408 },
  { name: 'Koramangala Sony World Signal', lat: 12.9352, lng: 77.6245 },
  { name: 'MG Road Metro Station', lat: 12.9756, lng: 77.6066 },
  { name: 'HSR Layout BDA Complex', lat: 12.9116, lng: 77.6474 },
];

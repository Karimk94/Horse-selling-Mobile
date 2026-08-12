/**
 * Location Service for SteedMarket
 * Features:
 * - Free OpenStreetMap Nominatim Geocoding API integration (1 req/sec rate limit, custom User-Agent, in-memory cache)
 * - GPS position reading via expo-location (with graceful fallbacks)
 * - Haversine distance calculator for distance-based search
 */

let Location = null;
try {
  Location = require('expo-location');
} catch (e) {
  // expo-location optional
}

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';
const USER_AGENT = 'SteedMarket-EquestrianApp/1.0 (contact@steedmarket.ae)';

// Simple in-memory LRU cache for forward/reverse geocoding
const cache = new Map();
const MAX_CACHE_SIZE = 100;

let lastRequestTime = 0;

/**
 * Throttle requests to respect Nominatim 1 req/sec policy.
 */
async function throttleRequest() {
  const now = Date.now();
  const timeSinceLast = now - lastRequestTime;
  if (timeSinceLast < 1050) {
    await new Promise((resolve) => setTimeout(resolve, 1050 - timeSinceLast));
  }
  lastRequestTime = Date.now();
}

/**
 * Forward Geocode — search text location query to lat/lng results
 * @param {string} query Search text (e.g. "Dubai", "Riyadh")
 * @returns {Promise<Array<{display_name: string, lat: number, lon: number, address: object}>>}
 */
export async function searchLocations(query) {
  if (!query || query.trim().length < 2) return [];

  const cleanQuery = query.trim().toLowerCase();
  if (cache.has(cleanQuery)) {
    return cache.get(cleanQuery);
  }

  try {
    await throttleRequest();

    const url = `${NOMINATIM_BASE_URL}/search?q=${encodeURIComponent(
      cleanQuery
    )}&format=jsonv2&addressdetails=1&limit=5&accept-language=ar,en`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept-Language': 'ar,en',
      },
    });

    if (!response.ok) {
      throw new Error(`Nominatim API HTTP ${response.status}`);
    }

    const data = await response.json();
    const results = data.map((item) => ({
      display_name: item.display_name,
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
      city: item.address?.city || item.address?.state || item.address?.country || '',
      country: item.address?.country || '',
    }));

    if (cache.size >= MAX_CACHE_SIZE) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }
    cache.set(cleanQuery, results);

    return results;
  } catch (error) {
    console.warn('[locationService] searchLocations error:', error.message);
    return [];
  }
}

/**
 * Reverse Geocode — lat/lng to display name
 * @param {number} latitude
 * @param {number} longitude
 * @returns {Promise<{display_name: string, city: string, country: string}>}
 */
export async function reverseGeocode(latitude, longitude) {
  const cacheKey = `rev_${latitude.toFixed(4)}_${longitude.toFixed(4)}`;
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  try {
    await throttleRequest();

    const url = `${NOMINATIM_BASE_URL}/reverse?lat=${latitude}&lon=${longitude}&format=jsonv2&addressdetails=1&accept-language=ar,en`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept-Language': 'ar,en',
      },
    });

    if (!response.ok) {
      throw new Error(`Nominatim Reverse HTTP ${response.status}`);
    }

    const data = await response.json();
    const result = {
      display_name: data.display_name || '',
      city: data.address?.city || data.address?.state || data.address?.town || '',
      country: data.address?.country || '',
    };

    cache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.warn('[locationService] reverseGeocode error:', error.message);
    return {
      display_name: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
      city: '',
      country: '',
    };
  }
}

/**
 * Request device location permissions and fetch current GPS position.
 * @returns {Promise<{latitude: number, longitude: number, display_name: string} | null>}
 */
export async function getCurrentDeviceLocation() {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      return null;
    }

    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const lat = loc.coords.latitude;
    const lon = loc.coords.longitude;
    const geo = await reverseGeocode(lat, lon);

    return {
      latitude: lat,
      longitude: lon,
      display_name: geo.display_name || `${lat.toFixed(4)}, ${lon.toFixed(4)}`,
      city: geo.city,
      country: geo.country,
    };
  } catch (error) {
    console.warn('[locationService] getCurrentDeviceLocation error:', error.message);
    return null;
  }
}

/**
 * Calculate distance in kilometers between two lat/lng coordinates (Haversine formula).
 * @param {number} lat1
 * @param {number} lon1
 * @param {number} lat2
 * @param {number} lon2
 * @returns {number} distance in km
 */
export function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

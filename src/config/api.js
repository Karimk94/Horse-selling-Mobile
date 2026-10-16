// Change this to your backend server URL
// For Android emulator use: http://10.0.2.2:8000
// For iOS simulator use: http://localhost:8000
// For physical device use your machine's local IP: http://192.168.x.x:8000
// Production backend URL (Railway)
// If you need to use a port, append :8000 — try without port first.
export const API_BASE_URL = 'https://horse-selling-backend-production.up.railway.app';

/**
 * Normalizes media URLs. If a URL points to /uploads/ on localhost or an old backend,
 * rewrites it using the current API_BASE_URL.
 */
export const resolveMediaUrl = (url) => {
  if (!url || typeof url !== 'string') return url;

  // Preserve local device URIs (from camera / photo library / blob / data)
  if (
    url.startsWith('file:') ||
    url.startsWith('ph:') ||
    url.startsWith('content:') ||
    url.startsWith('blob:') ||
    url.startsWith('data:')
  ) {
    return url;
  }

  const uploadsIndex = url.indexOf('/uploads/');
  if (uploadsIndex !== -1) {
    const base = API_BASE_URL.replace(/\/+$/, '');
    const path = url.substring(uploadsIndex);
    return `${base}${path}`;
  }

  return url;
};
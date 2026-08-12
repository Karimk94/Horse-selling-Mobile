import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

let unauthorizedHandler = null;
let unauthorizedHandlerPromise = null;
const recentIdempotencyKeys = new Map();
const IDEMPOTENCY_WINDOW_MS = 30000;
const ADMIN_DASHBOARD_CACHE_MAX_AGE_MS = 45000;
let adminDashboardCache = null;
let adminDashboardInFlight = null;
const adminRequestControllers = new Map();
const ADMIN_TELEMETRY_MAX_EVENTS = 120;
const adminRequestTelemetry = [];

function isAdminRequestUrl(url = '') {
  return typeof url === 'string' && url.includes('/api/v1/admin/');
}

function isCanceledRequestError(error) {
  return axios.isCancel(error) || error?.code === 'ERR_CANCELED' || error?.name === 'CanceledError';
}

function pushAdminRequestTelemetry(entry) {
  adminRequestTelemetry.push(entry);
  if (adminRequestTelemetry.length > ADMIN_TELEMETRY_MAX_EVENTS) {
    adminRequestTelemetry.splice(0, adminRequestTelemetry.length - ADMIN_TELEMETRY_MAX_EVENTS);
  }
}

function recordAdminRequestTelemetry(config, { statusCode = null, canceled = false, errorMessage = null } = {}) {
  if (!isAdminRequestUrl(config?.url)) {
    return;
  }

  const start = config?.metadata?.startTime ?? Date.now();
  const durationMs = Math.max(0, Date.now() - start);

  pushAdminRequestTelemetry({
    timestamp: new Date().toISOString(),
    method: String(config?.method || 'get').toUpperCase(),
    url: config?.url || '',
    statusCode,
    durationMs,
    canceled,
    errorMessage: errorMessage || null,
  });
}

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  config.metadata = {
    ...(config.metadata || {}),
    startTime: Date.now(),
  };

  return config;
});

const AUTH_EXCLUDED_PATHS = [
  '/auth/login',
  '/auth/signup',
  '/auth/send-otp',
  '/auth/verify-otp',
];

function pruneExpiredIdempotencyKeys() {
  const now = Date.now();

  recentIdempotencyKeys.forEach((value, key) => {
    if (now - value.createdAt > IDEMPOTENCY_WINDOW_MS) {
      recentIdempotencyKeys.delete(key);
    }
  });
}

function stableSerialize(value) {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value !== 'object') {
    return String(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableSerialize).join(',')}]`;
  }

  return `{${Object.keys(value)
    .sort()
    .map((key) => `${key}:${stableSerialize(value[key])}`)
    .join('|')}}`;
}

function generateIdempotencyKey() {
  return `mobile-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

function resolveIdempotencyKey(signature, providedKey) {
  if (providedKey) {
    return providedKey;
  }

  pruneExpiredIdempotencyKeys();

  const existing = recentIdempotencyKeys.get(signature);
  if (existing) {
    return existing.key;
  }

  const nextKey = generateIdempotencyKey();
  recentIdempotencyKeys.set(signature, {
    key: nextKey,
    createdAt: Date.now(),
  });
  return nextKey;
}

function withIdempotency(config = {}, scope, payload = null) {
  const { headers = {}, idempotencyKey, ...axiosConfig } = config;
  const signature = `${scope}:${stableSerialize(payload)}`;
  const resolvedKey = resolveIdempotencyKey(signature, idempotencyKey);

  return {
    ...axiosConfig,
    headers: {
      ...headers,
      'Idempotency-Key': resolvedKey,
    },
  };
}

function shouldHandleUnauthorized(error) {
  const status = error?.response?.status;
  const requestUrl = error?.config?.url || '';

  if (status !== 401 || error?.config?.skipUnauthorizedHandler) {
    return false;
  }

  return !AUTH_EXCLUDED_PATHS.some((path) => requestUrl.includes(path));
}

api.interceptors.response.use(
  (response) => {
    recordAdminRequestTelemetry(response.config, {
      statusCode: response?.status ?? null,
      canceled: false,
      errorMessage: null,
    });

    return response;
  },
  async (error) => {
    recordAdminRequestTelemetry(error?.config, {
      statusCode: error?.response?.status ?? null,
      canceled: isCanceledRequestError(error),
      errorMessage: error?.message || null,
    });

    if (shouldHandleUnauthorized(error) && unauthorizedHandler) {
      if (!unauthorizedHandlerPromise) {
        unauthorizedHandlerPromise = Promise.resolve(unauthorizedHandler(error))
          .catch(() => {})
          .finally(() => {
            unauthorizedHandlerPromise = null;
          });
      }

      await unauthorizedHandlerPromise;
    }

    return Promise.reject(error);
  }
);

export const registerUnauthorizedHandler = (handler) => {
  unauthorizedHandler = handler;

  return () => {
    if (unauthorizedHandler === handler) {
      unauthorizedHandler = null;
    }
  };
};

// Auth
export const login = (email, password) =>
  api.post('/auth/login', { email, password });

export const signup = (data) => api.post('/auth/signup', data);

export const sendOtp = (email) => api.post('/auth/send-otp', { email });

export const verifyOtp = (email, otp) =>
  api.post('/auth/verify-otp', { email, otp });

// Horses
export const getHorses = (params) => api.get('/api/v1/horses', { params });

export const getHorse = (id) => api.get(`/api/v1/horses/${id}`);

export const createHorse = (data) => api.post('/api/v1/horses', data);

export const updateHorse = (id, data) => api.put(`/api/v1/horses/${id}`, data);

export const deleteHorse = (id) => api.delete(`/api/v1/horses/${id}`);

export const reopenHorseListing = (id, config = {}) =>
  api.post(
    `/api/v1/horses/${id}/reopen`,
    {},
    withIdempotency(config, `reopen-horse:${id}`)
  );

export const restoreHorseListing = (id) =>
  api.post(`/api/v1/horses/${id}/restore`, {});

// Favorites
export const getFavorites = () => api.get('/api/v1/favorites');

export const addFavorite = (horseId) =>
  api.post('/api/v1/favorites', { horse_id: horseId });

export const removeFavorite = (horseId) =>
  api.delete(`/api/v1/favorites/${horseId}`);

export const isFavorite = (horseId) =>
  api.get(`/api/v1/horses/${horseId}/is-favorite`);

// Saved searches (buyer alerts)
export const getSavedSearches = () => api.get('/api/v1/saved-searches');

export const createSavedSearch = (data) => api.post('/api/v1/saved-searches', data);

export const updateSavedSearch = (id, data) => api.put(`/api/v1/saved-searches/${id}`, data);

export const deleteSavedSearch = (id) => api.delete(`/api/v1/saved-searches/${id}`);

export const getSavedSearchMatches = (id) => api.get(`/api/v1/saved-searches/${id}/matches`);

export const getSavedSearchAlerts = () => api.get('/api/v1/saved-search-alerts');

export const getSavedSearchAlertsUnreadCount = () =>
  api.get('/api/v1/saved-search-alerts/unread-count');

export const markSavedSearchAlertRead = (id) =>
  api.post(`/api/v1/saved-search-alerts/${id}/read`, {});

export const markAllSavedSearchAlertsRead = () =>
  api.post('/api/v1/saved-search-alerts/read-all', {});

export const registerPushToken = (token, platform) =>
  api.post('/api/v1/notifications/push-token', { token, platform });

export const unregisterPushToken = (token, config = {}) =>
  api.post('/api/v1/notifications/push-token/unregister', { token }, config);

// Profile
export const getProfile = () => api.get('/api/v1/profile');

export const updateProfile = (data) => api.put('/api/v1/profile', data);

// Media
export const uploadMedia = (formData) =>
  api.post('/api/v1/media/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 30000,
  });

// Vouchers
export const validateVoucher = (code, originalPrice) =>
  api.post('/api/v1/vouchers/validate', { code, original_price: originalPrice });

// Admin
export const adminListUsers = ({ skip = 0, limit = 20 } = {}) =>
  api.get('/api/v1/admin/users', { params: { skip, limit } });

export const adminUpdateUserRole = (userId, role) =>
  api.put(`/api/v1/admin/users/${userId}/role`, { role });

export const adminUpdateUser = (userId, data) =>
  api.put(`/api/v1/admin/users/${userId}`, data);

export const adminListListings = ({ skip = 0, limit = 20 } = {}) =>
  api.get('/api/v1/admin/listings', { params: { skip, limit } });

export const adminListPendingListings = ({ skip = 0, limit = 20 } = {}) =>
  api.get('/api/v1/admin/listings/pending', { params: { skip, limit } });

export const adminListDeletedListings = ({ skip = 0, limit = 20 } = {}) =>
  api.get('/api/v1/admin/listings/deleted', { params: { skip, limit } });

export const adminGetSecurityStatus = () =>
  api.get('/api/v1/admin/security/status');

function createAdminAbortSignal(requestKey) {
  const previousController = adminRequestControllers.get(requestKey);
  if (previousController) {
    previousController.abort();
  }

  const controller = new AbortController();
  adminRequestControllers.set(requestKey, controller);
  return { controller, signal: controller.signal };
}

function releaseAdminAbortSignal(requestKey, controller) {
  if (adminRequestControllers.get(requestKey) === controller) {
    adminRequestControllers.delete(requestKey);
  }
}

export const cancelAdminRequest = (requestKey) => {
  const controller = adminRequestControllers.get(requestKey);
  if (!controller) return;
  controller.abort();
  adminRequestControllers.delete(requestKey);
};

export const cancelAllAdminRequests = () => {
  adminRequestControllers.forEach((controller) => controller.abort());
  adminRequestControllers.clear();
};

export const isRequestCanceled = (error) =>
  isCanceledRequestError(error);

export const getAdminRequestTelemetry = ({ limit = 50 } = {}) => {
  const boundedLimit = Math.max(1, Math.min(limit, ADMIN_TELEMETRY_MAX_EVENTS));
  return adminRequestTelemetry.slice(-boundedLimit).reverse();
};

export const clearAdminRequestTelemetry = () => {
  adminRequestTelemetry.splice(0, adminRequestTelemetry.length);
};

export const adminListUsersCancelable = async ({ skip = 0, limit = 20, requestKey = 'admin-users' } = {}) => {
  const { controller, signal } = createAdminAbortSignal(requestKey);
  try {
    return await api.get('/api/v1/admin/users', { params: { skip, limit }, signal });
  } finally {
    releaseAdminAbortSignal(requestKey, controller);
  }
};

export const adminListListingsCancelable = async ({ skip = 0, limit = 20, requestKey = 'admin-listings' } = {}) => {
  const { controller, signal } = createAdminAbortSignal(requestKey);
  try {
    return await api.get('/api/v1/admin/listings', { params: { skip, limit }, signal });
  } finally {
    releaseAdminAbortSignal(requestKey, controller);
  }
};

export const adminListPendingListingsCancelable = async ({ skip = 0, limit = 20, requestKey = 'admin-pending' } = {}) => {
  const { controller, signal } = createAdminAbortSignal(requestKey);
  try {
    return await api.get('/api/v1/admin/listings/pending', { params: { skip, limit }, signal });
  } finally {
    releaseAdminAbortSignal(requestKey, controller);
  }
};

export const adminListDeletedListingsCancelable = async ({ skip = 0, limit = 20, requestKey = 'admin-deleted' } = {}) => {
  const { controller, signal } = createAdminAbortSignal(requestKey);
  try {
    return await api.get('/api/v1/admin/listings/deleted', { params: { skip, limit }, signal });
  } finally {
    releaseAdminAbortSignal(requestKey, controller);
  }
};

function isAdminDashboardCacheFresh(maxAgeMs = ADMIN_DASHBOARD_CACHE_MAX_AGE_MS) {
  if (!adminDashboardCache?.cachedAt) return false;
  return Date.now() - adminDashboardCache.cachedAt <= maxAgeMs;
}

export const adminGetDashboardSnapshot = ({ allowStale = true } = {}) => {
  if (!adminDashboardCache?.data) {
    return null;
  }

  if (!allowStale && !isAdminDashboardCacheFresh()) {
    return null;
  }

  return adminDashboardCache.data;
};

export const adminInvalidateDashboardCache = () => {
  adminDashboardCache = null;
};

export const adminFetchDashboard = async ({ skip = 0, limit = 20, force = false, signal = null } = {}) => {
  if (!force && isAdminDashboardCacheFresh()) {
    return adminDashboardCache.data;
  }

  if (adminDashboardInFlight) {
    return adminDashboardInFlight;
  }

  adminDashboardInFlight = (async () => {
    const [usersRes, listingsRes, pendingRes, deletedRes, reviewsRes, securityRes] = await Promise.all([
      api.get('/api/v1/admin/users', { params: { skip, limit }, signal }),
      api.get('/api/v1/admin/listings', { params: { skip, limit }, signal }),
      api.get('/api/v1/admin/listings/pending', { params: { skip, limit }, signal }),
      api.get('/api/v1/admin/listings/deleted', { params: { skip, limit }, signal }),
      api.get('/api/v1/admin/reviews', { signal }),
      api.get('/api/v1/admin/security/status', { signal }).catch(() => ({ data: null })),
    ]);

    const payload = {
      users: usersRes.data,
      listings: listingsRes.data,
      pending: pendingRes.data,
      deleted: deletedRes.data,
      reviews: reviewsRes.data,
      security: securityRes.data,
    };

    adminDashboardCache = {
      data: payload,
      cachedAt: Date.now(),
    };

    return payload;
  })();

  try {
    return await adminDashboardInFlight;
  } finally {
    adminDashboardInFlight = null;
  }
};

export const adminPurgeExpiredDeletedListings = (confirmToken) =>
  api.delete('/api/v1/admin/listings/deleted/expired', {
    params: { confirm_token: confirmToken },
  });

export const adminBulkRestoreListings = (horseIds) =>
  api.post('/api/v1/admin/listings/bulk/restore', { horse_ids: horseIds });

export const adminBulkPurgeDeletedListings = (horseIds, confirmToken) =>
  api.post('/api/v1/admin/listings/bulk/purge', {
    horse_ids: horseIds,
    confirm_token: confirmToken,
  });

export const adminListReviews = () => api.get('/api/v1/admin/reviews');

export const adminApproveListing = (horseId) =>
  api.post(`/api/v1/admin/listings/${horseId}/approve`, {});

export const adminRejectListing = (horseId, reason) =>
  api.post(`/api/v1/admin/listings/${horseId}/reject`, { reason });

export const adminGetOfferTransitionAudits = (
  offerId,
  { actor = null, toStatus = null, skip = 0, limit = 50 } = {}
) =>
  api.get(`/api/v1/admin/offers/${offerId}/transitions`, {
    params: {
      actor: actor || undefined,
      to_status: toStatus || undefined,
      skip,
      limit,
    },
  });

export const adminListPushDeliveryLogs = (
  { status = null, eventType = null, skip = 0, limit = 50 } = {}
) =>
  api.get('/api/v1/admin/notifications/push-delivery-logs', {
    params: {
      status_filter: status || undefined,
      event_type: eventType || undefined,
      skip,
      limit,
    },
  });

export default api;

// Offers
export const createOffer = (horseId, amount, message) =>
  api.post(`/api/v1/horses/${horseId}/offers`, { amount, message });

export const getMyOffers = (role = 'all', status = null, skip = 0, limit = 20) =>
  api.get('/api/v1/offers', { params: { role, status_filter: status, skip, limit } });

export const getHorseOffers = (horseId) =>
  api.get(`/api/v1/horses/${horseId}/offers`);

export const counterOffer = (offerId, counterAmount, responseMessage, config = {}) => {
  const payload = { counter_amount: counterAmount, response_message: responseMessage };
  return api.put(
    `/api/v1/offers/${offerId}/counter`,
    payload,
    withIdempotency(config, `counter-offer:${offerId}`, payload)
  );
};

export const acceptOffer = (offerId, responseMessage, config = {}) => {
  const payload = { response_message: responseMessage };
  return api.put(
    `/api/v1/offers/${offerId}/accept`,
    payload,
    withIdempotency(config, `accept-offer:${offerId}`, payload)
  );
};

export const rejectOffer = (offerId, responseMessage, config = {}) => {
  const payload = { response_message: responseMessage };
  return api.put(
    `/api/v1/offers/${offerId}/reject`,
    payload,
    withIdempotency(config, `reject-offer:${offerId}`, payload)
  );
};

export const cancelOffer = (offerId, responseMessage = null, config = {}) => {
  const payload = { response_message: responseMessage };
  return api.put(
    `/api/v1/offers/${offerId}/cancel`,
    payload,
    withIdempotency(config, `cancel-offer:${offerId}`, payload)
  );
};

export const markOfferHorseSold = (offerId, config = {}) =>
  api.post(
    `/api/v1/offers/${offerId}/mark-sold`,
    {},
    withIdempotency(config, `mark-sold:${offerId}`)
  );

export const getActionRequiredOffersCount = () =>
  api.get('/api/v1/offers/action-required-count');

// ── Equipment API ─────────────────────────────────────────────────────────────
export const getEquipmentList = (params = {}) =>
  api.get('/api/v1/equipment', { params });

export const getEquipmentDetail = (id) =>
  api.get(`/api/v1/equipment/${id}`);

export const createEquipment = (data) =>
  api.post('/api/v1/equipment', data);

export const updateEquipment = (id, data) =>
  api.put(`/api/v1/equipment/${id}`, data);

export const deleteEquipment = (id) =>
  api.delete(`/api/v1/equipment/${id}`);

export const adminGetPendingEquipment = (skip = 0, limit = 20) =>
  api.get('/api/v1/admin/equipment/pending', { params: { skip, limit } });

export const adminApproveEquipment = (id) =>
  api.post(`/api/v1/admin/equipment/${id}/approve`);

export const adminRejectEquipment = (id, reason) =>
  api.post(`/api/v1/admin/equipment/${id}/reject`, { reason });

// ── Rider Gear API ────────────────────────────────────────────────────────────
export const getRiderGearList = (params = {}) =>
  api.get('/api/v1/rider-gear', { params });

export const getRiderGearDetail = (id) =>
  api.get(`/api/v1/rider-gear/${id}`);

export const createRiderGear = (data) =>
  api.post('/api/v1/rider-gear', data);

export const updateRiderGear = (id, data) =>
  api.put(`/api/v1/rider-gear/${id}`, data);

export const deleteRiderGear = (id) =>
  api.delete(`/api/v1/rider-gear/${id}`);

export const adminGetPendingRiderGear = (skip = 0, limit = 20) =>
  api.get('/api/v1/admin/rider-gear/pending', { params: { skip, limit } });

export const adminApproveRiderGear = (id) =>
  api.post(`/api/v1/admin/rider-gear/${id}/approve`);

export const adminRejectRiderGear = (id, reason) =>
  api.post(`/api/v1/admin/rider-gear/${id}/reject`, { reason });

// ── Services API ──────────────────────────────────────────────────────────────
export const getServicesList = (params = {}) =>
  api.get('/api/v1/services', { params });

export const getServiceDetail = (id) =>
  api.get(`/api/v1/services/${id}`);

export const createService = (data) =>
  api.post('/api/v1/services', data);

export const updateService = (id, data) =>
  api.put(`/api/v1/services/${id}`, data);

export const deleteService = (id) =>
  api.delete(`/api/v1/services/${id}`);

export const sendServiceInquiry = (serviceId, data) =>
  api.post(`/api/v1/services/${serviceId}/inquiries`, data);

export const getServiceInquiries = (serviceId) =>
  api.get(`/api/v1/services/${serviceId}/inquiries`);

export const adminGetPendingServices = (skip = 0, limit = 20) =>
  api.get('/api/v1/admin/services/pending', { params: { skip, limit } });

export const adminApproveService = (id) =>
  api.post(`/api/v1/admin/services/${id}/approve`);

export const adminRejectService = (id, reason) =>
  api.post(`/api/v1/admin/services/${id}/reject`, { reason });





import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Mobile-friendly API client adapted from web `frontend/src/services/apiClient.js`.
// Configure a base URL in app.json extra with key `API_BASE_URL` for your environment,
// otherwise this will fall back to sensible defaults for common dev setups.

// Prefer the new expoConfig (Constants.expoConfig) and fall back to manifest for older SDKs
const APP_CONFIG = (Constants.expoConfig && Constants.expoConfig) || (Constants.manifest && Constants.manifest) || {};
const EXTRA = APP_CONFIG.extra || {};
const RAW_BASE = (EXTRA.API_BASE_URL || '').trim();

// Fallbacks (note: on real devices you should provide EXTRA.API_BASE_URL pointing to machine IP)
const DIRECT_BACKEND_FALLBACK = (EXTRA.DIRECT_BACKEND_FALLBACK || '').trim() || 'http://127.0.0.1:8000';

const API_BASE = RAW_BASE || '';

function buildUrl(path) {
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  if (!path.startsWith('/')) path = '/' + path;
  if (API_BASE) return `${API_BASE}${path}`;
  return `${DIRECT_BACKEND_FALLBACK}${path}`;
}

async function lowLevelFetch(url, opts) {
  return fetch(url, opts);
}

async function request(path, { method = 'GET', headers = {}, body, authToken, json = true, ...rest } = {}) {
  const finalHeaders = { ...headers };
  if (json && !(body instanceof FormData)) {
    finalHeaders['Content-Type'] = finalHeaders['Content-Type'] || 'application/json';
  }
  if (authToken && typeof authToken === 'string') {
    const trimmed = authToken.trim();
    if (trimmed && trimmed !== 'null' && trimmed !== 'undefined') {
      finalHeaders['Authorization'] = `Token ${trimmed}`;
    }
  }
  const fetchOpts = { method, headers: finalHeaders, ...rest };
  if (body !== undefined) {
    fetchOpts.body = body instanceof FormData ? body : (json ? JSON.stringify(body) : body);
  }

  const primaryUrl = buildUrl(path);
  let res;
  try {
    res = await lowLevelFetch(primaryUrl, fetchOpts);
  } catch (networkErr) {
    // try direct fallback
    try {
      const fallbackUrl = DIRECT_BACKEND_FALLBACK + (path.startsWith('/') ? path : '/' + path);
      res = await lowLevelFetch(fallbackUrl, fetchOpts);
    } catch (fallbackErr) {
      throw new Error(`Network error: ${fallbackErr.message}`);
    }
  }

  let text;
  try { text = await res.text(); } catch { text = ''; }
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }

  if (!res.ok) {
    const errMsg = data.error || data.message || `HTTP ${res.status}`;
    const err = new Error(errMsg);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export const apiClient = {
  base: API_BASE || DIRECT_BACKEND_FALLBACK,
  request,
  get: (p, opts) => request(p, { ...opts, method: 'GET' }),
  post: (p, body, opts) => request(p, { ...opts, method: 'POST', body }),
  put: (p, body, opts) => request(p, { ...opts, method: 'PUT', body }),
  patch: (p, body, opts) => request(p, { ...opts, method: 'PATCH', body }),
  delete: (p, opts) => request(p, { ...opts, method: 'DELETE' }),
};

export const authApi = {
  requestOtp: async (email, purpose = 'login') => {
    const resp = await apiClient.post('/api/auth/request-otp/', { email, purpose });
    // Save last purpose locally for verify step
    try { await AsyncStorage.setItem('otpPurpose', purpose); } catch (_) {}
    return { ...resp, used_purpose: purpose };
  },
  verifyOtp: async (email, code, purpose = undefined) => {
    let finalPurpose = purpose;
    if (!finalPurpose) {
      try { finalPurpose = await AsyncStorage.getItem('otpPurpose') || 'login'; } catch (_) { finalPurpose = 'login'; }
    }
    return apiClient.post('/api/auth/verify-otp/', { email, code, purpose: finalPurpose });
  },
  finalizeAccount: (username, token, extra = {}) => {
    const body = { username, ...extra };
    return apiClient.post('/api/auth/finalize-account/', body, { authToken: token });
  },
  getProfile: (token) => apiClient.get('/api/auth/profile/', { authToken: token }),
  logout: (token) => apiClient.post('/api/auth/logout/', {}, { authToken: token }),
};

export const deviceApi = {
  list: (token) => apiClient.get('/api/devices/', { authToken: token }),
  get: (deviceId, token) => apiClient.get(`/api/devices/${deviceId}/`, { authToken: token }),
  create: (deviceData, token) => apiClient.post('/api/devices/', deviceData, { authToken: token }),
  uploadPlantPhoto: (deviceId, photoFile, token) => {
    const formData = new FormData();
    // photoFile is expected to be { uri, name, type }
    formData.append('plant_photo', photoFile);
    return apiClient.post(`/api/devices/${deviceId}/upload-photo/`, formData, { authToken: token, json: false });
  },
};

export default apiClient;

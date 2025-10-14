// Centralized API client with base URL resolution and helper methods.
// Falls back to window.location.origin (enabling use of Vite proxy) if env var absent.

const RAW_BASE = (import.meta.env.VITE_API_BASE_URL || '').trim();

// If RAW_BASE points to localhost/127.0.0.1 but the app is loaded from a non-loopback host (e.g., phone on LAN),
// ignore RAW_BASE to avoid mobile devices trying to call their own 127.0.0.1. We'll rely on proxy/origin instead.
let EFFECTIVE_BASE = RAW_BASE;
try {
  if (RAW_BASE && typeof window !== 'undefined') {
    const u = new URL(RAW_BASE, window.location.origin);
    const isLoopback = ['localhost', '127.0.0.1', '::1'].includes(u.hostname);
    const originIsLoopback = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
    if (isLoopback && !originIsLoopback) {
      // eslint-disable-next-line no-console
      console.warn('[apiClient] Ignoring VITE_API_BASE_URL pointing to loopback while served from non-loopback host:', RAW_BASE);
      EFFECTIVE_BASE = '';
    }
  }
} catch (_) {
  // If URL parsing fails, keep EFFECTIVE_BASE as-is
}

const API_BASE = EFFECTIVE_BASE ? (EFFECTIVE_BASE.endsWith('/') ? EFFECTIVE_BASE.slice(0, -1) : EFFECTIVE_BASE) : window.location.origin;
// Use an override if provided, otherwise derive from current hostname so it works on real devices
const DIRECT_BACKEND_FALLBACK = (import.meta.env.VITE_DIRECT_BACKEND_FALLBACK || '').trim() ||
  (typeof window !== 'undefined' ? `http://${window.location.hostname}:8000` : 'http://127.0.0.1:8000');

function buildUrl(path) {
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  if (!path.startsWith('/')) path = '/' + path;
  return `${API_BASE}${path}`;
}

async function lowLevelFetch(url, opts) {
  return fetch(url, opts);
}

async function request(path, { method = 'GET', headers = {}, body, authToken, json = true, ...rest } = {}) {
  const finalHeaders = { ...headers };
  if (json && !(body instanceof FormData)) {
    finalHeaders['Content-Type'] = finalHeaders['Content-Type'] || 'application/json';
  }
  if (authToken) {
    finalHeaders['Authorization'] = `Token ${authToken}`;
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
    // Attempt fallback only if we were using the proxy origin (no explicit VITE_API_BASE_URL) and path starts with /api
    if (!RAW_BASE && path.startsWith('/api')) {
      try {
        const fallbackUrl = DIRECT_BACKEND_FALLBACK + (path.startsWith('/') ? path : '/' + path);
        // eslint-disable-next-line no-console
        console.warn('[apiClient] primary request failed, retrying direct backend', { primaryUrl, fallbackUrl, error: networkErr.message });
        res = await lowLevelFetch(fallbackUrl, fetchOpts);
      } catch (fallbackErr) {
        throw new Error(`Network error: ${fallbackErr.message}`);
      }
    } else {
      throw new Error(`Network error: ${networkErr.message}`);
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
  base: API_BASE,
  request,
  get: (p, opts) => request(p, { ...opts, method: 'GET' }),
  post: (p, body, opts) => request(p, { ...opts, method: 'POST', body }),
  put: (p, body, opts) => request(p, { ...opts, method: 'PUT', body }),
  patch: (p, body, opts) => request(p, { ...opts, method: 'PATCH', body }),
};

// Auth-specific convenience wrappers
export const authApi = {
  // Smart OTP request that retries with the appropriate purpose based on backend flow_hint
  requestOtp: async (email, purpose = 'login') => {
    const first = await apiClient.post('/api/auth/request-otp/', { email, purpose });
    // If backend hints a different flow, retry once with the corrected purpose
    if (first && first.flow_hint === 'should_signup' && purpose === 'login') {
      const second = await apiClient.post('/api/auth/request-otp/', { email, purpose: 'register' });
      try { localStorage.setItem('otpPurpose', 'register'); } catch (_) {}
      return { ...second, used_purpose: 'register' };
    }
    if (first && first.flow_hint === 'should_login' && purpose === 'register') {
      const second = await apiClient.post('/api/auth/request-otp/', { email, purpose: 'login' });
      try { localStorage.setItem('otpPurpose', 'login'); } catch (_) {}
      return { ...second, used_purpose: 'login' };
    }
    try { localStorage.setItem('otpPurpose', purpose); } catch (_) {}
    return { ...first, used_purpose: purpose };
  },
  // Verify OTP: default to the last used purpose to avoid mismatch (login vs register)
  verifyOtp: (email, code, purpose = undefined) => {
    let finalPurpose = purpose;
    if (!finalPurpose) {
      try { finalPurpose = localStorage.getItem('otpPurpose') || 'login'; } catch (_) { finalPurpose = 'login'; }
    }
    return apiClient.post('/api/auth/verify-otp/', { email, code, purpose: finalPurpose });
  },
  finalizeAccount: (username, token, extra = {}) => {
    const body = { username };
    if (extra.first_name) body.first_name = extra.first_name;
    if (extra.last_name) body.last_name = extra.last_name;
    return apiClient.post('/api/auth/finalize-account/', body, { authToken: token });
  },
  checkUsername: (username) => apiClient.get(`/api/auth/check-username/?username=${encodeURIComponent(username)}`),
  getProfile: (token) => apiClient.get('/api/auth/profile/', { authToken: token }),
  updateProfile: (token, data) => {
    const isForm = (typeof FormData !== 'undefined') && (data instanceof FormData);
    return apiClient.patch('/api/auth/profile/update/', data, { authToken: token, json: !isForm });
  },
  logout: (token) => apiClient.post('/api/auth/logout/', {}, { authToken: token }),
};

// Device-specific convenience wrappers
export const deviceApi = {
  list: (token) => apiClient.get('/api/devices/devices/', { authToken: token }),
  get: (deviceId, token) => apiClient.get(`/api/devices/devices/${deviceId}/`, { authToken: token }),
  create: (deviceData, token) => apiClient.post('/api/devices/devices/', deviceData, { authToken: token }),
  update: (deviceId, deviceData, token) => apiClient.post(`/api/devices/devices/${deviceId}/`, deviceData, { authToken: token }),
  uploadPlantPhoto: (deviceId, photoFile, plantName = '', plantVariety = '', token) => {
    const formData = new FormData();
    formData.append('plant_photo', photoFile);
    if (plantName) formData.append('plant_name', plantName);
    if (plantVariety) formData.append('plant_variety', plantVariety);

    return apiClient.post(`/api/devices/devices/${deviceId}/upload-photo/`, formData, {
      authToken: token,
      json: false // Don't set Content-Type header for FormData
    });
  },
  updatePlantInfo: (deviceId, plantName = '', plantVariety = '', token) => {
    return apiClient.post(`/api/devices/devices/${deviceId}/`, {
      plant_name: plantName,
      plant_variety: plantVariety
    }, {
      authToken: token
    });
  },
}; export default apiClient;

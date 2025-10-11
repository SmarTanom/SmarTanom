// Centralized API client with base URL resolution and helper methods.
// Falls back to window.location.origin (enabling use of Vite proxy) if env var absent.

const RAW_BASE = (import.meta.env.VITE_API_BASE_URL || '').trim();
const API_BASE = RAW_BASE ? (RAW_BASE.endsWith('/') ? RAW_BASE.slice(0, -1) : RAW_BASE) : window.location.origin;
const DIRECT_BACKEND_FALLBACK = 'http://127.0.0.1:8000';

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
};

// Auth-specific convenience wrappers
export const authApi = {
  requestOtp: (email, purpose = 'login') => apiClient.post('/api/auth/request-otp/', { email, purpose }),
  verifyOtp: (email, code, purpose = 'login') => apiClient.post('/api/auth/verify-otp/', { email, code, purpose }),
  finalizeAccount: (username, token) => apiClient.post('/api/auth/finalize-account/', { username }, { authToken: token }),
  checkUsername: (username) => apiClient.get(`/api/auth/check-username/?username=${encodeURIComponent(username)}`),
  getProfile: (token) => apiClient.get('/api/auth/profile/', { authToken: token }),
  logout: (token) => apiClient.post('/api/auth/logout/', {}, { authToken: token }),
};

export default apiClient;

import Constants from 'expo-constants';

const DEFAULT_BASES = [
  // Common emulator/dev loopback helpers (ordered by likelihood)
  'http://10.0.2.2:8000', // Android emulator
  'http://127.0.0.1:8000',
  'http://localhost:8000'
];

import AsyncStorage from '@react-native-async-storage/async-storage';

// Helper to build query strings (React Native may not implement URLSearchParams)
function buildQuery(params) {
  if (!params || typeof params !== 'object') return '';
  const parts = [];
  for (const key of Object.keys(params)) {
    const val = params[key];
    if (val === undefined || val === null) continue;
    // skip empty strings as well
    if (typeof val === 'string' && val.length === 0) continue;
    parts.push(encodeURIComponent(key) + '=' + encodeURIComponent(String(val)));
  }
  return parts.join('&');
}

function getBaseCandidates() {
  const list = [];
  // Prefer expo config `extra.API_BASE_URL` when present (app.json / eas build)
  try {
    const appConfig = Constants.expoConfig || Constants.manifest || {};
    const extra = appConfig.extra || {};
    if (extra.API_BASE_URL) list.push(String(extra.API_BASE_URL).replace(/\/+$/, ''));
  } catch (_) {}
  if (typeof global !== 'undefined' && global.API_BASE) list.push(global.API_BASE.replace(/\/+$/, ''));
  if (process && process.env && process.env.EXPO_PUBLIC_API_BASE_URL) list.push(process.env.EXPO_PUBLIC_API_BASE_URL.replace(/\/+$/, ''));
  // Append defaults (do not dedupe aggressively; order matters)
  for (const b of DEFAULT_BASES) list.push(b.replace(/\/+$/, ''));
  return list;
}

  // Ensure token helper: prefer provided token, fall back to AsyncStorage-stored authToken
  async function ensureToken(token) {
    if (token) return token;
    try {
      const t = await AsyncStorage.getItem('authToken');
      return t || null;
    } catch (_) {
      return null;
    }
  }

async function fetchWithTimeout(url, opts = {}, ms = 7000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

async function request(path, { method = 'GET', body, json = true, token, timeout = 7000 } = {}) {
  const candidates = getBaseCandidates();
  const headers = {};
  if (json && !(body instanceof FormData)) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Token ${token}`;
  const opts = { method, headers };
  if (body !== undefined) opts.body = body instanceof FormData ? body : (json ? JSON.stringify(body) : body);

  let lastError = null;
  // If path is absolute URL, try it directly first
  const absolute = path.startsWith('http://') || path.startsWith('https://');
  const tryBases = absolute ? [''] : candidates;

  for (const base of tryBases) {
    try {
      const url = absolute ? path : `${base}${path.startsWith('/') ? '' : '/'}${path}`;
      const res = await fetchWithTimeout(url, opts, timeout);
      const text = await res.text().catch(() => '');
      let data = null;
      try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
      if (!res.ok) {
        const err = new Error(data.error || data.message || `HTTP ${res.status}`);
        err.status = res.status;
        err.data = data;
        throw err;
      }
      return data;
    } catch (networkErr) {
      // Keep last error and try next candidate
      lastError = networkErr;
      // If this was an absolute URL we shouldn't retry others
      if (absolute) break;
      // try next base
      // eslint-disable-next-line no-console
      console.warn('[api] request candidate failed, trying next', { base, path, error: networkErr?.message || networkErr });
      continue;
    }
  }

  // If we exhausted candidates, throw the last error with a helpful message
  if (lastError) {
    throw lastError;
  }
  throw new Error('Network error');
}

export async function checkDevice(serial) {
  // Backend expects POST /api/devices/check/ with { serial_number }
  return request('/api/devices/check/', { method: 'POST', body: { serial_number: serial } });
}

export async function requestDeviceOTP(serial, email) {
  return request('/api/devices/request-otp/', { method: 'POST', body: { serial_number: serial, email } });
}

export async function verifyDeviceOTP(serial, email, code, extras = {}) {
  return request('/api/devices/verify-otp/', { method: 'POST', body: { serial_number: serial, email, code, ...extras } });
}

export async function listDevices(token) {
  const t = await ensureToken(token);
  return request('/api/devices/', { method: 'GET', token: t });
}

export async function createReservoir(payload, token) {
  const t = await ensureToken(token);
  return request('/api/reservoirs/reservoirs/', { method: 'POST', body: payload, token: t });
}

export async function getProfile(token) {
  const t = await ensureToken(token);
  return request('/api/auth/profile/', { method: 'GET', token: t });
}

export async function updateProfile(token, data) {
  const t = await ensureToken(token);
  return request('/api/auth/profile/update/', { method: 'PATCH', body: data, token: t });
}

// Dashboard aggregated API (mirrors frontend /api/devices/dashboard/initial/)
export async function getInitialDashboard(params = {}) {
  try {
    const token = await AsyncStorage.getItem('authToken');
    const q = buildQuery({ reading_limit: params.reading_limit, alert_limit: params.alert_limit });
    return request(`/api/devices/dashboard/initial/${q ? `?${q}` : ''}`, { method: 'GET', token });
  } catch (e) {
    throw e;
  }
}

// Devices
export async function getDevice(deviceId, token) {
  const t = await ensureToken(token);
  return request(`/api/devices/${deviceId}/`, { method: 'GET', token: t });
}

// Sensors
export async function getDeviceSensors(deviceId, token) {
  // Match frontend: /api/sensors/sensors/?device=<id>
  const t = await ensureToken(token);
  const q = buildQuery({ device: deviceId });
  return request(`/api/sensors/sensors/${q ? `?${q}` : ''}`, { method: 'GET', token: t });
}

export async function getSensorData(sensorId, params = {}, token) {
  // Match frontend: /api/sensors/sensor-data/?sensor=<id>&limit=<n>&ordering=<>&page=<>
  const t = await ensureToken(token);
  const q = buildQuery({ sensor: sensorId, limit: params.limit, ordering: params.ordering, page: params.page });
  return request(`/api/sensors/sensor-data/${q ? `?${q}` : ''}`, { method: 'GET', token: t });
}

// Reservoirs (per-device)
export async function getDeviceReservoirs(deviceId, token) {
  const t = await ensureToken(token);
  // frontend uses: /api/reservoirs/reservoirs/?device=<id>
  const q = buildQuery({ device: deviceId });
  return request(`/api/reservoirs/reservoirs/${q ? `?${q}` : ''}`, { method: 'GET', token: t });
}

// Alerts & notifications
export async function listAlerts(params = {}, token) {
  const t = await ensureToken(token);
  // Keep existing notifications-based alerts accessor (user alerts)
  const q = buildQuery({ type: params.type, device: params.device, status: params.status, limit: params.limit });
  return request(`/api/notifications/logs/alerts/${q ? `?${q}` : ''}`, { method: 'GET', token: t });
}

// Sensor-produced alerts endpoint (matches frontend `alerts.js`)
export async function getSensorAlerts(params = {}, token) {
  const t = await ensureToken(token);
  // Supported params: device, is_acknowledged, is_resolved, severity, ordering, page
  const q = buildQuery({ device: params.device, is_acknowledged: params.is_acknowledged, is_resolved: params.is_resolved, severity: params.severity, ordering: params.ordering, page: params.page });
  return request(`/api/sensors/alerts/${q ? `?${q}` : ''}`, { method: 'GET', token: t });
}

export async function listNotifications(params = {}, token) {
  const t = await ensureToken(token);
  // Map to notification logs endpoint used by frontend
  const q = buildQuery({ limit: params.limit, offset: params.offset });
  return request(`/api/notifications/logs/${q ? `?${q}` : ''}`, { method: 'GET', token: t });
}

// Admin dashboard endpoints (used by admin pages)
export async function getAdminDashboardStats(token) {
  const t = await ensureToken(token);
  return request('/api/admin/dashboard/stats/', { method: 'GET', token: t });
}

export async function getAdminDevices(token) {
  const t = await ensureToken(token);
  return request('/api/admin/dashboard/devices/', { method: 'GET', token: t });
}

export async function getAdminUsers(token) {
  const t = await ensureToken(token);
  return request('/api/admin/dashboard/users/', { method: 'GET', token: t });
}

// Helper to post queries generically
export async function postData(path, body = {}, token) {
  const t = await ensureToken(token);
  return request(path, { method: 'POST', body, token: t });
}

// Auth helpers (mirrors frontend authApi behavior)
export const auth = {
  requestOtp: async (email, purpose = 'login') => {
    const first = await request('/api/auth/request-otp/', { method: 'POST', body: { email, purpose } });
    // If backend suggests a different flow, retry once with corrected purpose
    if (first && first.flow_hint === 'should_signup' && purpose === 'login') {
      const second = await request('/api/auth/request-otp/', { method: 'POST', body: { email, purpose: 'register' } });
      try { await AsyncStorage.setItem('otpPurpose', 'register'); } catch (_) {}
      return { ...second, used_purpose: 'register' };
    }
    if (first && first.flow_hint === 'should_login' && purpose === 'register') {
      const second = await request('/api/auth/request-otp/', { method: 'POST', body: { email, purpose: 'login' } });
      try { await AsyncStorage.setItem('otpPurpose', 'login'); } catch (_) {}
      return { ...second, used_purpose: 'login' };
    }
    try { await AsyncStorage.setItem('otpPurpose', purpose); } catch (_) {}
    return { ...first, used_purpose: purpose };
  },
  verifyOtp: async (email, code, purpose = undefined) => {
    let finalPurpose = purpose;
    if (!finalPurpose) {
      try { finalPurpose = (await AsyncStorage.getItem('otpPurpose')) || 'login'; } catch (_) { finalPurpose = 'login'; }
    }
    return request('/api/auth/verify-otp/', { method: 'POST', body: { email, code, purpose: finalPurpose } });
  },
  finalizeAccount: async (username, token, extra = {}) => {
    const body = { username };
    if (extra.first_name) body.first_name = extra.first_name;
    if (extra.last_name) body.last_name = extra.last_name;
    return request('/api/auth/finalize-account/', { method: 'POST', body, token });
  },
  checkUsername: (username) => request(`/api/auth/check-username/?username=${encodeURIComponent(username)}`, { method: 'GET' }),
  logout: (token) => request('/api/auth/logout/', { method: 'POST', token }),
};

export default {
  checkDevice, requestDeviceOTP, verifyDeviceOTP, listDevices, createReservoir, getProfile, updateProfile,
  auth
};

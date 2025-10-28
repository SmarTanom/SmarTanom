import Constants from 'expo-constants';

const DEFAULT_BASES = [
  // Common emulator/dev loopback helpers (ordered by likelihood)
  'http://10.0.2.2:8000', // Android emulator
  'http://127.0.0.1:8000',
  'http://localhost:8000'
];

import AsyncStorage from '@react-native-async-storage/async-storage';

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

export async function listDevices(token) { return request('/api/devices/', { method: 'GET', token }); }
export async function createReservoir(payload, token) { return request('/api/reservoirs/', { method: 'POST', body: payload, token }); }

export async function getProfile(token) { return request('/api/auth/profile/', { method: 'GET', token }); }
export async function updateProfile(token, data) { return request('/api/auth/profile/update/', { method: 'PATCH', body: data, token }); }

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

// Minimal client for ESP32 AP setup endpoints at 192.168.4.1
// Endpoints:
//   GET  /status -> {status: "connecting|connected|failed"}
//   GET  /scan   -> ["ssid1","ssid2", ...]
//   POST /connect {ssid, password} -> {result: "ok"}

const DEFAULT_BASE = 'http://192.168.4.1';

async function fetchJson(url, opts = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), opts.timeoutMs || 8000);
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal, headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) } });
    const text = await res.text();
    let data;
    try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
    if (!res.ok) {
      const err = new Error(data?.message || `HTTP ${res.status}`);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  } finally {
    clearTimeout(timeout);
  }
}

export const espSetupClient = {
  base: DEFAULT_BASE,
  setBase(ipOrUrl) {
    if (!ipOrUrl) return;
    try {
      const u = new URL(ipOrUrl.startsWith('http') ? ipOrUrl : `http://${ipOrUrl}`);
      this.base = `${u.protocol}//${u.host}`;
    } catch {
      this.base = `http://${ipOrUrl}`;
    }
  },
  async status() {
    return fetchJson(`${this.base}/status`, { method: 'GET' });
  },
  async scan() {
    const data = await fetchJson(`${this.base}/scan`, { method: 'GET' });
    // support either array or {ssids:[...]}
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.ssids)) return data.ssids;
    return [];
  },
  async connect(ssid, password = '') {
    return fetchJson(`${this.base}/connect`, { method: 'POST', body: JSON.stringify({ ssid, password }) });
  },
};

export default espSetupClient;

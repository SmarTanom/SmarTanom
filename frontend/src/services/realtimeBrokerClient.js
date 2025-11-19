// Lightweight broker WebSocket client for direct ESP32 → frontend realtime frames.
// Adjust envelope unwrapping to suit broker implementation.

// Upstash Pub/Sub framing notes:
//  Auth: {"type":"auth","token":"<token>"}
//  Subscribe: {"type":"subscribe","channel":"mychannel"}
//  Publish (device side): {"type":"publish","channel":"mychannel","data":<string|object>}
//  Message event: {"type":"message","channel":"mychannel","data":<string|object>}

export class RealtimeBrokerClient {
  constructor({ wsUrl, channel, token, onMessage, onStatus }) {
    this.wsUrl = wsUrl;
    this.channel = channel;
    this.token = token; // public read token (never embed write token in frontend)
    this.onMessage = onMessage;
    this.onStatus = onStatus || (() => {});
    this.ws = null;
    this.backoff = 1000;
    this.maxBackoff = 20000;
    this._authed = false;
    this._subscribed = false;
  }
  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) return;
    this.ws = new WebSocket(this.wsUrl);
    this.ws.onopen = () => {
      this.onStatus('connecting');
      this.backoff = 1000;
      // Send auth frame if token provided
      if (this.token) {
        try { this.ws.send(JSON.stringify({ type: 'auth', token: this.token })); } catch (_) {}
      } else {
        this._authed = true; // no auth required
      }
    };
    this.ws.onclose = () => {
      this.onStatus('disconnected');
      this._authed = false;
      this._subscribed = false;
      setTimeout(() => this.connect(), this.backoff);
      this.backoff = Math.min(this.backoff * 2, this.maxBackoff);
    };
    this.ws.onerror = () => {
      this.onStatus('error');
      try { this.ws.close(); } catch (_) {}
    };
    this.ws.onmessage = (evt) => {
      let raw;
      try { raw = JSON.parse(evt.data); } catch (_) { return; }
      // Handle broker control frames
      if (raw.type === 'auth_ok') {
        this._authed = true;
        this.onStatus('authed');
        // Immediately subscribe after auth
        try { this.ws.send(JSON.stringify({ type: 'subscribe', channel: this.channel })); } catch (_) {}
        return;
      }
      if (raw.type === 'auth_error') {
        this.onStatus('auth_error');
        return;
      }
      if (raw.type === 'subscribed' && raw.channel === this.channel) {
        this._subscribed = true;
        this.onStatus('subscribed');
        return;
      }
      if (raw.type === 'message' && raw.channel === this.channel) {
        const payload = typeof raw.data === 'string' ? safeParseJson(raw.data) : raw.data;
        if (payload && payload.type === 'sensor.realtime') {
          this.onMessage(payload);
        }
      }
    };
  }
  disconnect() {
    if (!this.ws) return;
    this.ws.onopen = this.ws.onclose = this.ws.onerror = this.ws.onmessage = null;
    try { this.ws.close(); } catch (_) {}
    this.ws = null;
    this._authed = false;
    this._subscribed = false;
    this.onStatus('closed');
  }
}

function safeParseJson(str) {
  try { return JSON.parse(str); } catch (_) { return null; }
}

export function createRealtimeBrokerClient(serial, handlers = {}) {
  const wsUrl = import.meta.env.VITE_BROKER_WS_URL; // e.g. wss://eu1-pubsub.upstash.io/ws
  const token = import.meta.env.VITE_BROKER_WS_TOKEN; // read-only token
  const channel = `sensors/${serial}`; // publish/subscribe channel naming convention
  return new RealtimeBrokerClient({ wsUrl, channel, token, ...handlers });
}

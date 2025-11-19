// Lightweight broker WebSocket client for direct ESP32 → frontend realtime frames.
// Adjust envelope unwrapping to suit broker implementation.

export class RealtimeBrokerClient {
  constructor({ wsUrl, topic, onMessage, onStatus }) {
    this.wsUrl = wsUrl;
    this.topic = topic;
    this.onMessage = onMessage;
    this.onStatus = onStatus || (() => {});
    this.ws = null;
    this.backoff = 1000;
    this.maxBackoff = 15000;
  }
  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) return;
    this.ws = new WebSocket(this.wsUrl);
    this.ws.onopen = () => {
      this.onStatus('connected');
      this.backoff = 1000;
      // If broker requires subscribe frame:
      // const sub = { subscribe: { topics: [this.topic] } }; this.ws.send(JSON.stringify(sub));
    };
    this.ws.onclose = () => {
      this.onStatus('disconnected');
      setTimeout(() => this.connect(), this.backoff);
      this.backoff = Math.min(this.backoff * 2, this.maxBackoff);
    };
    this.ws.onerror = () => {
      this.onStatus('error');
      try { this.ws.close(); } catch (_) {}
    };
    this.ws.onmessage = (evt) => {
      try {
        const raw = JSON.parse(evt.data);
        const payload = raw.message || raw; // unwrap if envelope {topic,message}
        if (payload.type === 'sensor.realtime') {
          this.onMessage(payload);
        }
      } catch (_) {
        // ignore
      }
    };
  }
  disconnect() {
    if (!this.ws) return;
    this.ws.onopen = this.ws.onclose = this.ws.onerror = this.ws.onmessage = null;
    try { this.ws.close(); } catch (_) {}
    this.ws = null;
    this.onStatus('closed');
  }
}

export function createRealtimeBrokerClient(serial, handlers = {}) {
  const wsUrl = import.meta.env.VITE_BROKER_WS_URL;
  const topic = `sensors/${serial}`;
  return new RealtimeBrokerClient({ wsUrl, topic, ...handlers });
}

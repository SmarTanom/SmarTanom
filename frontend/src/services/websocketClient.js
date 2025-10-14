/**
 * WebSocket client for real-time device updates.
 * Automatically reconnects on disconnect.
 * Works in both development and production.
 */

const WS_BASE_URL = import.meta.env.VITE_WS_URL ||
  (window.location.protocol === 'https:' ? 'wss:' : 'ws:') + '//' +
  (import.meta.env.VITE_API_URL?.replace(/^https?:\/\//, '') || window.location.host);

class WebSocketClient {
  constructor() {
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 3000;
    this.listeners = new Set();
    this.isConnecting = false;
  }

  connect() {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      console.log('[WebSocket] Already connected or connecting');
      return;
    }

    this.isConnecting = true;
    const wsUrl = `${WS_BASE_URL}/ws/devices/`;
    console.log('[WebSocket] Connecting to:', wsUrl);

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('[WebSocket] Connected successfully');
        this.reconnectAttempts = 0;
        this.isConnecting = false;
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[WebSocket] Message received:', data);
          // Notify all listeners
          this.listeners.forEach(callback => {
            try {
              callback(data);
            } catch (error) {
              console.error('[WebSocket] Listener error:', error);
            }
          });
        } catch (error) {
          console.error('[WebSocket] Parse error:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
        this.isConnecting = false;
      };

      this.ws.onclose = () => {
        console.log('[WebSocket] Disconnected');
        this.isConnecting = false;
        this.attemptReconnect();
      };
    } catch (error) {
      console.error('[WebSocket] Connection error:', error);
      this.isConnecting = false;
      this.attemptReconnect();
    }
  }

  attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`[WebSocket] Reconnecting in ${this.reconnectDelay / 1000}s... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      setTimeout(() => this.connect(), this.reconnectDelay);
    } else {
      console.error('[WebSocket] Max reconnection attempts reached');
    }
  }

  subscribe(callback) {
    if (typeof callback !== 'function') {
      console.error('[WebSocket] Subscribe requires a function callback');
      return () => {};
    }
    this.listeners.add(callback);
    console.log('[WebSocket] Subscriber added, total:', this.listeners.size);
    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
      console.log('[WebSocket] Subscriber removed, total:', this.listeners.size);
    };
  }

  disconnect() {
    if (this.ws) {
      console.log('[WebSocket] Closing connection');
      this.ws.close();
      this.ws = null;
    }
    this.reconnectAttempts = this.maxReconnectAttempts; // Prevent reconnect
    this.listeners.clear();
  }

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
      console.log('[WebSocket] Message sent:', data);
    } else {
      console.warn('[WebSocket] Cannot send message, connection not open');
    }
  }
}

// Create singleton instance
export const wsClient = new WebSocketClient();

// Auto-connect on module load (optional, can be manually triggered)
// wsClient.connect();

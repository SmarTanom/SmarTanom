/**
 * WebSocket client for real-time device updates.
 * Automatically reconnects on disconnect.
 * Works in both development and production.
 */

function computeWsBaseUrl() {
  // 1) Explicit WS base URL wins
  const envWs = import.meta.env.VITE_WS_URL;
  if (envWs && typeof envWs === 'string') {
    return envWs.replace(/\/$/, '');
  }

  // 2) Derive from API base URL (prefer VITE_API_BASE_URL; fallback VITE_API_URL)
  const apiBase = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;
  if (apiBase && typeof apiBase === 'string') {
    try {
      const url = new URL(apiBase);
      const proto = url.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${proto}//${url.host}`;
    } catch (e) {
      // Fallback to simple replacement if URL parsing fails
      const host = apiBase.replace(/^https?:\/\//, '');
      const isHttps = apiBase.startsWith('https://');
      return (isHttps ? 'wss:' : 'ws:') + '//' + host;
    }
  }

  // 3) Final fallback: current host
  return (window.location.protocol === 'https:' ? 'wss:' : 'ws:') + '//' + window.location.host;
}

const WS_BASE_URL = computeWsBaseUrl();

class WebSocketClient {
  constructor() {
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.baseReconnectDelay = 3000; // Base delay: 3 seconds
    this.maxReconnectDelay = 60000; // Max delay: 60 seconds
    this.listeners = new Set();
    this.isConnecting = false;
    this.status = 'disconnected'; // 'connecting' | 'connected' | 'disconnected'
    this.statusCallbacks = new Set();
    this.lastUserId = null; // Remember userId for reconnects
    this._userRouteFailures = 0; // count consecutive failures to user route
  }

  /**
   * Get current connection status
   * @returns {string} 'connecting' | 'connected' | 'disconnected'
   */
  getStatus() {
    return this.status;
  }

  /**
   * Update status and notify callbacks
   */
  setStatus(newStatus) {
    if (this.status !== newStatus) {
      this.status = newStatus;
      if (import.meta.env.VITE_DEBUG === 'true') {
        console.log(`[WebSocket] Status changed to: ${newStatus}`);
      }
      this.statusCallbacks.forEach(callback => {
        try {
          callback(newStatus);
        } catch (error) {
          if (import.meta.env.VITE_DEBUG === 'true') {
            console.error('[WebSocket] Status callback error:', error);
          }
        }
      });
    }
  }

  /**
   * Subscribe to status changes
   * @param {Function} callback - Called with new status: 'connecting' | 'connected' | 'disconnected'
   * @returns {Function} Unsubscribe function
   */
  onStatusChange(callback) {
    if (typeof callback !== 'function') {
      console.error('[WebSocket] onStatusChange requires a function callback');
      return () => {};
    }
    this.statusCallbacks.add(callback);
    // Immediately call with current status
    callback(this.status);
    return () => {
      this.statusCallbacks.delete(callback);
    };
  }

  connect(userId = null) {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      if (import.meta.env.VITE_DEBUG === 'true') {
        console.log('[WebSocket] Already connected or connecting');
      }
      return;
    }

    this.isConnecting = true;
    this.setStatus('connecting');
  this.lastUserId = userId;
  const usingUserRoute = !!userId;

    // Use user-specific endpoint if userId is provided, otherwise use global devices endpoint
    const wsUrl = userId
      ? `${WS_BASE_URL}/ws/user/${userId}/`
      : `${WS_BASE_URL}/ws/devices/`;
    if (import.meta.env.VITE_DEBUG === 'true') {
      console.log('[WebSocket] Connecting to:', wsUrl);
    }

    try {
  this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        if (import.meta.env.VITE_DEBUG === 'true') {
          console.log('[WebSocket] Connected successfully');
        }
        this.reconnectAttempts = 0;
        if (usingUserRoute) this._userRouteFailures = 0;
        this.isConnecting = false;
        this.setStatus('connected');
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          // Minimal logging unless debug enabled
          if (import.meta.env.VITE_DEBUG === 'true') {
            console.log('[WebSocket] Message received:', data);
          }
          // Notify all listeners
          this.listeners.forEach(callback => {
            try {
              callback(data);
            } catch (error) {
              if (import.meta.env.VITE_DEBUG === 'true') {
                console.error('[WebSocket] Listener error:', error);
              }
            }
          });
        } catch (error) {
          if (import.meta.env.VITE_DEBUG === 'true') {
            console.error('[WebSocket] Parse error:', error);
          }
        }
      };

      this.ws.onerror = (error) => {
        if (import.meta.env.VITE_DEBUG === 'true') {
          console.error('[WebSocket] Error:', error);
        }
        this.isConnecting = false;
        this.setStatus('disconnected');
      };

      this.ws.onclose = (evt) => {
        if (import.meta.env.VITE_DEBUG === 'true') {
          console.log('[WebSocket] Disconnected');
        }
        this.isConnecting = false;
        this.setStatus('disconnected');
        // If user route is failing repeatedly, fall back to global devices route
        if (usingUserRoute) {
          this._userRouteFailures += 1;
          if (import.meta.env.VITE_DEBUG === 'true') {
            console.warn('[WebSocket] user route close event; failures =', this._userRouteFailures, 'code=', evt?.code);
          }
          if (this._userRouteFailures >= 2) {
            if (import.meta.env.VITE_DEBUG === 'true') {
              console.warn('[WebSocket] Falling back to global /ws/devices/ after repeated user route failures');
            }
            this.lastUserId = null; // switch to global route
            this._userRouteFailures = 0;
          }
        }
        this.attemptReconnect();
      };
    } catch (error) {
      if (import.meta.env.VITE_DEBUG === 'true') {
        console.error('[WebSocket] Connection error:', error);
      }
      this.isConnecting = false;
      this.setStatus('disconnected');
      // Same fallback path as onclose when user route errors immediately
      if (usingUserRoute) {
        this._userRouteFailures += 1;
        if (this._userRouteFailures >= 2) {
          this.lastUserId = null;
          this._userRouteFailures = 0;
        }
      }
      this.attemptReconnect();
    }
  }

  /**
   * Calculate exponential backoff delay
   * Formula: min(baseDelay * 2^attempt, maxDelay)
   */
  getReconnectDelay() {
    const delay = Math.min(
      this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts),
      this.maxReconnectDelay
    );
    return delay;
  }

  attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.getReconnectDelay();
      if (import.meta.env.VITE_DEBUG === 'true') {
        console.log(
          `[WebSocket] Reconnecting in ${delay / 1000}s... (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`
        );
      }
      const uid = this.lastUserId;
      setTimeout(() => this.connect(uid), delay);
    } else {
      if (import.meta.env.VITE_DEBUG === 'true') {
        console.error('[WebSocket] Max reconnection attempts reached');
      }
      this.setStatus('disconnected');
    }
  }

  subscribe(callback) {
    if (typeof callback !== 'function') {
      console.error('[WebSocket] Subscribe requires a function callback');
      return () => {};
    }
    this.listeners.add(callback);
    if (import.meta.env.VITE_DEBUG === 'true') {
      console.log('[WebSocket] Subscriber added, total:', this.listeners.size);
    }
    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
      if (import.meta.env.VITE_DEBUG === 'true') {
        console.log('[WebSocket] Subscriber removed, total:', this.listeners.size);
      }
    };
  }

  disconnect() {
    if (this.ws) {
      if (import.meta.env.VITE_DEBUG === 'true') {
        console.log('[WebSocket] Closing connection');
      }
      this.ws.close();
      this.ws = null;
    }
    this.reconnectAttempts = this.maxReconnectAttempts; // Prevent reconnect
    this.listeners.clear();
  }

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
      if (import.meta.env.VITE_DEBUG === 'true') {
        console.log('[WebSocket] Message sent:', data);
      }
    } else {
      if (import.meta.env.VITE_DEBUG === 'true') {
        console.warn('[WebSocket] Cannot send message, connection not open');
      }
    }
  }
}

// Create singleton instance
export const wsClient = new WebSocketClient();

// Auto-connect on module load (optional, can be manually triggered)
// wsClient.connect();

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
    this.maxReconnectAttempts = 10;
    this.baseReconnectDelay = 3000; // Base delay: 3 seconds
    this.maxReconnectDelay = 60000; // Max delay: 60 seconds
    this.listeners = new Set();
    this.isConnecting = false;
    this.status = 'disconnected'; // 'connecting' | 'connected' | 'disconnected'
    this.statusCallbacks = new Set();
    this.lastUserId = null;
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
      console.log(`[WebSocket] Status changed to: ${newStatus}`);
      this.statusCallbacks.forEach(callback => {
        try {
          callback(newStatus);
        } catch (error) {
          console.error('[WebSocket] Status callback error:', error);
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
      return () => { };
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
      console.log('[WebSocket] Already connected or connecting');
      return;
    }

    this.isConnecting = true;
    this.setStatus('connecting');
    if (userId !== undefined) {
      this.lastUserId = userId;
    }

    // Use user-specific endpoint if userId is provided, otherwise use global devices endpoint
    const wsUrl = (userId ?? this.lastUserId)
      ? `${WS_BASE_URL}/ws/user/${userId ?? this.lastUserId}/`
      : `${WS_BASE_URL}/ws/devices/`;
    console.log('[WebSocket] Connecting to:', wsUrl);

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('[WebSocket] Connected successfully');
        this.reconnectAttempts = 0;
        this.isConnecting = false;
        this.setStatus('connected');
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[WebSocket] Message received:', data);
          // Normalize legacy messages to unified payloads when possible
          const normalized = this.normalizeMessage(data);
          const deliver = normalized || data;
          // Notify all listeners
          this.listeners.forEach(callback => {
            try {
              callback(deliver);
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
        this.setStatus('disconnected');
      };

      this.ws.onclose = () => {
        console.log('[WebSocket] Disconnected');
        this.isConnecting = false;
        this.setStatus('disconnected');
        this.attemptReconnect();
      };
    } catch (error) {
      console.error('[WebSocket] Connection error:', error);
      this.isConnecting = false;
      this.setStatus('disconnected');
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
      console.log(
        `[WebSocket] Reconnecting in ${delay / 1000}s... (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`
      );
      setTimeout(() => this.connect(this.lastUserId), delay);
    } else {
      console.error('[WebSocket] Max reconnection attempts reached');
      this.setStatus('disconnected');
    }
  }

  subscribe(callback) {
    if (typeof callback !== 'function') {
      console.error('[WebSocket] Subscribe requires a function callback');
      return () => { };
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

  /**
   * Normalize various backend message shapes into the unified
   * { type: 'sensor.update', device_id, timestamp, sensors: {...}, reading: {...} }
   * so downstream consumers (store) always receive expected payloads.
   */
  normalizeMessage(data) {
    try {
      // Already unified payloads
      if (data && data.type === 'sensor.update') return data;
      if (data && data.type === 'alert.new') return data;

      // Legacy admin/user wrappers: { action, data, timestamp }
      if (data && data.action === 'sensor_data' && data.data) {
        const d = data.data;
        const ts = data.timestamp || d.timestamp || new Date().toISOString();
        const sensors = {};
        // Map sensor_type/value to expected sensors delta
        switch (d.sensor_type) {
          case 'air_temperature':
            sensors.temperature = d.value; break;
          case 'light':
            sensors.light_lux = d.value; break;
          case 'water_level':
            sensors.water_level = d.value; break;
          default:
            if (typeof d.sensor_type === 'string') sensors[d.sensor_type] = d.value;
        }
        return {
          type: 'sensor.update',
          device_id: d.device_id,
          timestamp: ts,
          sensors,
          reading: {
            id: d.sensor_data_id,
            sensor_id: d.sensor_id,
            sensor_type: d.sensor_type,
            value: d.value,
            unit: d.unit,
            created_at: ts,
          }
        };
      }

      // Device consumer direct passthrough shapes: { action, data }
      if (data && data.data && data.data.sensor_type && data.action === 'sensor_data') {
        return this.normalizeMessage({ action: 'sensor_data', data: data.data, timestamp: data.timestamp });
      }
    } catch (e) {
      console.warn('[WebSocket] normalizeMessage failed:', e);
    }
    return null;
  }
}

// Create singleton instance
export const wsClient = new WebSocketClient();

// Auto-connect on module load (optional, can be manually triggered)
// wsClient.connect();

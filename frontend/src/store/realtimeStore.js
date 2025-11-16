import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { wsClient } from '../services/websocketClient';
import { getUserDevices } from '../services/api/devices';
import { getDeviceSensors, getSensorData } from '../services/api/sensors';
// Reservoirs API removed; device now includes plant/start/end fields
import { getInitialDashboard } from '../services/api/dashboard';
import { authApi } from '../services/apiClient';
import { getUserAlerts, markAlertsAsRead, markAllAlertsAsRead } from '../services/api/userAlerts';
import { listAlerts as listSensorAlerts } from '../services/api/alerts.js';

// Helper utilities replicated minimally (consider DRY refactor later)
const generateAlertText = (s) => {
  if (!s) return 'All systems normal';
  const alerts = [];

  // TDS alerts (matching backend: TDS_MIN=800, TDS_MAX=1500, TDS_WARNING_LOW=999, TDS_WARNING_HIGH=1301)
  if (typeof s.tds === 'number') {
    if (s.tds < 800) {
      alerts.push(`TDS Critically Low: ${Math.round(s.tds)} ppm (below 800). Solution too weak - increase nutrients`);
    } else if (s.tds < 999) {
      alerts.push(`TDS Low Warning: ${Math.round(s.tds)} ppm (approaching lower bound). Monitor and consider topping up`);
    } else if (s.tds > 1500) {
      alerts.push(`TDS Critically High: ${Math.round(s.tds)} ppm (above 1500). Solution too concentrated - drain/refill`);
    } else if (s.tds > 1301) {
      alerts.push(`TDS High Warning: ${Math.round(s.tds)} ppm (approaching upper bound). Consider diluting solution`);
    }
  }

  // pH alerts (matching backend: PH_MIN=5.5, PH_MAX=6.5)
  if (typeof s.ph === 'number') {
    if (s.ph < 5.5) {
      alerts.push(`Low pH Detected: ${s.ph.toFixed(1)} (below 5.5). Raise pH using pH Up solution`);
    } else if (s.ph > 6.5) {
      alerts.push(`High pH Detected: ${s.ph.toFixed(1)} (above 6.5). Lower pH using pH Down solution`);
    }
    // Handle extreme pH values
    if (s.ph < 4.0) alerts.push('Critical: pH extremely low - immediate action required');
    if (s.ph > 8.0) alerts.push('Critical: pH extremely high - immediate action required');
  }

  // Water level alerts (matching backend: WATER_LEVEL_CRITICAL=0, WATER_LEVEL_WARNING=40)
  if (typeof s.waterLevel === 'number') {
    if (s.waterLevel === 0) {
      alerts.push('Water Level Empty: Reservoir empty - refill immediately and check pumps');
    } else if (s.waterLevel <= 40) {
      alerts.push(`Low Water Level: ${Math.round(s.waterLevel)}% (below 40%). Refill soon and verify auto-refill`);
    }
  }

  // Air temperature removed

  // Turbidity alerts - follow firmware status if available; otherwise derive from NTU
  if (typeof s.turbidity_status === 'string') {
    const status = s.turbidity_status.toLowerCase();
    if (status.includes('dirty') || status.includes('turbid')) {
      alerts.push('Water Turbid: Drain/refill and clean filters');
    } else if (status.includes('cloudy')) {
      alerts.push('Water Cloudy: Clean filters and consider partial water change');
    }
  } else if (typeof s.turbidity === 'number') {
    // Backend stores NTU (0..1000). Firmware thresholds: Clear if V > 1.0V -> NTU < ~800; Cloudy ~800-1000; Turbid ~>=1000
    const ntu = s.turbidity;
    if (ntu >= 1000) {
      alerts.push('Water Turbid: Drain/refill and clean filters');
    } else if (ntu >= 800) {
      alerts.push('Water Cloudy: Clean filters and consider partial water change');
    }
  }

  // Light removed

  // Humidity removed

  return alerts.length ? alerts[0] : 'All systems normal';
};

const getConnectivityStatus = (lastSensorUpdate) => {
  if (!lastSensorUpdate) return { connectivity: 'Offline', lastSync: 'Never' };
  const now = Date.now();
  const diffMinutes = Math.floor((now - new Date(lastSensorUpdate).getTime()) / 60000);
  if (diffMinutes < 5) return { connectivity: 'Online', lastSync: '< 1 minute ago' };
  if (diffMinutes < 60) return { connectivity: 'Online', lastSync: `${diffMinutes} minutes ago` };
  return { connectivity: 'Offline', lastSync: `${Math.floor(diffMinutes / 60)} hours ago` };
};

const getNutrientStatus = (tdsValue) => {
  if (typeof tdsValue !== 'number') return undefined;
  if (tdsValue < 400) return 'Low (Nutrient needs refilling)';
  if (tdsValue > 1200) return 'High (Reduce concentration)';
  return 'Optimal';
};

export const useRealtimeStore = create(persist((set, get) => ({
  devices: [], // list of device meta
  deviceData: {}, // per-device structured data
  deviceAlerts: {}, // { [deviceId]: [alert objects] } - recent alerts per device
  unreadCounts: {},
  totalUnread: 0,
  latestAlerts: {}, // { [deviceId]: { title, body, severity, at } }
  wsStatus: 'disconnected', // 'connecting' | 'connected' | 'disconnected'
  wsLastError: null,
  _seenAlertIds: new Set(), // track unique alerts
  _lastIngestByDevice: {}, // { [deviceId]: { sensorType: ingest_id } }
  _lastValueTsByDevice: {}, // { [deviceId]: { sensorType: { v, t } } }
  _latestPollTimer: null, // fallback polling timer id
  loadingInitial: false,
  errorInitial: null,
  _initialFetchedAt: null,
  loadingAlerts: false,
  errorAlerts: null,

  // Clear all alert-related state (useful to avoid stale entries after deletions)
  clearAlerts: () => set({ deviceAlerts: {}, unreadCounts: {}, totalUnread: 0, latestAlerts: {} }),

  // Update a device's metadata in the devices list (e.g., name, location, photos)
  // Accepts a partial patch; merges only provided keys.
  updateDeviceMeta: (deviceId, patch) => {
    if (!deviceId || !patch) return;
    set(state => {
      const devices = Array.isArray(state.devices) ? state.devices.map(d => {
        if (!d || d.id !== deviceId) return d;
        return { ...d, ...patch };
      }) : state.devices;
      return { devices };
    });
  },

  // Allow pages to update per-device data snapshots (e.g., plant-aware alerts on Dashboard)
  updateDeviceData: (deviceId, dataPayload) => {
    if (!deviceId || !dataPayload) return;
    set(state => {
      const prev = state.deviceData[deviceId] || {};
      // Deep-merge sensors map to avoid dropping keys like water_temperature when partial updates arrive
      const mergedSensors = dataPayload.sensors
        ? { ...(prev.sensors || {}), ...dataPayload.sensors }
        : (prev.sensors || undefined);

      return {
        deviceData: {
          ...state.deviceData,
          [deviceId]: {
            ...prev,
            ...dataPayload,
            ...(dataPayload.sensors ? { sensors: mergedSensors } : {}),
          }
        }
      };
    });
  },

  // --- Actions ---
  fetchInitial: async () => {
    // Idempotency guard to avoid duplicate heavy requests on mount/WS reconnects
    const state = get();
    if (state.loadingInitial) return;
    const alreadyFetched = state._initialFetchedAt && (Date.now() - state._initialFetchedAt < 15_000);
    if (alreadyFetched) return;
    try {
  set({ loadingInitial: true, errorInitial: null });
  if (import.meta.env.VITE_DEBUG === 'true') console.log('[RealtimeStore] Fetching initial data...');

      // Use combined endpoint to reduce round trips
      const payload = await getInitialDashboard({ reading_limit: 60, alert_limit: 200 });
      const devices = payload.devices || [];
      const sensorsByDevice = payload.sensors_by_device || {};
      // reservoirs_by_device removed after model change
      const readingsBySensor = payload.readings_by_sensor || {};
      const alertsPayload = payload.alerts || { count: 0, alerts: [] };

      if (import.meta.env.VITE_DEBUG === 'true') console.log('[RealtimeStore] Combined payload received:', {
        devices: devices.length,
        sensorsGroups: Object.keys(sensorsByDevice).length,
        reservoirsGroups: 0,
        readingsSensors: Object.keys(readingsBySensor).length,
        alerts: alertsPayload.count
      });

      const deviceData = { ...get().deviceData };

      // Build latest snapshots from readings
      for (const d of devices) {
        const sList = sensorsByDevice[d.id] || [];
        const latest = {};
        let lastUpdate = null;

        for (const s of sList) {
          const arr = readingsBySensor[s.id] || [];
          if (!arr.length) continue;
          const last = arr[0]; // already ordered by -created_at
          if (last && last.value != null) {
            switch (s.sensor_type) {
              case 'ph': latest.ph = last.value; break;
              case 'tds': latest.tds = last.value; break;
              case 'ec': latest.ec = last.value; break;
              case 'water_level': latest.waterLevel = last.value; break;
              case 'turbidity': latest.turbidity = last.value; break;
              // removed environment metrics
              case 'water_temperature': latest.water_temperature = last.value; break;
            }
          }
          // track last update
          for (const r of arr) {
            if (r?.created_at) {
              const t = new Date(r.created_at);
              if (!lastUpdate || t > lastUpdate) lastUpdate = t;
            }
          }
        }

        const { connectivity, lastSync } = getConnectivityStatus(lastUpdate);
        const alertText = generateAlertText({
          ph: latest.ph,
          tds: latest.tds,
          waterLevel: latest.waterLevel,
          turbidity: latest.turbidity,
        });

        const prev = deviceData[d.id] || {};
        deviceData[d.id] = {
          ...prev,
          sensors: {
            ...(prev.sensors || {}),
            ph: latest.ph,
            ec: latest.ec,
            tds: latest.tds,
            waterLevel: latest.waterLevel,
            turbidity: latest.turbidity,
            water_temperature: latest.water_temperature,
          },
          // environment removed (humidity, temperature, light)
          nutrientText: getNutrientStatus(latest.tds),
          alertText,
          connectivity,
          lastSyncLabel: lastSync,
          lastUpdate: lastUpdate?.toISOString(),
          // Keep any existing phHistory/phLabels if the page already fetched them
          phHistory: Array.isArray(prev.phHistory) && prev.phHistory.length ? prev.phHistory : [],
          phLabels: Array.isArray(prev.phLabels) && prev.phLabels.length ? prev.phLabels : [],
          // Seed plant from device meta if available; keep prev if already set
          plant: prev.plant || d.plant || undefined,
        };
      }

      // Hydrate alerts into store using same path as fetchAlerts does
      const alerts = alertsPayload.alerts || [];
      const deviceAlerts = {};
      const unreadCounts = {};
      const latestAlerts = {};
      let totalUnread = 0;
      alerts.forEach(alert => {
        const deviceId = alert.device_id || alert.device?.id;
        if (!deviceId) return;
        if (!deviceAlerts[deviceId]) deviceAlerts[deviceId] = [];
        const normalizedAlert = {
          id: alert.id,
          reading_id: alert.reading_id || alert.id,
          device_id: deviceId,
          title: alert.title || alert.message,
          body: alert.body || alert.message,
          severity: alert.severity || alert.type || 'info',
          timestamp: alert.timestamp || alert.created_at,
          is_read: alert.is_read || false,
          sensor_type: alert.sensor_type,
          value: alert.value
        };
        deviceAlerts[deviceId].push(normalizedAlert);
        if (!normalizedAlert.is_read) {
          unreadCounts[deviceId] = (unreadCounts[deviceId] || 0) + 1;
          totalUnread += 1;
        }
        const at = new Date(normalizedAlert.timestamp);
        if (!latestAlerts[deviceId] || at > new Date(latestAlerts[deviceId].at)) {
          latestAlerts[deviceId] = {
            title: normalizedAlert.title,
            body: normalizedAlert.body,
            severity: normalizedAlert.severity,
            at: normalizedAlert.timestamp
          };
        }
      });

      set({ devices, deviceData, deviceAlerts, unreadCounts, totalUnread, latestAlerts, loadingInitial: false, _initialFetchedAt: Date.now() });
      if (import.meta.env.VITE_DEBUG === 'true') console.log('[RealtimeStore] Initial data fetch completed (combined endpoint)');
    } catch (e) {
      if (import.meta.env.VITE_DEBUG === 'true') console.error('[RealtimeStore] Failed to fetch initial data:', e);
      set({ errorInitial: 'Failed to load devices', loadingInitial: false });
    }
  },

  fetchAlerts: async () => {
    try {
      set({ loadingAlerts: true, errorAlerts: null });
      if (import.meta.env.VITE_DEBUG === 'true') console.log('[RealtimeStore] Fetching alerts from backend...');
      // Prefer canonical sensors alerts table; fallback to notifications logs if sensors API fails
      let alerts = [];
      try {
        const sensorResp = await listSensorAlerts({ ordering: '-created_at' });
        const rows = Array.isArray(sensorResp?.results) ? sensorResp.results : (Array.isArray(sensorResp) ? sensorResp : []);
        const devs = get().devices || [];
        const deviceIdByLabel = new Map(devs.map(d => [
          `${d.device_name} (${d.device_serial})`, d.id
        ]));
        alerts = rows.map(a => {
          const label = a.device || '';
          const resolvedDeviceId = a.device_id || deviceIdByLabel.get(label);
          return {
            id: a.id,
            reading_id: a.id,
            device_id: resolvedDeviceId,
            title: a.title,
            body: a.recommendation,
            severity: a.severity,
            timestamp: a.created_at,
            is_read: false, // sensors alerts don't track read status; UI will still work
            sensor_type: a.metric,
            value: a.value,
          };
        });
        if (import.meta.env.VITE_DEBUG === 'true') console.log('[RealtimeStore] Sensors alerts response:', alerts.length);
      } catch (e) {
        if (import.meta.env.VITE_DEBUG === 'true') console.warn('[RealtimeStore] Sensors alerts fetch failed, falling back to notifications logs:', e);
        const response = await getUserAlerts({ limit: 200 });
        alerts = response.alerts || [];
      }
      if (import.meta.env.VITE_DEBUG === 'true') console.log('[RealtimeStore] Processing', alerts.length, 'alerts');

      // Group alerts by device_id
      const deviceAlerts = {};
      const unreadCounts = {};
      const latestAlerts = {};
      let totalUnread = 0;

      alerts.forEach(alert => {
        // Handle different alert data structures from backend
        const deviceId = alert.device_id || alert.device?.id;
        if (!deviceId) {
          console.warn('[RealtimeStore] Alert missing device_id:', alert);
          return;
        }

        if (!deviceAlerts[deviceId]) {
          deviceAlerts[deviceId] = [];
        }

        // Normalize alert data structure
        const normalizedAlert = {
          id: alert.id,
          reading_id: alert.reading_id || alert.id,
          device_id: deviceId,
          title: alert.title || alert.message,
          body: alert.body || alert.message,
          severity: alert.severity || alert.type || 'info',
          timestamp: alert.timestamp || alert.created_at,
          is_read: alert.is_read || false,
          sensor_type: alert.sensor_type,
          value: alert.value
        };

        // Add alert to device's alert list
        deviceAlerts[deviceId].push(normalizedAlert);

        // Update unread counts
        if (!normalizedAlert.is_read) {
          unreadCounts[deviceId] = (unreadCounts[deviceId] || 0) + 1;
          totalUnread += 1;
        }

        // Update latest alert for this device
        const alertTime = new Date(normalizedAlert.timestamp);
        if (!latestAlerts[deviceId] || alertTime > new Date(latestAlerts[deviceId].at)) {
          latestAlerts[deviceId] = {
            title: normalizedAlert.title,
            body: normalizedAlert.body,
            severity: normalizedAlert.severity,
            at: normalizedAlert.timestamp
          };
        }
      });

      if (import.meta.env.VITE_DEBUG === 'true') console.log('[RealtimeStore] Processed alerts:', {
        deviceAlerts: Object.keys(deviceAlerts).length,
        totalUnread,
        latestAlerts: Object.keys(latestAlerts).length
      });

      set({
        deviceAlerts,
        unreadCounts,
        totalUnread,
        latestAlerts,
        loadingAlerts: false
      });
    } catch (err) {
      if (import.meta.env.VITE_DEBUG === 'true') console.error('[RealtimeStore] Failed to fetch alerts:', err);
      set({ errorAlerts: err.message, loadingAlerts: false });
    }
  },

  applyRealtime: (payload) => {
    const { device_id } = payload || {};
    if (!device_id) {
      if (import.meta.env.VITE_DEBUG === 'true') console.warn('[RealtimeStore] Invalid realtime payload (missing device_id):', payload);
      return;
    }

    // Accept both aggregated sensors map and single-reading format
    // Aggregated: { type:'sensor.update', device_id, sensors:{ ph, tds, water_temperature, ... }, timestamp }
    // Single:     { type:'sensor.update', device_id, sensor_type:'water_temperature', value: 24.3, unit:'°C', timestamp }
    let updates = {};
    let ingestIds = payload && payload.ingest_ids && typeof payload.ingest_ids === 'object' ? payload.ingest_ids : null;
    if (payload && typeof payload.sensors === 'object' && payload.sensors) {
      updates = payload.sensors;
    } else if (payload && typeof payload.sensor_type === 'string' && payload.value !== undefined) {
      const key = String(payload.sensor_type).toLowerCase();
      const map = {
        ph: 'ph',
        tds: 'tds',
        ec: 'ec',
        water_level: 'water_level',
        water_temp: 'water_temperature',
        water_temperature: 'water_temperature',
        turbidity: 'turbidity',
        turbidity_status: 'turbidity_status',
      };
      const k = map[key];
      if (k) updates[k] = payload.value;
    }

    if (!updates || Object.keys(updates).length === 0) {
      if (import.meta.env.VITE_DEBUG === 'true') console.warn('[RealtimeStore] Realtime payload had no sensor updates:', payload);
      return;
    }

    // Use provided timestamp or fall back to now to avoid stale detection pauses
    const timestamp = payload.timestamp || new Date().toISOString();

    // Apply updates even if devices list hasn't loaded yet; merge later when devices arrive

    if (import.meta.env.VITE_DEBUG === 'true') console.log('[RealtimeStore] Applying realtime update for device', device_id, ':', updates);

    set(state => {
      const existing = state.deviceData[device_id] || {};
      const nextSensors = { ...(existing.sensors || {}) };
      const nextEnv = { ...(existing.environment || {}) };

      // Update sensor values
      const s = updates; // normalized map from above
      const lastIngest = { ...(state._lastIngestByDevice[device_id] || {}) };
      const lastVT = { ...(state._lastValueTsByDevice[device_id] || {}) };

      const tryAssign = (sensorType, value) => {
        if (value === undefined) return;
        const newIngest = ingestIds && ingestIds[sensorType];
        if (newIngest) {
          if (lastIngest[sensorType] === newIngest) return; // duplicate ingest
          lastIngest[sensorType] = newIngest;
          nextSensors[sensorType === 'water_level' ? 'waterLevel' : sensorType] = value;
          return;
        }
        // Fallback dedupe: same value within 1s
        const prev = lastVT[sensorType];
        if (prev && prev.v === value) {
          const dt = Math.abs(new Date(timestamp).getTime() - new Date(prev.t).getTime());
          if (dt <= 1000) return; // ignore
        }
        lastVT[sensorType] = { v: value, t: timestamp };
        nextSensors[sensorType === 'water_level' ? 'waterLevel' : sensorType] = value;
      };

      tryAssign('ph', s.ph);
      tryAssign('ec', s.ec);
      tryAssign('tds', s.tds);
      tryAssign('water_level', s.water_level);
      tryAssign('turbidity', s.turbidity);
      if (s.turbidity_status !== undefined) nextSensors.turbidity_status = s.turbidity_status;
      tryAssign('water_temperature', s.water_temperature);
      // removed environment metrics from realtime updates

      // Recalculate derived values
      const nutrientText = getNutrientStatus(nextSensors.tds);
      const alertText = generateAlertText({
        ph: nextSensors.ph,
        tds: nextSensors.tds,
        waterLevel: nextSensors.waterLevel,
        turbidity: nextSensors.turbidity,
      });

      // Update connectivity status
      const { connectivity, lastSync } = getConnectivityStatus(timestamp);

      // Update latest alert if there's an alert condition
      let alertMeta = null;
      const nowIso = new Date(timestamp || Date.now()).toISOString();
      if (alertText && alertText !== 'All systems normal') {
        alertMeta = {
          title: alertText.split(' - ')[0],
          body: alertText,
          severity: /Too High|Too Low|Outside|below|above|Critically|Empty/i.test(alertText) ? 'critical' : 'warning',
          at: nowIso
        };
      }

      const latestAlerts = { ...state.latestAlerts };
      if (alertMeta) {
        const prevMeta = latestAlerts[device_id];
        if (!prevMeta || new Date(alertMeta.at) > new Date(prevMeta.at)) {
          latestAlerts[device_id] = alertMeta;
        }
      }

      // Update unread counts if new alert
      const unreadCounts = { ...state.unreadCounts };
      let totalUnread = state.totalUnread;
      if (alertMeta) {
        const prevMeta = state.latestAlerts[device_id];
        if (!prevMeta || new Date(alertMeta.at) > new Date(prevMeta.at)) {
          unreadCounts[device_id] = (unreadCounts[device_id] || 0) + 1;
          totalUnread += 1;
        }
      }

      if (import.meta.env.VITE_DEBUG === 'true') console.log('[RealtimeStore] Updated device data for', device_id, ':', {
        sensors: nextSensors,
        environment: nextEnv,
        alertText,
        nutrientText,
        connectivity
      });

      return {
        deviceData: {
          ...state.deviceData,
          [device_id]: {
            ...existing,
            sensors: nextSensors,
            environment: nextEnv,
            nutrientText,
            alertText,
            connectivity,
            lastSyncLabel: lastSync,
            lastUpdate: timestamp,
          }
        },
        _lastIngestByDevice: { ...state._lastIngestByDevice, [device_id]: lastIngest },
        _lastValueTsByDevice: { ...state._lastValueTsByDevice, [device_id]: lastVT },
        latestAlerts,
        unreadCounts,
        totalUnread
      };
    });
  },

  connectWS: () => {
    const currentStatus = get().wsStatus;
    if (currentStatus === 'connected' || currentStatus === 'connecting') {
      if (import.meta.env.VITE_DEBUG === 'true') console.log('[RealtimeStore] WebSocket already connected or connecting');
      return () => { }; // Return empty cleanup function
    }

    if (import.meta.env.VITE_DEBUG === 'true') console.log('[RealtimeStore] Connecting to WebSocket...');
    set({ wsStatus: 'connecting', wsLastError: null });

    // Get current user ID for user-specific WebSocket connection
    const getCurrentUserId = () => {
      try {
        const token = localStorage.getItem('authToken');
        if (token) {
          // Decode JWT token to get user ID (only if well-formed JWT)
          const parts = token.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1]));
            return payload.user_id || payload.id || payload.sub || null;
          }
        }
      } catch (e) {
        // Quietly ignore non-JWT tokens to avoid console noise
      }
      return null;
    };

    let userId = getCurrentUserId();
    if (!userId) {
      // Fallback: fetch profile to obtain user id when token is not a JWT (e.g., DRF Token)
      try {
        const token = localStorage.getItem('authToken');
        if (token) {
          authApi.getProfile(token).then(profile => {
            try {
              userId = profile?.id || profile?.user_id || profile?.pk || null;
              if (userId) {
                localStorage.setItem('userId', String(userId));
                if (import.meta.env.VITE_DEBUG === 'true') console.log('[RealtimeStore] Retrieved user id from profile:', userId);
                // Establish user-specific connection now that we have id
                wsClient.connect(userId);
              } else {
                if (import.meta.env.VITE_DEBUG === 'true') console.warn('[RealtimeStore] Profile response missing id; using global WS endpoint');
                wsClient.connect(null);
              }
            } catch (e) {
              if (import.meta.env.VITE_DEBUG === 'true') console.warn('[RealtimeStore] Failed persisting user id:', e);
              wsClient.connect(null);
            }
          }).catch(e => {
            if (import.meta.env.VITE_DEBUG === 'true') console.warn('[RealtimeStore] Failed to fetch profile for websocket user id:', e);
            wsClient.connect(null);
          });
        } else {
          wsClient.connect(null);
        }
      } catch (e) {
        wsClient.connect(null);
      }
    } else {
      if (import.meta.env.VITE_DEBUG === 'true') console.log('[RealtimeStore] Connecting with user ID (JWT decoded):', userId);
      wsClient.connect(userId);
    }

    // Subscribe to WebSocket messages
    const unsub = wsClient.subscribe(msg => {
      if (import.meta.env.VITE_DEBUG === 'true') console.log('[RealtimeStore] WebSocket message received:', msg);

      if (msg?.type === 'sensor.update') {
        if (import.meta.env.VITE_DEBUG === 'true') console.log('[RealtimeStore] Processing sensor update:', msg);
        get().applyRealtime(msg);
      } else if (msg?.type === 'alert.new') {
        if (import.meta.env.VITE_DEBUG === 'true') console.log('[RealtimeStore] Processing new alert:', msg);
        get().handleNewAlert(msg);
      } else if (msg?.type === 'alert_update') {
        // Handle alert updates from WebSocket
        const payload = msg.payload;
        if (payload?.type === 'alert.new') {
          if (import.meta.env.VITE_DEBUG === 'true') console.log('[RealtimeStore] Processing alert update payload:', payload);
          get().handleNewAlert(payload);
        }
      } else if (msg?.action && msg?.data) {
        // Handle generic device updates coming from DeviceConsumer
        if (msg.action === 'collaborator_added') {
          if (import.meta.env.VITE_DEBUG === 'true') console.log('[RealtimeStore] Collaborator added event received; refreshing initial data');
          get().fetchInitial();
        }
      } else if (msg?.message === 'device_update' && msg?.data?.action) {
        // Handle user-specific notifications carrying device update actions
        if (msg.data.action === 'collaborator_added') {
          if (import.meta.env.VITE_DEBUG === 'true') console.log('[RealtimeStore] User notification: collaborator added; refreshing initial data');
          get().fetchInitial();
        }
      }
    });

    // Subscribe to WebSocket status changes
    const statusUnsub = wsClient.onStatusChange((status) => {
      if (import.meta.env.VITE_DEBUG === 'true') console.log('[RealtimeStore] WebSocket status changed to:', status);
      set({ wsStatus: status });

      if (status === 'connected') {
        // Refresh data when connection is established
        if (import.meta.env.VITE_DEBUG === 'true') console.log('[RealtimeStore] WebSocket connected, refreshing data...');
        const s = get();
        // Only trigger initial fetch once; otherwise fetch alerts only
        if (!s._initialFetchedAt) {
          get().fetchInitial();
        } else {
          get().fetchAlerts();
        }
      } else if (status === 'disconnected') {
        if (import.meta.env.VITE_DEBUG === 'true') console.log('[RealtimeStore] WebSocket disconnected');
        set({ wsLastError: 'Connection lost' });
        // Start fallback polling for latest readings every 5s (if not already started)
        const state = get();
        if (!state._latestPollTimer) {
          const doPoll = async () => {
            try {
              const { getLatestReadings, getDeviceSensors } = await import('../services/api/sensors');
              const devices = get().devices || [];
              for (const d of devices) {
                // Map sensor_id -> type for this device
                let typeById = {};
                try {
                  const sResp = await getDeviceSensors(d.id);
                  const sList = Array.isArray(sResp?.results) ? sResp.results : (Array.isArray(sResp) ? sResp : []);
                  for (const s of sList) typeById[s.id] = s.sensor_type;
                } catch (_) { }

                const rows = await getLatestReadings(d.id).catch(() => []);
                const sensors = {};
                let newestTs = null;
                (rows || []).forEach(r => {
                  const typ = typeById[r.sensor_id];
                  if (!typ) return;
                  sensors[typ] = r.value;
                  const t = r.updated_at ? new Date(r.updated_at) : null;
                  if (t && (!newestTs || t > newestTs)) newestTs = t;
                });
                if (Object.keys(sensors).length) {
                  get().updateDeviceData(d.id, { sensors, lastUpdate: (newestTs || new Date()).toISOString() });
                }
              }
            } catch (_) { /* ignore polling errors */ }
          };
          const id = setInterval(doPoll, 5000);
          set({ _latestPollTimer: id });
        }
      }
    });

    // Return cleanup function
    return () => {
      if (import.meta.env.VITE_DEBUG === 'true') console.log('[RealtimeStore] Cleaning up WebSocket subscriptions');
      unsub();
      statusUnsub();
      const t = get()._latestPollTimer;
      if (t) {
        clearInterval(t);
        set({ _latestPollTimer: null });
      }
    };
  },

  handleNewAlert: (payload) => {
    const { device_id, alert, timestamp } = payload || {};
    if (!device_id || !alert) return;

    set(state => {
      const deviceAlerts = { ...state.deviceAlerts };
      const currentAlerts = deviceAlerts[device_id] || [];

      const seen = new Set(state._seenAlertIds || []);
      const alertKey = String(alert.id || alert.reading_id || '') || `${device_id}-${timestamp}`;
      const isDuplicate = seen.has(alertKey);
      if (!isDuplicate) {
        const newAlert = {
          ...alert,
          timestamp: timestamp || new Date().toISOString(),
          device_id,
          is_read: false,
        };

        // Keep only last 50 alerts per device to avoid memory bloat
        const updatedAlerts = [newAlert, ...currentAlerts].slice(0, 50);
        deviceAlerts[device_id] = updatedAlerts;

        // Update latest alert for badge
        const latestAlerts = { ...state.latestAlerts };
        latestAlerts[device_id] = {
          title: alert.title,
          body: alert.body,
          severity: alert.severity,
          at: timestamp || new Date().toISOString(),
        };

        // Update unread count
        const unreadCounts = { ...state.unreadCounts };
        unreadCounts[device_id] = (unreadCounts[device_id] || 0) + 1;

        return {
          deviceAlerts,
          latestAlerts,
          unreadCounts,
          totalUnread: state.totalUnread + 1,
          _seenAlertIds: new Set([...seen, alertKey]),
        };
      }

      return state;
    });
  },

  markAlertAsRead: async (deviceId, readingId) => {
    try {
      // Call backend API to mark alert as read
      await markAlertsAsRead([readingId]);

      // Update local state
      set(state => {
        const deviceAlerts = { ...state.deviceAlerts };
        const alerts = deviceAlerts[deviceId] || [];

        const updatedAlerts = alerts.map(alert => {
          if (alert.reading_id === readingId && !alert.is_read) {
            return { ...alert, is_read: true };
          }
          return alert;
        });

        deviceAlerts[deviceId] = updatedAlerts;

        // Update unread count
        const unreadCounts = { ...state.unreadCounts };
        if (unreadCounts[deviceId] > 0) {
          unreadCounts[deviceId] -= 1;
        }

        return {
          deviceAlerts,
          unreadCounts,
          totalUnread: Math.max(0, state.totalUnread - 1),
        };
      });
    } catch (err) {
      console.error('Failed to mark alert as read:', err);
    }
  },

  markAllDeviceAlertsRead: async (deviceId) => {
    try {
      // Get unread alert IDs for this device
      const state = get();
      const alerts = state.deviceAlerts[deviceId] || [];
      const unreadAlertIds = alerts.filter(a => !a.is_read).map(a => a.reading_id);

      if (unreadAlertIds.length > 0) {
        // Call backend API to mark alerts as read
        await markAlertsAsRead(unreadAlertIds);
      }

      // Update local state
      set(state => {
        const deviceAlerts = { ...state.deviceAlerts };
        const alerts = deviceAlerts[deviceId] || [];

        const unreadCount = alerts.filter(a => !a.is_read).length;

        const updatedAlerts = alerts.map(alert => ({ ...alert, is_read: true }));
        deviceAlerts[deviceId] = updatedAlerts;

        const unreadCounts = { ...state.unreadCounts };
        unreadCounts[deviceId] = 0;

        return {
          deviceAlerts,
          unreadCounts,
          totalUnread: Math.max(0, state.totalUnread - unreadCount),
        };
      });
    } catch (err) {
      console.error('Failed to mark all device alerts as read:', err);
    }
  },
}), {
  name: 'realtime-store',
  partialize: (state) => ({
    devices: state.devices,
    deviceData: state.deviceData,
    deviceAlerts: state.deviceAlerts,
    latestAlerts: state.latestAlerts,
    unreadCounts: state.unreadCounts,
    totalUnread: state.totalUnread,
  }),
}));

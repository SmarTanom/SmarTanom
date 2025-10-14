import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { wsClient } from '../services/websocketClient';
import { getUserDevices } from '../services/api/devices';
import { getDeviceSensors, getSensorData } from '../services/api/sensors';
import { getDeviceReservoirs } from '../services/api/reservoirs';

// Helper utilities replicated minimally (consider DRY refactor later)
const generateAlertText = (s) => {
  if (!s) return 'All systems normal';
  const alerts = [];
  if (typeof s.tds === 'number') {
    if (s.tds < 300) alerts.push('TDS too low (Inadequate nutrients)');
    else if (s.tds > 1500) alerts.push('TDS too high (Dilute solution)');
  }
  if (typeof s.ph === 'number') {
    if (s.ph < 5.5) alerts.push('pH too low - adjust up');
    else if (s.ph > 6.5) alerts.push('pH trending high - check solution');
  }
  if (typeof s.waterLevel === 'number' && s.waterLevel < 20) alerts.push('Water level below threshold');
  if (typeof s.temperature === 'number' && (s.temperature < 18 || s.temperature > 28)) alerts.push('Temperature outside optimal range');
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
  loadingInitial: false,
  errorInitial: null,

  // --- Actions ---
  fetchInitial: async () => {
    try {
      set({ loadingInitial: true, errorInitial: null });
      const devicesResp = await getUserDevices();
      const devices = devicesResp.results || devicesResp || [];
      const deviceData = { ...get().deviceData };
      for (const d of devices) {
        try {
          const [sensorsResp, reservoirsResp] = await Promise.all([
            getDeviceSensors(d.id),
            getDeviceReservoirs(d.id)
          ]);
          const sensors = sensorsResp.results || sensorsResp || [];
            const sensorDataMap = {};
            // fetch recent readings per sensor
            await Promise.all(sensors.map(async (s) => {
              try {
                const dataResp = await getSensorData(s.id, 60);
                const list = dataResp.results || dataResp || [];
                sensorDataMap[s.id] = list;
              } catch { sensorDataMap[s.id] = []; }
            }));
          // build latest snapshot
          const latest = {};
          Object.values(sensorDataMap).forEach(list => {
            list.forEach(r => {
              if (!r || r.value == null) return;
              // map by sensor_type using a reverse lookup from sensors
            });
          });
          // simple mapping via sensors array for latest value only
          sensors.forEach(s => {
            const arr = sensorDataMap[s.id] || [];
            if (!arr.length) return;
            const last = arr.reduce((a,b) => new Date(b.created_at) > new Date(a.created_at) ? b : a, arr[0]);
            if (last && last.value != null) {
              switch (s.sensor_type) {
                case 'ph': latest.ph = last.value; break;
                case 'tds': latest.tds = last.value; break;
                case 'ec': latest.ec = last.value; break;
                case 'water_level': latest.waterLevel = last.value; break;
                case 'turbidity': latest.turbidity = last.value; break;
                case 'air_temperature': latest.temperature = last.value; break;
                case 'humidity': latest.humidity = last.value; break;
                case 'light': latest.light = last.value; break;
                case 'water_temperature': latest.water_temperature = last.value; break;
              }
            }
          });
          let lastUpdate = null;
          Object.values(sensorDataMap).forEach(list => list.forEach(r => {
            if (r?.created_at) {
              const t = new Date(r.created_at);
              if (!lastUpdate || t > lastUpdate) lastUpdate = t;
            }
          }));
          const { connectivity, lastSync } = getConnectivityStatus(lastUpdate);
          deviceData[d.id] = {
            sensors: {
              ph: latest.ph,
              ec: latest.ec,
              tds: latest.tds,
              waterLevel: latest.waterLevel,
              turbidity: latest.turbidity,
            },
            environment: {
              temperature: latest.temperature,
              humidity: latest.humidity,
              light: latest.light,
            },
            nutrientText: getNutrientStatus(latest.tds),
            alertText: generateAlertText({
              ph: latest.ph, tds: latest.tds, waterLevel: latest.waterLevel, temperature: latest.temperature
            }),
            connectivity,
            lastSyncLabel: lastSync,
            phHistory: [], // optional: populated lazily in page
            phLabels: [],
          };
        } catch (e) {
          console.warn('[RealtimeStore] Failed device fetch', d.id, e);
          deviceData[d.id] = deviceData[d.id] || {};
        }
      }
      set({ devices, deviceData, loadingInitial: false });
    } catch (e) {
      set({ errorInitial: 'Failed to load devices', loadingInitial: false });
    }
  },

  applyRealtime: (payload) => {
    const { device_id, sensors, timestamp, reading } = payload || {};
    if (!device_id || !sensors) return;
    set(state => {
      const existing = state.deviceData[device_id] || {};
      const nextSensors = { ...(existing.sensors || {}) };
      const nextEnv = { ...(existing.environment || {}) };
      if (sensors.ph !== undefined) nextSensors.ph = sensors.ph;
      if (sensors.ec !== undefined) nextSensors.ec = sensors.ec;
      if (sensors.tds !== undefined) nextSensors.tds = sensors.tds;
      if (sensors.water_level !== undefined) nextSensors.waterLevel = sensors.water_level;
      if (sensors.turbidity !== undefined) nextSensors.turbidity = sensors.turbidity;
      if (sensors.temperature !== undefined) nextEnv.temperature = sensors.temperature;
      if (sensors.humidity !== undefined) nextEnv.humidity = sensors.humidity;
      if (sensors.light_lux !== undefined) nextEnv.light = sensors.light_lux;

      const nutrientText = getNutrientStatus(nextSensors.tds);
      const alertText = generateAlertText({
        ph: nextSensors.ph,
        tds: nextSensors.tds,
        waterLevel: nextSensors.waterLevel,
        temperature: nextEnv.temperature
      });
      // classify simple severity for badge
      let alertMeta = null;
      const nowIso = new Date(timestamp || Date.now()).toISOString();
      if (alertText && alertText !== 'All systems normal') {
        alertMeta = { title: alertText.split(' - ')[0], body: alertText, severity: /Too High|Too Low|Outside|below|above/i.test(alertText) ? 'critical' : 'warning', at: nowIso };
      }
      const latestAlerts = { ...state.latestAlerts };
      if (alertMeta) {
        const prevMeta = latestAlerts[device_id];
        if (!prevMeta || prevMeta.at < alertMeta.at) {
          latestAlerts[device_id] = alertMeta;
        }
      }
      // unread counts: increment per device if new alert meta
      const unreadCounts = { ...state.unreadCounts };
      let totalUnread = state.totalUnread;
      if (alertMeta) {
        unreadCounts[device_id] = (unreadCounts[device_id] || 0) + 1;
        totalUnread += 1;
      }
      return {
        deviceData: {
          ...state.deviceData,
          [device_id]: {
            ...existing,
            sensors: nextSensors,
            environment: nextEnv,
            nutrientText,
            alertText,
            lastUpdate: timestamp,
          }
        },
        latestAlerts,
        unreadCounts,
        totalUnread
      };
    });
  },

  connectWS: () => {
    if (get().wsStatus === 'connected' || get().wsStatus === 'connecting') return;
    set({ wsStatus: 'connecting', wsLastError: null });
    wsClient.connect();
    const unsub = wsClient.subscribe(msg => {
      if (msg?.type === 'sensor.update') {
        get().applyRealtime(msg);
      } else if (msg?.type === 'alert.new') {
        get().handleNewAlert(msg);
      }
    });
    // naive: rely on existing client logs; no direct status callbacks exposed currently
    return unsub;
  },

  handleNewAlert: (payload) => {
    const { device_id, alert, timestamp } = payload || {};
    if (!device_id || !alert) return;

    set(state => {
      const deviceAlerts = { ...state.deviceAlerts };
      const currentAlerts = deviceAlerts[device_id] || [];

      // Add new alert to the beginning (most recent first)
      // Prevent duplicates by checking reading_id
      const isDuplicate = alert.reading_id && currentAlerts.some(a => a.reading_id === alert.reading_id);
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
        };
      }

      return state;
    });
  },

  markAlertAsRead: (deviceId, readingId) => {
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
  },

  markAllDeviceAlertsRead: (deviceId) => {
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

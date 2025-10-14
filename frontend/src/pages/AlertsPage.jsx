import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import '../assets/styles/AlertsPage.css';
import {
  Leaf,
  AlertCircle,
  User,
  TriangleAlert,
  Droplets,
  Zap,
  Thermometer,
  Waves,
  Sun,
  Sprout,
  ChevronRight,
  Filter,
  Bell
} from 'lucide-react';

import { getUserDevices } from '../services/api/devices.js';
import { getDeviceSensors, getSensorData } from '../services/api/sensors.js';
import { getDeviceReservoirs } from '../services/api/reservoirs.js';
import { listPlants } from '../services/api/plants.js';
import { wsClient } from '../services/websocketClient';

// Local persistence for read alerts (database alerts only)
const READ_STORAGE_KEY = 'alerts.readingIds';

function loadIdSet(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch (_e) {
    return new Set();
  }
}

function saveIdSet(key, set) {
  try {
    localStorage.setItem(key, JSON.stringify(Array.from(set)));
  } catch (_e) {
    // ignore
  }
}

function isPersistedRead(alert) {
  const readingIds = loadIdSet(READ_STORAGE_KEY);
  if (alert && alert.readingId && readingIds.has(alert.readingId)) return true;
  return false;
}

function persistMarkRead(alert) {
  if (!alert || !alert.readingId) return;
  const s = loadIdSet(READ_STORAGE_KEY);
  s.add(alert.readingId);
  saveIdSet(READ_STORAGE_KEY, s);
  try {
    window.dispatchEvent(new Event('alerts-read-updated'));
  } catch (_e) { }
}

// Helper: format a ISO date string to a relative time (minutes/hours/days ago)
function relativeTimeFromISO(iso) {
  try {
    const then = new Date(iso);
    if (Number.isNaN(then.getTime())) return 'just now';
    const now = new Date();
    const diffMs = now - then;
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return 'just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
    // For older dates, show short locale date
    return then.toLocaleDateString();
  } catch (e) {
    return 'just now';
  }
}

// Removed static TDS thresholds. We now derive ppm_min/ppm_max from Plant table
// per reservoir (device bound to a plant via its active reservoir). We treat a
// reading as:
// - critical when value < ppm_min or value > ppm_max
// - warning when value is within proximity buffer of either bound.
// Proximity buffer default: 10% of range (bounded min 50 ppm, max 200 ppm) or
// can be adjusted here if UX needs tuning.
const DEFAULT_PROXIMITY_MIN = 50; // ppm
const DEFAULT_PROXIMITY_MAX = 200; // ppm

// Generic proximity buffer (10% span clamped) for any numeric range
function computeProximityBuffer(min, max) {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return { low: DEFAULT_PROXIMITY_MIN, high: DEFAULT_PROXIMITY_MIN };
  const span = Math.max(0, max - min);
  const base = span * 0.1; // 10%
  const buf = Math.min(DEFAULT_PROXIMITY_MAX, Math.max(DEFAULT_PROXIMITY_MIN, base));
  return { low: buf, high: buf };
}

function classifyValue(value, min, max) {
  if (!Number.isFinite(value) || !Number.isFinite(min) || !Number.isFinite(max)) {
    return { severity: 'none', reason: null };
  }
  const { low: proxLow, high: proxHigh } = computeProximityBuffer(min, max);
  if (value < min) return { severity: 'critical', reason: 'below_min', proxLow, proxHigh };
  if (value > max) return { severity: 'critical', reason: 'above_max', proxLow, proxHigh };
  if (value <= min + proxLow) return { severity: 'warning', reason: 'near_min', proxLow, proxHigh };
  if (value >= max - proxHigh) return { severity: 'warning', reason: 'near_max', proxLow, proxHigh };
  return { severity: 'none', reason: null, proxLow, proxHigh };
}

function classifyTDS(value, plant) {
  if (!plant) return { severity: 'none', reason: null };
  return classifyValue(Number(value), plant.ppm_min, plant.ppm_max);
}

function classifyPH(value, plant) {
  if (!plant) return { severity: 'none', reason: null };
  return classifyValue(Number(value), plant.ph_min, plant.ph_max);
}

function classifyWaterTemp(value, plant) {
  if (!plant) return { severity: 'none', reason: null };
  return classifyValue(Number(value), plant.water_temp_min, plant.water_temp_max);
}

function classifyLight(value, plant) {
  if (!plant) return { severity: 'none', reason: null };
  return classifyValue(Number(value), plant.light_min, plant.light_max);
}

function classifyEnvTemp(value, plant) {
  if (!plant) return { severity: 'none', reason: null };
  return classifyValue(Number(value), plant.environment_temp_min, plant.environment_temp_max);
}

function classifyHumidity(value, plant) {
  if (!plant) return { severity: 'none', reason: null };
  return classifyValue(Number(value), plant.humidity_min, plant.humidity_max);
}

// Brand color constant
const PRIMARY_GREEN = 'rgba(51, 148, 50, 0.9)';

// Plant specific recommendation templates.
// These strings should stay SHORT (UI constraint) and action-oriented.
// Keyed by plant_name (case-sensitive to match API) then by sensor domain + reason.
// You can safely extend this object with more plant types without touching logic below.
const PLANT_RECOMMENDATION_TEMPLATES = {
  Lettuce: {
    general: 'Keep roots cool and solution well oxygenated.',
    ph: {
      below_min: 'Raise slowly to avoid nutrient lockout; aim 5.8–6.2.',
      above_max: 'Slightly high pH can reduce iron uptake; adjust 0.2 at a time.',
      near_min: 'Trend downward? Buffer with small pH Up dose.',
      near_max: 'Monitor — drifting high may cause tip burn risk.'
    },
    tds: {
      below_min: 'Increase EC gradually (no more than +100 ppm per adjustment).',
      above_max: 'Dilute to avoid bitterness; target mid‑range.',
      near_min: 'Plan a mild nutrient top-up soon.',
      near_max: 'If leaves pale or edges curl, dilute slightly.'
    },
    light: {
      below_min: 'Add supplemental light or reduce canopy shading.',
      above_max: 'Too intense light can cause tip burn; raise fixture or diffuse.',
      near_min: 'Consider extending photoperiod if growth slows.',
      near_max: 'Watch for leaf edge curl — may need to raise lights.'
    },
    environment_temp: {
      below_min: 'Cool air slows growth — ensure adequate circulation but avoid drafts.',
      above_max: 'High heat risks bolting — increase ventilation or shading.',
      near_min: 'If trend continues, pre‑warm incoming air.',
      near_max: 'Improve airflow to stabilize temperature.'
    },
    water_temperature: {
      below_min: 'Cold roots slow nutrient uptake — insulate reservoir.',
      above_max: 'Warm solution lowers dissolved oxygen; consider chilling.',
      near_min: 'Monitor nightly lows; add insulation if dropping further.',
      near_max: 'Aerate more or partially replace with cooler water.'
    },
    humidity: {
      below_min: 'Low RH increases transpiration — add gentle misting.',
      above_max: 'High RH risks mildew — add airflow / dehumidify.',
      near_min: 'If leaves wilt mid‑day, raise RH slightly.',
      near_max: 'Ensure leaves dry before dark period.'
    }
  },
  Basil: {
    general: 'Ensure consistent pruning to encourage airflow.',
    ph: {
      below_min: 'Low pH can mute aroma compounds — raise gradually.',
      above_max: 'High pH reduces micronutrient availability — adjust slowly.',
      near_min: 'Stabilize with small pH Up micro‑dose.',
      near_max: 'If trending higher, perform partial dilution.'
    },
    tds: {
      below_min: 'Slight boost supports leaf mass; add balanced nutrients.',
      above_max: 'Excess salts can dull flavor — dilute 10–20%.',
      near_min: 'Consider mild feed if new growth is pale.',
      near_max: 'Maintain airflow; high EC plus heat stresses basil.'
    },
    light: {
      below_min: 'Increase PPFD for compact, aromatic growth.',
      above_max: 'Too much light may cause chlorosis — raise fixture.',
      near_min: 'Extend photoperiod a little for fuller canopy.',
      near_max: 'Watch for leaf curl; diffuse if necessary.'
    },
    environment_temp: {
      below_min: 'Basil slows < optimal temp — avoid cold drafts.',
      above_max: 'High heat + high RH invites fungus — vent promptly.',
      near_min: 'If nights are cool, buffer with thermal mass.',
      near_max: 'Improve evaporative cooling or shading.'
    },
    water_temperature: {
      below_min: 'Cool solution reduces root vigor — gently warm.',
      above_max: 'Warm solution invites pathogen pressure — cool it.',
      near_min: 'Insulate lines if chill is recurring.',
      near_max: 'Increase aeration to maintain oxygen.'
    },
    humidity: {
      below_min: 'Low RH can stunt tender tips — raise slightly.',
      above_max: 'Prone to downy mildew — dehumidify now.',
      near_min: 'Monitor leaf edge dry‑out.',
      near_max: 'Ensure canopy dries before dark.'
    }
  }
};

function enrichAlertMessage(plantInfo, sensorType, classificationReason, baseMessage) {
  if (!plantInfo) return baseMessage;
  const name = plantInfo.plant_name;
  const tips = PLANT_RECOMMENDATION_TEMPLATES[name];
  if (!tips) return baseMessage; // no specific template
  // Map sensor type to domain key used in templates
  const domainMap = {
    ph: 'ph',
    tds: 'tds',
    light: 'light',
    humidity: 'humidity',
    air_temperature: 'environment_temp',
    water_temperature: 'water_temperature'
  };
  const domain = domainMap[sensorType];
  let extra = '';
  if (domain && tips[domain]) {
    const domainTips = tips[domain];
    extra = domainTips[classificationReason] || '';
  }
  if (!extra && tips.general) extra = tips.general;
  if (!extra) return baseMessage;
  // Append with separator if not already present
  return `${baseMessage} Recommendation: ${extra}`;
}

export default function AlertsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const deviceId = searchParams.get('deviceId'); // Get device filter from URL
  const [filter, setFilter] = useState('all'); // 'all', 'unread', 'critical'
  // Alerts state initialized as empty - only real database alerts will be shown
  const [alerts, setAlerts] = useState([]);
  // Persist alerts locally so refresh does not wipe history (bounded)
  const ALERTS_STORAGE_KEY = 'alerts.realtime';

  // Hydrate from storage
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(ALERTS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setAlerts(prev => {
            // Merge without duplicating readingId
            const existingIds = new Set(prev.map(a => a.readingId));
            const merged = [...prev];
            parsed.forEach(a => { if (a.readingId && !existingIds.has(a.readingId)) merged.push(a); });
            return merged;
          });
        }
      }
    } catch (_e) { /* ignore */ }
  }, []);

  // Persist on change (trim to last 200 to avoid unbounded growth)
  React.useEffect(() => {
    try {
      const trimmed = alerts.slice(-200);
      localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(trimmed));
    } catch (_e) { }
  }, [alerts]);
  const [filteredDeviceName, setFilteredDeviceName] = useState(null); // Store device name when filtering

  // On first mount, apply persisted read flags to initial alerts
  React.useEffect(() => {
    setAlerts(prev => prev.map(a => ({ ...a, read: isPersistedRead(a) || a.read }))); // preserve existing read true
  }, []);

  // On mount: fetch user's bound devices -> map devices to active reservoir plant -> fetch sensors & readings
  React.useEffect(() => {
    let mounted = true;
    const fetchRecentReadings = async () => {
      try {
        const devicesResp = await getUserDevices();
        const devices = devicesResp && devicesResp.results ? devicesResp.results : devicesResp;
        if (!devices || devices.length === 0) return;

        // We'll collect out-of-range pH readings (low <6 or high >7) across all devices
        const abnormalReadings = [];

        // Fetch plant catalog once (public endpoint)
        let plantCatalog = [];
        try {
          const plantResp = await listPlants();
          plantCatalog = plantResp && plantResp.results ? plantResp.results : plantResp;
        } catch (e) {
          // Non-fatal
          console.warn('AlertsPage: failed to fetch plant catalog', e);
        }

        // Helper to get plant object for a given plant_name or id
        const findPlant = (reservoir) => {
          if (!reservoir) return null;
          // reservoir.plant_type is plant.plant_name (serializer alias)
          const name = reservoir.plant_type || reservoir.plant;
          if (!name) return null;
          return plantCatalog.find(p => p.plant_name === name) || null;
        };

        // Filter devices if deviceId is specified
        const devicesToCheck = deviceId
          ? devices.filter(device => device.id.toString() === deviceId)
          : devices;

        // Set filtered device name for display
        if (deviceId && devicesToCheck.length > 0) {
          const device = devicesToCheck[0];
          const deviceName = device.device_name || device.plant_name || `Device ${device.device_serial}`;
          setFilteredDeviceName(deviceName);
          console.log(`🔍 Filtering alerts for device: "${deviceName}" (ID: ${deviceId})`);
        } else {
          setFilteredDeviceName(null);
          if (deviceId) {
            console.warn(`⚠️ Device ID ${deviceId} not found in user's devices`);
          } else {
            console.log('📋 Showing alerts for all devices');
          }
        }

        // For each device (filtered if needed), fetch its reservoirs to resolve plant ranges, then sensors & readings
        await Promise.all(devicesToCheck.map(async (device) => {
          try {
            if (!device || !device.id) return;
            // Load reservoirs for device (to access plant association). Use first active reservoir heuristically.
            let devicePlant = null;
            try {
              const resResp = await getDeviceReservoirs(device.id);
              const reservoirs = resResp && resResp.results ? resResp.results : resResp;
              if (Array.isArray(reservoirs) && reservoirs.length > 0) {
                // Choose reservoir with latest start_date or latest created_at as 'active'
                const active = [...reservoirs].sort((a, b) => {
                  const da = new Date(a.start_date || a.created_at || 0).getTime();
                  const db = new Date(b.start_date || b.created_at || 0).getTime();
                  return db - da;
                })[0];
                devicePlant = findPlant(active);
              }
            } catch (e) {
              console.warn('AlertsPage: failed to fetch reservoirs for device', device.id, e);
            }
            const sensorsResp = await getDeviceSensors(device.id);
            const sensors = sensorsResp && sensorsResp.results ? sensorsResp.results : sensorsResp;
            if (!sensors || sensors.length === 0) return;

            // Consider pH, water_level, tds, turbidity, light, humidity and air_temperature (DHT22) sensors
            // Backend uses 'air_temperature' for DHT22 (air temp + humidity)
            const relevantSensors = sensors.filter(s => ['ph', 'water_level', 'tds', 'turbidity', 'light', 'humidity', 'air_temperature', 'water_temperature'].includes(s.sensor_type));
            if (!relevantSensors || relevantSensors.length === 0) return;

            // Fetch recent sensor data for each relevant sensor so we can show multiple alerts
            await Promise.all(relevantSensors.map(async (sensor) => {
              try {
                const dataResp = await getSensorData(sensor.id, 60);
                const data = dataResp && dataResp.results ? dataResp.results : dataResp;
                const readings = Array.isArray(data) ? data : (data ? [data] : []);

                readings.forEach(r => {
                  const val = r && typeof r.value !== 'undefined' ? r.value : null;
                  if (val === null) return;

                  if (sensor.sensor_type === 'ph') {
                    const { severity } = classifyPH(Number(val), devicePlant);
                    if (severity === 'critical' || severity === 'warning') {
                      abnormalReadings.push({ device, sensor, reading: r, plant: devicePlant });
                    }
                  } else if (sensor.sensor_type === 'water_level') {
                    // Water level: 0 -> critical; <=40 -> warning
                    if (val === 0 || val <= 40) {
                      abnormalReadings.push({ device, sensor, reading: r });
                    }
                  } else if (sensor.sensor_type === 'tds') {
                    // Dynamic plant-driven classification
                    const { severity } = classifyTDS(Number(val), devicePlant);
                    if (severity === 'critical' || severity === 'warning') {
                      abnormalReadings.push({ device, sensor, reading: r, plant: devicePlant });
                    }
                  } else if (sensor.sensor_type === 'turbidity') {
                    // Turbidity classification:
                    // raw > 2100 => Clear (no alert)
                    // raw > 1800 => Cloudy (warning)
                    // else => Turbid (critical)
                    const raw = Number(val);
                    if (raw > 2100) {
                      // Clear — do not push an alert
                    } else if (raw > 1800) {
                      // Cloudy — warning
                      abnormalReadings.push({ device, sensor, reading: r });
                    } else {
                      // Turbid — critical
                      abnormalReadings.push({ device, sensor, reading: r });
                    }
                  } else if (sensor.sensor_type === 'light') {
                    const { severity } = classifyLight(Number(val), devicePlant);
                    if (severity === 'critical' || severity === 'warning') {
                      abnormalReadings.push({ device, sensor, reading: r, plant: devicePlant });
                    }
                  } else if (sensor.sensor_type === 'humidity') {
                    const { severity } = classifyHumidity(Number(val), devicePlant);
                    if (severity === 'critical' || severity === 'warning') {
                      abnormalReadings.push({ device, sensor, reading: r, plant: devicePlant });
                    }
                  } else if (sensor.sensor_type === 'air_temperature') {
                    const { severity } = classifyEnvTemp(Number(val), devicePlant);
                    if (severity === 'critical' || severity === 'warning') {
                      abnormalReadings.push({ device, sensor, reading: r, plant: devicePlant });
                    }
                  } else if (sensor.sensor_type === 'water_temperature') {
                    const { severity } = classifyWaterTemp(Number(val), devicePlant);
                    if (severity === 'critical' || severity === 'warning') {
                      abnormalReadings.push({ device, sensor, reading: r, plant: devicePlant });
                    }
                  }
                });
              } catch (e) {
                // ignore sensor-level failures
                // eslint-disable-next-line no-console
                console.warn('AlertsPage: failed to fetch data for sensor', sensor && sensor.id, e);
              }
            }));

          } catch (e) {
            // ignore device-level failures
            // eslint-disable-next-line no-console
            console.warn('AlertsPage: failed to fetch sensors/data for device', device && device.id, e);
          }
        }));

        if (!mounted) return;

        if (abnormalReadings.length === 0) return;

        // Build alerts for each out-of-range reading, avoiding duplicates by reading id/timestamp
        setAlerts(prev => {
          const next = [...prev];
          // find numeric id base
          let nextId = Math.max(0, ...next.map(a => Number(a.id) || 0)) + 1;

          abnormalReadings
            // sort newest-first by reading.created_at (if available)
            .sort((a, b) => {
              const ta = a.reading && (a.reading.created_at || a.reading.timestamp) ? new Date(a.reading.created_at || a.reading.timestamp).getTime() : 0;
              const tb = b.reading && (b.reading.created_at || b.reading.timestamp) ? new Date(b.reading.created_at || b.reading.timestamp).getTime() : 0;
              return tb - ta;
            })
            .forEach(({ device, sensor, reading, plant }) => {
              const readingKey = reading.id || reading.created_at || reading.timestamp || JSON.stringify(reading);
              // skip if already represented
              const exists = next.some(a => a.readingId && a.readingId === readingKey);
              if (exists) return;

              const latestIso = reading.created_at || reading.timestamp || new Date().toISOString();
              const val = reading.value;

              // Determine alert content based on sensor type
              let title = 'Alert';
              let type = 'warning';
              let message = '';
              let icon = 'droplet';
              if (reading && reading.sensor_type && reading.sensor_type === 'water_level') {
                // Some backends put sensor_type on sensor object; however our local 'sensor' object is available as well.
              }

              if (sensor && sensor.sensor_type === 'ph') {
                const plantInfo = plant;
                const min = plantInfo?.ph_min;
                const max = plantInfo?.ph_max;
                const classification = classifyPH(Number(val), plantInfo);
                let classificationReason = classification.reason;
                icon = 'droplet';
                if (classification.severity === 'critical') {
                  if (classification.reason === 'below_min') {
                    type = 'critical';
                    title = 'pH below optimal range';
                    message = `pH is ${val} — below optimal range (${min}–${max}) for ${plantInfo?.plant_name || 'this plant'}. Raise pH slowly using pH Up; mix thoroughly and re-test.`;
                  } else if (classification.reason === 'above_max') {
                    type = 'critical';
                    title = 'pH above optimal range';
                    message = `pH is ${val} — above optimal range (${min}–${max}) for ${plantInfo?.plant_name || 'this plant'}. Lower pH gradually using pH Down; mix thoroughly and re-test.`;
                  }
                } else if (classification.severity === 'warning') {
                  if (classification.reason === 'near_min') {
                    type = 'warning';
                    title = 'pH nearing lower limit';
                    message = `pH is ${val}, approaching ${min} for ${plantInfo?.plant_name || 'this plant'}. Monitor trend and adjust if it continues downward.`;
                  } else if (classification.reason === 'near_max') {
                    type = 'warning';
                    title = 'pH nearing upper limit';
                    message = `pH is ${val}, approaching ${max} for ${plantInfo?.plant_name || 'this plant'}. Monitor and plan gentle adjustment if rising further.`;
                  }
                }
                message = enrichAlertMessage(plantInfo, 'ph', classificationReason, message);
              } else if (sensor && sensor.sensor_type === 'water_level') {
                const isEmpty = Number(val) === 0;
                const isLowLevel = Number(val) <= 40 && Number(val) > 0;
                title = isEmpty ? 'Water level empty' : 'Low water level';
                type = isEmpty ? 'critical' : 'warning';
                if (isEmpty) {
                  message = `Water level is 0% — reservoir empty. Refill with fresh nutrient solution immediately, check pumps for priming issues, and inspect for leaks.`;
                } else {
                  message = `Water level is ${val}%. Low reservoir level (<=40%). Refill soon and verify auto-refill settings or inspect for slow leaks.`;
                }
                icon = 'droplet';
              } else if (sensor && sensor.sensor_type === 'tds') {
                const v = Number(val);
                const plantInfo = plant;
                const classification = classifyTDS(v, plantInfo);
                let classificationReason = classification.reason;
                const min = plantInfo ? plantInfo.ppm_min : undefined;
                const max = plantInfo ? plantInfo.ppm_max : undefined;
                if (classification.severity === 'critical') {
                  if (classification.reason === 'below_min') {
                    type = 'critical';
                    title = 'TDS below optimal range';
                    message = `TDS is ${v} ppm which is below the optimal range (${min}–${max} ppm) for ${plantInfo?.plant_name || 'this plant'}. Increase nutrient concentration gradually and re-test.`;
                  } else if (classification.reason === 'above_max') {
                    type = 'critical';
                    title = 'TDS above optimal range';
                    message = `TDS is ${v} ppm which is above the optimal range (${min}–${max} ppm) for ${plantInfo?.plant_name || 'this plant'}. Dilute or perform a partial drain/refill and re-test.`;
                  }
                } else if (classification.severity === 'warning') {
                  if (classification.reason === 'near_min') {
                    type = 'warning';
                    title = 'TDS approaching low boundary';
                    message = `TDS is ${v} ppm and nearing the lower limit (${min} ppm) for ${plantInfo?.plant_name || 'this plant'}. Monitor and consider a mild nutrient top-up.`;
                  } else if (classification.reason === 'near_max') {
                    type = 'warning';
                    title = 'TDS approaching high boundary';
                    message = `TDS is ${v} ppm and nearing the upper limit (${max} ppm) for ${plantInfo?.plant_name || 'this plant'}. Monitor and consider dilution if trend continues.`;
                  }
                } else {
                  // Should not reach here since non-alerts filtered earlier
                  title = 'TDS stable';
                  type = 'info';
                  message = `TDS is ${v} ppm within optimal range (${min}–${max} ppm).`;
                }
                icon = 'zap';
                message = enrichAlertMessage(plantInfo, 'tds', classificationReason, message);
              } else if (sensor && sensor.sensor_type === 'turbidity') {
                const raw = Number(val);
                if (raw > 2100) {
                  // Clear — shouldn't appear because we filtered earlier, but provide fallback
                  title = 'Water clarity OK';
                  type = 'info';
                  message = `Turbidity reading ${raw} — water is clear. No action required.`;
                } else if (raw > 1800) {
                  title = 'Water cloudy';
                  type = 'warning';
                  message = `Turbidity reading ${raw} — water is cloudy. Inspect filters, clean debris, and consider a partial water change if clarity does not improve.`;
                } else {
                  title = 'Water turbid';
                  type = 'critical';
                  message = `Turbidity reading ${raw} — water is turbid (high suspended solids). Perform a reservoir drain and refill, clean filters and tubing, and sanitize the reservoir if needed.`;
                }
                icon = 'waves';
              } else if (sensor && sensor.sensor_type === 'light') {
                const plantInfo = plant;
                const min = plantInfo?.light_min;
                const max = plantInfo?.light_max;
                const lux = Number(val);
                const classification = classifyLight(lux, plantInfo);
                let classificationReason = classification.reason;
                icon = 'sun';
                if (classification.severity === 'critical') {
                  if (classification.reason === 'below_min') {
                    type = 'critical';
                    title = 'Insufficient light';
                    message = `Light is ${lux} lux — below optimal range (${min}–${max} lux) for ${plantInfo?.plant_name || 'this plant'}. Increase exposure or adjust lighting.`;
                  } else if (classification.reason === 'above_max') {
                    type = 'critical';
                    title = 'Excessive light';
                    message = `Light is ${lux} lux — above optimal range (${min}–${max} lux) for ${plantInfo?.plant_name || 'this plant'}. Provide shading or reduce supplemental lighting.`;
                  }
                } else if (classification.severity === 'warning') {
                  if (classification.reason === 'near_min') {
                    type = 'warning';
                    title = 'Light nearing lower limit';
                    message = `Light is ${lux} lux, approaching the lower bound (${min} lux) for ${plantInfo?.plant_name || 'this plant'}. Monitor and adjust if it trends lower.`;
                  } else if (classification.reason === 'near_max') {
                    type = 'warning';
                    title = 'Light nearing upper limit';
                    message = `Light is ${lux} lux, approaching the upper bound (${max} lux) for ${plantInfo?.plant_name || 'this plant'}. Monitor to prevent stress.`;
                  }
                }
                message = enrichAlertMessage(plantInfo, 'light', classificationReason, message);
              } else if (sensor && sensor.sensor_type === 'humidity') {
                const plantInfo = plant;
                const h = Number(val);
                const min = plantInfo?.humidity_min;
                const max = plantInfo?.humidity_max;
                const classification = classifyHumidity(h, plantInfo);
                let classificationReason = classification.reason;
                icon = 'sprout';
                if (classification.severity === 'critical') {
                  if (classification.reason === 'below_min') {
                    type = 'critical';
                    title = 'Humidity below optimal range';
                    message = `Humidity is ${h}% — below optimal range (${min}–${max}%) for ${plantInfo?.plant_name || 'this plant'}. Add humidity (misters, trays) and reduce excessive ventilation.`;
                  } else if (classification.reason === 'above_max') {
                    type = 'critical';
                    title = 'Humidity above optimal range';
                    message = `Humidity is ${h}% — above optimal range (${min}–${max}%) for ${plantInfo?.plant_name || 'this plant'}. Increase airflow or dehumidify to prevent mold.`;
                  }
                } else if (classification.severity === 'warning') {
                  if (classification.reason === 'near_min') {
                    type = 'warning';
                    title = 'Humidity nearing lower limit';
                    message = `Humidity is ${h}% and nearing ${min}% for ${plantInfo?.plant_name || 'this plant'}. Monitor to avoid plant stress.`;
                  } else if (classification.reason === 'near_max') {
                    type = 'warning';
                    title = 'Humidity nearing upper limit';
                    message = `Humidity is ${h}% and nearing ${max}% for ${plantInfo?.plant_name || 'this plant'}. Improve ventilation if trend continues.`;
                  }
                }
                message = enrichAlertMessage(plantInfo, 'humidity', classificationReason, message);
              } else if (sensor && sensor.sensor_type === 'air_temperature') {
                const plantInfo = plant;
                const t = Number(val);
                const min = plantInfo?.environment_temp_min;
                const max = plantInfo?.environment_temp_max;
                const classification = classifyEnvTemp(t, plantInfo);
                let classificationReason = classification.reason;
                icon = 'thermometer';
                if (classification.severity === 'critical') {
                  if (classification.reason === 'below_min') {
                    type = 'critical';
                    title = 'Air temperature below optimal';
                    message = `Air temperature is ${t}°C — below optimal (${min}–${max}°C) for ${plantInfo?.plant_name || 'this plant'}. Add heating or reduce drafts.`;
                  } else if (classification.reason === 'above_max') {
                    type = 'critical';
                    title = 'Air temperature above optimal';
                    message = `Air temperature is ${t}°C — above optimal (${min}–${max}°C) for ${plantInfo?.plant_name || 'this plant'}. Improve cooling, shading, or airflow.`;
                  }
                } else if (classification.severity === 'warning') {
                  if (classification.reason === 'near_min') {
                    type = 'warning';
                    title = 'Air temp nearing lower limit';
                    message = `Air temperature is ${t}°C, approaching ${min}°C for ${plantInfo?.plant_name || 'this plant'}. Monitor to avoid chilling stress.`;
                  } else if (classification.reason === 'near_max') {
                    type = 'warning';
                    title = 'Air temp nearing upper limit';
                    message = `Air temperature is ${t}°C, approaching ${max}°C for ${plantInfo?.plant_name || 'this plant'}. Enhance ventilation or shading.`;
                  }
                }
                message = enrichAlertMessage(plantInfo, 'air_temperature', classificationReason, message);
              } else if (sensor && sensor.sensor_type === 'water_temperature') {
                const plantInfo = plant;
                const wt = Number(val);
                const min = plantInfo?.water_temp_min;
                const max = plantInfo?.water_temp_max;
                const classification = classifyWaterTemp(wt, plantInfo);
                let classificationReason = classification.reason;
                icon = 'thermometer';
                if (classification.severity === 'critical') {
                  if (classification.reason === 'below_min') {
                    type = 'critical';
                    title = 'Water temperature below optimal';
                    message = `Water temperature is ${wt}°C — below optimal (${min}–${max}°C) for ${plantInfo?.plant_name || 'this plant'}. Add a heater or insulate reservoir.`;
                  } else if (classification.reason === 'above_max') {
                    type = 'critical';
                    title = 'Water temperature above optimal';
                    message = `Water temperature is ${wt}°C — above optimal (${min}–${max}°C) for ${plantInfo?.plant_name || 'this plant'}. Cool reservoir (chiller / frozen bottles) and increase circulation.`;
                  }
                } else if (classification.severity === 'warning') {
                  if (classification.reason === 'near_min') {
                    type = 'warning';
                    title = 'Water temp nearing lower limit';
                    message = `Water temp is ${wt}°C, approaching ${min}°C for ${plantInfo?.plant_name || 'this plant'}. Monitor and prepare heating if it drops further.`;
                  } else if (classification.reason === 'near_max') {
                    type = 'warning';
                    title = 'Water temp nearing upper limit';
                    message = `Water temp is ${wt}°C, approaching ${max}°C for ${plantInfo?.plant_name || 'this plant'}. Consider cooling actions to avoid root stress.`;
                  }
                }
                message = enrichAlertMessage(plantInfo, 'water_temperature', classificationReason, message);
              } else {
                // fallback
                title = 'Sensor alert';
                type = 'warning';
                message = `Sensor reading is ${val}. Review sensor placement, calibration and system status for guidance.`;
              }

              const alertObj = {
                id: nextId++,
                type,
                icon: icon || 'droplet',
                title,
                device: device.device_name || device.device_serial || `Device ${device.id}`,
                deviceId: device.id,
                deviceSerial: device.device_serial || null,
                message,
                timestamp: relativeTimeFromISO(latestIso),
                date: latestIso,
                read: false,
                // metadata for deduplication / tracking
                readingId: readingKey,
              };

              // Set read state from persistence if this reading was previously read
              if (isPersistedRead(alertObj)) {
                alertObj.read = true;
              }

              // prepend so newest appear first
              next.unshift(alertObj);
            });

          return next;
        });
      } catch (err) {
        // Non-fatal; alerts page should still render (empty if no database alerts)
        // eslint-disable-next-line no-console
        console.warn('AlertsPage: failed to fetch recent pH readings', err);
      }
    };

    fetchRecentReadings();
    return () => { mounted = false; };
  }, []);

  // Real-time websocket subscription for sensor.update events
  React.useEffect(() => {
    wsClient.connect();
    const unsubscribe = wsClient.subscribe(msg => {
      if (!msg || msg.type !== 'sensor.update' || !msg.sensors) return;
      const deviceId = msg.device_id;
      const sensors = msg.sensors;
      const reading = msg.reading || {};
      const sensorType = reading.sensor_type || null;
      const value = reading.value;
      const createdAt = reading.created_at || msg.timestamp || new Date().toISOString();

      // Derive alert conditions (mirror Dashboard + existing classification fallback)
      let alertCandidate = null;
      if (typeof sensors.ph === 'number' && (sensors.ph < 5.5 || sensors.ph > 6.5) && sensorType === 'ph') {
        alertCandidate = {
          type: 'critical',
          title: sensors.ph < 5.5 ? 'pH below optimal range' : 'pH above optimal range',
          message: `pH is ${sensors.ph.toFixed(1)} — ${sensors.ph < 5.5 ? 'below' : 'above'} optimal range (5.5–6.5). Adjust gradually and re-test.`,
          icon: 'droplet'
        };
      } else if (typeof sensors.tds === 'number' && sensorType === 'tds' && (sensors.tds < 800 || sensors.tds > 1500)) {
        alertCandidate = {
          type: 'critical',
          title: sensors.tds < 800 ? 'TDS below optimal range' : 'TDS above optimal range',
          message: `TDS is ${Math.round(sensors.tds)} ppm (${sensors.tds < 800 ? 'low' : 'high'}). Adjust nutrient concentration and re-test.`,
          icon: 'zap'
        };
      } else if (typeof sensors.water_level === 'number' && sensorType === 'water_level' && (sensors.water_level === 0 || sensors.water_level < 40)) {
        const wl = sensors.water_level;
        alertCandidate = {
          type: wl === 0 ? 'critical' : 'warning',
            title: wl === 0 ? 'Water level empty' : 'Low water level',
            message: wl === 0 ? 'Reservoir empty. Refill immediately and inspect for leaks.' : `Water level is ${Math.round(wl)}% (low). Refill soon.`,
          icon: 'droplet'
        };
      } else if (typeof sensors.temperature === 'number' && sensorType === 'air_temperature' && (sensors.temperature < 18 || sensors.temperature > 28)) {
        alertCandidate = {
          type: 'warning',
          title: 'Air temperature out of range',
          message: `Air temperature is ${sensors.temperature.toFixed(1)}°C (optimal 18–26°C).`,
          icon: 'thermometer'
        };
      } else if (typeof sensors.humidity === 'number' && sensorType === 'humidity' && (sensors.humidity < 50 || sensors.humidity > 70)) {
        alertCandidate = {
          type: 'warning',
          title: sensors.humidity < 50 ? 'Humidity low' : 'Humidity high',
          message: `Humidity is ${Math.round(sensors.humidity)}%. Optimal 50–70%.`,
          icon: 'sprout'
        };
      } else if (typeof sensors.light_lux === 'number' && sensorType === 'light' && sensors.light_lux > 1500) {
        alertCandidate = {
          type: 'critical',
          title: 'Light intensity high',
          message: `Light is ${Math.round(sensors.light_lux)} lux (above 1500). Reduce intensity or raise fixture.`,
          icon: 'sun'
        };
      } else if (typeof sensors.turbidity === 'number' && sensorType === 'turbidity' && sensors.turbidity <= 2100) {
        if (sensors.turbidity <= 1800) {
          alertCandidate = {
            type: 'critical',
            title: 'Water turbid',
            message: `Turbidity reading ${Math.round(sensors.turbidity)} — water is turbid. Perform partial drain/refill and clean filters.`,
            icon: 'waves'
          };
        } else {
          alertCandidate = {
            type: 'warning',
            title: 'Water cloudy',
            message: `Turbidity reading ${Math.round(sensors.turbidity)} — water is cloudy. Inspect filters and consider partial change.`,
            icon: 'waves'
          };
        }
      } else if (typeof sensors.water_temperature === 'number' && sensorType === 'water_temperature') {
        const wt = sensors.water_temperature;
        if (wt < 18 || wt > 26) {
          alertCandidate = {
            type: 'warning',
            title: 'Water temperature out of range',
            message: `Water temperature is ${wt.toFixed(1)}°C (target 18–26°C).`,
            icon: 'thermometer'
          };
        }
      }

      if (!alertCandidate) return; // no alert produced

      setAlerts(prev => {
        const readingKey = reading.id || createdAt + ':' + sensorType + ':' + deviceId;
        if (prev.some(a => a.readingId === readingKey)) return prev; // duplicate guard
        const nextId = Math.max(0, ...prev.map(a => Number(a.id) || 0)) + 1;
        const deviceName = msg.device_name || `Device ${deviceId}`;
        const newAlert = {
          id: nextId,
          type: alertCandidate.type,
          icon: alertCandidate.icon,
          title: alertCandidate.title,
          device: deviceName,
          deviceId: deviceId,
          deviceSerial: msg.device_serial || null,
          message: alertCandidate.message,
          timestamp: 'just now',
          date: createdAt,
          read: false,
          readingId: readingKey,
        };
        return [newAlert, ...prev].slice(0, 500); // bound list
      });
    });
    return () => { unsubscribe && unsubscribe(); };
  }, []);

  const filteredAlerts = alerts.filter(alert => {
    if (filter === 'unread') return !alert.read;
    if (filter === 'critical') return alert.type === 'critical';
    return true;
  });

  // Ensure descending order by alert creation time
  const sortedAlerts = [...filteredAlerts].sort((a, b) => {
    const ta = a && a.date ? new Date(a.date).getTime() : 0;
    const tb = b && b.date ? new Date(b.date).getTime() : 0;
    return tb - ta; // newest first
  });

  const unreadCount = alerts.filter(a => !a.read).length;

  const markAsRead = (alertId) => {
    setAlerts(prev => prev.map(alert => {
      if (alert.id === alertId) {
        // persist
        persistMarkRead(alert);
        return { ...alert, read: true };
      }
      return alert;
    }));
  };

  const markAllAsRead = () => {
    setAlerts(prev => {
      // persist all alerts currently present
      prev.forEach(a => persistMarkRead(a));
      try { window.dispatchEvent(new Event('alerts-read-updated')); } catch (_e) { }
      return prev.map(alert => ({ ...alert, read: true }));
    });
  };

  const handleAlertClick = (alert) => {
    // Persist and update state immediately before navigating
    try { persistMarkRead(alert); } catch (_e) { }
    try { window.dispatchEvent(new Event('alerts-read-updated')); } catch (_e) { }
    setAlerts(prev => prev.map(a => (a.id === alert.id ? { ...a, read: true } : a)));
    navigate(`/device/${alert.deviceId}`, { state: { deviceId: alert.deviceId, deviceName: alert.device, deviceSerial: alert.deviceSerial } });
  };

  const getAlertIcon = (iconType) => {
    switch (iconType) {
      case 'droplet':
        return <Droplets size={20} strokeWidth={2.5} />;
      case 'zap':
        return <Zap size={20} strokeWidth={2.5} />;
      case 'thermometer':
        return <Thermometer size={20} strokeWidth={2.5} />;
      case 'sprout':
        return <Sprout size={20} strokeWidth={2.5} />;
      case 'sun':
        return <Sun size={20} strokeWidth={2.5} />;
      default:
        return <AlertCircle size={20} strokeWidth={2.5} />;
    }
  };

  return (
    <div className="alerts-page-root">
      {/* Header */}
      <header className="alerts-header">
        <div className="alerts-header-top">
          <h1 className="alerts-header-title">
            {deviceId && filteredDeviceName ? `${filteredDeviceName} Alerts` : 'Alerts'}
            <Bell size={28} color="rgba(17, 17, 17, 0.86)" strokeWidth={2.5} />
          </h1>
          {unreadCount > 0 && (
            <span className="alerts-unread-badge">{unreadCount}</span>
          )}
        </div>
        <div className="alerts-header-actions">
          {deviceId && (
            <button
              className="show-all-devices-button"
              onClick={() => navigate('/alerts')}
              style={{
                background: 'none',
                border: '1px solid rgba(51, 148, 50, 0.3)',
                borderRadius: '6px',
                padding: '8px 12px',
                fontSize: '12px',
                color: 'rgba(51, 148, 50, 0.8)',
                cursor: 'pointer',
                marginRight: '12px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(51, 148, 50, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'none';
              }}
            >
              Show All Devices
            </button>
          )}
          {unreadCount > 0 && (
            <button className="mark-all-read-button" onClick={markAllAsRead}>
              Mark all as read
            </button>
          )}
        </div>
      </header>

      {/* Filter buttons */}
      <div className="alerts-filters">
        <button
          className={`filter-button ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All
        </button>
        <button
          className={`filter-button ${filter === 'unread' ? 'active' : ''}`}
          onClick={() => setFilter('unread')}
        >
          Unread ({unreadCount})
        </button>
        <button
          className={`filter-button ${filter === 'critical' ? 'active' : ''}`}
          onClick={() => setFilter('critical')}
        >
          Critical
        </button>
      </div>

      {/* Alerts list */}
      <main className="alerts-content">
        {sortedAlerts.length === 0 ? (
          <div className="alerts-empty">
            <AlertCircle size={48} color="#8BA797" strokeWidth={1.5} />
            <h3>No alerts to display</h3>
            <p>
              {deviceId && filteredDeviceName
                ? `${filteredDeviceName} has no alerts. Everything looks good!`
                : "You're all caught up! Check back later for updates."
              }
            </p>
          </div>
        ) : (
          <div className="alerts-list">
            {sortedAlerts.map((alert) => (
              <article
                key={alert.id}
                className={`alert-item ${alert.type} ${alert.read ? 'read' : 'unread'}`}
                onClick={() => handleAlertClick(alert)}
              >
                <div className="alert-item-indicator" />
                <div className={`alert-item-icon ${alert.type}`}>
                  {getAlertIcon(alert.icon)}
                </div>
                <div className="alert-item-content">
                  <div className="alert-item-header">
                    <h3 className="alert-item-title">{alert.title}</h3>
                    {!alert.read && <span className="unread-dot" />}
                  </div>
                  <p className="alert-item-device">{alert.device}</p>
                  <p className="alert-item-message">{alert.message}</p>
                  <span className="alert-item-timestamp">{alert.timestamp}</span>
                </div>
                <ChevronRight size={20} color="#8BA797" className="alert-item-chevron" />
              </article>
            ))}
          </div>
        )}
      </main>

      {/* Bottom navigation */}
      <nav className="bottom-nav" aria-label="Primary">
        <button className="nav-item" onClick={() => navigate('/dashboard')}>
          <Leaf size={20} />
          <span>Tanom</span>
        </button>
        <button className="nav-item active" aria-current="page">
          <AlertCircle size={20} />
          <span>Alerts</span>
        </button>
        <button className="nav-item" onClick={() => navigate('/profile')}>
          <User size={20} />
          <span>Profile</span>
        </button>
      </nav>
    </div>
  );
}

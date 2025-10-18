import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import '../assets/styles/UserDashboard.css';
import {
  Leaf,
  Settings,
  ChevronRight,
  AlertCircle,
  Wifi,
  RefreshCw,
  Droplets,
  Activity,
  Zap,
  Waves,
  Droplet,
  Thermometer,
  Wind,
  Sun,
  User,
  Plus,
  Loader
} from 'lucide-react';
// Add left arrow for navigating pH chart windows
import { ChevronLeft } from 'lucide-react';
import { MdScience } from 'react-icons/md';
import { getUserDevices } from '../services/api/devices.js';
import { getDeviceSensors, getSensorData } from '../services/api/sensors.js';
import { getDeviceReservoirs } from '../services/api/reservoirs.js';
import { listPlants } from '../services/api/plants.js';
import { authApi } from '../services/apiClient.js';
import { wsClient } from '../services/websocketClient';
import { useRealtimeStore } from '../store/realtimeStore';

// Brand color constant
const PRIMARY_GREEN = 'rgba(51, 148, 50, 0.9)';

// Helper function to transform sensor data to expected structure
// Pick the most recent reading for each sensor by comparing created_at timestamps.
const transformSensorData = (sensors, sensorDataMap) => {
  const sensorMap = {};

  sensors.forEach(sensor => {
    const allData = sensorDataMap[sensor.id] || [];
    // Find the most recent by created_at. Defensive: fall back to first element.
    let latestData = null;
    if (allData.length === 1) {
      latestData = allData[0];
    } else if (allData.length > 1) {
      latestData = allData.reduce((best, cur) => {
        try {
          const bestT = best && best.created_at ? new Date(best.created_at).getTime() : 0;
          const curT = cur && cur.created_at ? new Date(cur.created_at).getTime() : 0;
          return curT > bestT ? cur : best;
        } catch (e) {
          return best;
        }
      }, allData[0]);
    }
    if (!latestData || typeof latestData.value === 'undefined') {
      return; // Do not set mock/default values
    }
    const value = latestData.value;

    switch (sensor.sensor_type) {
      case 'ph':
        sensorMap.ph = value;
        break;
      case 'tds':
        sensorMap.tds = value;
        break;
      case 'ec':
        sensorMap.ec = value;
        break;
      case 'water_level':
        sensorMap.waterLevel = value;
        break;
      case 'water_temperature':
        sensorMap.waterTemperature = value;
        break;
      case 'turbidity':
        sensorMap.turbidity = value;
        break;
      case 'air_temperature':
        sensorMap.temperature = value;
        break;
      case 'humidity':
        sensorMap.humidity = value;
        break;
      case 'light':
        sensorMap.light = value;
        break;
    }
  });

  return sensorMap;
};

// Helper function to get pH history from sensor data based on time range
// Uses the CHRONOLOGICALLY LAST reading in each period (day/week/month bucket). We sort ascending
// by created_at so the overwrite logic always leaves the true latest value; prevents stale value after refresh.
const getPHHistory = (sensorDataMap, phSensorId, timeRange = 'days') => {
  if (!phSensorId || !sensorDataMap[phSensorId]) {
    console.log('[Dashboard] No pH sensor data available:', { phSensorId, hasData: !!sensorDataMap[phSensorId] });
    return null;
  }

  const phDataRaw = sensorDataMap[phSensorId] || [];
  console.log(`[Dashboard] Processing ${phDataRaw.length} pH readings for ${timeRange} view`);

  // Sort ascending by created_at to ensure later overwrite wins are actual latest
  const phData = [...phDataRaw].sort((a, b) => {
    const ta = a?.created_at ? new Date(a.created_at).getTime() : 0;
    const tb = b?.created_at ? new Date(b.created_at).getTime() : 0;
    return ta - tb;
  });
  const endDate = new Date();
  const dateMap = {};

  let periods, getDateKey, formatPeriod;

  switch (timeRange) {
    case 'weeks':
      periods = 20; // Last 20 weeks
      getDateKey = (date) => {
        const startOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() - date.getDay());
        return startOfWeek.toDateString();
      };
      formatPeriod = (i) => {
        const date = new Date(endDate);
        date.setDate(date.getDate() - (i * 7));
        return getDateKey(date);
      };
      break;

    case 'months':
      periods = 12; // Last 12 months
      getDateKey = (date) => `${date.getFullYear()}-${date.getMonth()}`;
      formatPeriod = (i) => {
        const date = new Date(endDate);
        date.setMonth(date.getMonth() - i);
        return getDateKey(date);
      };
      break;

    default: // 'days'
      periods = 30; // Last 30 days
      getDateKey = (date) => date.toDateString();
      formatPeriod = (i) => {
        const date = new Date(endDate);
        date.setDate(date.getDate() - i);
        return getDateKey(date);
      };
      break;
  }

  // Initialize periods with null values
  for (let i = periods - 1; i >= 0; i--) {
    const dateKey = formatPeriod(i);
    dateMap[dateKey] = null;
  }

  // Fill with the LAST reading in each period (latest wins)
  let validReadings = 0;
  phData.forEach(d => {
    if (!d || !d.created_at) return;
    try {
      const dataDate = new Date(d.created_at);
      const dateKey = getDateKey(dataDate);
      if (!dateMap.hasOwnProperty(dateKey)) return;
      const value = Number(d.value);
      if (!Number.isFinite(value)) return;
      // Latest always overwrites (so the last iteration for that bucket wins)
      dateMap[dateKey] = value;
      validReadings++;
    } catch (_e) {
      // Ignore malformed date/value
    }
  });

  const result = Object.values(dateMap);
  console.log(`[Dashboard] Generated pH history: ${validReadings} valid readings, ${result.filter(v => v !== null).length} non-null periods`);
  return result;
};

// Helper function to get pH labels based on time range
const getPHLabels = (sensorDataMap, phSensorId, timeRange = 'days') => {
  if (!phSensorId || !sensorDataMap[phSensorId]) return null;

  const endDate = new Date();
  const labels = [];

  let periods, formatLabel;

  switch (timeRange) {
    case 'weeks':
      periods = 20;
      formatLabel = (i) => {
        const date = new Date(endDate);
        date.setDate(date.getDate() - (i * 7));
        const startOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() - date.getDay());
        return startOfWeek.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      };
      break;

    case 'months':
      periods = 12;
      formatLabel = (i) => {
        const date = new Date(endDate);
        date.setMonth(date.getMonth() - i);
        return date.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
      };
      break;

    default: // 'days'
      periods = 30;
      formatLabel = (i) => {
        const date = new Date(endDate);
        date.setDate(date.getDate() - i);
        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      };
      break;
  }

  for (let i = periods - 1; i >= 0; i--) {
    labels.push(formatLabel(i));
  }

  return labels;
};

// Helper function to determine connectivity status
const getConnectivityStatus = (lastSensorUpdate) => {
  if (!lastSensorUpdate) return { connectivity: 'Offline', lastSync: 'Never' };

  const now = new Date();
  const lastUpdate = new Date(lastSensorUpdate);
  const diffMinutes = Math.floor((now - lastUpdate) / (1000 * 60));

  if (diffMinutes < 5) {
    return { connectivity: 'Online', lastSync: '< 1 minute ago' };
  } else if (diffMinutes < 60) {
    return { connectivity: 'Online', lastSync: `${diffMinutes} minutes ago` };
  } else {
    return { connectivity: 'Offline', lastSync: `${Math.floor(diffMinutes / 60)} hours ago` };
  }
};

// Helper function to generate alert text based on plant-specific ranges, mirroring AlertsPage descriptions
const generateAlertText = (sensors, plant) => {
  if (!sensors) return 'All systems normal';

  const candidates = [];
  const plantName = plant?.plant_name || 'this plant';

  // Helper to push with priority and severity
  const pushCandidate = (severity, priority, message) => {
    if (!message) return;
    candidates.push({ severity, priority, message });
  };

  // Water level (no plant needed)
  if (typeof sensors.waterLevel === 'number') {
    const v = Number(sensors.waterLevel);
    if (v === 0) {
      pushCandidate('critical', 0, 'Water level is 0% — reservoir empty. Refill with fresh nutrient solution immediately, check pumps for priming issues, and inspect for leaks.');
    } else if (v > 0 && v <= 40) {
      pushCandidate('warning', 1, `Water level is ${v}%. Low reservoir level (<=40%). Refill soon and verify auto-refill settings or inspect for slow leaks.`);
    }
  }

  // pH relative to plant target
  if (typeof sensors.ph === 'number' && plant) {
    const v = Number(sensors.ph);
    const min = plant.ph_min;
    const max = plant.ph_max;
    const cls = classifyPH(v, plant);
    if (cls.severity === 'critical') {
      if (cls.reason === 'below_min') {
        pushCandidate('critical', 2, `pH is ${v} — below optimal range (${min}–${max}) for ${plantName}. Raise pH slowly using pH Up; mix thoroughly and re-test.`);
      } else if (cls.reason === 'above_max') {
        pushCandidate('critical', 2, `pH is ${v} — above optimal range (${min}–${max}) for ${plantName}. Lower pH gradually using pH Down; mix thoroughly and re-test.`);
      }
    } else if (cls.severity === 'warning') {
      if (cls.reason === 'near_min') {
        pushCandidate('warning', 5, `pH is ${v}, approaching ${min} for ${plantName}. Monitor trend and adjust if it continues downward.`);
      } else if (cls.reason === 'near_max') {
        pushCandidate('warning', 5, `pH is ${v}, approaching ${max} for ${plantName}. Monitor and plan gentle adjustment if rising further.`);
      }
    }
  }

  // TDS relative to plant target
  if (typeof sensors.tds === 'number' && plant) {
    const v = Number(sensors.tds);
    const min = plant.ppm_min;
    const max = plant.ppm_max;
    const cls = classifyTDS(v, plant);
    if (cls.severity === 'critical') {
      if (cls.reason === 'below_min') {
        pushCandidate('critical', 3, `TDS is ${v} ppm which is below the optimal range (${min}–${max} ppm) for ${plantName}. Increase nutrient concentration gradually and re-test.`);
      } else if (cls.reason === 'above_max') {
        pushCandidate('critical', 3, `TDS is ${v} ppm which is above the optimal range (${min}–${max} ppm) for ${plantName}. Dilute or perform a partial drain/refill and re-test.`);
      }
    } else if (cls.severity === 'warning') {
      if (cls.reason === 'near_min') {
        pushCandidate('warning', 6, `TDS is ${v} ppm and nearing the lower limit (${min} ppm) for ${plantName}. Monitor and consider a mild nutrient top-up.`);
      } else if (cls.reason === 'near_max') {
        pushCandidate('warning', 6, `TDS is ${v} ppm and nearing the upper limit (${max} ppm) for ${plantName}. Monitor and consider dilution if trend continues.`);
      }
    }
  }

  // EC relative to plant target
  if (typeof sensors.ec === 'number' && plant) {
    const v = Number(sensors.ec);
    const min = plant.ec_min;
    const max = plant.ec_max;
    const cls = classifyEC(v, plant);
    if (cls.severity === 'critical') {
      if (cls.reason === 'below_min') {
        pushCandidate('critical', 4, `EC is ${v} mS/cm which is below the optimal range (${min}–${max} mS/cm) for ${plantName}. Increase nutrient concentration gradually and re-test.`);
      } else if (cls.reason === 'above_max') {
        pushCandidate('critical', 4, `EC is ${v} mS/cm which is above the optimal range (${min}–${max} mS/cm) for ${plantName}. Dilute or perform a partial drain/refill and re-test.`);
      }
    } else if (cls.severity === 'warning') {
      if (cls.reason === 'near_min') {
        pushCandidate('warning', 6.5, `EC is ${v} mS/cm and nearing the lower limit (${min} mS/cm) for ${plantName}. Monitor and consider a mild nutrient top-up.`);
      } else if (cls.reason === 'near_max') {
        pushCandidate('warning', 6.5, `EC is ${v} mS/cm and nearing the upper limit (${max} mS/cm) for ${plantName}. Monitor and consider dilution if trend continues.`);
      }
    }
  }

  // Light relative to plant target
  if (typeof sensors.light === 'number' && plant) {
    const lux = Number(sensors.light);
    const min = plant.light_min;
    const max = plant.light_max;
    const cls = classifyLight(lux, plant);
    if (cls.severity === 'critical') {
      if (cls.reason === 'below_min') {
        pushCandidate('critical', 7, `Light is ${lux} lux — below optimal range (${min}–${max} lux) for ${plantName}. Increase exposure or adjust lighting.`);
      } else if (cls.reason === 'above_max') {
        pushCandidate('critical', 7, `Light is ${lux} lux — above optimal range (${min}–${max} lux) for ${plantName}. Provide shading or reduce supplemental lighting.`);
      }
    } else if (cls.severity === 'warning') {
      if (cls.reason === 'near_min') {
        pushCandidate('warning', 8, `Light is ${lux} lux, approaching the lower bound (${min} lux) for ${plantName}. Monitor and adjust if it trends lower.`);
      } else if (cls.reason === 'near_max') {
        pushCandidate('warning', 8, `Light is ${lux} lux, approaching the upper bound (${max} lux) for ${plantName}. Monitor to prevent stress.`);
      }
    }
  }

  // Humidity relative to plant target
  if (typeof sensors.humidity === 'number' && plant) {
    const h = Number(sensors.humidity);
    const min = plant.humidity_min;
    const max = plant.humidity_max;
    const cls = classifyHumidity(h, plant);
    if (cls.severity === 'critical') {
      if (cls.reason === 'below_min') {
        pushCandidate('critical', 9, `Humidity is ${h}% — below optimal range (${min}–${max}%) for ${plantName}. Add humidity (misters, trays) and reduce excessive ventilation.`);
      } else if (cls.reason === 'above_max') {
        pushCandidate('critical', 9, `Humidity is ${h}% — above optimal range (${min}–${max}%) for ${plantName}. Increase airflow or dehumidify to prevent mold.`);
      }
    } else if (cls.severity === 'warning') {
      if (cls.reason === 'near_min') {
        pushCandidate('warning', 10, `Humidity is ${h}% and nearing ${min}% for ${plantName}. Monitor to avoid plant stress.`);
      } else if (cls.reason === 'near_max') {
        pushCandidate('warning', 10, `Humidity is ${h}% and nearing ${max}% for ${plantName}. Improve ventilation if trend continues.`);
      }
    }
  }

  // Air temperature (environment) relative to plant target
  if (typeof sensors.temperature === 'number' && plant) {
    const t = Number(sensors.temperature);
    const min = plant.environment_temp_min;
    const max = plant.environment_temp_max;
    const cls = classifyEnvTemp(t, plant);
    if (cls.severity === 'critical') {
      if (cls.reason === 'below_min') {
        pushCandidate('critical', 11, `Air temperature is ${t}°C — below optimal (${min}–${max}°C) for ${plantName}. Add heating or reduce drafts.`);
      } else if (cls.reason === 'above_max') {
        pushCandidate('critical', 11, `Air temperature is ${t}°C — above optimal (${min}–${max}°C) for ${plantName}. Improve cooling, shading, or airflow.`);
      }
    } else if (cls.severity === 'warning') {
      if (cls.reason === 'near_min') {
        pushCandidate('warning', 12, `Air temperature is ${t}°C, approaching ${min}°C for ${plantName}. Monitor to avoid chilling stress.`);
      } else if (cls.reason === 'near_max') {
        pushCandidate('warning', 12, `Air temperature is ${t}°C, approaching ${max}°C for ${plantName}. Enhance ventilation or shading.`);
      }
    }
  }

  // Water temperature relative to plant target
  if (typeof sensors.waterTemperature === 'number' && plant) {
    const wt = Number(sensors.waterTemperature);
    const min = plant.water_temp_min;
    const max = plant.water_temp_max;
    const cls = classifyWaterTemp(wt, plant);
    if (cls.severity === 'critical') {
      if (cls.reason === 'below_min') {
        pushCandidate('critical', 13, `Water temperature is ${wt}°C — below optimal (${min}–${max}°C) for ${plantName}. Add a heater or insulate reservoir.`);
      } else if (cls.reason === 'above_max') {
        pushCandidate('critical', 13, `Water temperature is ${wt}°C — above optimal (${min}–${max}°C) for ${plantName}. Cool reservoir (chiller / frozen bottles) and increase circulation.`);
      }
    } else if (cls.severity === 'warning') {
      if (cls.reason === 'near_min') {
        pushCandidate('warning', 14, `Water temp is ${wt}°C, approaching ${min}°C for ${plantName}. Monitor and prepare heating if it drops further.`);
      } else if (cls.reason === 'near_max') {
        pushCandidate('warning', 14, `Water temp is ${wt}°C, approaching ${max}°C for ${plantName}. Consider cooling actions to avoid root stress.`);
      }
    }
  }

  if (candidates.length === 0) return 'All systems normal';

  // Sort by severity (critical first), then priority asc
  candidates.sort((a, b) => {
    if (a.severity !== b.severity) {
      return a.severity === 'critical' ? -1 : 1;
    }
    return a.priority - b.priority;
  });

  return candidates[0].message;
};

// Helper function to determine nutrient status relative to plant ppm range
const getNutrientStatus = (tdsValue, plant) => {
  if (!Number.isFinite(tdsValue)) return undefined;
  if (!plant || plant.ppm_min == null || plant.ppm_max == null) return 'Optimal';
  const cls = classifyTDS(tdsValue, plant);
  if (cls.severity === 'critical') return tdsValue < plant.ppm_min ? 'Low (Add nutrients)' : 'High (Dilute solution)';
  if (cls.severity === 'warning') return tdsValue < plant.ppm_min ? 'Low (near min)' : 'High (near max)';
  return 'Optimal';
};

// Helper functions for alert detection (shared with AlertsPage logic)
const loadReadAlerts = () => {
  try {
    const raw = localStorage.getItem('alerts.readingIds');
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch (_e) {
    return new Set();
  }
};

const isAlertRead = (readingId) => {
  const readAlerts = loadReadAlerts();
  return readAlerts.has(readingId);
};

// --- BEGIN shared alert classification (duplicated from AlertsPage; consider refactor to shared module) ---
const DEFAULT_PROXIMITY_MIN = 50;
const DEFAULT_PROXIMITY_MAX = 200;
function computeProximityBuffer(min, max) {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return { low: DEFAULT_PROXIMITY_MIN, high: DEFAULT_PROXIMITY_MIN };
  const span = Math.max(0, max - min);
  const base = span * 0.1;
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
const classifyPH = (v, plant) => plant ? classifyValue(Number(v), plant.ph_min, plant.ph_max) : { severity: 'none' };
const classifyTDS = (v, plant) => plant ? classifyValue(Number(v), plant.ppm_min, plant.ppm_max) : { severity: 'none' };
const classifyEC = (v, plant) => plant ? classifyValue(Number(v), plant.ec_min, plant.ec_max) : { severity: 'none' };
const classifyEnvTemp = (v, plant) => plant ? classifyValue(Number(v), plant.environment_temp_min, plant.environment_temp_max) : { severity: 'none' };
const classifyHumidity = (v, plant) => plant ? classifyValue(Number(v), plant.humidity_min, plant.humidity_max) : { severity: 'none' };
const classifyLight = (v, plant) => plant ? classifyValue(Number(v), plant.light_min, plant.light_max) : { severity: 'none' };
const classifyWaterTemp = (v, plant) => plant ? classifyValue(Number(v), plant.water_temp_min, plant.water_temp_max) : { severity: 'none' };
// --- END shared alert classification ---

function PHBar({ v, i, min, max, plant }) {
  // Handle null/undefined values (no data for this date)
  if (v === null || v === undefined) {
    return (
      <div className="ph-bar-wrapper" aria-label="No data" style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-end',
        minWidth: '8px',
        maxWidth: '32px',
        height: '100%'
      }}>
        {/* Show a minimal placeholder bar for missing data */}
        <div style={{
          width: '100%',
          height: '2px',
          background: 'rgba(139, 167, 151, 0.2)',
          borderRadius: '2px 2px 0 0'
        }} />
      </div>
    );
  }

  const vv = Number(v);
  const isValid = Number.isFinite(vv);
  const clamped = isValid ? Math.min(max, Math.max(min, vv)) : min;
  const pct = Math.max(2, ((clamped - min) / (max - min)) * 100); // Minimum 2% height for visibility

  // Enhanced color coding based on plant-specific ranges and severity
  const getPHColor = (phValue) => {
    if (!isValid) return 'rgba(139, 167, 151, 0.3)'; // Gray for invalid data

    // Use plant-specific ranges if available
    if (plant && plant.ph_min !== undefined && plant.ph_max !== undefined) {
      const phMin = Number(plant.ph_min);
      const phMax = Number(plant.ph_max);

      if (phValue < phMin) return '#e74c3c'; // Critical red - below minimum
      if (phValue > phMax) return '#e74c3c'; // Critical red - above maximum

      // Warning zones (10% buffer from min/max)
      const buffer = (phMax - phMin) * 0.1;
      if (phValue <= phMin + buffer) return '#f59e0b'; // Warning orange - near minimum
      if (phValue >= phMax - buffer) return '#f59e0b'; // Warning orange - near maximum

      return '#339432'; // Optimal green - within range
    }

    // No hard-coded fallback thresholds; use primary color when target unknown
    return PRIMARY_GREEN;
  };

  return (
    <div className="ph-bar-wrapper" aria-label={`pH ${isValid ? vv.toFixed(1) : 'N/A'}`} style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-end',
      minWidth: '8px',
      maxWidth: '32px',
      height: '100%',
      cursor: 'pointer'
    }}>
      <div
        className="ph-bar"
        style={{
          height: `${pct}%`,
          width: '100%',
          background: getPHColor(vv),
          borderRadius: '2px 2px 0 0',
          transformOrigin: 'bottom',
          animation: `growBar 0.8s ease forwards`,
          animationDelay: `${Math.min(i * 50, 500)}ms`,
          opacity: 0,
          boxShadow: isValid ? `0 2px 4px rgba(0,0,0,0.1)` : 'none'
        }}
      />
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const carouselRef = useRef(null);
  // Cache plant catalog for mapping reservoirs -> plant ranges (shared with AlertsPage logic)
  const plantCatalogRef = useRef(null);
  // Minute tick to force re-render so relative times (e.g., "X minutes ago") update without manual refresh
  const [clockTick, setClockTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setClockTick(t => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  // Initialize activeIdx from localStorage or default to 0
  const [activeIdx, setActiveIdx] = useState(() => {
    try {
      const saved = localStorage.getItem('dashboard.activeDeviceIndex');
      return saved ? parseInt(saved, 10) : 0;
    } catch (e) {
      return 0;
    }
  });

  const scrollTimeoutRef = useRef(null);
  const isAdjustingRef = useRef(false);
  const [timeRange, setTimeRange] = useState('days'); // 'days', 'weeks', 'months'

  // Window size for pH chart navigation (adaptive based on time range)
  const getWindowSize = (timeRange) => {
    switch (timeRange) {
      case 'weeks': return 8; // Show 8 weeks at a time
      case 'months': return 6; // Show 6 months at a time
      default: return 10; // Show 10 days at a time
    }
  };
  const PH_WINDOW_SIZE = getWindowSize(timeRange);

  // Reset pH windows when timeRange changes
  const handleTimeRangeChange = (newTimeRange) => {
    setTimeRange(newTimeRange);
    setPhWindows({}); // Reset all device windows

    // Check if we need to refresh pH data for current device
    if (currentDevice) {
      const savedData = localPhData[currentDevice.id];
      if (!savedData || savedData.timeRange !== newTimeRange) {
        console.log(`[Dashboard] Time range changed to ${newTimeRange}, refreshing pH data for device ${currentDevice.id}`);
        fetchDeviceDataById(currentDevice.id);
      }
    }
  };

  // Helper function to clear saved device persistence (useful for debugging)
  const clearSavedDevice = () => {
    try {
      localStorage.removeItem('dashboard.activeDeviceIndex');
      localStorage.removeItem('dashboard.activeDeviceId');
      console.log('Cleared saved device persistence');
    } catch (e) {
      console.warn('Failed to clear saved device persistence:', e);
    }
  };
  // Keep per-device pH window start index so users can navigate dates
  const [phWindows, setPhWindows] = useState({}); // { [deviceId]: startIndex }

  // State for real data
  // Centralized realtime store state
  const devices = useRealtimeStore(s => s.devices);
  // Only display devices bound to and owned by the logged-in user
  const ownedDevices = useMemo(() => (devices || []).filter(d => d?.is_bound && d?.is_owner), [devices]);
  const devicesData = useRealtimeStore(s => s.deviceData);
  const fetchInitial = useRealtimeStore(s => s.fetchInitial);
  const connectWS = useRealtimeStore(s => s.connectWS);
  const latestAlerts = useRealtimeStore(s => s.latestAlerts);
  const totalUnread = useRealtimeStore(s => s.totalUnread);
  const perDeviceUnreadCounts = useRealtimeStore(s => s.unreadCounts);
  const loadingInitial = useRealtimeStore(s => s.loadingInitial);
  const errorInitial = useRealtimeStore(s => s.errorInitial);
  const updateDeviceData = useRealtimeStore(s => s.updateDeviceData);

  // Track if store has been hydrated from localStorage
  const [isHydrated, setIsHydrated] = useState(false);

  // Check if store is hydrated on mount
  useEffect(() => {
    // Zustand persist rehydrates synchronously on store creation
    // We need to wait a bit to ensure the hydration has completed and data is available
    const timer = setTimeout(() => {
      console.log('✅ Store hydration complete');
      console.log('📦 Devices in store:', useRealtimeStore.getState().devices.length);
      console.log('📦 Device data keys:', Object.keys(useRealtimeStore.getState().deviceData));
      setIsHydrated(true);
    }, 100); // Increased delay to ensure hydration is complete

    return () => clearTimeout(timer);
  }, []);

  // Current device selection must be defined before any effects/dependencies that reference it
  const currentDevice = ownedDevices[activeIdx];
  const data = currentDevice ? devicesData[currentDevice.id] : null;

  // Schedule a refresh at local midnight to update date-based labels/history automatically
  const midnightTimerRef = useRef(null);
  useEffect(() => {
    if (!currentDevice?.id) return;
    // Clear any previous timer
    if (midnightTimerRef.current) {
      clearTimeout(midnightTimerRef.current);
      midnightTimerRef.current = null;
    }
    // Compute ms until next midnight
    const now = new Date();
    const next = new Date(now);
    next.setDate(now.getDate() + 1);
    next.setHours(0, 0, 0, 50); // a tiny buffer past midnight
    const delay = Math.max(1000, next.getTime() - now.getTime());
    midnightTimerRef.current = setTimeout(() => {
      // Rebuild pH labels and history for the active device
      fetchDeviceDataById(currentDevice.id);
    }, delay);
    return () => {
      if (midnightTimerRef.current) clearTimeout(midnightTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDevice?.id, timeRange]);

  // Debug logging for data availability
  useEffect(() => {
    if (currentDevice) {
      console.log('🔍 Current device:', currentDevice.device_name || currentDevice.id);
      console.log('🔍 Device data available:', !!data);
      console.log('🔍 Device data sensors:', data?.sensors);
      console.log('🔍 All devices data keys:', Object.keys(devicesData));
    }
  }, [currentDevice, data, devicesData]);

  // Latest reading for the first device's first sensor (useful for small widgets)
  const [firstSensorReading, setFirstSensorReading] = useState(null);
  const [displayName, setDisplayName] = useState('User');
  // Unread count comes from the realtime store (total across devices)

  // Track last fetched device to prevent duplicate fetches
  const lastFetchedDeviceRef = useRef(null);

  // Local pH history augmentation (store keeps latest values; we add historical series here)
  const [localPhData, setLocalPhData] = useState(() => {
    try {
      const saved = localStorage.getItem('dashboard.phData');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      console.warn('Failed to load pH data from localStorage:', e);
      return {};
    }
  }); // { [deviceId]: { phHistory, phLabels, lastFetch } }

  // Shared helper to compute a stable reading key (match AlertsPage logic)
  const readingKeyOf = (reading) => {
    return (reading && (reading.id || reading.created_at || reading.timestamp)) || JSON.stringify(reading || {});
  };

  // Helper to persist pH data to localStorage
  const persistPhData = (deviceId, phHistory, phLabels, timeRange) => {
    try {
      const updatedData = {
        ...localPhData,
        [deviceId]: {
          phHistory,
          phLabels,
          timeRange,
          lastFetch: Date.now()
        }
      };
      setLocalPhData(updatedData);
      localStorage.setItem('dashboard.phData', JSON.stringify(updatedData));
      console.log(`[Dashboard] Persisted pH data for device ${deviceId}:`, phHistory?.length || 0, 'points');
    } catch (e) {
      console.warn('Failed to persist pH data:', e);
    }
  };

  // Initialize store and fetch profile on mount
  useEffect(() => {
    const initDashboard = async () => {
      // Check authentication first
      const token = localStorage.getItem('authToken');
      if (!token) {
        navigate('/login');
        return;
      }

      // Fetch user profile for greeting (non-blocking)
      try {
        const profile = await authApi.getProfile(token);
        const name =
          (profile && (profile.full_name?.trim() || profile.first_name?.trim() || profile.username?.trim())) ||
          (profile && profile.email ? (profile.email.split('@')[0] || 'User') : 'User');
        setDisplayName(name);
      } catch (e) {
        console.warn('Failed to fetch profile:', e);
      }

      // Trigger store's initial device fetch
      await fetchInitial();
    };

    initDashboard();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Unread counts are now managed by the realtime store automatically





  // Note: Initial fetch is triggered in initDashboard above. Avoid duplicating here to prevent overwriting
  // enriched device data (plant, pH history) populated by targeted fetches.

  // Time range change currently affects only local ph window history building (skip server refetch to avoid flicker)

  // WebSocket real-time updates - handled by store
  useEffect(() => {
    console.log('[Dashboard] Ensuring WebSocket connection via store...');
    const unsub = connectWS();

    return () => {
      console.log('[Dashboard] Cleaning up WebSocket connection...');
      unsub && unsub();
    };
  }, [connectWS]);

  // Always compute plant-aware alert text for the active device (independent of pH history caching)
  useEffect(() => {
    if (!currentDevice?.id) return;

    const existing = devicesData[currentDevice.id];
    const needsAugment = !existing || !existing.plant || !existing.phHistory || existing.phHistory.length === 0;
    const isDifferentDevice = lastFetchedDeviceRef.current !== currentDevice.id;

    if (isDifferentDevice || needsAugment) {
      console.log(`📡 Device context changed or missing plant/history for ${currentDevice.id}. Fetching full device data...`, {
        isDifferentDevice,
        hasPlant: !!existing?.plant,
        phPoints: existing?.phHistory?.length || 0
      });
      fetchDeviceDataById(currentDevice.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDevice?.id]);

  // Floating Action Button (FAB) draggable state
  const fabRef = useRef(null);
  const navHeight = 64; // Bottom nav height from CSS
  const fabSize = 56; // FAB size from CSS
  const dragStartRef = useRef({ x: 0, y: 0, fabX: 0, fabY: 0 });
  const hasDraggedRef = useRef(false);
  const [fabPosition, setFabPosition] = useState({
    x: typeof window !== 'undefined' ? window.innerWidth - 80 : 300,
    y: typeof window !== 'undefined' ? window.innerHeight - navHeight - fabSize - 24 : 500
  });
  const [isDragging, setIsDragging] = useState(false);
  const [deviceLoading, setDeviceLoading] = useState({}); // { [deviceId]: boolean }
  const [wifiSetupDevice, setWifiSetupDevice] = useState(null); // Device to show WiFi setup modal for

  // Targeted fetch for a single device: refresh its sensors/reservoirs and readings only
  const fetchDeviceDataById = async (deviceId) => {
    try {
      if (!deviceId) return;

      // Mark this device as fetched
      lastFetchedDeviceRef.current = deviceId;

      const [sensorsResp, reservoirsResp] = await Promise.all([
        getDeviceSensors(deviceId),
        getDeviceReservoirs(deviceId)
      ]);
      const sensors = sensorsResp && sensorsResp.results ? sensorsResp.results : sensorsResp;
      const reservoirs = reservoirsResp && reservoirsResp.results ? reservoirsResp.results : reservoirsResp;
      // Resolve plant ranges for this device by matching its active reservoir's plant_type to plant catalog
      let plantCatalog = plantCatalogRef.current;
      if (!plantCatalog) {
        try {
          const plantResp = await listPlants();
          plantCatalog = (plantResp && plantResp.results) ? plantResp.results : (Array.isArray(plantResp) ? plantResp : []);
          plantCatalogRef.current = plantCatalog;
        } catch (e) {
          console.warn('[Dashboard] Failed to fetch plant catalog:', e);
          plantCatalog = [];
          plantCatalogRef.current = [];
        }
      }
      const findPlant = (reservoir) => {
        if (!reservoir) return null;
        // First check if reservoir already has full plant object with ranges
        if (reservoir.plant && typeof reservoir.plant === 'object' && reservoir.plant.ph_min !== undefined) {
          console.log('[Dashboard] Using plant data from reservoir object:', reservoir.plant.plant_name);
          return reservoir.plant;
        }
        // Fallback: look up by name in catalog
        const name = reservoir.plant_type || reservoir.plant;
        if (!name) return null;
        return plantCatalog.find(p => p.plant_name === name) || null;
      };
      // Choose the active reservoir (latest by start_date/created_at)
      let devicePlant = null;
      try {
        if (Array.isArray(reservoirs) && reservoirs.length > 0) {
          const active = [...reservoirs].sort((a, b) => {
            const da = new Date(a.start_date || a.created_at || 0).getTime();
            const db = new Date(b.start_date || b.created_at || 0).getTime();
            return db - da;
          })[0];
          devicePlant = findPlant(active);
          console.log('[Dashboard] Active reservoir for device', deviceId, ':', active);
          console.log('[Dashboard] Resolved plant:', devicePlant);
        }
      } catch (e) {
        console.warn('[Dashboard] Failed to resolve active reservoir/plant for device', deviceId, e);
      }

      // Fallback: if we couldn't resolve via reservoirs, try mapping the device's plant_name
      if (!devicePlant) {
        try {
          const deviceMeta = devices.find(d => d.id === deviceId);
          const devicePlantName = deviceMeta?.plant_name || deviceMeta?.plant?.plant_name;
          if (devicePlantName && Array.isArray(plantCatalog)) {
            const mapped = plantCatalog.find(p => p.plant_name === devicePlantName);
            if (mapped) devicePlant = mapped;
          }
        } catch (_e) {
          // ignore fallback errors
        }
      }
      const sensorDataMap = {};
      if (Array.isArray(sensors) && sensors.length > 0) {
        const sensorDataPromises = sensors.map(async (sensor) => {
          try {
            // Fetch comprehensive data based on time range
            let limit = 50; // default
            if (sensor.sensor_type === 'ph') {
              // Fetch more data for pH sensors based on time range
              switch (timeRange) {
                case 'weeks': limit = 200; break; // 20 weeks * ~10 readings per week
                case 'months': limit = 300; break; // 12 months * ~25 readings per month
                default: limit = 150; break; // 30 days * ~5 readings per day
              }
            }
            const resp = await getSensorData(sensor.id, limit);
            const data = resp && resp.results ? resp.results : resp;
            console.log(`[Dashboard] Fetched ${sensor.sensor_type} sensor data:`, data?.length || 0, `records (limit: ${limit})`);
            return { sensorId: sensor.id, data: Array.isArray(data) ? data : (data ? [data] : []) };
          } catch (_e) {
            console.warn(`Failed to fetch data for sensor ${sensor.id}:`, _e);
            return { sensorId: sensor.id, data: [] };
          }
        });
        const sensorDataResults = await Promise.all(sensorDataPromises);
        sensorDataResults.forEach(({ sensorId, data }) => { sensorDataMap[sensorId] = data; });
      }
      const transformedSensors = transformSensorData(sensors || [], sensorDataMap);
      // Compute latest alert per device using plant-based classification (consider latest reading per sensor)
      const pickLatest = (arr) => {
        if (!Array.isArray(arr) || arr.length === 0) return null;
        return arr.reduce((best, cur) => {
          const tb = best?.created_at ? new Date(best.created_at).getTime() : (best?.timestamp ? new Date(best.timestamp).getTime() : 0);
          const tc = cur?.created_at ? new Date(cur.created_at).getTime() : (cur?.timestamp ? new Date(cur.timestamp).getTime() : 0);
          return tc > tb ? cur : best;
        }, arr[0]);
      };
      const buildLatestAlert = (sensorsList, dataMap, plant) => {
        if (!Array.isArray(sensorsList) || sensorsList.length === 0) return null;
        const relevant = sensorsList.filter(s => ['ph', 'water_level', 'tds', 'ec', 'turbidity', 'light', 'humidity', 'air_temperature', 'water_temperature'].includes(s.sensor_type));
        const candidates = [];
        relevant.forEach(sensor => {
          const latest = pickLatest(dataMap[sensor.id] || []);
          if (!latest || typeof latest.value === 'undefined') return;
          const val = Number(latest.value);
          if (Number.isNaN(val)) return;
          let cls = { severity: 'none', reason: null };
          if (sensor.sensor_type === 'ph') cls = classifyPH(val, plant);
          else if (sensor.sensor_type === 'tds') cls = classifyTDS(val, plant);
          else if (sensor.sensor_type === 'ec') cls = classifyEC(val, plant);
          else if (sensor.sensor_type === 'light') cls = classifyLight(val, plant);
          else if (sensor.sensor_type === 'air_temperature') cls = classifyEnvTemp(val, plant);
          else if (sensor.sensor_type === 'humidity') cls = classifyHumidity(val, plant);
          else if (sensor.sensor_type === 'water_temperature') cls = classifyWaterTemp(val, plant);
          else if (sensor.sensor_type === 'water_level') {
            if (val === 0) cls = { severity: 'critical', reason: 'empty' };
            else if (val <= 40) cls = { severity: 'warning', reason: 'low' };
          } else if (sensor.sensor_type === 'turbidity') {
            if (val <= 1800) cls = { severity: 'critical', reason: 'turbid' };
            else if (val <= 2100) cls = { severity: 'warning', reason: 'cloudy' };
          }
          if (cls.severity === 'none') return;
          const iso = latest.created_at || latest.timestamp || new Date().toISOString();
          const severity = cls.severity;
          let title = 'Alert';
          let message = '';
          if (sensor.sensor_type === 'ph') {
            if (cls.reason === 'below_min') { title = 'Low pH detected'; message = `pH is ${val}`; }
            else if (cls.reason === 'above_max') { title = 'High pH detected'; message = `pH is ${val}`; }
            else { title = 'pH nearing limit'; message = `pH is ${val}`; }
          } else if (sensor.sensor_type === 'tds') {
            if (cls.reason === 'below_min') { title = 'TDS low'; message = `TDS ${val} ppm`; }
            else if (cls.reason === 'above_max') { title = 'TDS high'; message = `TDS ${val} ppm`; }
            else { title = 'TDS near bound'; message = `TDS ${val} ppm`; }
          } else if (sensor.sensor_type === 'ec') {
            if (cls.reason === 'below_min') { title = 'EC low'; message = `EC ${val} mS/cm`; }
            else if (cls.reason === 'above_max') { title = 'EC high'; message = `EC ${val} mS/cm`; }
            else { title = 'EC near bound'; message = `EC ${val} mS/cm`; }
          } else if (sensor.sensor_type === 'air_temperature') {
            if (cls.reason === 'below_min') { title = 'Air temperature low'; message = `Air temp ${val}°C`; }
            else if (cls.reason === 'above_max') { title = 'Air temperature high'; message = `Air temp ${val}°C`; }
            else { title = 'Air temperature near bound'; message = `Air temp ${val}°C`; }
          } else if (sensor.sensor_type === 'humidity') {
            if (cls.reason === 'below_min') { title = 'Humidity low'; message = `Humidity ${val}%`; }
            else if (cls.reason === 'above_max') { title = 'Humidity high'; message = `Humidity ${val}%`; }
            else { title = 'Humidity near bound'; message = `Humidity ${val}%`; }
          } else if (sensor.sensor_type === 'light') {
            if (cls.reason === 'below_min') { title = 'Light low'; message = `Light ${val}`; }
            else if (cls.reason === 'above_max') { title = 'Light high'; message = `Light ${val}`; }
            else { title = 'Light near bound'; message = `Light ${val}`; }
          } else if (sensor.sensor_type === 'water_temperature') {
            if (cls.reason === 'below_min') { title = 'Water temp low'; message = `Water temp ${val}°C`; }
            else if (cls.reason === 'above_max') { title = 'Water temp high'; message = `Water temp ${val}°C`; }
            else { title = 'Water temp near bound'; message = `Water temp ${val}°C`; }
          } else if (sensor.sensor_type === 'water_level') {
            if (cls.reason === 'empty') { title = 'Water level empty'; message = 'Water level 0% — refill immediately.'; }
            else { title = 'Low water level'; message = `Water level ${val}% — refill soon.`; }
          } else if (sensor.sensor_type === 'turbidity') {
            if (cls.reason === 'turbid') { title = 'Water turbid'; message = `Turbidity ${val} — consider drain/refill.`; }
            else { title = 'Water cloudy'; message = `Turbidity ${val} — clean filters or partial change.`; }
          }
          candidates.push({ severity, title, message, createdAt: iso });
        });
        if (candidates.length === 0) return null;
        candidates.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        return candidates[0];
      };
      const phSensor = Array.isArray(sensors) ? sensors.find(s => s.sensor_type === 'ph') : null;
      console.log('[Dashboard] pH sensor found:', phSensor?.id, 'with data:', sensorDataMap[phSensor?.id]?.length || 0);
      const phHistory = getPHHistory(sensorDataMap, phSensor?.id, timeRange);
      const phLabels = getPHLabels(sensorDataMap, phSensor?.id, timeRange);
      console.log('[Dashboard] Generated pH history:', phHistory?.length || 0, 'points');

      // Persist pH data to localStorage
      if (phHistory && phHistory.length > 0) {
        persistPhData(deviceId, phHistory, phLabels, timeRange);
      }
      let lastSensorUpdate = null;
      Object.values(sensorDataMap).forEach(arr => {
        if (Array.isArray(arr)) {
          arr.forEach(d => {
            if (!d || !d.created_at) return;
            try {
              const t = new Date(d.created_at);
              if (!lastSensorUpdate || t > lastSensorUpdate) lastSensorUpdate = t;
            } catch (_e) { }
          });
        }
      });
      const { connectivity, lastSync } = getConnectivityStatus(lastSensorUpdate);
      const deviceMeta = devices.find(d => d.id === deviceId);
      // Prefer resolved devicePlant (from reservoirs + catalog), fall back to any plant bundled on device meta
      const plant = devicePlant || deviceMeta?.plant || null;
      const alertText = Object.keys(transformedSensors).length ? generateAlertText(transformedSensors, plant) : undefined;
      const nutrientText = typeof transformedSensors.tds === 'number' ? getNutrientStatus(transformedSensors.tds, plant) : undefined;

      const latestDerivedAlert = buildLatestAlert(sensors || [], sensorDataMap, plant);

      const dataPayload = {
        alertText,
        connectivity,
        lastSyncLabel: lastSync,
        lastUpdate: lastSensorUpdate ? lastSensorUpdate.toISOString() : undefined,
        nutrientText,
        latestDerivedAlert,
        phHistory,
        phLabels,
        sensors: {
          // Include pH on targeted refresh as well
          ...(typeof transformedSensors.ph === 'number' ? { ph: transformedSensors.ph } : {}),
          ...(typeof transformedSensors.ec === 'number' ? { ec: transformedSensors.ec } : {}),
          ...(typeof transformedSensors.tds === 'number' ? { tds: transformedSensors.tds } : {}),
          ...(typeof transformedSensors.waterLevel === 'number' ? { waterLevel: transformedSensors.waterLevel } : {}),
          ...(typeof transformedSensors.turbidity === 'number' ? { turbidity: transformedSensors.turbidity } : {}),
        },
        environment: {
          ...(typeof transformedSensors.temperature === 'number' ? { temperature: transformedSensors.temperature } : {}),
          ...(typeof transformedSensors.humidity === 'number' ? { humidity: transformedSensors.humidity } : {}),
          ...(typeof transformedSensors.light === 'number' ? { light: transformedSensors.light } : {}),
        },
        sensors_raw: sensors || [],
        reservoirs: reservoirs || [],
        plant: plant || null,
      };

      updateDeviceData(deviceId, dataPayload);
    } catch (_e) {
      // leave existing data untouched on failure
    }
  };

  // Handle device card click
  const handleDeviceInfoClick = (e, device) => {
    e.stopPropagation();
    if (!device || !device.id) return;

    // Save the current device selection before navigating away
    const idx = ownedDevices.findIndex(d => d.id === device.id);
    if (idx >= 0) {
      try {
        localStorage.setItem('dashboard.activeDeviceIndex', idx.toString());
        localStorage.setItem('dashboard.activeDeviceId', device.id.toString());
        console.log(`[Dashboard] Saved device selection before navigating to device details: ${device.device_name || device.id}`);
      } catch (e) {
        console.warn('Failed to save device selection:', e);
      }
    }

    navigate(`/device/${device.id}`);
  };

  const handleDeviceMediaClick = async (e, device) => {
    e.stopPropagation();
    if (!device || !device.id) return;
    // Focus this device in dashboard and refresh its data
    const idx = ownedDevices.findIndex(d => d.id === device.id);
    if (idx >= 0) setActiveIdx(idx);
    try {
      setDeviceLoading(prev => ({ ...prev, [device.id]: true }));
      await fetchDeviceDataById(device.id);
    } finally {
      setDeviceLoading(prev => ({ ...prev, [device.id]: false }));
    }
    // Optionally: scroll to metrics area (dash-main)
    const main = document.querySelector('.dash-main');
    if (main && typeof main.scrollIntoView === 'function') {
      main.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Handle FAB click (if not dragged)
  const handleFabClick = () => {
    if (!hasDraggedRef.current) {
      navigate('/add-device/setup');
    }
  };

  // FAB Mouse Drag Handlers
  const handleFabMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    hasDraggedRef.current = false;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      fabX: fabPosition.x,
      fabY: fabPosition.y
    };
  };

  const handleFabMouseMove = (e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    // Consider it a drag if moved more than 5px
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      hasDraggedRef.current = true;
    }
    const newX = Math.max(16, Math.min(window.innerWidth - fabSize - 16, dragStartRef.current.fabX + dx));
    const newY = Math.max(16, Math.min(window.innerHeight - navHeight - fabSize - 16, dragStartRef.current.fabY + dy));
    setFabPosition({ x: newX, y: newY });
  };

  const handleFabMouseUp = () => {
    setIsDragging(false);
    // Trigger click action if not dragged
    if (!hasDraggedRef.current) {
      handleFabClick();
    }
  };

  // FAB Touch Drag Handlers
  const handleFabTouchStart = (e) => {
    const touch = e.touches[0];
    setIsDragging(true);
    hasDraggedRef.current = false;
    dragStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      fabX: fabPosition.x,
      fabY: fabPosition.y
    };
  };

  const handleFabTouchMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const touch = e.touches[0];
    const dx = touch.clientX - dragStartRef.current.x;
    const dy = touch.clientY - dragStartRef.current.y;
    // Consider it a drag if moved more than 5px
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      hasDraggedRef.current = true;
    }
    const newX = Math.max(16, Math.min(window.innerWidth - fabSize - 16, dragStartRef.current.fabX + dx));
    const newY = Math.max(16, Math.min(window.innerHeight - navHeight - fabSize - 16, dragStartRef.current.fabY + dy));
    setFabPosition({ x: newX, y: newY });
  };

  const handleFabTouchEnd = () => {
    setIsDragging(false);
    // Trigger click action if not dragged
    if (!hasDraggedRef.current) {
      handleFabClick();
    }
  };

  // Attach/detach global mouse/touch listeners for FAB dragging
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleFabMouseMove);
      window.addEventListener('mouseup', handleFabMouseUp);
      window.addEventListener('touchmove', handleFabTouchMove, { passive: false });
      window.addEventListener('touchend', handleFabTouchEnd);
    } else {
      window.removeEventListener('mousemove', handleFabMouseMove);
      window.removeEventListener('mouseup', handleFabMouseUp);
      window.removeEventListener('touchmove', handleFabTouchMove);
      window.removeEventListener('touchend', handleFabTouchEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleFabMouseMove);
      window.removeEventListener('mouseup', handleFabMouseUp);
      window.removeEventListener('touchmove', handleFabTouchMove);
      window.removeEventListener('touchend', handleFabTouchEnd);
    };
  }, [isDragging, fabPosition]);

  // Infinite scroll disabled to prevent duplicate device appearance
  const isInfinite = false;
  const infiniteDevices = useMemo(() => {
    if (ownedDevices.length === 0) return [];
    if (!isInfinite) return ownedDevices; // For normal carousel, render as-is
    // For infinite scroll, add last at start and first at end for seamless loop
    return [
      { ...ownedDevices[ownedDevices.length - 1], _cloneType: 'last' },
      ...ownedDevices.map(d => ({ ...d, _cloneType: 'original' })),
      { ...ownedDevices[0], _cloneType: 'first' }
    ];
  }, [ownedDevices, isInfinite]);  // Initialize scroll position; scroll to restored device or first device
  useEffect(() => {
    const el = carouselRef.current;
    if (!el || ownedDevices.length === 0) return;
    const w = el.clientWidth;
    const cardW = w * 0.85;
    const gap = 16;

    if (isInfinite) {
      // Scroll to restored device + 1 (account for clone at start)
      el.scrollLeft = (cardW + gap) * (activeIdx + 1);
    } else {
      // Non-infinite: scroll directly to restored device index
      el.scrollLeft = (cardW + gap) * activeIdx;
      console.log(`Scrolled carousel to device index ${activeIdx}`);
    }
  }, [ownedDevices, activeIdx, isInfinite]);

  // Handle scroll position tracking and loop boundaries
  useEffect(() => {
    const el = carouselRef.current;
    if (!el || ownedDevices.length === 0) return;

    const onScroll = () => {
      if (isAdjustingRef.current) return;

      const w = el.clientWidth;
      const cardW = w * 0.85;
      const gap = 16;
      const scrollPos = el.scrollLeft;
      const idx = Math.round(scrollPos / (cardW + gap));

      // Clear any pending timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      if (!isInfinite) {
        // Non-infinite: directly map scroll index to device index (0..len-1)
        const clamped = Math.max(0, Math.min(ownedDevices.length - 1, idx));
        console.log(`Non-infinite carousel: scroll idx=${idx}, clamped=${clamped}, devices.length=${ownedDevices.length}`);
        setActiveIdx(clamped);
        return;
      }

      // Infinite: map clone indexes to real device index
      if (idx === 0) {
        setActiveIdx(ownedDevices.length - 1); // Showing clone of last device
      } else if (idx === infiniteDevices.length - 1) {
        setActiveIdx(0); // Showing clone of first device
      } else {
        setActiveIdx(idx - 1); // Real device index
      }

      // After scroll settles, check if we need to loop
      scrollTimeoutRef.current = setTimeout(() => {
        if (idx === 0) {
          // At clone of last device - jump to real last device
          isAdjustingRef.current = true;
          el.scrollLeft = (cardW + gap) * ownedDevices.length;
          setTimeout(() => { isAdjustingRef.current = false; }, 50);
        } else if (idx === infiniteDevices.length - 1) {
          // At clone of first device - jump to real first device
          isAdjustingRef.current = true;
          el.scrollLeft = (cardW + gap) * 1;
          setTimeout(() => { isAdjustingRef.current = false; }, 50);
        }
      }, 150); // Wait for scroll to settle
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [infiniteDevices.length, ownedDevices.length, isInfinite]);


  // Merge store data with local pH history
  const mergedData = useMemo(() => {
    if (!data) return null;
    const localPh = localPhData[currentDevice?.id];
    return {
      ...data,
      phHistory: localPh?.phHistory || data.phHistory || [],
      phLabels: localPh?.phLabels || data.phLabels || [],
    };
  }, [data, localPhData, currentDevice]);

  const phTotal = mergedData && Array.isArray(mergedData.phHistory) ? mergedData.phHistory.length : 0;
  const maxStart = Math.max(0, phTotal - PH_WINDOW_SIZE);
  const currentStart = useMemo(() => {
    if (!currentDevice) return 0;
    const saved = phWindows[currentDevice.id];
    // Default to last window; clamp if total changed
    const base = typeof saved === 'number' ? saved : maxStart;
    return Math.min(Math.max(0, base), maxStart);
  }, [currentDevice, phWindows, maxStart]);
  const phHistoryDisplay = useMemo(() => {
    if (!mergedData || !Array.isArray(mergedData.phHistory)) {
      console.log('[Dashboard] No pH history data available:', mergedData);
      return [];
    }
    // Show 10-day window from the 30-day dataset based on currentStart
    const start = Math.max(0, currentStart);
    const end = Math.min(mergedData.phHistory.length, start + PH_WINDOW_SIZE);
    const result = mergedData.phHistory.slice(start, end);
    console.log('[Dashboard] pH history display:', result);
    return result;
  }, [mergedData, currentStart]);
  const phLabelsDisplay = useMemo(() => {
    if (!mergedData || !Array.isArray(mergedData.phLabels)) return [];
    // Show corresponding labels for the windowed data
    const start = Math.max(0, currentStart);
    const end = Math.min(mergedData.phLabels.length, start + PH_WINDOW_SIZE);
    return mergedData.phLabels.slice(start, end);
  }, [mergedData, currentStart]);

  // Dynamic scale for pH bars based on displayed data (excluding null values)
  const phNumbers = useMemo(() =>
    phHistoryDisplay
      .filter(n => n !== null && n !== undefined)
      .map(n => Number(n))
      .filter(Number.isFinite),
    [phHistoryDisplay]
  );
  const phScale = useMemo(() => {
    if (!phNumbers.length) return { min: 6.0, max: 6.6 };
    let min = Math.min(...phNumbers);
    let max = Math.max(...phNumbers);
    if (max - min < 0.05) { // ensure some range
      min = min - 0.1;
      max = max + 0.1;
    }
    // Round to nearest 0.1
    min = Math.floor(min * 10) / 10;
    max = Math.ceil(max * 10) / 10;
    return { min, max };
  }, [phNumbers]);
  const phYTicks = useMemo(() => {
    const N = 7;
    const range = phScale.max - phScale.min || 0.6;
    const step = range / (N - 1);
    return Array.from({ length: N }, (_, i) => (phScale.max - i * step)).map(v => `${v.toFixed(1)} pH`);
  }, [phScale]);

  // Realtime pH -> update the latest bucket of the pH chart so new readings appear without manual refresh
  const prevPhRef = useRef(undefined);
  const prevPhTsRef = useRef(undefined);
  useEffect(() => {
    if (!currentDevice) return;
    const ph = data?.sensors?.ph;
    if (!Number.isFinite(Number(ph))) return;
    const ts = data?.lastUpdate;
    const changed = prevPhRef.current !== ph || prevPhTsRef.current !== ts;
    if (!changed) return;

    const existing = Array.isArray(mergedData?.phHistory) ? mergedData.phHistory : [];
    if (existing.length === 0) {
      // Seed history if empty
      fetchDeviceDataById(currentDevice.id);
    } else {
      const updated = existing.slice();
      // Update current period (last bucket) with the latest pH value
      updated[updated.length - 1] = Number(ph);
      const labels = Array.isArray(mergedData?.phLabels) ? mergedData.phLabels : [];
      // Persist locally and update store to keep views in sync
      persistPhData(currentDevice.id, updated, labels, timeRange);
      updateDeviceData(currentDevice.id, { phHistory: updated, phLabels: labels });
    }

    prevPhRef.current = ph;
    prevPhTsRef.current = ts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDevice?.id, data?.sensors?.ph, data?.lastUpdate, timeRange, mergedData?.phHistory?.length]);

  // Update default window when device changes or total increases and nothing saved
  useEffect(() => {
    if (!currentDevice) return;

    // Check if we have persisted pH data for this device
    const savedData = localPhData[currentDevice.id];
    if (savedData && savedData.timeRange === timeRange) {
      console.log(`[Dashboard] Using persisted pH data for device ${currentDevice.id}:`, savedData.phHistory?.length || 0, 'points');
    } else {
      // Fetch fresh pH data if we don't have it or time range changed
      console.log(`[Dashboard] Fetching fresh pH data for device ${currentDevice.id} (timeRange: ${timeRange})`);
      fetchDeviceDataById(currentDevice.id);
    }

    if (phTotal === 0) return;
    setPhWindows(prev => {
      if (typeof prev[currentDevice.id] === 'number') return prev; // keep user's position
      return { ...prev, [currentDevice.id]: maxStart };
    });
  }, [currentDevice, phTotal, maxStart, timeRange]);

  const canPrev = phTotal > PH_WINDOW_SIZE && currentStart > 0;
  const canNext = phTotal > PH_WINDOW_SIZE && currentStart < maxStart;
  const onPrev = () => {
    if (!currentDevice || !canPrev) return;
    setPhWindows(prev => ({ ...prev, [currentDevice.id]: Math.max(0, (prev[currentDevice.id] ?? maxStart) - 1) }));
  };
  const onNext = () => {
    if (!currentDevice || !canNext) return;
    setPhWindows(prev => ({ ...prev, [currentDevice.id]: Math.min(maxStart, (prev[currentDevice.id] ?? maxStart) + 1) }));
  };
  // Robust label for pH legend: prefer device_name, then plant_name, then fallback
  const legendLabel = useMemo(() => {
    if (!currentDevice) return 'Device';
    const name = (currentDevice.device_name || '').trim();
    const plant = (currentDevice.plant_name || '').trim();
    // For shared devices, don't show serial number
    const fallback = (currentDevice.is_collaborator && !currentDevice.is_owner) ?
      'Shared Device' :
      currentDevice.device_serial;
    return name || plant || fallback || 'Device';
  }, [currentDevice]);
  const currentPH = useMemo(() => {
    // Prefer real-time latest sensor value from store if present
    if (typeof data?.sensors?.ph === 'number') return data.sensors.ph.toFixed(1);
    if (Array.isArray(mergedData?.phHistory)) {
      const lastValue = [...mergedData.phHistory].reverse().find(v => v !== null && v !== undefined);
      if (Number.isFinite(Number(lastValue))) return Number(lastValue).toFixed(1);
    }
    return '--';
  }, [activeIdx, data, mergedData]);

  // Save activeIdx and device ID to localStorage whenever it changes
  useEffect(() => {
    if (ownedDevices && ownedDevices.length > 0 && ownedDevices[activeIdx]) {
      try {
        const deviceId = ownedDevices[activeIdx].id.toString();
        const deviceName = ownedDevices[activeIdx].device_name || ownedDevices[activeIdx].plant_name || `Device ${deviceId}`;
        localStorage.setItem('dashboard.activeDeviceIndex', activeIdx.toString());
        localStorage.setItem('dashboard.activeDeviceId', deviceId);
        console.log(`💾 Saved device selection: "${deviceName}" (Index: ${activeIdx}, ID: ${deviceId})`);
      } catch (e) {
        console.warn('Failed to save active device index:', e);
      }
    }
  }, [activeIdx, ownedDevices]);

  // When devices list changes (e.g., after fetch), restore saved device or validate current index
  // Only run after store hydration to ensure deviceData is available
  // Track if we've already restored to prevent multiple restoration attempts
  const hasRestoredRef = useRef(false);

  useEffect(() => {
    if (!isHydrated || !ownedDevices || ownedDevices.length === 0 || hasRestoredRef.current) return;

    console.log('🔄 Starting device restoration...');
    hasRestoredRef.current = true;

    try {
      const savedIdx = parseInt(localStorage.getItem('dashboard.activeDeviceIndex') || '0', 10);
      const savedDeviceId = localStorage.getItem('dashboard.activeDeviceId');

      let restoredIdx = -1;

      // First, try to find the device by ID (more reliable across refreshes)
      if (savedDeviceId) {
        const deviceIdxById = ownedDevices.findIndex(d => d.id.toString() === savedDeviceId);
        if (deviceIdxById >= 0) {
          console.log(`✅ Restored device by ID: ${savedDeviceId} at index ${deviceIdxById}`);
          restoredIdx = deviceIdxById;
        }
      }

      // Fallback to saved index if valid for current device list
      if (restoredIdx < 0 && savedIdx >= 0 && savedIdx < ownedDevices.length) {
        console.log(`✅ Restored device by index: ${savedIdx}`);
        restoredIdx = savedIdx;
      }

      // If neither works, reset to first device
      if (restoredIdx < 0) {
        console.log('⚠️ No valid saved device found, defaulting to first device');
        restoredIdx = 0;
        localStorage.setItem('dashboard.activeDeviceIndex', '0');
        if (ownedDevices[0]) {
          localStorage.setItem('dashboard.activeDeviceId', ownedDevices[0].id.toString());
        }
      }

      // Set the active index
      setActiveIdx(restoredIdx);

      // Immediately fetch data for the restored device to ensure it's displayed and plant-aware
      const restoredDevice = ownedDevices[restoredIdx];
      if (restoredDevice?.id) {
        // Check if we already have data in the store
        const existingData = devicesData[restoredDevice.id];

        console.log(`🔍 Checking existing data for device ${restoredDevice.id}:`, {
          hasData: !!existingData,
          hasSensors: !!existingData?.sensors,
          sensorsKeys: existingData?.sensors ? Object.keys(existingData.sensors) : [],
          sensorValues: existingData?.sensors
        });

        // Determine if we must augment: plant missing or pH history missing
        const hasValidSensorData = existingData?.sensors &&
          Object.values(existingData.sensors).some(v => v !== undefined && v !== null);
        const needsPlantOrPh = !existingData?.plant || !Array.isArray(existingData?.phHistory) || existingData.phHistory.length === 0;

        if (!existingData || !hasValidSensorData || needsPlantOrPh) {
          console.log(`🔄 Fetching enriched data for: ${restoredDevice.device_name || restoredDevice.id}`, {
            hasValidSensorData,
            hasPlant: !!existingData?.plant,
            phPoints: existingData?.phHistory?.length || 0
          });
          // Use setTimeout to ensure this happens after the render
          setTimeout(() => fetchDeviceDataById(restoredDevice.id), 50);
        } else {
          console.log(`✅ Using existing enriched data for: ${restoredDevice.device_name || restoredDevice.id}`);
          // Mark as fetched
          lastFetchedDeviceRef.current = restoredDevice.id;
        }
      }
    } catch (e) {
      console.warn('Failed to restore active device index:', e);
      setActiveIdx(0);
    }
  }, [ownedDevices.length, isHydrated]);  // Show loading state while hydrating or loading initial data
  if (!isHydrated || loadingInitial) {
    return (
      <div className="dashboard-root">
        <header className="dash-header" role="banner">
          <h1 className="dash-header-title">
            Hello, {displayName} <span className="dash-header-emoji">🌿</span>
          </h1>
        </header>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '60vh',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          <Loader size={48} color={PRIMARY_GREEN} className="animate-spin" />
          <p style={{ color: '#666', fontSize: '1rem' }}>Loading your devices...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (errorInitial) {
    return (
      <div className="dashboard-root">
        <header className="dash-header" role="banner">
          <h1 className="dash-header-title">
            Hello, {displayName} <span className="dash-header-emoji">🌿</span>
          </h1>
        </header>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '60vh',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          <AlertCircle size={48} color="#e74c3c" />
          <p style={{ color: '#e74c3c', fontSize: '1rem' }}>{errorInitial}</p>
          <button
            onClick={fetchInitial}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: PRIMARY_GREEN,
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer'
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Show no devices state
  if (ownedDevices.length === 0) {
    return (
      <div className="dashboard-root">
        <header className="dash-header" role="banner">
          <h1 className="dash-header-title">
            Hello, {displayName} <span className="dash-header-emoji">🌿</span>
          </h1>
        </header>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '60vh',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          <Leaf size={48} color={PRIMARY_GREEN} />
          <p style={{ color: '#666', fontSize: '1rem' }}>No devices found</p>
          <p style={{ color: '#999', fontSize: '0.9rem' }}>Bind your first device to get started!</p>
          <button
            onClick={() => navigate('/add-device/setup')}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: PRIMARY_GREEN,
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontSize: '1rem'
            }}
          >
            Add Device
          </button>
        </div>
        {/* Bottom navigation */}
        <nav className="bottom-nav" aria-label="Primary">
          <button className="nav-item active" aria-current="page">
            <Leaf size={20} />
            <span>Tanom</span>
          </button>
          <button className="nav-item" onClick={() => navigate('/alerts')} style={{ position: 'relative' }}>
            <AlertCircle size={20} />
            {totalUnread > 0 && (
              <span className="nav-notification-badge" style={{
                position: 'absolute',
                top: '8px',
                right: '18px',
                backgroundColor: '#e74c3c',
                color: 'white',
                borderRadius: '50%',
                width: '16px',
                height: '16px',
                fontSize: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                border: '2px solid white',
                minWidth: '16px',
              }}>
                {totalUnread > 9 ? '9+' : totalUnread}
              </span>
            )}
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

  return (
    <div className="dashboard-root">
      {/* Header */}
      <header className="dash-header" role="banner">
        <h1 className="dash-header-title">
          Hello, {displayName} <span className="dash-header-emoji">🌿</span>
        </h1>
        <button className="dash-header-settings" aria-label="Sync" onClick={fetchInitial}>
          <RefreshCw size={24} color={PRIMARY_GREEN} />
        </button>
      </header>

      {/* Device carousel */}
      <section className="device-carousel-wrapper" aria-label="Your devices">
        <div className="device-carousel" ref={carouselRef}>
          {infiniteDevices.map((d, i) => (
            <article
              className="device-card tap"
              key={`${d.id}-${d._cloneType || 'original'}-${i}`}
              aria-label={`${d.device_name} ${(d.is_collaborator && !d.is_owner) ? 'Shared Device' : d.device_serial}`}
            >
              <div
                className="device-card-media"
                role="button"
                tabIndex={0}
                onClick={(e) => handleDeviceMediaClick(e, d)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleDeviceMediaClick(e, d); }}
                aria-label="Open sensor data dashboard for this device"
                aria-busy={deviceLoading[d.id] ? 'true' : 'false'}
                style={{ position: 'relative' }}
              >
                <img
                  src={d.plant_photo_url || '/favicon.png'}
                  alt={d.plant_name ? `${d.plant_name} in ${d.device_name}` : "Device"}
                />
                {deviceLoading[d.id] && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'rgba(0,0,0,0.35)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: 12,
                      fontWeight: 600,
                      letterSpacing: 0.2
                    }}
                    aria-live="polite"
                  >
                    <Loader size={18} style={{ marginBottom: 6 }} />
                    Refreshing...
                  </div>
                )}
              </div>
              <div
                className="device-card-info"
                role="button"
                tabIndex={0}
                onClick={(e) => handleDeviceInfoClick(e, d)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleDeviceInfoClick(e, d); }}
                aria-label="Open device details"
              >
                <div>
                  <h3 className="device-name">{d.device_name}</h3>
                  <p className="device-id">
                    {d.plant_name ? `Growing: ${d.plant_name}` :
                      (d.is_collaborator && !d.is_owner) ? 'Shared Device' :
                        `Serial: ${d.device_serial}`}
                  </p>
                  {d.location ? (
                    <p className="device-location">{d.location}</p>
                  ) : null}
                  {/* Status Badges */}
                  <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                    {/* Online/Offline Badge */}
                    {d.is_online ? (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '3px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: '600',
                        backgroundColor: '#e8f5e9',
                        color: '#2e7d32',
                        border: '1px solid #4caf50'
                      }}>
                        <span style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          backgroundColor: '#4caf50',
                          display: 'inline-block'
                        }}></span>
                        Online
                      </span>
                    ) : (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '3px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: '600',
                        backgroundColor: '#ffebee',
                        color: '#c62828',
                        border: '1px solid #f44336'
                      }}>
                        <span style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          backgroundColor: '#f44336',
                          display: 'inline-block'
                        }}></span>
                        Offline
                      </span>
                    )}

                    {/* WiFi Configured Badge */}
                    {d.wifi_configured ? (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '3px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: '600',
                        backgroundColor: '#e3f2fd',
                        color: '#1976d2',
                        border: '1px solid #2196F3'
                      }}>
                        📶 WiFi OK
                      </span>
                    ) : (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '3px 8px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: '600',
                          backgroundColor: '#fff3e0',
                          color: '#e65100',
                          border: '1px solid #ff9800',
                          cursor: 'pointer'
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setWifiSetupDevice(d);
                        }}
                        title="Click for WiFi setup instructions"
                      >
                        ⚠️ Setup WiFi
                      </span>
                    )}
                  </div>
                </div>
                <div className="device-card-arrow">
                  <ChevronRight size={18} />
                </div>
              </div>
            </article>
          ))}
        </div>
        {ownedDevices.length > 1 && (
          <div className="carousel-dots" role="tablist" aria-label="Device position">
            {ownedDevices.map((_, i) => (
              <span key={i} className={`carousel-dot ${i === activeIdx ? 'active' : ''}`} role="tab" aria-selected={i === activeIdx} />
            ))}
          </div>
        )}
      </section>      <main className="dash-main" role="main">
        {/* Alert Summary */}
        <section className="card alert-card" aria-label="Alert summary" onClick={() => navigate(`/alerts${currentDevice ? `?deviceId=${currentDevice.id}` : ''}`)} style={{ cursor: 'pointer' }}>
          <div className="alert-card-top">
            <div className="icon-circle" style={{ position: 'relative' }}>
              <AlertCircle size={20} color={
                data?.latestDerivedAlert ?
                  (data.latestDerivedAlert.severity === 'critical' ? '#e74c3c' : data.latestDerivedAlert.severity === 'warning' ? '#f59e0b' : '#339432') :
                  latestAlerts[currentDevice?.id] ?
                    (latestAlerts[currentDevice.id].severity === 'critical' ? '#e74c3c' : latestAlerts[currentDevice.id].severity === 'warning' ? '#f59e0b' : '#339432') :
                    (data?.alertText && data.alertText !== 'All systems normal' ? '#339432' : PRIMARY_GREEN)
              } strokeWidth={2.5} />
              {(perDeviceUnreadCounts[currentDevice?.id] || 0) > 0 && (
                <span className="alert-notification-badge" style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  backgroundColor: data?.alertText && data.alertText !== 'All systems normal' ?
                    (latestAlerts[currentDevice?.id]?.severity === 'critical' ? '#e74c3c' :
                      latestAlerts[currentDevice?.id]?.severity === 'warning' ? '#f59e0b' :
                        '#339432') : '#e74c3c',
                  color: 'white',
                  borderRadius: '50%',
                  width: '16px',
                  height: '16px',
                  fontSize: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  border: '2px solid white',
                  minWidth: '16px',
                }}>
                  {(() => { const c = perDeviceUnreadCounts[currentDevice?.id] || 0; return c > 9 ? '9+' : c; })()}
                </span>
              )}
            </div>
            <button className="alert-card-expand" aria-label="Open alerts" onClick={(e) => { e.stopPropagation(); navigate(`/alerts${currentDevice ? `?deviceId=${currentDevice.id}` : ''}`); }}>
              <ChevronRight size={20} color="#8BA797" />
            </button>
          </div>
          <h3 className="alert-card-title">
            {currentDevice ? `${currentDevice.device_name || currentDevice.plant_name || 'Device'} Alerts` : 'Alert Summary'}
            {(perDeviceUnreadCounts[currentDevice?.id] || 0) > 0 && (
              <span style={{
                color: data?.alertText && data.alertText !== 'All systems normal' ?
                  (latestAlerts[currentDevice?.id]?.severity === 'critical' ? '#e74c3c' :
                    latestAlerts[currentDevice?.id]?.severity === 'warning' ? '#f59e0b' :
                      '#339432') : '#e74c3c',
                fontWeight: 'bold',
                marginLeft: '8px'
              }}>
                ({perDeviceUnreadCounts[currentDevice?.id]} new)
              </span>
            )}
          </h3>
          <div className="alert-card-message" style={{
            color: (() => {
              if (data?.latestDerivedAlert) {
                return data.latestDerivedAlert.severity === 'critical' ? '#e74c3c' : data.latestDerivedAlert.severity === 'warning' ? '#f59e0b' : '#339432';
              }
              if (latestAlerts[currentDevice?.id]) {
                const severity = latestAlerts[currentDevice.id].severity;
                return severity === 'critical' ? '#e74c3c' : severity === 'warning' ? '#f59e0b' : '#339432';
              }
              if (data?.alertText && data.alertText !== 'All systems normal') {
                const text = data.alertText.toLowerCase();
                if (text.includes('critical') || text.includes('empty') || text.includes('0%')) return '#e74c3c';
                if (text.includes('warning') || text.includes('low') || text.includes('high') || text.includes('approaching')) return '#f59e0b';
                return '#339432';
              }
              return 'rgba(17, 17, 17, 0.86)';
            })()
          }}>
            {/* Prefer derived latest alert; fallback to realtime latest, then generated summary */}
            {data?.latestDerivedAlert
              ? `${data.latestDerivedAlert.title}: ${data.latestDerivedAlert.message}`
              : latestAlerts[currentDevice?.id]
                ? `${latestAlerts[currentDevice.id].title}: ${latestAlerts[currentDevice.id].body}`
                : (data?.alertText || 'All systems normal')}
          </div>
          {currentDevice && (
            <p style={{
              fontSize: '11px',
              color: '#8BA797',
              margin: '8px 0 0 0',
              fontStyle: 'italic'
            }}>
              Click to view alerts for this device only
            </p>
          )}
        </section>


        {/* Connectivity & Sync */}
        <section className="status-grid" aria-label="Status">
          <div className="status-box">
            <div className="icon-circle">
              <Wifi size={20} color={PRIMARY_GREEN} strokeWidth={2.5} />
            </div>
            <div className="status-box-content">
              <span className="status-label">Connectivity</span>
              {(() => {
                const status = data?.lastUpdate ? getConnectivityStatus(data.lastUpdate) : { connectivity: data?.connectivity, lastSync: data?.lastSyncLabel };
                const conn = status?.connectivity || 'Offline';
                return (
                  <span className={`status-value ${conn === 'Online' ? 'status-online' : 'status-offline'}`}>
                    {data ? conn : 'Loading...'}
                  </span>
                );
              })()}
            </div>
          </div>
          <div className="status-box">
            <div className="icon-circle">
              <RefreshCw size={20} color={PRIMARY_GREEN} strokeWidth={2.5} />
            </div>
            <div className="status-box-content">
              <span className="status-label">Last Data Sync</span>
              {(() => {
                const status = data?.lastUpdate ? getConnectivityStatus(data.lastUpdate) : { connectivity: data?.connectivity, lastSync: data?.lastSyncLabel };
                const label = status?.lastSync || 'Never';
                return (
                  <span className="status-value">{data ? label : 'Loading...'}</span>
                );
              })()}
            </div>
          </div>
        </section>

        {/* Nutrient level */}
        <section className="card nutrient-card" aria-label="Nutrient level">
          <h3 className="nutrient-title">Nutrient Level</h3>
          <div className="nutrient-status">
            <div className="icon-circle">
              <Leaf size={20} color={PRIMARY_GREEN} strokeWidth={2.5} />
            </div>
            <span className="nutrient-text">
              {(() => {
                // Determine nutrient status using available sensor: prefer TDS (ppm); fallback to EC (mS/cm)
                let plant = data?.plant || currentDevice?.plant;
                if (!plant) {
                  try {
                    const name = currentDevice?.plant_name;
                    const catalog = plantCatalogRef.current || [];
                    if (name && Array.isArray(catalog)) {
                      plant = catalog.find(p => p.plant_name === name) || null;
                    }
                  } catch (_e) { /* ignore */ }
                }

                const tdsValue = typeof data?.sensors?.tds === 'number' ? Number(data.sensors.tds) : null;
                const ecValue = typeof data?.sensors?.ec === 'number' ? Number(data.sensors.ec) : null;

                // Show "No sensor data" if no plant configured
                if (!plant) {
                  if (tdsValue === null && ecValue === null) return 'No sensor data';
                  return 'No plant configured';
                }

                // If we have TDS value and plant has TDS ranges
                if (Number.isFinite(tdsValue) && plant.ppm_min != null && plant.ppm_max != null) {
                  const cls = classifyTDS(tdsValue, plant);
                  if (cls.severity === 'critical') return tdsValue < plant.ppm_min ? 'Low (Add nutrients)' : 'High (Dilute solution)';
                  if (cls.severity === 'warning') return tdsValue < plant.ppm_min ? 'Low (near min)' : 'High (near max)';
                  return 'Optimal';
                }

                // If we have EC value and plant has EC ranges
                if (Number.isFinite(ecValue) && plant.ec_min != null && plant.ec_max != null) {
                  const cls = classifyEC(ecValue, plant);
                  if (cls.severity === 'critical') return ecValue < plant.ec_min ? 'Low (Add nutrients)' : 'High (Dilute solution)';
                  if (cls.severity === 'warning') return ecValue < plant.ec_min ? 'Low (near min)' : 'High (near max)';
                  return 'Optimal';
                }

                // If we have sensor readings but no plant ranges
                if (tdsValue !== null || ecValue !== null) {
                  return 'Plant ranges not configured';
                }

                // No sensor readings available
                return 'No sensor data';
              })()}
            </span>
          </div>
        </section>

        {/* pH levels over time */}
        <section className="card ph-card" aria-label="pH levels over time">
          <div className="ph-card-header">
            <div className="icon-circle">
              <Activity size={20} color={PRIMARY_GREEN} strokeWidth={2.5} />
            </div>
            <span className="ph-card-title">pH Levels over time</span>
            <select
              className="range-switch"
              aria-label="Select time range"
              value={timeRange}
              onChange={(e) => handleTimeRangeChange(e.target.value)}
              style={{
                fontSize: '12px',
                background: 'rgba(139,167,151,0.1)',
                border: 'none',
                padding: '6px 14px',
                borderRadius: '8px',
                color: 'var(--color-secondary)',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              <option value="days">Days</option>
              <option value="weeks">Weeks</option>
              <option value="months">Months</option>
            </select>
          </div>
          <div className="ph-legend" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="ph-legend-dot"></span>
            <span className="ph-legend-label">{legendLabel}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
              {/* Debug info - remove in production */}
              <span style={{ fontSize: '10px', color: '#999', marginRight: '8px' }}>
                {phTotal > 0 && `${currentStart + 1}-${Math.min(currentStart + PH_WINDOW_SIZE, phTotal)} of ${phTotal}`}
              </span>
              <button
                className="ph-nav-btn"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('Previous button clicked, canPrev:', canPrev, 'currentStart:', currentStart, 'phTotal:', phTotal);
                  onPrev();
                }}
                disabled={!canPrev}
                style={{
                  background: canPrev ? 'rgba(51, 148, 50, 0.1)' : 'rgba(200, 200, 200, 0.1)',
                  border: canPrev ? '1px solid rgba(51, 148, 50, 0.3)' : '1px solid #ddd',
                  borderRadius: '6px',
                  padding: '6px 8px',
                  cursor: canPrev ? 'pointer' : 'not-allowed',
                  opacity: canPrev ? 1 : 0.4,
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'all 0.2s ease',
                  minWidth: '32px',
                  height: '32px',
                  justifyContent: 'center'
                }}
                aria-label="Previous period"
              >
                <ChevronLeft size={16} color={canPrev ? 'rgba(51, 148, 50, 0.8)' : '#999'} />
              </button>
              <span style={{ fontSize: 12, color: '#666', fontWeight: '500', minWidth: '100px', textAlign: 'center' }}>
                {phLabelsDisplay && phLabelsDisplay.length >= 2
                  ? `${phLabelsDisplay[0]} - ${phLabelsDisplay[phLabelsDisplay.length - 1]}`
                  : phTotal === 0
                    ? 'No data available'
                    : timeRange === 'days' ? `Last ${PH_WINDOW_SIZE} Days`
                      : timeRange === 'weeks' ? `Last ${PH_WINDOW_SIZE} Weeks`
                        : `Last ${PH_WINDOW_SIZE} Months`
                }
              </span>
              <button
                className="ph-nav-btn"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('Next button clicked, canNext:', canNext, 'currentStart:', currentStart, 'maxStart:', maxStart, 'phTotal:', phTotal);
                  onNext();
                }}
                disabled={!canNext}
                style={{
                  background: canNext ? 'rgba(51, 148, 50, 0.1)' : 'rgba(200, 200, 200, 0.1)',
                  border: canNext ? '1px solid rgba(51, 148, 50, 0.3)' : '1px solid #ddd',
                  borderRadius: '6px',
                  padding: '6px 8px',
                  cursor: canNext ? 'pointer' : 'not-allowed',
                  opacity: canNext ? 1 : 0.4,
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'all 0.2s ease',
                  minWidth: '32px',
                  height: '32px',
                  justifyContent: 'center'
                }}
                aria-label="Next period"
              >
                <ChevronRight size={16} color={canNext ? 'rgba(51, 148, 50, 0.8)' : '#999'} />
              </button>
              {currentStart < maxStart && phTotal > PH_WINDOW_SIZE && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Today button clicked, jumping to maxStart:', maxStart);
                    currentDevice && setPhWindows(prev => ({ ...prev, [currentDevice.id]: maxStart }));
                  }}
                  style={{
                    background: 'var(--color-primary)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '6px 10px',
                    fontSize: '11px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    marginLeft: '6px',
                    transition: 'all 0.2s ease',
                    height: '32px',
                    minWidth: '50px'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = 'rgba(51, 148, 50, 1)';
                    e.target.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'var(--color-primary)';
                    e.target.style.transform = 'translateY(0)';
                  }}
                  aria-label="Jump to latest data"
                >
                  Latest
                </button>
              )}
            </div>
          </div>
          <div className="ph-chart-container">
            <div className="ph-y-axis">
              {phYTicks.map((label, i) => (
                <span key={i} className="ph-y-label">{label}</span>
              ))}
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div className="ph-chart-area" style={{ position: 'relative', marginBottom: '8px' }}>
                {/* Horizontal Grid Lines */}
                <div className="ph-grid-horizontal" style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  pointerEvents: 'none',
                  zIndex: 1
                }}>
                  {phYTicks.map((_, i) => (
                    <div
                      key={i}
                      style={{
                        borderTop: i === 0 ? 'none' : '1px solid rgba(139, 167, 151, 0.15)',
                        height: i === 0 ? '1px' : 'auto',
                        flex: 1
                      }}
                    />
                  ))}
                </div>

                {/* Vertical Grid Lines */}
                <div className="ph-grid-vertical" style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: 'flex',
                  justifyContent: 'space-between',
                  pointerEvents: 'none',
                  zIndex: 1
                }}>
                  {phHistoryDisplay && phHistoryDisplay.length > 0
                    ? phHistoryDisplay.map((_, i) => (
                      <div
                        key={i}
                        style={{
                          borderLeft: i === 0 ? 'none' : '1px solid rgba(139, 167, 151, 0.1)',
                          width: i === 0 ? '1px' : 'auto',
                          flex: 1,
                          height: '100%'
                        }}
                      />
                    ))
                    : Array.from({ length: 10 }, (_, i) => (
                      <div
                        key={i}
                        style={{
                          borderLeft: i === 0 ? 'none' : '1px solid rgba(139, 167, 151, 0.1)',
                          width: i === 0 ? '1px' : 'auto',
                          flex: 1,
                          height: '100%'
                        }}
                      />
                    ))
                  }
                </div>

                {/* pH Bars */}
                <div className="ph-bars" role="img" aria-label="pH chart" style={{
                  position: 'relative',
                  zIndex: 2,
                  height: '220px',
                  display: 'flex',
                  alignItems: 'flex-end',
                  gap: '2px',
                  justifyContent: 'space-between',
                  padding: '8px 0'
                }}>
                  {phHistoryDisplay && phHistoryDisplay.length > 0
                    ? phHistoryDisplay.map((v, i) => <PHBar key={i} v={v} i={i} min={phScale.min} max={phScale.max} plant={data?.plant || currentDevice?.plant} />)
                    : <div style={{ color: '#999', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', zIndex: 3 }}>
                      {mergedData && mergedData.phHistory && mergedData.phHistory.length === 0 ? 'No pH data available' : 'Loading pH data...'}
                    </div>}
                </div>
              </div>
              <div className="ph-x-axis" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0', gap: '2px' }}>
                {phLabelsDisplay && phLabelsDisplay.length > 0
                  ? phLabelsDisplay.map((label, i) => (
                    <span key={i} className="ph-x-label" style={{ flex: 1, textAlign: 'center', fontSize: '10px' }}>{label}</span>
                  ))
                  : [0, 0, 0, 0, 0, 0, 0, 0, 0, 0].map((_, i) => (
                    <span key={i} className="ph-x-label" style={{ flex: 1, textAlign: 'center', fontSize: '10px' }}>--</span>
                  ))}
              </div>
            </div>
          </div>
        </section>

        {/* Current pH level (real-time latest reading, independent of history) */}
        <section className="card current-ph-card" aria-label="Current pH">
          {(() => {
            const latestPh = data?.sensors?.ph; // real-time field updated by WebSocket
            const hasPh = typeof latestPh === 'number' && Number.isFinite(latestPh);
            const phVal = hasPh ? latestPh : null;
            let plantObj = data?.plant || currentDevice?.plant;
            if (!plantObj) {
              try {
                const name = currentDevice?.plant_name;
                const catalog = plantCatalogRef.current || [];
                if (name && Array.isArray(catalog)) {
                  plantObj = catalog.find(p => p.plant_name === name) || null;
                }
              } catch (_e) { /* ignore */ }
            }

            // Enhanced status determination with plant-specific ranges
            const getPHStatus = (phValue) => {
              if (!hasPh) return { status: 'No Data', severity: 'none', color: '#8BA797' };
              // Use plant-specific ranges if available; otherwise neutral
              if (plantObj?.ph_min !== undefined && plantObj?.ph_max !== undefined) {
                const phMin = Number(plantObj.ph_min);
                const phMax = Number(plantObj.ph_max);
                if (phValue < phMin) return { status: 'Critical Low', severity: 'critical', color: '#e74c3c' };
                if (phValue > phMax) return { status: 'Critical High', severity: 'critical', color: '#e74c3c' };
                const buffer = Math.max(0.05, (phMax - phMin) * 0.1);
                if (phValue <= phMin + buffer) return { status: 'Low Warning', severity: 'warning', color: '#f59e0b' };
                if (phValue >= phMax - buffer) return { status: 'High Warning', severity: 'warning', color: '#f59e0b' };
                return { status: 'Optimal', severity: 'optimal', color: '#339432' };
              }
              // No plant ranges configured - show neutral status
              return { status: 'Measuring', severity: 'none', color: PRIMARY_GREEN };
            };

            const phStatus = getPHStatus(phVal);

            return (
              <>
                <div className="ph-value-container">
                  <div className="ph-value-main">
                    <span className="ph-number" style={{ color: phStatus.color }}>{hasPh ? phVal.toFixed(1) : '--'}</span>
                    <span className="ph-unit">pH</span>
                  </div>
                  <div className="ph-status-indicator">
                    <div className={`ph-status-dot ${phStatus.severity}`} style={{ backgroundColor: phStatus.color }}></div>
                    <span className="ph-status-text" style={{ color: phStatus.color }}>{phStatus.status}</span>
                  </div>
                </div>
                <div className="ph-info-section">
                  <div className="ph-label-row">
                    <Activity size={16} color={phStatus.color} strokeWidth={2.5} />
                    <span className="ph-label">Current Level</span>
                  </div>
                  <div className="ph-range-indicator">
                    <div className="range-bar">
                      <div
                        className="optimal-range"
                        style={{
                          display: (plantObj?.ph_min !== undefined && plantObj?.ph_max !== undefined) ? 'block' : 'none',
                          left: (() => {
                            if (plantObj?.ph_min !== undefined && plantObj?.ph_max !== undefined) {
                              const phMin = Number(plantObj.ph_min);
                              const phMax = Number(plantObj.ph_max);
                              const visualMin = Math.max(0, phMin - 1);
                              const visualMax = Math.min(14, phMax + 1);
                              const span = visualMax - visualMin;
                              const leftPct = ((phMin - visualMin) / span) * 100;
                              return `${Math.max(0, Math.min(100, leftPct))}%`;
                            }
                            return '0%';
                          })(),
                          width: (() => {
                            if (plantObj?.ph_min !== undefined && plantObj?.ph_max !== undefined) {
                              const phMin = Number(plantObj.ph_min);
                              const phMax = Number(plantObj.ph_max);
                              const visualMin = Math.max(0, phMin - 1);
                              const visualMax = Math.min(14, phMax + 1);
                              const span = visualMax - visualMin;
                              const widthPct = ((phMax - phMin) / span) * 100;
                              return `${Math.max(0, Math.min(100, widthPct))}%`;
                            }
                            return '100%';
                          })()
                        }}
                      ></div>
                      <div
                        className="current-marker"
                        style={{
                          display: hasPh ? 'block' : 'none',
                          left: (() => {
                            if (!hasPh) return '50%';
                            if (plantObj?.ph_min !== undefined && plantObj?.ph_max !== undefined) {
                              const phMin = Number(plantObj.ph_min);
                              const phMax = Number(plantObj.ph_max);

                              // Calculate position based on extended range for visualization
                              // Use a range from (min - 1) to (max + 1) for better visual distribution
                              const visualMin = Math.max(0, phMin - 1);
                              const visualMax = Math.min(14, phMax + 1);
                              const span = visualMax - visualMin;
                              const pct = ((phVal - visualMin) / span) * 100;
                              return `${Math.max(0, Math.min(100, pct))}%`;
                            }
                            // Without plant ranges, use 0-14 scale
                            const pct = (phVal / 14) * 100;
                            return `${Math.max(0, Math.min(100, pct))}%`;
                          })(),
                          backgroundColor: phStatus.color
                        }}
                      ></div>
                    </div>
                    <div className="range-labels">
                      <span>{(() => {
                        // Left label: Show current pH if below min, otherwise show (min - 1) or min
                        if (!hasPh) return '--';
                        if (plantObj?.ph_min !== undefined) {
                          const phMin = Number(plantObj.ph_min);
                          if (phVal < phMin) {
                            return phVal.toFixed(1); // Show actual low value
                          }
                          return Math.max(0, phMin - 1).toFixed(1);
                        }
                        return '0.0';
                      })()}</span>
                      <span style={{ fontWeight: '600', color: phStatus.color }}>
                        {plantObj?.ph_min !== undefined && plantObj?.ph_max !== undefined
                          ? `${plantObj.ph_min} - ${plantObj.ph_max}`
                          : (hasPh ? phVal.toFixed(1) : '—')
                        }
                      </span>
                      <span>{(() => {
                        // Right label: Show current pH if above max, otherwise show (max + 1) or max
                        if (!hasPh) return '--';
                        if (plantObj?.ph_max !== undefined) {
                          const phMax = Number(plantObj.ph_max);
                          if (phVal > phMax) {
                            return phVal.toFixed(1); // Show actual high value
                          }
                          return Math.min(14, phMax + 1).toFixed(1);
                        }
                        return '14.0';
                      })()}</span>
                    </div>
                  </div>
                </div>
              </>
            );
          })()}
        </section>

        {/* Sensor grid */}
        <section className="sensor-grid" aria-label="Sensor data">
          <div className="sensor-cell">
            <div className="icon-circle">
              <Zap size={20} color={PRIMARY_GREEN} strokeWidth={2.5} />
            </div>
            <div className="sensor-cell-content">
              <span className="sensor-label">EC Levels</span>
              <span className="sensor-value">{data && typeof data.sensors?.ec === 'number' ? `${data.sensors.ec.toFixed(1)} mS/cm` : 'Loading...'}</span>
            </div>
          </div>
          <div className="sensor-cell">
            <div className="icon-circle">
              <Waves size={20} color={PRIMARY_GREEN} strokeWidth={2.5} />
            </div>
            <div className="sensor-cell-content">
              <span className="sensor-label">TDS</span>
              <span className="sensor-value">{data && typeof data.sensors?.tds === 'number' ? `${Math.round(data.sensors.tds)} ppm` : 'Loading...'}</span>
            </div>
          </div>
          <div className="sensor-cell">
            <div className="icon-circle">
              <Droplet size={20} color={PRIMARY_GREEN} strokeWidth={2.5} />
            </div>
            <div className="sensor-cell-content">
              <span className="sensor-label">Water Level</span>
              <span className="sensor-value">{data && typeof data.sensors?.waterLevel === 'number' ? `${Math.round(data.sensors.waterLevel)}%` : 'Loading...'}</span>
            </div>
          </div>
          <div className="sensor-cell">
            <div className="icon-circle">
              <Droplets size={20} color={PRIMARY_GREEN} strokeWidth={2.5} />
            </div>
            <div className="sensor-cell-content">
              <span className="sensor-label">Turbidity</span>
              <span className="sensor-value">{data && typeof data.sensors?.turbidity === 'number' ? `${data.sensors.turbidity.toFixed(1)} NTU` : 'Loading...'}</span>
            </div>
          </div>
        </section>

        {/* Environment */}
        <section className="card environment-card" aria-label="Environment conditions">
          <h3 className="environment-title">Environment Conditions</h3>
          <div className="environment-list">
            <div className="environment-row">
              <div className="icon-circle">
                <Thermometer size={20} color={PRIMARY_GREEN} strokeWidth={2.5} />
              </div>
              <span className="environment-label">Temperature</span>
              <span className="environment-value">{data && typeof data.environment?.temperature === 'number' ? `${data.environment.temperature.toFixed(1)}°C` : 'Loading...'}</span>
            </div>
            <div className="environment-row">
              <div className="icon-circle">
                <Wind size={20} color={PRIMARY_GREEN} strokeWidth={2.5} />
              </div>
              <span className="environment-label">Humidity</span>
              <span className="environment-value">{data && typeof data.environment?.humidity === 'number' ? `${Math.round(data.environment.humidity)}%` : 'Loading...'}</span>
            </div>
            <div className="environment-row">
              <div className="icon-circle">
                <Sun size={20} color={PRIMARY_GREEN} strokeWidth={2.5} />
              </div>
              <span className="environment-label">Light Intensity</span>
              <span className="environment-value">{data && typeof data.environment?.light === 'number' ? `${Math.round(data.environment.light).toLocaleString()} Lux` : 'Loading...'}</span>
            </div>
          </div>
        </section>
      </main>

      {/* Bottom navigation */}
      <nav className="bottom-nav" aria-label="Primary">
        <button className="nav-item active" aria-current="page">
          <Leaf size={20} />
          <span>Tanom</span>
        </button>
        <button className="nav-item" onClick={() => navigate('/alerts')} style={{ position: 'relative' }}>
          <AlertCircle size={20} />
          {totalUnread > 0 && (
            <span className="nav-notification-badge" style={{
              position: 'absolute',
              top: '8px',
              right: '18px',
              backgroundColor: '#e74c3c',
              color: 'white',
              borderRadius: '50%',
              width: '16px',
              height: '16px',
              fontSize: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              border: '2px solid white',
              minWidth: '16px',
            }}>
              {totalUnread > 9 ? '9+' : totalUnread}
            </span>
          )}
          <span>Alerts</span>
        </button>
        <button className="nav-item" onClick={() => navigate('/profile')}>
          <User size={20} />
          <span>Profile</span>
        </button>
      </nav>

      {/* Floating Action Button (FAB) */}
      <button
        ref={fabRef}
        className={`floating-action-button ${isDragging ? 'dragging' : ''}`}
        style={{
          left: `${fabPosition.x}px`,
          top: `${fabPosition.y}px`,
        }}
        onMouseDown={handleFabMouseDown}
        onTouchStart={handleFabTouchStart}
        aria-label="Start new cycle"
      >
        <Plus size={24} strokeWidth={2.5} />
      </button>

      {/* WiFi Setup Instructions Modal */}
      {wifiSetupDevice && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '20px'
          }}
          onClick={() => setWifiSetupDevice(null)}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              maxWidth: '500px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{
              padding: '24px',
              borderBottom: '1px solid #e0e0e0',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              borderRadius: '12px 12px 0 0'
            }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>WiFi Setup Instructions</h2>
              <p style={{ margin: '8px 0 0 0', fontSize: '14px', opacity: 0.9 }}>
                Device: <strong>{wifiSetupDevice.device_name}</strong> ({wifiSetupDevice.device_serial})
              </p>
            </div>

            {/* Content */}
            <div style={{ padding: '24px' }}>
              <div style={{
                background: '#e3f2fd',
                borderLeft: '4px solid #2196F3',
                padding: '12px',
                marginBottom: '20px',
                fontSize: '14px',
                color: '#1976D2',
                borderRadius: '4px'
              }}>
                📶 Follow these steps to connect your SmarTanom device to your WiFi network
              </div>

              <ol style={{ paddingLeft: '20px', fontSize: '15px', lineHeight: '1.8' }}>
                <li style={{ marginBottom: '16px' }}>
                  <strong>Power on your ESP32 device</strong>
                  <br />
                  <span style={{ color: '#666', fontSize: '13px' }}>The LED should start blinking, indicating it's in setup mode</span>
                </li>

                <li style={{ marginBottom: '16px' }}>
                  <strong>Connect to the device's WiFi hotspot</strong>
                  <br />
                  <div style={{
                    background: '#f5f5f5',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    marginTop: '6px',
                    fontFamily: 'monospace'
                  }}>
                    📶 Network: <strong>{wifiSetupDevice.device_serial}</strong><br />
                    🔑 Password: <strong>smartanom123</strong>
                  </div>
                </li>

                <li style={{ marginBottom: '16px' }}>
                  <strong>Open a web browser</strong>
                  <br />
                  <span style={{ color: '#666', fontSize: '13px' }}>Navigate to:</span>
                  <div style={{
                    background: '#f5f5f5',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    marginTop: '6px',
                    fontFamily: 'monospace'
                  }}>
                    🌐 <strong>http://192.168.4.1</strong>
                  </div>
                </li>

                <li style={{ marginBottom: '16px' }}>
                  <strong>Select your home WiFi network</strong>
                  <br />
                  <span style={{ color: '#666', fontSize: '13px' }}>Choose from the list and enter your WiFi password</span>
                </li>

                <li style={{ marginBottom: '16px' }}>
                  <strong>Click "Connect"</strong>
                  <br />
                  <span style={{ color: '#666', fontSize: '13px' }}>Wait for the device to connect (may take 30-60 seconds)</span>
                </li>

                <li>
                  <strong>Stay on this page</strong>
                  <br />
                  <span style={{ color: '#666', fontSize: '13px' }}>Once connected, the device will automatically register and you'll be redirected to your dashboard</span>
                </li>
              </ol>

              <div style={{
                background: '#fff3e0',
                border: '1px solid #ff9800',
                borderRadius: '6px',
                padding: '12px',
                marginTop: '20px',
                fontSize: '13px',
                color: '#e65100'
              }}>
                <strong>⚠️ Troubleshooting:</strong>
                <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
                  <li>Make sure your device is powered on and the LED is blinking</li>
                  <li>Your WiFi network must be 2.4GHz (ESP32 doesn't support 5GHz)</li>
                  <li>If connection fails, verify your WiFi password is correct</li>
                </ul>
              </div>
            </div>

            {/* Footer */}
            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid #e0e0e0',
              display: 'flex',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => setWifiSetupDevice(null)}
                style={{
                  padding: '10px 20px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


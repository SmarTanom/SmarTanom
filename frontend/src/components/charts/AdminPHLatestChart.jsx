import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { Activity, ChevronLeft, ChevronRight } from 'lucide-react';
import { getAllUserSensors, getSensorData } from '../../services/api/sensors';
import { getUserDevices } from '../../services/api/devices';
import { apiClient } from '../../services/apiClient';
import Spinner from '../ui/Spinner.jsx';
import { wsClient } from '../../services/websocketClient';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend);

const PRIMARY_GREEN = 'rgba(51, 148, 50, 0.9)';
const WARNING_ORANGE = '#f59e0b';
const CRITICAL_RED = '#e74c3c';
const BLUE = '#2563eb';

/**
 * AdminPHLatestChart
 * Renders a bar chart of the latest pH reading per device (admin scope = all devices).
 * - Fetches sensor catalog (id, sensor_type, device label)
 * - Fetches latest readings for all sensors in one call
 * - Joins by sensor_id and filters to pH, rendering one bar per device
 * - Subscribes to WebSocket sensor updates to refresh quickly when new data arrives
 */
export default function AdminPHLatestChart() {
  // Data is organized per device serial with per-metric values for a selected day
  // rows: [{ serial, ph, ec, tds, updatedAt: { ph, ec, tds }, plant }]
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()); // local midnight
  });
  const [clickInfo, setClickInfo] = useState('');
  const cacheRef = useRef(new Map()); // key: 'YYYY-MM-DD' -> rows array
  const dragRef = useRef({ active: false, startX: 0, dx: 0 });
  const phRef = useRef(null); const ecRef = useRef(null); const tdsRef = useRef(null);
  const [effectiveDate, setEffectiveDate] = useState(() => new Date());
  const [usingFallbackDate, setUsingFallbackDate] = useState(false);

  // Helper: plant-aware classification for color coding
  const classifyValue = (value, min, max) => {
    const v = Number(value);
    if (!Number.isFinite(v) || !Number.isFinite(min) || !Number.isFinite(max)) return 'none';
    const span = Math.max(0, max - min);
    const prox = Math.min(200, Math.max(50, span * 0.1));
    if (v < min || v > max) return 'critical';
    if (v <= min + prox || v >= max - prox) return 'warning';
    return 'none';
  };
  const colorFor = (severity) => {
    if (severity === 'critical') return CRITICAL_RED;
    if (severity === 'warning') return WARNING_ORANGE;
    return PRIMARY_GREEN;
  };

  const fetchAll = async () => {
    try {
      setError(null);
      // 1) Get all sensors (admin sees all)
      const sensors = await getAllUserSensors();
      const interesting = sensors.filter(s => s && ['ph', 'ec', 'tds'].includes(String(s.sensor_type).toLowerCase()));
      if (!interesting.length) {
        setRows([]);
        setLoading(false);
        return;
      }

      // 2) Get all devices to resolve plant thresholds by device serial
      let devices = [];
      try { devices = await getUserDevices(); } catch (_) { devices = []; }
      const deviceRows = (Array.isArray(devices?.results) ? devices.results : (Array.isArray(devices) ? devices : []));
      const plantBySerial = new Map();
      const serialByName = new Map();
      const serialByNameLower = new Map();
      deviceRows.forEach(d => {
        const serial = d?.device_serial || d?.serial_number || d?.serial || d?.serialNumber;
        const name = d?.device_name || d?.name || '';
        if (serial) {
          plantBySerial.set(String(serial), d.plant || d?.current_plant || d?.plant_info || null);
          if (name) {
            serialByName.set(String(name), String(serial));
            serialByNameLower.set(String(name).toLowerCase(), String(serial));
          }
        }
      });

      const resolveSerial = (s) => {
        let serial = s.device_serial || s.serial || s.deviceSerial || '';
        if (serial) return String(serial);
        const deviceStr = s.device_label || s.device_name || s.device || s.name || '';
        if (deviceStr) {
          // Try to parse trailing parenthetical e.g., "Name (SERIAL)"
          const m = String(deviceStr).match(/\(([^)]+)\)\s*$/);
          if (m && m[1]) return String(m[1]);
          // Try direct name lookup
          const trimmed = String(deviceStr).split('(')[0].trim();
          const byExact = serialByName.get(trimmed);
          if (byExact) return byExact;
          const byLower = serialByNameLower.get(trimmed.toLowerCase());
          if (byLower) return byLower;
        }
        return '';
      };

      // 3) Build map: sensorId -> device serial and type
      const sensorMeta = interesting.map(s => ({
        id: s.id,
        type: String(s.sensor_type).toLowerCase(),
        serial: resolveSerial(s),
      })).filter(x => x.serial);

      // 4) Fetch readings for the selected day per sensor
      const start = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
      const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1);
  const startISO = start.toISOString();
  const endISO = end.toISOString();

      const fetchLatestInDay = async (sensorId) => {
        try {
          const payload = await getSensorData(sensorId, 200, { start: startISO, end: endISO, ignoreDeviceSerial: true });
          const items = Array.isArray(payload?.results) ? payload.results : (Array.isArray(payload) ? payload : []);
          const last = items[0];
          if (!last) return null;
          return { value: Number(last.value), updatedAt: last.created_at };
        } catch (_) { return null; }
      };

  const outBySerial = new Map(); // serial -> row
      // Try batched multi-sensor request with sensor__in to reduce API calls
      const token = localStorage.getItem('authToken');
      const chunkSize = 50;
      for (let i = 0; i < sensorMeta.length; i += chunkSize) {
        const chunk = sensorMeta.slice(i, i + chunkSize);
        const ids = chunk.map(s => s.id).join(',');
        try {
          const page = await apiClient.get(`/api/sensors/sensor-data/?sensor__in=${ids}&page_size=1000&ordering=-created_at&start=${encodeURIComponent(startISO)}&end=${encodeURIComponent(endISO)}`, { authToken: token });
          const items = Array.isArray(page?.results) ? page.results : (Array.isArray(page) ? page : []);
          // First item per sensor is latest because ordering=-created_at
          const seen = new Set();
          for (const it of items) {
            const sid = it.sensor_id || it.sensor || (it.sensor && it.sensor.id);
            if (!sid || seen.has(sid)) continue;
            seen.add(sid);
            const meta = chunk.find(s => s.id === sid);
            if (!meta) continue;
            const val = Number(it.value);
            if (!Number.isFinite(val)) continue;
            const prev = outBySerial.get(meta.serial) || { serial: meta.serial, ph: null, ec: null, tds: null, updatedAt: {} };
            prev[meta.type] = val;
            prev.updatedAt[meta.type] = it.created_at;
            outBySerial.set(meta.serial, prev);
          }
        } catch (_e) {
          // Fallback to per-sensor calls if bulk fails
          const results = await Promise.all(chunk.map(s => fetchLatestInDay(s.id)));
          results.forEach((res, idx) => {
            const meta = chunk[idx];
            if (!meta || !res || !Number.isFinite(res.value)) return;
            const prev = outBySerial.get(meta.serial) || { serial: meta.serial, ph: null, ec: null, tds: null, updatedAt: {} };
            prev[meta.type] = res.value;
            prev.updatedAt[meta.type] = res.updatedAt;
            outBySerial.set(meta.serial, prev);
          });
        }
      }

      // Fallback: if no data matched selected day, pull the latest reading per sensor (no date filter)
      let fallbackUsed = false;
      if (outBySerial.size === 0) {
        fallbackUsed = true;
        const fetchLatestAny = async (sensorId) => {
          try {
            const payload = await getSensorData(sensorId, 1, { ignoreDeviceSerial: true });
            const items = Array.isArray(payload?.results) ? payload.results : (Array.isArray(payload) ? payload : []);
            const last = items[0];
            if (!last) return null;
            return { value: Number(last.value), updatedAt: last.created_at };
          } catch (_) { return null; }
        };
        for (let i = 0; i < sensorMeta.length; i += chunkSize) {
          const chunk = sensorMeta.slice(i, i + chunkSize);
          const results = await Promise.all(chunk.map(s => fetchLatestAny(s.id)));
          results.forEach((res, idx) => {
            const meta = chunk[idx];
            if (!meta || !res || !Number.isFinite(res.value)) return;
            const prev = outBySerial.get(meta.serial) || { serial: meta.serial, ph: null, ec: null, tds: null, updatedAt: {} };
            prev[meta.type] = res.value;
            prev.updatedAt[meta.type] = res.updatedAt;
            outBySerial.set(meta.serial, prev);
          });
        }
      }

      // 5) Attach plant info if available and sort by serial
      const rowsOut = Array.from(outBySerial.values()).map(r => ({
        ...r,
        plant: plantBySerial.get(r.serial) || null,
      })).sort((a, b) => String(a.serial).localeCompare(String(b.serial)));

      setRows(rowsOut);
      // Determine accurate display date based on the data we actually show
      const getDateOnly = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const gatherTimestamps = (rows) => {
        const ts = [];
        rows.forEach(r => {
          if (r?.updatedAt) Object.values(r.updatedAt).forEach(t => { if (t) ts.push(new Date(t)); });
        });
        return ts.filter(t => !Number.isNaN(t.getTime()));
      };
      const allTs = gatherTimestamps(rowsOut);
      let eff = new Date(selectedDate);
      let usedFallback = fallbackUsed;
      if (allTs.length) {
        const anySameDay = allTs.some(t => getDateOnly(t).getTime() === getDateOnly(selectedDate).getTime());
        if (anySameDay) {
          eff = getDateOnly(selectedDate);
          usedFallback = false;
        } else {
          // Use most recent timestamp's day
          const maxTs = allTs.reduce((a, b) => (a > b ? a : b));
          eff = getDateOnly(maxTs);
          usedFallback = true;
        }
      }
      setEffectiveDate(eff);
      setUsingFallbackDate(usedFallback);
      // cache
      const key = start.toISOString().slice(0,10);
      cacheRef.current.set(key, rowsOut);
    } catch (e) {
      setError(e?.message || 'Failed to load pH data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const key = selectedDate.toISOString().slice(0,10);
    const cached = cacheRef.current.get(key);
    if (cached) {
      setRows(cached);
      // Recompute display date from cached rows to keep accuracy
      const getDateOnly = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const ts = [];
      cached.forEach(r => { if (r?.updatedAt) Object.values(r.updatedAt).forEach(t => { if (t) ts.push(new Date(t)); }); });
      let usedFallback = false; let eff = new Date(selectedDate);
      if (ts.length) {
        const anySameDay = ts.some(t => getDateOnly(t).getTime() === getDateOnly(selectedDate).getTime());
        if (!anySameDay) { usedFallback = true; eff = getDateOnly(ts.reduce((a,b)=> (a>b?a:b))); }
      }
      setEffectiveDate(eff);
      setUsingFallbackDate(usedFallback);
      setLoading(false);
    } else {
      setLoading(true);
      fetchAll();
    }

    // Refresh when sensor updates arrive
    const unsub = wsClient.subscribe((msg) => {
      if (!msg) return;
      if (msg.type === 'sensor.update') fetchAll();
    });

    wsClient.connect();

    const id = setInterval(fetchAll, 20000);
    return () => { clearInterval(id); if (typeof unsub === 'function') unsub(); };
  }, [selectedDate]);

  // Build merged line chart with 3 datasets (pH, EC, TDS) on multi-axes
  const combined = useMemo(() => {
    const serials = rows.map(r => r.serial);

    const phValues = rows.map(r => (Number.isFinite(Number(r.ph)) ? Number(r.ph) : null));
    const ecValues = rows.map(r => (Number.isFinite(Number(r.ec)) ? Number(r.ec) : null));
    const tdsValues = rows.map(r => (Number.isFinite(Number(r.tds)) ? Number(r.tds) : null));

    const phPointColors = rows.map(r => {
      const plant = r.plant || {};
      const sev = classifyValue(r.ph, plant.ph_min, plant.ph_max);
      return colorFor(sev);
    });
    const ecPointColors = rows.map(r => {
      const plant = r.plant || {};
      const sev = classifyValue(r.ec, plant.ec_min, plant.ec_max);
      return colorFor(sev);
    });
    const tdsPointColors = rows.map(r => {
      const plant = r.plant || {};
      const sev = classifyValue(r.tds, plant.ppm_min, plant.ppm_max);
      return colorFor(sev);
    });

    // Dynamic ranges
    const calcRange = (vals, fallbackMin, fallbackMax) => {
      const v = vals.filter(x => x != null && Number.isFinite(x));
      if (!v.length) return { min: fallbackMin, max: fallbackMax };
      const min = Math.min(...v);
      const max = Math.max(...v);
      const pad = (max - min) * 0.1 || 1;
      return { min: Math.max(0, min - pad), max: max + pad };
    };

    const phRange = calcRange(phValues, 4.5, 8.0);
    const ecRange = calcRange(ecValues, 0, 3.0);
    const tdsRange = calcRange(tdsValues, 400, 2000);

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: true, position: 'top' },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const v = ctx.parsed.y;
              if (v == null) return 'No data';
              const label = ctx.dataset.label || '';
              const units = label === 'pH' ? 'pH' : (label === 'EC' ? 'EC' : 'ppm');
              const serial = serials[ctx.dataIndex] || '';
              return `${label}: ${Number(v).toFixed(2)} ${units} (${serial})`;
            }
          }
        },
      },
      scales: {
        x: {
          ticks: {
            color: '#6f8876',
            font: { weight: 600 },
            autoSkip: false,
            maxRotation: 0,
            minRotation: 0,
            callback: (val, idx) => serials[idx] || ''
          },
          grid: { display: false },
        },
        yPh: {
          type: 'linear',
          position: 'left',
          suggestedMin: phRange.min,
          suggestedMax: phRange.max,
          grid: { color: 'rgba(139,167,151,0.15)' },
          ticks: { color: '#46685a', font: { weight: 600 } }
        },
        yEc: {
          type: 'linear',
          position: 'left',
          suggestedMin: ecRange.min,
          suggestedMax: ecRange.max,
          grid: { display: false },
          ticks: { color: '#8B5E00', font: { weight: 600 } }
        },
        yTds: {
          type: 'linear',
          position: 'right',
          suggestedMin: tdsRange.min,
          suggestedMax: tdsRange.max,
          grid: { display: false },
          ticks: { color: '#1e3a8a', font: { weight: 600 } }
        }
      }
    };

    const data = {
      labels: serials,
      datasets: [
        {
          label: 'pH',
          type: 'line',
          data: phValues,
          borderColor: PRIMARY_GREEN,
          backgroundColor: PRIMARY_GREEN,
          yAxisID: 'yPh',
          tension: 0.35,
          pointRadius: 3,
          pointBackgroundColor: phPointColors,
          spanGaps: true,
        },
        {
          label: 'EC',
          type: 'line',
          data: ecValues,
          borderColor: WARNING_ORANGE,
          backgroundColor: WARNING_ORANGE,
          yAxisID: 'yEc',
          tension: 0.35,
          pointRadius: 3,
          pointBackgroundColor: ecPointColors,
          spanGaps: true,
        },
        {
          label: 'TDS',
          type: 'line',
          data: tdsValues,
          borderColor: BLUE,
          backgroundColor: BLUE,
          yAxisID: 'yTds',
          tension: 0.35,
          pointRadius: 3,
          pointBackgroundColor: tdsPointColors,
          spanGaps: true,
        }
      ]
    };

    return { data, options };
  }, [rows]);

  const changeDay = (delta) => {
    setSelectedDate(prev => new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() + delta));
  };

  // Drag navigation handlers
  const onDragStart = (clientX) => { dragRef.current = { active: true, startX: clientX, dx: 0 }; };
  const onDragMove = (clientX) => { if (!dragRef.current.active) return; dragRef.current.dx = clientX - dragRef.current.startX; };
  const onDragEnd = () => {
    const { active, dx } = dragRef.current; dragRef.current.active = false; if (!active) return;
    const pxPerDay = 120; const delta = Math.round(-dx / pxPerDay); // drag left -> older
    if (delta !== 0) changeDay(delta);
  };

  // Click handlers to show date for clicked bar
  const handleLineClick = (evt, elements) => {
    if (!elements || elements.length === 0) return;
    const el = elements[0];
    const idx = el.index;
    const dsIdx = el.datasetIndex;
    const metric = ['ph','ec','tds'][dsIdx] || 'ph';
    const row = rows[idx];
    const ts = row?.updatedAt?.[metric];
    if (ts) {
      const when = new Date(ts).toLocaleString();
      setClickInfo(`${metric.toUpperCase()} reading date: ${when}`);
      setTimeout(() => setClickInfo(''), 3000);
    }
  };

  const ChartLoading = () => (
    <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
      <style>{`
        @keyframes shimmerAnim { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
      `}</style>
      <div style={{ position: 'absolute', inset: 24, borderRadius: 12, background: 'linear-gradient(90deg, rgba(139,167,151,0.06), rgba(139,167,151,0.12), rgba(139,167,151,0.06))', backgroundSize: '200% 100%', animation: 'shimmerAnim 1.8s linear infinite' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, background: 'rgba(255,255,255,0.85)', border: '1px solid #e5e7eb', borderRadius: 10, zIndex: 1 }}>
        <Spinner size={22} />
        <span style={{ color: '#6f8876', fontWeight: 600 }}>Loading chart…</span>
      </div>
    </div>
  );

  return (
    <article className="panel">
      <header className="panel-head">
        <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Activity size={18} />
          <span>Daily pH/EC/TDS by Device</span>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} title="Drag left/right on chart to change day">
            <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>
              {effectiveDate ? effectiveDate.toLocaleDateString() : selectedDate.toLocaleDateString()}
            </span>
            {usingFallbackDate && (
              <span style={{ fontSize: 10, color: '#065f46', background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '2px 6px', borderRadius: 999 }}>latest</span>
            )}
          </div>
          {clickInfo && (
            <div style={{ fontSize: 12, color: '#065f46', background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '4px 8px', borderRadius: 6 }}>
              {clickInfo}
            </div>
          )}
        </div>
      </header>
      <div
        className="panel-body"
        style={{ minHeight: 360, cursor: dragRef.current.active ? 'grabbing' : 'grab' }}
        onMouseDown={(e) => onDragStart(e.clientX)}
        onMouseMove={(e) => onDragMove(e.clientX)}
        onMouseUp={onDragEnd}
        onMouseLeave={onDragEnd}
        onTouchStart={(e) => onDragStart(e.touches[0].clientX)}
        onTouchMove={(e) => onDragMove(e.touches[0].clientX)}
        onTouchEnd={onDragEnd}
      >
        {loading ? (
          <ChartLoading />
        ) : error ? (
          <div style={{ padding: 24, color: '#b91c1c' }}>{error}</div>
        ) : rows.length === 0 ? (
          <div style={{ padding: 24, color: '#6f8876' }}>No sensors or no data for the selected day.</div>
        ) : (
          <div style={{ height: 300, overflowX: 'auto', overflowY: 'hidden' }}>
            <div style={{ width: Math.max(700, rows.length * 140) }}>
              <Line data={combined.data} options={combined.options} height={280} onClick={handleLineClick} />
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

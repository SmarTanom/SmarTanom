import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, Download, Layers } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, getElementAtEvent } from 'react-chartjs-2';
import Spinner from '../ui/Spinner.jsx';
import { getAllUserSensors } from '../../services/api/sensors';
import { apiClient } from '../../services/apiClient';
import { wsClient } from '../../services/websocketClient';

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, Tooltip, Legend, Filler);

const GREEN = '#339432';
const GREEN_FILL_TOP = 'rgba(51,148,50,0.35)';
const GREEN_FILL_BOTTOM = 'rgba(51,148,50,0.05)';
const ORANGE = '#f59e0b';
const BLUE = '#2563eb';

// Utility: date bucket keys
function formatDay(d) { return d.toISOString().slice(0,10); }
function formatMonth(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; }
function startOfWeek(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = (x.getDay() + 6) % 7; // Mon=0
  x.setDate(x.getDate() - day);
  x.setHours(0,0,0,0);
  return x;
}
function formatWeek(d) { const s = startOfWeek(d); return `${s.getFullYear()}-W${String(Math.ceil((s.getDate())/7)).padStart(2,'0')}`; }

export default function DeviceActivityTrend() {
  const [range, setRange] = useState('12m'); // '3m' | '6m' | '12m' | 'all'
  const [granularity, setGranularity] = useState('monthly'); // 'daily' | 'weekly' | 'monthly'
  const [stacked, setStacked] = useState(false); // stack by metric vs total
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [series, setSeries] = useState({ labels: [], total: [], ph: [], ec: [], tds: [] });
  const chartRef = useRef(null);
  const cacheRef = useRef(new Map()); // key: `${range}|${granularity}|${stacked}` -> series

  const computeWindow = () => {
    const end = new Date();
    let start;
    if (range === '3m') start = new Date(end.getFullYear(), end.getMonth() - 3, end.getDate());
    else if (range === '6m') start = new Date(end.getFullYear(), end.getMonth() - 6, end.getDate());
    else if (range === '12m') start = new Date(end.getFullYear(), end.getMonth() - 12, end.getDate());
    else start = new Date(end.getFullYear() - 5, end.getMonth(), end.getDate()); // All = last 5y cap
    start.setHours(0,0,0,0);
    return { start, end };
  };

  const fetchData = async () => {
    try {
      setError(null);
      setLoading(true);
      const { start, end } = computeWindow();
      const startISO = start.toISOString();
      const endISO = end.toISOString();

      const sensors = await getAllUserSensors();
      const interesting = sensors.filter(s => s && ['ph','ec','tds'].includes(String(s.sensor_type).toLowerCase()));
      if (!interesting.length) { setSeries({ labels: [], total: [], ph: [], ec: [], tds: [] }); setLoading(false); return; }

      const sensorMeta = interesting.map(s => ({ id: s.id, type: String(s.sensor_type).toLowerCase() }));
      const chunkSize = 50;
      const token = localStorage.getItem('authToken');

      // Aggregate buckets
      const bucketMap = new Map(); // key -> { total, ph, ec, tds }
      const bump = (key, type) => {
        const rec = bucketMap.get(key) || { total: 0, ph: 0, ec: 0, tds: 0 };
        rec.total += 1; if (type && rec[type] != null) rec[type] += 1; bucketMap.set(key, rec);
      };
      const keyFor = (d) => {
        const dt = new Date(d);
        if (granularity === 'daily') return formatDay(dt);
        if (granularity === 'weekly') return formatWeek(dt);
        return formatMonth(dt);
      };

      for (let i = 0; i < sensorMeta.length; i += chunkSize) {
        const chunk = sensorMeta.slice(i, i + chunkSize);
        const ids = chunk.map(s => s.id).join(',');
        let page = 1;
        // loop pages defensively up to a cap
        while (page <= 10) { // cap 10 pages per chunk to avoid runaway
          const resp = await apiClient.get(`/api/sensors/sensor-data/?sensor__in=${ids}&page_size=1000&page=${page}&ordering=-created_at&start=${encodeURIComponent(startISO)}&end=${encodeURIComponent(endISO)}`, { authToken: token });
          const items = Array.isArray(resp?.results) ? resp.results : (Array.isArray(resp) ? resp : []);
          if (!items.length) break;
          for (const it of items) {
            const t = it.created_at;
            const sid = it.sensor_id || it.sensor || (it.sensor && it.sensor.id);
            const meta = chunk.find(s => s.id === sid);
            const type = meta?.type;
            if (!t || !type) continue;
            bump(keyFor(t), type);
          }
          if (resp?.next) { page += 1; } else { break; }
        }
      }

      // Fallback: if nothing aggregated (e.g., backend doesn't support sensor__in),
      // fetch per-sensor pages and aggregate.
      if (bucketMap.size === 0) {
        for (let i = 0; i < sensorMeta.length; i += 20) {
          const chunk = sensorMeta.slice(i, i + 20);
          for (const meta of chunk) {
            let page = 1;
            while (page <= 8) {
              const url = `/api/sensors/sensor-data/?sensor=${meta.id}&page_size=1000&page=${page}&ordering=-created_at&start=${encodeURIComponent(startISO)}&end=${encodeURIComponent(endISO)}&ignoreDeviceSerial=true`;
              const resp = await apiClient.get(url, { authToken: token });
              const items = Array.isArray(resp?.results) ? resp.results : (Array.isArray(resp) ? resp : []);
              if (!items.length) break;
              for (const it of items) {
                const t = it.created_at; if (!t) continue;
                bump(keyFor(t), meta.type);
              }
              if (resp?.next) { page += 1; } else { break; }
            }
          }
        }
      }

      const labels = Array.from(bucketMap.keys()).sort((a,b) => a.localeCompare(b));
      const ph = labels.map(k => bucketMap.get(k)?.ph || 0);
      const ec = labels.map(k => bucketMap.get(k)?.ec || 0);
      const tds = labels.map(k => bucketMap.get(k)?.tds || 0);
      const total = labels.map((_, i) => ph[i] + ec[i] + tds[i]);
      const payload = { labels, total, ph, ec, tds };
      setSeries(payload);
      cacheRef.current.set(`${range}|${granularity}|${stacked}`, payload);
    } catch (e) {
      setError(e?.message || 'Failed to load activity trend');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const key = `${range}|${granularity}|${stacked}`;
    const cached = cacheRef.current.get(key);
    if (cached) { setSeries(cached); setLoading(false); }
    else { fetchData(); }

    const unsub = wsClient.subscribe((msg) => { if (msg?.type === 'sensor.update') fetchData(); });
    wsClient.connect();
    const id = setInterval(fetchData, 30000);
    return () => { if (typeof unsub === 'function') unsub(); clearInterval(id); };
  }, [range, granularity, stacked]);

  const kpis = useMemo(() => {
    const arr = (stacked ? series.total : series.total) || []; // same base for KPIs
    if (!arr.length) return { min: 0, max: 0, avg: 0 };
    const min = Math.min(...arr);
    const max = Math.max(...arr);
    const avg = arr.reduce((a,b)=>a+b,0) / arr.length;
    return { min, max, avg: Number.isFinite(avg) ? avg : 0 };
  }, [series, stacked]);

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: stacked }, tooltip: { intersect: false, mode: 'index' } },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#6f8876', font: { weight: 600 }, autoSkip: true, maxRotation: 0, minRotation: 0 } },
      y: { grid: { color: 'rgba(139,167,151,0.15)' }, ticks: { color: '#6f8876', font: { weight: 600 } }, beginAtZero: true },
    }
  }), [stacked]);

  const data = useMemo(() => {
    const labels = series.labels || [];
    if (!stacked) {
      return {
        labels,
        datasets: [
          {
            label: 'Readings',
            data: series.total || [],
            borderColor: GREEN,
            backgroundColor: (ctx) => {
              const { ctx: c, chartArea } = ctx.chart; if (!chartArea) return GREEN_FILL_BOTTOM;
              const g = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
              g.addColorStop(0, GREEN_FILL_TOP); g.addColorStop(1, GREEN_FILL_BOTTOM); return g;
            },
            fill: true,
            tension: 0.35,
            pointRadius: 2.5,
            borderWidth: 2,
          }
        ]
      };
    }
    return {
      labels,
      datasets: [
        { label: 'pH', data: series.ph || [], borderColor: GREEN, backgroundColor: 'rgba(51,148,50,0.25)', fill: true, tension: 0.35, pointRadius: 2, borderWidth: 2 },
        { label: 'EC', data: series.ec || [], borderColor: ORANGE, backgroundColor: 'rgba(245,158,11,0.20)', fill: true, tension: 0.35, pointRadius: 2, borderWidth: 2 },
        { label: 'TDS', data: series.tds || [], borderColor: BLUE, backgroundColor: 'rgba(37,99,235,0.18)', fill: true, tension: 0.35, pointRadius: 2, borderWidth: 2 },
      ]
    };
  }, [series, stacked]);

  const exportCSV = () => {
    const labels = series.labels || [];
    const rows = labels.map((label, i) => ({
      period: label,
      total: series.total?.[i] ?? 0,
      ph: series.ph?.[i] ?? 0,
      ec: series.ec?.[i] ?? 0,
      tds: series.tds?.[i] ?? 0,
    }));
    const header = 'period,total,ph,ec,tds\n';
    const body = rows.map(r => `${r.period},${r.total},${r.ph},${r.ec},${r.tds}`).join('\n');
    const blob = new Blob([header + body], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'device-activity-trend.csv'; a.click(); URL.revokeObjectURL(url);
  };

  const ChartLoading = () => (
    <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
      <style>{`@keyframes shimmer {0%{background-position:-200% 0}100%{background-position:200% 0}}`}</style>
      <div style={{ position: 'absolute', inset: 24, borderRadius: 12, background: 'linear-gradient(90deg, rgba(139,167,151,0.06), rgba(139,167,151,0.12), rgba(139,167,151,0.06))', backgroundSize: '200% 100%', animation: 'shimmer 1.2s linear infinite' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, background: 'rgba(255,255,255,0.9)', border: '1px solid #e5e7eb', borderRadius: 10, zIndex: 1 }}>
        <Spinner size={18} speed={0.6} />
        <span style={{ color: '#6f8876', fontWeight: 600 }}>Loading…</span>
      </div>
    </div>
  );

  return (
    <article className="panel">
      <header className="panel-head">
        <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Activity size={18} />
          <span>Device Activity Trend</span>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          <div className="btn-group" role="group" aria-label="Range selector" style={{ background: '#f3f7f5', borderRadius: 999, padding: 2 }}>
            {['3m','6m','12m','all'].map(k => (
              <button key={k} type="button" onClick={() => setRange(k)} style={{ border: 'none', background: range===k? '#fff':'transparent', color: '#0d3923', padding: '6px 10px', borderRadius: 999, cursor: 'pointer', fontWeight: 600 }}>{k.toUpperCase()}</button>
            ))}
          </div>
          <div className="btn-group" role="group" aria-label="Granularity selector" style={{ background: '#f3f7f5', borderRadius: 999, padding: 2 }}>
            {[
              {k:'daily',l:'D'},
              {k:'weekly',l:'W'},
              {k:'monthly',l:'M'}
            ].map(b => (
              <button key={b.k} type="button" onClick={() => setGranularity(b.k)} style={{ border: 'none', background: granularity===b.k? '#fff':'transparent', color: '#0d3923', padding: '6px 10px', borderRadius: 999, cursor: 'pointer', fontWeight: 600 }}>{b.l}</button>
            ))}
          </div>
          <button title={stacked ? 'Showing by metric' : 'Showing total'} onClick={() => setStacked(s => !s)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: '1px solid #e5e7eb', background: '#fff', borderRadius: 8, padding: '6px 10px', cursor: 'pointer' }}>
            <Layers size={14} /> {stacked ? 'Stacked' : 'Total'}
          </button>
          <button className="export-btn" onClick={exportCSV} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Download size={16} /> Export CSV
          </button>
        </div>
      </header>
      <div className="panel-body">
        {loading ? (
          <ChartLoading />
        ) : error ? (
          <div style={{ padding: 24, color: '#b91c1c' }}>{error}</div>
        ) : (series.labels?.length || 0) === 0 ? (
          <div style={{ padding: 24, color: '#6f8876' }}>No activity in selected range.</div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
              <div className="kpi-chip" title="Minimum"><span style={{ color: '#6f8876', fontWeight: 600 }}>Min</span><strong style={{ marginLeft: 6 }}>{kpis.min}</strong></div>
              <div className="kpi-chip" title="Average"><span style={{ color: '#6f8876', fontWeight: 600 }}>Avg</span><strong style={{ marginLeft: 6 }}>{kpis.avg.toFixed(1)}</strong></div>
              <div className="kpi-chip" title="Maximum"><span style={{ color: '#6f8876', fontWeight: 600 }}>Max</span><strong style={{ marginLeft: 6 }}>{kpis.max}</strong></div>
            </div>
            <div style={{ height: 280 }}>
              <Line ref={chartRef} data={data} options={options} height={260} />
            </div>
          </>
        )}
      </div>
    </article>
  );
}

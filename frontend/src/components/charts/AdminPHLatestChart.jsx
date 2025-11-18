import React, { useEffect, useMemo, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { Activity } from 'lucide-react';
import { getAllUserSensors, getSensorData } from '../../services/api/sensors';
import { wsClient } from '../../services/websocketClient';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const PRIMARY_GREEN = 'rgba(51, 148, 50, 0.9)';

/**
 * AdminPHLatestChart
 * Renders a bar chart of the latest pH reading per device (admin scope = all devices).
 * - Fetches sensor catalog (id, sensor_type, device label)
 * - Fetches latest readings for all sensors in one call
 * - Joins by sensor_id and filters to pH, rendering one bar per device
 * - Subscribes to WebSocket sensor updates to refresh quickly when new data arrives
 */
export default function AdminPHLatestChart() {
  const [rows, setRows] = useState([]); // [{deviceLabel, value, updatedAt}]
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAll = async () => {
    try {
      setError(null);
      // 1) Get all sensors (admin sees all) – follow pagination to avoid truncation
      const sensors = await getAllUserSensors();

      // Map pH sensors by id -> device label
      const phSensors = sensors.filter(s => s && String(s.sensor_type).toLowerCase() === 'ph');
      if (!phSensors.length) {
        setRows([]);
        setLoading(false);
        return;
      }
      const buildDeviceLabel = (s) => {
        // Try common shapes across serializers
        const name = s.device_label || s.device_name || s.device || s.name || 'Device';
        const serial = s.device_serial || s.serial || s.deviceSerial || '';
        return serial ? `${String(name)} (${String(serial)})` : String(name);
      };
      const deviceLabelBySensorId = new Map(phSensors.map(s => [s.id, buildDeviceLabel(s)]));

      // 2) For each pH sensor, fetch the latest reading from sensor-data
      const fetchLatestForSensor = async (sensorId) => {
        try {
          const payload = await getSensorData(sensorId, 1, { ignoreDeviceSerial: true });
          const items = Array.isArray(payload?.results) ? payload.results : (Array.isArray(payload) ? payload : []);
          const last = items[0];
          if (!last) return null;
          return { value: Number(last.value), updatedAt: last.created_at };
        } catch (_) { return null; }
      };

      // Limit concurrency to avoid bursting the API
      const out = [];
      const chunkSize = 10;
      for (let i = 0; i < phSensors.length; i += chunkSize) {
        const chunk = phSensors.slice(i, i + chunkSize);
        const results = await Promise.all(chunk.map(s => fetchLatestForSensor(s.id)));
        results.forEach((res, idx) => {
          if (!res || !Number.isFinite(res.value)) return;
          const s = chunk[idx];
          const label = deviceLabelBySensorId.get(s.id);
          if (!label) return;
          out.push({ deviceLabel: String(label), value: res.value, updatedAt: res.updatedAt });
        });
      }

      // If multiple pH sensors per device, keep the most recent reading per device
      const byDevice = new Map();
      for (const row of out) {
        const prev = byDevice.get(row.deviceLabel);
        if (!prev) byDevice.set(row.deviceLabel, row);
        else {
          const tPrev = prev.updatedAt ? new Date(prev.updatedAt).getTime() : 0;
          const tNew = row.updatedAt ? new Date(row.updatedAt).getTime() : 0;
          if (tNew >= tPrev) byDevice.set(row.deviceLabel, row);
        }
      }
      const deduped = Array.from(byDevice.values());
      // Stable sort by label
      deduped.sort((a, b) => a.deviceLabel.localeCompare(b.deviceLabel));
      setRows(deduped);
    } catch (e) {
      setError(e?.message || 'Failed to load pH data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();

    // Refresh when sensor updates arrive
    const unsub = wsClient.subscribe((msg) => {
      if (!msg) return;
      if (msg.type === 'sensor.update') {
        // Lightweight debounce: re-fetch latest after a tick
        fetchAll();
      }
    });

    // Ensure a connection exists (no-op if already connected)
    wsClient.connect();

    const id = setInterval(fetchAll, 15000); // periodic safety refresh
    return () => { clearInterval(id); if (typeof unsub === 'function') unsub(); };
  }, []);

  const chart = useMemo(() => {
    const labels = rows.map(r => r.deviceLabel);
    const data = rows.map(r => r.value);

    return {
      data: {
        labels,
        datasets: [
          {
            label: 'pH',
            data,
            backgroundColor: PRIMARY_GREEN,
            borderRadius: 6,
            maxBarThickness: 32,
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const idx = ctx.dataIndex;
                const row = rows[idx];
                const when = row?.updatedAt ? new Date(row.updatedAt).toLocaleString() : '—';
                return `pH ${Number(ctx.parsed.y).toFixed(2)} • ${when}`;
              }
            }
          },
          title: { display: false }
        },
        scales: {
          x: {
            ticks: {
              color: '#6f8876',
              font: { weight: 600 },
              autoSkip: false,
              maxRotation: 0,
              minRotation: 0,
              callback: (val, idx) => {
                const label = labels[idx] || '';
                const ts = rows[idx]?.updatedAt;
                const date = ts ? new Date(ts).toLocaleDateString() : '';
                // Multi-line tick: device label on first line, date on second
                return date ? [label, date] : label;
              }
            },
            grid: { display: false },
          },
          y: {
            beginAtZero: false,
            suggestedMin: 4.5,
            suggestedMax: 8.0,
            grid: { color: 'rgba(139,167,151,0.15)' },
            ticks: { color: '#6f8876', font: { weight: 600 } }
          }
        }
      }
    };
  }, [rows]);

  return (
    <article className="panel">
      <header className="panel-head">
        <div className="panel-title">
          <Activity size={18} />
          <span>Latest pH by Device</span>
        </div>
      </header>
      <div className="panel-body" style={{ minHeight: 280 }}>
        {loading ? (
          <div style={{ padding: 24, color: '#6f8876' }}>Loading...</div>
        ) : error ? (
          <div style={{ padding: 24, color: '#b91c1c' }}>{error}</div>
        ) : rows.length === 0 ? (
          <div style={{ padding: 24, color: '#6f8876' }}>No pH sensors or no recent data.</div>
        ) : (
          <div style={{ height: 260, overflowX: 'auto', overflowY: 'hidden' }}>
            {/* Make the inner canvas wider based on number of devices so the user can scroll horizontally */}
            <div style={{ width: Math.max(600, rows.length * 140) }}>
              <Bar data={chart.data} options={chart.options} height={260} />
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

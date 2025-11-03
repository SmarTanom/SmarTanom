import { useEffect, useRef, useState } from 'react';

/**
 * Polls the latest readings for a device at a given interval using ETag/If-None-Match
 * and only updates items that change beyond per-sensor thresholds.
 *
 * @param {Object} params
 * @param {number|string} params.deviceId - Device ID to filter sensors.
 * @param {number} [params.intervalMs=3000] - Poll interval in ms.
 * @param {Object.<number, number>} [params.changeThresholds] - Map of sensor_id => min change to update.
 * @param {string} [params.authToken] - Optional Token for Authorization header.
 */
export function useLatestReadings({ deviceId, intervalMs = 3000, changeThresholds = {}, authToken }) {
  const [data, setData] = useState([]); // [{sensor_id, value, status, updated_at}]
  const etagRef = useRef(null);
  const visibleRef = useRef(typeof document !== 'undefined' ? document.visibilityState === 'visible' : true);

  useEffect(() => {
    const onVis = () => { visibleRef.current = document.visibilityState === 'visible'; };
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVis);
      return () => document.removeEventListener('visibilitychange', onVis);
    }
  }, []);

  useEffect(() => {
    if (!deviceId) return;
    let timer = null;
    let abortCtrl = null;

    const fetchOnce = async () => {
      if (!visibleRef.current) return;
      abortCtrl = new AbortController();
      const headers = {};
      if (etagRef.current) headers['If-None-Match'] = etagRef.current;
      if (authToken) headers['Authorization'] = `Token ${authToken}`;
      const res = await fetch(`/api/sensors/latest/?device=${encodeURIComponent(deviceId)}`, { headers, signal: abortCtrl.signal });
      if (res.status === 304) return;
      if (!res.ok) return;
      const newEtag = res.headers.get('ETag');
      if (newEtag) etagRef.current = newEtag;
      const json = await res.json();
      setData(prev => {
        const prevMap = new Map(prev.map(r => [r.sensor_id, r]));
        const merged = json.map(r => {
          const old = prevMap.get(r.sensor_id);
          if (!old) return r;
          const thr = changeThresholds[r.sensor_id] ?? 0; // sensor-specific threshold
          const oldVal = typeof old.value === 'number' ? old.value : NaN;
          const newVal = typeof r.value === 'number' ? r.value : NaN;
          const changed = (Number.isNaN(oldVal) || Number.isNaN(newVal)) || Math.abs(newVal - oldVal) > thr || old.status !== r.status;
          return changed ? r : old;
        });
        return merged;
      });
    };

    const loop = () => {
      fetchOnce().catch(() => {});
      timer = setTimeout(loop, intervalMs);
    };
    loop();

    return () => {
      if (timer) clearTimeout(timer);
      if (abortCtrl) abortCtrl.abort();
    };
  }, [deviceId, intervalMs, authToken]);

  return data;
}

export default useLatestReadings;

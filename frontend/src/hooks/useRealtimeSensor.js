/*
  useRealtimeSensor

  Lightweight React hook that subscribes to the existing WebSocket client
  and derives a stable, flicker-free sensor snapshot for a device.

  Features:
  - Smooth updates (throttled via requestAnimationFrame + min interval)
  - Exposes latest values and ISO timestamp
  - Auto-resumes on reconnect
  - No extra network calls (reuses singleton wsClient)
*/
import { useEffect, useMemo, useRef, useState } from 'react';
import { wsClient } from '../services/websocketClient';

const DEBUG = import.meta.env.VITE_DEBUG === 'true';

export function useRealtimeSensor(deviceIdOrSerial) {
  const [snapshot, setSnapshot] = useState(() => ({ sensors: {}, timestamp: null }));
  const rafRef = useRef(null);
  const lastPushRef = useRef(0);
  const minIntervalMs = 250; // keep UI smooth but realtime

  const deviceMatcher = useMemo(() => {
    const serial = (typeof deviceIdOrSerial === 'string') ? deviceIdOrSerial.toUpperCase() : null;
    const id = (typeof deviceIdOrSerial === 'number') ? deviceIdOrSerial : null;
    return { id, serial };
  }, [deviceIdOrSerial]);

  useEffect(() => {
    // Ensure one socket; connect lazily
    if (wsClient.getStatus() === 'disconnected') {
      wsClient.connect();
    }

    const unsubscribe = wsClient.subscribe((msg) => {
      if (!msg || msg.type !== 'sensor.update') return;

      // Filter messages for our device (by id or serial)
      const { id, serial } = deviceMatcher;
      if (id && msg.device_id !== id) return;
      if (serial && (String(msg.device_serial || '').toUpperCase() !== serial)) return;

      const apply = () => {
        setSnapshot((prev) => {
          // Merge new sensors into existing snapshot to avoid flicker
          const nextSensors = { ...(prev.sensors || {}), ...(msg.sensors || {}) };
          const nextTs = msg.timestamp || new Date().toISOString();
          return { sensors: nextSensors, timestamp: nextTs };
        });
      };

      const now = performance.now();
      if (now - lastPushRef.current >= minIntervalMs) {
        lastPushRef.current = now;
        apply();
      } else {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(() => {
          lastPushRef.current = performance.now();
          apply();
        });
      }
    });

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      unsubscribe && unsubscribe();
    };
  }, [deviceMatcher]);

  const latest = useMemo(() => {
    const s = snapshot.sensors || {};
    return {
      ph: typeof s.ph === 'number' ? s.ph : undefined,
      ec: typeof s.ec === 'number' ? s.ec : undefined,
      tds: typeof s.tds === 'number' ? s.tds : undefined,
      water_level: typeof s.water_level === 'number' ? s.water_level : undefined,
      water_temperature: typeof s.water_temperature === 'number' ? s.water_temperature : undefined,
      turbidity: typeof s.turbidity === 'number' ? s.turbidity : undefined,
      // qualitative statuses pass-through
      turbidity_status: typeof s.turbidity_status === 'string' ? s.turbidity_status : undefined,
      water_level_state: typeof s.water_level_state === 'string' ? s.water_level_state : undefined,
      updated_at: snapshot.timestamp,
    };
  }, [snapshot]);

  return latest;
}

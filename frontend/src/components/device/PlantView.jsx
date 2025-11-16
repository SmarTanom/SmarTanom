import React, { useMemo } from 'react';
import { Clock, Leaf } from 'lucide-react';

export default function PlantView({
  device,
  daysTillHarvest,
  metrics = {},
  classifyPH,
  classifyEC,
  classifyTDS,
  classifyWaterTemp,
}) {
  const start = device?.start_date ? new Date(device.start_date) : null;
  const end = device?.end_date ? new Date(device.end_date) : null;
  const now = new Date();
  const progress = useMemo(() => {
    if (!start || !end || isNaN(start) || isNaN(end) || end <= start) return 0;
    const total = end - start;
    const elapsed = Math.min(Math.max(0, now - start), total);
    return Math.round((elapsed / total) * 100);
  }, [start, end]);

  const ph = metrics.ph;
  const ec = metrics.ec;
  const tds = metrics.tds;
  const waterTemp = metrics.water_temp;

  const phC = classifyPH ? classifyPH(ph, device?.plant) : { severity: 'none' };
  const ecC = classifyEC ? classifyEC(ec, device?.plant) : { severity: 'none' };
  const tdsC = classifyTDS ? classifyTDS(tds, device?.plant) : { severity: 'none' };
  const wTC = classifyWaterTemp ? classifyWaterTemp(waterTemp, device?.plant) : { severity: 'none' };

  const kpiClass = (c) => c.severity === 'critical' ? 'kpi crit' : (c.severity === 'warning' ? 'kpi warn' : 'kpi');

  return (
    <div className="grid-2">
      <div className="card">
        <div className="card-body">
          <div className="plant-hero">
            <div className="image">
              <img src={device?.plant_photo_url || 'https://images.unsplash.com/photo-1466781783364-36c955e42a7f?w=800&auto=format&fit=crop'} alt={device?.plant_name || 'Plant'} />
            </div>
            <div className="plant-meta">
              <h2 className="plant-name">{device?.plant?.plant_name || device?.plant_name || 'No plant selected'}</h2>
              {device?.plant_variety ? <div className="plant-var">{device.plant_variety}</div> : null}
              <div className="progress" aria-label="Growth progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
                <span style={{ width: `${progress}%` }} />
              </div>
            </div>
          </div>

          <div className="kpis">
            <div className={kpiClass(phC)}>
              <Leaf size={18} />
              <div>
                <div className="v">{Number.isFinite(ph) ? ph : '—'}</div>
                <div className="label">pH</div>
              </div>
            </div>
            <div className={kpiClass(ecC)}>
              <Leaf size={18} />
              <div>
                <div className="v">{Number.isFinite(ec) ? ec : '—'}</div>
                <div className="label">EC (mS/cm)</div>
              </div>
            </div>
            <div className={kpiClass(tdsC)}>
              <Leaf size={18} />
              <div>
                <div className="v">{Number.isFinite(tds) ? tds : '—'}</div>
                <div className="label">TDS (ppm)</div>
              </div>
            </div>
            <div className={kpiClass(wTC)}>
              <Leaf size={18} />
              <div>
                <div className="v">{Number.isFinite(waterTemp) ? waterTemp : '—'}</div>
                <div className="label">Water Temp (°C)</div>
              </div>
            </div>
          </div>

          {/* Live sensor data is shown via KPI cards above to avoid duplication */}
        </div>
      </div>

      <div className="card">
        <div className="card-body countdown">
          <Clock size={22} />
          <div className="days">{daysTillHarvest == null ? '—' : (daysTillHarvest < 0 ? `+${Math.abs(daysTillHarvest)}` : daysTillHarvest)}</div>
          <div className="label">days until harvest</div>
        </div>
      </div>
    </div>
  );
}

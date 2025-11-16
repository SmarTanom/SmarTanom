import React, { useMemo, useState } from 'react';
import { TriangleAlert, CircleAlert, Sprout } from 'lucide-react';

const ICON = {
  warning: <TriangleAlert size={18} color="#E1554A" strokeWidth={2.5} />,
  critical: <TriangleAlert size={18} color="#E1554A" strokeWidth={2.5} />,
  harvest: <Sprout size={18} color="#339432" strokeWidth={2.5} />,
  info: <CircleAlert size={18} color="#8BA797" strokeWidth={2.5} />,
};

export default function LogsView({ entries = [], loading, error, onRetry }) {
  // Single, simple filter to avoid redundancy. Combines severity/type categories.
  const [filter, setFilter] = useState('all');

  const filtered = useMemo(() => {
    if (filter === 'all') return entries;
    return entries.filter(e => (e.type || 'info') === filter);
  }, [entries, filter]);

  return (
    <div className="card">
      <div className="card-body">
        <div className="filters">
          <select className="select" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter logs">
            <option value="all">All</option>
            <option value="warning">Warning</option>
            <option value="critical">Critical</option>
          </select>
        </div>

        {loading ? (
          <div className="pill">Loading logs…</div>
        ) : error ? (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div className="pill" style={{ borderColor: 'rgba(225,85,74,.25)', color: '#a2322b' }}>{String(error)}</div>
            {onRetry && <button className="btn-soft" onClick={onRetry}>Retry</button>}
          </div>
        ) : (
          <div className="list">
            {filtered.length === 0 ? (
              <div className="pill">No logs match the current filters.</div>
            ) : filtered.map((e) => (
              <div className="list-item" key={e.id || e.createdAt}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{ICON[e.type] || ICON.info}</div>
                <div>
                  <div className="title">{e.title}</div>
                  <div className="msg">{e.message}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className={`chip ${e.type === 'critical' ? 'crit' : e.type === 'warning' ? 'warn' : 'info'}`}>{e.type || 'info'}</span>
                  <span className="pill" style={{ fontWeight: 700 }}>{e.time}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import React from 'react';
export default function Spinner({ size = 20, color = '#339432', speed = 1, thickness }) {
  const ring = thickness != null ? thickness : Math.max(2, Math.floor(size / 10));
  const dur = Math.max(0.1, Number(speed) || 1);
  const style = {
    display: 'inline-block',
    width: size,
    height: size,
    border: `${ring}px solid rgba(0,0,0,0.1)`,
    borderTopColor: color,
    borderRadius: '50%',
    animation: `spin ${dur}s linear infinite`,
    willChange: 'transform',
  };
  return (
    <div aria-label="Loading" role="status" style={{ lineHeight: 0 }}>
      <div style={style} />
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } @media (prefers-reduced-motion: reduce) { .no-motion { animation: none !important; } }`}</style>
    </div>
  );
}

import React from 'react';
export default function Spinner({ size = 20, color = '#339432' }) {
  const style = {
    width: size,
    height: size,
    border: `${Math.max(2, Math.floor(size / 10))}px solid rgba(0,0,0,0.1)`,
    borderTopColor: color,
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  };
  return (
    <div>
      <div style={style} />
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

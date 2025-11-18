import React from 'react';

// Robust SVG spinner (never appears stuck): rotating arc + dash animation
export default function Spinner({ size = 20, color = '#339432', speed = 1, thickness }) {
  const stroke = thickness != null ? thickness : Math.max(2, Math.floor(size / 10));
  const dur = Math.max(0.1, Number(speed) || 1);
  const radius = (size - stroke) / 2;
  const center = size / 2;
  return (
    <span aria-label="Loading" role="status" style={{ display: 'inline-flex', lineHeight: 0 }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ animation: `spinner-rotate ${dur}s linear infinite`, transformOrigin: 'center' }}
      >
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="rgba(0,0,0,0.1)"
          strokeWidth={stroke}
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeLinecap="round"
          strokeWidth={stroke}
          style={{
            strokeDasharray: `${Math.PI * radius}, ${Math.PI * radius}`,
            animation: `spinner-dash ${Math.max(0.6, dur * 1.2)}s ease-in-out infinite`,
          }}
        />
      </svg>
      <style>{`
        @keyframes spinner-rotate { to { transform: rotate(360deg); } }
        @keyframes spinner-dash {
          0% { stroke-dasharray: 1, ${Math.PI * radius * 2}; stroke-dashoffset: 0; }
          50% { stroke-dasharray: ${Math.PI * radius * 0.8}, ${Math.PI * radius * 1.2}; stroke-dashoffset: -${Math.PI * radius * 0.3}; }
          100% { stroke-dasharray: ${Math.PI * radius * 0.8}, ${Math.PI * radius * 1.2}; stroke-dashoffset: -${Math.PI * radius}; }
        }
      `}</style>
    </span>
  );
}

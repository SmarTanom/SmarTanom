import React from 'react';

// SVG spinner using native animateTransform (no CSS keyframes) so it always spins
export default function Spinner({ size = 20, color = '#339432', speed = 1, thickness }) {
  const stroke = thickness != null ? thickness : Math.max(2, Math.floor(size / 10));
  const dur = `${Math.max(0.1, Number(speed) || 1)}s`;
  const radius = (size - stroke) / 2;
  const center = size / 2;
  const dash = Math.PI * radius * 0.8;
  const gap = Math.PI * radius * 1.2;
  return (
    <span aria-label="Loading" role="status" style={{ display: 'inline-flex', lineHeight: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}> 
        <g transform={`translate(${center} ${center})`}>
          <circle r={radius} fill="none" stroke="rgba(0,0,0,0.1)" strokeWidth={stroke} />
          <g>
            <circle
              r={radius}
              fill="none"
              stroke={color}
              strokeLinecap="round"
              strokeWidth={stroke}
              strokeDasharray={`${dash} ${gap}`}
            >
              <animateTransform attributeName="transform" attributeType="XML" type="rotate" from={`0 0 0`} to={`360 0 0`} dur={dur} repeatCount="indefinite" />
            </circle>
          </g>
        </g>
      </svg>
    </span>
  );
}

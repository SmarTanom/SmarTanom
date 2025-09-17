import React from 'react';

// Brand mark fallback as inline SVG resembling leaf + signal within a droplet.
export default function BrandMark({ size = 84, color = '#339432', variant = 'mark' }) {
  const s = size;
  return (
    <div style={{ width: s, height: s, borderRadius: Math.round(s*0.24), background: '#E6F3E6', display: 'grid', placeItems: 'center' }}>
      <svg width={Math.round(s*0.76)} height={Math.round(s*0.76)} viewBox="0 0 64 64" fill={color} aria-label="SmarTanom">
        <path d="M32 4C20 4 10 14 10 26c0 16 11 22 22 34 11-12 22-18 22-34C54 14 44 4 32 4zm0 8c7.7 0 14 6.3 14 14 0 11-7.7 15.4-14 22-6.3-6.6-14-11-14-22 0-7.7 6.3-14 14-14z"/>
        <path d="M22 30c8 0 14-6 14-14 8 0 8 14 0 20-4 3-10 3-14 0"/>
        <path d="M44 14c3 0 6 3 6 6"/>
        <path d="M40 18c3 0 6 3 6 6"/>
      </svg>
    </div>
  );
}

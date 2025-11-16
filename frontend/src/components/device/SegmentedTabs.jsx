import React from 'react';

export default function SegmentedTabs({ value, onChange, tabs }) {
  return (
    <div className="segmented" role="tablist" aria-label="Device sections">
      {tabs.map(t => (
        <button
          key={t.value}
          className={value === t.value ? 'active' : ''}
          onClick={() => onChange(t.value)}
          role="tab"
          aria-selected={value === t.value}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

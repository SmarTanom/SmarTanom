import React from 'react';

export default function AuthLayout({ children }) {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '16px' }}>
      <div className="card" style={{ maxWidth: 480, width: '100%' }}>
        {children}
      </div>
    </div>
  );
}

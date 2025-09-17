import React from 'react';
export default function HelperText({ tone = 'muted', children }) {
  const className = tone === 'success' ? 'success-text' : tone === 'error' ? 'error-text' : 'small text-muted';
  return <p className={className}>{children}</p>;
}

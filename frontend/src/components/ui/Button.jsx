import React from 'react';

export default function Button({ variant = 'primary', children, style, disabled, ...props }) {
  const className = ['btn', variant === 'outline' ? 'btn-outline' : variant === 'gradient' ? 'btn-gradient' : 'btn-primary']
    .filter(Boolean)
    .join(' ');
  return (
    <button className={className} style={style} disabled={disabled} {...props}>
      {children}
    </button>
  );
}

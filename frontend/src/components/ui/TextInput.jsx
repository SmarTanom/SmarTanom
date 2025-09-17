import React from 'react';

export default function TextInput({ error, ...props }) {
  const className = ['input', error ? 'error' : ''].join(' ').trim();
  return (
    <div>
      <input className={className} {...props} />
      {error ? <div className="error-text" role="alert">{error}</div> : null}
    </div>
  );
}

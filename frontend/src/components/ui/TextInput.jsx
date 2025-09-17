import React from 'react';

export default function TextInput({ error, className = '', id, ariaDescribedby, ...props }) {
  const inputClass = ['input', className, error ? 'error' : ''].filter(Boolean).join(' ').trim();
  const describedBy = error ? (ariaDescribedby || `${id || props.name}-error`) : ariaDescribedby;
  return (
    <div>
      <input id={id} className={inputClass} aria-describedby={describedBy} aria-invalid={!!error} {...props} />
      {error ? <div id={describedBy} className="error-text" role="alert">{error}</div> : null}
    </div>
  );
}

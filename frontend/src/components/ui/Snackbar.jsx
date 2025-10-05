import React, { useEffect, useRef } from 'react';

/** Adaptive Snackbar
 * Props:
 *  open: boolean
 *  message: string | ReactNode
 *  variant?: 'success' | 'error' | 'info'
 *  onClose?: () => void (called after auto-dismiss)
 *  duration?: number (ms) default 3500
 */
export default function Snackbar({ open, message, variant = 'success', onClose, duration = 3500 }) {
  const timerRef = useRef(null);
  const firstRender = useRef(true);

  useEffect(() => {
    if (!open) return; // only set a timer when opened
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (onClose) onClose();
    }, duration);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [open, duration, onClose]);

  // Accessibility: announce new messages only after first paint if content changes
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
  }, [message]);

  if (!open) return null;

  const Icon = () => {
    switch (variant) {
      case 'error':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="13" />
            <line x1="12" y1="16" x2="12" y2="16" />
          </svg>
        );
      case 'info':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12" y2="8" />
          </svg>
        );
      case 'success':
      default:
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        );
    }
  };

  return (
    <div
      className={`snackbar snackbar-${variant}`}
      role="status"
      aria-live="polite"
      aria-label={`${variant} notification`}
      data-variant={variant}
    >
      <span className="snackbar-accent" aria-hidden="true" />
      <span className="snackbar-icon" aria-hidden="true"><Icon /></span>
      <div className="snackbar-content" aria-atomic="true">
        <span className="snackbar-message">{message}</span>
      </div>
    </div>
  );
}

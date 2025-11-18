import React, { useEffect } from 'react';
import '../../assets/styles/Toast.css';

/**
 * Simple Toast component
 * Props:
 * - open: boolean
 * - message: string
 * - type: 'success' | 'error' | 'info'
 * - duration: ms (default 3000)
 * - onClose: function
 */
export default function Toast({ open, message, type = 'info', duration = 3000, onClose }) {
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      onClose && onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [open, duration, onClose]);

  if (!open) return null;

  return (
    <div className={`toast-container`} role="status" aria-live="polite">
      <div className={`toast toast-${type}`}>
        <span className="toast-message">{message}</span>
      </div>
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

export function Toast({ type = 'info', message, onClose, duration = 5000 }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(onClose, 300); // Delay close to allow animation
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible, duration, onClose]);

  if (!visible) return null;

  const getIcon = () => {
    switch (type) {
      case 'success': return <CheckCircle size={20} className="toast-icon" />;
      case 'error': return <AlertCircle size={20} className="toast-icon" />;
      case 'info': return <Info size={20} className="toast-icon" />;
      default: return <Info size={20} className="toast-icon" />;
    }
  };

  const getClassName = () => {
    switch (type) {
      case 'success': return 'toast-success';
      case 'error': return 'toast-error';
      case 'info': return 'toast-info';
      default: return 'toast-info';
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      zIndex: 10000,
      minWidth: '300px',
      maxWidth: '500px',
      padding: 0,
      borderRadius: '12px',
      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
      animation: 'toastSlideIn 0.3s ease-out',
      fontFamily: "'Montserrat', sans-serif"
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '16px 20px',
        borderRadius: '12px',
        borderLeft: '4px solid',
        borderLeftColor: type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6',
        background: type === 'success' ? 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)' :
                 type === 'error' ? 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)' :
                 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)'
      }}>
        {getIcon()}
        <div style={{
          flex: 1,
          fontSize: '14px',
          fontWeight: '500',
          color: '#374151',
          lineHeight: 1.4
        }}>{message}</div>
        <button
          style={{
            background: 'none',
            border: 'none',
            padding: '4px',
            cursor: 'pointer',
            color: '#6b7280',
            borderRadius: '4px',
            transition: 'all 0.2s ease',
            flexShrink: 0
          }}
          onClick={() => {
            setVisible(false);
            setTimeout(onClose, 300);
          }}
          onMouseEnter={(e) => {
            e.target.style.background = 'rgba(0, 0, 0, 0.1)';
            e.target.style.color = '#374151';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'none';
            e.target.style.color = '#6b7280';
          }}
          aria-label="Close toast"
        >
          <X size={16} />
        </button>
      </div>
      <style>
        {`
          @keyframes toastSlideIn {
            from {
              transform: translateX(100%);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
          @media (max-width: 600px) {
            .toast {
              left: 20px;
              right: 20px;
              min-width: auto;
            }
          }
        `}
      </style>
    </div>
  );
}

import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import './confirm-modal.css';

/**
 * ConfirmModal
 * Props:
 * - isOpen: boolean
 * - title: string
 * - description?: string | ReactNode
 * - confirmText?: string (default: 'Confirm')
 * - cancelText?: string (default: 'Cancel')
 * - onConfirm: () => void
 * - onCancel: () => void
 * - confirmVariant?: 'primary' | 'danger' (default: 'primary')
 * - disableBackdropClose?: boolean (default: false)
 */
export default function ConfirmModal({
  isOpen,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  confirmVariant = 'primary',
  disableBackdropClose = false,
}) {
  const confirmBtnRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCancel?.();
      }
      if ((e.key === 'Enter' || e.keyCode === 13) && document.activeElement?.tagName !== 'TEXTAREA') {
        // Trigger confirm on Enter
        onConfirm?.();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    // focus confirm button by default
    const t = setTimeout(() => confirmBtnRef.current?.focus(), 0);
    // prevent body scroll
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      clearTimeout(t);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onCancel, onConfirm]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" onClick={() => !disableBackdropClose && onCancel?.()}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" aria-label="Close" onClick={onCancel}>
            <X size={24} />
          </button>
        </div>
        <div className="modal-body">
          {typeof description === 'string' ? (
            <p style={{ margin: 0 }}>{description}</p>
          ) : (
            description || null
          )}
        </div>
        <div className="modal-footer">
          <button className="btn-cancel" onClick={onCancel}> {cancelText} </button>
          <button
            ref={confirmBtnRef}
            className={`btn-confirm ${confirmVariant === 'danger' ? 'danger' : ''}`}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

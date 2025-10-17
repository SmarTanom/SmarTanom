import React, { useEffect, useRef, useState, useCallback } from 'react';
import './OtpInput.css';

/**
 * Accessible multi-digit OTP input component.
 * Props:
 *  - length (number): number of digits (default 6)
 *  - value (string): controlled value (length <= digits)
 *  - onChange(code: string)
 *  - onComplete?(code: string)
 *  - disabled (bool)
 *  - autoFocus (bool)
 *  - hasError (bool)
 *  - name (string) base name for inputs (e.g., "otp")
 *  - ariaLabel (string) group label
 *  - inputMode (default numeric)
 */
export default function OtpInput({
  length = 6,
  value = '',
  onChange,
  onComplete,
  disabled = false,
  autoFocus = true,
  hasError = false,
  name = 'otp',
  ariaLabel = 'One time password',
  inputMode = 'numeric',
  variant = 'default' // 'default' | 'light'
}) {
  const [internal, setInternal] = useState(() => pad(value));
  const refs = useRef([]);

  function pad(v){
    const str = (v || '').slice(0, length).padEnd(length, '');
    return str.split(''); // Convert string to array
  }

  // Sync external value changes
  useEffect(()=>{
    setInternal(pad(value));
  }, [value, length]);

  const emit = useCallback((next) => {
    const code = next.join('');
    if (onChange) onChange(code);
    if (onComplete && code.length === length && !next.includes('')) {
      onComplete(code);
    }
  }, [length, onChange, onComplete]);

  function focusIndex(i){
    const el = refs.current[i];
    if (el && el.focus) {
      try { el.focus(); } catch(_){}
    }
  }

  function handleChange(i, raw){
    if (disabled) return;
    const v = raw.replace(/\D/g, '');
    const next = [...internal];

    if (!v) {
      // If the input is empty, clear the current field
      next[i] = '';
      setInternal(next);
      emit(next);
      return;
    }

    // Handle single digit input
    if (v.length === 1) {
      next[i] = v;
      setInternal(next);
      emit(next);
      if (i < length - 1) {
        focusIndex(i + 1);
      } else {
        // Last field filled -> optionally blur
        const last = refs.current[i];
        if (last) last.blur();
      }
    } else {
      // Handle paste or multiple digits typed quickly
      const chars = v.split('').slice(0, length - i);
      chars.forEach((c, idx) => {
        if (i + idx < length) {
          next[i + idx] = c;
        }
      });
      setInternal(next);
      emit(next);
      const targetIndex = Math.min(i + chars.length - 1, length - 1);
      if (targetIndex < length - 1) {
        focusIndex(targetIndex + 1);
      } else {
        const last = refs.current[targetIndex];
        if (last) last.blur();
      }
    }
  }

  function handleKeyDown(i, e){
    if (disabled) return;
    if (e.key === 'Backspace') {
      if (internal[i]) {
        // If current field has a value, clear it
        const next = [...internal];
        next[i] = '';
        setInternal(next);
        emit(next);
      } else if (i > 0) {
        // If current field is empty, move to previous and clear it
        const next = [...internal];
        next[i - 1] = '';
        setInternal(next);
        emit(next);
        focusIndex(i - 1);
      }
    } else if (e.key === 'ArrowLeft' && i > 0) {
      e.preventDefault();
      focusIndex(i - 1);
    } else if (e.key === 'ArrowRight' && i < length - 1) {
      e.preventDefault();
      focusIndex(i + 1);
    }
  }

  function handlePaste(e){
    if (disabled) return;
    const text = e.clipboardData.getData('text');
    if (!text) return;
    const digits = text.replace(/\D/g,'').slice(0, length).split('');
    if (!digits.length) return;
    e.preventDefault();
    const next = Array.from({length}, (_,i)=> digits[i] || '');
    setInternal(next);
    emit(next);
    if (!next.includes('')) {
      const last = refs.current[length-1];
      if (last) last.blur();
    }
  }

  // Auto focus first empty on mount
  useEffect(()=>{
    if (!autoFocus || disabled) return;
    const internalArray = Array.isArray(internal) ? internal : internal.split('');
    const firstEmpty = internalArray.findIndex(c=> !c);
    focusIndex(firstEmpty === -1 ? 0 : firstEmpty);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`otp-root${hasError? ' error':''} otp-variant-${variant}`} role="group" aria-label={ariaLabel} onPaste={handlePaste}>
      {internal.map((ch, i)=>(
        <input
          key={i}
            ref={el => refs.current[i] = el}
            id={`${name}-${i}`}
            className="otp-cell"
            type="text"
            inputMode={inputMode}
            pattern="[0-9]*"
            autoComplete="one-time-code"
            maxLength={1}
            aria-label={`Digit ${i+1}`}
            aria-invalid={hasError || undefined}
            disabled={disabled}
            value={ch}
            data-filled={!!ch}
            onChange={e=> handleChange(i, e.target.value)}
            onKeyDown={e=> handleKeyDown(i, e)}
        />
      ))}
    </div>
  );
}

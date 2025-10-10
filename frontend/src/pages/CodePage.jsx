import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthFlow } from '../features/auth/AuthFlowContext.jsx';
import BrandMark from '../components/brand/BrandMark.jsx';
import '../pages/AuthCodePage.css';
import { ChevronLeftFilled } from '../components/ui/Icon.jsx';
import { verifyCode, requestCode } from '../services/api/auth.js';
// Legacy page (deprecated). OTP now inlined directly on EmailPage / Signup step 4.

export default function CodePage({ mode = 'signin' }) {
  const navigate = useNavigate();
  const { email, setMode } = useAuthFlow();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [statusMsg, setStatusMsg] = useState('');
  const [resendSuccess, setResendSuccess] = useState(false);

  React.useEffect(() => setMode(mode), [mode, setMode]);

  // Cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => setResendCooldown(c => c - 1), 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  async function handleResendCode() {
    if (resendCooldown > 0) return;
    setError('');
    setResendSuccess(false);
    setStatusMsg('Resending code…');
    try {
      await requestCode({ email, mode });
      setResendSuccess(true);
      setStatusMsg('Code sent! Check your email.');
      setResendCooldown(30);
    } catch (err) {
      setStatusMsg('Failed to resend code.');
      setError(err?.message || 'Could not resend code. Please try again.');
      setResendCooldown(10);
    }
  }

  async function handleConfirm(e) {
    e.preventDefault();
    setError('');
    if (code.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }
    setLoading(true);
    setStatusMsg('Verifying…');
    try {
      const resp = await verifyCode({ email, code, mode });
      setStatusMsg('Verification successful!');
      if (mode === 'signup') {
        navigate('/signup/username');
      } else {
        // Store token in memory/localStorage if desired by app; backend also supports DRF Token
        // Example minimal handling:
        if (resp?.token) {
          try { localStorage.setItem('auth_token', resp.token); } catch {}
        }
        navigate('/');
      }
    } catch (err) {
      setStatusMsg('Verification failed.');
      setError(err?.message || 'Code expired or invalid. Please try again or request a new code.');
    } finally {
      setLoading(false);
    }
  }

  const heading = 'Verify Your Identity';
  const subtext = `Enter the 6-digit code sent to ${email?.replace(/(.{3}).*(@.*)/, '$1***$2') || 'your email'}`;

  return (
    <div className="auth-screen-root">
      <div className="auth-content-wrapper">
        <div className="auth-screen-inner">
          <div className="auth-top-bar auth-fade-item">
            <button
              type="button"
              className="auth-back-btn"
              onClick={() => navigate(-1)}
              aria-label="Go back"
            >
              <ChevronLeftFilled className="auth-back-icon" size={22} color="#ffffff" aria-hidden="true" />
              <span className="auth-back-text">BACK</span>
            </button>
            <div className="auth-brand">
              <BrandMark variant="white" className="brand-logo-img" />
              <span className="auth-brand-wordmark">SMARTANOM</span>
            </div>
          </div>
          <div className="auth-content auth-fade-item">
            <header className="auth-code-header" style={{ gap: 'clamp(12px, 2vh, 18px)', textAlign: 'center', alignItems: 'center' }}>
              <h1 className="auth-title" style={{ textAlign: 'center' }}>{heading}</h1>
              <p className="auth-subtext" style={{ textAlign: 'center' }}>{subtext}</p>
            </header>
            <form className="auth-form" onSubmit={handleConfirm} noValidate>
              <p style={{fontSize:'14px', opacity:.8}}>[Deprecated screen] Use the main email screen; this page will be removed.</p>
              <div className="visually-hidden" aria-live="polite">{statusMsg}</div>
              {error && <div className="auth-error" role="alert">{error}</div>}
              {resendSuccess && <div className="auth-success" role="status">✓ Code sent! Check your email.</div>}
              {resendCooldown > 0 && (
                <div className="auth-helper" style={{ fontSize: '12px', opacity: 0.75 }}>
                  Resend available in {resendCooldown}s
                </div>
              )}
              <button type="submit" className="auth-submit" disabled={loading || code.length !== 6}>
                {loading && <i className="fa-solid fa-spinner fa-spin" aria-hidden="true" />}
                <span>{loading ? 'Verifying...' : 'Verify Code'}</span>
              </button>
              <button 
                type="button" 
                className="auth-link" 
                onClick={handleResendCode}
                disabled={resendCooldown > 0}
                style={{ alignSelf: 'center', opacity: resendCooldown > 0 ? 0.5 : 1 }}
                aria-label={resendCooldown > 0 ? `Resend disabled, ${resendCooldown} seconds remaining` : 'Resend verification code'}
              >
                {resendCooldown > 0 ? `Resend (${resendCooldown}s)` : "Didn't receive a code? Resend"}
              </button>
              <div className="auth-helper auth-fade-item">Check your email inbox and spam folder for the verification code.</div>
            </form>
          </div>
        </div>
      </div>
      <div className="auth-image-column" aria-hidden="true" />
    </div>
  );
}

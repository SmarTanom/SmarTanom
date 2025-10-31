import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthFlow } from '../features/auth/AuthFlowContext.jsx';
import BrandMark from '../components/brand/BrandMark.jsx';
import '../pages/AuthEmailPage.css';
import { Mail as MailIcon, ChevronLeftFilled } from '../components/ui/Icon.jsx';
import { authApi } from '../services/apiClient.js';
import { useAuthActions } from '../contexts/AuthContext.jsx';
// OtpInput removed per request; inlining digit inputs locally

// Inline validation helpers
function isValidEmail(email) { return /[^@\s]+@[^@\s]+\.[^@\s]+/.test(email); }

export default function EmailPage({ mode = 'signin' }) {
  const navigate = useNavigate();
  const { setMode, email, setEmail, codeSent, setCodeSent } = useAuthFlow();
  const { login } = useAuthActions();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [code, setCode] = useState('');
  const [otpError, setOtpError] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRef = useRef(null);
  const otpRefs = useRef([]);
  const switchModeBtnRef = useRef(null);
  const [showSwitchToSignin, setShowSwitchToSignin] = useState(false);

  // Auto-focus the switch-to-sign-in button when it appears for accessibility
  useEffect(() => {
    if (showSwitchToSignin && switchModeBtnRef.current) {
      try { switchModeBtnRef.current.focus(); } catch { }
    }
  }, [showSwitchToSignin]);

  // Ensure mode is synced when component mounts or prop changes
  useEffect(() => setMode(mode), [mode, setMode]);

  async function handleSendCode(e) {
    e.preventDefault();
    setError('');
    const trimmed = email.trim();
    if (!trimmed) {
      setError('Email is required.');
      inputRef.current?.focus();
      return;
    }
    if (!isValidEmail(trimmed)) {
      setError("That doesn't look like a valid email.");
      inputRef.current?.focus();
      return;
    }
    setLoading(true);
    try {
      const purpose = mode === 'signup' ? 'register' : 'login';
      const data = await authApi.requestOtp(trimmed, purpose);
      // Align UI mode with used purpose so verify step stays consistent
      const used = data?.used_purpose || purpose;
      if (used === 'register' && mode !== 'signup') {
        setMode('signup');
      } else if (used === 'login' && mode !== 'signin') {
        setMode('signin');
      }
      setCodeSent(true);
      setStatusMsg('Code sent! Check your email.');
      setResendCooldown(30);
    } catch (err) {
      setError(err?.message || 'Could not send code. Please retry.');
    } finally {
      setLoading(false);
    }
  }

  // resend logic
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown(c => c - 1), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  // auto-focus first empty OTP digit when entering code phase
  useEffect(() => {
    if (!codeSent) return;
    const firstEmpty = code.split('').findIndex(c => !c);
    const idx = firstEmpty === -1 ? 0 : firstEmpty;
    const el = otpRefs.current[idx];
    if (el && el.focus) {
      try { el.focus(); } catch { }
    }
  }, [codeSent, code]);

  // Helper function to go back to email input
  const handleChangeEmail = () => {
    setCodeSent(false);
    setCode('');
    setOtpError('');
    setStatusMsg('Enter your email address to receive a new verification code');
    setResendCooldown(0);
    // Auto-focus email input when going back
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  async function handleVerify(e) {
    e.preventDefault();
    if (code.length !== 6) {
      setOtpError('Enter the complete 6-digit code');
      return;
    }
    setOtpError('');
    setVerifying(true);
    setStatusMsg('Verifying…');
    try {
      const resp = await authApi.verifyOtp(email, code);
      setStatusMsg('Verification successful!');
      // Persist token if provided (login or register)
      if (resp?.token) {
        try { localStorage.setItem('authToken', resp.token); } catch { }
      }
      // If this is a signup-first flow, continue onboarding to username
      if (mode === 'signup' || resp?.flow_hint === 'signup_created') {
        navigate('/signup/username');
        return;
      }
      // Otherwise, after successful sign-in, fetch profile and route by role
      const token = resp?.token || localStorage.getItem('authToken');

      // Update global auth context immediately to avoid ProtectedRoute bouncing back to landing
      let userProfile = null;
      if (token) {
        try {
          const result = await login(token);
          if (result?.success) {
            userProfile = result.user;
          }
        } catch (_) { }
      }

      // Decide destination based on role and last visited page
      const lastPage = localStorage.getItem('lastVisitedPage');
      const role = userProfile?.role || userProfile?.user?.role;
      const isAdmin = userProfile?.is_admin === true || userProfile?.user?.is_admin === true || role === 'admin';

      let target = '/dashboard';
      if (isAdmin) {
        target = '/admin';
      } else if (lastPage && lastPage !== '/') {
        console.log('[EmailPage] Redirecting to last visited page:', lastPage);
        target = lastPage;
      }

      navigate(target, { replace: true });
    } catch (err) {
      setStatusMsg('');
      const errorMsg = err?.message || 'Invalid or expired code.';

      // Provide helpful error message with guidance
      if (errorMsg.toLowerCase().includes('invalid') || errorMsg.toLowerCase().includes('incorrect') || errorMsg.toLowerCase().includes('wrong')) {
        setOtpError('Code is incorrect. Please check your email for the right code, or use "Change Email Address" below if you entered the wrong email.');
      } else if (errorMsg.toLowerCase().includes('expired')) {
        setOtpError('Code has expired. Please request a new code using "Resend" or change your email address if needed.');
      } else {
        setOtpError(`${errorMsg} Please check your email for the correct code, or use "Change Email Address" if needed.`);
      }

      // Clear the code to let user re-enter
      setCode('');
      // Focus first input for better UX
      setTimeout(() => {
        const firstInput = otpRefs.current[0];
        if (firstInput && firstInput.focus) {
          try { firstInput.focus(); } catch { }
        }
      }, 100);
    } finally {
      setVerifying(false);
    }
  }

  async function handleResend() {
    if (resendCooldown > 0) return;
    try {
      const purpose = mode === 'signup' ? 'register' : 'login';
      await authApi.requestOtp(email, purpose);
      setStatusMsg('Code resent!');
      setResendCooldown(30);
      setOtpError('');
    } catch (err) {
      setOtpError(err?.message || 'Could not resend code');
      setResendCooldown(10);
    }
  }

  const heading = mode === 'signin' ? 'Welcome Back!' : 'Create Your Account';
  const subtext = mode === 'signin'
    ? 'Enter your email address to receive a verification code to login.'
    : 'Create new account to start your hydroponic monitoring journey.';

  return (
    <div className="auth-screen-root">
      <div className="auth-content-wrapper">
        <div className="auth-screen-inner">
          <div className="auth-top-bar auth-fade-item">
            <button
              type="button"
              className="auth-back-btn"
              onClick={() => codeSent ? handleChangeEmail() : navigate(-1)}
              aria-label={codeSent ? "Go back to email input" : "Go back"}
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
            <header className="auth-header" style={{ gap: 'clamp(12px, 2vh, 18px)' }}>
              <h1 className="auth-title">{codeSent ? 'Verify Your Identity' : heading}</h1>
              <p className="auth-subtext">{codeSent ? `Enter the 6-digit code sent to ${email?.replace(/(.{3}).*(@.*)/, '$1***$2')}` : subtext}</p>
            </header>
            {!codeSent && (
              <form className="auth-form" onSubmit={handleSendCode} noValidate>
                <div className="auth-field auth-field--welcome-variant">
                  <label htmlFor="email" className="auth-field-label">Email</label>
                  <div className="auth-input-wrapper auth-input-wrapper--welcome">
                    <MailIcon className="auth-mail-icon auth-mail-icon--welcome" size={20} color="currentColor" stroke={2} aria-hidden="true" />
                    <input
                      ref={inputRef}
                      id="email"
                      name="email"
                      type="email"
                      className="auth-input auth-input--welcome"
                      placeholder="Enter your email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      aria-invalid={!!error}
                      aria-describedby={error ? 'email-error' : undefined}
                      autoComplete="email"
                      inputMode="email"
                    />
                  </div>
                  {error && <div id="email-error" className="auth-error" role="alert">{error}</div>}
                </div>
                <button type="submit" className="auth-submit" disabled={loading}>
                  {loading && <i className="fa-solid fa-spinner fa-spin" aria-hidden="true" />}
                  <span>{loading ? 'Sending...' : 'Send Verification Code'}</span>
                </button>
                <div className="auth-helper auth-fade-item">We'll send a secure code to verify your identity.</div>
                {showSwitchToSignin && (
                  <button
                    ref={switchModeBtnRef}
                    type="button"
                    className="auth-alt-action"
                    onClick={() => { setShowSwitchToSignin(false); setMode('signin'); setStatusMsg('Switched to Sign In. Enter your email to receive a code.'); }}
                    aria-describedby={statusMsg ? 'status-msg' : undefined}
                  >
                    Switch to Sign In
                  </button>
                )}
                <span role="status" aria-live="polite">{loading ? 'Request in progress' : ''}</span>
              </form>
            )}
            {codeSent && (
              <form className="auth-form" onSubmit={handleVerify} noValidate>
                <div className={`inline-otp-group ${otpError ? 'error' : ''}`} role="group" aria-label="Verification code">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <input
                      key={i}
                      id={`otp-${i}`}
                      ref={el => otpRefs.current[i] = el}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      className="inline-otp-cell"
                      aria-label={`Digit ${i + 1}`}
                      aria-invalid={otpError || undefined}
                      value={code[i] || ''}
                      data-filled={code[i] ? 'true' : 'false'}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        if (!val) {
                          const next = code.split('');
                          next[i] = '';
                          const joined = next.join('');
                          setCode(joined);
                          return;
                        }
                        const next = code.padEnd(6, '').split('');
                        next[i] = val[0];
                        const joined = next.join('');
                        setCode(joined);
                        if (i < 5) {
                          const nextEl = document.getElementById(`otp-${i + 1}`);
                          nextEl && nextEl.focus();
                        } else {
                          // all digits maybe filled
                          if (!next.includes('')) setStatusMsg('Code entered. Ready to verify.');
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Backspace' && !code[i] && i > 0) {
                          const prev = document.getElementById(`otp-${i - 1}`);
                          prev && prev.focus();
                        } else if (e.key === 'ArrowLeft' && i > 0) {
                          e.preventDefault();
                          document.getElementById(`otp-${i - 1}`)?.focus();
                        } else if (e.key === 'ArrowRight' && i < 5) {
                          e.preventDefault();
                          document.getElementById(`otp-${i + 1}`)?.focus();
                        }
                      }}
                      onPaste={(e) => {
                        const text = e.clipboardData.getData('text');
                        if (!text) return;
                        const digits = text.replace(/\D/g, '').slice(0, 6).split('');
                        if (!digits.length) return;
                        e.preventDefault();
                        const next = Array.from({ length: 6 }, (_, idx) => digits[idx] || code[idx] || '');
                        setCode(next.join(''));
                        if (!next.includes('')) {
                          setStatusMsg('Code entered. Ready to verify.');
                          const last = document.getElementById('otp-5');
                          last && last.blur();
                        }
                      }}
                      disabled={verifying}
                    />
                  ))}
                </div>
                <div className="visually-hidden" aria-live="polite">{statusMsg}</div>
                {otpError && <div className="auth-error" role="alert">{otpError}</div>}
                <button type="submit" className="auth-submit" disabled={verifying || code.length !== 6}>
                  {verifying && <i className="fa-solid fa-spinner fa-spin" aria-hidden="true" />}
                  <span>{verifying ? 'Verifying...' : 'Verify Code'}</span>
                </button>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', marginTop: '12px' }}>
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendCooldown > 0}
                    style={{ 
                      background: 'none',
                      border: 'none',
                      color: resendCooldown > 0 ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.9)',
                      fontSize: '13px',
                      textDecoration: 'underline',
                      cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer',
                      padding: '4px 8px'
                    }}
                    aria-label={resendCooldown > 0 ? `Resend code disabled, ${resendCooldown} seconds remaining` : 'Resend verification code to your email'}
                  >
                    {resendCooldown > 0 ? `Resend (${resendCooldown}s)` : "Didn't receive a code? Resend"}
                  </button>
                </div>
                <div className="auth-helper auth-fade-item">Check your email inbox and spam folder for the code.</div>
              </form>
            )}
          </div>
        </div>
      </div>
      <div className="auth-image-column" aria-hidden="true" />
    </div>
  );
}

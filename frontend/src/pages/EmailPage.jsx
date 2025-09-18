import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthFlow } from '../features/auth/AuthFlowContext.jsx';
import BrandMark from '../components/brand/BrandMark.jsx';
import '../pages/AuthEmailPage.css';
import { Mail as MailIcon, ChevronLeftFilled } from '../components/ui/Icon.jsx';

// Inline validation helpers
function isValidEmail(email) { return /[^@\s]+@[^@\s]+\.[^@\s]+/.test(email); }

export default function EmailPage({ mode = 'signin' }) {
  const navigate = useNavigate();
  const { setMode, email, setEmail, setCodeSent } = useAuthFlow();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  React.useEffect(() => setMode(mode), [mode, setMode]);

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
      // TODO: Integrate backend request for verification code
      // await api.auth.requestCode({ email: trimmed, mode });
      await new Promise(r => setTimeout(r, 650));
      setCodeSent(true);
      navigate(`/${mode}/code`);
    } catch (err) {
      // TODO: Map backend error codes to friendly messages
      setError('Could not send code. Please retry.');
    } finally {
      setLoading(false);
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
            <header style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(12px, 2vh, 18px)', alignItems: 'flex-start', width: '100%' }}>
              <h1 className="auth-title">{heading}</h1>
              <p className="auth-subtext">{subtext}</p>
            </header>
            <form className="auth-form" onSubmit={handleSendCode} noValidate>
              <div className="auth-field">
                <label htmlFor="email" className="auth-field-label">Email</label>
                <div className="auth-input-wrapper">
                  <MailIcon className="auth-mail-icon" size={20} color="#ffffff" stroke={2} aria-hidden="true" />
                  <input
                    ref={inputRef}
                    id="email"
                    name="email"
                    type="email"
                    className="auth-input"
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
              <span role="status" aria-live="polite">{loading ? 'Request in progress' : ''}</span>
            </form>
          </div>
        </div>
      </div>
      <div className="auth-image-column" aria-hidden="true" />
    </div>
  );
}

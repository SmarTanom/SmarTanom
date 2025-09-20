import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthFlow } from '../features/auth/AuthFlowContext.jsx';
import BrandMark from '../components/brand/BrandMark.jsx';
import '../pages/AuthCodePage.css';
import { ChevronLeftFilled } from '../components/ui/Icon.jsx';

export default function CodePage({ mode = 'signin' }) {
  const navigate = useNavigate();
  const { email, setMode } = useAuthFlow();
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef([]);

  React.useEffect(() => setMode(mode), [mode, setMode]);

  function handleChange(i, v) {
    if (/^\d?$/.test(v)) {
      const copy = [...digits];
      copy[i] = v;
      setDigits(copy);
      
      // Auto-focus next input
      if (v && i < 5) {
        inputRefs.current[i + 1]?.focus();
      }
    }
  }

  function handleKeyDown(i, e) {
    // Handle backspace to go to previous input
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      inputRefs.current[i - 1]?.focus();
    }
  }

  async function handleResendCode() {
    setError('');
    try {
      // TODO: Implement resend code API call
      await new Promise(r => setTimeout(r, 500));
    } catch (err) {
      setError('Could not resend code. Please try again.');
    }
  }

  async function handleConfirm(e) {
    e.preventDefault();
    setError('');
    const code = digits.join('');
    if (code.length !== 6) {
      setError('Please enter the complete 6-digit code');
      inputRefs.current[0]?.focus();
      return;
    }
    setLoading(true);
    try {
      // TODO: Call backend to verify code for email
      // const ok = await api.auth.verifyCode({ email, code, mode })
      await new Promise(r => setTimeout(r, 650));
      if (mode === 'signup') {
        navigate('/signup/username');
      } else {
        // TODO: On success, backend will return tokens/session. Store via secure storage.
        navigate('/');
      }
    } catch (err) {
      // TODO: Display backend error message here if verification fails
      setError('Code expired or invalid. Please try again or request a new code.');
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
            <header className="auth-code-header" style={{ gap: 'clamp(12px, 2vh, 18px)' }}>
              <h1 className="auth-title">{heading}</h1>
              <p className="auth-subtext">{subtext}</p>
            </header>
            <form className="auth-form" onSubmit={handleConfirm} noValidate>
              <div className="auth-otp-grid">
                {digits.map((d, i) => (
                  <input
                    key={i}
                    ref={el => inputRefs.current[i] = el}
                    inputMode="numeric"
                    aria-label={`Digit ${i + 1}`}
                    className={`auth-otp-input ${error ? 'error' : ''}`}
                    value={d}
                    onChange={e => handleChange(i, e.target.value)}
                    onKeyDown={e => handleKeyDown(i, e)}
                    maxLength={1}
                    aria-invalid={!!error}
                  />
                ))}
              </div>
              {error && <div className="auth-error" role="alert">{error}</div>}
              <button type="submit" className="auth-submit" disabled={loading}>
                {loading && <i className="fa-solid fa-spinner fa-spin" aria-hidden="true" />}
                <span>{loading ? 'Verifying...' : 'Verify Code'}</span>
              </button>
              <button 
                type="button" 
                className="auth-link" 
                onClick={handleResendCode}
                style={{ alignSelf: 'center' }}
              >
                Didn't receive a code? Resend
              </button>
              <div className="auth-helper auth-fade-item">Check your email inbox and spam folder for the verification code.</div>
              <span role="status" aria-live="polite">{loading ? 'Verification in progress' : ''}</span>
            </form>
          </div>
        </div>
      </div>
      <div className="auth-image-column" aria-hidden="true" />
    </div>
  );
}

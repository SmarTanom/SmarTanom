import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthFlow } from '../features/auth/AuthFlowContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { verifyCode, requestCode } from '../services/api/auth';
import BrandMark from '../components/brand/BrandMark.jsx';
import { ChevronLeftFilled } from '../components/ui/Icon.jsx';
import './AuthCodePage.css';

export default function CodePage({ mode = 'signin' }) {
  const navigate = useNavigate();
  const { email } = useAuthFlow();
  const { signIn } = useAuth();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const inputRefs = useRef([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index, value) => {
    if (!/^\d?$/.test(value)) return;
    
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    setError('');

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    if (!/^\d+$/.test(pastedData)) return;

    const newCode = [...code];
    pastedData.split('').forEach((char, i) => {
      if (i < 6) newCode[i] = char;
    });
    setCode(newCode);
    
    const nextEmptyIndex = newCode.findIndex(c => !c);
    if (nextEmptyIndex !== -1) {
      inputRefs.current[nextEmptyIndex]?.focus();
    } else {
      inputRefs.current[5]?.focus();
    }
  };

  const handleVerify = async () => {
    const codeString = code.join('');
    if (codeString.length !== 6) {
      setError('Please enter all 6 digits');
      return;
    }

    setVerifying(true);
    setError('');

    try {
      const result = await verifyCode(email, codeString, mode);
      if (mode === 'signin') {
        // Use backend user and token
        const user = await signIn({
          email: result.user?.email,
          username: result.user?.username || result.user?.email?.split('@')[0],
          token: result.token,
          isNewUser: false,
          role: result.user?.role,
        });
        if (user.role === 'admin') navigate('/admin', { replace: true });
        else navigate('/dashboard', { replace: true });
      } else {
        navigate('/signup/setup', { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Verification failed');
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setVerifying(false);
    }
  };

  const isComplete = code.every(c => c !== '');

  return (
    <div className="auth-screen-root code-page">
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
              <h1 className="auth-title">Enter Verification Code</h1>
              <p className="auth-subtext">We sent a 6-digit code to <strong>{email}</strong></p>
            </header>
            <div className="otp-container">
              <div className="auth-otp-grid" onPaste={handlePaste}>
                {code.map((digit, index) => (
                  <input
                    key={index}
                    ref={el => inputRefs.current[index] = el}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleChange(index, e.target.value)}
                    onKeyDown={e => handleKeyDown(index, e)}
                    className="auth-otp-input"
                    aria-label={`Digit ${index + 1}`}
                    aria-invalid={!!error}
                  />
                ))}
              </div>
              {error && <p className="auth-error" role="alert">{error}</p>}
            </div>
            <div>
              <button
                type="button"
                className="auth-submit"
                onClick={handleVerify}
                disabled={!isComplete || verifying}
              >
                {verifying ? 'Verifying...' : 'Verify'}
              </button>
              <div className="auth-helper" style={{ marginTop: 14 }}>
                <span>Didn't receive a code? </span>
                <button
                  type="button"
                  className="auth-link"
                  onClick={async () => { try { await requestCode(email, mode); } catch (e) { /* ignore */ } }}
                >
                  Resend
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="auth-image-column" aria-hidden="true" />
    </div>
  );
}

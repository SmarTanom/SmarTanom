import React, { useState } from 'react';
import Button from '../components/ui/Button.jsx';
import HelperText from '../components/ui/HelperText.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import { useNavigate } from 'react-router-dom';
import { useAuthFlow } from '../features/auth/AuthFlowContext.jsx';
import BrandMark from '../components/brand/BrandMark.jsx';
import { Shield as ShieldIcon } from '../components/ui/Icon.jsx';
import BackButton from '../components/ui/BackButton.jsx';
import AuthLayout from '../components/layout/AuthLayout.jsx';

export default function CodePage({ mode = 'signin' }) {
  const navigate = useNavigate();
  const { email } = useAuthFlow();
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleChange(i, v) {
    if (/^\d?$/.test(v)) {
      const copy = [...digits];
      copy[i] = v;
      setDigits(copy);
    }
  }

  async function handleConfirm(e) {
    e.preventDefault();
    setError('');
    const code = digits.join('');
    if (code.length !== 6) {
      setError('Please enter the 6-digit code');
      return;
    }
    setLoading(true);
    try {
      // TODO: Call backend to verify code for email
      // const ok = await api.auth.verifyCode({ email, code, mode })
      await new Promise(r => setTimeout(r, 600));
      if (mode === 'signup') {
        navigate('/signup/username');
      } else {
        // TODO: On success, backend will return tokens/session. Store via secure storage.
        navigate('/');
      }
    } catch (err) {
      // TODO: Display backend error message here if verification fails
      setError('Code expired or invalid. Please try again or resend.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      <form onSubmit={handleConfirm}>
        <div style={{ display: 'grid', gap: 16 }}>
          <BackButton />
          <div style={{ display: 'grid', justifyItems: 'center', gap: 8 }}>
            <BrandMark size={52} />
            <h2 className="h2" style={{ margin: 0 }}>Verify Your Identity</h2>
            <p className="small text-center" style={{ maxWidth: 320 }}>Enter the 6-digit code sent to <strong>{email?.replace(/(.{3}).*(@.*)/, '$1***$2') || 'your email'}</strong></p>
          </div>

          <div className="otp-grid">
            {digits.map((d, i) => (
              <input
                key={i}
                inputMode="numeric"
                aria-label={`Digit ${i + 1}`}
                className={`input otp-box ${error ? 'error' : ''}`}
                value={d}
                onChange={e => handleChange(i, e.target.value)}
                maxLength={1}
              />
            ))}
          </div>
          {error ? <div className="error-text">{error}</div> : null}

          <Button type="submit" disabled={loading}>
            {loading ? <><Spinner size={18} /> Confirming...</> : 'Confirm'}
          </Button>
          <button type="button" onClick={() => { /* TODO: Resend code via backend */ }} className="back-btn" style={{ justifySelf: 'center' }}>Resend Code</button>
        </div>
      </form>
    </AuthLayout>
  );
}

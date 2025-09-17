import React, { useState } from 'react';
import Button from '../components/ui/Button.jsx';
import HelperText from '../components/ui/HelperText.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import { useNavigate } from 'react-router-dom';
import { useAuthFlow } from '../features/auth/AuthFlowContext.jsx';

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
    <div style={{ minHeight: '100%', display: 'grid', placeItems: 'center' }}>
      <form onSubmit={handleConfirm} className="card" style={{ maxWidth: 420, width: '92%' }}>
        <div style={{ display: 'grid', gap: 16 }}>
          <button type="button" onClick={() => navigate(-1)} aria-label="Back" style={{ background: 'transparent', border: 'none', color: '#339432', justifySelf: 'start' }}>←</button>
          <div style={{ display: 'grid', justifyItems: 'center', gap: 8 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: '#E6F3E6', display: 'grid', placeItems: 'center' }}>🛡️</div>
            <h2 className="h2" style={{ margin: 0 }}>Verify Your Identity</h2>
            <p className="small text-center" style={{ maxWidth: 320 }}>Enter the 6-digit code sent to <strong>{email?.replace(/(.{3}).*(@.*)/, '$1***$2') || 'your email'}</strong></p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
            {digits.map((d, i) => (
              <input
                key={i}
                inputMode="numeric"
                aria-label={`Digit ${i + 1}`}
                className={`input ${error ? 'error' : ''}`}
                style={{ textAlign: 'center' }}
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
          <button type="button" onClick={() => { /* TODO: Resend code via backend */ }} style={{ background: 'transparent', border: 'none', color: '#339432' }}>Resend Code</button>
        </div>
      </form>
    </div>
  );
}

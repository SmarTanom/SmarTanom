import React, { useState } from 'react';
import TextInput from '../components/ui/TextInput.jsx';
import Button from '../components/ui/Button.jsx';
import HelperText from '../components/ui/HelperText.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import { useNavigate } from 'react-router-dom';
import { useAuthFlow } from '../features/auth/AuthFlowContext.jsx';

function isValidEmail(email) {
  return /[^@\s]+@[^@\s]+\.[^@\s]+/.test(email);
}

export default function EmailPage({ mode = 'signin' }) {
  const navigate = useNavigate();
  const { setMode, email, setEmail, setCodeSent } = useAuthFlow();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  React.useEffect(() => setMode(mode), [mode, setMode]);

  async function handleSendCode(e) {
    e.preventDefault();
    setError('');
    if (!isValidEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }
    setLoading(true);
    try {
      // TODO: Call backend to request verification code
      // await api.auth.requestCode({ email, mode });
      await new Promise(r => setTimeout(r, 600));
      setCodeSent(true);
      navigate(`/${mode}/code`);
    } catch (err) {
      // TODO: Display backend error message here if verification fails
      setError('Could not send verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100%', display: 'grid', placeItems: 'center', background: 'radial-gradient(1200px 1200px at 0% 0%, rgba(51,148,50,0.05), transparent)' }}>
      <form onSubmit={handleSendCode} className="card" style={{ maxWidth: 420, width: '92%' }}>
        <div style={{ display: 'grid', gap: 16 }}>
          <button type="button" onClick={() => navigate(-1)} aria-label="Back" style={{ background: 'transparent', border: 'none', color: '#339432', justifySelf: 'start' }}>←</button>
          <div style={{ display: 'grid', justifyItems: 'center', gap: 8 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: '#E6F3E6', display: 'grid', placeItems: 'center' }}>🌿</div>
            <h2 className="h2" style={{ margin: 0 }}>{mode === 'signin' ? 'Welcome Back' : 'Create Your Account'}</h2>
            <p className="small text-center" style={{ maxWidth: 320 }}>
              {mode === 'signin' ? 'Enter your email to continue' : 'Create new account here to start your hydroponic monitoring journey'}
            </p>
          </div>
          <label>
            <span className="small">Email Address</span>
            <TextInput
              type="email"
              name="email"
              placeholder="your.email@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              aria-invalid={!!error}
              aria-describedby={error ? 'email-error' : undefined}
              error={error}
            />
          </label>
          <Button type="submit" disabled={loading}>
            {loading ? <><Spinner size={18} /> Sending...</> : 'Send Verification Code'}
          </Button>
          <HelperText>We’ll send a secure code to verify your identity</HelperText>
        </div>
      </form>
    </div>
  );
}

import React, { useState } from 'react';
import TextInput from '../components/ui/TextInput.jsx';
import Button from '../components/ui/Button.jsx';
import HelperText from '../components/ui/HelperText.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import { useNavigate } from 'react-router-dom';
import { useAuthFlow } from '../features/auth/AuthFlowContext.jsx';
import BrandMark from '../components/brand/BrandMark.jsx';
import { Mail as MailIcon } from '../components/ui/Icon.jsx';
import BackButton from '../components/ui/BackButton.jsx';
import AuthLayout from '../components/layout/AuthLayout.jsx';

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
    <AuthLayout>
      <form onSubmit={handleSendCode}>
        <div style={{ display: 'grid', gap: 16 }}>
          <BackButton />
          <div style={{ display: 'grid', justifyItems: 'center', gap: 10 }}>
            <BrandMark size={56} />
            <h2 className="h2" style={{ margin: 0 }}>{mode === 'signin' ? 'Welcome Back' : 'Create Your Account'}</h2>
            <p className="small text-center" style={{ maxWidth: 360 }}>
              {mode === 'signin' ? 'Enter your email to continue' : 'Create new account to start your hydroponic monitoring journey'}
            </p>
          </div>
          <label className="input-wrapper">
            <span className="small">Email Address</span>
            <MailIcon className="input-icon" size={18} color="#6b7280" />
            <TextInput
              type="email"
              name="email"
              placeholder="your.email@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              aria-invalid={!!error}
              aria-describedby={error ? 'email-error' : undefined}
              error={error}
              className="with-icon"
            />
          </label>
          <Button type="submit" disabled={loading}>
            {loading ? <><Spinner size={18} /> Sending...</> : 'Send Verification Code'}
          </Button>
          <HelperText>We’ll send a secure code to verify your identity</HelperText>
        </div>
      </form>
    </AuthLayout>
  );
}

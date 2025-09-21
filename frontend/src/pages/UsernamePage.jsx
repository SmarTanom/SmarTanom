import React, { useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthFlow } from '../features/auth/AuthFlowContext.jsx';
import BrandMark from '../components/brand/BrandMark.jsx';
import '../pages/AuthUsernamePage.css';
import { ChevronLeftFilled } from '../components/ui/Icon.jsx';

export default function UsernamePage() {
  const navigate = useNavigate();
  const { setMode } = useAuthFlow();
  const [username, setUsername] = useState('');
  const [status, setStatus] = useState(''); // 'available' | 'taken' | ''
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);

  React.useEffect(() => setMode('signup'), [setMode]);

  function localValidate(name) {
    if (!name.trim()) return 'Username is required.';
    if (!/^([a-z0-9_]{3,20})$/.test(name)) return 'Username must be 3-20 characters: lowercase letters, numbers, underscores only.';
    return '';
  }

  async function checkAvailability(name) {
    const validationError = localValidate(name);
    if (validationError) {
      setError(validationError);
      setStatus('');
      return;
    }

    setChecking(true); 
    setError(''); 
    setStatus('');
    try {
      // TODO: Call backend endpoint to check username availability here
      // const { available } = await api.auth.checkUsername(name)
      await new Promise(r => setTimeout(r, 400));
      // Fake: even length available, odd length taken
      const available = name.length % 2 === 0;
      setStatus(available ? 'available' : 'taken');
      if (!available) setError('This username is already taken. Please try another.');
    } catch (err) {
      setError('Could not check availability. Please try again.');
    } finally { 
      setChecking(false); 
    }
  }

  async function finishSetup(e) {
    e.preventDefault();
    setError('');
    const msg = localValidate(username);
    if (msg) { 
      setError(msg); 
      inputRef.current?.focus();
      return; 
    }
    if (status !== 'available') { 
      setError('Please choose an available username.'); 
      inputRef.current?.focus();
      return; 
    }
    setSaving(true);
    try {
      // TODO: Call backend to finish account setup/creation
      // await api.auth.finishSignup({ username })
      await new Promise(r => setTimeout(r, 800));
      // TODO: On success, navigate to dashboard/home state
      navigate('/');
    } catch (err) {
      // TODO: Display backend error message here if creation fails
      setError('Could not complete account setup. Please try again.');
    } finally { 
      setSaving(false); 
    }
  }

  const heading = 'Choose Your Username';
  const subtext = 'Pick a unique username for your SmarTanom account. This will be your identity in the community.';

  // Generate username suggestions based on current input
  const suggestions = useMemo(() => {
    const base = (username || '').toLowerCase().replace(/[^a-z0-9_]/g, '');
    const seeds = ['smart', 'hydro', 'grow', 'plant', 'garden'];
    const rand2 = () => Math.floor(10 + Math.random() * 90); // 10..99
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    if (base.length >= 3) {
      const b = base.replace(/^_+|_+$/g, '').slice(0, 16); // leave room for suffix
      return [
        `${b}${rand2()}`,
        `${b}_${pick(seeds)}`,
        `${pick(seeds)}_${b}`,
      ];
    }
    const seed = pick(seeds);
    return [
      `${seed}${rand2()}`,
      `${seed}_grow${rand2()}`,
      `smart_${seed}${rand2()}`,
    ];
  }, [username]);

  function applySuggestion(s) {
    setUsername(s);
    setError('');
    setStatus('');
    // Optionally check immediately
    checkAvailability(s);
    // Re-focus input for quick edits
    inputRef.current?.focus();
  }

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
            <header className="auth-header" style={{ gap: 'clamp(12px, 2vh, 18px)' }}>
              <h1 className="auth-title">{heading}</h1>
              <p className="auth-subtext">{subtext}</p>
            </header>
            <form className="auth-form" onSubmit={finishSetup} noValidate>
              <div className="auth-field">
                <label htmlFor="username" className="auth-field-label">Username</label>
                <div className="auth-input-wrapper">
                  <i className="auth-username-icon">@</i>
                  <input
                    ref={inputRef}
                    id="username"
                    name="username"
                    type="text"
                    className={`auth-input ${status === 'available' ? 'available' : status === 'taken' ? 'taken' : ''}`}
                    placeholder="your_username"
                    value={username}
                    onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    onBlur={() => username && checkAvailability(username)}
                    aria-invalid={!!error}
                    aria-describedby={error ? 'username-error' : status ? 'username-status' : undefined}
                    autoComplete="username"
                    maxLength={20}
                  />
                </div>
                <div id="username-hint" className="auth-hint">3-20 characters, lowercase letters, numbers, and underscores only</div>
                {error && <div id="username-error" className="auth-error" role="alert">{error}</div>}
                {status === 'available' && !error && <div id="username-status" className="auth-success">✓ Username is available!</div>}
                {checking && <div className="auth-helper">Checking availability...</div>}
              </div>
              <div className="auth-suggestions-section">
                <div className="auth-suggestions-title">Suggestions:</div>
                <div className="auth-suggestions-container">
                  {suggestions.map((s, i) => (
                    <button
                      key={`${s}-${i}`}
                      type="button"
                      className="auth-suggestion-chip"
                      onClick={() => applySuggestion(s)}
                      aria-label={`Use suggested username ${s}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <button type="submit" className="auth-submit" disabled={saving || checking || status !== 'available'}>
                {saving && <i className="fa-solid fa-spinner fa-spin" aria-hidden="true" />}
                <span>{saving ? 'Creating Account...' : 'Complete Setup'}</span>
              </button>
              <span role="status" aria-live="polite">{saving ? 'Account creation in progress' : checking ? 'Checking username availability' : ''}</span>
            </form>
          </div>
        </div>
      </div>
      <div className="auth-image-column" aria-hidden="true" />
    </div>
  );
}

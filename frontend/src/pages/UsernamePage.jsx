import React, { useState } from 'react';
import TextInput from '../components/ui/TextInput.jsx';
import Button from '../components/ui/Button.jsx';
import HelperText from '../components/ui/HelperText.jsx';
import Spinner from '../components/ui/Spinner.jsx';

export default function UsernamePage() {
  const [username, setUsername] = useState('');
  const [status, setStatus] = useState(''); // 'available' | 'taken' | ''
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);

  function localValidate(name) {
    if (!/^([a-z0-9_]{3,20})$/.test(name)) return 'Username must be 3-20 chars, lowercase letters, numbers, underscores';
    return '';
  }

  async function checkAvailability(name) {
    setChecking(true); setError(''); setStatus('');
    try {
      // TODO: Call backend endpoint to check username availability here
      // const { available } = await api.auth.checkUsername(name)
      await new Promise(r => setTimeout(r, 400));
      // Fake: even length available, odd length taken
      const available = name.length % 2 === 0;
      setStatus(available ? 'available' : 'taken');
      if (!available) setError('This username is already taken');
    } catch (err) {
      setError('Could not check availability. Try again.');
    } finally { setChecking(false); }
  }

  async function finishSetup(e) {
    e.preventDefault();
    const msg = localValidate(username);
    if (msg) { setError(msg); return; }
    if (status !== 'available') { setError('Please choose an available username'); return; }
    setSaving(true);
    try {
      // TODO: Call backend to finish account setup/creation
      // await api.auth.finishSignup({ username })
      await new Promise(r => setTimeout(r, 600));
      // TODO: On success, navigate to dashboard/home state
    } catch (err) {
      // TODO: Display backend error message here if creation fails
      setError('Could not complete setup. Please try again.');
    } finally { setSaving(false); }
  }

  return (
    <div style={{ minHeight: '100%', display: 'grid', placeItems: 'center' }}>
      <form onSubmit={finishSetup} className="card" style={{ maxWidth: 420, width: '92%' }}>
        <div style={{ display: 'grid', gap: 16 }}>
          <h2 className="h2" style={{ margin: 0 }}>Choose Username</h2>
          <label>
            <span className="small">Desired Username</span>
            <TextInput
              value={username}
              onChange={e => setUsername(e.target.value.toLowerCase())}
              onBlur={() => username && checkAvailability(username)}
              placeholder="your_username"
              aria-invalid={!!error}
              error={error}
            />
          </label>
          {status === 'available' ? <HelperText tone="success">Available</HelperText> : null}
          {status === 'taken' ? <HelperText tone="error">Taken</HelperText> : null}

          <Button type="submit" disabled={saving || checking}>
            {saving ? <><Spinner size={18} /> Saving...</> : 'Finish Account Setup'}
          </Button>
        </div>
      </form>
    </div>
  );
}

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Wifi, Loader2, CheckCircle2, AlertCircle, RefreshCw, ChevronRight } from 'lucide-react';
import { espSetupClient } from '../services/espSetupClient.js';
import { deviceApi } from '../services/apiClient.js';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function WiFiSetup() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [params] = useSearchParams();
  const deviceSerial = params.get('serial') || '';

  const [phase, setPhase] = useState('prompt'); // prompt -> detecting -> scanning -> entering -> connecting -> done
  const [error, setError] = useState('');
  const [ssids, setSsids] = useState([]);
  const [ssid, setSsid] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [statusNote, setStatusNote] = useState('');

  useEffect(() => {
    // Attempt auto-detect after a brief delay so user can switch WiFi
    const t = setTimeout(() => {
      setPhase('detecting');
      pollStatusThenScan();
    }, 800);
    return () => clearTimeout(t);
  }, []);

  const pollStatusThenScan = async () => {
    setError('');
    try {
      // A couple of quick status checks to detect AP
      for (let i = 0; i < 3; i++) {
        try {
          const st = await espSetupClient.status();
          if (st && (st.status === 'ap_mode' || st.status === 'failed' || st.status === 'connecting' || st.status === 'connected')) {
            setPhase('scanning');
            await doScan();
            return;
          }
        } catch (e) {
          await new Promise(r => setTimeout(r, 700));
        }
      }
      setPhase('prompt');
      setError('Couldn\'t reach the device hotspot. Please connect to its WiFi and retry.');
    } catch (err) {
      setPhase('prompt');
      setError(err.message || 'Failed to contact device.');
    }
  };

  const doScan = async () => {
    setBusy(true);
    setError('');
    setStatusNote('Scanning for WiFi networks...');
    try {
      const list = await espSetupClient.scan();
      setSsids(list);
      setPhase('entering');
    } catch (e) {
      setError('Scan failed. Ensure you\'re connected to the device WiFi.');
      setPhase('prompt');
    } finally {
      setBusy(false);
      setStatusNote('');
    }
  };

  const submitCredentials = async () => {
    if (!ssid) {
      setError('Please select or enter a WiFi network');
      return;
    }
    setBusy(true);
    setError('');
    setPhase('connecting');
    setStatusNote('Sending credentials to device...');
    try {
      await espSetupClient.connect(ssid, password);
      setStatusNote('Connecting device to WiFi...');
      // Poll /status a few times to see if device reports connected
      let connected = false;
      for (let i = 0; i < 10; i++) {
        await new Promise(r => setTimeout(r, 1500));
        try {
          const st = await espSetupClient.status();
          if (st.status === 'connected') { connected = true; break; }
        } catch {}
      }
      setPhase('done');
      setStatusNote(connected ? 'Device connected to WiFi.' : 'Credentials accepted. Device will attempt to connect.');
    } catch (e) {
      setError(e.message || 'Failed to send credentials.');
      setPhase('entering');
    } finally {
      setBusy(false);
    }
  };

  const finalizeAndGoDashboard = async () => {
    // Allow user time to switch their phone back to the internet WiFi
    setBusy(true);
    setError('');
    setStatusNote('Checking your account for the device...');
    try {
      // Small delay to allow device to handshake with backend
      await new Promise(r => setTimeout(r, 2500));
      if (token) {
        try { await deviceApi.list(token); } catch {}
      }
      navigate('/dashboard');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <Wifi size={28} />
        <h2 style={{ margin: 0 }}>WiFi Setup</h2>
      </div>

      {phase === 'prompt' && (
        <div>
          <p>Connect to your SmarTanom device WiFi hotspot to continue:</p>
          <div style={{ background: '#f7f7f7', padding: 12, borderRadius: 8, marginBottom: 12 }}>
            <div><strong>Hotspot:</strong> {deviceSerial ? `SMRT device (${deviceSerial})` : 'SMRT-XXX-XXX'}</div>
            <div><strong>Default password:</strong> smartanom123</div>
          </div>
          {error && (
            <div style={{ color: '#b42318', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <AlertCircle size={18} /> {error}
            </div>
          )}
          <button onClick={pollStatusThenScan} disabled={busy} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            {busy ? <Loader2 className="spin" size={18} /> : <RefreshCw size={18} />}
            I\'m connected to the device WiFi
          </button>
        </div>
      )}

      {phase === 'scanning' && (
        <div>
          <p>Scanning for WiFi networks on your device...</p>
          <Loader2 className="spin" />
        </div>
      )}

      {phase === 'entering' && (
        <div>
          <p>Select your home/office WiFi network and enter the password.</p>
          {ssids.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <label>Available Networks</label>
              <select value={ssid} onChange={e => setSsid(e.target.value)} style={{ width: '100%', padding: 8, marginTop: 6 }}>
                <option value="">Select network</option>
                {ssids.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}
          <div style={{ marginBottom: 8 }}>
            <label>SSID</label>
            <input value={ssid} onChange={e => setSsid(e.target.value)} placeholder="Network name" style={{ width: '100%', padding: 8, marginTop: 6 }} />
          </div>
          <div style={{ marginBottom: 8 }}>
            <label>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" style={{ width: '100%', padding: 8, marginTop: 6 }} />
          </div>
          {error && (
            <div style={{ color: '#b42318', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <AlertCircle size={18} /> {error}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={doScan} disabled={busy}>Rescan</button>
            <button onClick={submitCredentials} disabled={busy || !ssid} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              {busy ? <Loader2 className="spin" size={18} /> : <ChevronRight size={18} />}
              Connect Device
            </button>
          </div>
        </div>
      )}

      {phase === 'connecting' && (
        <div>
          <p>{statusNote || 'Connecting...'}</p>
          <Loader2 className="spin" />
          <p style={{ marginTop: 12 }}>If it fails, you\'ll be returned to setup to retry.</p>
        </div>
      )}

      {phase === 'done' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#0f5132', background: '#d1e7dd', padding: 12, borderRadius: 8, marginBottom: 12 }}>
            <CheckCircle2 size={20} />
            {statusNote || 'WiFi configured.'}
          </div>
          <p>Now switch your phone back to your regular internet network. When you\'re online again, we\'ll fetch your updated device list.</p>
          <button onClick={finalizeAndGoDashboard} disabled={busy} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            {busy ? <Loader2 className="spin" size={18} /> : <ChevronRight size={18} />}
            I\'m back online — Continue
          </button>
        </div>
      )}

      {statusNote && phase !== 'connecting' && phase !== 'done' && (
        <p style={{ color: '#555', marginTop: 10 }}>{statusNote}</p>
      )}
    </div>
  );
}

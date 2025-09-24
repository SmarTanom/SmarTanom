import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import BrandMark from '../components/brand/BrandMark.jsx';
import '../pages/AuthSetupPage.css';
import { ChevronLeftFilled } from '../components/ui/Icon.jsx';

export default function SignupSetup() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1..6
  const total = 6;
  const [deviceId, setDeviceId] = useState('');
  const [fileName, setFileName] = useState('');
  const [verified, setVerified] = useState(false);
  const [checking, setChecking] = useState(false);
  const [modal, setModal] = useState({ open: false, message: '' });

  const headings = [
    'Identify your device',
    'First time device setup',
    'Bind Device to Email',
    'Verify Email',
    'WiFi Setup',
    'Set Username',
  ];

  const subtexts = [
    'Choose how you want to identify your SmarTanom device',
    'Configure your first SmarTanom! (Can be changed later)',
    'Enter your email to bind your SmarTanom device to your account',
    'Enter the 6-digit OTP code we sent to your email',
    'Connect your SmarTanom device to your WiFi network',
    'Choose an account username',
  ];

  const stepLabels = ['Device', 'Setup', 'Bind', 'Verify', 'WiFi', 'Username'];

  function goPrev() { if (step > 1) setStep(step - 1); else navigate(-1); }
  function goNext() { if (step < total) setStep(step + 1); }

  async function verifyDevice() {
    setChecking(true);
    setVerified(false);
    try {
      // Mock verification: require either a 6+ char ID starting with SMRT or a file name present
      await new Promise(r => setTimeout(r, 500));
      const ok = (/^smrt\w{2,}$/i.test(deviceId)) || !!fileName;
      if (!ok) throw new Error('Invalid device QR/ID. Please try again.');
      setVerified(true);
    } catch (e) {
      setModal({ open: true, message: e.message || 'Invalid device QR/ID. Please try again.' });
    } finally {
      setChecking(false);
    }
  }

  function closeModal() { setModal({ open: false, message: '' }); }

  function onPickFile(e) {
    const f = e.target.files?.[0];
    if (f) setFileName(f.name);
  }

  return (
    <div className="auth-screen-root">
      <div className="auth-content-wrapper">
        <div className="auth-screen-inner">
          <div className="auth-top-bar auth-fade-item">
            <button
              type="button"
              className="auth-back-btn"
              onClick={goPrev}
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
              <nav className="setup-stepper" aria-label="Progress">
                <div className="setup-track" aria-hidden="true" />
                <div
                  className="setup-track-active"
                  aria-hidden="true"
                  style={{ width: `${((step - 1) / (total - 1)) * 100}%` }}
                />
                <ol className="setup-steps" role="list">
                  {Array.from({ length: total }).map((_, i) => {
                    const idx = i + 1;
                    const state = idx < step ? 'completed' : (idx === step ? 'current' : 'upcoming');
                    return (
                      <li key={idx} className={`setup-step ${state}`} aria-current={state === 'current' ? 'step' : undefined}>
                        <div className="setup-step-node">
                          <span className="setup-step-label">{stepLabels[i]}</span>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </nav>
              <h1 className="auth-title">{headings[step - 1]}</h1>
              <p className="auth-subtext">{subtexts[step - 1]}</p>
            </header>

            <div className="setup-body">
              {step === 1 && (
                <div className="setup-step-1">
                  <div className="setup-options">
                    <div className="setup-card">
                      <h4>Scan QR Code</h4>
                      <p>Use your camera to scan the QR on your device.</p>
                      <button type="button" className="setup-btn">Open Camera</button>
                      <div className="setup-hint">Tip: allow camera permission when prompted.</div>
                    </div>
                    <div className="setup-card">
                      <h4>Upload QR Image</h4>
                      <p>Select a photo of your device QR code.</p>
                      <input id="qrfile" type="file" accept="image/*" className="setup-file" onChange={onPickFile} />
                      <label htmlFor="qrfile" className="setup-btn">Choose Image</label>
                      {fileName && <div className="setup-file-name">Selected: {fileName}</div>}
                    </div>
                    <div className="setup-card">
                      <h4>Manual Entry</h4>
                      <p>Enter Device ID (e.g., SMRT00).</p>
                      <div className="setup-field">
                        <input type="text" placeholder="SMRT00" value={deviceId} onChange={e => setDeviceId(e.target.value)} />
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                    <button type="button" className="setup-btn" onClick={verifyDevice} disabled={checking}>
                      {checking ? 'Verifying…' : 'Verify Device'}
                    </button>
                    {verified && <div className="setup-status success">✓ Device verified</div>}
                  </div>
                </div>
              )}
            </div>

            <div className="setup-actions">
              <button type="button" className="setup-btn outline" onClick={goPrev} aria-label="Previous step">Previous</button>
              <button type="button" className="setup-btn" onClick={goNext} aria-label="Next step" disabled={step === 1 && !verified}>Next</button>
            </div>

            {modal.open && (
              <div className="setup-modal" role="dialog" aria-modal="true" aria-label="Verification error">
                <div className="setup-modal-content">
                  <h4 style={{ margin: 0 }}>Verification Error</h4>
                  <p style={{ margin: 0 }}>{modal.message}</p>
                  <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                    <button type="button" className="setup-btn" onClick={closeModal}>OK</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="auth-image-column" aria-hidden="true" />
    </div>
  );
}

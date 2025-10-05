import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BrandMark from '../components/brand/BrandMark.jsx';
import '../pages/AuthSetupPage.css';
import { ChevronLeftFilled } from '../components/ui/Icon.jsx';
import { CheckCircleFilled } from '../components/ui/Icon.jsx';
import { Mail } from '../components/ui/Icon.jsx';

const CameraIcon = ({ size = 28, color = '#ffffff' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M4 7h2.34a1 1 0 0 0 .92-.6l.56-1.29A1 1 0 0 1 8.74 4h6.52a1 1 0 0 1 .92.59L16.74 6a1 1 0 0 0 .92.59H20a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z" />
    <circle cx="12" cy="13" r="4" />
    <circle cx="18" cy="9" r="1" fill={color} stroke="none" />
  </svg>
);

const UploadIcon = ({ size = 28, color = '#ffffff' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M4 17v1.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V17" />
    <path d="M12 4v10" />
    <path d="m8 8 4-4 4 4" />
  </svg>
);

const KeyboardIcon = ({ size = 28, color = '#ffffff' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M7 9h2" />
    <path d="M11 9h2" />
    <path d="M15 9h2" />
    <path d="M7 13h10" />
  </svg>
);

export default function SignupSetup() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1..6
  const total = 6;
  // Step 1 state
  const [deviceId, setDeviceId] = useState('');
  const [fileName, setFileName] = useState('');
  const [verified, setVerified] = useState(false);
  const [justVerified, setJustVerified] = useState(false); // transient inline confirmation
  const [checking, setChecking] = useState(false);
  const [modal, setModal] = useState({ open: false, message: '' });

  // Step 2 state (all optional)
  const [nickname, setNickname] = useState('');
  const [location, setLocation] = useState('');
  // Plant Name removed per request
  const [plantPhotoChoice, setPlantPhotoChoice] = useState('none'); // 'camera' | 'upload' | 'default' | 'none'
  const [uploadPhotoName, setUploadPhotoName] = useState('');
  const [uploadPhotoUrl, setUploadPhotoUrl] = useState('');
  const defaultImages = [
    'Lettuce - Salanova', 'Lettuce - Butterhead', 'Lettuce - Looseleaf', 'Lettuce - Batavia', 'Lettuce - Romaine',
    'Spinach', 'Arugula', 'Kale', 'Bok Choy', 'Basil', 'Mint', 'Oregano', 'Cilantro', 'Chives', 'Parsley', 'Thyme'
  ];
  const [selectedDefaultImage, setSelectedDefaultImage] = useState('');
  const [durationDays, setDurationDays] = useState(''); // numeric string, optional

  // Step 3 state
  const [bindEmail, setBindEmail] = useState('');
  const [sendingCode, setSendingCode] = useState(false);
  const [emailError, setEmailError] = useState('');

  // Step 4 state
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState('');
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpResent, setOtpResent] = useState(false);

  // Step 5 state
  const [wifiNetworks, setWifiNetworks] = useState([]);
  const [wifiScanning, setWifiScanning] = useState(false);
  const [wifiSelected, setWifiSelected] = useState('');
  const [wifiPassword, setWifiPassword] = useState('');
  const [wifiError, setWifiError] = useState('');
  const [showWifiPw, setShowWifiPw] = useState(false);

  // Step 6 state
  const [username, setUsername] = useState('');
  const [finalizing, setFinalizing] = useState(false);
  const [finalError, setFinalError] = useState('');
  const [accountCreated, setAccountCreated] = useState(false);
  // (Snackbar removed per request)

  function isValidEmail(v) {
    return /[^\s@]+@[^\s@]+\.[^\s@]+/.test(v);
  }

  async function sendCode() {
    setEmailError('');
    if (!isValidEmail(bindEmail)) {
      setEmailError('Please enter a valid email address.');
      return;
    }
    try {
      setSendingCode(true);
      // TODO: Integrate API call to request OTP
      await new Promise(r => setTimeout(r, 600));
      setStep(4);
    } finally {
      setSendingCode(false);
    }
  }

  const progressFraction = useMemo(() => {
    if (total <= 1) return 0;
    return Math.min(1, Math.max(0, (step - 1) / (total - 1)));
  }, [step, total]);

  const progressPercent = useMemo(() => Math.round(progressFraction * 100), [progressFraction]);

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
    if (checking) { // guard against rapid double clicks / strict mode double invoke patterns
      // eslint-disable-next-line no-console
      console.log('[verifyDevice] Ignored duplicate invocation while checking');
      return;
    }
    setChecking(true);
    setVerified(false);
    try {
      await new Promise(r => setTimeout(r, 500));
      // Relaxed: allow smrt + at least 1 char OR file upload OR length >= 6
      const ok = (/^smrt\w+/i.test(deviceId.trim())) || !!fileName || deviceId.trim().length >= 6;
      if (!ok) throw new Error('Enter a valid Device ID (ex: smrt123 or upload QR).');
  setVerified(true);
  setJustVerified(true);
  // Brief pause to let user see inline confirmation, then advance
  setTimeout(()=>{ setStep(2); setJustVerified(false); }, 600);
    } catch (e) {
      setModal({ open: true, message: e.message || 'Invalid device QR/ID. Please try again.' });
    } finally {
      setChecking(false);
    }
  }

  function closeModal() { setModal({ open: false, message: '' }); }

  function onPickFile(e) {
    const f = e.target.files?.[0];
    if (f) {
      setFileName(f.name);
      if (verified) setVerified(false);
    } else {
      setFileName('');
      if (verified) setVerified(false);
    }
  }

  function handleOtpChange(idx, val) {
    if (/^\d?$/.test(val)) {
      const next = [...otpCode];
      next[idx] = val;
      setOtpCode(next);
      setOtpError('');
      if (val && idx < otpCode.length - 1) {
        const el = document.getElementById(`otp-${idx + 1}`);
        if (el) el.focus();
      }
    }
  }

  function handleOtpPaste(e){
    const text = e.clipboardData.getData('text').replace(/\D/g,'').slice(0,6);
    if(!text) return;
    const next = [...otpCode];
    for(let i=0;i<text.length;i++){ next[i]=text[i]; }
    setOtpCode(next);
    e.preventDefault();
  }

  function resendOtp() {
    setOtpResent(false);
    setOtpError('');
    // mock resend
    setTimeout(() => setOtpResent(true), 600);
  }

  async function verifyOtp() {
    setVerifyingOtp(true);
    setOtpError('');
    try {
      await new Promise(r => setTimeout(r, 800));
      const code = otpCode.join('');
      if (code !== '123456') { // mock correct code
        throw new Error('Invalid or expired code');
      }
      setStep(5);
    } catch (e) {
      setOtpError(e.message || 'Invalid code');
    } finally {
      setVerifyingOtp(false);
    }
  }

  async function scanWifi() {
    setWifiScanning(true);
    setWifiNetworks([]);
    setWifiError('');
    try {
      await new Promise(r => setTimeout(r, 900));
      setWifiNetworks(['HydroNet_2G', 'HydroNet_5G', 'GardenMesh', 'HomeLab']);
    } catch (e) {
      setWifiError('Scan failed. Try again.');
    } finally {
      setWifiScanning(false);
    }
  }

  function canConnectWifi() {
    return wifiSelected && (wifiSelected.includes('Open') || wifiPassword.length >= 8);
  }

  async function connectWifi() {
    if (!canConnectWifi()) return;
    setWifiError('');
    setWifiScanning(true);
    try {
      await new Promise(r => setTimeout(r, 1000));
      // mock success
      setStep(6);
    } catch (e) {
      setWifiError('Connection failed. Check password.');
    } finally {
      setWifiScanning(false);
    }
  }

  async function finalizeAccount() {
    if (!username.trim()) {
      setFinalError('Username is required');
      return;
    }
    setFinalError('');
    setFinalizing(true);
    try {
      await new Promise(r => setTimeout(r, 1000));
      setAccountCreated(true);
      setTimeout(()=>{
        const btn = document.getElementById('go-dashboard-btn');
        if(btn) btn.focus();
      }, 50);
    } catch (e) {
      setFinalError('Unable to create account');
    } finally {
      setFinalizing(false);
    }
  }

  function primaryCtaLabel(){
    switch(step){
      case 1: return 'Next';
      case 2: return 'Next';
      case 3: return 'Send Code';
      case 4: return 'Verify Code';
      case 5: return wifiScanning? 'Connecting…':'Connect';
      case 6: return accountCreated? 'Go to Dashboard':'Finish Setup';
      default: return 'Next';
    }
  }

  // Cleanup object URL when component unmounts or URL changes
  useEffect(() => {
    return () => {
      if (uploadPhotoUrl) {
        URL.revokeObjectURL(uploadPhotoUrl);
      }
    };
  }, [uploadPhotoUrl]);


  // (Toast removed) no external snackbar timer cleanup needed.

  return (
    <>
  <div className="auth-screen-root">
        <div className="auth-content-wrapper">
          <div className="auth-screen-inner setup-shell">
            <div className="auth-content setup-flow">
              <div className="setup-top">
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

                <header className="auth-header setup-progress-header auth-fade-item" aria-label="Setup progress overview">
                  <div className="setup-progress-pill" role="status" aria-live="polite">
                    <span>{progressPercent}% complete</span>
                  </div>
                  <nav className="setup-stepper" aria-label="Progress">
                    <div className="setup-track" aria-hidden="true" />
                    <div
                      className="setup-track-active"
                      aria-hidden="true"
                      style={{ width: `${progressFraction * 100}%` }}
                    />
                    <ol className="setup-steps" role="list">
                      {Array.from({ length: total }).map((_, i) => {
                        const idx = i + 1;
                        const state = idx < step ? 'completed' : (idx === step ? 'current' : 'upcoming');
                        return (
                          <li key={idx} className={`setup-step ${state}`} aria-current={state === 'current' ? 'step' : undefined}>
                            <div className="setup-step-node">
                              <span className="setup-step-icon" aria-hidden="true">
                                {state === 'completed' ? '✓' : idx}
                              </span>
                              <span className="setup-step-label">{stepLabels[idx - 1]}</span>
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                  </nav>
                  <div className="setup-step-meta" aria-live="polite">
                    <span className="setup-step-combined">
                      <span className="step-number">Step {step} of {total}</span>
                      <span className="step-title">{headings[step - 1]}</span>
                    </span>
                  </div>
                </header>
            </div>

            <div className="setup-middle auth-fade-item" role="region" aria-live="polite" aria-label={headings[step - 1]}>
              <div className="setup-heading">
                <h1 className="auth-title">{headings[step - 1]}</h1>
                <p className="auth-subtext">{subtexts[step - 1]}</p>
              </div>

              <div className="setup-body">
                {step === 1 && (
                  <section className="setup-section setup-step-1" aria-label="Identify your SmarTanom device">
                    <div className="setup-methods">
                      <article className="setup-method-card">
                        <header className="setup-method-card-head">
                          <span className="setup-method-index" aria-hidden="true">1</span>
                          <div className="setup-method-copy">
                            <div className="setup-method-text">
                              <h3>Scan QR Code</h3>
                              <p>Open your camera and point to the QR sticker on your device.</p>
                            </div>
                            <div className="setup-method-icon" aria-hidden="true">
                              <CameraIcon />
                            </div>
                          </div>
                        </header>
                        <div className="setup-method-card-body">
                          <div className="setup-input-inline">
                            <button
                              type="button"
                              className="setup-btn sm"
                              aria-label="Open camera to scan device QR"
                            >
                              Open Camera
                            </button>
                            <span className="setup-hint">Allow camera permission when prompted.</span>
                          </div>
                        </div>
                      </article>

                      <article className="setup-method-card">
                        <header className="setup-method-card-head">
                          <span className="setup-method-index" aria-hidden="true">2</span>
                          <div className="setup-method-copy">
                            <div className="setup-method-text">
                              <h3>Upload QR Image</h3>
                              <p>Choose an existing photo of the QR sticker if you have it saved.</p>
                            </div>
                            <div className="setup-method-icon" aria-hidden="true">
                              <UploadIcon />
                            </div>
                          </div>
                        </header>
                        <div className="setup-method-card-body">
                          <input id="qrfile" type="file" accept="image/*" className="setup-file" onChange={onPickFile} />
                          <label htmlFor="qrfile" className="setup-btn sm" aria-label="Choose QR code image">
                            Choose Image
                          </label>
                          {fileName && <span className="setup-file-name" aria-live="polite">{fileName}</span>}
                        </div>
                      </article>

                      <article className="setup-method-card">
                        <header className="setup-method-card-head">
                          <span className="setup-method-index" aria-hidden="true">3</span>
                          <div className="setup-method-copy">
                            <div className="setup-method-text">
                              <h3>Manual Entry</h3>
                              <p>Type the Device ID printed underneath the QR label.</p>
                            </div>
                            <div className="setup-method-icon" aria-hidden="true">
                              <KeyboardIcon />
                            </div>
                          </div>
                        </header>
                        <div className="setup-method-card-body">
                          <div className="setup-field">
                            <label className="setup-field-label setup-field-label--sm" htmlFor="deviceId">Device ID</label>
                            <input
                              id="deviceId"
                              type="text"
                              placeholder="Input Device ID here"
                              value={deviceId}
                              onChange={e => {
                                setDeviceId(e.target.value);
                                if (verified) setVerified(false);
                              }}
                              aria-label="Manual device ID"
                              autoComplete="off"
                              inputMode="text"
                            />
                          </div>
                        </div>
                      </article>
                    </div>
                  </section>
                )}
                {step === 2 && (
                  <section className="setup-section setup-step-2" aria-label="First Time Device Setup - Hydroponic Info">
                    {/* Device Information Card */}
                    <div className="setup-card">
                      <h3 className="setup-section-title">Device Information</h3>
                      <div className="setup-form-grid">
                        <div className="setup-field">
                          <div className="setup-field-label-row">
                            <label className="setup-field-label" htmlFor="nickname">Device Nickname</label>
                            <span className="setup-optional" aria-hidden="true">optional</span>
                          </div>
                          <input
                            id="nickname"
                            type="text"
                            placeholder="Optional — defaults to serial ID"
                            value={nickname}
                            onChange={(e) => setNickname(e.target.value)}
                            aria-describedby="help-nickname"
                            autoComplete="off"
                            inputMode="text"
                          />
                          <p id="help-nickname" className="setup-helper setup-helper--sm">If left empty, we will use the device’s serial ID.</p>
                        </div>

                        <div className="setup-field">
                          <div className="setup-field-label-row">
                            <label className="setup-field-label" htmlFor="location">Location</label>
                            <span className="setup-optional" aria-hidden="true">optional</span>
                          </div>
                          <input
                            id="location"
                            type="text"
                            placeholder="e.g., Balcony, Backyard"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            aria-describedby="help-location"
                            autoComplete="off"
                            inputMode="text"
                          />
                          <p id="help-location" className="setup-helper setup-helper--sm">Where is your SmarTanom installed? (e.g., balcony, backyard)</p>
                        </div>
                      </div>
                    </div>

                    {/* Hydroponic Info Card */}
                    <div className="setup-card">
                      <h3 className="setup-section-title">Hydroponic Info</h3>
                      <div className="setup-form-grid">
                        {/* Plant Name removed per request */}

                        <div className="setup-field span-2">
                          <div className="setup-field-label">Plant Photo</div>
                          <div className="setup-input-inline">
                            <div className="photo-choice-row">
                              <label htmlFor="cameraFile" className={`setup-btn sm ${plantPhotoChoice === 'camera' ? '' : 'outline'}`} aria-pressed={plantPhotoChoice === 'camera'}>
                                Take Photo
                              </label>
                              <input id="cameraFile" type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (f) {
                                    setUploadPhotoName(f.name);
                                    const url = URL.createObjectURL(f);
                                    setUploadPhotoUrl(url);
                                    setPlantPhotoChoice('upload');
                                  }
                                }} />
                              <label htmlFor="galleryFile" className={`setup-btn sm ${plantPhotoChoice === 'upload' ? '' : 'outline'}`}>
                                Upload from Gallery
                              </label>
                              <input id="galleryFile" type="file" accept="image/*" style={{ display: 'none' }}
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (f) {
                                    setUploadPhotoName(f.name);
                                    const url = URL.createObjectURL(f);
                                    setUploadPhotoUrl(url);
                                    setPlantPhotoChoice('upload');
                                  } else {
                                    setUploadPhotoName('');
                                    setUploadPhotoUrl('');
                                    setPlantPhotoChoice('none');
                                  }
                                }} />
                              <button
                                type="button"
                                className={`setup-btn sm ${plantPhotoChoice === 'default' ? '' : 'outline'}`}
                                onClick={() => setPlantPhotoChoice('default')}
                                aria-pressed={plantPhotoChoice === 'default'}
                              >
                                Choose Default Image
                              </button>
                            </div>
                            <p className="setup-helper">You can upload your own photo or choose a default image.</p>
                            {plantPhotoChoice === 'default' && (
                              <div className="setup-field inline-row" style={{ marginTop: 6 }}>
                                <label className="setup-field-label" htmlFor="defaultImage">Default image</label>
                                <select
                                  id="defaultImage"
                                  value={selectedDefaultImage}
                                  onChange={(e) => setSelectedDefaultImage(e.target.value)}
                                  className="setup-select"
                                  data-empty={selectedDefaultImage === ''}
                                >
                                  <option value="">Select a default image…</option>
                                  {defaultImages.map((opt) => (
                                    <option key={opt} value={opt}>{opt}</option>
                                  ))}
                                </select>
                              </div>
                            )}
                            {(plantPhotoChoice === 'upload' && uploadPhotoUrl) && (
                              <div className="photo-preview" aria-live="polite">
                                <img src={uploadPhotoUrl} alt="Selected plant" />
                                <div className="photo-actions">
                                  <label htmlFor="galleryFile" className="setup-btn sm outline">Replace</label>
                                  <span className="setup-file-name">{uploadPhotoName}</span>
                                </div>
                              </div>
                            )}
                            {plantPhotoChoice === 'camera' && !uploadPhotoUrl && (
                              <span className="setup-hint">Camera will open on supported devices.</span>
                            )}
                            {plantPhotoChoice === 'none' && (
                              <span className="setup-hint">No photo selected — will fallback to a default photo.</span>
                            )}
                          </div>
                        </div>

                        <div className="setup-field inline-row duration-inline-row">
                          <div className="setup-field-label-row">
                            <label className="setup-field-label" htmlFor="durationDays">Days Since Planted</label>
                            <span className="setup-optional" aria-hidden="true">optional</span>
                          </div>
                          <div className="input-with-suffix">
                            <input
                              id="durationDays"
                              type="number"
                              min="0"
                              inputMode="numeric"
                              placeholder="0"
                              value={durationDays}
                              onChange={(e) => setDurationDays(e.target.value)}
                              autoComplete="off"
                              enterKeyHint="done"
                            />
                            <span className="suffix-tag" aria-hidden="true">days</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>
                )}
                {step === 3 && (
                  <section className="setup-section setup-step-3" aria-label="Bind Device to Email">
                    {/* Device summary card */}
                    <div className="setup-card device-summary-card">
                      <div className="device-summary-icon" aria-hidden="true">
                        {/* simple device glyph */}
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 7h6"/></svg>
                      </div>
                      <div className="device-summary-text">
                        <p className="device-summary-title">Hydro Demo Device</p>
                        <p className="device-summary-sub">ID: HYD396627 | HydroTech</p>
                      </div>
                    </div>
                    {/* Email bind card */}
                    <div className="setup-card">
                       <div className="setup-form-grid">
                         <div className="setup-field span-2">
                           <div className="setup-field-label-row">
                            <label className="setup-field-label" htmlFor="bindEmail">Email Address</label>
                            <span className="label-right-icon" aria-hidden="true">
                              <Mail size={14} color="#ffffff" />
                            </span>
                          </div>
                           <input
                            id="bindEmail"
                            type="email"
                            inputMode="email"
                            autoComplete="email"
                            placeholder="user@example.com"
                            value={bindEmail}
                            onChange={(e) => setBindEmail(e.target.value)}
                            aria-describedby="help-bindemail"
                          />
                           <p id="help-bindemail" className="setup-helper setup-helper--sm">Enter your email to bind this device to your account.</p>
                           {emailError && <p className="setup-error" role="alert">{emailError}</p>}
                        </div>
                       </div>
                     </div>

                     <div className="inline-progress-actions" style={{marginTop:16, display:'flex', justifyContent:'flex-end'}}>
                      <button type="button" className="setup-btn" onClick={sendCode} disabled={sendingCode || !isValidEmail(bindEmail)}>{sendingCode? 'Sending…':'Send Code'}</button>
                    </div>
                  </section>
                )}
                {step === 4 && (
                  <section className="setup-section setup-step-4" aria-label="Verify Email OTP Code">
                    <div className="setup-card">
                      <h3 className="setup-section-title">Enter Verification Code</h3>
                      <p className="setup-helper" style={{marginTop:4}}>We sent a 6-digit code to <strong>{bindEmail || 'your email'}</strong>. Enter it below.</p>
                      <div className="otp-input-row" role="group" aria-label="One time password inputs" onPaste={handleOtpPaste}>
                        {otpCode.map((d, i) => (
                          <input
                            key={i}
                            id={`otp-${i}`}
                            className="otp-box"
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength={1}
                            value={d}
                            aria-label={`Digit ${i+1}`}
                            onChange={e => handleOtpChange(i, e.target.value.replace(/\D/g,''))}
                            onKeyDown={e => {
                              if (e.key === 'Backspace' && !otpCode[i] && i>0) {
                                const prev = document.getElementById(`otp-${i-1}`); if (prev) prev.focus();
                              }
                            }}
                          />
                        ))}
                      </div>
                      {otpError && <p className="setup-error" role="alert" style={{marginTop:8}}>{otpError}</p>}
                      {otpResent && <p className="setup-status success" role="status" style={{marginTop:8}}>Code resent!</p>}
                    </div>

                    <div className="otp-inline-actions" style={{marginTop:16, display:'flex', justifyContent:'flex-end', gap:12}}>
                      <button type="button" className="setup-btn outline sm" disabled={verifyingOtp} onClick={resendOtp}>Resend</button>
                      <button type="button" className="setup-btn sm" disabled={verifyingOtp || otpCode.some(c=>!c)} onClick={verifyOtp}>{verifyingOtp? 'Verifying…':'Verify Code'}</button>
                    </div>
                  </section>
                )}
                {step === 5 && (
                  <section className="setup-section setup-step-5" aria-label="WiFi Setup">
                    <div className="setup-card" role="group" aria-labelledby="wifi-setup-head">
                      <h3 id="wifi-setup-head" className="setup-section-title">Scan Networks</h3>
                      <p className="setup-helper">Let’s connect your device to the internet.</p>
                      <div className="wifi-scan-row">
                        <button type="button" className="setup-btn sm" onClick={scanWifi} disabled={wifiScanning}>{wifiScanning? 'Scanning…':'Scan Networks'}</button>
                      </div>
                      {wifiError && <p className="setup-error" role="alert">{wifiError}</p>}
                      <ul className="wifi-list" role="radiogroup" aria-label="Available WiFi Networks">
                        {wifiNetworks.map(net => (
                          <li key={net} className={`wifi-item ${wifiSelected===net? 'selected':''}`} role="radio" aria-checked={wifiSelected===net}>
                            <button type="button" className="wifi-select-btn" onClick={()=> setWifiSelected(net)} aria-pressed={wifiSelected===net}>{net}{wifiSelected===net && ' • selected'}</button>
                          </li>
                        ))}
                      </ul>
                      {wifiSelected && (
                        <div className="setup-field" style={{marginTop:12}}>
                          <label className="setup-field-label" htmlFor="wifiPassword">Password</label>
                          <div className="input-with-toggle">
                            <input id="wifiPassword" type={showWifiPw? 'text':'password'} placeholder="Enter WiFi password" value={wifiPassword} onChange={e=> setWifiPassword(e.target.value)} autoComplete="off" />
                            <button type="button" className="pw-toggle" aria-label={showWifiPw? 'Hide password':'Show password'} onClick={()=> setShowWifiPw(p=>!p)}>{showWifiPw? 'Hide':'Show'}</button>
                          </div>
                          <p className="setup-helper setup-helper--sm">Minimum 8 characters (mock rule)</p>
                        </div>
                      )}
                      {wifiSelected && (
                        <div style={{marginTop:12}}>
                          <button type="button" className="setup-btn sm" disabled={!canConnectWifi() || wifiScanning} onClick={connectWifi}>{wifiScanning? 'Connecting…':'Connect'}</button>
                        </div>
                      )}
                    </div>
                  </section>
                )}
                {step === 6 && (
                  <section className="setup-section setup-step-6" aria-label="Set Username">
                    <div className="setup-card">
                      <h3 className="setup-section-title">Create Account Username</h3>
                      {!accountCreated && (<>
                        <div className="setup-field">
                          <label htmlFor="username" className="setup-field-label">Username</label>
                          <input id="username" type="text" placeholder="Pick a unique username" value={username} onChange={e=> setUsername(e.target.value)} autoComplete="username" />
                          <p className="setup-helper setup-helper--sm">This will be visible in your dashboard.</p>
                          {finalError && <p className="setup-error" role="alert">{finalError}</p>}
                        </div>
                        <div style={{marginTop:12, display:'flex', gap:12}}>
                          <button type="button" className="setup-btn" disabled={finalizing} onClick={finalizeAccount}>{finalizing? 'Creating…':'Finish Setup'}</button>
                        </div>
                      </>)}
                      {accountCreated && (
                        <div className="account-success" role="status" aria-live="polite" style={{textAlign:'center'}}>
                          <h4 style={{marginTop:0}}>🎉 All Set!</h4>
                          <p>Your device and account are fully configured.</p>
                          <button id="go-dashboard-btn" type="button" className="setup-btn" onClick={()=> navigate('/dashboard')}>Go to Dashboard</button>
                        </div>
                      )}
                    </div>
                  </section>
                )}
              </div>
            </div>

            <div className="setup-bottom auth-fade-item">
              {step === 1 && (
                <div className="setup-verify-panel" role="region" aria-live="polite" aria-label="Verify your device" data-section="verify">
                  <div className="setup-verify-content">
                    <h4>Verify your device</h4>
                    {!verified && <p>We’ll confirm your SmarTanom before moving on. (Auto-advances)</p>}
                    {verified && justVerified && (
                      <p className="setup-status success" style={{margin:0}} role="status">Device verified! Continuing…</p>
                    )}
                  </div>
                  <div className="setup-verify-actions">
                    <button type="button" className="setup-btn" onClick={verifyDevice} disabled={checking}>
                      {checking ? 'Verifying…' : 'Verify Device'}
                    </button>
                  </div>
                </div>
              )}
              {step === 2 && (
                <div className="setup-verify-panel" role="region" aria-live="polite" aria-label="Continue setup" data-section="continue-step2">
                  <div className="setup-verify-content">
                    <h4>Continue setup</h4>
                    <p>Proceed to bind your device to an email.</p>
                  </div>
                  <div className="setup-verify-actions">
                    <button type="button" className="setup-btn" onClick={()=> setStep(3)}>Continue</button>
                  </div>
                </div>
              )}
              {step === 4 && (
                <div className="otp-inline-actions" style={{marginTop:16, display:'flex', justifyContent:'flex-end', gap:12}}>
                  <button type="button" className="setup-btn outline sm" disabled={verifyingOtp} onClick={resendOtp}>Resend</button>
                  <button type="button" className="setup-btn sm" disabled={verifyingOtp || otpCode.some(c=>!c)} onClick={verifyOtp}>{verifyingOtp? 'Verifying…':'Verify Code'}</button>
                </div>
              )}
              {step === 5 && wifiSelected && !accountCreated && (
                <div className="wifi-inline-actions" style={{marginTop:16, display:'flex', justifyContent:'flex-end'}}>
                  <button type="button" className="setup-btn" disabled={!canConnectWifi() || wifiScanning} onClick={connectWifi}>{wifiScanning? 'Connecting…':'Connect & Continue'}</button>
                </div>
              )}
              {step === 6 && !accountCreated && (
                <div className="username-inline-actions" style={{marginTop:16, display:'flex', justifyContent:'flex-end'}}>
                  <button type="button" className="setup-btn" disabled={!username.trim() || finalizing} onClick={finalizeAccount}>{finalizing? 'Finishing…':'Finish Setup'}</button>
                </div>
              )}
              {step === 6 && accountCreated && (
                <div className="username-inline-actions" style={{marginTop:16, display:'flex', justifyContent:'center'}}>
                  <button id="go-dashboard-btn" type="button" className="setup-btn" onClick={()=> navigate('/dashboard')}>Go to Dashboard</button>
                </div>
              )}
            </div>
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
      <div className="auth-image-column" aria-hidden="true" />
    </div>
    
    </>
  );
}


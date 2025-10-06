import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BrandMark from '../components/brand/BrandMark.jsx';
import '../pages/AuthSetupPage.css';
import { ChevronLeftFilled } from '../components/ui/Icon.jsx';
import { Check } from '../components/ui/Icon.jsx';
import { Mail } from '../components/ui/Icon.jsx';
import { Wifi, Refresh, Lock, SignalBars } from '../components/ui/Icon.jsx';

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

const ImageIcon = ({ size = 20, color = '#ffffff' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <path d="M21 15l-5-5L5 21" />
  </svg>
);

const LeafIcon = ({ size = 20, color = '#ffffff' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
    <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
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
    'Salanova', 'Butterhead', 'Looseleaf', 'Batavia', 'Romaine',
    'Spinach', 'Arugula', 'Kale', 'Bok Choy', 'Basil', 'Mint', 'Oregano', 'Cilantro', 'Chives', 'Parsley', 'Thyme'
  ];
  const [selectedDefaultImage, setSelectedDefaultImage] = useState('');
  const [showDefaultImageModal, setShowDefaultImageModal] = useState(false); // new modal state
  const [showPlantPhotoModal, setShowPlantPhotoModal] = useState(false); // plant photo modal
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

  // Step 5 state (advanced WiFi setup)
  // wifiPhase: idle | scanning | results | empty | error | connecting
  const [wifiPhase, setWifiPhase] = useState('idle');
  const [wifiNetworks, setWifiNetworks] = useState([]); // [{ssid,rssi,secure}]
  const [wifiSelected, setWifiSelected] = useState(null); // object ref
  const [wifiPassword, setWifiPassword] = useState('');
  const [wifiError, setWifiError] = useState('');
  const [showWifiPw, setShowWifiPw] = useState(false);
  const [hiddenSsidEnabled, setHiddenSsidEnabled] = useState(false);
  const [hiddenSsid, setHiddenSsid] = useState('');
  const [scanAttempts, setScanAttempts] = useState(0);
  const [limitationDismissed, setLimitationDismissed] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(''); // success | fail message
  const wifiAbortRef = React.useRef(null);
  const [wifiInstructionsOpen, setWifiInstructionsOpen] = useState(false);
  const [wifiModalOpen, setWifiModalOpen] = useState(false);
  const [userGuideOpen, setUserGuideOpen] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  
  // Auto-collapse instructions on medium heights to save vertical space
  useEffect(()=>{
    if (step === 5 && typeof window !== 'undefined') {
      const h = window.innerHeight;
      if (h <= 840 && h >= 600) {
        setWifiInstructionsOpen(false);
      }
    }
  }, [step]);

  // Scroll anchor ref map
  const networkRefs = React.useRef({});

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

  // Derived device summary values for Step 3 (Bind Device to Email)
  const deviceSummaryName = useMemo(() => {
    const n = nickname.trim();
    const id = deviceId.trim();
    if (n) return n; // user provided nickname
    if (id) return id; // fallback to device id
    return 'Device'; // ultimate fallback
  }, [nickname, deviceId]);

  const deviceSummarySub = useMemo(() => {
    const id = deviceId.trim();
    const loc = location.trim();
    if (!id && !loc) return '';
    if (!id) return loc; // unlikely, but handle gracefully
    return `ID: ${id}${loc ? ` | ${loc}` : ''}`;
  }, [deviceId, location]);

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
      if (!ok) throw new Error('Please enter a valid Device ID or upload a clear QR photo.');
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

  const wifiScanEndpoints = useMemo(() => [
    'http://192.168.4.1/networks',
    'http://192.168.4.1/api/wifi/scan',
    '/device/wifi/scan'
  ], []);

  function abortOngoingWifiScan(){
    if (wifiAbortRef.current) {
      try { wifiAbortRef.current.abort(); } catch(e){/*noop*/}
    }
    wifiAbortRef.current = null;
  }

  function mockNetworks(){
    // Provide a deterministic mock for dev; vary RSSI for bars variety
    return [
      { ssid: 'HydroNet_2G', rssi: -52, secure: true },
      { ssid: 'HydroNet_5G', rssi: -60, secure: true },
      { ssid: 'GardenMesh', rssi: -70, secure: false },
      { ssid: 'HomeLab', rssi: -82, secure: true },
    ];
  }

  function rssiToBars(rssi){
    if (typeof rssi !== 'number') return 0;
    if (rssi >= -55) return 4;
    if (rssi >= -65) return 3;
    if (rssi >= -75) return 2;
    if (rssi >= -85) return 1;
    return 0;
  }

  // Smooth scroll to selected network when it changes
  useEffect(()=>{
    if (!wifiSelected) return;
    const key = wifiSelected.ssid;
    const el = networkRefs.current[key];
    if (el && el.scrollIntoView) {
      try { el.scrollIntoView({ behavior:'smooth', block:'nearest', inline:'nearest' }); } catch(_) { el.scrollIntoView(); }
    }
  }, [wifiSelected]);

  async function scanWifi({auto=false}={}) {
    abortOngoingWifiScan();
    setWifiError('');
    setConnectionStatus('');
    setWifiSelected(null);
    setWifiNetworks([]);
    setWifiPhase('scanning');
    const attempt = scanAttempts + 1;
    setScanAttempts(attempt);
    const controller = new AbortController();
    wifiAbortRef.current = controller;
    const timeoutMs = 6000; // per-endpoint timeout

    for (let i=0;i<wifiScanEndpoints.length;i++){
      const endpoint = wifiScanEndpoints[i];
      try {
        const t = setTimeout(()=>controller.abort(), timeoutMs);
        const res = await fetch(endpoint, { signal: controller.signal, headers:{ 'Accept':'application/json' }});
        clearTimeout(t);
        if(!res.ok) throw new Error('HTTP '+res.status);
        const data = await res.json();
        // Expect array of {ssid,rssi,secure}
        if(Array.isArray(data) && data.length){
          setWifiNetworks(data);
          setWifiPhase('results');
          wifiAbortRef.current = null;
          return;
        }
        // empty array -> continue to next endpoint
      } catch(e){
        // continue to next endpoint unless last
      }
    }

    // Fallback to mock (dev) after failing endpoints (only if not auto or first attempts <2)
    if (process.env.NODE_ENV === 'development') {
      const mocks = mockNetworks();
      setWifiNetworks(mocks);
      setWifiPhase(mocks.length? 'results':'empty');
      wifiAbortRef.current = null;
      return;
    }

    // No networks
    setWifiPhase('empty');
    setWifiNetworks([]);
    wifiAbortRef.current = null;
  }

  function canConnectWifi() {
    if (hiddenSsidEnabled) {
      return hiddenSsid.trim().length >= 1 && wifiPassword.length >= 8;
    }
    if (!wifiSelected) return false;
    return (!wifiSelected.secure) || wifiPassword.length >= 8;
  }

  async function connectWifi() {
    if (!canConnectWifi() || connecting) return;
    setWifiError('');
    setConnectionStatus('');
    setConnecting(true);
    setWifiPhase('connecting');
    try {
      // Simulate POST to device hotspot endpoint
      const body = {
        ssid: hiddenSsidEnabled ? hiddenSsid.trim() : wifiSelected?.ssid,
        password: wifiPassword,
      };
      await new Promise(r => setTimeout(r, 1100));
      // TODO integrate real fetch: fetch('http://192.168.4.1/wifi/connect',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
      // Mock success probability
      if (body.password && body.password.toLowerCase().includes('fail')) {
        throw new Error('Mock failure');
      }
      setConnectionStatus('success');
      setTimeout(()=> setStep(6), 600);
    } catch(e){
      setConnectionStatus(e.message || 'fail');
      setWifiPhase('results'); // return to results
    } finally {
      setConnecting(false);
    }
  }

  // Auto-trigger scan when entering step 5 first time or after going back if previously idle
  useEffect(()=>{
    if (step === 5 && wifiPhase === 'idle') {
      scanWifi({auto:true});
    }
    // abort when leaving step
    if (step !== 5) {
      abortOngoingWifiScan();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

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
      case 5: return connecting? 'Connecting…':'Connect';
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
          <div className={`auth-screen-inner setup-shell step-${step}-active`}>
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
                                {state === 'completed' ? (
                                  <Check size={16} color="currentColor" stroke={3} aria-label="Completed" />
                                ) : idx}
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
                            <label className="setup-field-label setup-field-label--xs" htmlFor="nickname">Device Nickname</label>
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
                            <label className="setup-field-label setup-field-label--xs" htmlFor="location">Location</label>
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
                        <div className="setup-field span-2">
                          <div className="setup-field-label-row">
                            <label className="setup-field-label setup-field-label--xs">Plant Photo</label>
                            <span className="setup-optional" aria-hidden="true">optional</span>
                          </div>
                          <button
                            type="button"
                            className="setup-btn"
                            onClick={() => setShowPlantPhotoModal(true)}
                            style={{ marginTop: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                          >
                            <ImageIcon size={18} color="#ffffff" />
                            <span>Choose Plant Photo</span>
                          </button>
                          {plantPhotoChoice === 'upload' && uploadPhotoUrl && (
                            <p className="setup-helper" style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <CameraIcon size={16} color="rgba(255,255,255,0.9)" />
                              <span><strong>Photo Uploaded:</strong> {uploadPhotoName}</span>
                            </p>
                          )}
                          {plantPhotoChoice === 'default' && selectedDefaultImage && (
                            <p className="setup-helper" style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <LeafIcon size={16} color="rgba(255,255,255,0.9)" />
                              <span><strong>Selected:</strong> {selectedDefaultImage}</span>
                            </p>
                          )}
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
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 7h6"/></svg>
                      </div>
                      <div className="device-summary-text">
                        <p className="device-summary-title" aria-live="polite">{deviceSummaryName}</p>
                        {deviceSummarySub && (
                          <p className="device-summary-sub" aria-live="polite">{deviceSummarySub}</p>
                        )}
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
                            data-filled={d ? 'true' : 'false'}
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
                  </section>
                )}
                {step === 5 && (
                  <section className="setup-section setup-step-5" aria-label="WiFi Setup">
                    <div className="setup-card wifi-card-compact" role="group" aria-labelledby="wifi-setup-head">
                      <h3 id="wifi-setup-head" className="setup-section-title">Connect to WiFi</h3>
                      <p className="setup-helper" style={{marginTop:4}}>Connect your SmarTanom device to your home WiFi network.</p>
                      
                      {connectionStatus === 'success' && (
                        <div className="wifi-status-banner success" role="status" aria-live="polite" style={{marginTop:12}}>
                          Connected! Finalizing…
                        </div>
                      )}
                      
                      {wifiSelected && connectionStatus !== 'success' && (
                        <div className="wifi-connected-summary" style={{marginTop:12}}>
                          <div className="wifi-summary-row">
                            <SignalBars level={rssiToBars(wifiSelected.rssi)} size={18} />
                            <span className="wifi-summary-ssid">{wifiSelected.ssid}</span>
                            {wifiSelected.secure && <Lock size={12} color="#ffffff" className="wifi-lock" />}
                          </div>
                          <p className="setup-helper" style={{marginTop:4,fontSize:'12px'}}>Ready to connect with entered credentials.</p>
                        </div>
                      )}
                      
                      {hiddenSsidEnabled && connectionStatus !== 'success' && (
                        <div className="wifi-connected-summary" style={{marginTop:12}}>
                          <p className="setup-helper" style={{fontSize:'12px'}}>Hidden SSID: <strong>{hiddenSsid || '(not set)'}</strong></p>
                        </div>
                      )}
                      
                      <button
                        type="button"
                        className="setup-btn" 
                        style={{marginTop:16,width:'100%'}}
                        onClick={()=> setWifiModalOpen(true)}
                        disabled={connecting || connectionStatus==='success'}
                      >
                        {wifiSelected || hiddenSsidEnabled ? 'Change Network' : 'Select Network'}
                      </button>

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
                    {!verified && <p>We’ll confirm your SmarTanom before moving on.</p>}
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
              {step === 3 && (
                <div className="setup-verify-panel" role="region" aria-live="polite" aria-label="Send verification code" data-section="send-code">
                  <div className="setup-verify-content">
                    <h4>Send verification code</h4>
                    <p>We will email you a one‑time code.</p>
                  </div>
                  <div className="setup-verify-actions">
                    <button type="button" className="setup-btn" onClick={sendCode} disabled={sendingCode || !isValidEmail(bindEmail)}>{sendingCode? 'Sending…':'Send Code'}</button>
                  </div>
                </div>
              )}
              {step === 4 && (
                <div className="setup-verify-panel" role="region" aria-live="polite" aria-label="Verify email code" data-section="verify-step4">
                  <div className="setup-verify-content">
                    <h4>Verify email</h4>
                    <p>Enter the code and continue.</p>
                  </div>
                  <div className="setup-verify-actions" style={{display:'flex', gap:12}}>
                    <button type="button" className="setup-btn outline sm" disabled={verifyingOtp} onClick={resendOtp}>Resend</button>
                    <button type="button" className="setup-btn sm" disabled={verifyingOtp || otpCode.some(c=>!c)} onClick={verifyOtp}>{verifyingOtp? 'Verifying…':'Verify Code'}</button>
                  </div>
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
              <div className="setup-modal-content setup-modal-error" >
                <h4 style={{ margin: 0, textAlign:'center' }}>Verification Error</h4>
                <p style={{ margin: 0, textAlign:'center' }}>{modal.message}</p>
                <div style={{ display: 'flex', gap: 10, marginTop: 10, justifyContent:'center' }}>
                  <button type="button" className="setup-btn" onClick={closeModal}>OK</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="auth-image-column" aria-hidden="true" />
    </div>
    
    {showDefaultImageModal && (
        <div
          className="setup-modal default-image-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="defaultImageModalTitle"
          onClick={(e) => { if (e.target === e.currentTarget) setShowDefaultImageModal(false); }}
        >
          <div className="setup-modal-content default-image-modal-content" role="document">
            <div className="modal-head-row">
              <h4 id="defaultImageModalTitle" style={{ margin: 0 }}>Choose a Default Image</h4>
              <button
                type="button"
                className="modal-close-btn inline"
                aria-label="Close image selection"
                onClick={() => setShowDefaultImageModal(false)}
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>
            <p className="setup-helper" style={{ marginTop: 0 }}>Select one option below.</p>
            <ul className="default-image-grid" role="listbox" aria-label="Default plant image options">
              {defaultImages.map(name => {
                const selected = name === selectedDefaultImage;
                return (
                  <li key={name} className="default-image-item" role="option" aria-selected={selected}>
                    <button
                      type="button"
                      className={`default-image-btn${selected ? ' selected' : ''}`}
                      onClick={() => {
                        setSelectedDefaultImage(name);
                        setShowDefaultImageModal(false);
                      }}
                      onKeyDown={(e)=>{ if(e.key==='Escape'){ setShowDefaultImageModal(false); } }}
                    >
                      <span className="default-image-label">{name}</span>
                      {selected && <span className="visually-hidden"> (selected)</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
      
      {/* Plant Photo Modal */}
      {showPlantPhotoModal && (
        <div
          className="wifi-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="plant-photo-modal-title"
          onClick={(e) => { if (e.target === e.currentTarget) setShowPlantPhotoModal(false); }}
        >
          <div className="wifi-modal-content">
            <div className="wifi-modal-header">
              <h4 id="plant-photo-modal-title" className="wifi-modal-title">Choose Plant Photo</h4>
              <button
                type="button"
                className="modal-close-btn"
                aria-label="Close modal"
                onClick={() => setShowPlantPhotoModal(false)}
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>
            <div className="wifi-modal-body" style={{ gap: '16px' }}>
              <p className="setup-helper" style={{ textAlign: 'center', margin: 0 }}>
                Upload your own photo or choose from default images
              </p>
              
              {/* Photo Options */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label htmlFor="cameraFileModal" className="setup-btn" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}>
                  <CameraIcon size={18} color="#ffffff" />
                  <span>Take Photo</span>
                </label>
                <input id="cameraFileModal" type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setUploadPhotoName(f.name);
                      const url = URL.createObjectURL(f);
                      setUploadPhotoUrl(url);
                      setPlantPhotoChoice('upload');
                      setShowPlantPhotoModal(false);
                    }
                  }} />
                
                <label htmlFor="galleryFileModal" className="setup-btn" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}>
                  <UploadIcon size={18} color="#ffffff" />
                  <span>Upload from Gallery</span>
                </label>
                <input id="galleryFileModal" type="file" accept="image/*" style={{ display: 'none' }}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setUploadPhotoName(f.name);
                      const url = URL.createObjectURL(f);
                      setUploadPhotoUrl(url);
                      setPlantPhotoChoice('upload');
                      setShowPlantPhotoModal(false);
                    }
                  }} />
                
                <button
                  type="button"
                  className="setup-btn"
                  onClick={() => {
                    setShowPlantPhotoModal(false);
                    setShowDefaultImageModal(true);
                  }}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  <LeafIcon size={18} color="#ffffff" />
                  <span>Choose Default Image</span>
                </button>
                
                {(plantPhotoChoice === 'upload' && uploadPhotoUrl) && (
                  <div className="photo-preview" aria-live="polite" style={{ marginTop: '8px', textAlign: 'center' }}>
                    <img src={uploadPhotoUrl} alt="Selected plant" style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '8px', margin: '0 auto 12px', display: 'block', border: '2px solid #4A9B4D' }} />
                    <span className="setup-file-name" style={{ fontSize: '0.875rem', display: 'block', marginBottom: '8px', color: 'rgba(255,255,255,0.9)' }}>{uploadPhotoName}</span>
                    <button
                      type="button"
                      className="setup-btn outline"
                      onClick={() => {
                        setUploadPhotoName('');
                        setUploadPhotoUrl('');
                        setPlantPhotoChoice('none');
                      }}
                    >
                      Remove Photo
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* WiFi Setup Modal - Full Screen Overlay */}
      {wifiModalOpen && (
        <div className="wifi-modal-overlay" onClick={()=> setWifiModalOpen(false)} role="dialog" aria-modal="true" aria-labelledby="wifi-modal-title">
          <div className="wifi-modal-content" onClick={e=> e.stopPropagation()}>
            <div className="wifi-modal-header">
              <h1 id="wifi-modal-title" className="wifi-modal-title">Wi-Fi Setup</h1>
              <button type="button" className="modal-close-btn" onClick={()=> setWifiModalOpen(false)} aria-label="Close modal">
                ×
              </button>
            </div>
            
            <div className="wifi-modal-body">
              <p className="wifi-setup-description">Enter your Wi-Fi network credentials to connect your SmarTanom device to the internet.</p>
              
              {connectionStatus && connectionStatus!=='success' && (
                <div className="wifi-status-banner error" role="alert">Connection failed: {connectionStatus}. Please try again.</div>
              )}
              
              {/* Wi-Fi Name (SSID) Field */}
              <div className="wifi-input-field">
                <label className="wifi-input-label" htmlFor="wifiSsidInput">Wi-Fi Name (SSID)</label>
                <input
                  id="wifiSsidInput"
                  type="text"
                  className="wifi-input"
                  placeholder="Enter your Wi-Fi network name"
                  value={hiddenSsid}
                  onChange={e=> setHiddenSsid(e.target.value)}
                  autoComplete="off"
                  disabled={connecting}
                />
              </div>
              
              {/* Wi-Fi Password Field */}
              <div className="wifi-input-field">
                <label className="wifi-input-label" htmlFor="wifiPasswordInput">Wi-Fi Password</label>
                <div className="wifi-password-wrapper">
                  <input
                    id="wifiPasswordInput"
                    type={showWifiPw? 'text':'password'}
                    className="wifi-input"
                    placeholder="Enter your Wi-Fi password"
                    value={wifiPassword}
                    onChange={e=> setWifiPassword(e.target.value)}
                    autoComplete="off"
                    disabled={connecting}
                  />
                  <button 
                    type="button" 
                    className="wifi-password-toggle" 
                    onClick={()=> setShowWifiPw(p=>!p)}
                    aria-label={showWifiPw? 'Hide password':'Show password'}
                  >
                    {showWifiPw? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>
            
            <div className="wifi-modal-footer">
              <button
                type="button"
                className="wifi-user-guide-btn"
                onClick={()=> setUserGuideOpen(true)}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                User Guide
              </button>
              <button
                type="button"
                className="wifi-connect-btn"
                disabled={!hiddenSsid.trim() || wifiPassword.length < 8 || connecting}
                onClick={()=> {
                  setConnecting(true);
                  setTimeout(()=> {
                    setConnecting(false);
                    setWifiModalOpen(false);
                    setSuccessModalOpen(true);
                  }, 1500);
                }}
              >
                {connecting? 'Connecting…':'Connect Device'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Success Confirmation Modal - Full Screen Overlay */}
      {successModalOpen && (
        <div className="wifi-modal-overlay" onClick={()=> setSuccessModalOpen(false)} role="dialog" aria-modal="true" aria-labelledby="success-modal-title">
          <div className="success-modal-content" onClick={e=> e.stopPropagation()}>
            <button type="button" className="modal-close-btn" onClick={()=> setSuccessModalOpen(false)} aria-label="Close modal">
              ×
            </button>
            <div className="success-icon">
              <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>
            <h2 id="success-modal-title" className="success-title">Device Successfully Connected to Wi-Fi!</h2>
            <p className="success-message">Your SmarTanom device is now connected to your Wi-Fi network and ready to use.</p>
            <button
              type="button"
              className="success-continue-btn"
              onClick={()=> { setSuccessModalOpen(false); setStep(6); }}
            >
              Continue
            </button>
          </div>
        </div>
      )}
      
      {/* User Guide Modal - Full Screen Overlay */}
      {userGuideOpen && (
        <div className="wifi-modal-overlay" onClick={()=> setUserGuideOpen(false)} role="dialog" aria-modal="true" aria-labelledby="guide-modal-title">
          <div className="guide-modal-content" onClick={e=> e.stopPropagation()}>
            <div className="guide-modal-header">
              <h2 id="guide-modal-title" className="guide-modal-title">Wi-Fi Setup Guide</h2>
              <button type="button" className="modal-close-btn" onClick={()=> setUserGuideOpen(false)} aria-label="Close modal">
                ×
              </button>
            </div>
            <div className="guide-modal-body">
              <ol className="guide-steps">
                <li>
                  <div className="guide-step-number">1</div>
                  <div className="guide-step-content">
                    <h3>Connect to SmarTanom Hotspot</h3>
                    <p>Power on your SmarTanom device. It will automatically activate its Wi-Fi hotspot (usually named "SmarTanom-XXXX"). Connect your phone or computer to this hotspot.</p>
                  </div>
                </li>
                <li>
                  <div className="guide-step-number">2</div>
                  <div className="guide-step-content">
                    <h3>Return to This Page</h3>
                    <p>Once connected to the SmarTanom hotspot, return to this web app. The app will detect the connection automatically.</p>
                  </div>
                </li>
                <li>
                  <div className="guide-step-number">3</div>
                  <div className="guide-step-content">
                    <h3>Enter Your Wi-Fi Details</h3>
                    <p>Enter your home Wi-Fi network name (SSID) and password in the setup form. Make sure the credentials are correct.</p>
                  </div>
                </li>
                <li>
                  <div className="guide-step-number">4</div>
                  <div className="guide-step-content">
                    <h3>Click "Connect Device"</h3>
                    <p>Press the "Connect Device" button. The SmarTanom will attempt to connect to your Wi-Fi network.</p>
                  </div>
                </li>
                <li>
                  <div className="guide-step-number">5</div>
                  <div className="guide-step-content">
                    <h3>Wait for Confirmation</h3>
                    <p>Once successfully connected, you'll see a confirmation message. You can then continue with the setup process.</p>
                  </div>
                </li>
              </ol>
              <div className="guide-tip">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                <p><strong>Tip:</strong> If the connection fails, ensure your Wi-Fi password is correct and your router is within range of the device.</p>
              </div>
            </div>
            <div className="guide-modal-footer">
              <button
                type="button"
                className="guide-close-btn"
                onClick={()=> setUserGuideOpen(false)}
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


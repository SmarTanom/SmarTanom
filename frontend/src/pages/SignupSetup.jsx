import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BrandMark from '../components/brand/BrandMark.jsx';
import '../pages/AuthSetupPage.css';
import { ChevronLeftFilled } from '../components/ui/Icon.jsx';
import { CheckCircleFilled } from '../components/ui/Icon.jsx';
import { Mail } from '../components/ui/Icon.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { 
  checkUsernameAvailability as apiCheckUsername, 
  completeSetup as apiCompleteSetup,
  requestCode as apiRequestCode,
  verifyCode as apiVerifyCode,
} from '../services/api/auth';

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

const WifiIcon = ({ size = 28, color = '#ffffff' }) => (
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
    <path d="M5 12.55a11 11 0 0 1 14.08 0" />
    <path d="M1.42 9a16 16 0 0 1 21.16 0" />
    <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
    <line x1="12" y1="20" x2="12.01" y2="20" />
  </svg>
);

export default function SignupSetup() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [step, setStep] = useState(1); // 1..6
  const total = 6;
  // Step 1 state
  const [deviceId, setDeviceId] = useState('');
  const [fileName, setFileName] = useState('');
  const [verified, setVerified] = useState(false);
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
  const [otp, setOtp] = useState(Array(6).fill(''));
  const otpRefs = useRef(Array.from({ length: 6 }, () => React.createRef()));

  function handleOtpChange(idx, val) {
    const next = [...otp];
    const v = val.replace(/\D/g, '').slice(0, 1);
    next[idx] = v;
    setOtp(next);
    if (v && idx < 5) {
      otpRefs.current[idx + 1].current?.focus();
    }
  }

  function handleOtpKeyDown(idx, e) {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
      otpRefs.current[idx - 1].current?.focus();
    }
    if (e.key === 'ArrowLeft' && idx > 0) otpRefs.current[idx - 1].current?.focus();
    if (e.key === 'ArrowRight' && idx < 5) otpRefs.current[idx + 1].current?.focus();
    if (e.key === 'Enter' && isOtpComplete) verifyOtp();
  }

  function handleOtpPaste(e) {
    const text = (e.clipboardData?.getData('text') || '').replace(/\D/g, '').slice(0, 6);
    if (text.length) {
      e.preventDefault();
      const next = Array(6).fill('');
      for (let i = 0; i < text.length; i++) next[i] = text[i];
      setOtp(next);
      const target = otpRefs.current[Math.min(text.length, 5)].current;
      target?.focus();
    }
  }

  const isOtpComplete = otp.every((c) => c !== '');

  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState('');

  // Step 5 state (WiFi Setup)
  const [wifiSSID, setWifiSSID] = useState('');
  const [wifiPassword, setWifiPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [connectingWifi, setConnectingWifi] = useState(false);

  // Step 6 state (Set Username)
  const [username, setUsername] = useState('');
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState(null);
  const [usernameError, setUsernameError] = useState('');
  const [completingSetup, setCompletingSetup] = useState(false);
  const checkUsernameTimeout = useRef(null);

  async function verifyOtp() {
    if (!isOtpComplete) return;
    setOtpError('');
    setVerifyingOtp(true);
    try {
      const code = otp.join('');
      const result = await apiVerifyCode(bindEmail, code, 'signup');
      // Sign the user in so subsequent requests (e.g., complete-setup) have auth
      await signIn({
        email: result?.user?.email || bindEmail,
        username: result?.user?.username || '',
        token: result?.token,
        isNewUser: true,
        role: result?.user?.role,
      });
      setStep(5);
    } catch (err) {
      setOtpError(err?.message || 'Code expired or invalid. Please try again or request a new code.');
      // Clear OTP on error for retry
      setOtp(Array(6).fill(''));
      otpRefs.current[0]?.current?.focus();
    } finally {
      setVerifyingOtp(false);
    }
  }

  function maskEmail(email) {
    if (!email) return '';
    const [name, domain] = email.split('@');
    if (!domain) return email;
    const visible = name.slice(0, 2);
    return `${visible}${name.length > 2 ? '***' : ''}@${domain}`;
  }

  function validateUsername(value) {
    // Username rules: 3-20 chars, alphanumeric + underscore, must start with letter
    if (!value) return '';
    if (value.length < 3) return 'Username must be at least 3 characters';
    if (value.length > 20) return 'Username must be 20 characters or less';
    if (!/^[a-zA-Z]/.test(value)) return 'Username must start with a letter';
    if (!/^[a-zA-Z0-9_]+$/.test(value)) return 'Username can only contain letters, numbers, and underscores';
    return '';
  }

  async function checkUsernameAvailability(value) {
    if (!value || validateUsername(value)) {
      setUsernameAvailable(null);
      return;
    }
    setCheckingUsername(true);
    try {
      const available = await apiCheckUsername(value);
      setUsernameAvailable(available);
      setUsernameError(available ? '' : 'This username is already taken');
    } catch (err) {
      setUsernameError(err?.message || 'Unable to check username availability');
      setUsernameAvailable(false);
    } finally {
      setCheckingUsername(false);
    }
  }

  function handleUsernameChange(value) {
    setUsername(value);
    setUsernameAvailable(null);
    setUsernameError('');
    
    const validationError = validateUsername(value);
    if (validationError) {
      setUsernameError(validationError);
      return;
    }

    // Debounce availability check
    if (checkUsernameTimeout.current) {
      clearTimeout(checkUsernameTimeout.current);
    }
    checkUsernameTimeout.current = setTimeout(() => {
      checkUsernameAvailability(value);
    }, 500);
  }

  async function completeSetup() {
    if (!username || usernameError || !usernameAvailable) return;
    setCompletingSetup(true);
    try {
      const result = await apiCompleteSetup({ username });
      const token = JSON.parse(localStorage.getItem('smartanom_user')||'{}')?.token;
      const user = await signIn({
        email: result.user?.email || bindEmail,
        username: result.user?.username || username,
        token,
        isNewUser: true,
        role: result.user?.role,
      });
      
      // Navigate to appropriate dashboard based on role
      if (user.role === 'admin') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      setUsernameError(err?.message || 'Failed to complete setup. Please try again.');
    } finally {
      setCompletingSetup(false);
    }
  }

  // Focus first OTP input when entering step 4
  useEffect(() => {
    if (step === 4) {
      otpRefs.current[0]?.current?.focus();
    }
  }, [step]);

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
      await apiRequestCode(bindEmail, 'signup');
      setStep(4);
    } catch (err) {
      setEmailError(err?.message || 'Failed to send code. Please try again.');
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
    `Enter the 6-digit code we sent to ${maskEmail(bindEmail) || 'your email'}`,
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
    if (f) {
      setFileName(f.name);
      if (verified) setVerified(false);
    } else {
      setFileName('');
      if (verified) setVerified(false);
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

  return (
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
                              {state === 'completed' ? (
                                <CheckCircleFilled size={18} color="#ffffff" checkColor="#016b22" />
                              ) : (
                                idx
                              )}
                            </span>
                            <span className="setup-step-label">{stepLabels[i]}</span>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </nav>
                <div className="setup-step-meta" aria-live="polite">
                  <span className="setup-step-count">Step {step} of {total}</span>
                  <span className="setup-step-tag">{headings[step - 1]}</span>
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
                            autoComplete="nickname"
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
                            autoComplete="on"
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
                          <label className="setup-field-label" htmlFor="plantPhoto">Plant Photo</label>
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
                  </section>
                )}
                {step === 4 && (
                  <section className="setup-section setup-step-4" aria-label="Verify Email">
                    <div className="otp-wrapper">
                      <div className="otp-container">
                        <div className="otp-grid" onPaste={handleOtpPaste}>
                          {otp.map((c, i) => (
                            <input
                              key={i}
                              ref={otpRefs.current[i]}
                              className={`otp-input ${otpError ? 'error' : ''}`}
                              inputMode="numeric"
                              pattern="[0-9]*"
                              maxLength={1}
                              value={c}
                              onChange={(e) => handleOtpChange(i, e.target.value)}
                              onKeyDown={(e) => handleOtpKeyDown(i, e)}
                              aria-label={`Digit ${i + 1}`}
                              aria-invalid={!!otpError}
                            />
                          ))}
                        </div>
                      </div>
                      {otpError && <div className="setup-error" role="alert">{otpError}</div>}
                      <div className="otp-resend-wrapper">
                        <span className="otp-resend-text">Didn't receive a code?</span>
                        <button
                          type="button"
                          className="otp-resend-link"
                          onClick={sendCode}
                          disabled={sendingCode || !isValidEmail(bindEmail)}
                        >
                          {sendingCode ? 'Resending…' : 'Resend'}
                        </button>
                      </div>
                    </div>
                  </section>
                )}
                {step === 5 && (
                  <section className="setup-section setup-step-5" aria-label="WiFi Setup">
                    <div className="setup-card wifi-card">
                      <div className="wifi-icon-wrapper">
                        <WifiIcon size={48} color="#ffffff" />
                      </div>
                      <div className="setup-form-grid">
                        <div className="setup-field span-2">
                          <label className="setup-field-label" htmlFor="wifiSSID">
                            WiFi Network Name (SSID) <span className="required-mark">*</span>
                          </label>
                          <input
                            id="wifiSSID"
                            type="text"
                            placeholder="Enter WiFi network name"
                            value={wifiSSID}
                            onChange={(e) => setWifiSSID(e.target.value)}
                            autoComplete="off"
                            inputMode="text"
                            required
                          />
                        </div>
                        <div className="setup-field span-2">
                          <label className="setup-field-label" htmlFor="wifiPassword">
                            WiFi Password <span className="required-mark">*</span>
                          </label>
                          <div className="input-with-toggle">
                            <input
                              id="wifiPassword"
                              type={showPassword ? 'text' : 'password'}
                              placeholder="Enter WiFi password"
                              value={wifiPassword}
                              onChange={(e) => setWifiPassword(e.target.value)}
                              autoComplete="off"
                              inputMode="text"
                              required
                            />
                            <button
                              type="button"
                              className="password-toggle"
                              onClick={() => setShowPassword(!showPassword)}
                              aria-label={showPassword ? 'Hide password' : 'Show password'}
                            >
                              {showPassword ? (
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                  <line x1="1" y1="1" x2="23" y2="23" />
                                </svg>
                              ) : (
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                  <circle cx="12" cy="12" r="3" />
                                </svg>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>
                )}
                {step === 6 && (
                  <section className="setup-section setup-step-6" aria-label="Set Username">
                    <div className="setup-card username-card">
                      <div className="setup-form-grid">
                        <div className="setup-field span-2">
                          <label className="setup-field-label" htmlFor="username">
                            Choose Your Username <span className="required-mark">*</span>
                          </label>
                          <div className="username-input-wrapper">
                            <input
                              id="username"
                              type="text"
                              placeholder="Enter your username"
                              value={username}
                              onChange={(e) => handleUsernameChange(e.target.value)}
                              autoComplete="username"
                              inputMode="text"
                              maxLength={20}
                              required
                              className={usernameError ? 'error' : usernameAvailable ? 'success' : ''}
                              aria-describedby="username-helper"
                              aria-invalid={!!usernameError}
                            />
                            {checkingUsername && (
                              <div className="username-status checking">
                                <svg className="spinner" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <line x1="12" y1="2" x2="12" y2="6"></line>
                                  <line x1="12" y1="18" x2="12" y2="22"></line>
                                  <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
                                  <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
                                  <line x1="2" y1="12" x2="6" y2="12"></line>
                                  <line x1="18" y1="12" x2="22" y2="12"></line>
                                  <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
                                  <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
                                </svg>
                              </div>
                            )}
                            {!checkingUsername && usernameAvailable === true && (
                              <div className="username-status available">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                              </div>
                            )}
                            {!checkingUsername && usernameAvailable === false && (
                              <div className="username-status unavailable">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                  <line x1="18" y1="6" x2="6" y2="18"></line>
                                  <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                              </div>
                            )}
                          </div>
                          <p id="username-helper" className="setup-helper setup-helper--sm">
                            3-20 characters. Must start with a letter. Can contain letters, numbers, and underscores.
                          </p>
                          {usernameError && <p className="setup-error" role="alert">{usernameError}</p>}
                          {usernameAvailable === true && !usernameError && (
                            <p className="setup-success" role="status">Username is available!</p>
                          )}
                        </div>
                      </div>
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
                    <p>We’ll confirm your SmarTanom before moving on.</p>
                  </div>
                  <div className="setup-verify-actions">
                    <button type="button" className="setup-btn" onClick={verifyDevice} disabled={checking}>
                      {checking ? 'Verifying…' : 'Verify Device'}
                    </button>
                    {verified && (
                      <span className="setup-status success" role="status">✓ Device verified</span>
                    )}
                  </div>
                </div>
              )}
              {step === 3 && (
                <div className="setup-verify-panel" role="region" aria-live="polite" aria-label="Send code to email" data-section="send-code">
                  <div className="setup-verify-content">
                    <h4>Send verification code</h4>
                    <p>We’ll send a 6-digit code to your email.</p>
                  </div>
                  <div className="setup-verify-actions">
                    <button type="button" className="setup-btn" onClick={sendCode} disabled={sendingCode || !bindEmail || !isValidEmail(bindEmail)}>
                      {sendingCode ? 'Sending…' : 'Send Code'}
                    </button>
                  </div>
                </div>
              )}
              {step === 4 && (
                <div className="setup-verify-panel" role="region" aria-live="polite" aria-label="Verify code" data-section="verify-code">
                  <div className="setup-verify-content">
                    <h4>Verify code</h4>
                    <p>Enter the 6 digits above, then continue.</p>
                  </div>
                  <div className="setup-verify-actions">
                    <button type="button" className="setup-btn" onClick={verifyOtp} disabled={!isOtpComplete || verifyingOtp}>
                      {verifyingOtp ? 'Verifying…' : 'Verify'}
                    </button>
                  </div>
                </div>
              )}
              {step === 5 && (
                <div className="setup-verify-panel wifi-complete-panel" role="region" aria-live="polite" aria-label="Connect to WiFi" data-section="wifi-connect">
                  <div className="setup-verify-content">
                    <h4>Connect to WiFi</h4>
                    <p>Your device will connect to the WiFi network.</p>
                  </div>
                  <div className="setup-verify-actions">
                    <button type="button" className="setup-btn wifi-complete-btn" onClick={() => setStep(6)} disabled={!wifiSSID || !wifiPassword || connectingWifi}>
                      {connectingWifi ? 'Connecting…' : 'Connect Device'}
                    </button>
                  </div>
                </div>
              )}
              {step === 6 && (
                <div className="setup-verify-panel" role="region" aria-live="polite" aria-label="Complete setup" data-section="complete-setup">
                  <div className="setup-verify-content">
                    <h4>Complete Setup</h4>
                    <p>Finish setting up your account and go to your dashboard.</p>
                  </div>
                  <div className="setup-verify-actions">
                    <button 
                      type="button" 
                      className="setup-btn" 
                      onClick={completeSetup} 
                      disabled={!username || checkingUsername || usernameAvailable === false || !!usernameError || completingSetup}
                    >
                      {completingSetup ? 'Completing…' : 'Complete Setup'}
                    </button>
                  </div>
                </div>
              )}

              <div className="setup-actions">
                <button type="button" className="setup-btn outline" onClick={goPrev} aria-label="Previous step">Previous</button>
                <button type="button" className="setup-btn" onClick={goNext} aria-label="Next step" disabled={(step === 1 && !verified) || step === 4 || step === 5 || step === 6}>{step === 3 ? 'Next' : 'Next'}</button>
              </div>
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
  );
}


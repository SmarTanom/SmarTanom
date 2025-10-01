import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BrandMark from '../components/brand/BrandMark.jsx';
import '../pages/AuthSetupPage.css';
import { ChevronLeftFilled } from '../components/ui/Icon.jsx';

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
  const [checking, setChecking] = useState(false);
  const [modal, setModal] = useState({ open: false, message: '' });

  // Step 2 state (all optional)
  const [nickname, setNickname] = useState('');
  const [location, setLocation] = useState('');
  const [plantPhotoChoice, setPlantPhotoChoice] = useState('none'); // 'camera' | 'upload' | 'default' | 'none'
  const [uploadPhotoName, setUploadPhotoName] = useState('');
  const defaultImages = [
    'Lettuce - Salanova', 'Lettuce - Butterhead', 'Lettuce - Looseleaf', 'Lettuce - Batavia', 'Lettuce - Romaine',
    'Spinach', 'Arugula', 'Kale', 'Bok Choy', 'Basil', 'Mint', 'Oregano', 'Cilantro', 'Chives', 'Parsley', 'Thyme'
  ];
  const [selectedDefaultImage, setSelectedDefaultImage] = useState('');
  const plantTypes = [
    'Lettuce', 'Spinach', 'Arugula', 'Kale', 'Bok Choy', 'Basil', 'Mint', 'Oregano', 'Cilantro', 'Chives', 'Parsley', 'Thyme', 'Other'
  ];
  const [plantType, setPlantType] = useState('');
  const [progressUnit, setProgressUnit] = useState(''); // '' | 'weeks' | 'days'
  const [progressValue, setProgressValue] = useState(''); // numeric string, optional
  const progressError = useMemo(() => {
    if ((progressUnit && !progressValue) || (!progressUnit && progressValue)) {
      return 'Please enter a number and select a unit.';
    }
    return '';
  }, [progressUnit, progressValue]);

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
                            <span className="setup-step-icon" aria-hidden="true">{state === 'completed' ? '✓' : idx}</span>
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
                            <label className="setup-field-label" htmlFor="deviceId">Device ID</label>
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
                            />
                          </div>
                        </div>
                      </article>
                    </div>
                  </section>
                )}
                {step === 2 && (
                  <section className="setup-section setup-step-2" aria-label="First-Time Device Setup">
                    {/* Device Information Card */}
                    <div className="setup-card">
                      <h3 className="setup-section-title">Device Information</h3>
                      <div className="setup-form-grid">
                        <div className="setup-field">
                          <label className="setup-field-label" htmlFor="nickname">Device Nickname</label>
                          <input
                            id="nickname"
                            type="text"
                            placeholder="Optional — defaults to serial ID"
                            value={nickname}
                            onChange={(e) => setNickname(e.target.value)}
                          />
                          <p className="setup-helper">If left empty, we will use the device’s serial ID.</p>
                        </div>

                        <div className="setup-field">
                          <label className="setup-field-label" htmlFor="location">Location</label>
                          <input
                            id="location"
                            type="text"
                            placeholder="e.g., Balcony, Backyard"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                          />
                          <p className="setup-helper">Where is your SmarTanom installed? (e.g., balcony, backyard)</p>
                        </div>
                      </div>
                    </div>

                    {/* Plant Information Card */}
                    <div className="setup-card">
                      <h3 className="setup-section-title">Plant Information</h3>
                      <div className="setup-form-grid">
                        <div className="setup-field span-2">
                          <label className="setup-field-label">Plant Photo</label>
                          <div className="setup-input-inline">
                            <div className="photo-choice-row">
                              <button
                                type="button"
                                className={`setup-btn sm ${plantPhotoChoice === 'camera' ? '' : 'outline'}`}
                                onClick={() => setPlantPhotoChoice('camera')}
                                aria-pressed={plantPhotoChoice === 'camera'}
                              >
                                Take Photo
                              </button>
                              <label className={`setup-btn sm ${plantPhotoChoice === 'upload' ? '' : 'outline'}`}>
                                <input
                                  type="file"
                                  accept="image/*"
                                  style={{ display: 'none' }}
                                  onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    setUploadPhotoName(f ? f.name : '');
                                    setPlantPhotoChoice(f ? 'upload' : 'none');
                                  }}
                                />
                                Upload from Gallery
                              </label>
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
                              <div className="setup-field" style={{ marginTop: 6 }}>
                                <label className="setup-field-label" htmlFor="defaultImage">Default image</label>
                                <select
                                  id="defaultImage"
                                  value={selectedDefaultImage}
                                  onChange={(e) => setSelectedDefaultImage(e.target.value)}
                                  className="setup-select"
                                >
                                  <option value="">Select a default image…</option>
                                  {defaultImages.map((opt) => (
                                    <option key={opt} value={opt}>{opt}</option>
                                  ))}
                                </select>
                              </div>
                            )}
                            {(plantPhotoChoice === 'upload' && uploadPhotoName) && (
                              <span className="setup-file-name" aria-live="polite">{uploadPhotoName}</span>
                            )}
                            {plantPhotoChoice === 'camera' && (
                              <span className="setup-hint">Camera will open on supported devices.</span>
                            )}
                            {plantPhotoChoice === 'none' && (
                              <span className="setup-hint">No photo selected — will fallback to defaulthydroponic.png</span>
                            )}
                          </div>
                        </div>

                        <div className="setup-field">
                          <label className="setup-field-label" htmlFor="plantType">Plant Type</label>
                          <select
                            id="plantType"
                            value={plantType}
                            onChange={(e) => setPlantType(e.target.value)}
                            className="setup-select"
                          >
                            <option value="">Optional — choose type</option>
                            {plantTypes.map((opt) => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                          <p className="setup-helper">Optional — helps us tailor recommendations.</p>
                        </div>

                        <div className="setup-field">
                          <label className="setup-field-label" htmlFor="progressValue">Growth Progress</label>
                          <div className="setup-input-inline growth-row">
                            <input
                              id="progressValue"
                              type="number"
                              min="0"
                              inputMode="numeric"
                              placeholder="Amount"
                              value={progressValue}
                              onChange={(e) => setProgressValue(e.target.value)}
                              style={{ maxWidth: 160 }}
                            />
                            <select
                              value={progressUnit}
                              onChange={(e) => setProgressUnit(e.target.value)}
                              className="setup-select"
                              style={{ maxWidth: 200 }}
                            >
                              <option value="">Unit (e.g., cm, %, weeks)</option>
                              <option value="weeks">Weeks since planting</option>
                              <option value="days">Days since planting</option>
                            </select>
                          </div>
                          <p className="setup-helper">Enter a number (e.g., 15) and select a unit (cm, %, weeks).</p>
                          {progressError && <p className="setup-error" role="alert">{progressError}</p>}
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

              <div className="setup-actions">
                <button type="button" className="setup-btn outline" onClick={goPrev} aria-label="Previous step">Previous</button>
                <button type="button" className="setup-btn" onClick={goNext} aria-label="Next step" disabled={step === 1 && !verified}>Next</button>
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

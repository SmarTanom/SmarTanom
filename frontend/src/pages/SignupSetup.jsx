import React, { useMemo, useState, useEffect, useRef } from 'react';
import jsQR from 'jsqr';
import { useNavigate } from 'react-router-dom';
import BrandMark from '../components/brand/BrandMark.jsx';
import '../pages/AuthSetupPage.css';
import { ChevronLeftFilled } from '../components/ui/Icon.jsx';
import { Check } from '../components/ui/Icon.jsx';
import { Mail } from '../components/ui/Icon.jsx';
import { Wifi, Refresh, Lock, SignalBars } from '../components/ui/Icon.jsx';
import { authApi, deviceApi } from '../services/apiClient.js';
import { listPlants } from '../services/api/plants.js';
import { createReservoir } from '../services/api/reservoirs.js';
import { checkDevice, requestDeviceOTP, verifyDeviceOTP } from '../services/api/devices.js';
// Removed shared OtpInput component per request; using local inline inputs
// (Removed duplicate React hook import; useRef/useEffect already available or use React.useRef if needed)

function SignupStepFourOtp({ otpCode, setOtpCode, verifyingOtp, otpError, setStatusMsg }) {
  const refs = useRef([]);
  useEffect(() => {
    // autofocus first empty digit when component mounts
    const firstEmpty = otpCode.split('').findIndex(c => !c);
    const idx = firstEmpty === -1 ? 0 : firstEmpty;
    const el = refs.current[idx];
    if (el && el.focus) { try { el.focus(); } catch { } }
  }, []); // run once
  return (
    <div className={`inline-otp-group ${otpError ? 'error' : ''}`} role="group" aria-label="Verification code">
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          ref={el => refs.current[i] = el}
          id={`signup-otp-${i}`}
          className="inline-otp-cell"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          aria-label={`Digit ${i + 1}`}
          aria-invalid={otpError || undefined}
          value={otpCode[i] || ''}
          data-filled={otpCode[i] ? 'true' : 'false'}
          disabled={verifyingOtp}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, '');
            if (!v) {
              const next = otpCode.split('');
              next[i] = '';
              setOtpCode(next.join(''));
              return;
            }
            const next = otpCode.padEnd(6, '').split('');
            next[i] = v[0];
            const joined = next.join('');
            setOtpCode(joined);
            if (i < 5) {
              refs.current[i + 1]?.focus();
            } else if (!next.includes('')) {
              setStatusMsg('Code entered. Ready to verify.');
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && !otpCode[i] && i > 0) {
              refs.current[i - 1]?.focus();
            } else if (e.key === 'ArrowLeft' && i > 0) {
              e.preventDefault();
              refs.current[i - 1]?.focus();
            } else if (e.key === 'ArrowRight' && i < 5) {
              e.preventDefault();
              refs.current[i + 1]?.focus();
            }
          }}
          onPaste={(e) => {
            const text = e.clipboardData.getData('text');
            if (!text) return;
            const digits = text.replace(/\D/g, '').slice(0, 6).split('');
            if (!digits.length) return;
            e.preventDefault();
            const next = Array.from({ length: 6 }, (_, idx) => digits[idx] || otpCode[idx] || '');
            setOtpCode(next.join(''));
            if (!next.includes('')) {
              setStatusMsg('Code entered. Ready to verify.');
              refs.current[5]?.blur();
            }
          }}
        />
      ))}
    </div>
  );
}

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
  // Resolve API base once with fallback to current origin if env not set
  const API_BASE = useMemo(() => {
    const raw = (import.meta.env.VITE_API_BASE_URL || '').trim();
    if (!raw) return window.location.origin;
    return raw.endsWith('/') ? raw.slice(0, -1) : raw;
  }, []);
  // Log API base only once in development to avoid spam
  if (import.meta.env.DEV && !window.__LOGGED_SIGNUP_API_BASE) {
    // eslint-disable-next-line no-console
    console.log('[SignupSetup] API_BASE =', API_BASE);
    window.__LOGGED_SIGNUP_API_BASE = true;
  }
  const [step, setStep] = useState(1); // 1..6
  const total = 6;
  // Step 1 state
  const [deviceId, setDeviceId] = useState('');
  const [fileName, setFileName] = useState('');
  const [verified, setVerified] = useState(false);
  const [justVerified, setJustVerified] = useState(false); // transient inline confirmation
  const [checking, setChecking] = useState(false);
  const [modal, setModal] = useState({ open: false, message: '' });

  // QR scanning state
  const [qrScanOpen, setQrScanOpen] = useState(false);
  const [qrError, setQrError] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const qrScanAnimRef = useRef(null);

  // Step 2 state (all optional)
  const [nickname, setNickname] = useState('');
  const [location, setLocation] = useState('');
  // Plant Name removed per request
  const [plantPhotoChoice, setPlantPhotoChoice] = useState('none'); // 'camera' | 'upload' | 'default' | 'none'
  const [uploadPhotoName, setUploadPhotoName] = useState('');
  const [uploadPhotoUrl, setUploadPhotoUrl] = useState('');
  const [uploadedPhotoFile, setUploadedPhotoFile] = useState(null); // Store the actual file
  const defaultImages = [
    'Salanova', 'Butterhead', 'Looseleaf', 'Batavia', 'Romaine',
    'Spinach', 'Arugula', 'Kale', 'Bok Choy', 'Basil', 'Mint', 'Oregano', 'Cilantro', 'Chives', 'Parsley', 'Thyme'
  ];
  const [plantOptions, setPlantOptions] = useState([]);
  const [selectedDefaultImage, setSelectedDefaultImage] = useState('');
  const [showDefaultImageModal, setShowDefaultImageModal] = useState(false); // new modal state
  const [showPlantPhotoModal, setShowPlantPhotoModal] = useState(false); // plant photo modal
  const [durationDays, setDurationDays] = useState(''); // numeric string, optional

  // Reservoir (Step 2)
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const plus30Str = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  }, []);
  const [reservoirName, setReservoirName] = useState('');
  const [plantId, setPlantId] = useState('');
  const [resStartDate, setResStartDate] = useState(todayStr);
  const [resEndDate, setResEndDate] = useState(plus30Str);
  const [reservoirError, setReservoirError] = useState('');

  useEffect(() => {
    async function loadPlants() {
      try {
        const data = await listPlants('');
        const items = Array.isArray(data) ? data : (data.results || []);
        setPlantOptions(items);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[SignupSetup] Could not load plant list', e);
        setPlantOptions([]);
      }
    }
    if (step === 2 && plantOptions.length === 0) {
      loadPlants();
    }
  }, [step]);

  // Step 3 state
  const [bindEmail, setBindEmail] = useState('');
  const [boundDeviceSerial, setBoundDeviceSerial] = useState(''); // Store device serial after binding
  const [sendingCode, setSendingCode] = useState(false);
  const [emailError, setEmailError] = useState('');

  // Step 4 state
  const [otpCode, setOtpCode] = useState(''); // string form now
  const [otpError, setOtpError] = useState('');
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpResent, setOtpResent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0); // seconds
  const [statusMsg, setStatusMsg] = useState(''); // aria-live polite updates

  // Cooldown interval management
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown(c => c - 1), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  // Step 5 state (WiFi provisioning)
  const [provisioningStatus, setProvisioningStatus] = useState('idle'); // idle | waiting | checking | success | failed | timeout
  const [provisioningError, setProvisioningError] = useState('');
  const [pollingAttempts, setPollingAttempts] = useState(0);
  const pollingAttemptsRef = React.useRef(0); // Track attempts with ref to avoid stale closures
  const pollingIntervalRef = React.useRef(null);
  const [deviceSerial, setDeviceSerial] = useState(''); // Store device serial for polling

  // Legacy WiFi state (kept for backward compatibility if needed)
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
  useEffect(() => {
    if (step === 5 && typeof window !== 'undefined') {
      const h = window.innerHeight;
      if (h <= 840 && h >= 600) {
        setWifiInstructionsOpen(false);
      }
    }
  }, [step]);

  // Start polling when entering step 5
  useEffect(() => {
    if (step === 5) {
      // Get device serial from boundDeviceSerial state
      if (boundDeviceSerial) {
        setDeviceSerial(boundDeviceSerial);
        // Pass serial directly to avoid race condition with setState
        startProvisioningWithSerial(boundDeviceSerial);
      } else {
        // eslint-disable-next-line no-console
        console.error('[SignupSetup] No boundDeviceSerial found when entering Step 5');
        setProvisioningError('Device serial not found. Please restart setup.');
        setProvisioningStatus('failed');
      }
    } else {
      // Clean up polling when leaving step 5
      stopPolling();
    }

    // Cleanup on unmount
    return () => {
      stopPolling();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, boundDeviceSerial]);

  function startProvisioningWithSerial(serial) {
    setProvisioningStatus('waiting');
    setProvisioningError('');
    setPollingAttempts(0);
    pollingAttemptsRef.current = 0;

    // Debug: Check if token exists
    const token = localStorage.getItem('authToken');
    if (!token) {
      // eslint-disable-next-line no-console
      console.error('[SignupSetup] No auth token found in localStorage. User may need to log in again.');
      setProvisioningError('Authentication required. Please refresh and complete the setup from the beginning.');
      setProvisioningStatus('failed');
      return;
    }

    // eslint-disable-next-line no-console
    console.log('[SignupSetup] Starting provisioning for device:', serial);

    // Start polling after a short delay to allow user to see instructions
    setTimeout(() => {
      startPollingWithSerial(serial);
    }, 2000);
  }

  function startProvisioning() {
    // Use deviceSerial from state (fallback)
    if (!deviceSerial) {
      // eslint-disable-next-line no-console
      console.error('[SignupSetup] No device serial available for provisioning');
      setProvisioningError('Device serial not found. Please restart setup.');
      setProvisioningStatus('failed');
      return;
    }
    startProvisioningWithSerial(deviceSerial);
  }

  function startPollingWithSerial(serial) {
    stopPolling(); // Clear any existing interval
    setProvisioningStatus('checking');

    const checkDeviceStatus = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (!token || !serial) {
          setProvisioningError('Authentication required. Please refresh and try again.');
          setProvisioningStatus('failed');
          stopPolling();
          return;
        }

        // Poll the device list endpoint and find our device
        const response = await deviceApi.list(token);

        // Handle both paginated and non-paginated responses
        let devicesList = [];
        if (Array.isArray(response)) {
          devicesList = response;
        } else if (response && Array.isArray(response.results)) {
          // Paginated response from Django REST Framework
          devicesList = response.results;
        } else {
          // eslint-disable-next-line no-console
          console.error('[SignupSetup] Invalid response from devices API:', response);
          setProvisioningError('Authentication error. Please refresh and log in again.');
          setProvisioningStatus('failed');
          stopPolling();
          return;
        }

        // eslint-disable-next-line no-console
        console.log('[SignupSetup] Polling devices. Looking for serial:', serial, 'in', devicesList.length, 'devices');
        // eslint-disable-next-line no-console
        console.log('[SignupSetup] Available devices:', devicesList.map(d => ({
          id: d.id,
          serial: d.serial,
          device_serial: d.device_serial,
          name: d.name || d.device_name
        })));

        // Try multiple field names (serial or device_serial)
        const device = devicesList.find(d =>
          d.serial === serial ||
          d.device_serial === serial
        );

        if (!device) {
          setProvisioningError('Device not found. Please contact support.');
          setProvisioningStatus('failed');
          stopPolling();
          return;
        }

        // Check if WiFi is configured
        if (device.wifi_configured) {
          console.log('[SignupSetup] ✓ Device already configured! Redirecting to dashboard...');
          setProvisioningStatus('success');
          setStatusMsg('Device is already connected! Redirecting to dashboard...');
          stopPolling();
          // Redirect to dashboard after short delay
          setTimeout(() => {
            navigate('/dashboard');
          }, 2000);
          return;
        }

        // Increment polling attempts
        pollingAttemptsRef.current += 1;
        setPollingAttempts(pollingAttemptsRef.current);

        // Timeout after 60 attempts (5 minutes at 5-second intervals)
        if (pollingAttemptsRef.current >= 60) {
          setProvisioningError('Provisioning timeout. Please ensure your device is powered on and try again.');
          setProvisioningStatus('timeout');
          stopPolling();
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('[SignupSetup] Provisioning check error:', error);
        // Don't stop polling on individual errors, just log them
        pollingAttemptsRef.current += 1;
        setPollingAttempts(pollingAttemptsRef.current);
      }
    };

    // Initial check
    checkDeviceStatus();

    // Set up polling interval (every 5 seconds)
    pollingIntervalRef.current = setInterval(checkDeviceStatus, 5000);
  }

  function stopPolling() {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }

  function retryProvisioning() {
    setProvisioningError('');
    setPollingAttempts(0);
    pollingAttemptsRef.current = 0;
    startProvisioning();
  }


  // Scroll anchor ref map
  const networkRefs = React.useRef({});

  // Step 6 state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [finalizing, setFinalizing] = useState(false);
  const [finalError, setFinalError] = useState('');
  const [accountCreated, setAccountCreated] = useState(false);
  const usernameCheckTimeoutRef = React.useRef(null);
  // (Snackbar removed per request)

  function isValidEmail(v) {
    return /[^\s@]+@[^\s@]+\.[^\s@]+/.test(v);
  }

  // Username field removed per request; availability checks removed.

  // When entering step 6, fetch current profile to prefill first/last names
  useEffect(() => {
    if (step !== 6) return;
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;
      authApi.getProfile(token).then(prof => {
        const fn = prof?.first_name || prof?.user?.first_name || '';
        const ln = prof?.last_name || prof?.user?.last_name || '';
        setFirstName(fn);
        setLastName(ln);
      }).catch(() => { });
    } catch { }
  }, [step]);

  async function sendCode() {
    setEmailError('');
    if (!isValidEmail(bindEmail)) {
      setEmailError('Please enter a valid email address.');
      return;
    }
    try {
      setSendingCode(true);
      const emailToSend = bindEmail.trim();
      const deviceSerial = deviceId.trim().toUpperCase();
      console.debug('[sendCode] attempting device OTP request', {
        serial_number: deviceSerial,
        email: emailToSend
      });
      const data = await requestDeviceOTP(deviceSerial, emailToSend);
      if (data.debug_code) {
        console.info('[sendCode] DEBUG OTP code:', data.debug_code);
      } else {
        console.debug('[sendCode] Device OTP request succeeded');
      }
      setStep(4);
    } catch (e) {
      console.warn('[sendCode] failed', e);
      if (e.status === 429) {
        setEmailError(e.message || 'Too many attempts. Please wait before retrying.');
      } else if (e.status === 400) {
        setEmailError(e.message || 'Invalid request. Please check the email and try again.');
      } else if (e.status >= 500) {
        setEmailError('Server error while sending code. Please retry shortly.');
      } else {
        setEmailError(e.message || 'Unable to send verification code.');
      }
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
    'Your Profile',
  ];

  const subtexts = [
    'Choose how you want to identify your SmarTanom device',
    'Configure your first SmarTanom! (Can be changed later)',
    'Enter your email to bind your SmarTanom device to your account',
    'Enter the 6-digit OTP code we sent to your email',
    'Connect your SmarTanom device to your WiFi network',
    'Set the name on your account',
  ];

  const stepLabels = ['Device', 'Setup', 'Bind', 'Verify', 'WiFi', 'Profile'];

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
      // Basic validation for device ID format
      const deviceSerial = deviceId.trim().toUpperCase();
      if (!deviceSerial) {
        throw new Error('Please enter a device serial number.');
      }

      // Format validation - should be SMRT-XXX-XXX format
      const serialPattern = /^SMRT-[A-Z0-9]{3}-[A-Z0-9]{3}$/;
      if (!serialPattern.test(deviceSerial)) {
        throw new Error('Device ID should look like SMRT-XXX-XXX. If you uploaded a QR image, we could not read a valid ID from the QR content—please try a clearer photo or re‑scan.');
      }

      // Do not auto-verify based on file upload; QR uploads should decode into deviceId then follow normal API check

      // Check if device exists in database
      console.log('Checking device:', deviceSerial);
      const response = await checkDevice(deviceSerial);
      console.log('Device check response:', response);

      if (!response.exists) {
        console.log('Device not found - blocking navigation');
        throw new Error('Device not found. Please check the serial number and try again.');
      }

      if (response.is_bound) {
        console.log('Device already bound - blocking navigation');
        throw new Error('This device is already bound to an email address.');
      }

      console.log('Device validation passed - allowing navigation');      // Device exists and can be bound
      setVerified(true);
      setJustVerified(true);
      // Brief pause to let user see inline confirmation, then advance
      setTimeout(() => { setStep(2); setJustVerified(false); }, 600);
    } catch (e) {
      setModal({ open: true, message: e.message || 'Unable to verify device. Please try again.' });
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
      // Try to decode QR from the selected image
      decodeQrFromImageFile(f).then(text => {
        const serial = extractSerialFromText(text);
        if (serial) {
          setDeviceId(serial);
        } else {
          setModal({ open: true, message: 'QR image loaded but no valid device ID found in the QR content. We read the QR\'s text (not the file name). Please try a clearer photo of the QR label that contains text like SMRT-XXX-XXX.' });
        }
      }).catch(() => {
        setModal({ open: true, message: 'Could not read the QR code from this image. The app reads the QR\'s embedded text, not the file name. Try a sharper, well-lit photo or re-scan with the camera.' });
      });
    } else {
      setFileName('');
      if (verified) setVerified(false);
    }
  }

  function extractSerialFromText(text) {
    if (!text) return '';
    // Normalize to handle unicode dashes and odd spacing from some QR generators
    let s = String(text);
    try { s = s.normalize('NFKC'); } catch { /* older browsers */ }
    // Replace various dash characters (en/em dash, figure dash, minus sign) with ASCII hyphen
    s = s.replace(/[\u2010-\u2015\u2212]/g, '-');
    // Collapse whitespace and trim
    s = s.replace(/\s+/g, ' ').trim();
    // Remove spaces around hyphens (e.g., SMRT - ABC - 123)
    s = s.replace(/\s*-\s*/g, '-');
    // Try strict pattern first, then a slightly broader fallback
    const patterns = [
      /SMRT-[A-Z0-9]{3}-[A-Z0-9]{3}/i,           // strict 3-3
      /SMRT-[A-Z0-9]{2,4}-[A-Z0-9]{2,4}/i,       // fallback 2-4 each side
    ];
    for (const re of patterns) {
      const m = re.exec(s);
      if (m) return m[0].toUpperCase();
    }
    return '';
  }

  async function decodeQrFromImageFile(file) {
    // Use an offscreen image + canvas to decode QR from a static image file
    const imgUrl = URL.createObjectURL(file);
    try {
      const img = await new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = imgUrl;
      });
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const maxDim = 1024; // scale down huge images for faster decode
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const scale = Math.min(maxDim / width, maxDim / height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      // helper to try decode current canvas buffer
      const tryDecode = () => {
        const { data, width: w, height: h } = ctx.getImageData(0, 0, canvas.width, canvas.height);
        return jsQR(data, w, h, { inversionAttempts: 'attemptBoth' });
      };

      // 0°
      canvas.width = width;
      canvas.height = height;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, width, height);
      let res = tryDecode();
      if (res && res.data) return res.data;

      // 90°, 180°, 270° rotations
      const angles = [90, 180, 270];
      for (const angle of angles) {
        const rad = angle * Math.PI / 180;
        const rotatedW = angle % 180 === 0 ? width : height;
        const rotatedH = angle % 180 === 0 ? height : width;
        canvas.width = rotatedW;
        canvas.height = rotatedH;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.translate(rotatedW / 2, rotatedH / 2);
        ctx.rotate(rad);
        ctx.drawImage(img, -width / 2, -height / 2, width, height);
        ctx.restore();
        res = tryDecode();
        if (res && res.data) return res.data;
      }

      throw new Error('QR not found');
    } finally {
      URL.revokeObjectURL(imgUrl);
    }
  }

  async function openQrScanner() {
    setQrError('');
    setQrScanOpen(true);
    setIsScanning(true);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not available.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        qrScanAnimRef.current = requestAnimationFrame(scanQrFrame);
      }
    } catch (e) {
      setQrError('Unable to access camera. You can upload a QR photo or enter the ID manually.');
      setIsScanning(false);
    }
  }

  function stopQrScanner() {
    if (qrScanAnimRef.current) {
      try { cancelAnimationFrame(qrScanAnimRef.current); } catch { }
      qrScanAnimRef.current = null;
    }
    if (mediaStreamRef.current) {
      try { mediaStreamRef.current.getTracks().forEach(t => t.stop()); } catch { }
      mediaStreamRef.current = null;
    }
    setIsScanning(false);
  }

  function closeQrScanner() {
    stopQrScanner();
    setQrScanOpen(false);
  }

  function handleQrText(text) {
    const serial = extractSerialFromText(text);
    if (serial) {
      setDeviceId(serial);
      setVerified(false);
      closeQrScanner();
      setModal({ open: true, message: `Device ID detected: ${serial}` });
    }
  }

  function scanQrFrame() {
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) {
        qrScanAnimRef.current = requestAnimationFrame(scanQrFrame);
        return;
      }
      if (video.readyState < 2) {
        qrScanAnimRef.current = requestAnimationFrame(scanQrFrame);
        return;
      }
      const w = video.videoWidth;
      const h = video.videoHeight;
      if (!w || !h) {
        qrScanAnimRef.current = requestAnimationFrame(scanQrFrame);
        return;
      }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, w, h);
      const img = ctx.getImageData(0, 0, w, h);
      const result = jsQR(img.data, img.width, img.height, { inversionAttempts: 'attemptBoth' });
      if (result && result.data) {
        handleQrText(result.data);
        return;
      }
    } catch (_) {
      // ignore frame errors
    }
    qrScanAnimRef.current = requestAnimationFrame(scanQrFrame);
  }

  // Stop camera when component unmounts
  useEffect(() => {
    return () => {
      stopQrScanner();
    };
  }, []);

  function resendOtp() {
    if (resendCooldown > 0 || sendingCode) return;
    setOtpResent(false);
    setOtpError('');
    setStatusMsg('Resending code…');

    const emailToSend = bindEmail.trim();
    const deviceSerial = deviceId.trim().toUpperCase();

    // Use device OTP API instead of auth API
    requestDeviceOTP(deviceSerial, emailToSend)
      .then(data => {
        if (data.debug_code) {
          // eslint-disable-next-line no-console
          console.info('[resendOtp] DEBUG OTP code:', data.debug_code);
        }
        setOtpResent(true);
        setStatusMsg('Code sent. Check your email.');
        setResendCooldown(30); // 30s cooldown
      })
      .catch(e => {
        setStatusMsg('Unable to resend right now.');
        if (e.status === 429) {
          setOtpError(e.message || 'Too many attempts. Please wait.');
          setResendCooldown(45);
        } else if (e.message && e.message.includes('already bound')) {
          setOtpError('Device is already bound to an email address.');
          setResendCooldown(10);
        } else {
          setOtpError(e.message || 'Failed to resend code');
          setResendCooldown(10);
        }
      });
  }

  async function verifyOtp() {
    setVerifyingOtp(true);
    setOtpError('');
    try {
      const code = otpCode;
      if (code.length !== 6) {
        setOtpError('Enter the 6‑digit code');
        return;
      }

      const email = bindEmail.trim();
      const deviceSerial = deviceId.trim().toUpperCase();

      console.log('Verifying device OTP:', { deviceSerial, email, code });

      // Use device binding OTP verification; include optional metadata
      const extras = {
        location: location.trim() || undefined,
        device_name: nickname.trim() || undefined,
      };
      const data = await verifyDeviceOTP(deviceSerial, email, code, extras);

      if (data.success) {
        console.log('Device bound successfully:', data);

        // Store authentication token for later use
        if (data.auth && data.auth.token) {
          localStorage.setItem('authToken', data.auth.token);
          console.log('Authentication token stored');
        }

        // Store device serial for photo upload later
        setBoundDeviceSerial(deviceSerial);
        console.log('Device serial stored for photo upload:', deviceSerial);

        setStatusMsg('Device bound successfully!');

        // Create initial Reservoir if inputs were provided and valid
        try {
          const token = localStorage.getItem('authToken');
          if (token && reservoirName.trim() && plantId) {
            // Fetch user devices and find the one matching the serial
            const devicesResponse = await deviceApi.list(token);
            const devicesList = Array.isArray(devicesResponse) ? devicesResponse : devicesResponse.results || [];
            const matchedDevice = devicesList.find(d => (d.device_serial || '').toUpperCase() === deviceSerial);
            if (matchedDevice && matchedDevice.id) {
              // Basic guard to ensure dates are valid
              const sd = resStartDate || todayStr;
              const ed = resEndDate || sd;
              const payload = {
                device_id: matchedDevice.id,
                reservoir_name: reservoirName.trim(),
                plant_id: Number(plantId),
                start_date: sd,
                end_date: ed,
              };
              await createReservoir(payload);
              console.log('[SignupSetup] Reservoir created for device', matchedDevice.id);
            } else {
              console.warn('[SignupSetup] Device not found when creating reservoir');
            }
          }
        } catch (reservoirErr) {
          // Non-blocking: log and continue flow
          console.warn('[SignupSetup] Reservoir creation skipped/failed:', reservoirErr?.message || reservoirErr);
        }

        // Show success message briefly then proceed to next step
        setTimeout(() => {
          setStep(5); // Move to WiFi setup or next step
        }, 1000);
        return;
      } else {
        setOtpError('Verification failed. Please try again.');
      }
    } catch (err) {
      console.error('OTP verification error:', err);
      if (err.message && err.message.includes('Invalid or expired')) {
        setOtpError('Invalid or expired verification code.');
      } else if (err.message && err.message.includes('already bound')) {
        setOtpError('Device is already bound to an email address.');
      } else {
        setOtpError(err.message || 'Verification failed. Please try again.');
      }
    } finally {
      setVerifyingOtp(false);
    }
  }

  const wifiScanEndpoints = useMemo(() => [
    'http://192.168.4.1/networks',
    'http://192.168.4.1/api/wifi/scan',
    '/device/wifi/scan'
  ], []);

  function abortOngoingWifiScan() {
    if (wifiAbortRef.current) {
      try { wifiAbortRef.current.abort(); } catch (e) {/*noop*/ }
    }
    wifiAbortRef.current = null;
  }

  function mockNetworks() {
    // Provide a deterministic mock for dev; vary RSSI for bars variety
    return [
      { ssid: 'HydroNet_2G', rssi: -52, secure: true },
      { ssid: 'HydroNet_5G', rssi: -60, secure: true },
      { ssid: 'GardenMesh', rssi: -70, secure: false },
      { ssid: 'HomeLab', rssi: -82, secure: true },
    ];
  }

  function rssiToBars(rssi) {
    if (typeof rssi !== 'number') return 0;
    if (rssi >= -55) return 4;
    if (rssi >= -65) return 3;
    if (rssi >= -75) return 2;
    if (rssi >= -85) return 1;
    return 0;
  }

  // Smooth scroll to selected network when it changes
  useEffect(() => {
    if (!wifiSelected) return;
    const key = wifiSelected.ssid;
    const el = networkRefs.current[key];
    if (el && el.scrollIntoView) {
      try { el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' }); } catch (_) { el.scrollIntoView(); }
    }
  }, [wifiSelected]);

  async function scanWifi({ auto = false } = {}) {
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

    for (let i = 0; i < wifiScanEndpoints.length; i++) {
      const endpoint = wifiScanEndpoints[i];
      try {
        const t = setTimeout(() => controller.abort(), timeoutMs);
        const res = await fetch(endpoint, { signal: controller.signal, headers: { 'Accept': 'application/json' } });
        clearTimeout(t);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        // Expect array of {ssid,rssi,secure}
        if (Array.isArray(data) && data.length) {
          setWifiNetworks(data);
          setWifiPhase('results');
          wifiAbortRef.current = null;
          return;
        }
        // empty array -> continue to next endpoint
      } catch (e) {
        // continue to next endpoint unless last
      }
    }

    // Fallback to mock (dev) after failing endpoints (only if not auto or first attempts <2)
    if (process.env.NODE_ENV === 'development') {
      const mocks = mockNetworks();
      setWifiNetworks(mocks);
      setWifiPhase(mocks.length ? 'results' : 'empty');
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
      setTimeout(() => setStep(6), 600);
    } catch (e) {
      setConnectionStatus(e.message || 'fail');
      setWifiPhase('results'); // return to results
    } finally {
      setConnecting(false);
    }
  }

  // Auto-trigger scan when entering step 5 first time or after going back if previously idle
  useEffect(() => {
    if (step === 5 && wifiPhase === 'idle') {
      scanWifi({ auto: true });
    }
    // abort when leaving step
    if (step !== 5) {
      abortOngoingWifiScan();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  async function finalizeAccount() {
    if (!firstName.trim() || !lastName.trim()) {
      setFinalError('First and last name are required');
      return;
    }
    setFinalError('');
    setFinalizing(true);
    try {
      const token = localStorage.getItem('authToken');
      if (!token) throw new Error('Missing auth session (token). Please re-authenticate.');

      // Update the profile with first and last name only (username removed per request)
      await authApi.updateProfile(token, {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
      });

      // If there's plant information to save (photo or default selection), save it to the device
      if ((uploadedPhotoFile || plantPhotoChoice === 'default') && boundDeviceSerial) {
        try {
          console.log('Updating device plant information for device:', boundDeviceSerial);

          // Get the list of user devices to find the device ID
          const devicesResponse = await deviceApi.list(token);
          console.log('Devices response:', devicesResponse);

          // Handle paginated response (DRF returns {results: [...]} format)
          const devicesList = Array.isArray(devicesResponse) ? devicesResponse : devicesResponse.results || [];
          const userDevice = devicesList.find(device =>
            device.device_serial === boundDeviceSerial
          );

          if (userDevice) {
            // Determine plant name from selection
            const plantName = selectedDefaultImage || nickname || userDevice.device_name || '';

            if (uploadedPhotoFile) {
              // Upload the photo with plant information
              await deviceApi.uploadPlantPhoto(
                userDevice.id,
                uploadedPhotoFile,
                plantName,
                '', // plant variety
                token
              );
              console.log('Plant photo uploaded successfully');
            } else if (plantPhotoChoice === 'default' && selectedDefaultImage) {
              // For default images, update the plant name without a file
              await deviceApi.updatePlantInfo(
                userDevice.id,
                plantName,
                '', // plant variety
                token
              );
              console.log('Plant information updated with default selection:', selectedDefaultImage);
            }
          } else {
            console.warn('Device not found in user devices, skipping plant info update');
          }
        } catch (updateError) {
          console.error('Plant information update failed:', updateError);
          // Don't fail the entire process if plant info update fails
        }
      }      // Retrieve profile to determine role for redirect
      let role = 'user';
      try {
        const prof = await authApi.getProfile(token);
        role = prof?.role || (prof?.user?.role) || 'user';
      } catch (e) {
        // non-fatal; default user
        console.warn('[finalizeAccount] profile fetch failed, defaulting to user role');
      }
      setAccountCreated(true);
      // Small delay to show success state then navigate
      setTimeout(() => {
        const target = role === 'admin' ? '/admin' : '/dashboard';
        navigate(target, { replace: true });
      }, 400);
    } catch (e) {
      setFinalError(e.message || 'Unable to create account');
    } finally {
      setFinalizing(false);
    }
  }

  function primaryCtaLabel() {
    switch (step) {
      case 1: return 'Next';
      case 2: return 'Next';
      case 3: return 'Send Code';
      case 4: return 'Verify Code';
      case 5: return connecting ? 'Connecting…' : 'Connect';
      case 6: return accountCreated ? 'Go to Dashboard' : 'Finish Setup';
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
                                onClick={openQrScanner}
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
                            <input id="qrfile" type="file" accept="image/*" capture="environment" className="setup-file" onChange={onPickFile} />
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

                      {/* Reservoir Info Card */}
                      <div className="setup-card">
                        <h3 className="setup-section-title">Reservoir</h3>
                        <div className="setup-form-grid">
                          <div className="setup-field">
                            <div className="setup-field-label-row">
                              <label className="setup-field-label setup-field-label--xs" htmlFor="resDeviceId">Device ID</label>
                            </div>
                            <input
                              id="resDeviceId"
                              type="text"
                              value={deviceId}
                              readOnly
                              disabled
                              aria-readonly="true"
                            />
                            <p className="setup-helper setup-helper--sm">Reservoir will be created for this device.</p>
                          </div>

                          <div className="setup-field">
                            <div className="setup-field-label-row">
                              <label className="setup-field-label setup-field-label--xs" htmlFor="reservoirName">Reservoir Name</label>
                            </div>
                            <input
                              id="reservoirName"
                              type="text"
                              placeholder="e.g., Main Tank"
                              value={reservoirName}
                              onChange={(e) => setReservoirName(e.target.value)}
                              autoComplete="off"
                            />
                          </div>

                          <div className="setup-field">
                            <div className="setup-field-label-row">
                              <label className="setup-field-label setup-field-label--xs" htmlFor="plantId">Plant</label>
                            </div>
                            <select
                              id="plantId"
                              value={plantId}
                              onChange={(e) => setPlantId(e.target.value)}
                              aria-describedby="help-plant"
                            >
                              <option value="" disabled>Select a plant</option>
                              {plantOptions.map(p => (
                                <option key={p.id} value={p.id}>{p.plant_name}</option>
                              ))}
                            </select>
                            <p id="help-plant" className="setup-helper setup-helper--sm">Choices come from backend Plant catalog.</p>
                          </div>

                          <div className="setup-field">
                            <div className="setup-field-label-row">
                              <label className="setup-field-label setup-field-label--xs" htmlFor="resStart">Start Date</label>
                            </div>
                            <input
                              id="resStart"
                              type="date"
                              value={resStartDate}
                              onChange={(e) => setResStartDate(e.target.value)}
                            />
                          </div>

                          <div className="setup-field">
                            <div className="setup-field-label-row">
                              <label className="setup-field-label setup-field-label--xs" htmlFor="resEnd">End Date</label>
                            </div>
                            <input
                              id="resEnd"
                              type="date"
                              value={resEndDate}
                              onChange={(e) => setResEndDate(e.target.value)}
                            />
                          </div>
                        </div>
                        {reservoirError && (
                          <p className="setup-error" role="alert" style={{ marginTop: 8 }}>{reservoirError}</p>
                        )}
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
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 7h6" /></svg>
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
                      <div className="setup-card otp-verification-card">
                        <div className="otp-header">
                          <h3 className="setup-section-title" style={{ marginTop: 0, marginBottom: 6 }}>Enter Verification Code</h3>
                          <p className="setup-helper" style={{ marginTop: 0, fontSize: '14px', opacity: 0.85 }}>
                            We sent a 6-digit code to<br />
                            <strong style={{ color: 'rgba(255,255,255,0.95)', fontSize: '15px' }}>{bindEmail || 'your email'}</strong>
                          </p>
                        </div>

                        <SignupStepFourOtp
                          otpCode={otpCode}
                          setOtpCode={setOtpCode}
                          verifyingOtp={verifyingOtp}
                          otpError={otpError}
                          setStatusMsg={setStatusMsg}
                        />

                        <div className="visually-hidden" aria-live="polite">{statusMsg}</div>

                        <div className="otp-feedback-zone">
                          {otpError && (
                            <div className="otp-error-message" role="alert">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="8" x2="12" y2="12" />
                                <line x1="12" y1="16" x2="12.01" y2="16" />
                              </svg>
                              <span>{otpError}</span>
                            </div>
                          )}
                          {otpResent && !otpError && (
                            <div className="otp-success-message" role="status">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                <polyline points="22 4 12 14.01 9 11.01" />
                              </svg>
                              <span>Code resent successfully!</span>
                            </div>
                          )}
                          {resendCooldown > 0 && !otpError && !otpResent && (
                            <p className="otp-cooldown-hint">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}>
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12 6 12 12 16 14" />
                              </svg>
                              <span>Resend available in <strong>{resendCooldown}s</strong></span>
                            </p>
                          )}
                        </div>
                      </div>
                    </section>
                  )}
                  {step === 5 && (
                    <section className="setup-section setup-step-5" aria-label="WiFi Provisioning">
                      <div className="setup-card wifi-card-compact" role="group" aria-labelledby="wifi-setup-head">
                        <h3 id="wifi-setup-head" className="setup-section-title">Device WiFi Setup</h3>
                        <p className="setup-helper" style={{ marginTop: 4 }}>Follow these steps to connect your SmarTanom device to WiFi.</p>

                        {/* Provisioning Status Banners */}
                        {provisioningStatus === 'success' && (
                          <div className="wifi-status-banner success" role="status" aria-live="polite" style={{ marginTop: 12 }}>
                            ✓ WiFi configured successfully! Redirecting to dashboard...
                          </div>
                        )}

                        {provisioningStatus === 'failed' && (
                          <div className="wifi-status-banner error" role="alert" style={{ marginTop: 12 }}>
                            ✗ {provisioningError || 'Provisioning failed. Please try again.'}
                          </div>
                        )}

                        {provisioningStatus === 'timeout' && (
                          <div className="wifi-status-banner error" role="alert" style={{ marginTop: 12 }}>
                            ⏱ {provisioningError || 'Provisioning timed out. Please check your device and try again.'}
                          </div>
                        )}

                        {/* Provisioning Instructions */}
                        <div className="provisioning-instructions" style={{ marginTop: 16, padding: '16px', backgroundColor: '#1a1a1a', borderRadius: '8px', border: '1px solid #333' }}>
                          <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 600, color: '#22c55e' }}>
                            Setup Instructions
                          </h4>
                          <ol style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', lineHeight: '1.8', color: '#e5e5e5' }}>
                            <li style={{ marginBottom: '8px' }}>
                              <strong>Power on your ESP32 device.</strong> It will broadcast a WiFi network named <code style={{ backgroundColor: '#333', padding: '2px 6px', borderRadius: '4px', color: '#22c55e' }}>{deviceSerial || 'SMRT-XXX-XXX'}</code>
                            </li>
                            <li style={{ marginBottom: '8px' }}>
                              <strong>Connect your computer or phone</strong> to that WiFi network using password: <code style={{ backgroundColor: '#333', padding: '2px 6px', borderRadius: '4px', color: '#22c55e' }}>smartanom123</code>
                            </li>
                            <li style={{ marginBottom: '8px' }}>
                              <strong>Open a web browser</strong> and navigate to <code style={{ backgroundColor: '#333', padding: '2px 6px', borderRadius: '4px', color: '#22c55e' }}>http://192.168.4.1</code>
                            </li>
                            <li style={{ marginBottom: '8px' }}>
                              <strong>Select your home WiFi network</strong> from the list and enter your WiFi password
                            </li>
                            <li style={{ marginBottom: '8px' }}>
                              <strong>Click "Connect"</strong> and wait for the device to connect
                            </li>
                            <li>
                              Once connected, your device will automatically register with our backend. <strong>Stay on this page</strong> — we'll detect the connection and continue setup automatically.
                            </li>
                          </ol>
                        </div>

                        {/* Status Indicator */}
                        {provisioningStatus === 'waiting' && (
                          <div style={{ marginTop: 16, padding: '12px', backgroundColor: '#1a3a1a', borderRadius: '8px', border: '1px solid #22c55e', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 2s linear infinite' }}>
                              <circle cx="12" cy="12" r="10" />
                              <path d="M12 6v6l4 2" />
                            </svg>
                            <span style={{ fontSize: '13px', color: '#22c55e' }}>Waiting for you to complete the setup steps above...</span>
                          </div>
                        )}

                        {provisioningStatus === 'checking' && (
                          <div style={{ marginTop: 16, padding: '12px', backgroundColor: '#1a3a1a', borderRadius: '8px', border: '1px solid #22c55e', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 2s linear infinite' }}>
                              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                            </svg>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '13px', color: '#22c55e', marginBottom: '4px' }}>Checking device status...</div>
                              <div style={{ fontSize: '11px', color: '#9ca3af' }}>Attempt {pollingAttempts} of 60 (checks every 5 seconds)</div>
                            </div>
                          </div>
                        )}

                        {/* Retry Button */}
                        {(provisioningStatus === 'failed' || provisioningStatus === 'timeout') && (
                          <button
                            type="button"
                            className="setup-btn"
                            style={{ marginTop: 16, width: '100%' }}
                            onClick={retryProvisioning}
                          >
                            Retry Provisioning
                          </button>
                        )}

                        {/* Help Text */}
                        <div style={{ marginTop: 16, padding: '12px', backgroundColor: '#1a1a2e', borderRadius: '8px', border: '1px solid #3730a3' }}>
                          <div style={{ display: 'flex', alignItems: 'start', gap: '8px' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px' }}>
                              <circle cx="12" cy="12" r="10" />
                              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                              <line x1="12" y1="17" x2="12.01" y2="17" />
                            </svg>
                            <div style={{ fontSize: '12px', color: '#c7d2fe', lineHeight: '1.6' }}>
                              <strong>Troubleshooting:</strong> If you don't see the WiFi network, make sure your device is powered on and the LED is blinking. If the connection fails, verify your WiFi password is correct and your network is 2.4GHz (ESP32 doesn't support 5GHz).
                            </div>
                          </div>
                        </div>
                      </div>
                    </section>
                  )}
                  {step === 6 && (
                    <section className="setup-section setup-step-6" aria-label="Set Username">
                      <div className="setup-card">
                        <h3 className="setup-section-title">Your Profile</h3>
                        {!accountCreated && (<>
                          <div className="setup-field-grid-two">
                            <div className="setup-field">
                              <label htmlFor="firstName" className="setup-field-label">First Name</label>
                              <input
                                id="firstName"
                                type="text"
                                placeholder="Your first name"
                                value={firstName}
                                onChange={e => setFirstName(e.target.value)}
                                autoComplete="given-name"
                              />
                            </div>
                            <div className="setup-field">
                              <label htmlFor="lastName" className="setup-field-label">Last Name</label>
                              <input
                                id="lastName"
                                type="text"
                                placeholder="Your last name"
                                value={lastName}
                                onChange={e => setLastName(e.target.value)}
                                autoComplete="family-name"
                              />
                            </div>
                          </div>
                          {finalError && <p className="setup-error" role="alert">{finalError}</p>}
                        </>)}
                        {accountCreated && (
                          <div className="account-success" role="status" aria-live="polite" style={{ textAlign: 'center' }}>
                            <h4 style={{ marginTop: 0 }}>🎉 All Set!</h4>
                            <p>Your device and account are fully configured.</p>
                            <button id="go-dashboard-btn" type="button" className="setup-btn" onClick={() => navigate('/dashboard')}>Go to Dashboard</button>
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
                        <p className="setup-status success" style={{ margin: 0 }} role="status">Device verified! Continuing…</p>
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
                      <button
                        type="button"
                        className="setup-btn"
                        onClick={() => {
                          // Validate reservoir inputs lightly before proceeding
                          setReservoirError('');
                          const sd = resStartDate || todayStr;
                          const ed = resEndDate || sd;
                          if (!reservoirName.trim()) {
                            setReservoirError('Reservoir name is required.');
                            return;
                          }
                          if (!plantId) {
                            setReservoirError('Plant is required.');
                            return;
                          }
                          if (sd > ed) {
                            setReservoirError('End date cannot be before start date.');
                            return;
                          }
                          setResStartDate(sd);
                          setResEndDate(ed);
                          setStep(3);
                        }}
                      >
                        Continue
                      </button>
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
                      <button type="button" className="setup-btn" onClick={sendCode} disabled={sendingCode || !isValidEmail(bindEmail)}>{sendingCode ? 'Sending…' : 'Send Code'}</button>
                    </div>
                  </div>
                )}
                {step === 4 && (
                  <div className="setup-verify-panel" role="region" aria-live="polite" aria-label="Verify email code" data-section="verify-step4">
                    <div className="setup-verify-content">
                      <h4>Verify email</h4>
                      <p>Enter the code and continue.</p>
                    </div>
                    <div className="setup-verify-actions" style={{ display: 'flex', gap: 12 }}>
                      <button
                        type="button"
                        className="setup-btn outline sm"
                        disabled={verifyingOtp || resendCooldown > 0}
                        onClick={resendOtp}
                        aria-disabled={resendCooldown > 0 || undefined}
                        aria-label={resendCooldown > 0 ? `Resend disabled ${resendCooldown} seconds remaining` : 'Resend code'}
                      >
                        {resendCooldown > 0 ? `Resend (${resendCooldown})` : 'Resend'}
                      </button>
                      <button
                        type="button"
                        className="setup-btn sm"
                        disabled={verifyingOtp || otpCode.length !== 6 || !!otpCode.split('').some(c => !c)}
                        onClick={verifyOtp}
                      >
                        {verifyingOtp ? 'Verifying…' : 'Verify Code'}
                      </button>
                    </div>
                  </div>
                )}
                {step === 6 && !accountCreated && (
                  <div className="setup-verify-panel" role="region" aria-live="polite" aria-label="Finish account setup">
                    <div className="setup-verify-content">
                      <h4>Finish account setup</h4>
                      <p>Complete your profile to access the dashboard.</p>
                    </div>
                    <div className="setup-verify-actions">
                      <button
                        type="button"
                        className="setup-btn"
                        disabled={!firstName.trim() || !lastName.trim() || finalizing}
                        onClick={finalizeAccount}
                      >
                        {finalizing ? 'Finishing…' : 'Finish Setup'}
                      </button>
                    </div>
                  </div>
                )}
                {step === 6 && accountCreated && (
                  <div className="setup-verify-panel" role="region" aria-live="polite" aria-label="Account created">
                    <div className="setup-verify-content">
                      <h4>🎉 Account Ready!</h4>
                      <p>Your device and account are fully configured.</p>
                    </div>
                    <div className="setup-verify-actions">
                      <button id="go-dashboard-btn" type="button" className="setup-btn" onClick={() => navigate('/dashboard')}>Go to Dashboard</button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {modal.open && (
              <div className="setup-modal" role="dialog" aria-modal="true" aria-label="Verification error">
                <div className="setup-modal-content setup-modal-error" >
                  <h4 style={{ margin: 0, textAlign: 'center' }}>Verification Error</h4>
                  <p style={{ margin: 0, textAlign: 'center' }}>{modal.message}</p>
                  <div style={{ display: 'flex', gap: 10, marginTop: 10, justifyContent: 'center' }}>
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
                      onKeyDown={(e) => { if (e.key === 'Escape') { setShowDefaultImageModal(false); } }}
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

      {/* QR Scan Modal */}
      {qrScanOpen && (
        <div className="setup-modal" role="dialog" aria-modal="true" aria-label="Scan device QR" onClick={(e) => { if (e.target === e.currentTarget) closeQrScanner(); }}>
          <div className="setup-modal-content" style={{ maxWidth: 520 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <h4 style={{ margin: 0 }}>Scan Device QR</h4>
              <button type="button" className="modal-close-btn inline" onClick={closeQrScanner} aria-label="Close QR scanner">×</button>
            </div>
            <p className="setup-helper" style={{ marginTop: 8 }}>Point your camera at the QR label. We’ll read text like “SMRT-XXX-XXX”.</p>
            {qrError && <p className="setup-error" role="alert" style={{ marginTop: 8 }}>{qrError}</p>}
            <div style={{ position: 'relative', marginTop: 12 }}>
              <video ref={videoRef} playsInline muted style={{ width: '100%', borderRadius: 8, background: '#000' }} />
              {/* hidden canvas used for scanning */}
              <canvas ref={canvasRef} style={{ display: 'none' }} />
              {isScanning && (
                <div aria-hidden="true" style={{ position: 'absolute', inset: 0, border: '2px dashed rgba(255,255,255,0.5)', borderRadius: 8 }} />
              )}
            </div>
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
                      setUploadedPhotoFile(f);
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
                      setUploadedPhotoFile(f);
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
                        setUploadedPhotoFile(null);
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
        <div className="wifi-modal-overlay" onClick={() => setWifiModalOpen(false)} role="dialog" aria-modal="true" aria-labelledby="wifi-modal-title">
          <div className="wifi-modal-content" onClick={e => e.stopPropagation()}>
            <div className="wifi-modal-header">
              <h1 id="wifi-modal-title" className="wifi-modal-title">Wi-Fi Setup</h1>
              <button type="button" className="modal-close-btn" onClick={() => setWifiModalOpen(false)} aria-label="Close modal">
                ×
              </button>
            </div>

            <div className="wifi-modal-body">
              <p className="wifi-setup-description">Enter your Wi-Fi network credentials to connect your SmarTanom device to the internet.</p>

              {connectionStatus && connectionStatus !== 'success' && (
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
                  onChange={e => setHiddenSsid(e.target.value)}
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
                    type={showWifiPw ? 'text' : 'password'}
                    className="wifi-input"
                    placeholder="Enter your Wi-Fi password"
                    value={wifiPassword}
                    onChange={e => setWifiPassword(e.target.value)}
                    autoComplete="off"
                    disabled={connecting}
                  />
                  <button
                    type="button"
                    className="wifi-password-toggle"
                    onClick={() => setShowWifiPw(p => !p)}
                    aria-label={showWifiPw ? 'Hide password' : 'Show password'}
                  >
                    {showWifiPw ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
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
                onClick={() => setUserGuideOpen(true)}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                User Guide
              </button>
              <button
                type="button"
                className="wifi-connect-btn"
                disabled={!hiddenSsid.trim() || wifiPassword.length < 8 || connecting}
                onClick={() => {
                  setConnecting(true);
                  setTimeout(() => {
                    setConnecting(false);
                    setWifiModalOpen(false);
                    setSuccessModalOpen(true);
                  }, 1500);
                }}
              >
                {connecting ? 'Connecting…' : 'Connect Device'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Confirmation Modal - Full Screen Overlay */}
      {successModalOpen && (
        <div className="wifi-modal-overlay" onClick={() => setSuccessModalOpen(false)} role="dialog" aria-modal="true" aria-labelledby="success-modal-title">
          <div className="success-modal-content" onClick={e => e.stopPropagation()}>
            <button type="button" className="modal-close-btn" onClick={() => setSuccessModalOpen(false)} aria-label="Close modal">
              ×
            </button>
            <div className="success-icon">
              <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <h2 id="success-modal-title" className="success-title">Device Successfully Connected to Wi-Fi!</h2>
            <p className="success-message">Your SmarTanom device is now connected to your Wi-Fi network and ready to use.</p>
            <button
              type="button"
              className="success-continue-btn"
              onClick={() => { setSuccessModalOpen(false); setStep(6); }}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* User Guide Modal - Full Screen Overlay */}
      {userGuideOpen && (
        <div className="wifi-modal-overlay" onClick={() => setUserGuideOpen(false)} role="dialog" aria-modal="true" aria-labelledby="guide-modal-title">
          <div className="guide-modal-content" onClick={e => e.stopPropagation()}>
            <div className="guide-modal-header">
              <h2 id="guide-modal-title" className="guide-modal-title">Wi-Fi Setup Guide</h2>
              <button type="button" className="modal-close-btn" onClick={() => setUserGuideOpen(false)} aria-label="Close modal">
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
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <p><strong>Tip:</strong> If the connection fails, ensure your Wi-Fi password is correct and your router is within range of the device.</p>
              </div>
            </div>
            <div className="guide-modal-footer">
              <button
                type="button"
                className="guide-close-btn"
                onClick={() => setUserGuideOpen(false)}
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


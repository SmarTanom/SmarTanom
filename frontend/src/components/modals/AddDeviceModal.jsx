import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import jsQR from 'jsqr';
import {
  X,
  Wifi,
  Mail,
  AlertCircle,
  CheckCircle2,
  Loader,
  Eye,
  EyeOff,
  Smartphone,
  ArrowRight,
  ArrowLeft,
  Camera,
  Upload,
  Check
} from 'lucide-react';
import { requestDeviceOTP, verifyDeviceOTP } from '../../services/api/devices';
import './AddDeviceModal.css';

/**
 * AddDeviceModal Component
 * 
 * A fully accessible modal for adding new devices with multi-step flow.
 * Matches the design and functionality of AddDevicePage.jsx
 */
const AddDeviceModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const modalRef = useRef(null);
  const firstInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const qrScanAnimRef = useRef(null);
  
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    deviceId: '',
    deviceName: '',
    email: '',
    otp: '',
    wifiSSID: '',
    wifiPassword: '',
    wifiHidden: false
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // QR scanning state
  const [qrScanOpen, setQrScanOpen] = useState(false);
  const [qrError, setQrError] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [fileName, setFileName] = useState('');
  
  // Success modal
  const [showSuccess, setShowSuccess] = useState(false);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
      
      // Focus first input when step changes
      if (firstInputRef.current) {
        setTimeout(() => firstInputRef.current?.focus(), 100);
      }
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, isLoading, currentStep]);

  // Focus trap within modal
  useEffect(() => {
    if (!isOpen || !modalRef.current) return;

    const focusableElements = modalRef.current.querySelectorAll(
      'button:not(:disabled), input:not(:disabled), [tabindex]:not([tabindex="-1"])'
    );
    
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTab = (e) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    modalRef.current.addEventListener('keydown', handleTab);
    
    return () => {
      modalRef.current?.removeEventListener('keydown', handleTab);
    };
  }, [isOpen, currentStep]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  // QR Code functions
  function extractSerialFromText(text) {
    if (!text) return '';
    let s = String(text);
    try { s = s.normalize('NFKC'); } catch { /* older browsers */ }
    s = s.replace(/[\u2010-\u2015\u2212]/g, '-');
    s = s.replace(/\s+/g, ' ').trim();
    s = s.replace(/\s*-\s*/g, '-');
    const patterns = [
      /SMRT-[A-Z0-9]{3}-[A-Z0-9]{3}/i,
      /SMRT-[A-Z0-9]{2,4}-[A-Z0-9]{2,4}/i,
    ];
    for (const re of patterns) {
      const m = re.exec(s);
      if (m) return m[0].toUpperCase();
    }
    return '';
  }

  async function decodeQrFromImageFile(file) {
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
      const maxDim = 1024;
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const scale = Math.min(maxDim / width, maxDim / height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      
      const tryDecode = () => {
        const { data, width: w, height: h } = ctx.getImageData(0, 0, canvas.width, canvas.height);
        return jsQR(data, w, h, { inversionAttempts: 'attemptBoth' });
      };

      canvas.width = width;
      canvas.height = height;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, width, height);
      let res = tryDecode();
      if (res && res.data) return res.data;

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

  function onPickFile(e) {
    const f = e.target.files?.[0];
    if (f) {
      setFileName(f.name);
      decodeQrFromImageFile(f).then(text => {
        const serial = extractSerialFromText(text);
        if (serial) {
          setFormData(prev => ({ ...prev, deviceId: serial }));
          setError('');
        } else {
          setError('No valid device ID found in QR. Please try a clearer photo.');
        }
      }).catch(() => {
        setError('Could not read QR code from image. Try a sharper photo or use camera.');
      });
    } else {
      setFileName('');
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
      setQrError('Unable to access camera. Upload a QR photo or enter ID manually.');
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
    setQrError('');
  }

  function handleQrText(text) {
    const serial = extractSerialFromText(text);
    if (serial) {
      setFormData(prev => ({ ...prev, deviceId: serial }));
      setError('');
      closeQrScanner();
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

  // Cleanup QR scanner on unmount
  useEffect(() => {
    return () => {
      stopQrScanner();
    };
  }, []);

  const handleNext = async () => {
    setIsLoading(true);
    setError('');

    try {
      // Validation
      if (currentStep === 1) {
        if (!formData.deviceId.trim() || !formData.deviceName.trim()) {
          setError('Please fill in all device information');
          setIsLoading(false);
          return;
        }
        // Move to next step
        setCurrentStep(prev => prev + 1);
      } else if (currentStep === 2) {
        if (!formData.email.trim() || !formData.email.includes('@')) {
          setError('Please enter a valid email address');
          setIsLoading(false);
          return;
        }
        // Send OTP
        await requestDeviceOTP(formData.deviceId, formData.email);
        setCurrentStep(prev => prev + 1);
      } else if (currentStep === 3) {
        if (formData.otp.length !== 6) {
          setError('Please enter the 6-digit OTP code');
          setIsLoading(false);
          return;
        }
        // Verify OTP (this also binds the device)
        await verifyDeviceOTP(
          formData.deviceId,
          formData.email,
          formData.otp,
          { device_name: formData.deviceName }
        );
        setCurrentStep(prev => prev + 1);
      } else if (currentStep === 4) {
        if (!formData.wifiSSID.trim() || !formData.wifiPassword.trim()) {
          setError('Please enter WiFi credentials');
          setIsLoading(false);
          return;
        }
        // Complete setup - show success modal
        setShowSuccess(true);
      }
    } catch (err) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (currentStep > 1 && !isLoading) {
      setCurrentStep(prev => prev - 1);
      setError('');
    }
  };

  const handleClose = () => {
    if (isLoading) return;
    setCurrentStep(1);
    setFormData({
      deviceId: '',
      deviceName: '',
      email: '',
      otp: '',
      wifiSSID: '',
      wifiPassword: '',
      wifiHidden: false
    });
    setError('');
    setShowPassword(false);
    setFileName('');
    setShowSuccess(false);
    onClose();
  };
  
  const handleSuccessClose = () => {
    setShowSuccess(false);
    handleClose();
    // Refresh the page to show the new device
    window.location.reload();
  };
    onClose();
  };

  const getStepInfo = () => {
    switch (currentStep) {
      case 1:
        return {
          icon: <Smartphone size={32} strokeWidth={1.5} />,
          title: 'Device Information',
          subtitle: 'Enter your SmarTanom device details'
        };
      case 2:
        return {
          icon: <Mail size={32} strokeWidth={1.5} />,
          title: 'Bind to Email',
          subtitle: 'Link this device to your account'
        };
      case 3:
        return {
          icon: <CheckCircle2 size={32} strokeWidth={1.5} />,
          title: 'Verify Code',
          subtitle: 'Enter the verification code sent to your email'
        };
      case 4:
        return {
          icon: <Wifi size={32} strokeWidth={1.5} />,
          title: 'WiFi Setup',
          subtitle: 'Connect your device to your network'
        };
      default:
        return { icon: null, title: '', subtitle: '' };
    }
  };

  const stepInfo = getStepInfo();

  if (!isOpen) return null;

  return (
    <div 
      className="modal-overlay" 
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) {
          handleClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div 
        ref={modalRef}
        className="add-device-modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          className="close-btn"
          onClick={handleClose}
          disabled={isLoading}
          aria-label="Close modal"
        >
          <X size={24} />
        </button>

        {/* Step Indicator */}
        <div className="step-indicator">
          <div className="step-counter">Step {currentStep} of 4</div>
          <div className="step-dots">
            {[1, 2, 3, 4].map(step => (
              <div
                key={step}
                className={`step-dot ${step === currentStep ? 'active' : ''} ${step < currentStep ? 'completed' : ''}`}
              />
            ))}
          </div>
        </div>

        {/* Step Icon & Title */}
        <div className="step-header">
          <div className="step-icon-circle">
            {stepInfo.icon}
          </div>
          <h2 id="modal-title" className="step-title">{stepInfo.title}</h2>
          <p className="step-subtitle">{stepInfo.subtitle}</p>
        </div>

        {/* Step Form Content */}
        <div className="step-form">
          {currentStep === 1 && (
            <>
              {/* QR Code Options */}
              <div className="qr-options">
                <button
                  type="button"
                  className="qr-option-btn"
                  onClick={openQrScanner}
                >
                  <Camera size={20} />
                  <span>Scan QR Code</span>
                </button>
                
                <label htmlFor="qrFileInput" className="qr-option-btn">
                  <Upload size={20} />
                  <span>Upload QR Image</span>
                  <input
                    id="qrFileInput"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    style={{ display: 'none' }}
                    onChange={onPickFile}
                  />
                </label>
              </div>
              
              {fileName && (
                <div className="file-name-display">
                  <CheckCircle2 size={16} />
                  <span>{fileName}</span>
                </div>
              )}
              
              <div className="divider-text">
                <span>or enter manually</span>
              </div>

              <div className="form-field">
                <label className="field-label">DEVICE ID / SERIAL NUMBER</label>
                <input
                  ref={firstInputRef}
                  type="text"
                  className="field-input"
                  placeholder="e.g., SMRT-XXX-XXX"
                  value={formData.deviceId}
                  onChange={(e) => handleInputChange('deviceId', e.target.value)}
                />
              </div>

              <div className="form-field">
                <label className="field-label">DEVICE NAME</label>
                <input
                  type="text"
                  className="field-input"
                  placeholder="e.g., Kitchen Garden"
                  value={formData.deviceName}
                  onChange={(e) => handleInputChange('deviceName', e.target.value)}
                />
              </div>
            </>
          )}

          {currentStep === 2 && (
            <>
              <div className="form-field">
                <label className="field-label">EMAIL ADDRESS</label>
                <input
                  ref={firstInputRef}
                  type="email"
                  className="field-input"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                />
              </div>

              <div className="info-banner">
                <AlertCircle size={18} />
                <span>We'll send a verification code to this email address</span>
              </div>
            </>
          )}
000000
          {currentStep === 3 && (
            <>
              <div className="form-field">
                <label className="field-label">VERIFICATION CODE</label>
                <input
                  ref={firstInputRef}
                  type="text"
                  className="field-input otp-style"
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                  value={formData.otp}
                  onChange={(e) => handleInputChange('otp', e.target.value.replace(/\D/g, ''))}
                />
              </div>

              <div className="code-hint">Code sent to {formData.email}</div>

              <button 
                type="button" 
                className="resend-link"
                onClick={() => {
                  // TODO: Implement resend OTP
                  console.log('Resend OTP');
                }}
              >
                Resend verification code
              </button>
            </>
          )}

          {currentStep === 4 && (
            <>
              <div className="form-field">
                <label className="field-label">WiFi NETWORK (SSID)</label>
                <input
                  ref={firstInputRef}
                  type="text"
                  className="field-input"
                  placeholder="Network name"
                  value={formData.wifiSSID}
                  onChange={(e) => handleInputChange('wifiSSID', e.target.value)}
                />
              </div>

              <div className="form-field">
                <label className="field-label">WiFi PASSWORD</label>
                <div className="password-field">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="field-input"
                    placeholder="Enter password"
                    value={formData.wifiPassword}
                    onChange={(e) => handleInputChange('wifiPassword', e.target.value)}
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <label className="checkbox-field">
                <input
                  type="checkbox"
                  checked={formData.wifiHidden}
                  onChange={(e) => handleInputChange('wifiHidden', e.target.checked)}
                />
                <span>This is a hidden network</span>
              </label>

              <div className="info-banner" style={{ marginTop: '12px' }}>
                <Wifi size={18} />
                <span>Make sure your device is powered on and in setup mode</span>
              </div>
            </>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="error-banner">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="action-buttons">
          {currentStep > 1 && (
            <button
              type="button"
              className="btn-secondary"
              onClick={handleBack}
              disabled={isLoading}
            >
              <ArrowLeft size={20} />
              <span>Back</span>
            </button>
          )}

          <button
            type="button"
            className="btn-primary"
            onClick={handleNext}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader size={20} className="btn-spinner" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <span>{currentStep === 4 ? 'Complete Setup' : 'Continue'}</span>
                {currentStep < 4 && <ArrowRight size={20} />}
              </>
            )}
          </button>
        </div>
      </div>

      {/* QR Scanner Modal */}
      {qrScanOpen && (
        <div className="qr-scanner-overlay" onClick={closeQrScanner}>
          <div className="qr-scanner-container" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="qr-scanner-close"
              onClick={closeQrScanner}
              aria-label="Close QR scanner"
            >
              <X size={24} />
            </button>
            
            <h3 className="qr-scanner-title">Scan QR Code</h3>
            <p className="qr-scanner-subtitle">Point your camera at the QR code on your device</p>
            
            <div className="qr-video-container">
              <video ref={videoRef} className="qr-video" playsInline />
              <canvas ref={canvasRef} style={{ display: 'none' }} />
              <div className="qr-scan-frame"></div>
            </div>
            
            {qrError && (
              <div className="qr-error">
                <AlertCircle size={18} />
                <span>{qrError}</span>
              </div>
            )}
            
            {isScanning && !qrError && (
              <div className="qr-scanning-text">
                <Loader size={18} className="spinner" />
                <span>Scanning...</span>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Success Modal */}
      {showSuccess && (
        <div className="success-overlay">
          <div className="success-modal">
            <div className="success-icon">
              <Check size={48} strokeWidth={3} />
            </div>
            <h2 className="success-title">Device Added Successfully!</h2>
            <p className="success-message">
              Your device <strong>{formData.deviceName}</strong> has been successfully registered to <strong>{formData.email}</strong>.
            </p>
            <p className="success-note">
              The device will now connect to your WiFi network. This may take a few moments.
            </p>
            <button
              type="button"
              className="success-btn"
              onClick={handleSuccessClose}
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddDeviceModal;

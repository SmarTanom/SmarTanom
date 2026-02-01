import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
  ArrowLeft
} from 'lucide-react';
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

  const handleNext = async () => {
    setIsLoading(true);
    setError('');

    // Simulate API calls
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Validation
    if (currentStep === 1) {
      if (!formData.deviceId.trim() || !formData.deviceName.trim()) {
        setError('Please fill in all device information');
        setIsLoading(false);
        return;
      }
    } else if (currentStep === 2) {
      if (!formData.email.trim() || !formData.email.includes('@')) {
        setError('Please enter a valid email address');
        setIsLoading(false);
        return;
      }
      // TODO: Send OTP to email
    } else if (currentStep === 3) {
      if (formData.otp.length !== 6) {
        setError('Please enter the 6-digit OTP code');
        setIsLoading(false);
        return;
      }
      // TODO: Verify OTP
    } else if (currentStep === 4) {
      if (!formData.wifiSSID.trim() || !formData.wifiPassword.trim()) {
        setError('Please enter WiFi credentials');
        setIsLoading(false);
        return;
      }
      // TODO: Complete device setup
    }

    if (currentStep < 4) {
      setCurrentStep(prev => prev + 1);
    } else {
      // Complete setup - close modal and refresh
      handleClose();
      // TODO: Refresh devices list
      window.location.reload();
    }
    setIsLoading(false);
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
    </div>
  );
};

export default AddDeviceModal;

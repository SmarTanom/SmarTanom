import React, { useState } from 'react';
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
  ArrowRight
} from 'lucide-react';
import '../assets/styles/AddDevicePage.css';

const AddDevicePage = () => {
  const navigate = useNavigate();
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
    } else if (currentStep === 3) {
      if (formData.otp.length !== 6) {
        setError('Please enter the 6-digit OTP code');
        setIsLoading(false);
        return;
      }
    } else if (currentStep === 4) {
      if (!formData.wifiSSID.trim() || !formData.wifiPassword.trim()) {
        setError('Please enter WiFi credentials');
        setIsLoading(false);
        return;
      }
    }

    if (currentStep < 4) {
      setCurrentStep(prev => prev + 1);
    } else {
      // Complete setup
      navigate('/dashboard');
    }
    setIsLoading(false);
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
        return {};
    }
  };

  const stepInfo = getStepInfo();

  return (
    <div className="add-device-root">
      {/* Header */}
      <div className="add-device-header">
        <button className="close-btn" onClick={() => navigate('/dashboard')}>
          <X size={24} />
        </button>
      </div>

      {/* Content */}
      <div className="add-device-container">
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
          <h1 className="step-title">{stepInfo.title}</h1>
          <p className="step-subtitle">{stepInfo.subtitle}</p>
        </div>

        {/* Step Content */}
        <div className="step-form">
          {currentStep === 1 && (
            <>
              <div className="form-field">
                <label className="field-label">Device ID</label>
                <input
                  type="text"
                  className="field-input"
                  placeholder="e.g., D000000004"
                  value={formData.deviceId}
                  onChange={(e) => handleInputChange('deviceId', e.target.value)}
                />
              </div>

              <div className="form-field">
                <label className="field-label">Device Name</label>
                <input
                  type="text"
                  className="field-input"
                  placeholder="e.g., Backyard Garden"
                  value={formData.deviceName}
                  onChange={(e) => handleInputChange('deviceName', e.target.value)}
                />
              </div>
            </>
          )}

          {currentStep === 2 && (
            <>
              <div className="form-field">
                <label className="field-label">Email Address</label>
                <input
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
                <label className="field-label">Verification Code</label>
                <input
                  type="text"
                  className="field-input otp-style"
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                  value={formData.otp}
                  onChange={(e) => handleInputChange('otp', e.target.value.replace(/\D/g, ''))}
                />
              </div>

              <div className="code-hint">Code sent to {formData.email}</div>

              <button className="resend-link">Resend verification code</button>
            </>
          )}

          {currentStep === 4 && (
            <>
              <div className="form-field">
                <label className="field-label">WiFi Network (SSID)</label>
                <input
                  type="text"
                  className="field-input"
                  placeholder="Network name"
                  value={formData.wifiSSID}
                  onChange={(e) => handleInputChange('wifiSSID', e.target.value)}
                />
              </div>

              <div className="form-field">
                <label className="field-label">WiFi Password</label>
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
              className="btn-secondary"
              onClick={() => setCurrentStep(prev => prev - 1)}
              disabled={isLoading}
            >
              Back
            </button>
          )}
          
          <button
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

export default AddDevicePage;

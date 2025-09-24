import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import BrandMark from '../components/brand/BrandMark.jsx';
import '../pages/AuthSetupPage.css';
import { ChevronLeftFilled } from '../components/ui/Icon.jsx';

export default function SignupSetup() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1..6
  const total = 6;

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

  function goPrev() { if (step > 1) setStep(step - 1); else navigate(-1); }
  function goNext() { if (step < total) setStep(step + 1); }

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
              <div className="setup-progress">Step {step} of {total}</div>
              <h1 className="auth-title">{headings[step - 1]}</h1>
              <p className="auth-subtext">{subtexts[step - 1]}</p>
            </header>

            <div className="setup-body">
              {/* Steps will be implemented incrementally */}
              <div className="setup-placeholder">This setup step will be implemented next.</div>
            </div>

            <div className="setup-actions">
              <button type="button" className="landing-btn outline" onClick={goPrev} aria-label="Previous step">Previous</button>
              <button type="button" className="landing-btn" onClick={goNext} aria-label="Next step">Next</button>
            </div>
          </div>
        </div>
      </div>
      <div className="auth-image-column" aria-hidden="true" />
    </div>
  );
}

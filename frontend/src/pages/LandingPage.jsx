import React from 'react';
import { useNavigate } from 'react-router-dom';
import BrandMark from '../components/brand/BrandMark.jsx';
import './LandingPage.css';

export default function LandingPage() {
  const navigate = useNavigate();
  return (
    <div className="landing-root landing-arcs">
      <div className="landing-content">
        <header className="landing-header hero-fade-item">
          <BrandMark variant="white" className="brand-logo-img" />
          <span className="landing-wordmark">SMARTANOM</span>
        </header>
        <main className="landing-main">
          <div className="landing-hero">
            <h1 className="landing-title hero-fade-item">Welcome to SmarTanom</h1>
            <p className="landing-tagline hero-fade-item">Watch every drop, every ray, every moment, with complete hydroponic monitoring at your fingertips.</p>
            <div className="landing-actions hero-fade-item">
              <button className="landing-btn primary" onClick={() => navigate('/signin/email')}>Login with Email</button>
              <button className="landing-btn outline" onClick={() => navigate('/signup/setup')}>Register New Account</button>
            </div>
          </div>
        </main>
      </div>
      {/* Hydroponic image panel - visible only on wide screens ≥769px */}
      <div className="landing-visual-panel" aria-hidden="true"></div>
    </div>
  );
}

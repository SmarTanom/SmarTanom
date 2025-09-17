import React from 'react';
import Button from '../components/ui/Button.jsx';
import HelperText from '../components/ui/HelperText.jsx';
import { useNavigate } from 'react-router-dom';

export default function LandingPage() {
  const navigate = useNavigate();
  return (
    <div style={{
      minHeight: '100%',
      display: 'grid',
      placeItems: 'center',
      background: 'radial-gradient(1200px 1200px at 80% 0%, rgba(51,148,50,0.08), transparent)'
    }}>
      <div className="card" style={{ maxWidth: 420, width: '92%' }}>
        <div style={{ display: 'grid', justifyItems: 'center', gap: 12 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16, background: '#E6F3E6',
            display: 'grid', placeItems: 'center', color: '#339432', fontWeight: 700
          }} aria-hidden>
            
            {/* TODO: Replace with logo image once assets are added */}
            <span style={{ fontSize: 28 }}>🌱</span>
          </div>
          <h1 className="h2" style={{ margin: 0 }}>SmarTanom</h1>
          <p className="small text-center" style={{ maxWidth: 320 }}>
            Smart Hydroponic Monitoring
          </p>
          <p className="small text-center" style={{ maxWidth: 320 }}>
            Watch every drop, every ray, every moment, with complete hydroponic monitoring at your fingertips.
          </p>
        </div>

        <div style={{ height: 16 }} />

        <div style={{ display: 'grid', gap: 12 }}>
          <Button onClick={() => { navigate('/signin/email'); }}>Sign In</Button>
          <Button variant="outline" onClick={() => { navigate('/signup/email'); }}>Create Account</Button>
          <HelperText>Secure access for hydroponic farm management</HelperText>
        </div>
      </div>
    </div>
  );
}

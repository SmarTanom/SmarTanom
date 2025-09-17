import React from 'react';
import Button from '../components/ui/Button.jsx';
import HelperText from '../components/ui/HelperText.jsx';
import BrandMark from '../components/brand/BrandMark.jsx';
import { useNavigate } from 'react-router-dom';
import AuthLayout from '../components/layout/AuthLayout.jsx';

export default function LandingPage() {
  const navigate = useNavigate();
  return (
    <AuthLayout>
      <div style={{ display: 'grid', gap: 14 }}>
        <div style={{ display: 'grid', justifyItems: 'center', gap: 14 }}>
          {/* Branding */}
          {/* TODO: Replace with image logo import when assets are added */}
          <BrandMark size={84} />
          <h1 className="h1" style={{ margin: 0 }}>SmarTanom</h1>
          <p className="small text-center" style={{ maxWidth: 360 }}>Smart Hydroponic Monitoring</p>
          <p className="body text-center" style={{ maxWidth: 420 }}>
            Watch every drop, every ray, every moment, with complete hydroponic monitoring at your fingertips.
          </p>
        </div>

        <div style={{ height: 8 }} />

        <div style={{ display: 'grid', gap: 12 }}>
          <Button onClick={() => { navigate('/signin/email'); }}>Sign In</Button>
          <Button variant="outline" onClick={() => { navigate('/signup/email'); }}>Create Account</Button>
          <HelperText>Secure access for hydroponic farm management</HelperText>
        </div>
      </div>
    </AuthLayout>
  );
}

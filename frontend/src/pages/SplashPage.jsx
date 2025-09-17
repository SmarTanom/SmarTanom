import React from 'react';
import { useNavigate } from 'react-router-dom';
import splashLogo from '../assets/images/splash-logo.png';

export default function SplashPage() {
  const navigate = useNavigate();
  React.useEffect(() => {
    const t = setTimeout(() => navigate('/', { replace: true }), 1600);
    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <div style={{ minHeight: '100vh', background: '#339432', display: 'grid', placeItems: 'center' }}>
      <div className="fade-in" style={{ transform: 'translateY(0)' }}>
        <img src={splashLogo} alt="SmarTanom" style={{ width: 160, height: 'auto' }} />
      </div>
      <style>{`
        .fade-in { opacity: 0; animation: fadeIn 800ms ease forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}

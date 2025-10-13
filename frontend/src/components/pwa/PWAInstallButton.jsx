import React, { useState } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall.js';
import { Download, Smartphone, Check, Info, X } from 'lucide-react';

/**
 * PWA Install Component
 * Provides "Install App" functionality for the Profile page
 */
export default function PWAInstallButton() {
  const {
    installApp,
    isInstalled,
    isInstallSupported,
    isIOS,
    installPrompt,
    getInstallInstructions
  } = usePWAInstall();

  const [showInstructions, setShowInstructions] = useState(false);
  const [installing, setInstalling] = useState(false);

  const handleInstallClick = async () => {
    console.log('Install clicked. iOS:', isIOS, 'Install prompt available:', installPrompt);

    if (isIOS || !installPrompt) {
      // Show manual instructions for iOS or when prompt not available
      console.log('Showing manual install instructions');
      setShowInstructions(true);
      return;
    }

    setInstalling(true);
    try {
      console.log('Attempting automated install...');
      const result = await installApp();
      if (!result.success) {
        console.warn('Install failed:', result.error);
        // Show instructions as fallback
        setShowInstructions(true);
      } else {
        console.log('Install successful!');
      }
    } catch (error) {
      console.error('Install error:', error);
      setShowInstructions(true);
    } finally {
      setInstalling(false);
    }
  };

  const instructions = getInstallInstructions();

  // Don't show button if not supported or already installed
  if (!isInstallSupported && !isIOS) {
    return null;
  }

  return (
    <div className="pwa-install-section">
      {/* Install Button */}
      {!isInstalled ? (
        <button
          className="pwa-install-button"
          onClick={handleInstallClick}
          disabled={installing}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 20px',
            background: 'linear-gradient(135deg, #339432 0%, #2d7c2a 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: installing ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s ease',
            opacity: installing ? 0.7 : 1,
            transform: installing ? 'scale(0.98)' : 'scale(1)',
            boxShadow: '0 4px 12px rgba(51, 148, 50, 0.3)',
            width: '100%',
            maxWidth: '300px'
          }}
          onMouseEnter={(e) => {
            if (!installing) {
              e.target.style.transform = 'scale(1.02)';
              e.target.style.boxShadow = '0 6px 16px rgba(51, 148, 50, 0.4)';
            }
          }}
          onMouseLeave={(e) => {
            if (!installing) {
              e.target.style.transform = 'scale(1)';
              e.target.style.boxShadow = '0 4px 12px rgba(51, 148, 50, 0.3)';
            }
          }}
        >
          {installing ? (
            <>
              <div
                style={{
                  width: '20px',
                  height: '20px',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  borderTop: '2px solid white',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}
              />
              Installing...
            </>
          ) : (
            <>
              {isIOS ? <Smartphone size={20} /> : <Download size={20} />}
              Install App
            </>
          )}
        </button>
      ) : (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 20px',
            background: '#f0f8f0',
            color: '#339432',
            borderRadius: '12px',
            fontSize: '16px',
            fontWeight: '600',
            border: '2px solid #339432',
            maxWidth: '300px'
          }}
        >
          <Check size={20} />
          App Installed
        </div>
      )}

      {/* Installation Instructions Modal */}
      {showInstructions && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '20px'
          }}
          onClick={() => setShowInstructions(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '400px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, color: '#2F3E46', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Info size={24} color="#339432" />
                {instructions.title}
              </h3>
              <button
                onClick={() => setShowInstructions(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '4px',
                  cursor: 'pointer',
                  color: '#666'
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <p style={{ color: '#666', marginBottom: '16px', lineHeight: 1.5 }}>
                To install SmarTanom as an app on your device, follow these steps:
              </p>

              <ol style={{ color: '#2F3E46', lineHeight: 1.6, paddingLeft: '20px' }}>
                {instructions.steps.map((step, index) => (
                  <li key={index} style={{ marginBottom: '8px' }}>{step}</li>
                ))}
              </ol>
            </div>

            <button
              onClick={() => setShowInstructions(false)}
              style={{
                width: '100%',
                padding: '12px',
                background: '#339432',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Got it!
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

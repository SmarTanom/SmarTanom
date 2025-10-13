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
  const [showConfirm, setShowConfirm] = useState(false);
  const [installing, setInstalling] = useState(false);

  const handleInstallClick = async () => {
    console.log('Install clicked. iOS:', isIOS, 'Install prompt available:', installPrompt);

    if (isIOS) {
      // Show manual instructions for iOS
      console.log('Showing manual install instructions for iOS');
      setShowInstructions(true);
      return;
    }

    if (!installPrompt) {
      // Show manual instructions when prompt not available
      console.log('No install prompt available, showing manual instructions');
      setShowInstructions(true);
      return;
    }

    // Show confirmation dialog first for automatic install
    setShowConfirm(true);
  };

  const handleConfirmInstall = async () => {
    setShowConfirm(false);
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

  const handleCancelInstall = () => {
    setShowConfirm(false);
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
          className="btn-install-app"
          onClick={handleInstallClick}
          disabled={installing}
        >
          {installing ? (
            <>
              <div className="btn-spinner" />
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
        <div className="app-installed-status">
          <Check size={20} />
          App Installed
        </div>
      )}

      {/* Installation Confirmation Modal */}
      {showConfirm && (
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
          onClick={handleCancelInstall}
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
                <Download size={24} color="#339432" />
                Install SmarTanom App
              </h3>
              <button
                onClick={handleCancelInstall}
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
                Install SmarTanom as an app on your device for a native app experience with offline access and faster loading.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={handleCancelInstall}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: '#f3f4f6',
                  color: '#374151',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmInstall}
                style={{
                  flex: 1,
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
                Install App
              </button>
            </div>
          </div>
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


    </div>
  );
}

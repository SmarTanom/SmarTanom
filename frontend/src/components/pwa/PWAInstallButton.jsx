import React, { useState } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall.js';
import { Download, Smartphone, Check, Info, X } from 'lucide-react';
import './PWAInstallButton.css';

/**
 * PWA Install Component
 * Provides "Install App" functionality for the Profile page
 * Props:
 * - onOpenModal: Callback to open modal at parent level
 * - renderModalsOnly: If true, only renders modals (for parent-level rendering)
 * - modalState: State for modals when rendered at parent level
 * - onCloseModal: Callback to close modals
 */
export default function PWAInstallButton({ 
  onOpenModal, 
  renderModalsOnly = false,
  modalState = {},
  onCloseModal 
}) {
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
  const [isProcessing, setIsProcessing] = useState(false);

  // Use parent state if provided, otherwise use local state
  const isConfirmOpen = modalState.showConfirm !== undefined ? modalState.showConfirm : showConfirm;
  const isInstructionsOpen = modalState.showInstructions !== undefined ? modalState.showInstructions : showInstructions;

  const handleInstallClick = async () => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    console.log('Install clicked. iOS:', isIOS, 'Install prompt available:', installPrompt);

    if (isIOS) {
      console.log('Showing manual install instructions for iOS');
      if (onOpenModal) {
        onOpenModal('instructions');
      } else {
        setShowInstructions(true);
      }
      setTimeout(() => setIsProcessing(false), 300);
      return;
    }

    if (!installPrompt) {
      console.log('No install prompt available, showing manual instructions');
      if (onOpenModal) {
        onOpenModal('instructions');
      } else {
        setShowInstructions(true);
      }
      setTimeout(() => setIsProcessing(false), 300);
      return;
    }

    // Show confirmation dialog
    if (onOpenModal) {
      onOpenModal('confirm');
    } else {
      setShowConfirm(true);
    }
    setTimeout(() => setIsProcessing(false), 300);
  };

  const handleConfirmInstall = async () => {
    if (onCloseModal) {
      onCloseModal('confirm');
    } else {
      setShowConfirm(false);
    }
    setInstalling(true);
    setIsProcessing(true);
    try {
      console.log('Attempting automated install...');
      const result = await installApp();
      if (!result.success) {
        console.warn('Install failed:', result.error);
        // Show instructions as fallback
        if (onOpenModal) {
          onOpenModal('instructions');
        } else {
          setShowInstructions(true);
        }
      } else {
        console.log('Install successful!');
      }
    } catch (error) {
      console.error('Install error:', error);
      if (onOpenModal) {
        onOpenModal('instructions');
      } else {
        setShowInstructions(true);
      }
    } finally {
      setInstalling(false);
      setTimeout(() => setIsProcessing(false), 300);
    }
  };

  const handleCancelInstall = () => {
    if (onCloseModal) {
      onCloseModal('confirm');
    } else {
      setShowConfirm(false);
    }
    setTimeout(() => setIsProcessing(false), 300);
  };

  const handleCloseInstructions = () => {
    if (onCloseModal) {
      onCloseModal('instructions');
    } else {
      setShowInstructions(false);
    }
    setTimeout(() => setIsProcessing(false), 300);
  };

  const instructions = getInstallInstructions();

  // Don't show button if not supported or already installed
  if (!isInstallSupported && !isIOS && !renderModalsOnly) {
    return null;
  }

  // If renderModalsOnly, only return modals
  if (renderModalsOnly) {
    return (
      <>
        {/* Installation Confirmation Modal */}
        {isConfirmOpen && (
          <div className="pwa-modal-overlay" onClick={handleCancelInstall}>
            <div className="pwa-modal-container" onClick={(e) => e.stopPropagation()}>
              <div className="pwa-modal-header">
                <h3 className="pwa-modal-title">
                  <Download size={24} color="#339432" />
                  Install SmarTanom App
                </h3>
                <button onClick={handleCancelInstall} className="pwa-modal-close">
                  <X size={20} />
                </button>
              </div>

              <div className="pwa-modal-content">
                <p>
                  Install SmarTanom as an app on your device for a native app experience with offline access and faster loading.
                </p>
              </div>

              <div className="pwa-modal-actions">
                <button onClick={handleCancelInstall} className="pwa-btn-cancel">
                  Cancel
                </button>
                <button onClick={handleConfirmInstall} className="pwa-btn-install">
                  Install App
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Installation Instructions Modal */}
        {isInstructionsOpen && (
          <div className="pwa-modal-overlay" onClick={handleCloseInstructions}>
            <div className="pwa-modal-container" onClick={(e) => e.stopPropagation()}>
              <div className="pwa-modal-header">
                <h3 className="pwa-modal-title">
                  <Info size={24} color="#339432" />
                  {instructions.title}
                </h3>
                <button onClick={handleCloseInstructions} className="pwa-modal-close">
                  <X size={20} />
                </button>
              </div>

              <div className="pwa-modal-content">
                <p>
                  To install SmarTanom as an app on your device, follow these steps:
                </p>

                <ol className="pwa-instructions-list" style={{ listStylePosition: 'outside', paddingLeft: '20px', color: '#2F3E46', lineHeight: 1.6 }}>
                  {instructions.steps.map((step, index) => (
                    <li key={index} style={{ marginBottom: '8px' }}>{step}</li>
                  ))}
                </ol>
              </div>

              <div className="pwa-modal-actions">
                <button onClick={handleCloseInstructions} className="pwa-btn-install" style={{ width: '100%' }}>
                  Got it!
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
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
    </div>
  );
}

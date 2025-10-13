import React, { useEffect, useState, useRef } from 'react';

/**
 * Development Cache Helper Component
 * Automatically detects backend connection issues and provides cache management
 */
const DevCacheHelper = () => {
  // Use a ref to store CacheManager and a state flag to track loading
  const [cacheManagerLoaded, setCacheManagerLoaded] = useState(false);
  const cacheManagerRef = useRef(null);

  useEffect(() => {
    const loadCacheManager = async () => {
      try {
        const { default: CM } = await import('../../utils/cacheManager.js');
        cacheManagerRef.current = CM;
        setCacheManagerLoaded(true);

        // Immediately clear service workers in development to prevent white screen
        if (import.meta.env.DEV) {
          console.log('🧹 Development mode: Clearing service workers to prevent conflicts...');
          await CM.unregisterServiceWorker();
          await CM.clearAllCaches();
        }
      } catch (error) {
        console.error('Failed to load CacheManager:', error);
      }
    };

    loadCacheManager();
  }, []);
  const [isVisible, setIsVisible] = useState(false);
  const [backendStatus, setBackendStatus] = useState('checking');
  const [showResetButton, setShowResetButton] = useState(false);

  // Check if we're in development mode
  const isDev = import.meta.env.DEV;

  useEffect(() => {
    if (!isDev) return;

    // Add keyboard shortcut: Ctrl+Shift+R to reset PWA
    const handleKeyDown = (event) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'R') {
        event.preventDefault();
        console.log('🔄 Keyboard shortcut: Resetting PWA...');
        if (cacheManagerRef.current) {
          cacheManagerRef.current.resetPWA();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    let checkInterval;
    let consecutiveFailures = 0;

    const checkBackendHealth = async () => {
      try {
        const response = await fetch('/api/health/', {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });

        if (response.ok) {
          setBackendStatus('connected');
          consecutiveFailures = 0;
          setShowResetButton(false);
        } else {
          throw new Error(`Backend returned ${response.status}`);
        }
      } catch (error) {
        consecutiveFailures++;
        setBackendStatus('error');

        // Show reset option after 3 consecutive failures
        if (consecutiveFailures >= 3) {
          setShowResetButton(true);
          setIsVisible(true);
        }
      }
    };

    // Check backend health every 10 seconds in dev
    checkBackendHealth();
    checkInterval = setInterval(checkBackendHealth, 10000);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (checkInterval) {
        clearInterval(checkInterval);
      }
    };
  }, [isDev]);

  const handleResetPWA = async () => {
    setIsVisible(false);
    if (cacheManagerRef.current) {
      await cacheManagerRef.current.resetPWA();
    }
  };

  const handleClearCaches = async () => {
    if (cacheManagerRef.current) {
      await cacheManagerRef.current.clearAllCaches();
      window.location.reload();
    }
  };

  const handleCloseHelper = () => {
    setIsVisible(false);
    setShowResetButton(false);
  };

  // Only render in development mode
  if (!isDev) return null;

  // Only show if there are backend issues and CacheManager is loaded
  if (!isVisible || !showResetButton || !cacheManagerLoaded) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      zIndex: 10000,
      background: '#ff6b6b',
      color: 'white',
      padding: '16px',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      maxWidth: '320px',
      fontSize: '14px',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
        <div style={{ fontSize: '18px' }}>⚠️</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
            Backend Connection Issues
          </div>
          <div style={{ marginBottom: '12px', fontSize: '13px', opacity: 0.9 }}>
            PWA cache might be causing conflicts. Try clearing caches or resetting the PWA.
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={handleClearCaches}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: '1px solid rgba(255,255,255,0.3)',
                color: 'white',
                padding: '6px 12px',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              Clear Caches
            </button>
            <button
              onClick={handleResetPWA}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: '1px solid rgba(255,255,255,0.3)',
                color: 'white',
                padding: '6px 12px',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              Reset PWA
            </button>
            <button
              onClick={handleCloseHelper}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'white',
                padding: '6px',
                borderRadius: '4px',
                fontSize: '16px',
                cursor: 'pointer',
                opacity: 0.7
              }}
            >
              ✕
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DevCacheHelper;

/**
 * PWA Initialization
 * Sets up service worker and handles PWA events
 */

import { registerSW } from 'virtual:pwa-register';
import notificationService from '../services/notificationService.js';

// PWA update available flag
let updateAvailable = false;
let alreadyInitialized = false; // guard against StrictMode double effects

/**
 * Initialize PWA features
 */
export function initializePWA() {
  if (alreadyInitialized) {
    return {
      updateSW: () => { },
      isUpdateAvailable: () => updateAvailable
    };
  }
  // In development, only enable PWA if explicitly allowed via env flag
  const enablePwaInDev = String(import.meta.env?.VITE_ENABLE_PWA_IN_DEV || '').toLowerCase() === 'true';
  if (import.meta.env.DEV) {
    console.log('[PWA] Dev mode. VITE_ENABLE_PWA_IN_DEV =', enablePwaInDev);
  }

  // Skip actual registration in development by default to avoid dev SW issues
  if (import.meta.env.DEV && !enablePwaInDev) {
    return {
      updateSW: () => console.log('PWA update skipped in development'),
      isUpdateAvailable: () => false
    };
  }

  try {
    // Register service worker with update handling
    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        updateAvailable = true;
        console.log('PWA update available');

        // Show update notification to user
        showUpdateNotification();
      },
      onOfflineReady() {
        console.log('PWA ready to work offline');

        // Show offline ready notification
        showOfflineNotification();
      },
      onRegistered(registration) {
        console.log('PWA service worker registered:', registration);

        // Initialize notification service
        initializeNotifications(registration);
      },
      onRegisterError(error) {
        console.error('PWA service worker registration failed:', error);
        // Clear potentially corrupted caches
        if ('caches' in window) {
          caches.keys().then(names => {
            names.forEach(name => {
              console.log(`Clearing cache: ${name}`);
              caches.delete(name);
            });
          });
        }
      }
    });

    alreadyInitialized = true;
    // Return update function for manual updates
    return {
      updateSW,
      isUpdateAvailable: () => updateAvailable
    };
  } catch (error) {
    console.error('❌ Failed to initialize PWA:', error);
    // Return dummy functions to prevent crashes
    return {
      updateSW: () => console.warn('PWA not available'),
      isUpdateAvailable: () => false
    };
  }
}/**
 * Show update available notification
 */
function showUpdateNotification() {
  // Create update banner
  const banner = document.createElement('div');
  banner.id = 'pwa-update-banner';
  banner.innerHTML = `
    <div style="
      position: fixed;
      top: 20px;
      right: 20px;
      background: #339432;
      color: white;
      padding: 16px 20px;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      font-size: 14px;
      max-width: 320px;
      animation: slideIn 0.3s ease-out;
    ">
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
        <span style="font-size: 18px;">🔄</span>
        <span style="font-weight: 600;">Update Available</span>
      </div>
      <p style="margin: 0 0 12px 0; line-height: 1.4;">
        A new version of SmarTanom is available with improvements and bug fixes.
      </p>
      <div style="display: flex; gap: 8px;">
        <button id="pwa-update-btn" style="
          background: white;
          color: #339432;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          font-size: 13px;
        ">Update Now</button>
        <button id="pwa-dismiss-btn" style="
          background: rgba(255, 255, 255, 0.2);
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          font-size: 13px;
        ">Later</button>
      </div>
    </div>
    <style>
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    </style>
  `;

  document.body.appendChild(banner);

  // Add event listeners
  document.getElementById('pwa-update-btn')?.addEventListener('click', () => {
    window.location.reload();
  });

  document.getElementById('pwa-dismiss-btn')?.addEventListener('click', () => {
    banner.remove();
  });

  // Auto-hide after 30 seconds
  setTimeout(() => {
    banner.remove();
  }, 30000);
}

/**
 * Show offline ready notification
 */
function showOfflineNotification() {
  // Create offline banner
  const banner = document.createElement('div');
  banner.id = 'pwa-offline-banner';
  banner.innerHTML = `
    <div style="
      position: fixed;
      bottom: 20px;
      left: 20px;
      background: #10b981;
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      font-size: 14px;
      font-weight: 500;
      animation: slideUp 0.3s ease-out;
    ">
      <div style="display: flex; align-items: center; gap: 8px;">
        <span>📱</span>
        <span>App ready to work offline!</span>
      </div>
    </div>
    <style>
      @keyframes slideUp {
        from { transform: translateY(100%); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
    </style>
  `;

  document.body.appendChild(banner);

  // Auto-hide after 5 seconds
  setTimeout(() => {
    banner.remove();
  }, 5000);
}

/**
 * Initialize notification service
 */
async function initializeNotifications(registration) {
  try {
    await notificationService.initialize();
    console.log('Notification service initialized');
  } catch (error) {
    console.warn('Failed to initialize notification service:', error);
  }
}

/**
 * Handle network status changes
 */
export function setupNetworkHandling() {
  const showOnlineStatus = (isOnline) => {
    const existingBanner = document.getElementById('network-status-banner');
    if (existingBanner) {
      existingBanner.remove();
    }

    const banner = document.createElement('div');
    banner.id = 'network-status-banner';
    banner.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: ${isOnline ? '#10b981' : '#ef4444'};
        color: white;
        padding: 8px 16px;
        border-radius: 6px;
        font-size: 13px;
        font-weight: 600;
        z-index: 10000;
        animation: fadeIn 0.3s ease-out;
      ">
        ${isOnline ? '🌐 Back online' : '📡 Offline mode'}
      </div>
      <style>
        @keyframes fadeIn {
          from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      </style>
    `;

    document.body.appendChild(banner);

    // Auto-hide after 3 seconds
    setTimeout(() => {
      banner.remove();
    }, 3000);
  };

  // Listen for online/offline events
  window.addEventListener('online', () => showOnlineStatus(true));
  window.addEventListener('offline', () => showOnlineStatus(false));
}

/**
 * Handle PWA beforeinstallprompt for better UX
 */
export function setupInstallPrompt() {
  let deferredPrompt = null;

  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent Chrome 67 and earlier from automatically showing the prompt
    e.preventDefault();

    // Store the event for later use
    deferredPrompt = e;
    try { window.__deferredPWAInstallPrompt = e; } catch (_) { }

    console.log('PWA install prompt available');
  });

  window.addEventListener('appinstalled', () => {
    console.log('PWA was installed');
    deferredPrompt = null;
    try { window.__deferredPWAInstallPrompt = null; } catch (_) { }
  });

  return () => deferredPrompt;
}

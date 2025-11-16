import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './assets/styles/global.css';
import CacheManager from './utils/cacheManager.js';
import ScrollToTop from './components/routing/ScrollToTop.jsx';

// Development helpers
if (import.meta.env.DEV) {
  // Expose cache management utilities in development
  window.clearPWACache = CacheManager.clearAllCaches;
  window.resetPWA = CacheManager.resetPWA;
  window.checkCaches = CacheManager.checkCacheStatus;

  // Immediate cleanup function for white screen issues
  window.fixWhiteScreen = async () => {
    console.log('🔄 Fixing white screen issue...');
    await CacheManager.unregisterServiceWorker();
    await CacheManager.clearAllCaches();
    console.log('✅ Cleanup complete. Reloading...');
    setTimeout(() => window.location.reload(), 1000);
  };


}

// Global error handler to prevent white screen
window.addEventListener('error', (event) => {
  console.error('❌ Global error caught:', event.error);
  // Don't prevent default - just log it
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('❌ Unhandled promise rejection:', event.reason);
  // Don't prevent default - just log it
});

// Render app with error boundary
try {
  createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        {/* Global scroll restoration on each route change */}
        <ScrollToTop />
        <App />
      </BrowserRouter>
    </React.StrictMode>
  );
} catch (error) {
  console.error('❌ Failed to render app:', error);
  // Fallback rendering
  document.getElementById('root').innerHTML = `
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; font-family: system-ui, -apple-system, sans-serif;">
      <h1 style="color: #dc2626; margin-bottom: 16px;">⚠️ Failed to Load</h1>
      <p style="color: #6b7280; margin-bottom: 24px; text-align: center;">
        Something went wrong while loading the application.
      </p>
      <button onclick="window.location.reload()" style="background: #339432; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; cursor: pointer;">
        Reload Page
      </button>
      <button onclick="localStorage.clear(); sessionStorage.clear(); window.location.reload()" style="background: #dc2626; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; cursor: pointer; margin-top: 12px;">
        Clear Cache & Reload
      </button>
    </div>
  `;
}

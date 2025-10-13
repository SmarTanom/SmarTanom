import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './assets/styles/global.css';
import CacheManager from './utils/cacheManager.js';

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

  console.log('🛠️ Development helpers available:');
  console.log('  - window.clearPWACache() - Clear all PWA caches');
  console.log('  - window.resetPWA() - Complete PWA reset');
  console.log('  - window.checkCaches() - Check cache status');
  console.log('  - window.fixWhiteScreen() - Fix white screen issues');
}createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

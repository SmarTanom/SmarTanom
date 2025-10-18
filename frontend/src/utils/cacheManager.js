/**
 * Cache Management Utility for SmarTanom PWA
 * Handles service worker cache invalidation when switching backends
 */

class CacheManager {
  static async clearAllCaches() {
    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        const deletePromises = cacheNames.map(cacheName => caches.delete(cacheName));
        await Promise.all(deletePromises);
        console.log('✅ All caches cleared successfully');
        return true;
      } catch (error) {
        console.error('❌ Failed to clear caches:', error);
        return false;
      }
    }
    return false;
  }

  static async clearAPICaches() {
    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        const apiCacheNames = cacheNames.filter(name =>
          name.includes('api-cache') || name.includes('runtime-cache')
        );
        const deletePromises = apiCacheNames.map(cacheName => caches.delete(cacheName));
        await Promise.all(deletePromises);
        console.log('✅ API caches cleared successfully');
        return true;
      } catch (error) {
        console.error('❌ Failed to clear API caches:', error);
        return false;
      }
    }
    return false;
  }

  static async unregisterServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        const unregisterPromises = registrations.map(registration => registration.unregister());
        await Promise.all(unregisterPromises);
        console.log('✅ Service workers unregistered successfully');
        return true;
      } catch (error) {
        console.error('❌ Failed to unregister service workers:', error);
        return false;
      }
    }
    return false;
  }

  static async forceRefresh() {
    try {
      // Clear all caches
      await this.clearAllCaches();

      // Clear session storage (keeping localStorage for user preferences)
      if (window.sessionStorage) {
        window.sessionStorage.clear();
      }

      // Force reload without cache
      if (window.location.reload) {
        window.location.reload(true);
      } else {
        // Fallback for browsers that don't support reload(true)
        window.location.href = window.location.href;
      }
    } catch (error) {
      console.error('❌ Failed to force refresh:', error);
    }
  }

  static async resetPWA() {
    try {
      console.log('🔄 Resetting PWA...');

      // Step 1: Clear all caches
      await this.clearAllCaches();

      // Step 2: Unregister service workers
      await this.unregisterServiceWorker();

      // Step 3: Clear storages
      if (window.sessionStorage) {
        window.sessionStorage.clear();
      }

      // Step 4: Optional: Clear localStorage (uncomment if needed)
      // if (window.localStorage) {
      //   window.localStorage.clear();
      // }

      console.log('✅ PWA reset complete. Refreshing page...');

      // Step 5: Force refresh
      setTimeout(() => {
        window.location.reload(true);
      }, 500);

      return true;
    } catch (error) {
      console.error('❌ Failed to reset PWA:', error);
      return false;
    }
  }

  static async checkCacheStatus() {
    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        console.log('📦 Active caches:', cacheNames);

        for (const cacheName of cacheNames) {
          const cache = await caches.open(cacheName);
          const keys = await cache.keys();
          console.log(`  - ${cacheName}: ${keys.length} entries`);
        }

        return cacheNames;
      } catch (error) {
        console.error('❌ Failed to check cache status:', error);
        return [];
      }
    }
    return [];
  }
}

// Development helper - expose to window object for debugging
if (import.meta.env.DEV) {
  window.CacheManager = CacheManager;
}

export default CacheManager;

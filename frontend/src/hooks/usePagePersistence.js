import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * Hook to persist the current page path and restore it on refresh
 *
 * This hook:
 * 1. Saves the current path to localStorage whenever the route changes
 * 2. Excludes auth/public routes from persistence (login, signup, splash)
 * 3. Only persists protected routes that users should return to
 *
 * @returns {void}
 */
export function usePagePersistence() {
  const location = useLocation();
  const navigate = useNavigate();

  // Define routes that should NOT be persisted
  const excludedPaths = [
    '/',
    '/splash',
    '/signin/email',
    '/signup/email',
    '/signin/code',
    '/signup/code',
    '/signup/setup',
    '/signup/username'
  ];

  useEffect(() => {
    const currentPath = location.pathname + location.search + location.hash;

    // Only persist protected routes (not auth/public routes)
    const shouldPersist = !excludedPaths.some(excluded =>
      location.pathname === excluded || location.pathname.startsWith(excluded)
    );

    if (shouldPersist) {
      try {
        localStorage.setItem('lastVisitedPage', currentPath);
        console.log('[PagePersistence] Saved current page:', currentPath);
      } catch (e) {
        console.warn('[PagePersistence] Failed to save page:', e);
      }
    }
  }, [location.pathname, location.search, location.hash]);
}

/**
 * Hook to restore the last visited page on app mount
 * Should only be called once in the root App component
 *
 * @returns {Function} Function to restore the last page
 */
export function useRestoreLastPage() {
  const navigate = useNavigate();

  const restoreLastPage = () => {
    try {
      const authToken = localStorage.getItem('authToken');

      // Only restore if user is authenticated
      if (!authToken) {
        console.log('[PagePersistence] No auth token, skipping restore');
        return false;
      }

      const lastPage = localStorage.getItem('lastVisitedPage');

      if (!lastPage || lastPage === '/') {
        console.log('[PagePersistence] No last page to restore');
        return false;
      }

      console.log('[PagePersistence] Restoring last page:', lastPage);
      navigate(lastPage, { replace: true });
      return true;
    } catch (e) {
      console.warn('[PagePersistence] Failed to restore page:', e);
      return false;
    }
  };

  return restoreLastPage;
}

/**
 * Utility function to clear the persisted page
 * Useful for logout or when user manually navigates to root
 *
 * Note: This does NOT clear dashboard device selection (dashboard.activeDeviceIndex, dashboard.activeDeviceId)
 * so users can return to the same device they were viewing after re-login
 */
export function clearPersistedPage() {
  try {
    localStorage.removeItem('lastVisitedPage');
    console.log('[PagePersistence] Cleared persisted page (keeping dashboard device selection)');
  } catch (e) {
    console.warn('[PagePersistence] Failed to clear persisted page:', e);
  }
}

/**
 * Utility function to clear ALL persisted state including dashboard device selection
 * Use this for complete logout cleanup (e.g., switching users)
 */
export function clearAllPersistedState() {
  try {
    localStorage.removeItem('lastVisitedPage');
    localStorage.removeItem('dashboard.activeDeviceIndex');
    localStorage.removeItem('dashboard.activeDeviceId');
    localStorage.removeItem('dashboard.phData');
    console.log('[PagePersistence] Cleared all persisted state');
  } catch (e) {
    console.warn('[PagePersistence] Failed to clear all persisted state:', e);
  }
}

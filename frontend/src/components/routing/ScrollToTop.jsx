import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ScrollToTop
 *
 * Global route-change listener that resets scroll position to the top for
 * every navigation (links, buttons, redirects, programmatic routing).
 *
 * Usage: mount once anywhere inside a Router (e.g., BrowserRouter) and
 * outside of your <Routes>. It will affect the entire app.
 */
export default function ScrollToTop({ behavior = 'auto' }) {
  const location = useLocation();

  useEffect(() => {
    // Primary: scroll window
    try {
      window.scrollTo({ top: 0, left: 0, behavior });
    } catch {
      // Fallback for older browsers
      window.scrollTo(0, 0);
    }

    // Defensive: also reset common scroll containers if used
    const candidates = [
      document.scrollingElement,
      document.documentElement,
      document.body,
      document.getElementById('root'),
      document.getElementById('app'),
    ].filter(Boolean);

    for (const el of candidates) {
      if (el.scrollTop !== undefined) {
        el.scrollTop = 0;
      }
    }
  }, [location.pathname, location.search, location.hash]);

  return null;
}

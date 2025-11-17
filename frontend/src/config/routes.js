/**
 * Route configuration for SmarTanom application
 * Defines which routes are public, protected, or require admin access
 */

export const ROUTE_CONFIG = {
  // Public routes (accessible only to non-authenticated users)
  public: [
    '/',
    '/splash',
    '/signin/email',
    '/signup/email',
    '/signin/code',
    '/signup/code'
  ],

  // Semi-public routes (accessible during signup flow)
  signup: [
    '/signup/setup',
    '/signup/username'
  ],

  // Protected routes (require authentication)
  protected: [
    '/dashboard',
    '/add-device',
    '/start-cycle',
    '/device/:deviceId',
    '/alerts',
    '/profile',
    '/privacy-security'
  ],

  // Admin routes (require admin privileges)
  admin: [
    '/admin'
  ],

  // Default redirects
  defaults: {
    authenticated: '/dashboard',
    unauthenticated: '/',
    unauthorized: '/dashboard'
  }
};

/**
 * Check if a route is public (only for non-authenticated users)
 */
export function isPublicRoute(pathname) {
  return ROUTE_CONFIG.public.includes(pathname);
}

/**
 * Check if a route is in the signup flow
 */
export function isSignupRoute(pathname) {
  return ROUTE_CONFIG.signup.includes(pathname);
}

/**
 * Check if a route is protected (requires authentication)
 */
export function isProtectedRoute(pathname) {
  return ROUTE_CONFIG.protected.some(route => {
    if (route.includes(':')) {
      // Handle dynamic routes like /device/:deviceId
      const pattern = route.replace(/:[^/]+/g, '[^/]+');
      const regex = new RegExp(`^${pattern}$`);
      return regex.test(pathname);
    }
    return pathname === route;
  });
}

/**
 * Check if a route requires admin access
 */
export function isAdminRoute(pathname) {
  return ROUTE_CONFIG.admin.includes(pathname);
}

/**
 * Get the appropriate redirect destination based on authentication state
 */
export function getRedirectDestination(isAuthenticated, isAdmin, currentPath) {
  if (!isAuthenticated) {
    return ROUTE_CONFIG.defaults.unauthenticated;
  }

  // If trying to access admin route without admin privileges
  if (isAdminRoute(currentPath) && !isAdmin) {
    return ROUTE_CONFIG.defaults.unauthorized;
  }

  // Default authenticated redirect
  return ROUTE_CONFIG.defaults.authenticated;
}

export default ROUTE_CONFIG;

// Auth components and utilities
export { ProtectedRoute, useAuthStatus as useProtectedAuthStatus, withAuthProtection } from './ProtectedRoute.jsx';
export { PublicRoute } from './PublicRoute.jsx';
export {
  AuthStatus,
  useIsAuthenticated,
  AuthenticatedOnly,
  UnauthenticatedOnly,
  AdminOnly
} from './AuthStatus.jsx';

// Re-export context hooks for convenience
export {
  useAuth,
  useAuthStatus,
  useAuthActions
} from '../../contexts/AuthContext.jsx';

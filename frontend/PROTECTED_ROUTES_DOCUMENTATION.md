# SmarTanom Protected Routes Implementation

This document explains the comprehensive protected routes system implemented for the SmarTanom frontend application.

## Overview

The protected routes system provides:

- **Authentication-based route protection**
- **Role-based access control (admin routes)**
- **Automatic redirects for unauthorized access**
- **Loading states during authentication checks**
- **Token validation with backend**
- **Proper error handling and cleanup**

## Components

### 1. AuthProvider (`src/contexts/AuthContext.jsx`)

Global authentication state management that provides:

- Current authentication status
- User information
- Login/logout operations
- Token management
- Error handling

```jsx
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx';

// Wrap your app
<AuthProvider>
  <App />
</AuthProvider>

// Use in components
const { isAuthenticated, user, login, logout } = useAuth();
```

### 2. ProtectedRoute (`src/components/auth/ProtectedRoute.jsx`)

Protects routes that require authentication:

```jsx
import ProtectedRoute from './components/auth/ProtectedRoute.jsx';

// Basic protection
<Route path="/dashboard" element={
  <ProtectedRoute>
    <Dashboard />
  </ProtectedRoute>
} />

// Admin-only protection
<Route path="/admin" element={
  <ProtectedRoute requireAdmin={true}>
    <AdminDashboard />
  </ProtectedRoute>
} />
```

**Features:**
- Checks for valid auth token
- Validates token with backend
- Shows loading spinner during checks
- Redirects to landing page if not authenticated
- Preserves intended destination for post-login redirect
- Supports admin-only routes

### 3. PublicRoute (`src/components/auth/PublicRoute.jsx`)

For routes that should only be accessible to non-authenticated users:

```jsx
import PublicRoute from './components/auth/PublicRoute.jsx';

<Route path="/" element={
  <PublicRoute>
    <LandingPage />
  </PublicRoute>
} />
```

**Features:**
- Redirects authenticated users to dashboard
- Supports custom redirect destinations
- Handles redirect state from protected routes

### 4. AuthStatus (`src/components/auth/AuthStatus.jsx`)

Displays current authentication state:

```jsx
import { AuthStatus, AuthenticatedOnly, AdminOnly } from './components/auth/AuthStatus.jsx';

// Show auth status with user info and logout
<AuthStatus />

// Conditional rendering
<AuthenticatedOnly>
  <UserMenu />
</AuthenticatedOnly>

<AdminOnly>
  <AdminPanel />
</AdminOnly>
```

## Route Configuration

All routes are categorized in `src/config/routes.js`:

```javascript
export const ROUTE_CONFIG = {
  // Public routes (only for non-authenticated)
  public: ['/', '/signin/email', '/signup/email', ...],

  // Protected routes (require authentication)
  protected: ['/dashboard', '/profile', '/alerts', ...],

  // Admin routes (require admin privileges)
  admin: ['/admin'],

  // Default redirects
  defaults: {
    authenticated: '/dashboard',
    unauthenticated: '/',
    unauthorized: '/dashboard'
  }
};
```

## Usage in App.jsx

The main app now uses both AuthProvider and route protection:

```jsx
export default function App() {
  return (
    <AuthProvider>
      <AuthFlowProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={
            <PublicRoute>
              <LandingPage />
            </PublicRoute>
          } />

          {/* Protected routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />

          {/* Admin routes */}
          <Route path="/admin" element={
            <ProtectedRoute requireAdmin={true}>
              <AdminDashboard />
            </ProtectedRoute>
          } />
        </Routes>
      </AuthFlowProvider>
    </AuthProvider>
  );
}
```

## Authentication Flow Integration

### Login Process

1. User verifies OTP code
2. `CodePage` calls `verifyCode()` API
3. On success, calls `login()` from AuthContext
4. AuthContext stores token and user data
5. User is redirected to dashboard or intended destination

### Logout Process

1. User clicks logout (e.g., in ProfilePage)
2. Calls `logout()` from AuthContext
3. AuthContext notifies backend and clears local state
4. User is redirected to landing page

### Token Validation

- All protected routes validate tokens with backend
- Invalid tokens are automatically cleared
- Users are redirected appropriately
- Loading states prevent flash of incorrect content

## Error Handling

The system handles various error scenarios:

- **Network errors**: Graceful fallback and retry
- **Invalid tokens**: Automatic cleanup and redirect
- **Backend errors**: User-friendly error messages
- **Session expiration**: Clean logout and redirect

## Security Features

- **No sensitive data in localStorage** (only auth token)
- **Backend token validation** on every protected route access
- **Automatic token cleanup** on errors or logout
- **CSRF protection** through DRF integration
- **Role-based access control** for admin features

## Accessibility Features

- **Loading states** with proper ARIA labels
- **Focus management** during route transitions
- **Screen reader support** for auth status
- **High contrast mode** support
- **Reduced motion** support

## Performance Optimizations

- **Token validation caching** (React state)
- **Conditional rendering** to avoid unnecessary checks
- **Efficient re-renders** with React.memo and useMemo
- **Lazy loading** compatible

## Testing

To test the protected routes system:

1. **Authentication Flow**:
   - Try accessing `/dashboard` without login → should redirect to `/`
   - Complete login flow → should access `/dashboard`
   - Logout → should redirect to `/`

2. **Admin Routes**:
   - Login as regular user, try `/admin` → should redirect to `/dashboard`
   - Login as admin → should access `/admin`

3. **Token Validation**:
   - Manually clear token from localStorage while logged in
   - Navigate to any protected route → should redirect to `/`

4. **Public Routes**:
   - Login, then try to access `/` → should redirect to `/dashboard`

## Integration with Backend

The system integrates with the Django backend authentication:

- Uses DRF Token authentication
- Calls `/api/auth/profile/` for token validation
- Calls `/api/auth/logout/` for proper logout
- Handles OTP flow integration
- Supports user roles and permissions

## Troubleshooting

**Issue**: Infinite redirect loops
- **Cause**: Misconfigured route protection
- **Fix**: Check route configuration and auth state

**Issue**: Flash of protected content
- **Cause**: Missing loading states
- **Fix**: Ensure ProtectedRoute is properly implemented

**Issue**: Token not being cleared
- **Cause**: Error in logout process
- **Fix**: Check AuthContext logout implementation

**Issue**: Admin routes not working
- **Cause**: User role not properly set
- **Fix**: Verify backend user model and token response

## Future Enhancements

Potential improvements to consider:

1. **Route-level permissions** (beyond admin/user)
2. **Token refresh** mechanism
3. **Offline mode** support
4. **Session timeout** warnings
5. **Multi-tab synchronization**
6. **Route-based analytics**

## API Integration Status

- ✅ **Token validation**: Integrated with `/api/auth/profile/`
- ✅ **Logout**: Integrated with `/api/auth/logout/`
- ✅ **OTP verification**: Integrated with existing auth flow
- ✅ **Username finalization**: Integrated with `/api/auth/finalize-account/`
- ⚠️ **Username checking**: Uses backend API (depends on implementation)

## Dependencies

- React Router DOM (navigation)
- Lucide React (icons)
- Existing apiClient (backend integration)
- Existing AuthFlowContext (OTP flow)

---

**Implementation Date**: October 12, 2025
**Status**: ✅ Complete and Ready for Testing
**Authentication Method**: Token-based with OTP verification

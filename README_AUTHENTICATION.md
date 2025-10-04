# Authentication & Dashboard System Documentation

## Overview
This document explains the authentication flow and role-based dashboard routing implemented in the SmarTanom application.

## Architecture

### Authentication Context (`AuthContext.jsx`)
- **Purpose**: Manages global authentication state across the application
- **State Management**: Uses React Context API with localStorage for session persistence
- **Security**: User data stored in localStorage (will be replaced with secure HTTP-only cookies in production)

### User Roles
1. **Admin (`role: 'admin'`)**
   - Access to Admin Dashboard (`/admin`)
   - Elevated privileges for managing users and system
   - Determined by email pattern (temporary) - will be backend-controlled

2. **User (`role: 'user'`)**
   - Access to User Dashboard (`/dashboard`)
   - Can only view/manage their own devices and data
   - Default role for regular users

### Protected Routes
- **ProtectedRoute Component**: Wrapper for authenticated routes
  - Checks authentication status
  - Validates role-based access
  - Redirects unauthorized users
  - Shows loading state during auth check

## User Flows

### 1. New User Registration (Signup)
```
Landing Page → Email Entry → Code Verification → Device Setup (6 steps) → Dashboard
```

**Steps:**
1. User enters email at `/signup/email`
2. Receives and verifies 6-digit code at `/signup/code`
3. Completes 6-step device setup at `/signup/setup`:
   - Step 1: Identify Device (QR scan/upload/manual)
   - Step 2: Device & Hydroponic Info
   - Step 3: Bind Device to Email
   - Step 4: Verify Email with OTP
   - Step 5: WiFi Setup
   - Step 6: Set Username
4. After Step 6 completion:
   - `signIn()` is called with user data
   - Session is created and stored
   - User is redirected to appropriate dashboard based on role

### 2. Existing User Login (Signin)
```
Landing Page → Email Entry → Code Verification → Dashboard
```

**Steps:**
1. User enters email at `/signin/email`
2. Verifies code at `/signin/code`
3. On successful verification:
   - `signIn()` is called with user data from backend
   - Backend determines user role
   - User is redirected to:
     - `/admin` if role is 'admin'
     - `/dashboard` if role is 'user'

### 3. Role-Based Routing
- **Admin users**: Always redirected to `/admin`
- **Regular users**: Always redirected to `/dashboard`
- **Unauthorized access**:
  - Admin trying to access `/dashboard` → Redirected to `/admin`
  - User trying to access `/admin` → Redirected to `/dashboard`
  - Unauthenticated trying to access either → Redirected to `/`

## Data Isolation & Security

### Current Implementation (Frontend Only)
```javascript
// Mock logic for role determination (temporary)
const isAdmin = userData.email?.toLowerCase().includes('admin');
```

### Production Implementation (TODO)
1. **Backend API Integration**:
   ```javascript
   // POST /api/auth/verify
   {
     email: "user@example.com",
     code: "123456"
   }
   
   // Response
   {
     user: {
       id: "uuid",
       email: "user@example.com",
       username: "username",
       role: "user", // Determined by database
       token: "jwt-token"
     }
   }
   ```

2. **Data Isolation**:
   - Each API request includes user token
   - Backend validates token and extracts user ID
   - Queries filter by user ID automatically
   - Users can only access their own data
   - Admins have elevated permissions

3. **Security Measures**:
   - JWT tokens with expiration
   - HTTP-only cookies for token storage
   - CSRF protection
   - API rate limiting
   - Input validation and sanitization

## File Structure

```
frontend/src/
├── context/
│   └── AuthContext.jsx          # Global auth state management
├── components/
│   └── ProtectedRoute.jsx       # Route wrapper for auth
├── pages/
│   ├── Dashboard.jsx            # User dashboard
│   ├── AdminDashboard.jsx       # Admin dashboard
│   ├── SignupSetup.jsx          # 6-step setup wizard
│   └── CodePage.jsx             # OTP verification
├── assets/
│   └── styles/
│       └── Dashboard.css        # Dashboard styling
└── App.jsx                      # Route configuration
```

## Components

### AuthContext API
```javascript
const {
  user,              // Current user object or null
  loading,           // Boolean: checking auth status
  isAuthenticated,   // Boolean: user is logged in
  isAdmin,           // Boolean: user has admin role
  signIn,            // Function: (userData) => Promise<user>
  signOut,           // Function: () => Promise<void>
  updateUser,        // Function: (updates) => void
} = useAuth();
```

### ProtectedRoute Props
```javascript
<ProtectedRoute
  requiredRole="user"  // Optional: 'admin' | 'user'
  redirectTo="/"       // Optional: custom redirect path
>
  <YourComponent />
</ProtectedRoute>
```

## Usage Examples

### Sign In a User
```javascript
import { useAuth } from '../context/AuthContext';

function MyComponent() {
  const { signIn } = useAuth();
  
  const handleLogin = async () => {
    const userData = {
      email: 'user@example.com',
      username: 'username',
      isNewUser: false,
    };
    
    const user = await signIn(userData);
    // User is now authenticated
    // Navigate based on user.role
  };
}
```

### Check Authentication Status
```javascript
import { useAuth } from '../context/AuthContext';

function MyComponent() {
  const { isAuthenticated, isAdmin, user } = useAuth();
  
  if (!isAuthenticated) {
    return <p>Please sign in</p>;
  }
  
  return (
    <div>
      <p>Welcome, {user.username}!</p>
      {isAdmin && <AdminControls />}
    </div>
  );
}
```

### Sign Out
```javascript
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

function SignOutButton() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  
  const handleSignOut = async () => {
    await signOut();
    navigate('/', { replace: true });
  };
  
  return <button onClick={handleSignOut}>Sign Out</button>;
}
```

## Dashboard Features

### User Dashboard (`/dashboard`)
- **Current**: Blank placeholder with welcome message
- **Planned Features**:
  - Device list and status
  - Real-time monitoring data
  - Device controls
  - Alerts and notifications
  - Profile settings

### Admin Dashboard (`/admin`)
- **Current**: Blank placeholder with stats grid
- **Planned Features**:
  - User management (CRUD operations)
  - Device management across all users
  - System analytics and reports
  - Configuration settings
  - Audit logs

## Backend Integration Checklist

- [ ] Create authentication endpoints
  - [ ] POST `/api/auth/register`
  - [ ] POST `/api/auth/verify-code`
  - [ ] POST `/api/auth/signin`
  - [ ] POST `/api/auth/signout`
  - [ ] GET `/api/auth/me` (check session)

- [ ] Implement user database schema
  - [ ] User table with role field
  - [ ] Device ownership relationships
  - [ ] Admin permissions

- [ ] Add JWT token generation and validation
  - [ ] Secure token storage (HTTP-only cookies)
  - [ ] Token refresh mechanism
  - [ ] Token expiration handling

- [ ] Implement data isolation middleware
  - [ ] Filter queries by user ID
  - [ ] Validate user permissions
  - [ ] Admin override for elevated access

- [ ] Add API security
  - [ ] CORS configuration
  - [ ] Rate limiting
  - [ ] Input validation
  - [ ] CSRF protection

## Testing Considerations

### Current Mock Behavior
1. **Admin Detection**: Email containing "admin" → admin role
2. **Code Verification**: "000000" is rejected, any other 6-digit code accepted
3. **Username Availability**: Rejects common names (admin, user, test, smartanom, demo)
4. **Delays**: Mock API calls use setTimeout (600ms - 1.5s)

### Test Scenarios
- [ ] New user registration flow
- [ ] Existing user signin flow
- [ ] Admin user signin
- [ ] Protected route access (authenticated)
- [ ] Protected route access (unauthenticated)
- [ ] Role-based redirection
- [ ] Session persistence across refresh
- [ ] Sign out functionality

## Best Practices Implemented

1. **Security**:
   - Sensitive operations require authentication
   - Role-based access control (RBAC)
   - Protected routes prevent unauthorized access

2. **UX**:
   - Loading states during authentication
   - Clear error messages
   - Automatic navigation after auth
   - Session persistence (no re-login on refresh)

3. **Code Quality**:
   - Separation of concerns (context, components, pages)
   - Reusable ProtectedRoute component
   - Clear prop types and documentation
   - Consistent naming conventions

4. **Performance**:
   - useMemo for derived state
   - Conditional rendering
   - Lazy loading potential for dashboards

## Future Enhancements

1. **Multi-Factor Authentication (MFA)**
2. **Password-based auth option**
3. **Social login (Google, GitHub)**
4. **Remember device functionality**
5. **Session timeout warnings**
6. **Activity logging**
7. **Permission granularity beyond admin/user**
8. **API key management for devices**

---

**Note**: This system is currently frontend-only with mock authentication. All TODO items marked in code should be implemented with proper backend integration before production deployment.

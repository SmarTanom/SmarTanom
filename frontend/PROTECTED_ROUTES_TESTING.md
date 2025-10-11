# Protected Routes Testing Guide

## ✅ **Issue Fixed: Import Path Corrected**

The error was caused by an incorrect import path in `AuthContext.jsx`:

```jsx
// ❌ Wrong (was causing the error)
import { authApi } from '../../services/apiClient';

// ✅ Fixed
import { authApi } from '../services/apiClient.js';
```

**Reason**: From `src/contexts/AuthContext.jsx`, we only need to go up one level (`../`) to reach `src/services/`, not two levels (`../../`).

## 🧪 **Testing the Protected Routes**

### 1. **Test Unauthenticated Access**
- Clear your browser's localStorage: `localStorage.clear()`
- Navigate to: `http://localhost:5173/dashboard`
- **Expected**: Should redirect to `/` (landing page)

### 2. **Test Authentication Flow**
- Go to landing page: `http://localhost:5173/`
- Complete the login process
- **Expected**: Should redirect to `/dashboard` after successful login

### 3. **Test Admin Routes**
- Login as a regular user
- Try to access: `http://localhost:5173/admin`
- **Expected**: Should redirect to `/dashboard` (not `/admin`)

### 4. **Test Public Routes with Auth**
- Login successfully
- Try to access: `http://localhost:5173/` or `http://localhost:5173/signin/email`
- **Expected**: Should redirect to `/dashboard`

## 🔧 **Debugging Tools**

### Add Debug Component (Temporary)
Add this to any page to see auth state:

```jsx
import AuthDebugInfo from '../components/debug/AuthDebugInfo.jsx';

// Add to your component's JSX
<AuthDebugInfo />
```

### Browser Console Debugging
```javascript
// Check auth token
localStorage.getItem('authToken')

// Clear auth token (force logout)
localStorage.removeItem('authToken')

// Check all localStorage
console.log(localStorage)
```

## 🛠️ **Common Issues & Solutions**

### Issue: "Cannot resolve import" errors
**Solution**: Check import paths are correct relative to file location

### Issue: Infinite redirect loops
**Solution**:
- Check if AuthProvider is wrapping the entire app
- Verify route configuration in App.jsx

### Issue: Flash of protected content
**Solution**: Ensure ProtectedRoute components are properly wrapping protected pages

### Issue: Login doesn't persist
**Solution**:
- Check if token is being stored: `localStorage.getItem('authToken')`
- Verify backend `/api/auth/profile/` endpoint is working

## 📋 **Backend Requirements**

Make sure your Django backend has these endpoints working:

1. **Token Validation**: `GET /api/auth/profile/`
   - Headers: `Authorization: Token <your-token>`
   - Returns user profile data

2. **Logout**: `POST /api/auth/logout/`
   - Headers: `Authorization: Token <your-token>`
   - Invalidates the token

3. **OTP Verification**: `POST /api/auth/verify-otp/`
   - Returns: `{ token, user }` on success

## 🚀 **Start Testing**

1. **Start Backend**:
   ```bash
   cd backend
   python manage.py runserver
   ```

2. **Start Frontend**:
   ```bash
   cd frontend
   npm run dev
   ```

3. **Test Flow**:
   - Visit `http://localhost:5173/dashboard` (should redirect to `/`)
   - Complete login flow
   - Should land on dashboard
   - Try accessing `/admin` (should redirect if not admin)

## ✨ **Expected Behavior Summary**

| URL | Not Logged In | Logged In (User) | Logged In (Admin) |
|-----|---------------|------------------|-------------------|
| `/` | ✅ Show landing | 🔄 Redirect to `/dashboard` | 🔄 Redirect to `/dashboard` |
| `/dashboard` | 🔄 Redirect to `/` | ✅ Show dashboard | ✅ Show dashboard |
| `/profile` | 🔄 Redirect to `/` | ✅ Show profile | ✅ Show profile |
| `/admin` | 🔄 Redirect to `/` | 🔄 Redirect to `/dashboard` | ✅ Show admin |

**Legend**: ✅ = Show page, 🔄 = Redirect

The protected routes system is now properly configured and should work as expected!

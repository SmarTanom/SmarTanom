# WiFi Provisioning Authentication Error Fix

## 🔴 Issues Identified

### 1. Authentication Error
```
✗ Authentication required. Please refresh and try again.
```

**Cause**: Auth token is missing from localStorage or expired

### 2. TypeError: devices.find is not a function
```
TypeError: devices.find is not a function at checkDeviceStatus
```

**Cause**: When API returns an error (401 Unauthorized), the response is an error object, not an array

---

## ✅ Fixes Applied

### Fix 1: Added Array Validation
Added check to ensure API response is an array before calling `.find()`:

```javascript
// Validate response is an array
if (!Array.isArray(devices)) {
  console.error('[SignupSetup] Invalid response from devices API:', devices);
  setProvisioningError('Authentication error. Please refresh and log in again.');
  setProvisioningStatus('failed');
  stopPolling();
  return;
}
```

### Fix 2: Added Early Token Check
Added validation at the start of provisioning to catch missing tokens:

```javascript
function startProvisioning() {
  // Debug: Check if token exists
  const token = localStorage.getItem('authToken');
  if (!token) {
    console.error('[SignupSetup] No auth token found in localStorage.');
    setProvisioningError('Authentication required. Please refresh and complete setup from beginning.');
    setProvisioningStatus('failed');
    return;
  }
  // ... rest of function
}
```

---

## 🔍 Root Cause Analysis

The authentication error happens when:

1. **Token Never Saved**: OTP verification failed silently
2. **Token Expired**: Backend invalidated the token (unlikely in signup flow)
3. **Browser Session Lost**: Page refreshed or localStorage cleared
4. **Direct Navigation**: User navigated to Step 5 URL directly

---

## ✅ Solutions

### Solution 1: Complete Full Signup Flow (Recommended)

**Start fresh and go through all steps:**

1. **Clear browser data** (optional but recommended):
   - Press F12 (DevTools)
   - Go to Application tab → Storage → Clear site data
   - Close and reopen browser

2. **Start signup from beginning**:
   ```
   http://localhost:5174/auth/signup
   ```

3. **Complete each step**:
   - ✅ Step 1: Device verification
   - ✅ Step 2: Reservoir setup
   - ✅ Step 3: Email binding
   - ✅ Step 4: OTP verification ← **Critical! Token saved here**
   - ✅ Step 5: WiFi provisioning
   - ✅ Step 6: Profile setup

4. **Watch console during Step 4**:
   Should see:
   ```
   Device bound successfully: {success: true, auth: {token: "..."}}
   Authentication token stored
   ```

### Solution 2: Check localStorage (Debug)

**Before retrying, verify token exists:**

1. Press F12 (DevTools)
2. Go to Console tab
3. Type:
   ```javascript
   localStorage.getItem('authToken')
   ```
4. Should return a token string like: `"a1b2c3d4e5f6..."`

**If null or undefined:**
- Token was never saved
- Need to restart from Step 3 (email binding)

**If token exists but still getting auth error:**
- Token may be invalid
- Backend may require login
- Check backend logs for token validation errors

### Solution 3: Manual Token Refresh

If you know your email/OTP combo still works:

1. Go back to Step 3 (or restart signup)
2. Re-bind device with email
3. Re-verify OTP
4. Token will be refreshed
5. Continue to Step 5

---

## 🧪 Testing the Fix

### Test 1: Fresh Signup Flow
1. Clear browser storage
2. Navigate to `/auth/signup`
3. Complete Steps 1-4
4. Open DevTools Console
5. After Step 4, verify:
   ```javascript
   localStorage.getItem('authToken')  // Should return token
   ```
6. Continue to Step 5
7. Should see "Waiting for you to complete..." (no auth error)

### Test 2: Retry After Error
1. If you're already on Step 5 with auth error
2. Check console for logs
3. If token is missing, go back to Step 3
4. If token exists, contact backend admin (token may be revoked)

### Test 3: Verify Polling Works
1. Complete Steps 1-4 successfully
2. Reach Step 5
3. Follow ESP32 provisioning instructions
4. After ESP32 connects and reports to backend
5. Frontend should detect within 5-10 seconds
6. Should see: "✓ WiFi configured successfully! Redirecting..."
7. Auto-redirect to dashboard

---

## 🔧 Frontend Code Changes

### File: `frontend/src/pages/SignupSetup.jsx`

#### Change 1: Added Array Validation (Line ~365)
```javascript
// BEFORE:
const devices = await deviceApi.list(token);
const device = devices.find(d => d.serial === deviceSerial);

// AFTER:
const devices = await deviceApi.list(token);

// Validate response is an array
if (!Array.isArray(devices)) {
  console.error('[SignupSetup] Invalid response from devices API:', devices);
  setProvisioningError('Authentication error. Please refresh and log in again.');
  setProvisioningStatus('failed');
  stopPolling();
  return;
}

const device = devices.find(d => d.serial === deviceSerial);
```

#### Change 2: Added Early Token Check (Line ~345)
```javascript
// BEFORE:
function startProvisioning() {
  setProvisioningStatus('waiting');
  setProvisioningError('');
  // ... start polling
}

// AFTER:
function startProvisioning() {
  setProvisioningStatus('waiting');
  setProvisioningError('');

  // Debug: Check if token exists
  const token = localStorage.getItem('authToken');
  if (!token) {
    console.error('[SignupSetup] No auth token found in localStorage.');
    setProvisioningError('Authentication required. Please refresh and complete setup from beginning.');
    setProvisioningStatus('failed');
    return;
  }

  console.log('[SignupSetup] Starting provisioning for device:', deviceSerial);
  // ... start polling
}
```

---

## 🚨 Common Mistakes

### Mistake 1: Skipping OTP Verification
**Symptom**: Reach Step 5 but no token
**Solution**: Always complete Step 4 OTP verification

### Mistake 2: Refreshing Page During Signup
**Symptom**: Lose progress, token missing
**Solution**: Don't refresh during signup flow (or implement session persistence)

### Mistake 3: Direct URL Navigation
**Symptom**: Navigate to `/auth/signup?step=5` directly
**Solution**: Always start from Step 1 or save progress to backend

### Mistake 4: Multiple Browser Tabs
**Symptom**: Token saved in one tab, not visible in another
**Solution**: Complete signup in single tab

---

## 📊 Debug Checklist

When you see authentication error:

- [ ] Open DevTools Console (F12)
- [ ] Check for token: `localStorage.getItem('authToken')`
- [ ] Look for "Authentication token stored" message in console
- [ ] Verify you completed Step 4 OTP verification
- [ ] Check if you see "Device bound successfully" in console
- [ ] Verify backend is accessible: `curl https://smartanom.onrender.com/healthz`
- [ ] Check Network tab for 401 errors on `/api/devices/` call
- [ ] If token exists but still failing, check backend logs for token validation errors

---

## 🔄 Full Signup Flow (Reference)

```
Step 1: Device Verification
  ↓ (verifyDevice → sets verified=true)

Step 2: Reservoir Setup
  ↓ (collects reservoir data)

Step 3: Email Binding
  ↓ (requestDeviceOTP → sends email)

Step 4: OTP Verification ← **AUTH TOKEN SAVED HERE**
  ↓ (verifyDeviceOTP → localStorage.setItem('authToken', token))
  ↓ (also sets boundDeviceSerial)

Step 5: WiFi Provisioning ← **NEEDS TOKEN**
  ↓ (uses token to poll /api/devices/)
  ↓ (waits for wifi_configured=true)

Step 6: Profile Setup
  ↓ (finalizeAccount → uses token)

Dashboard
```

---

## 💡 Future Improvements

1. **Session Persistence**: Save progress to backend, not just localStorage
2. **Token Refresh**: Implement token refresh mechanism
3. **Better Error Messages**: Show which step to return to
4. **Progress Save**: Allow users to resume signup later
5. **Token Expiry Handling**: Detect and handle expired tokens gracefully

---

## 📞 If Issues Persist

If you still get authentication errors after:
1. Clearing browser storage
2. Starting fresh signup
3. Completing all steps in order
4. Verifying token is saved

**Then check backend:**
1. Django admin: Check if user was created
2. Backend logs: Look for token validation errors
3. Database: Verify token exists and matches
4. Verify `AUTH_TOKEN_EXPIRY` setting (if configured)

---

**Fix Date**: 2025-10-18
**Issue**: Authentication error during WiFi provisioning
**Root Cause**: Missing/invalid token in localStorage
**Resolution**: Added validation, early checks, better error messages
**Status**: Ready for testing ✅

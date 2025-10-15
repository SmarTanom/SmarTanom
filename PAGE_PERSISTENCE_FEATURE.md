# Page Persistence Feature

## Overview
The page persistence feature automatically saves the user's current page and restores it when they refresh the browser. This provides a seamless user experience by ensuring users don't lose their place when refreshing or accidentally closing the tab.

## How It Works

### 1. **Automatic Page Tracking**
- Every time a user navigates to a protected route (Dashboard, Alerts, Profile, Device Details, etc.), the current URL is automatically saved to `localStorage`
- Auth/public routes (login, signup, splash) are **excluded** from persistence to avoid redirect loops

### 2. **Persistence on Refresh**
- When the user refreshes the page, the `usePagePersistence` hook reads the last saved URL
- If the user is authenticated, they are automatically redirected to their last visited page
- If not authenticated, they go through the normal login flow

### 3. **Restoration After Login**
- After successful login (via EmailPage or CodePage), the system checks for a saved page
- If found, the user is redirected to that page instead of the default dashboard
- Admin users always go to `/admin` regardless of saved pages

### 4. **Cleanup on Logout**
- When the user logs out, the persisted page is automatically cleared
- This ensures a fresh start on the next login

## Implementation Details

### Files Modified/Created

#### **New Hook: `usePagePersistence.js`**
Location: `frontend/src/hooks/usePagePersistence.js`

**Functions:**
- `usePagePersistence()` - Tracks current location and saves to localStorage
- `useRestoreLastPage()` - Restores last page on app mount (not currently used, kept for future)
- `clearPersistedPage()` - Clears saved page from localStorage

**Excluded Paths (NOT persisted):**
- `/` (Landing page)
- `/splash`
- `/signin/email`
- `/signup/email`
- `/signin/code`
- `/signup/code`
- `/signup/setup`
- `/signup/username`

**Persisted Routes (automatically saved):**
- `/dashboard`
- `/alerts`
- `/profile`
- `/notifications`
- `/privacy-security`
- `/device/:deviceId`
- `/add-device`
- `/add-device/setup`
- `/start-cycle`
- All admin routes (`/admin/*`)

#### **Updated: `App.jsx`**
- Added import for `usePagePersistence` hook
- Added `PagePersistenceManager` component that runs the persistence logic
- Component is placed inside AuthProvider to ensure authentication context is available

#### **Updated: `AuthContext.jsx`**
- Imported `clearPersistedPage` utility
- Updated `logout()` function to clear persisted page when user logs out
- Ensures clean state on logout

#### **Updated: `EmailPage.jsx`**
- After successful OTP verification, checks for `lastVisitedPage` in localStorage
- Regular users are redirected to their last page (if available)
- Admin users always go to `/admin` dashboard
- Falls back to `/dashboard` if no saved page exists

#### **Updated: `CodePage.jsx`**
- Similar logic as EmailPage: checks for saved page after login
- Redirects to last visited page or defaults to `/dashboard`

## Usage Examples

### Example 1: User on Device Details Page
1. User navigates to `/device/123` (viewing a specific device)
2. System saves `/device/123` to localStorage
3. User accidentally closes the tab
4. User reopens the app → sees login screen
5. User logs in → automatically redirected to `/device/123`

### Example 2: User on Alerts Page
1. User is viewing `/alerts`
2. System saves `/alerts` to localStorage
3. User refreshes the browser (Ctrl+R or F5)
4. Page reloads → user stays on `/alerts` (no need to re-login if token is valid)

### Example 3: User Logs Out
1. User is on `/profile`
2. System has saved `/profile` to localStorage
3. User clicks logout
4. System clears the persisted page
5. Next login → user goes to default `/dashboard` (fresh start)

### Example 4: Admin User
1. Admin user is on `/admin/devices`
2. System saves `/admin/devices`
3. Admin logs out and logs back in
4. System detects admin role → redirects to `/admin` (not the saved page)
5. This ensures admins always land on their main dashboard

## localStorage Keys

The feature uses the following localStorage keys:

| Key | Description | Example Value |
|-----|-------------|---------------|
| `lastVisitedPage` | Full path of last visited protected route | `/device/123` or `/alerts?filter=critical` |

## Technical Notes

### Why Not Use React Router's `state`?
React Router's navigation state is lost on refresh. We need persistence across browser sessions, so localStorage is the appropriate solution.

### Why Exclude Auth Routes?
If we persisted auth routes (like `/signin/email`), users would get stuck in redirect loops. We only persist protected routes that require authentication.

### Why Clear on Logout?
Clearing on logout provides a better UX:
- User gets a fresh start on next login
- Avoids confusion if multiple users share a device
- Prevents accidental navigation to sensitive pages

### Thread Safety
The implementation uses try/catch blocks around all localStorage operations to handle:
- Browser privacy modes that block localStorage
- Storage quota exceeded errors
- Concurrent tab issues

## Testing Checklist

✅ **Basic Persistence**
- [ ] Navigate to Dashboard → refresh → should stay on Dashboard
- [ ] Navigate to Alerts → refresh → should stay on Alerts
- [ ] Navigate to Device Details → refresh → should stay on that device

✅ **Login Flow**
- [ ] Logout → login → should go to default dashboard (no saved page)
- [ ] On Device page → logout → login → should go to dashboard (cleared)
- [ ] On Alerts page → open new tab → login → should restore Alerts page

✅ **Admin Flow**
- [ ] Admin on `/admin/devices` → logout → login → should go to `/admin`
- [ ] Admin users should NOT restore last page (always go to admin dashboard)

✅ **Edge Cases**
- [ ] Login on fresh browser (no saved page) → should go to dashboard
- [ ] Auth routes should not be persisted
- [ ] Refresh on login page → should stay on login page (not redirect)

## Future Enhancements

### Potential Improvements
1. **Per-User Persistence**: Save last page per user (multi-user device scenarios)
2. **Scroll Position**: Save and restore scroll position within pages
3. **Tab State**: Persist active tab on multi-tab pages (Device Details tabs)
4. **Query Params**: Ensure query parameters are preserved (filters, search, etc.)
5. **Session Storage**: Use sessionStorage for single-session persistence (tab-specific)

### Known Limitations
- Does not persist application state (form inputs, filters, sort orders)
- Does not work in private/incognito mode if localStorage is blocked
- Multiple tabs may have race conditions (last write wins)

## Troubleshooting

### Problem: Page Not Restoring After Refresh
**Possible Causes:**
1. Browser is in private/incognito mode with localStorage disabled
2. User is on an excluded route (auth pages)
3. Auth token is invalid/expired (forces redirect to login)

**Solution:** Check browser console for persistence logs: `[PagePersistence] Saved current page: /dashboard`

### Problem: Redirect Loop
**Possible Causes:**
1. An auth route was accidentally marked as persistable
2. localStorage contains an invalid path

**Solution:**
```javascript
// Clear persisted page manually in browser console
localStorage.removeItem('lastVisitedPage');
```

### Problem: Admin Users Not Going to Admin Dashboard
**Possible Causes:**
1. Role detection logic not working
2. Saved page overriding admin redirect

**Solution:** Check EmailPage.jsx and CodePage.jsx for proper admin role detection

## Console Logging

The feature includes debug logging to help trace persistence behavior:

```javascript
[PagePersistence] Saved current page: /device/123
[PagePersistence] Cleared persisted page
[EmailPage] Redirecting to last visited page: /alerts
[CodePage] Redirecting to last visited page: /profile
```

Look for these logs in the browser console to verify the feature is working correctly.

## Conclusion

The page persistence feature significantly improves user experience by maintaining navigation state across refreshes and logins. It's implemented with minimal code changes and follows React best practices for localStorage management and authentication flows.

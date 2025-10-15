# 🧪 Quick Testing Guide - Page Persistence Feature

## ✅ 5-Minute Test Scenarios

### Test #1: Dashboard Refresh (30 seconds)
**Steps:**
1. Open the app and login
2. You should land on the **Dashboard** page
3. Press **F5** (or Ctrl+R) to refresh
4. ✅ **PASS** if: You're still on the Dashboard
5. ❌ **FAIL** if: You're redirected elsewhere

---

### Test #2: Deep Link Persistence (1 minute)
**Steps:**
1. From Dashboard, click on any **device card** to view device details
2. You should now be on `/device/[some-id]` page
3. Press **F5** (or Ctrl+R) to refresh
4. ✅ **PASS** if: You're still viewing the same device
5. ❌ **FAIL** if: You're back on Dashboard or another page

---

### Test #3: Alerts Page Persistence (1 minute)
**Steps:**
1. Navigate to the **Alerts** page (bell icon in bottom nav)
2. Verify you see the alerts list
3. Press **F5** to refresh
4. ✅ **PASS** if: You're still on the Alerts page
5. ❌ **FAIL** if: You're redirected to Dashboard

---

### Test #4: Login Restoration (1.5 minutes)
**Steps:**
1. Navigate to your **Profile** page (profile icon in bottom nav)
2. **Close the entire browser tab/window** (not just refresh)
3. Open a **new browser tab**
4. Go to the app URL
5. You should see the **login page**
6. Login with your credentials
7. ✅ **PASS** if: After login, you're redirected to **Profile** page
8. ❌ **FAIL** if: You land on Dashboard instead

---

### Test #5: Logout Cleanup (1 minute)
**Steps:**
1. Navigate to the **Alerts** page
2. Go to **Profile** → click **Logout**
3. You should be back on the **login page**
4. Login again with your credentials
5. ✅ **PASS** if: You land on the **Dashboard** (not Alerts)
6. ❌ **FAIL** if: You're redirected back to Alerts page

---

## 🔍 Browser Console Debugging

### How to Check if It's Working

1. **Open Browser DevTools:**
   - Press **F12** or **Ctrl+Shift+I** (Windows)
   - Or right-click → **Inspect**

2. **Go to Console Tab**

3. **Navigate between pages and look for these logs:**

```
✅ Good logs (feature is working):
[PagePersistence] Saved current page: /dashboard
[PagePersistence] Saved current page: /alerts
[PagePersistence] Saved current page: /device/123
```

```
⚠️ Warning logs (check if something is wrong):
[PagePersistence] No auth token, skipping restore
[PagePersistence] No last page to restore
```

```
❌ Error logs (feature is not working):
[PagePersistence] Failed to save page: [error details]
[PagePersistence] Failed to restore page: [error details]
```

### Check localStorage Manually

In the **Console** tab, type:

```javascript
// Check current saved page
localStorage.getItem('lastVisitedPage')
```

**Expected output:**
- If on Dashboard: `"/dashboard"`
- If on Alerts: `"/alerts"`
- If on Device 123: `"/device/123"`
- If just logged out: `null`

### Clear Saved Page (if needed)

```javascript
// Clear the saved page
localStorage.removeItem('lastVisitedPage');
```

---

## 📱 Mobile Testing (Optional)

### Test on Mobile Browser
1. Open the app on your **phone browser** (Chrome, Safari, etc.)
2. Login and navigate to **Alerts**
3. **Kill the browser app** (swipe it away from recent apps)
4. Open the browser again
5. Go back to the app
6. ✅ **PASS** if: You're still on Alerts (or prompted to login first, then redirected)

---

## 🐛 Common Issues & Solutions

### Issue: "Not staying on the page after refresh"

**Possible Causes:**
1. Browser's private/incognito mode (localStorage disabled)
2. You're on an auth page (login/signup) - these are excluded
3. Auth token expired (forces re-login)

**Solution:**
- Use normal browser mode (not incognito)
- Make sure you're on a protected route (Dashboard, Alerts, Profile, etc.)
- Check console for persistence logs

---

### Issue: "Getting redirected to Dashboard after logout"

**Expected Behavior:** This is correct! After logout, the saved page is cleared, so next login always goes to Dashboard.

**Not a Bug:** This is a security feature to prevent users from accidentally landing on sensitive pages.

---

### Issue: "Admin users not going to admin dashboard"

**Check:**
1. Make sure the user actually has admin role
2. Check console for `[EmailPage] Redirecting to last visited page: ...`
3. Admin users should always go to `/admin` regardless of saved page

**Solution:** Verify user role in Profile → should show "Admin" badge

---

## ✅ Test Results Checklist

Use this to track your testing:

- [ ] **Test #1:** Dashboard refresh works
- [ ] **Test #2:** Device details page persists
- [ ] **Test #3:** Alerts page persists
- [ ] **Test #4:** Login restores last page
- [ ] **Test #5:** Logout clears saved page
- [ ] **Console logs:** Persistence logs appear correctly
- [ ] **localStorage:** `lastVisitedPage` updates correctly
- [ ] **Mobile:** Works on phone browser (optional)

---

## 🎉 All Tests Passed?

If all tests pass, the feature is working correctly!

**Next Steps:**
1. Deploy to production
2. Monitor user feedback
3. Check error logs for any localStorage issues

---

## 📞 Need Help?

**Common Commands:**

```javascript
// Check what page is saved
localStorage.getItem('lastVisitedPage')

// Clear saved page
localStorage.removeItem('lastVisitedPage')

// Check auth token (should exist if logged in)
localStorage.getItem('authToken')

// See all localStorage keys
Object.keys(localStorage)
```

**Still having issues?**
- Check `PAGE_PERSISTENCE_FEATURE.md` for detailed troubleshooting
- Review browser console for error messages
- Verify you're using a modern browser (Chrome 90+, Firefox 88+, Safari 14+)

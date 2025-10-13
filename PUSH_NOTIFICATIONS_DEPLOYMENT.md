# Push Notifications Deployment Checklist

Use this checklist to deploy push notifications to your development, staging, or production environment.

## Pre-Deployment

### 1. Backend Prerequisites
- [ ] Python 3.10+ installed
- [ ] Virtual environment activated
- [ ] All existing migrations applied
- [ ] Django admin accessible

### 2. Frontend Prerequisites
- [ ] Node.js 16+ installed
- [ ] Dependencies installed (`npm install`)
- [ ] Vite config supports PWA
- [ ] HTTPS available (production only)

## Step-by-Step Deployment

### Phase 1: Backend Setup (15 minutes)

#### Step 1.1: Install Dependencies
```powershell
cd backend
.\.venv\Scripts\Activate.ps1
pip install pywebpush==1.14.1
```
- [ ] pywebpush installed successfully
- [ ] No dependency conflicts

#### Step 1.2: Generate VAPID Keys
```powershell
python manage.py generate_vapid_keys
```
- [ ] Command ran successfully
- [ ] Public key generated (starts with 'B')
- [ ] Private key generated (base64 string)
- [ ] Keys copied to safe location

**Important**: Save these keys! You'll need them in every environment.

#### Step 1.3: Configure Environment
Create/update `.env` file or set environment variables:

```bash
VAPID_PUBLIC_KEY=your-generated-public-key-here
VAPID_PRIVATE_KEY=your-generated-private-key-here
VAPID_ADMIN_EMAIL=mailto:admin@smartanom.com
```

- [ ] Environment variables set
- [ ] Keys match those generated in Step 1.2
- [ ] Email is in `mailto:` format

#### Step 1.4: Run Migrations
```powershell
python manage.py migrate notifications
```
- [ ] Migration `notifications.0001_initial` applied
- [ ] No migration errors
- [ ] Tables created: `notifications_pushsubscription`, `notifications_notificationlog`

#### Step 1.5: Verify Settings
```powershell
python manage.py shell
```
```python
from django.conf import settings
print("Public key:", settings.VAPID_PUBLIC_KEY[:20], "...")
print("Private key:", settings.VAPID_PRIVATE_KEY[:20], "...")
print("Admin email:", settings.VAPID_ADMIN_EMAIL)
print("Notifications app:", 'apps.notifications' in settings.INSTALLED_APPS)
```
- [ ] All values print correctly
- [ ] No "empty string" errors
- [ ] Notifications app in INSTALLED_APPS

#### Step 1.6: Start Backend
```powershell
python manage.py runserver
```
- [ ] Server starts without errors
- [ ] No import errors
- [ ] `/api/notifications/subscriptions/vapid_public_key/` accessible

### Phase 2: Frontend Setup (10 minutes)

#### Step 2.1: Verify Files
Check these files exist:
- [ ] `frontend/src/sw.js` (service worker)
- [ ] `frontend/src/services/api/notifications.js` (API service)
- [ ] `frontend/src/components/notifications/NotificationPermission.jsx` (component)
- [ ] `frontend/src/components/notifications/NotificationPermission.css` (styles)

#### Step 2.2: Verify Imports
Check `frontend/src/pages/ProfilePage.jsx`:
- [ ] `NotificationPermission` imported
- [ ] Component added in render
- [ ] No syntax errors

#### Step 2.3: Verify Vite Config
Check `frontend/vite.config.js`:
- [ ] `strategies: 'injectManifest'` set
- [ ] `srcDir: 'src'` set
- [ ] `filename: 'sw.js'` set

#### Step 2.4: Install Dependencies (if needed)
```powershell
cd frontend
npm install
```
- [ ] All dependencies installed
- [ ] No version conflicts
- [ ] vite-plugin-pwa present

#### Step 2.5: Build Check (optional)
```powershell
npm run build
```
- [ ] Build succeeds
- [ ] Service worker compiled
- [ ] No TypeScript/ESLint errors

#### Step 2.6: Start Frontend
```powershell
npm run dev
```
- [ ] Dev server starts
- [ ] No console errors
- [ ] Service worker registers (check DevTools)

### Phase 3: Integration Testing (15 minutes)

#### Step 3.1: Basic Connectivity
Open browser to your frontend URL:
- [ ] App loads without errors
- [ ] Can log in successfully
- [ ] Profile page loads

#### Step 3.2: Service Worker Check
Open DevTools (F12) → Application → Service Workers:
- [ ] Service worker listed and activated
- [ ] No error messages
- [ ] Push subscription supported

#### Step 3.3: Enable Notifications
1. Navigate to Profile page
2. Scroll to "Push Notifications" section
3. Click "Enable Notifications"

- [ ] Button shows loading state
- [ ] Browser permission prompt appears
- [ ] After clicking "Allow", status updates to "Active"
- [ ] No error messages displayed

#### Step 3.4: Send Test Notification
Click "Send Test" button:
- [ ] Button shows loading state
- [ ] Success message appears
- [ ] Notification received on device
- [ ] Notification shows correct title/body
- [ ] Clicking notification opens app

#### Step 3.5: Backend Verification
Check Django admin:
1. Go to `/admin/notifications/pushsubscription/`
- [ ] Your subscription is listed
- [ ] Endpoint looks correct (starts with https://)
- [ ] User is correct
- [ ] Created date is recent

2. Go to `/admin/notifications/notificationlog/`
- [ ] Test notification logged
- [ ] Success is True
- [ ] No error message
- [ ] Timestamp is correct

#### Step 3.6: Background Notifications
1. Keep subscription active
2. Close browser completely
3. Send notification from admin or API
- [ ] Notification still received
- [ ] Notification displays correctly
- [ ] Clicking opens app

### Phase 4: Cross-Browser Testing (20 minutes)

Test in each browser you support:

#### Chrome/Chromium
- [ ] Subscription works
- [ ] Test notification received
- [ ] Background notification works
- [ ] Click handler works
- [ ] Icon/badge displays

#### Firefox
- [ ] Subscription works
- [ ] Test notification received
- [ ] Background notification works
- [ ] Click handler works
- [ ] Icon/badge displays

#### Edge
- [ ] Subscription works
- [ ] Test notification received
- [ ] Background notification works
- [ ] Click handler works
- [ ] Icon/badge displays

#### Safari (if supporting)
- [ ] Add to home screen first
- [ ] Subscription works
- [ ] Test notification received
- [ ] Background notification (limited)
- [ ] Click handler works

### Phase 5: Device Testing (15 minutes)

#### Desktop
- [ ] Windows Chrome
- [ ] Windows Firefox
- [ ] Windows Edge
- [ ] macOS Safari
- [ ] macOS Chrome
- [ ] Linux (if applicable)

#### Mobile
- [ ] Android Chrome
- [ ] Android Firefox
- [ ] iOS Safari 16.4+ (limited)

#### Tablets
- [ ] iPad Safari
- [ ] Android tablets

### Phase 6: Error Scenarios (10 minutes)

#### Test Error Handling
1. Permission denied:
   - [ ] Block permission
   - [ ] Error message displays
   - [ ] Help text shown
   - [ ] Can recover by allowing in settings

2. Network offline:
   - [ ] Subscription fails gracefully
   - [ ] Error message clear
   - [ ] Can retry when online

3. Invalid VAPID keys:
   - [ ] Server returns clear error
   - [ ] Frontend shows error message
   - [ ] Logs helpful debug info

4. Expired subscription:
   - [ ] Backend handles 410 Gone
   - [ ] Subscription removed from DB
   - [ ] User can resubscribe

### Phase 7: Performance Check (5 minutes)

#### Frontend Performance
Open DevTools → Performance:
- [ ] Service worker load < 500ms
- [ ] Component render < 100ms
- [ ] Subscription creation < 1s
- [ ] No memory leaks

#### Backend Performance
Check server logs:
- [ ] Notification send < 500ms
- [ ] Database queries optimized
- [ ] No N+1 queries
- [ ] Batch operations efficient

#### Network Performance
Check DevTools → Network:
- [ ] Service worker cached
- [ ] API calls minimal
- [ ] No redundant requests
- [ ] Proper caching headers

### Phase 8: Security Audit (10 minutes)

#### HTTPS/SSL
- [ ] Production uses HTTPS
- [ ] SSL certificate valid
- [ ] No mixed content warnings
- [ ] Secure WebSocket (if used)

#### VAPID Keys
- [ ] Private key not in code
- [ ] Private key in env variables only
- [ ] Public key served via API only
- [ ] Keys not in version control

#### Permissions
- [ ] User subscriptions scoped correctly
- [ ] Admin-only access to logs
- [ ] No unauthorized access possible
- [ ] Rate limiting on endpoints (if needed)

#### Data Privacy
- [ ] No PII in notification logs
- [ ] Subscriptions deletable by user
- [ ] Clear privacy explanation
- [ ] GDPR compliant (if applicable)

## Production Deployment

### Additional Production Steps

#### 1. Environment Configuration
- [ ] Production VAPID keys generated (different from dev!)
- [ ] Environment variables set in production
- [ ] Admin email updated to production email
- [ ] DEBUG = False in Django settings

#### 2. Static Files
- [ ] Frontend built for production (`npm run build`)
- [ ] Service worker included in build
- [ ] Static files collected (if needed)
- [ ] CDN configured (if using)

#### 3. Database
- [ ] Production database backed up before migration
- [ ] Migrations run on production DB
- [ ] Migration verified successful
- [ ] Database indexes created

#### 4. Monitoring
- [ ] Logging configured for notification service
- [ ] Error tracking set up (Sentry, etc.)
- [ ] Performance monitoring enabled
- [ ] Delivery rate tracking (optional)

#### 5. Load Testing
- [ ] Test with multiple concurrent subscriptions
- [ ] Test bulk notification sending
- [ ] Monitor server resources
- [ ] Check for bottlenecks

#### 6. Rollback Plan
- [ ] Database backup verified
- [ ] Rollback procedure documented
- [ ] Previous version tagged in git
- [ ] Rollback tested in staging

## Post-Deployment Verification

### Smoke Tests (5 minutes)
- [ ] Visit production URL
- [ ] Log in as test user
- [ ] Enable notifications
- [ ] Send test notification
- [ ] Verify received on device
- [ ] Check admin panel

### Monitoring (first 24 hours)
- [ ] Check error logs hourly
- [ ] Monitor subscription rate
- [ ] Monitor notification delivery rate
- [ ] Check user feedback/reports
- [ ] Monitor server performance

### User Communication
- [ ] Announce new feature
- [ ] Provide setup instructions
- [ ] Explain benefits
- [ ] Share troubleshooting tips
- [ ] Gather feedback

## Troubleshooting Common Issues

### Issue: Service Worker Not Registering
**Check:**
- [ ] HTTPS enabled (or using localhost)
- [ ] Service worker file path correct
- [ ] No syntax errors in sw.js
- [ ] Browser DevTools shows registration

**Fix:**
```javascript
// In browser console
navigator.serviceWorker.getRegistrations().then(regs => {
  regs.forEach(reg => reg.unregister());
  location.reload();
});
```

### Issue: Push Subscription Fails
**Check:**
- [ ] VAPID public key accessible via API
- [ ] Browser supports push notifications
- [ ] User granted permission
- [ ] No network errors

**Fix:**
1. Check DevTools Console for errors
2. Verify API endpoint returns public key
3. Try unsubscribing and resubscribing
4. Clear browser cache and reload

### Issue: Notifications Not Received
**Check:**
- [ ] Backend VAPID keys set correctly
- [ ] pywebpush installed
- [ ] Subscription stored in database
- [ ] Check notification logs for errors
- [ ] OS notification settings allow

**Fix:**
1. Check Django logs for send errors
2. Verify subscription endpoint valid
3. Check browser notification permissions
4. Test with simple notification first

### Issue: Background Notifications Fail
**Check:**
- [ ] Service worker active
- [ ] Push event handler implemented
- [ ] No JavaScript errors in service worker
- [ ] Browser notifications not blocked by OS

**Fix:**
1. Check service worker logs in DevTools
2. Verify push event handler code
3. Test with browser completely closed
4. Check OS notification settings

## Success Metrics

After deployment, you should see:
- [ ] > 0 subscriptions in database
- [ ] > 0 successful test notifications
- [ ] 0 critical errors in logs
- [ ] < 1% notification delivery failures
- [ ] Users reporting successful notifications

## Rollback Procedure

If something goes wrong:

### 1. Immediate Rollback
```powershell
# Backend
cd backend
git checkout previous-commit
python manage.py runserver

# Frontend
cd frontend
git checkout previous-commit
npm run dev
```

### 2. Database Rollback
```powershell
# Only if migrations cause issues
python manage.py migrate notifications zero
```

### 3. Environment Cleanup
```powershell
# Remove environment variables
$env:VAPID_PUBLIC_KEY = ""
$env:VAPID_PRIVATE_KEY = ""
```

### 4. User Communication
- [ ] Announce temporary unavailability
- [ ] Explain issue briefly
- [ ] Provide ETA for fix
- [ ] Follow up when resolved

## Documentation References

- **Quick Start**: `PUSH_NOTIFICATIONS_QUICKSTART.md`
- **Backend Guide**: `PUSH_NOTIFICATIONS_GUIDE.md`
- **Frontend Guide**: `PUSH_NOTIFICATIONS_FRONTEND.md`
- **Summary**: `PUSH_NOTIFICATIONS_SUMMARY.md`

## Support Contacts

Document who to contact for issues:
- Backend issues: _____________
- Frontend issues: _____________
- Infrastructure: _____________
- Emergency: _____________

## Sign-Off

Deployment completed by: _____________
Date: _____________
Environment: [ ] Development [ ] Staging [ ] Production
All tests passed: [ ] Yes [ ] No
Issues noted: _____________

---

**Deployment Status: [ ] COMPLETE [ ] IN PROGRESS [ ] ROLLED BACK**

Save this checklist for each environment deployment!

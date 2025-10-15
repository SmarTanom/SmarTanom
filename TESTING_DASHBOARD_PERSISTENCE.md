# Testing the Dashboard Data Persistence Fix

## Test Environment
- Frontend running on: http://localhost:5174/
- Backend should be running on: http://localhost:8000/

## Pre-Test Setup
1. Ensure backend is running: `cd backend && python manage.py runserver`
2. Ensure frontend is running: `cd frontend && npm run dev`
3. Open browser console (F12) to view debug logs

## Test Cases

### Test 1: Initial Device Selection ✅
**Steps:**
1. Log in to the application
2. Navigate to Dashboard
3. Select a specific device from the carousel
4. Verify the following cards show data:
   - **Nutrient Level card**: Should show status (Optimal/Low/High)
   - **pH Levels over time card**: Should show pH history chart
   - **Current pH card**: Should show current pH value and status

**Expected Results:**
- All three cards show actual sensor data
- Console shows: `✅ Restored device by ID: [deviceId]` or similar
- Console shows: `✅ Using existing sensor data for: [device name]`

---

### Test 2: Page Refresh 🔄
**Steps:**
1. After Test 1, note which device is selected
2. Press F5 or Ctrl+R to refresh the page
3. Wait for page to fully load

**Expected Results:**
- Same device should be selected (carousel position maintained)
- All three cards should show the same data as before refresh
- Console should show:
  ```
  ✅ Store hydration complete
  📦 Devices in store: [count]
  📦 Device data keys: [device IDs]
  ✅ Restored device by ID: [deviceId]
  🔍 Checking existing data for device [deviceId]
  ✅ Using existing sensor data for: [device name]
  ```

---

### Test 3: Navigation Away and Back 🔄
**Steps:**
1. After Test 1, navigate to another page (e.g., Alerts page)
2. Navigate back to Dashboard

**Expected Results:**
- Same device should be selected
- All cards should show the same data
- No unnecessary API calls (check Network tab)

---

### Test 4: Device Switching 🔄
**Steps:**
1. Select Device A from carousel
2. Wait for data to load (verify all cards show data)
3. Switch to Device B
4. Verify Device B's data loads
5. Refresh the page

**Expected Results:**
- Device B should be selected after refresh
- Device B's data should display in all cards
- Console should show Device B was restored

---

### Test 5: Hard Refresh (Ctrl+Shift+R) 🔄
**Steps:**
1. Select a specific device
2. Press Ctrl+Shift+R (hard refresh, clears cache)
3. Wait for page to load

**Expected Results:**
- Device selection might reset OR be restored (depending on localStorage persistence)
- Data should load for the selected/default device
- Console should show fetching sequence

---

### Test 6: Multiple Devices Data 🔄
**Steps:**
1. Click on Device A, wait for data load
2. Click on Device B, wait for data load
3. Click back on Device A
4. Refresh page

**Expected Results:**
- Device A data should display immediately (from cache)
- No duplicate API calls for Device A
- Console should show: `✅ Using existing sensor data`

---

## Console Log Indicators

### ✅ Success Indicators
- `✅ Store hydration complete`
- `✅ Restored device by ID: [id]`
- `✅ Using existing sensor data for: [name]`

### 🔄 Loading Indicators
- `🔄 Starting device restoration...`
- `🔄 No valid sensor data found, fetching fresh data`
- `🔄 Fetching data for restored device: [name]`

### 🔍 Debug Indicators
- `🔍 Current device: [name]`
- `🔍 Device data available: true/false`
- `🔍 Checking existing data for device [id]`

### ⚠️ Warning Indicators
- `⚠️ No valid saved device found, defaulting to first device`

### ❌ Error Indicators
- Any errors in console should be investigated

---

## Common Issues and Solutions

### Issue: Cards show "No plant configured" or empty states after refresh
**Cause:** Store hydration incomplete or data validation failed

**Check:**
1. Console should show: `✅ Store hydration complete`
2. Console should show: `📦 Device data keys:` with device IDs
3. Check if `🔍 Checking existing data` shows `hasValidSensorData: false`

**Solution:**
- If hydration is taking too long, increase timeout in code (currently 100ms)
- Check browser localStorage: Look for `realtime-store` key
- Clear localStorage and try again: `localStorage.clear()`

---

### Issue: Data doesn't persist across refreshes
**Cause:** localStorage might be disabled or quota exceeded

**Check:**
1. Open DevTools > Application > Local Storage
2. Look for `realtime-store` key
3. Check if data is being written

**Solution:**
- Ensure browser allows localStorage
- Check browser storage quota
- Try in incognito mode to rule out extensions

---

### Issue: Wrong device data shown after switching
**Cause:** Stale data or incorrect device ID mapping

**Check:**
1. Console: `🔍 Current device: [name]`
2. Console: `🔍 Device data sensors:` should match the device

**Solution:**
- Clear localStorage: `localStorage.clear()`
- Hard refresh the page

---

### Issue: Duplicate API calls
**Cause:** Multiple effects triggering fetches

**Check:**
1. Network tab: Look for duplicate calls to `/api/devices/.../sensors/`
2. Console: Multiple `🔄 Fetching data` messages for same device

**Solution:**
- Code should prevent this with `lastFetchedDeviceRef`
- If still happening, report as bug

---

## Performance Check

### Good Performance
- Initial load: ~1-2 seconds
- Device switch: <500ms (if data cached)
- Page refresh: <1 second to show data

### Poor Performance
- Initial load: >3 seconds
- Device switch: >2 seconds
- Multiple API calls for same device

---

## Browser Compatibility

Test in:
- ✅ Chrome/Edge (Chromium)
- ✅ Firefox
- ✅ Safari (macOS/iOS)
- ⚠️ Mobile browsers

---

## Final Verification

After all tests, verify:
1. ✅ No console errors
2. ✅ Data persists across refresh
3. ✅ Device selection persists
4. ✅ No duplicate API calls
5. ✅ Cards show correct data for selected device
6. ✅ Smooth switching between devices

---

## Reporting Issues

If you encounter issues, provide:
1. Browser and version
2. Console logs (copy entire log)
3. Steps to reproduce
4. Screenshot of the issue
5. Network tab showing API calls
6. localStorage content (DevTools > Application > Local Storage > `realtime-store`)

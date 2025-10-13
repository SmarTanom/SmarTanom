# 🚀 QUICK START - Push Notifications Setup

## ⚡ IMMEDIATE FIX - Follow These Steps:

### Step 1: Start Production Preview (Service Worker Enabled)

**Open a NEW PowerShell terminal and run:**

```powershell
cd C:\Users\Rodillon\Desktop\SmarTanom\frontend
npm run preview
```

**Or double-click:** `start-preview.bat` in the SmarTanom folder

This will start on: **http://localhost:4173** (production mode with service worker!)

---

### Step 2: Open Production Build in Browser

1. **Close all localhost:5173 and localhost:5174 tabs**
2. **Open:** http://localhost:4173
3. **Hard refresh:** Press `Ctrl+Shift+R`

---

### Step 3: Enable Push Notifications

1. **Log in** to your account
2. **Go to Profile page**
3. **Scroll to "Push Notifications" section**
4. **Click "Enable Notifications"**
5. **Accept browser permission** when prompted

**You should see:**
- Permission Status: **Granted ✅**
- Subscription Status: **Active 🟢**

---

### Step 4: Test Push Notifications

**Click "Send Test" button** in the Push Notifications section.

You should receive a notification: "📱 SmarTanom Test Notification"

---

### Step 5: Test Automatic Sensor Alerts

**In a new PowerShell terminal:**

```powershell
cd C:\Users\Rodillon\Desktop\SmarTanom\backend
python test_automatic_alerts.py
```

**You should receive 4 push notifications:**
1. 🚨 Low pH Detected
2. 🚨 High pH Detected
3. 🚨 TDS Critically Low
4. 🚨 Water Level Empty

---

## 🔍 Why Production Preview?

**The problem:** Service workers don't work in Vite dev mode (causes white screen)

**The solution:** Production preview mode enables service workers properly

---

## 📋 Quick Command Reference

### Start Backend (Terminal 1):
```powershell
cd C:\Users\Rodillon\Desktop\SmarTanom\backend
.\.venv\Scripts\Activate.ps1
python manage.py runserver
```

### Start Production Preview (Terminal 2):
```powershell
cd C:\Users\Rodillon\Desktop\SmarTanom\frontend
npm run preview
```

### Test Automatic Alerts (Terminal 3):
```powershell
cd C:\Users\Rodillon\Desktop\SmarTanom\backend
python test_automatic_alerts.py
```

---

## ⚠️ IMPORTANT

- **Dev mode (localhost:5173/5174):** Service worker DISABLED = No push notifications
- **Production preview (localhost:4173):** Service worker ENABLED = Push notifications work!

**Always use production preview to test push notifications!**

---

## ✅ Success Checklist

- [ ] Backend running on http://127.0.0.1:8000
- [ ] Frontend running on **http://localhost:4173** (production preview)
- [ ] Logged in to your account
- [ ] Push notifications enabled (Permission: Granted, Status: Active)
- [ ] Test notification received
- [ ] Automatic alerts working

---

## 🆘 If Still Not Working

1. **Check service worker status:**
   - Press F12 (DevTools)
   - Go to "Application" tab
   - Click "Service Workers"
   - Should see: ✅ "activated and is running"

2. **Check browser console for errors:**
   - Press F12 → Console tab
   - Look for red error messages

3. **Check Django logs:**
   - Look at terminal running Django server
   - Should see: `[INFO] Alert detected...` and `[INFO] Push notification sent...`

4. **Verify VAPID keys loaded:**
   ```powershell
   cd backend
   python manage.py shell
   ```
   ```python
   from django.conf import settings
   print(settings.VAPID_PUBLIC_KEY[:20])
   # Should print: BCI2Xv7XAWw1VIyNY00y (not empty!)
   ```

---

## 📞 Next Steps

After successful testing:
1. Automatic alerts will work whenever sensor data breaches thresholds
2. Notifications work even when browser is closed
3. Check NotificationLog in Django admin to see history

**Your push notification system is ready! 🎉**

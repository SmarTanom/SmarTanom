# ESP32 WiFi Provisioning - Complete Flow Diagram

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                        ESP32 POWERS ON / REBOOTS                              ║
╚═════════════════════════════════╦════════════════════════════════════════════╝
                                  ▼
                    ┌─────────────────────────┐
                    │  setup() Function Runs  │
                    └────────────┬────────────┘
                                 ▼
                    ┌─────────────────────────┐
                    │   loadPreferences()     │
                    │   Read from NVS:        │
                    │   - savedSSID           │
                    │   - savedPassword       │
                    │   - wifiConfigured      │
                    └────────────┬────────────┘
                                 ▼
                ┌────────────────────────────────┐
                │  Are credentials saved?        │
                │  (wifiConfigured == true)      │
                └────────┬──────────────┬────────┘
                         │              │
                    YES  │              │  NO
                         ▼              ▼
        ┌────────────────────────┐   ┌─────────────────────┐
        │ connectToWiFi()        │   │ Start Provisioning  │
        │ Attempt connection     │   │ Mode                │
        │ with saved credentials │   └──────────┬──────────┘
        └────────┬────────┬──────┘              │
                 │        │                     ▼
           ✅ OK  │        │ ❌ FAIL     ┌────────────────┐
                 ▼        ▼              │   setupAP()    │
    ┌─────────────────┐ ┌──────────────┐│ Start WiFi AP: │
    │ Report Success  │ │ Clear Prefs  ││ "SMRT-XXX-XXX" │
    │ to Backend      │ │ Start AP     │└────────┬───────┘
    │ Normal Ops      │ │ Mode         │         │
    └─────────────────┘ └──────────────┘         ▼
                                        ┌─────────────────────┐
                                        │  setupWebServer()   │
                                        │  Routes:            │
                                        │  / → handleRoot     │
                                        │  /connect → POST    │
                                        │  /status → GET      │
                                        └──────────┬──────────┘
                                                   ▼
                                        ┌─────────────────────┐
                                        │  Wait for User      │
                                        │  Connect to ESP32   │
                                        │  WiFi: SMRT-XXX-XXX │
                                        │  Password: smart... │
                                        └──────────┬──────────┘
                                                   │
                                        ┌──────────▼──────────┐
                                        │  User Opens Portal  │
                                        │  http://192.168.4.1 │
                                        └──────────┬──────────┘
                                                   ▼
                                        ┌─────────────────────┐
                                        │  handleRoot()       │
                                        │  - scanNetworks()   │
                                        │  - Show WiFi list   │
                                        │  - Show form        │
                                        └──────────┬──────────┘
                                                   │
                                        ┌──────────▼──────────┐
                                        │  User Fills Form    │
                                        │  - Selects WiFi     │
                                        │  - Enters password  │
                                        │  - Clicks Connect   │
                                        └──────────┬──────────┘
                                                   ▼
                                        ┌─────────────────────┐
                                        │  POST /connect      │
                                        │  handleConnect()    │
                                        └──────────┬──────────┘
                                                   │
                                        ┌──────────▼──────────┐
                                        │  Show "Connecting"  │
                                        │  page with spinner  │
                                        │  Auto-redirect to   │
                                        │  /status in 15 sec  │
                                        └──────────┬──────────┘
                                                   │
                                        ┌──────────▼──────────┐
                                        │  connectToWiFi()    │
                                        │  Try for 30 seconds │
                                        └────────┬─────┬──────┘
                                                 │     │
                                           ✅ OK │     │ ❌ FAIL
                                                 │     │
                ┌────────────────────────────────┘     └────────────────────────────┐
                │                                                                   │
                ▼                                                                   ▼
┌───────────────────────────────┐                              ┌──────────────────────────────┐
│  SUCCESS FLOW                 │                              │  FAILURE FLOW (NEW!)         │
├───────────────────────────────┤                              ├──────────────────────────────┤
│ 1. savePreferences()          │                              │ 1. clearPreferences()        │
│    - Save SSID                │                              │    - Delete SSID             │
│    - Save password            │                              │    - Delete password         │
│    - Set wifi_ok = true       │                              │    - Set wifi_ok = false     │
│                               │                              │                              │
│ 2. wakeUpBackend()            │                              │ 2. wakeUpBackend()           │
│    - GET /healthz             │                              │    - GET /healthz            │
│                               │                              │                              │
│ 3. reportProvisionStatus()    │                              │ 3. reportProvisionStatus()   │
│    - POST /api/devices/       │                              │    - POST /api/devices/      │
│      provision/               │                              │      provision/              │
│    - status: "connected"      │                              │    - status: "failed"        │
│    - ip_address: 192.168.x.x  │                              │                              │
│                               │                              │ 4. provisioningMode = true   │
│ 4. provisioningMode = false   │                              │    wifiConfigured = false    │
│    wifiConfigured = true      │                              │                              │
│                               │                              │ 5. delay(2000)               │
│ 5. WiFi.softAPdisconnect()    │                              │                              │
│    - Shutdown AP mode         │                              │ 6. ESP.restart()             │
│                               │                              │    - ⚡ REBOOT DEVICE          │
└───────────────┬───────────────┘                              └──────────────┬───────────────┘
                │                                                             │
                ▼                                                             │
┌───────────────────────────────┐                                            │
│  GET /status                  │                              ┌─────────────▼──────────────┐
│  handleStatus()               │                              │  Device Reboots             │
├───────────────────────────────┤                              │  ↻ Back to setup()          │
│ Success Page:                 │                              │  No saved credentials       │
│ ✅ Successfully Connected!     │                              │  Start AP mode again        │
│ 📡 Network: HomeWiFi           │                              │  User can reconnect         │
│ 🌐 IP: 192.168.1.100           │                              │  and retry with correct pwd │
│ 📶 Signal: -45 dBm             │                              └────────────────────────────┘
│ 🔄 Redirecting in 3 seconds... │                                            │
│                               │                                            │
│ <script>                      │                              ┌─────────────▼──────────────┐
│ setTimeout(() => {            │                              │  User Sees Error Page      │
│   window.location.href =      │                              │  (Before restart)          │
│   'http://localhost:5173/     │                              ├────────────────────────────┤
│    dashboard';                │                              │ ❌ Connection Failed         │
│ }, 3000);                     │                              │ Incorrect password         │
│ </script>                     │                              │ 🔄 Restarting in 5 sec...   │
└───────────────┬───────────────┘                              │                            │
                │                                              │ <script>                   │
                ▼                                              │ setTimeout(() => {         │
┌───────────────────────────────┐                              │   alert('Reconnect to      │
│  AUTO-REDIRECT AFTER 3 SEC    │                              │    SMRT-XXX-XXX');         │
│  http://localhost:5173/       │                              │ }, 5000);                  │
│  dashboard                    │                              │ </script>                  │
└───────────────┬───────────────┘                              └────────────────────────────┘
                │
                ▼
┌───────────────────────────────┐
│  FRONTEND DASHBOARD           │
├───────────────────────────────┤
│ Device Card Shows:            │
│ 🟢 Online (green badge)        │
│ 📶 WiFi OK (blue badge)        │
│                               │
│ Backend Status:               │
│ - wifi_configured = True      │
│ - last_seen = now()           │
│ - ip_address = 192.168.1.100  │
│ - is_online = True            │
└───────────────────────────────┘


╔══════════════════════════════════════════════════════════════════════════════╗
║                            🎉 PROVISIONING COMPLETE                           ║
║                    Device Online & Fully Operational!                         ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

## Key Features in Diagram:

### ✅ **Success Path (Left Side)**
- Saves credentials to NVS
- Reports success to backend
- Shuts down AP mode
- Shows success status page
- Auto-redirects to dashboard (3 seconds)
- User sees device online

### 🔄 **Failure Path (Right Side) - NEW!**
- Clears credentials from NVS
- Reports failure to backend
- Restarts ESP32 device
- Re-enters AP mode
- User can reconnect and retry
- Unlimited retry attempts

### 🔁 **Retry Loop**
When user enters wrong password:
1. Connection fails → Clear credentials
2. Device restarts → AP mode starts
3. User reconnects → Sees WiFi setup again
4. User enters correct password → Success!

---

## Time Delays:

| Event | Delay | Purpose |
|-------|-------|---------|
| Connecting... | 30 sec | WiFi connection timeout |
| Redirect to /status | 15 sec | Wait for connection attempt |
| Success redirect | 3 sec | Auto-redirect to dashboard |
| Failure restart | 5 sec | Show error + countdown |
| Backend wake-up | 2 sec | Render cold start |
| ESP.restart() | 2 sec | Clean shutdown delay |

---

## Serial Monitor Checkpoints:

### Success:
```
✓ WiFi connected!
✓ WiFi connection successful!
✓ WiFi credentials saved to NVS
✓ Backend responded (HTTP 200)
Provisioning complete. Shutting down AP...
```

### Failure:
```
✗ WiFi connection failed!
Clearing saved WiFi credentials...
✓ Preferences cleared
Restarting AP mode for retry...
Restarting ESP32...
```

---

## User Experience Summary:

**Before (v1.0.0):**
- Wrong password → Device stuck
- Manual reflash required
- Poor user experience

**After (v1.1.0):**
- Wrong password → Auto-recovery ✅
- Unlimited retry attempts ✅
- Professional user experience ✅
- Auto-redirect to dashboard ✅
- Backend always in sync ✅

---

**🌱 The system is now production-ready!**

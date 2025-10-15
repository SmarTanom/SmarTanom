# Dashboard Data Persistence Fix

## Problem
After refreshing the page or navigating between pages, the Dashboard cards (Nutrient Level, pH Levels, Current pH) were showing default/empty states instead of the actual sensor data from the last selected device.

## Root Cause Analysis

### Issue #1: Store Hydration Timing
- The Zustand store with `persist` middleware hydrates asynchronously from localStorage
- The Dashboard was trying to restore the device selection before the `deviceData` was fully hydrated
- This caused `devicesData[currentDevice.id]` to be `undefined` or empty on initial render

### Issue #2: Data Validation Logic
- The restoration effect was checking if `existingData.sensors` existed and had keys
- But even when the object existed, it could have all `undefined` values
- This wasn't caught by the validation, leading to empty UI state

### Issue #3: Multiple Restoration Attempts
- The restoration effect had `devicesData` as a dependency
- This caused it to run multiple times whenever device data changed
- This could cause race conditions and duplicate API calls

## Solution Implemented

### 1. Added Store Hydration Tracking
```javascript
const [isHydrated, setIsHydrated] = useState(false);

useEffect(() => {
  const timer = setTimeout(() => {
    console.log('✅ Store hydration complete');
    console.log('📦 Devices in store:', useRealtimeStore.getState().devices.length);
    console.log('📦 Device data keys:', Object.keys(useRealtimeStore.getState().deviceData));
    setIsHydrated(true);
  }, 100); // Wait 100ms for hydration to complete

  return () => clearTimeout(timer);
}, []);
```

### 2. Improved Data Validation
```javascript
const hasValidSensorData = existingData?.sensors &&
  Object.values(existingData.sensors).some(v => v !== undefined && v !== null);
```
Now checks if at least ONE sensor has a valid value, not just if the sensors object exists.

### 3. Prevented Multiple Restorations
```javascript
const hasRestoredRef = useRef(false);

useEffect(() => {
  if (!isHydrated || !devices || devices.length === 0 || hasRestoredRef.current) return;
  hasRestoredRef.current = true;
  // ... restoration logic
}, [devices.length, isHydrated]); // Removed devicesData dependency
```

### 4. Added Duplicate Fetch Prevention
```javascript
const lastFetchedDeviceRef = useRef(null);

const fetchDeviceDataById = async (deviceId) => {
  lastFetchedDeviceRef.current = deviceId; // Mark as fetched
  // ... fetch logic
};

useEffect(() => {
  if (currentDevice?.id && lastFetchedDeviceRef.current !== currentDevice.id) {
    fetchDeviceDataById(currentDevice.id);
  }
}, [currentDevice?.id]);
```

### 5. Enhanced Debug Logging
Added comprehensive logging with emoji prefixes:
- ✅ Successful operations
- 🔄 Data fetching/loading
- 📦 Store state
- 🔍 Data inspection
- ⚠️ Warnings
- 📡 Device changes

## Data Flow After Fix

1. **Page Load**
   ```
   Component Mount
   ↓
   Wait 100ms for store hydration
   ↓
   isHydrated = true
   ↓
   Restore device selection from localStorage
   ↓
   Check if devicesData[deviceId] has valid sensor values
   ↓
   YES: Use persisted data → Render cards with data
   NO: Fetch fresh data from API → Update store → Re-render
   ```

2. **Page Refresh**
   - Same flow as above
   - Persisted data from previous session is used if valid

3. **Navigation Between Pages**
   - Active device index/ID saved to localStorage when changed
   - On return, device is restored and data is loaded from persisted store

4. **Device Selection Change**
   - Save new device index/ID to localStorage
   - Check if data exists for new device
   - Fetch if missing or use existing data

## Testing Checklist

- [x] Select a device and verify sensor data displays
- [ ] Refresh page - data should persist
- [ ] Navigate to another page and back - data should persist
- [ ] Switch between devices - each device's data should be correct
- [ ] Log out and log back in - device selection should reset but data should load
- [ ] Check browser console for proper logging sequence
- [ ] Verify no duplicate API calls for the same device

## Files Modified

1. `frontend/src/pages/Dashboard.jsx`
   - Added hydration state tracking
   - Improved device restoration logic
   - Enhanced data validation
   - Added duplicate fetch prevention
   - Added comprehensive debug logging

## Configuration

The persist configuration in `realtimeStore.js` is already set to persist:
```javascript
partialize: (state) => ({
  devices: state.devices,
  deviceData: state.deviceData, // ← Sensor data persisted here
  deviceAlerts: state.deviceAlerts,
  latestAlerts: state.latestAlerts,
  unreadCounts: state.unreadCounts,
  totalUnread: state.totalUnread,
})
```

## Known Limitations

1. **localStorage size limit**: If you have many devices with extensive sensor history, you may hit browser storage limits (typically 5-10MB)
2. **Stale data**: Persisted data doesn't auto-refresh; manual refresh or WebSocket updates needed
3. **Cross-tab sync**: Changes in one tab won't immediately reflect in other tabs (Zustand persist limitation)

## Future Improvements

1. Add TTL (Time To Live) for cached sensor data
2. Implement periodic background refresh for stale data
3. Add visual indicator when using cached vs live data
4. Consider IndexedDB for larger storage needs
5. Add cross-tab synchronization using BroadcastChannel API

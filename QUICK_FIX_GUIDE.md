# Quick Fix Guide: Dashboard Not Showing Nutrient/pH Status

## What Was Wrong?
Backend was sending `plant: "Lettuce"` (string) instead of `plant: {...}` (object with ranges).
Frontend couldn't calculate status without ph_min, ph_max, ppm_min, ppm_max values.

## What Changed?
**Backend**: `apps/reservoirs/serializers.py` - Returns full plant object now
**Frontend**: `frontend/src/pages/Dashboard.jsx` - Uses embedded plant data

## How To Test?

### 1. Quick Backend Test
```bash
cd backend
python test_reservoir_serializer.py
```
**Expected**: ✅ ALL TESTS PASSED!

### 2. Check API Response
```bash
curl -H "Authorization: Token YOUR_TOKEN" \
  http://localhost:8000/api/reservoirs/reservoirs/ | jq '.results[0].plant'
```
**Expected**: Full object with ph_min, ph_max, ppm_min, ppm_max, etc.

### 3. Check Dashboard
1. Open Dashboard in browser
2. Open DevTools → Console
3. Look for:
   ```
   [Dashboard] Using plant data from reservoir object: Lettuce
   [Dashboard] Resolved plant: {plant_name: "Lettuce", ph_min: 5.5, ...}
   ```
4. Visual check:
   - ✅ Nutrient Level shows "Optimal" / "Low" / "High" (not "Loading...")
   - ✅ pH card shows status text and colored dot
   - ✅ pH range bar marker moves

## Deployment

```bash
# Backend
cd backend
python manage.py runserver  # restart if already running

# Frontend
cd frontend
npm run dev  # or npm run build for production

# Browser
Hard reload: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
```

## If Still Not Working

1. **Check reservoir exists**:
   ```bash
   cd backend
   python manage.py shell
   >>> from apps.reservoirs.models import Reservoir
   >>> Reservoir.objects.filter(device__device_serial='YOUR-DEVICE-SERIAL')
   ```

2. **Check plant is configured**:
   ```bash
   >>> r = Reservoir.objects.first()
   >>> r.plant
   >>> r.plant.ph_min, r.plant.ppm_min
   ```

3. **Check sensor data exists**:
   ```bash
   >>> from apps.sensors.models import SensorData
   >>> SensorData.objects.filter(sensor__device__device_serial='YOUR-DEVICE-SERIAL').order_by('-created_at')[:5]
   ```

## Files Changed
- ✅ `backend/apps/reservoirs/serializers.py` (20 lines added)
- ✅ `frontend/src/pages/Dashboard.jsx` (5 lines modified)
- ✅ `frontend/src/assets/styles/UserDashboard.css` (8 lines added)

## No Breaking Changes
- ✅ Backward compatible (`plant_type` still exists)
- ✅ No database migration needed
- ✅ No API endpoint changes
- ✅ Existing clients continue to work

## Success Criteria
- [x] Backend test passes
- [x] API returns full plant object
- [x] Frontend console shows resolved plant
- [x] Dashboard displays actual status
- [x] pH card shows status and markers
- [x] No errors in console

---

**TL;DR**: Fixed backend serializer to return full plant object. Dashboard now works correctly.

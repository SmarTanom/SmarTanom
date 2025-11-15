# pH Graph Implementation - Testing Guide

## Summary

Successfully implemented a pH sensor data graph on the Dashboard using Chart.js. The graph displays pH values over time with proper timestamps and updates automatically when new sensor data arrives.

## What Was Implemented

### 1. New PHLineChart Component (`frontend/src/components/charts/PHLineChart.jsx`)
- **Purpose**: Professional line graph visualization for pH sensor data
- **Features**:
  - Displays pH values on Y-axis (0-14 pH scale)
  - Shows timestamps on X-axis with readable date/time format
  - Smooth line curves with filled area under the graph
  - Interactive tooltips showing exact pH value and timestamp
  - Optimal range indicator (if plant data is available)
  - Color-coded status (optimal/warning/critical based on plant requirements)
  - Handles empty data gracefully with appropriate messages
  - Responsive design that adapts to container size

### 2. Dashboard Integration (`frontend/src/pages/Dashboard.jsx`)
- **Changes Made**:
  - Imported PHLineChart component
  - Added `phRawData` field to device data payload to store raw pH sensor readings
  - Replaced the existing bar chart with the new line chart component
  - Simplified pH card legend to show reading count
  - Maintained time range selector (Days/Weeks/Months)

### 3. Dependencies Installed
- `chart.js` - Core charting library
- `react-chartjs-2` - React wrapper for Chart.js

## How It Works

### Data Flow

1. **Backend API** → `GET /api/sensors/sensor-data/?sensor={id}&limit={limit}`
   - Returns array of sensor readings with structure:
     ```json
     {
       "results": [
         {
           "id": 1,
           "sensor": 1,
           "value": 6.8,
           "created_at": "2025-11-16T03:20:00Z",
           "updated_at": "2025-11-16T03:20:00Z"
         }
       ]
     }
     ```

2. **Dashboard Component** → `fetchDeviceDataById(deviceId)`
   - Fetches sensors for the device
   - Fetches sensor data for each sensor (up to 300 readings for pH)
   - Stores raw pH data in `sensorDataMap[phSensor.id]`
   - Adds to device data payload as `phRawData`

3. **PHLineChart Component**
   - Receives `phRawData` array with {value, created_at} objects
   - Filters out invalid/null entries
   - Sorts by timestamp (oldest to newest for proper line progression)
   - Formats timestamps for X-axis labels
   - Renders Chart.js line graph

### Real-time Updates

The graph updates automatically via:
- **WebSocket**: Real-time sensor data pushes from backend
- **Polling**: Fallback 2-second lightweight refresh when WS disconnected
- **Store Updates**: Zustand realtime store manages device data state

## Testing the Implementation

### Prerequisites

1. **Backend Running**: Ensure Django backend is running on port 8000
   ```powershell
   cd backend
   .\.venv\Scripts\Activate.ps1
   python manage.py runserver
   ```

2. **Frontend Running**: Frontend dev server should be running on port 5173
   ```powershell
   cd frontend
   npm run dev
   ```

3. **Test Data**: Ensure you have pH sensor data in the database
   - You can use the seed command to create mock data:
     ```powershell
     cd backend
     python manage.py seed_mock_data --readings-per-sensor 50 --days 7
     ```

### Testing Steps

#### 1. Access Dashboard
- Navigate to `http://localhost:5173`
- Login with your credentials
- You should see the Dashboard with your devices

#### 2. Verify pH Card Display
Look for the "pH Levels over time" card. It should:
- ✅ Display the card header with Activity icon
- ✅ Show time range selector (Days/Weeks/Months dropdown)
- ✅ Display device name/label in legend
- ✅ Show reading count (e.g., "50 readings")
- ✅ Render the line graph with pH data

#### 3. Check Graph Features

**Visual Elements**:
- [ ] Line graph is displayed with green color
- [ ] Y-axis shows pH scale (with values like "0.0 pH", "7.0 pH", "14.0 pH")
- [ ] X-axis shows date/time labels (rotated 45 degrees for readability)
- [ ] Grid lines are visible (light gray)
- [ ] Graph has smooth curves (tension applied)

**Interactive Elements**:
- [ ] Hover over data points to see tooltips
- [ ] Tooltip shows exact pH value and timestamp
- [ ] Tooltip indicates if value is optimal/above/below range (if plant configured)
- [ ] Optimal range indicator appears in top-right (if plant has ph_min/ph_max)

#### 4. Test Time Range Switching
- [ ] Click "Days" dropdown and select "Weeks"
- [ ] Graph should update to show weekly data
- [ ] Try "Months" option
- [ ] Verify data updates correctly for each range

#### 5. Test Empty Data Handling
- [ ] If no pH data exists, should display "No pH data available"
- [ ] Message should be centered and styled appropriately
- [ ] No errors in browser console

#### 6. Test with Different Devices
- [ ] Switch between devices (if you have multiple)
- [ ] Each device should show its own pH data
- [ ] Graph should update immediately when switching devices

### Browser Console Checks

Open Browser DevTools (F12) and check Console:

**Expected Logs**:
```
[Dashboard] pH sensor found: <sensor_id> with data: <count>
[Dashboard] Generated pH history: <count> points
[Dashboard] Fetched ph sensor data: <count> records (limit: 300)
```

**No Errors Should Appear For**:
- Chart.js registration
- Component rendering
- Data fetching
- WebSocket connections (may show warnings if WS not configured)

### Common Issues & Solutions

#### Issue: "No pH data available" displayed
**Solution**: 
- Check if pH sensor exists for the device
- Run seed command to create test data
- Verify backend API is returning data: `GET http://localhost:8000/api/sensors/sensor-data/?sensor={id}`

#### Issue: Graph not rendering / blank space
**Solution**:
- Check browser console for Chart.js errors
- Verify Chart.js imports are correct
- Ensure `phRawData` is being populated in device data

#### Issue: Timestamps not displaying correctly
**Solution**:
- Verify `created_at` field exists in sensor data
- Check timezone settings in browser
- Ensure date parsing is working (check console logs)

#### Issue: Graph shows old data after switching devices
**Solution**:
- Device data is cached in Zustand store
- Try refreshing the page
- Check if `fetchDeviceDataById` is being called on device switch

## API Endpoints Used

### Get Device Sensors
```
GET /api/sensors/sensors/?device={deviceId}
```

### Get Sensor Data
```
GET /api/sensors/sensor-data/?sensor={sensorId}&limit={limit}&start={iso_date}&end={iso_date}
```

## Data Structure Reference

### pH Raw Data (stored in device data)
```javascript
{
  phRawData: [
    {
      id: 1,
      sensor: 123,
      value: 6.8,
      created_at: "2025-11-16T03:20:00Z",
      updated_at: "2025-11-16T03:20:00Z",
      ingest_id: "..."
    },
    // ... more readings
  ]
}
```

### Plant Data (for optimal range)
```javascript
{
  plant: {
    plant_name: "Lettuce",
    ph_min: 5.5,
    ph_max: 6.5,
    // ... other fields
  }
}
```

## Performance Considerations

- **Data Limit**: Fetches up to 300 pH readings based on time range
- **Sorting**: Client-side sorting of timestamps (efficient for typical dataset sizes)
- **Re-renders**: Optimized with `useMemo` hooks to prevent unnecessary recalculations
- **Real-time**: Updates only when new data arrives (not on every render)

## Future Enhancements

Potential improvements for the future:
1. Add zoom/pan functionality for detailed time periods
2. Export graph as image/PDF
3. Compare multiple devices on same graph
4. Statistical overlays (average, min, max lines)
5. Annotations for significant events (nutrient additions, etc.)
6. Configurable Y-axis range
7. More detailed tooltips with trend indicators

## Files Modified

1. `frontend/src/components/charts/PHLineChart.jsx` - **NEW**
2. `frontend/src/pages/Dashboard.jsx` - Modified (3 changes)
   - Added import for PHLineChart
   - Added phRawData to dataPayload
   - Replaced bar chart section with line chart

## Dependencies Added

- `chart.js@^4.4.7`
- `react-chartjs-2@^5.3.0`

---

**Status**: ✅ Implementation Complete
**Last Updated**: November 16, 2025
**Tested**: Frontend compiles successfully, server running on port 5173

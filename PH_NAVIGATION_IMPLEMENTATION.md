# pH Graph Navigation Implementation

## Overview
Enhanced the pH graph navigation to support viewing historical data across different time ranges (Days, Weeks, Months) using the existing "Older" and "Newer" buttons.

## Changes Made

### 1. PHLineChart Component (`frontend/src/components/charts/PHLineChart.jsx`)

#### Data Aggregation by Time Range
- **Added helper functions** for week and month key generation:
  - `getWeekKey(date)`: Groups data by ISO week (Monday start)
  - `getMonthKey(date)`: Groups data by month (YYYY-MM format)

- **Updated `processedData` useMemo** to aggregate data based on `timeRange` prop:
  - **Days**: Groups by individual days (existing behavior)
  - **Weeks**: Groups by calendar weeks, showing the latest reading per week
  - **Months**: Groups by calendar months, showing the latest reading per month

#### Dynamic Label Formatting
- **Updated bar labels** to display appropriately for each time range:
  - **Days**: "Nov 15"
  - **Weeks**: "Nov 11-17" (shows week range)
  - **Months**: "Nov 2025" (shows month and year)

#### Date Range Display
- **Enhanced date range text** to show proper ranges:
  - **Days**: "Nov 11 - Nov 15"
  - **Weeks**: "Nov 11 - Nov 24" (including full week spans)
  - **Months**: "Nov 2025 - Jan 2026"

- **Added `getUnitLabel()` function** to dynamically display the correct unit:
  - Shows "Last 10 Days", "Last 8 Weeks", or "Last 6 Months" based on selection

### 2. Dashboard Component (`frontend/src/pages/Dashboard.jsx`)

#### Dynamic Window Size
- **Updated PHLineChart props** to use `PH_WINDOW_SIZE` instead of hardcoded value:
  - Days: 10 bars per page
  - Weeks: 8 bars per page  
  - Months: 6 bars per page

## How It Works

### User Workflow
1. User selects time range from dropdown (Days/Weeks/Months)
2. Data is automatically aggregated to the selected period
3. Navigation buttons (Older/Newer) let users browse through pages of aggregated data
4. Chart displays the appropriate number of bars based on the time range
5. Labels and date ranges adjust automatically to show relevant information

### Technical Flow
```
User selects "Weeks" → 
  ↓
timeRange prop changes → 
  ↓
processedData re-aggregates by week → 
  ↓
paginatedData shows 8 weeks per page → 
  ↓
Labels show week ranges (e.g., "Nov 11-17") →
  ↓
Navigation buttons page through weekly data
```

## Navigation Features

### Older Button
- **Functionality**: Shows previous time period data (further back in history)
- **Visual Feedback**: Green highlight on hover, disabled when at oldest data
- **Behavior**: Increments page counter, loading older aggregated periods

### Newer Button
- **Functionality**: Shows more recent time period data (closer to present)
- **Visual Feedback**: Green highlight on hover, disabled when at newest data
- **Behavior**: Decrements page counter, loading newer aggregated periods

### Jump to Latest
- **Functionality**: Quick navigation back to the most recent data
- **Visibility**: Only appears when not viewing the latest page
- **Styling**: Prominent green button with hover effects

## Example Scenarios

### Viewing Daily Data
- **Selection**: "📅 Days"
- **Display**: 10 bars showing last 10 days
- **Label**: "Nov 6" through "Nov 15"
- **Navigation**: Click "Older" to see Nov 1-10, click "Newer" to return

### Viewing Weekly Data
- **Selection**: "📊 Weeks"
- **Display**: 8 bars showing last 8 weeks
- **Label**: "Oct 21-27" through "Dec 9-15"
- **Navigation**: Click "Older" to see previous 8 weeks, click "Newer" to return

### Viewing Monthly Data
- **Selection**: "📈 Months"
- **Display**: 6 bars showing last 6 months
- **Label**: "Jun 2025" through "Nov 2025"
- **Navigation**: Click "Older" to see Jan-Jun, click "Newer" to return

## Data Preservation
- Latest reading from each period is used for the bar value
- Tooltip shows the exact timestamp of the reading
- Data sorted newest first, then paginated for display
- No data loss during aggregation - all readings preserved in original dataset

## UI/UX Enhancements
- **Responsive buttons**: Hover effects and visual feedback
- **Disabled states**: Clear indication when navigation not available
- **Date range display**: Always shows current viewing window
- **Dynamic labels**: Context-appropriate time period formatting
- **Jump to Latest**: Convenient shortcut to return to recent data

## Technical Notes
- Component uses React hooks (useMemo, useState) for optimal performance
- Aggregation happens in memory - no API changes required
- Pagination logic remains consistent across all time ranges
- Week calculation uses ISO 8601 standard (Monday as start of week)
- All date formatting uses consistent locale ('en-US')

## Future Enhancements
- Could add keyboard navigation (arrow keys)
- Could add date picker to jump to specific period
- Could add export functionality for visible data range
- Could add annotations for significant events

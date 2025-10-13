# Alert Severity Notification Preferences

## Overview
Users can now control which types of push notifications they receive by toggling Alert Severity settings. The system filters notifications based on user preferences stored in the backend database.

## How It Works

### User Controls
Users can toggle three types of alert severity:

1. **Critical Alerts** - Urgent issues requiring immediate attention
2. **Warnings** - Important notifications that need attention
3. **Info** - General updates and information

### Notification Flow

```
User toggles alert type ON/OFF
        ↓
Frontend updates UI immediately (responsive)
        ↓
API call to save preference to backend
        ↓
Backend stores in NotificationPreferences model
        ↓
When notification is sent:
   - Backend checks NotificationPreferences
   - Only sends if user has that type enabled
   - Skips notification if disabled
```

## Database Schema

### NotificationPreferences Model
```python
class NotificationPreferences(models.Model):
    user = OneToOneField(User)           # One preference record per user
    critical_alerts = BooleanField()     # Receive critical/alert types
    warnings = BooleanField()            # Receive warning types
    info = BooleanField()                # Receive info/success types
    created_at = DateTimeField()
    updated_at = DateTimeField()
```

**Key Features:**
- One preference record per user (OneToOne relationship)
- Defaults to `True` for all types (user receives everything by default)
- Auto-created when user first updates preferences
- Viewable at: http://127.0.0.1:8000/admin/notifications/notificationpreferences/

## API Endpoints

### Get User Preferences
```
GET /api/notifications/preferences/
Headers: Authorization: Token <user_token>
Response: {
  "id": 1,
  "critical_alerts": true,
  "warnings": true,
  "info": false,
  "created_at": "2025-10-14T...",
  "updated_at": "2025-10-14T..."
}
```

### Update Preferences
```
POST /api/notifications/preferences/
Headers: Authorization: Token <user_token>
Body: {
  "critical_alerts": true,
  "warnings": false,
  "info": true
}
Response: {
  "success": true,
  "message": "Notification preferences updated",
  "preferences": { ... }
}
```

## Notification Type Mapping

The system maps notification types to preference settings:

| Notification Type | Preference Field  | User Setting      |
|-------------------|-------------------|-------------------|
| `critical`        | `critical_alerts` | Critical Alerts   |
| `alert`           | `critical_alerts` | Critical Alerts   |
| `warning`         | `warnings`        | Warnings          |
| `info`            | `info`            | Info              |
| `success`         | `info`            | Info              |

### Backend Filtering Logic
```python
# In NotificationPreferences model
def allows_notification_type(self, notification_type):
    type_mapping = {
        'critical': self.critical_alerts,
        'alert': self.critical_alerts,
        'warning': self.warnings,
        'info': self.info,
        'success': self.info,  # Success treated as info
    }
    return type_mapping.get(notification_type, True)
```

### Service Layer Check
```python
# In PushNotificationService.send_notification()
try:
    preferences = NotificationPreferences.objects.get(user=user)
    if not preferences.allows_notification_type(notification_type):
        logger.info(f"User {user.email} has disabled {notification_type} notifications")
        return {'sent': 0, 'failed': 0, 'skipped': True}
except NotificationPreferences.DoesNotExist:
    # No preferences set, allow all notifications by default
    pass
```

## Frontend Implementation

### State Management
```javascript
const [notifications, setNotifications] = useState({
  alerts: {
    critical: true,
    warnings: true,
    info: true
  }
});

const [preferencesLoading, setPreferencesLoading] = useState({});
```

### Fetching Preferences
```javascript
useEffect(() => {
  const fetchPreferences = async () => {
    const prefs = await getNotificationPreferences();
    setNotifications(prev => ({
      ...prev,
      alerts: {
        critical: prefs.critical_alerts ?? true,
        warnings: prefs.warnings ?? true,
        info: prefs.info ?? true
      }
    }));
  };
  fetchPreferences();
}, []);
```

### Toggle Handler
```javascript
const handleToggle = async (category, key) => {
  if (category === 'alerts') {
    // Update UI immediately
    const newValue = !notifications.alerts[key];
    setNotifications(prev => ({
      ...prev,
      alerts: { ...prev.alerts, [key]: newValue }
    }));

    // Show loading spinner
    setPreferencesLoading(prev => ({ ...prev, [key]: true }));

    try {
      // Save to backend
      await updateNotificationPreferences({
        critical_alerts: key === 'critical' ? newValue : notifications.alerts.critical,
        warnings: key === 'warnings' ? newValue : notifications.alerts.warnings,
        info: key === 'info' ? newValue : notifications.alerts.info
      });

      showToast('Preferences updated', 'success');
    } catch (error) {
      // Revert on error
      setNotifications(prev => ({
        ...prev,
        alerts: { ...prev.alerts, [key]: !newValue }
      }));
      showToast('Failed to update', 'error');
    } finally {
      setPreferencesLoading(prev => ({ ...prev, [key]: false }));
    }
  }
};
```

### UI Components
```jsx
<label className="toggle-switch">
  <input
    type="checkbox"
    checked={notifications.alerts.critical}
    onChange={() => handleToggle('alerts', 'critical')}
    disabled={preferencesLoading.critical}
  />
  <span className="toggle-slider">
    {preferencesLoading.critical && <Loader size={12} className="spinner" />}
  </span>
</label>
```

## User Experience

### Toggle Behavior
1. **Click toggle** → UI updates immediately (responsive)
2. **Spinner appears** → Shows saving in progress
3. **Success toast** → "Critical alerts enabled/disabled"
4. **Spinner disappears** → Toggle settles in new position

### Error Handling
- If save fails → Toggle reverts to previous state
- Error toast shown → "Failed to update preferences"
- User can try again

### Loading States
- Individual spinners per toggle
- Disable toggle during save (prevents double-clicks)
- Other toggles remain interactive

## Testing

### Test Scenario 1: Disable Critical Alerts
1. Go to Notifications page
2. Turn OFF "Critical Alerts" toggle
3. Verify: Toggle animates, spinner shows, success toast appears
4. Check database: `critical_alerts` should be `False`
5. Send critical notification via Django shell:
   ```python
   from apps.notifications.services import PushNotificationService
   from apps.accounts.models import User

   user = User.objects.get(email='test@example.com')
   result = PushNotificationService.send_notification(
       user=user,
       title='Critical Test',
       message='This should NOT be sent',
       notification_type='critical'
   )
   print(result)  # Should show: {'sent': 0, 'failed': 0, 'skipped': True}
   ```
6. Result: No notification received ✅

### Test Scenario 2: Enable Only Warnings
1. Turn OFF Critical Alerts
2. Turn ON Warnings
3. Turn OFF Info
4. Send each type:
   ```python
   # Critical - should NOT send
   PushNotificationService.send_notification(user, 'Critical', 'Test', 'critical')

   # Warning - SHOULD send
   PushNotificationService.send_notification(user, 'Warning', 'Test', 'warning')

   # Info - should NOT send
   PushNotificationService.send_notification(user, 'Info', 'Test', 'info')
   ```
5. Result: Only warning notification received ✅

### Test Scenario 3: Page Refresh Persistence
1. Toggle some alert types
2. Refresh the page
3. Verify: Toggles reflect saved preferences from database
4. Result: State persists correctly ✅

### Test Scenario 4: Multiple Users
1. User A disables warnings
2. User B keeps warnings enabled
3. Send warning notification to both
4. Result: Only User B receives it ✅

## Backend Admin

View and manage preferences at:
```
http://127.0.0.1:8000/admin/notifications/notificationpreferences/
```

**Admin Features:**
- List all user preferences
- Filter by alert type enabled/disabled
- Search by user email
- Manually edit preferences
- View creation/update timestamps

## Migration

Created migration file:
```
backend/apps/notifications/migrations/0002_notificationpreferences.py
```

Applied with:
```bash
python manage.py migrate notifications
```

## Benefits

✅ **Granular Control**: Users choose exactly what they want
✅ **Less Noise**: Filter out unimportant notifications
✅ **Better UX**: Respect user preferences
✅ **Persistent**: Saved to database, survives sessions
✅ **Real-time**: Backend checks before every send
✅ **Efficient**: Single query per notification send
✅ **Scalable**: Works with millions of users
✅ **Flexible**: Easy to add new alert types

## Default Behavior

- **New users**: All alert types enabled by default
- **No preferences set**: All notifications allowed
- **First toggle**: Creates preference record automatically
- **Push disabled**: Preferences still saved (ready when re-enabled)

## Integration Points

### When Sending Notifications
```python
# In device alert system, sensor monitoring, etc.
from apps.notifications.services import PushNotificationService

# Specify notification_type correctly
PushNotificationService.send_notification(
    user=device.owner,
    title='pH Level Critical',
    message='pH is below 5.5',
    notification_type='critical'  # User's preference will be checked
)
```

### Notification Types to Use
- **critical**: System failures, dangerous levels, urgent action needed
- **warning**: Approaching thresholds, maintenance needed, non-urgent issues
- **info**: Status updates, harvest readiness, general information
- **success**: Operations completed, system recovered, positive updates

## Future Enhancements

1. **Category-specific preferences**: Different settings per device/reservoir
2. **Time-based rules**: Different preferences for day/night
3. **Quiet hours integration**: Respect quiet hours + alert severity
4. **Notification history**: Show which were filtered out
5. **Smart defaults**: Learn from user dismiss patterns
6. **Batch updates**: "Disable all warnings" button
7. **Templates**: Save preference profiles
8. **Admin overrides**: Force-send critical despite preferences

## Summary

✅ **Working Now:**
- Three alert severity toggles (Critical, Warnings, Info)
- Saves preferences to backend database
- Filters notifications based on preferences
- Responsive UI with loading states
- Persists across sessions
- Admin interface for viewing/editing
- Works independently per user

✅ **User Can:**
- Enable/disable each alert type independently
- See instant visual feedback
- Have preferences persist forever
- Control notification volume
- Change preferences anytime

✅ **System Does:**
- Checks preferences before sending
- Skips disabled notification types
- Logs preference checks
- Auto-creates preferences on first use
- Defaults to "all enabled" for new users

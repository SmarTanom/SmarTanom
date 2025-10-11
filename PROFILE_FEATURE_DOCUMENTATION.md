# Profile Page - Feature Documentation

## Overview
The Profile Page is a comprehensive user settings and account management interface that follows the SmarTanom design system. It provides OAuth-friendly authentication (no password management) and includes shared monitoring capabilities for collaborative device management.

## Key Features

### 1. **Account Information**
- **User Profile Display**: Shows username, email, full name, role, and member since date
- **Profile Avatar**: Circular avatar with user icon in gradient header
- **No Password Management**: Designed for OAuth/passwordless authentication flow
- **Role Display**: Shows user role (User/Admin) from backend profile

### 2. **Device Overview Statistics**
Two stat cards showing:
- **Devices Owned**: Total number of devices user owns
- **Shared With Others**: Count of devices shared with other users
- Green themed icons with professional card layout

### 3. **Shared Monitoring System**
Complete device sharing functionality allowing users to collaborate:

#### **Share Device Modal**
- Device selection dropdown (lists all user's devices)
- Email input for recipient user
- Access level selection:
  - **View Only**: Can view device data and alerts (read-only)
  - **Manage**: Can view, configure, and control device (full access)
- Visual permission indicators with icons

#### **Shared Access List**
Displays all active shares with:
- Device name and ID
- Recipient email address
- Permission level badge (View/Manage)
- Share date
- Revoke access button (with confirmation)

#### **Empty State**
Beautiful empty state when no devices are shared yet

### 4. **Settings Menu**
Quick access navigation to:
- **Notifications**: Manage alert preferences
- **Privacy & Security**: Account security settings
- **Preferences**: User preferences and customization

### 5. **Sign Out**
Prominent red-themed logout button that:
- Clears authentication token from localStorage
- Redirects to landing page
- Has hover and active states

### 6. **Bottom Navigation**
Consistent navigation bar across all pages:
- Tanom (Dashboard)
- Alerts
- **Profile (active)**

## Design System Compliance

### Colors
- **Primary Green**: #32A86D (buttons, active states, icons)
- **Secondary Dark Green**: #1E3E28 (headings, gradient)
- **Alert Red**: #E1554A (logout, revoke actions)
- **Warning Orange**: #F59E0B (manage permission)
- **Info Blue**: #2563EB (view permission)

### Typography
- **Abril Fatface**: Headings (username, section titles, stats)
- **Montserrat**: Body text, labels, buttons

### Layout
- **Mobile-First**: Optimized for mobile with responsive breakpoints
- **16px Base Spacing**: Consistent gap system
- **16px Border Radius**: Smooth, modern corners
- **Card-Based**: Clean card layout with shadows

## User Flow: Sharing a Device

1. User clicks "Share Device" button in Shared Monitoring section
2. Modal opens with three-step form:
   - Select device from dropdown
   - Enter recipient email
   - Choose access level (View/Manage)
3. User clicks "Share Device" to confirm
4. New share appears in shared access list
5. Modal closes and resets

## User Flow: Revoking Access

1. User clicks "Revoke Access" on any shared item
2. Browser confirmation dialog appears
3. Upon confirmation, share is removed from list
4. In production, API call revokes access on backend

## Mock Data Structure

### User Profile
```javascript
{
  username: 'JohnDoe',
  email: 'john.doe@example.com',
  firstName: 'John',
  lastName: 'Doe',
  role: 'user',
  joinedDate: '2024-01-15',
  devicesOwned: 3,
  sharedWith: 2
}
```

### Shared Access Item
```javascript
{
  id: 1,
  deviceId: 'RACK-01',
  deviceName: 'Outdoor Garden',
  sharedWith: 'jane.smith@example.com',
  permission: 'view', // or 'manage'
  sharedDate: '2024-09-20'
}
```

## Backend Integration Points

### Required API Endpoints

1. **GET /api/user/profile/**
   - Returns user profile data
   - Includes devicesOwned and sharedWith counts

2. **GET /api/devices/**
   - Returns list of user's devices
   - Used to populate device dropdown in share modal

3. **GET /api/device-shares/**
   - Returns list of all active device shares by user
   - Includes device info, recipient, permission, date

4. **POST /api/device-shares/**
   - Creates new device share
   - Body: `{ deviceId, sharedWith (email), permission }`
   - Returns created share object

5. **DELETE /api/device-shares/{id}/**
   - Revokes access to shared device
   - Requires share ID

### Recommended Backend Models

#### DeviceShare Model (backend/apps/monitoring/models.py)
```python
class DeviceShare(models.Model):
    PERMISSION_CHOICES = [
        ('view', 'View Only'),
        ('manage', 'Manage'),
    ]
    
    device = models.ForeignKey(Device, on_delete=models.CASCADE, related_name='shares')
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='shared_devices')
    shared_with = models.EmailField()  # or FK to User if user exists
    permission = models.CharField(max_length=10, choices=PERMISSION_CHOICES, default='view')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['device', 'shared_with']
        indexes = [
            models.Index(fields=['owner', 'device']),
            models.Index(fields=['shared_with']),
        ]
```

## Accessibility Features

- **ARIA Labels**: All buttons and navigation have proper labels
- **Semantic HTML**: Proper heading hierarchy (h1, h2, h3, h4)
- **Keyboard Navigation**: All interactive elements are keyboard accessible
- **Focus States**: Clear focus indicators on form inputs
- **Color Contrast**: WCAG AA compliant text/background ratios

## Responsive Breakpoints

### Mobile (< 600px)
- Single column layout
- Stats in 2-column grid
- Full-width cards
- Compact spacing

### Tablet & Desktop (≥ 600px)
- Max-width 800px container
- Larger avatar (120px)
- Increased font sizes
- More generous spacing

## Future Enhancements

1. **Real-Time Updates**: WebSocket notifications when devices are shared/unshared
2. **Share History**: Log of all share actions with timestamps
3. **Bulk Share**: Share multiple devices at once
4. **Share Links**: Generate shareable links with expiry
5. **Permission Levels**: Add more granular permissions (view alerts only, control specific sensors)
6. **User Search**: Auto-complete for user emails when sharing
7. **Shared By Others**: Section showing devices shared WITH the user by others
8. **Activity Feed**: Recent actions on shared devices
9. **Export Data**: Download account data and share history
10. **Dark Mode**: Theme toggle in preferences

## Security Considerations

1. **Email Validation**: Frontend validates email format
2. **Duplicate Prevention**: Backend should prevent duplicate shares
3. **Permission Validation**: Backend validates permission choices
4. **Owner Verification**: Only device owner can share/revoke
5. **Token Refresh**: Handle expired auth tokens gracefully
6. **Rate Limiting**: Prevent abuse of share creation
7. **Audit Log**: Track all share/revoke actions on backend

## Testing Checklist

- [ ] Profile loads with correct user data
- [ ] Stats display correct device counts
- [ ] Share modal opens and closes properly
- [ ] Device dropdown populates with user's devices
- [ ] Email validation works
- [ ] Permission radio buttons toggle correctly
- [ ] New share appears in list after creation
- [ ] Revoke access removes share from list
- [ ] Settings menu items are clickable
- [ ] Logout clears token and redirects
- [ ] Bottom nav navigates to correct pages
- [ ] Responsive layout works on mobile/tablet/desktop
- [ ] Modal closes when clicking overlay
- [ ] Empty state shows when no shares exist

## File Structure

```
frontend/src/
├── pages/
│   └── ProfilePage.jsx          # Main component (349 lines)
└── assets/styles/
    └── ProfilePage.css          # Styles (563 lines)
```

## Dependencies

- React (useState, useEffect)
- React Router DOM (useNavigate)
- Lucide React (icons)
- CSS Modules (scoped styling)

---

**Created**: October 10, 2025  
**Status**: Ready for backend integration  
**Auth Method**: OAuth/Passwordless (no password management)

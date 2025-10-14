# OTP-Based Device Binding & Collaboration - Backend Implementation

## Overview
This document describes the OTP-only (passwordless) device binding and collaboration management system implemented in the SmarTanom backend.

## Core Features Implemented

### 1. OTP-Based Device Binding Flow
Replaces QR code validation with email-based OTP verification.

**Endpoints:**

#### Send OTP for Device Binding
```
POST /api/devices/<device_id>/bind-otp/
```
- **Auth Required:** Yes (Staff only)
- **Body:** `{"email": "user@example.com"}`
- **Response:** `{"detail": "OTP sent to user@example.com", "debug_otp": "123456"}`
- **Behavior:**
  - Generates 6-digit OTP code
  - Invalidates any previous unused OTPs for this device
  - Sends HTML email with 10-minute expiry
  - Returns debug_otp in DEBUG mode

#### Confirm OTP and Bind Device
```
POST /api/devices/<device_id>/confirm-bind/
```
- **Auth Required:** Yes (Staff only)
- **Body:** `{"otp_code": "123456"}`
- **Response:** `{"detail": "Device successfully bound to user@example.com"}`
- **Behavior:**
  - Validates OTP (not expired, not verified, attempts < max)
  - Creates user if doesn't exist (is_active=True, no password)
  - Reactivates user if exists but inactive
  - Binds device to user email
  - Marks OTP as verified (prevents reuse)

### 2. Collaborator Management

#### Add Collaborator (Auto-Create Users)
```
POST /api/devices/<device_id>/add-collaborator/
```
- **Auth Required:** Yes (Staff only)
- **Body:** `{"email": "collab@example.com"}`
- **Response:** `{"detail": "Collaborator added", "user_id": 123}`
- **Behavior:**
  - Uses `User.objects.get_or_create()` pattern
  - Creates user with `is_active=True` if doesn't exist
  - Reactivates user if exists but inactive
  - Creates DeviceCollaboration with VIEW_ONLY permissions
  - Sends welcome email to new users
  - Sets `added_by` to requesting staff user

#### Revoke Collaborator Access (Conditional Deactivation)
```
POST /api/devices/<device_id>/revoke/<user_id>/
```
- **Auth Required:** Yes (Staff only)
- **Response:**
```json
{
  "detail": "Access revoked for user@example.com",
  "user_deactivated": true,
  "remaining_collaborations": 0
}
```
- **Behavior:**
  - Marks collaboration as REVOKED
  - Sets `revoked_by` and `revoked_at` tracking fields
  - **Conditional deactivation:** Only sets `is_active=False` if user has NO other active collaborations
  - Force logout: Deletes all auth tokens if user deactivated
  - Returns count of remaining collaborations

#### Unbind Device
```
POST /api/devices/<device_id>/admin-unbind/
```
- **Auth Required:** Yes (Staff only)
- **Response:** `{"detail": "Device unbound successfully"}`
- **Behavior:**
  - Sets `is_bound=False`, `bound_email=None`
  - Returns appropriate message if already unbound

### 3. Email Templates

#### Bind OTP Email
- **Subject:** "SmarTanom - Device Binding Verification"
- **Template:** HTML + plain text
- **Content:**
  - 6-digit OTP code (large, centered)
  - Device serial number
  - 10-minute expiry warning
  - Security notice (do not share)

#### Collaborator Invite Email
- **Subject:** "SmarTanom - Device Collaboration Invitation"
- **Template:** HTML + plain text
- **Content:**
  - Device details (serial, name)
  - Login link to frontend
  - Instructions for OTP authentication

## Model Updates

### DeviceCollaboration
Added admin tracking fields:
```python
added_by = models.ForeignKey(
    User,
    on_delete=models.SET_NULL,
    null=True,
    related_name='collaborations_added'
)
revoked_by = models.ForeignKey(
    User,
    on_delete=models.SET_NULL,
    null=True,
    related_name='collaborations_revoked'
)
revoked_at = models.DateTimeField(null=True, blank=True)
```

### Migration
- **File:** `apps/devices/migrations/0011_devicecollaboration_added_by_and_more.py`
- **Status:** Applied ✓
- **Fields Added:** 3 (added_by, revoked_by, revoked_at)

## Django Admin Updates
Updated `DeviceCollaborationAdmin`:
- **list_display:** Now shows `added_by`, `revoked_by`, `revoked_at`
- **fieldsets:** Added "Admin Tracking" section (collapsed by default)

## User Lifecycle

### User Creation Pattern
```python
user, user_created = User.objects.get_or_create(
    email=collaborator_email,
    defaults={
        'username': f"user_{email_prefix}_{timestamp}",
        'is_active': True,
    }
)
```
- **Username format:** `user_{email_prefix}_{YYYYMMDD_HHMMSS}`
- **No password set** - OTP-only authentication
- **Example:** `user_john_20251014_140755` for `john@example.com`

### User Reactivation
When adding collaborator or binding device:
```python
if not user.is_active:
    user.is_active = True
    user.save()
```

### User Deactivation
Only when ALL collaborations revoked:
```python
other_active_collabs = DeviceCollaboration.objects.filter(
    collaborator_email=email,
    status=ACTIVE
).exclude(id=current_collab.id).count()

if other_active_collabs == 0:
    user.is_active = False
    user.save()
    Token.objects.filter(user=user).delete()  # Force logout
```

## Configuration

### Settings
```python
OTP_EXPIRE_MINUTES = 10  # For device binding OTP
DEFAULT_FROM_EMAIL = 'noreply@smartanom.com'
FRONTEND_URL = 'http://localhost:5173'  # For email links
```

### Email Backend
- **Development:** Console backend (OTP printed to console)
- **Production:** SMTP backend (configure via environment variables)

## Testing

### Test Script
Run `python test_otp_binding.py` to:
- Create test staff user
- Create test device
- Display all API endpoints
- Verify user creation pattern
- Check model tracking fields

### Manual Testing Flow
1. Start server: `python manage.py runserver`
2. Authenticate as staff user
3. Send bind OTP: `POST /api/devices/3/bind-otp/`
4. Check console for OTP code (DEBUG mode)
5. Confirm binding: `POST /api/devices/3/confirm-bind/`
6. Add collaborator: `POST /api/devices/3/add-collaborator/`
7. Revoke access: `POST /api/devices/3/revoke/<user_id>/`
8. Verify conditional deactivation logic

### Expected Responses

#### Success Cases
```json
// Bind OTP sent
{"detail": "OTP sent to user@example.com", "debug_otp": "123456"}

// Binding confirmed
{"detail": "Device successfully bound to user@example.com"}

// Collaborator added
{"detail": "Collaborator added", "user_id": 123}

// Access revoked (user has other collabs)
{
  "detail": "Access revoked for user@example.com",
  "user_deactivated": false,
  "remaining_collaborations": 2
}

// Access revoked (no other collabs)
{
  "detail": "Access revoked for user@example.com",
  "user_deactivated": true,
  "remaining_collaborations": 0
}
```

#### Error Cases
```json
// Non-staff user
{"detail": "Permission denied. Admin access required."}

// Invalid OTP
{"detail": "Invalid or expired OTP code"}

// User not found
{"detail": "User not found."}

// Device not bound
{"detail": "Device must be bound to a user before adding collaborators."}
```

## Security Considerations

### OTP Security
- 6-digit code (1,000,000 possibilities)
- 10-minute expiry window
- Single-use only (marked `is_verified=True` after use)
- Old OTPs invalidated when new one generated
- Rate limiting via `OTPCode.verify_otp()` logic

### Authorization
- All endpoints require staff authentication
- Token-based authentication (DRF Token)
- Force logout on user deactivation (delete all tokens)

### Data Privacy
- Emails stored lowercase and trimmed
- User deactivation preserves data integrity
- Tracking fields log who added/revoked collaborators

## API Response Standards
- **Success:** `{"detail": "message"}`
- **Error:** `{"detail": "error message"}`
- **Data Returns:** Include relevant IDs and counts
- **HTTP Status Codes:**
  - 200 OK - Successful GET/POST
  - 201 Created - Resource created
  - 400 Bad Request - Invalid input
  - 403 Forbidden - Permission denied
  - 404 Not Found - Resource not found
  - 500 Internal Server Error - Server error

## Logging
All critical operations logged:
```python
logger.info(f"Admin {admin_email} bound device {serial} to {user_email}")
logger.info(f"User {email} marked inactive and logged out")
logger.error(f"Failed to send bind OTP email: {error}")
```

## Dependencies
- Django REST Framework
- django.core.mail
- rest_framework.authtoken
- apps.accounts.models (User, OTPCode)
- apps.devices.models (Device, DeviceOTPCode, DeviceCollaboration)

## Next Steps
1. Frontend implementation (AdminDevices.jsx)
2. API path fix (remove /devices/devices/ duplication)
3. Toast notification system
4. Confirmation modals integration
5. End-to-end testing

## Related Files
- `backend/apps/devices/views.py` - All endpoints
- `backend/apps/devices/models.py` - DeviceCollaboration model
- `backend/apps/devices/admin.py` - Django admin config
- `backend/apps/devices/migrations/0011_*.py` - Migration file
- `backend/test_otp_binding.py` - Test script

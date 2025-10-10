# Device Binding System Documentation

## Overview

The SmarTanom Device Binding System allows users to securely bind IoT devices to their email addresses using OTP (One-Time Password) verification. This system bridges device registration with user authentication, enabling a seamless onboarding experience.

## Architecture

### Components

1. **Backend API** (Django REST Framework)
   - Device validation and OTP generation
   - Email delivery via Gmail SMTP
   - User account creation and authentication
   - Token-based authentication

2. **Frontend Interface** (React)
   - Multi-step device binding wizard
   - Real-time device validation
   - OTP input and verification
   - Username setup and finalization

3. **Database Models**
   - `Device`: Physical device registry
   - `DeviceOTPCode`: Temporary verification codes
   - `User`: Account management
   - `Token`: Authentication tokens

## API Endpoints

### 1. Device Existence Check

```http
POST /api/devices/check/
```

**Request:**
```json
{
  "serial_number": "SMRT-ABC-123"
}
```

**Response (Success):**
```json
{
  "exists": true,
  "serial_number": "SMRT-ABC-123",
  "device_name": "IoT Sensor Hub",
  "is_bound": false
}
```

**Response (Not Found):**
```json
{
  "exists": false,
  "serial_number": "SMRT-ABC-123"
}
```

### 2. OTP Request

```http
POST /api/devices/request-otp/
```

**Request:**
```json
{
  "serial_number": "SMRT-ABC-123",
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "message": "If the device exists and is available for binding, a verification code was sent.",
  "serial_number": "SMRT-ABC-123",
  "email": "user@example.com",
  "expires_in": 300,
  "debug_code": "123456"
}
```

**Note:** `debug_code` only appears in development mode.

### 3. OTP Verification & Device Binding

```http
POST /api/devices/verify-otp/
```

**Request:**
```json
{
  "serial_number": "SMRT-ABC-123",
  "email": "user@example.com",
  "code": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Device bound successfully.",
  "device": {
    "serial_number": "SMRT-ABC-123",
    "device_name": "IoT Sensor Hub",
    "bound_email": "user@example.com",
    "bound_at": "2025-10-10T17:05:34.254064+00:00"
  },
  "auth": {
    "token": "9af91b8c4c774a5e8f3c2d1e0c5b4a9e8d7c6b5a",
    "user_created": true
  }
}
```

### 4. Account Finalization

```http
POST /api/auth/finalize-account/
Authorization: Token 9af91b8c4c774a5e8f3c2d1e0c5b4a9e8d7c6b5a
```

**Request:**
```json
{
  "username": "johndoe"
}
```

**Response:**
```json
{
  "message": "Account finalized",
  "user": {
    "id": 12,
    "email": "user@example.com",
    "username": "johndoe",
    "role": "user",
    "is_admin": false
  }
}
```

## User Flow

1. **Device Entry** → User enters device serial number
2. **Device Validation** → System validates device exists and is unbindable
3. **Email Entry** → User provides email address
4. **OTP Request** → System sends verification email with 6-digit code
5. **OTP Verification** → User enters code from email
6. **Device Binding** → Device gets bound to email + user account created + authentication token issued
7. **Username Setup** → User sets their username using authentication token
8. **Account Complete** → User is fully registered and authenticated

## Security Features

### OTP Security
- **Cryptographically Secure**: Uses Python `secrets` module for random generation
- **Time-Limited**: 5-minute expiry (configurable via `OTP_EXPIRE_MINUTES`)
- **Rate Limited**: Max 3 attempts per OTP (configurable via `OTP_MAX_ATTEMPTS`)
- **Single Use**: OTPs are marked as used after successful verification
- **Invalidation**: Previous unused OTPs are invalidated when new ones are created

### Email Security
- **Real SMTP Delivery**: Uses Gmail SMTP for actual email delivery
- **Professional Templates**: HTML and plain text email templates
- **Security Headers**: Includes security headers in API responses

### Authentication Security
- **Token-Based**: Django's built-in Token authentication
- **Secure User Creation**: Automatic user account creation with email verification
- **Input Validation**: Comprehensive validation of device serials and emails
- **CSRF Protection**: Built-in Django CSRF protection

## Database Schema

### Device Model
```python
class Device(TimeStampedModel):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    device_serial = models.CharField(max_length=12, unique=True)  # SMRT-XXX-XXX format
    device_name = models.CharField(max_length=100)
    status = models.CharField(max_length=20, choices=Status.choices)
    is_bound = models.BooleanField(default=False)
    bound_email = models.EmailField(null=True, blank=True)
```

### DeviceOTPCode Model
```python
class DeviceOTPCode(TimeStampedModel):
    device = models.ForeignKey(Device, on_delete=models.CASCADE)
    email = models.EmailField()
    code = models.CharField(max_length=6)  # 6-digit numeric code
    is_verified = models.BooleanField(default=False)
    attempts = models.PositiveIntegerField(default=0)
    expires_at = models.DateTimeField()
    max_attempts = models.PositiveIntegerField(default=3)
```

### Database Indexes
- `device_serial`: Unique index for fast device lookups
- `(device, email, is_verified)`: Composite index for OTP queries
- `expires_at`: Index for efficient cleanup of expired codes
- `(user, status)`: Composite index for user device filtering

## Performance Optimizations

- **Select Related**: Uses `select_related('user')` to prevent N+1 queries
- **Indexed Lookups**: All queries use indexed fields
- **Efficient OTP Cleanup**: Indexed queries for removing expired codes
- **Minimal Database Hits**: Single query per API operation

## Configuration

### Environment Variables

```bash
# Email Configuration
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=true
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
DEFAULT_FROM_EMAIL=noreply@smartanom.com

# OTP Configuration
OTP_EXPIRE_MINUTES=5
OTP_MAX_ATTEMPTS=3
OTP_RATE_LIMIT_MINUTES=15
```

### Frontend Configuration

```javascript
// API Base URL
const API_BASE_URL = 'http://127.0.0.1:8000'

// Device API functions
import { checkDevice, requestDeviceOTP, verifyDeviceOTP } from '../services/api/devices.js'
```

## Error Handling

### Common Error Responses

**Invalid Device Serial:**
```json
{
  "error": "Invalid data",
  "details": {
    "serial_number": ["Serial number must be in format SMRT-XXX-XXX."]
  }
}
```

**Device Not Found:**
```json
{
  "exists": false,
  "serial_number": "SMRT-XXX-XXX"
}
```

**Device Already Bound:**
```json
{
  "error": "Device is already bound to an email address."
}
```

**Invalid OTP:**
```json
{
  "error": "Invalid or expired verification code."
}
```

**Duplicate Username:**
```json
{
  "error": "Username already taken"
}
```

## Testing

### Test Coverage
- 13 comprehensive tests covering all endpoints
- Error scenario testing
- OTP generation and verification testing
- Authentication flow testing
- Input validation testing

### Running Tests
```bash
cd backend
python manage.py test apps.devices.tests
```

## Frontend Integration

### React Components
- `SignupSetup.jsx`: Main device binding wizard
- `SignupStepFourOtp.jsx`: OTP input component
- Device API service functions

### State Management
```javascript
const [deviceId, setDeviceId] = useState('')       // Device serial input
const [bindEmail, setBindEmail] = useState('')     // Email for binding
const [otpCode, setOtpCode] = useState('')         // 6-digit OTP input
const [step, setStep] = useState(1)                // Current wizard step
```

### API Integration
```javascript
// Check device exists
const response = await checkDevice(deviceSerial)

// Request OTP email
const data = await requestDeviceOTP(deviceSerial, email)

// Verify OTP and bind device
const result = await verifyDeviceOTP(deviceSerial, email, code)

// Store auth token
localStorage.setItem('auth_token', result.auth.token)
```

## Deployment Considerations

### Email Delivery
- Configure Gmail App Passwords for SMTP
- Monitor email delivery rates and bounces
- Consider alternative SMTP providers for production scale

### Security
- Use HTTPS in production
- Rotate Django SECRET_KEY regularly
- Monitor authentication token usage
- Implement additional rate limiting if needed

### Database
- Regular cleanup of expired OTP codes
- Monitor device binding rates
- Consider device serial number collision handling for large deployments

## Troubleshooting

### Common Issues

**Email Not Received:**
- Check Gmail SMTP credentials
- Verify EMAIL_HOST_USER and EMAIL_HOST_PASSWORD
- Check spam folders
- Monitor Django logs for email sending errors

**Device Not Found:**
- Verify device serial format (SMRT-XXX-XXX)
- Check device exists in database
- Ensure device is not already bound

**OTP Verification Failed:**
- Check OTP has not expired (5 minutes)
- Verify attempt count under limit (3 attempts)
- Ensure code matches exactly

**Authentication Issues:**
- Verify token is stored in localStorage
- Check token hasn't expired
- Ensure proper Authorization header format

## Future Enhancements

- **Rate Limiting**: API-level rate limiting with Redis
- **OTP Templates**: Customizable email templates
- **Multi-Device Binding**: Allow multiple devices per user
- **Device Management**: Device unbinding and transfer functionality
- **Audit Logging**: Track all device binding activities
- **Mobile App Integration**: Extend to React Native mobile app

---

*This documentation covers the complete device binding system as implemented in SmarTanom v1.0*

# SmarTanom OTP Authentication System

## Overview

This document describes the complete email-based OTP (One-Time Password) authentication system implemented for the SmarTanom Django project. The system provides secure, passwordless authentication with role-based access control.

## Features Implemented

✅ **Email-based OTP authentication**  
✅ **Role-based access (admin/user)**  
✅ **Rate limiting and cooldown periods**  
✅ **OTP expiration (5 minutes)**  
✅ **Automatic user creation on first login**  
✅ **Async email sending**  
✅ **Comprehensive error handling**  
✅ **Security measures (attempt limiting)**  
✅ **Debug mode OTP display**  
✅ **Proper logging**  
✅ **Django Admin integration**  
✅ **Token-based API authentication**  

## API Endpoints

### Authentication Endpoints

| Endpoint | Method | Description | Authentication Required |
|----------|--------|-------------|------------------------|
| `/api/auth/request-otp/` | POST | Request OTP code | No |
| `/api/auth/verify-otp/` | POST | Verify OTP and authenticate | No |
| `/api/auth/logout/` | POST | Logout user | Yes |
| `/api/auth/status/` | GET | Check auth status | No |

### User Management Endpoints

| Endpoint | Method | Description | Authentication Required |
|----------|--------|-------------|------------------------|
| `/api/auth/profile/` | GET | Get user profile | Yes |
| `/api/auth/profile/update/` | PUT/PATCH | Update user profile | Yes |
| `/api/auth/users/` | GET | List all users (admin only) | Yes (Admin) |
| `/api/auth/users/promote/` | POST | Promote user to admin | Yes (Admin) |

### Maintenance Endpoints

| Endpoint | Method | Description | Authentication Required |
|----------|--------|-------------|------------------------|
| `/api/auth/cleanup/otps/` | POST | Cleanup expired OTPs | Yes (Admin) |

## Usage Examples

### 1. Request OTP

```bash
curl -X POST http://localhost:8001/api/auth/request-otp/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "purpose": "login"
  }'
```

**Response:**
```json
{
  "message": "OTP sent successfully",
  "email": "user@example.com",
  "expires_in": 300,
  "debug_code": "123456"  // Only in DEBUG mode
}
```

### 2. Verify OTP

```bash
curl -X POST http://localhost:8001/api/auth/verify-otp/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "code": "123456",
    "purpose": "login"
  }'
```

**Response:**
```json
{
  "message": "Authentication successful",
  "token": "07132dc12c88d27439d5d3287905c2b1a0faef7b",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "first_name": "",
    "last_name": "",
    "full_name": "user@example.com",
    "role": "user",
    "is_admin": false,
    "is_verified": true,
    "is_active": true,
    "date_joined": "2025-09-21T08:11:30.976412Z",
    "last_login": "2025-09-21T08:11:30.999038Z"
  }
}
```

### 3. Access Protected Endpoints

```bash
curl -X GET http://localhost:8001/api/auth/profile/ \
  -H "Authorization: Token 07132dc12c88d27439d5d3287905c2b1a0faef7b"
```

### 4. Python Example

```python
import requests

# Request OTP
response = requests.post('http://localhost:8001/api/auth/request-otp/', json={
    'email': 'user@example.com',
    'purpose': 'login'
})

if response.status_code == 200:
    # In debug mode, get the OTP code
    debug_code = response.json().get('debug_code')
    
    # Verify OTP
    verify_response = requests.post('http://localhost:8001/api/auth/verify-otp/', json={
        'email': 'user@example.com',
        'code': debug_code,
        'purpose': 'login'
    })
    
    if verify_response.status_code == 200:
        token = verify_response.json()['token']
        
        # Use token for authenticated requests
        headers = {'Authorization': f'Token {token}'}
        profile = requests.get('http://localhost:8001/api/auth/profile/', headers=headers)
        print(profile.json())
```

## Configuration

### Environment Variables

Add these to your `.env` file or environment:

```bash
# Email Configuration (Production)
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
OTP_RATE_LIMIT_ATTEMPTS=5

# Debug (Development only)
DJANGO_DEBUG=true
```

### Django Settings

The following settings have been configured in `smartanom/settings.py`:

```python
# Custom User Model
AUTH_USER_MODEL = 'accounts.User'

# REST Framework with Token Authentication
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.TokenAuthentication",
        "rest_framework.authentication.SessionAuthentication",
        "rest_framework.authentication.BasicAuthentication",
    ],
    # ... other settings
}
```

## Database Models

### User Model
- Email-based authentication (no username)
- Role-based access (admin/user)
- Email verification status
- Automatic staff privileges for admin users

### OTPCode Model
- 6-digit numeric codes
- 5-minute expiration
- Rate limiting (3 attempts max)
- Purpose tracking (login/register/reset)

### LoginAttempt Model
- Tracks all login attempts
- IP-based and email-based rate limiting
- Success/failure tracking

## Security Features

1. **Rate Limiting**: Max 5 failed attempts per 15 minutes per email/IP
2. **OTP Expiration**: Codes expire after 5 minutes
3. **Attempt Limiting**: Max 3 verification attempts per OTP
4. **Token Authentication**: Secure API access with Django REST Framework tokens
5. **Input Validation**: Comprehensive validation for all inputs
6. **SQL Injection Protection**: Django ORM provides protection
7. **CSRF Protection**: Django middleware enabled

## Admin Interface

Access the Django admin at `/admin/` to manage:

- **Users**: View, edit, and manage user accounts
- **OTP Codes**: Monitor active OTP codes and usage
- **Login Attempts**: Track authentication attempts and failures
- **Cleanup Actions**: Bulk cleanup of expired data

## Testing

Run the provided test script:

```bash
cd backend
python test_django_client.py
```

Or use the HTTP test script:

```bash
cd backend
python test_auth_api.py  # Requires running server
```

## Production Deployment

1. **Email Configuration**: Configure SMTP settings for production email
2. **Environment Variables**: Set all production environment variables
3. **Debug Mode**: Set `DJANGO_DEBUG=false`
4. **Security**: Configure HTTPS, secure headers, etc.
5. **Database**: Use PostgreSQL or MySQL for production
6. **Logging**: Monitor logs for authentication attempts and errors

## File Structure

```
backend/
├── apps/
│   └── accounts/
│       ├── __init__.py
│       ├── admin.py          # Django admin configuration
│       ├── apps.py           # App configuration
│       ├── models.py         # User, OTPCode, LoginAttempt models
│       ├── serializers.py    # API serializers
│       ├── urls.py           # URL patterns
│       ├── views.py          # API endpoints
│       ├── migrations/       # Database migrations
│       └── management/       # Management commands
├── smartanom/
│   ├── settings.py          # Updated with auth configuration
│   └── urls.py              # Updated with auth URLs
├── test_django_client.py    # Test script using Django test client
├── test_auth_api.py         # Test script using HTTP requests
└── logs/                    # Log files
```

## Troubleshooting

### Common Issues

1. **Migration Errors**: If you encounter migration issues with existing data, backup your database and reset migrations
2. **Email Not Sending**: In debug mode, OTP codes are printed to console. Check email configuration for production
3. **Rate Limiting**: If you hit rate limits during testing, wait 15 minutes or clear the LoginAttempt table
4. **Token Issues**: Tokens are single-use for login. Use the same token for subsequent authenticated requests

### Debug Mode

In debug mode:
- OTP codes are printed to console and returned in API responses
- Email backend uses console output instead of SMTP
- Additional logging is enabled

## Next Steps

1. **Frontend Integration**: Use the API endpoints in your React/Vue/Angular frontend
2. **Mobile Integration**: Use the same endpoints for mobile app authentication
3. **Email Templates**: Customize email templates in production
4. **Additional Features**: Consider adding password reset, account verification, etc.
5. **Monitoring**: Set up monitoring for authentication attempts and failures

## Support

For issues or questions:
1. Check the Django logs in `logs/django.log`
2. Review the test scripts for usage examples
3. Check the Django admin for data inspection
4. Verify environment variables and configuration
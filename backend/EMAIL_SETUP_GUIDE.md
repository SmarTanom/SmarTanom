# SmarTanom Email Configuration Guide

## Option 1: Gmail Setup (Recommended)

### 1. Enable 2-Factor Authentication
1. Go to your Google Account settings: https://myaccount.google.com/
2. Security → 2-Step Verification → Turn on

### 2. Generate App Password
1. Google Account → Security → 2-Step Verification
2. Scroll down to "App passwords"
3. Click "Generate" 
4. Choose "Mail" and "Windows Computer" (or Custom name: "SmarTanom")
5. Copy the 16-character password

### 3. Create Environment File
Create a `.env` file in your backend directory:

```env
# Email Configuration
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=true
EMAIL_HOST_USER=smartanom01@gmail.com
EMAIL_HOST_PASSWORD=your-16-character-app-password-here
DEFAULT_FROM_EMAIL=smartanom01@gmail.com

# Optional: Disable debug mode for email testing
DJANGO_DEBUG=false
```

## Option 2: Other Email Providers

### SendGrid
```env
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USE_TLS=true
EMAIL_HOST_USER=apikey
EMAIL_HOST_PASSWORD=your-sendgrid-api-key
DEFAULT_FROM_EMAIL=smartanom01@gmail.com
```

### Outlook/Hotmail
```env
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp-mail.outlook.com
EMAIL_PORT=587
EMAIL_USE_TLS=true
EMAIL_HOST_USER=your-email@outlook.com
EMAIL_HOST_PASSWORD=your-password
DEFAULT_FROM_EMAIL=your-email@outlook.com
```

## Quick Test Setup

1. **Install python-dotenv** (to load .env file):
```bash
pip install python-dotenv
```

2. **Update settings.py** to load .env file (already configured)

3. **Test email sending**:
```bash
python manage.py shell
```
Then run:
```python
from django.core.mail import send_mail
send_mail(
    'Test Email',
    'This is a test message.',
    'smartanom01@gmail.com',
    ['test@example.com'],
    fail_silently=False,
)
```
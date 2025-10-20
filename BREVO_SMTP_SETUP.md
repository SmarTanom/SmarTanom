# Brevo (Sendinblue) SMTP Setup

This project now uses SMTP via Brevo for transactional emails (OTP and alerts).

## 1) Environment variables

Add these to your backend .env (or Render dashboard):

- SMTP_HOST=smtp-relay.brevo.com
- SMTP_PORT=587
- SMTP_USER=your-brevo-smtp-username
- SMTP_PASS=your-brevo-smtp-password
- EMAIL_USE_TLS=true
- DEFAULT_FROM_EMAIL="SmarTanom <no-reply@yourdomain.com>"

Tip: You can also keep `EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend` in dev to print emails to the terminal instead of sending.

## 2) Verify sender/domain

In Brevo dashboard:
- Verify your sender email address or authenticate your domain (recommended for deliverability).
- Add SPF and DKIM DNS records provided by Brevo.

## 3) Code paths using email

- OTP emails: `apps.accounts.views.send_otp_email()` renders `templates/emails/otp_email.(html|txt)`.
- Device OTP/invite emails: `apps.devices.views` functions using `send_mail`/`EmailMultiAlternatives`.
- Alert emails: `apps.notifications.services` uses `EmailMultiAlternatives` and `templates/emails/alert_notification.(html|txt)`.

All of these now flow through Django's SMTP EmailBackend.

## 4) Test sending

Use the included management command to test your SMTP setup:

```powershell
cd backend
python manage.py sendtestemail your_email@example.com --code 654321
```

You should receive an email using the OTP template. Check spam folder if not in inbox.

## 5) Troubleshooting

- If you see "connection refused", double‑check host/port and that your server/network allows outbound 587.
- If messages land in spam, complete domain authentication (SPF/DKIM) and warm up sending gradually.
- Ensure DEFAULT_FROM_EMAIL uses a verified sender or your authenticated domain.
- Review backend logs: `backend/logs/django.log`.

## 6) Placeholders supported

- OTP templates accept both `{{ code }}` and `{{ otp }}` variables.
- Alert templates render `{{ alert_message }}`, `{{ alert_title }}`, etc.

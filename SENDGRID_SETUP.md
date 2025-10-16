# SendGrid Email Setup Guide

## ✅ What Was Fixed

### 1. **Custom SendGrid Email Backend**
- Removed dependency on `django-sendgrid-v5` (incompatible version)
- Created custom backend at `apps.common.email_backend.SendGridBackend`
- Uses SendGrid Python SDK directly for reliable email delivery
- Added `SENDGRID_API_KEY` configuration in settings
- Auto-detects SendGrid availability and falls back to console backend

### 2. **Improved Email Template (Anti-Spam Optimized)**
- Professional HTML email template with proper structure
- Table-based layout (better email client compatibility)
- Clear call-to-action with the OTP code
- Proper plain-text fallback
- Company branding and footer
- Mobile-responsive design

### 3. **Settings Configuration**
The settings now automatically:
- Use SendGrid when `SENDGRID_API_KEY` is set
- Fall back to console backend for local development
- Include proper email headers and formatting

## 🔧 Render Environment Variables

**Already Configured (Verify These):**
```
SENDGRID_API_KEY=SG.your_actual_key_here
DEFAULT_FROM_EMAIL=smartanom01@gmail.com
```

**Remove This Variable (No Longer Needed):**
```
EMAIL_BACKEND=sendgrid_backend.SendgridBackend  ❌ DELETE THIS
```

The backend is now auto-selected based on whether `SENDGRID_API_KEY` is present.

## 📧 SendGrid Setup for Deliverability (Avoid Spam)

### **Step 1: Verify Your Sender Email in SendGrid**

1. Go to [SendGrid Dashboard](https://app.sendgrid.com/)
2. Navigate to **Settings → Sender Authentication**
3. Click **Verify a Single Sender**
4. Add `smartanom01@gmail.com` and verify it via email
5. ⚠️ **CRITICAL:** You MUST verify this email or all emails will be blocked

### **Step 2: Set Up Domain Authentication (Recommended)**

To avoid spam folders, authenticate your domain:

1. In SendGrid: **Settings → Sender Authentication → Authenticate Your Domain**
2. Choose your DNS provider (e.g., Cloudflare, GoDaddy)
3. Add the CNAME records to your DNS
4. Wait for verification (can take up to 48 hours)

**Benefits:**
- ✅ Emails less likely to go to spam
- ✅ Better deliverability rates
- ✅ Professional appearance

### **Step 3: Enable Link Tracking (Optional)**

1. Go to **Settings → Tracking**
2. Enable **Click Tracking** and **Open Tracking**
3. This helps SendGrid reputation and provides analytics

### **Step 4: Set Up IP Warming (If Sending Large Volumes)**

If you plan to send many emails:
1. Start with small volumes (50-100/day)
2. Gradually increase over 2-4 weeks
3. This builds sender reputation

## 🚫 Avoiding Spam Folders - Best Practices

### **1. Content Guidelines**
✅ **DO:**
- Use clear, concise subject lines ("Your Login Code")
- Include company name and branding
- Provide an unsubscribe option (for marketing emails)
- Use professional language
- Include plain-text version

❌ **DON'T:**
- Use ALL CAPS in subject lines
- Include too many exclamation marks!!!
- Use spam trigger words (FREE, WIN, URGENT)
- Send without sender verification
- Use URL shorteners in transactional emails

### **2. Email Structure (Already Implemented)**
Our template includes:
- ✅ Proper HTML structure with DOCTYPE
- ✅ Table-based layout (email client compatible)
- ✅ Clear branding (SmarTanom header)
- ✅ Professional footer with year and contact info
- ✅ Plain-text fallback for email clients that don't support HTML
- ✅ Proper character encoding (UTF-8)
- ✅ Mobile-responsive design

### **3. SendGrid Configuration**
- ✅ Sandbox mode disabled for production
- ✅ Proper API key authentication
- ✅ Verified sender email
- ✅ Domain authentication (recommended)

### **4. Rate Limiting (Already Configured)**
Your OTP settings already include rate limiting:
```python
OTP_EXPIRE_MINUTES = 5
OTP_MAX_ATTEMPTS = 10
OTP_RATE_LIMIT_MINUTES = 15
OTP_RATE_LIMIT_ATTEMPTS = 50
```

## 🧪 Testing Email Delivery

### **Test 1: Local Development**
```bash
# In backend directory
python manage.py shell
```

```python
from django.core.mail import send_mail

send_mail(
    'Test Email',
    'This is a test message.',
    'smartanom01@gmail.com',
    ['your-email@example.com'],
    fail_silently=False,
)
```

### **Test 2: OTP Flow (Production)**
1. Go to `https://smartanom.onrender.com/admin`
2. Request an OTP code
3. Check your email inbox
4. If not in inbox, check spam folder
5. If in spam, mark as "Not Spam" to train filters

### **Test 3: Check SendGrid Activity**
1. Go to SendGrid Dashboard
2. Click **Activity** in left menu
3. View email delivery status, bounces, and spam reports

## 🔍 Troubleshooting

### **Problem: "SENDGRID_API_KEY not found"**
**Solution:** Ensure the environment variable is set in Render:
```
SENDGRID_API_KEY=SG.your_actual_key_here
```

### **Problem: "Emails go to spam"**
**Solutions:**
1. ✅ Verify sender email in SendGrid
2. ✅ Set up domain authentication
3. ✅ Ask recipients to whitelist `smartanom01@gmail.com`
4. ✅ Check SendGrid reputation score
5. ✅ Enable DKIM and SPF records in DNS

### **Problem: "Emails not sending"**
**Check:**
1. SendGrid API key is valid
2. Sender email is verified
3. Check Render logs for errors
4. Check SendGrid Activity feed for bounces

### **Problem: "Invalid sender email"**
**Solution:**
- Verify the sender email in SendGrid dashboard
- Use the EXACT email address you verified
- Don't use `noreply@` addresses without domain authentication

## 📊 SendGrid Dashboard - Key Metrics

Monitor these in SendGrid:
- **Requests:** Total emails sent
- **Delivered:** Successfully delivered
- **Opens:** Recipients who opened (if tracking enabled)
- **Clicks:** Recipients who clicked links
- **Bounces:** Failed deliveries (check why)
- **Spam Reports:** Users marked as spam (investigate)

## 🎯 Current Configuration Summary

**Email Backend:** `apps.common.email_backend.SendGridBackend` (custom implementation)
**API Key:** Set via `SENDGRID_API_KEY` environment variable
**From Email:** `smartanom01@gmail.com` (must be verified)
**Template:** Professional HTML + plain-text with anti-spam optimizations
**Fallback:** Console backend for local development
**Package:** `sendgrid>=6.0.0` (Python SDK directly, no Django wrapper needed)

## 📝 Next Steps After Deploy

1. **Commit and push** changes
2. **Redeploy** on Render
3. **Test OTP flow** from frontend
4. **Check SendGrid Activity** for successful delivery
5. **Verify email lands in inbox** (not spam)
6. If in spam: **Mark as "Not Spam"** and **set up domain authentication**

## 🔐 Security Notes

- ✅ API key stored as environment variable (not in code)
- ✅ HTTPS enforced for all connections
- ✅ Rate limiting enabled for OTP requests
- ✅ OTP codes expire in 5 minutes
- ✅ Failed attempts are tracked and limited

## 📞 Support

If emails still go to spam after following these steps:
1. Check SendGrid sender reputation
2. Contact SendGrid support for deliverability review
3. Consider using a custom domain with full authentication
4. Review SendGrid's [Email Deliverability Guide](https://sendgrid.com/blog/email-deliverability-guide/)

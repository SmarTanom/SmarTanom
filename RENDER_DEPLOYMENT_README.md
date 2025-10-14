# Deploying SmarTanom Backend to Render

This guide explains how to deploy the Django backend to Render while keeping localhost development functional.

## Prerequisites

1. A Render account (https://render.com)
2. Your project pushed to GitHub

## Deployment Steps

### 1. Connect Repository to Render

1. Go to https://dashboard.render.com
2. Click "New" → "Blueprint" or "Web Service"
3. Connect your GitHub repository
4. Render will detect the `render.yaml` file and configure services automatically

### 2. Configure Environment Variables

In your Render dashboard, go to your web service settings and add these environment variables:

```
DJANGO_SETTINGS_MODULE=smartanom.settings
DEBUG=false
SECRET_KEY=your-super-secret-production-key-change-this
ALLOWED_HOSTS=your-render-app-name.onrender.com
CORS_ALLOWED_ORIGINS=https://your-frontend-domain.com
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=true
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
DEFAULT_FROM_EMAIL=SmarTanom <noreply@yourdomain.com>
VAPID_ADMIN_EMAIL=admin@yourdomain.com
OTP_EXPIRE_MINUTES=10
OTP_MAX_ATTEMPTS=3
OTP_RATE_LIMIT_MINUTES=15
OTP_RATE_LIMIT_ATTEMPTS=50
LOG_LEVEL=INFO
```

**Important:** Generate a new SECRET_KEY using:
```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

### 3. Database Setup

Render will automatically create PostgreSQL and Redis databases based on `render.yaml`. The connection strings will be automatically injected as `DATABASE_URL` and `REDIS_URL`.

### 4. Deploy

1. Click "Create Web Service" in Render
2. Wait for the build and deployment to complete
3. Your API will be available at `https://your-app-name.onrender.com`

### 5. Post-Deployment Setup

1. Create a superuser:
   ```bash
   # Via Render shell or temporarily add this to your code
   python manage.py createsuperuser
   ```

2. Test the API:
   ```bash
   curl https://your-app-name.onrender.com/api/health/
   ```

## Local Development (Unaffected)

Your localhost development remains unchanged. Continue using:

```bash
cd backend
python manage.py runserver
```

The settings automatically detect the environment and adjust accordingly.

## Troubleshooting

### Common Issues

1. **ALLOWED_HOSTS error**: Ensure your Render domain is in ALLOWED_HOSTS
2. **Database connection failed**: Check DATABASE_URL is properly set
3. **Static files not loading**: The entrypoint script handles collectstatic
4. **Migrations not running**: Check the entrypoint logs

### Viewing Logs

In Render dashboard:
- Go to your web service
- Click "Logs" tab
- Check for any errors during startup

### Environment Variables

Double-check these are set correctly:
- `DEBUG=false` (important for production)
- `SECRET_KEY` (must be unique and secret)
- `ALLOWED_HOSTS` (include your Render domain)
- Email settings (for OTP functionality)

## Security Notes

- Never commit secrets to version control
- Use Render's environment variable management
- Regularly rotate SECRET_KEY and database passwords
- Keep DEBUG=false in production

## Updating Deployment

When you push changes to your main branch:
1. Render will automatically rebuild and deploy
2. Database migrations run automatically
3. Static files are collected automatically

## Cost Optimization

- The free tier should be sufficient for development/testing
- Monitor usage in Render dashboard
- Consider upgrading if you need more resources

## Support

If you encounter issues:
1. Check Render logs
2. Verify environment variables
3. Test locally first
4. Refer to Django deployment documentation

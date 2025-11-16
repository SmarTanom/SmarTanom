# Cloudinary Media Storage Setup

This project supports optional media storage on Cloudinary. When enabled, file uploads (user avatars, attachments, etc.) are stored on Cloudinary and served via a CDN—ideal for Render's free plan where persistent disks are limited.

## What gets changed when enabled
- `INSTALLED_APPS` dynamically adds `cloudinary` and `cloudinary_storage`.
- Django `STORAGES["default"]` is switched to `cloudinary_storage.storage.MediaCloudinaryStorage`.
- Static files remain served by WhiteNoise; only MEDIA uploads go to Cloudinary.

Activation is automatic when the `CLOUDINARY_URL` environment variable is present.

## 1) Install dependencies (already included)
The backend `requirements.txt` already includes:
- `cloudinary`
- `django-cloudinary-storage`

No extra install steps are needed.

## 2) Create a Cloudinary account
- Go to https://cloudinary.com/ and sign up.
- In your dashboard, find your API credentials (Cloud name, API Key, API Secret).

## 3) Set the environment variable
Set the single `CLOUDINARY_URL` environment variable in this form:

```
cloudinary://<api_key>:<api_secret>@<cloud_name>
```

Examples:
- Local: put it in `backend/.env`
- Render: set it in the service environment (render.yaml already includes the placeholder)

See `backend/env.example` for a commented placeholder.

## 4) Local verification
1. Ensure your `.env` includes `CLOUDINARY_URL`.
2. Run migrations and start the server:
   ```powershell
   cd C:\Users\Administrator\Desktop\SmarTanom\backend
   python manage.py migrate
   python manage.py runserver
   ```
3. Upload any media via the app (e.g., a user avatar if available) or the Django admin for any Image/FileField.
4. Check your Cloudinary Media Library — a new upload folder (often `smartanom`) should contain your files.

## 5) Render deployment
This repo ships with `render.yaml` configured to accept `CLOUDINARY_URL`.
- In Render dashboard, open the `smartanom-backend` service
- Add an Environment Variable named `CLOUDINARY_URL` with your value
- Redeploy. On startup, the backend will switch MEDIA storage to Cloudinary.

## 6) Optional explicit configuration
The integration works with `CLOUDINARY_URL` only. If you prefer explicit keys, you can also set (not required):
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

The code is ready to accept these by uncommenting the `CLOUDINARY_STORAGE` block in `smartanom/settings.py`.

## Notes
- Static files (JS/CSS) are still served by WhiteNoise from `STATIC_ROOT`. Only MEDIA uploads go to Cloudinary.
- In development without `CLOUDINARY_URL`, uploads go to the local `media/` directory.
- No code changes or migrations are required to toggle Cloudinary on/off—just the environment variable.

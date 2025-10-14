# Backend Environment Setup

## Environment Variables

The backend uses environment variables for configuration. You'll need to set up your own `.env` file.

### Setup Instructions:

1. **Copy the template:**
   ```bash
   cp .env.example .env
   ```

2. **Edit the `.env` file and replace the placeholder values:**

   - `EMAIL_HOST_USER`: Your Gmail address
   - `EMAIL_HOST_PASSWORD`: Your Gmail app password (not your regular password)
   - `DJANGO_SECRET_KEY`: Generate a secure secret key
   - Other settings as needed

### Getting a Gmail App Password:

1. Enable 2-factor authentication on your Google account
2. Go to [Google App Passwords](https://myaccount.google.com/apppasswords)
3. Generate a new app password for "Mail"
4. Use the generated 16-character password (with spaces removed)

### Generating a Django Secret Key:

```python
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

### Important Security Notes:

- **Never commit `.env` files** to version control
- The `.env` file is already in `.gitignore`
- Use different secret keys for development and production
- Use strong, unique passwords for production

### Development vs Production:

- **Development**: Use local SQLite database (default) with console email backend
- **Production**: Configure PostgreSQL/MySQL database and SMTP email settings

## Local Development Setup

For development, after setting up your `.env` file:

```bash
# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Start development server
python manage.py runserver
```

The backend will use SQLite by default for development, which requires no additional setup.

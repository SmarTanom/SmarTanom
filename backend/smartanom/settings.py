"""Django settings for smartanom project.

Single-module settings file. (Planned modular split not yet applied.)
"""

from __future__ import annotations

import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

# Ensure logs directory exists (avoid FileHandler errors inside container)
(BASE_DIR / "logs").mkdir(exist_ok=True)

# SECURITY WARNING: keep the secret key used in production secret!
# Support both DJANGO_SECRET_KEY and generic SECRET_KEY (compose/prod convenience)
SECRET_KEY = (
	os.getenv("DJANGO_SECRET_KEY")
	or os.getenv("SECRET_KEY")
	or "dev-insecure-secret-key-change-me"  # nosec - placeholder for development
)

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = (
	os.getenv("DJANGO_DEBUG")
	or os.getenv("DEBUG")
	or "true"
).lower() == "true"

# Accept both DJANGO_ALLOWED_HOSTS and ALLOWED_HOSTS (comma separated)
ALLOWED_HOSTS: list[str] = (
	os.getenv("DJANGO_ALLOWED_HOSTS")
	or os.getenv("ALLOWED_HOSTS")
	or "*"
).split(",")


# Application definition

INSTALLED_APPS = [
	"django.contrib.admin",
	"django.contrib.auth",
	"django.contrib.contenttypes",
	"django.contrib.sessions",
	"django.contrib.messages",
	"django.contrib.staticfiles",
	# Third-party
	"corsheaders",
	"rest_framework",
	"rest_framework.authtoken",
	"django_filters",
	# Local apps
	"apps.accounts",
	"apps.monitoring",
]

MIDDLEWARE = [
	"django.middleware.security.SecurityMiddleware",
	"corsheaders.middleware.CorsMiddleware",
	"django.contrib.sessions.middleware.SessionMiddleware",
	"django.middleware.common.CommonMiddleware",
	"django.middleware.csrf.CsrfViewMiddleware",
	"django.contrib.auth.middleware.AuthenticationMiddleware",
	"django.contrib.messages.middleware.MessageMiddleware",
	"django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "smartanom.urls"

TEMPLATES = [
	{
		"BACKEND": "django.template.backends.django.DjangoTemplates",
		"DIRS": [BASE_DIR / "templates"],
		"APP_DIRS": True,
		"OPTIONS": {
			"context_processors": [
				"django.template.context_processors.debug",
				"django.template.context_processors.request",
				"django.contrib.auth.context_processors.auth",
				"django.contrib.messages.context_processors.messages",
			],
		},
	},
]

WSGI_APPLICATION = "smartanom.wsgi.application"
ASGI_APPLICATION = "smartanom.asgi.application"


"""Database configuration.

Priority:
1. If DATABASE_URL provided, parse it.
2. Else use discrete DB_* variables.
Falls back to SQLite.
"""

from urllib.parse import urlparse  # noqa: E402 (import after docstring for clarity)

database_url = os.getenv("DATABASE_URL")
if database_url:
	parsed = urlparse(database_url)
	engine_map = {
		"postgres": "django.db.backends.postgresql",
		"postgresql": "django.db.backends.postgresql",
		"pgsql": "django.db.backends.postgresql",
	}
	scheme = parsed.scheme.split("+")[0]
	db_engine = engine_map.get(scheme, "django.db.backends.sqlite3")
	db_name = parsed.path.lstrip("/") or "postgres"
	DATABASES = {
		"default": {
			"ENGINE": db_engine,
			"NAME": db_name,
			"USER": parsed.username or "",
			"PASSWORD": parsed.password or "",
			"HOST": parsed.hostname or "",
			"PORT": str(parsed.port or ""),
		}
	}
else:
	DATABASES = {
		"default": {
			"ENGINE": os.getenv("DB_ENGINE", "django.db.backends.sqlite3"),
			"NAME": os.getenv("DB_NAME", BASE_DIR / "db.sqlite3"),
			"USER": os.getenv("DB_USER", ""),
			"PASSWORD": os.getenv("DB_PASSWORD", ""),
			"HOST": os.getenv("DB_HOST", ""),
			"PORT": os.getenv("DB_PORT", ""),
		}
	}


# Password validation
AUTH_PASSWORD_VALIDATORS = [
	{"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
	{"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator", "OPTIONS": {"min_length": 9}},
	{"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
	{"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]


LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True


STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_DIRS = [BASE_DIR / "static"] if (BASE_DIR / "static").exists() else []

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# CORS (development permissive; tighten in production)
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = [
	'*'
]
CORS_ALLOW_METHODS = [
	'GET','POST','PUT','PATCH','DELETE','OPTIONS'
]


# Django REST Framework configuration
REST_FRAMEWORK = {
	"DEFAULT_PERMISSION_CLASSES": [
		"rest_framework.permissions.IsAuthenticated",
	],
	"DEFAULT_AUTHENTICATION_CLASSES": [
		"rest_framework.authentication.TokenAuthentication",
		"rest_framework.authentication.SessionAuthentication",
		"rest_framework.authentication.BasicAuthentication",
	],
	"DEFAULT_FILTER_BACKENDS": [
		"django_filters.rest_framework.DjangoFilterBackend",
		"rest_framework.filters.SearchFilter",
		"rest_framework.filters.OrderingFilter",
	],
	"DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
	"PAGE_SIZE": 50,
	# Throttling (basic default; can tune rates via env)
	"DEFAULT_THROTTLE_CLASSES": [
		"rest_framework.throttling.UserRateThrottle",
		"rest_framework.throttling.AnonRateThrottle",
	],
	"DEFAULT_THROTTLE_RATES": {
		"user": os.getenv("DRF_USER_THROTTLE", "5000/day"),
		"anon": os.getenv("DRF_ANON_THROTTLE", "1000/day"),
	},
}

# Simple user auth redirect defaults
LOGIN_URL = "/admin/login/"
LOGIN_REDIRECT_URL = "/admin/"

# Basic security improvements toggled for production
if not DEBUG:
	# Core cookie & transport security
	SESSION_COOKIE_SECURE = True  # noqa: N816
	CSRF_COOKIE_SECURE = True
	SESSION_COOKIE_SAMESITE = os.getenv("SESSION_COOKIE_SAMESITE", "Lax")
	CSRF_COOKIE_SAMESITE = os.getenv("CSRF_COOKIE_SAMESITE", "Lax")
	SECURE_BROWSER_XSS_FILTER = True
	SECURE_CONTENT_TYPE_NOSNIFF = True
	X_FRAME_OPTIONS = "DENY"
	SECURE_SSL_REDIRECT = os.getenv("SECURE_SSL_REDIRECT", "true").lower() == "true"
	SECURE_REFERRER_POLICY = "strict-origin-when-cross-origin"
	# HSTS
	SECURE_HSTS_SECONDS = int(os.getenv("SECURE_HSTS_SECONDS", "31536000"))
	SECURE_HSTS_INCLUDE_SUBDOMAINS = True
	SECURE_HSTS_PRELOAD = True
	# CSRF trusted origins (comma separated, auto https:// prefix optional)
	_csrf_origins = os.getenv("CSRF_TRUSTED_ORIGINS", "")
	if _csrf_origins:
		CSRF_TRUSTED_ORIGINS = [o.strip() for o in _csrf_origins.split(",") if o.strip()]  # noqa: F401

# Simple optional admin path obfuscation (override via env)
ADMIN_URL = os.getenv("ADMIN_URL", "admin/")


# Custom User Model
AUTH_USER_MODEL = 'accounts.User'

# Email Configuration
EMAIL_BACKEND = os.getenv('EMAIL_BACKEND', 'django.core.mail.backends.console.EmailBackend')
EMAIL_HOST = os.getenv('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.getenv('EMAIL_PORT', '587'))
EMAIL_USE_TLS = os.getenv('EMAIL_USE_TLS', 'true').lower() == 'true'
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD', '')
DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL', 'noreply@smartanom.com')

# OTP Configuration
OTP_EXPIRE_MINUTES = int(os.getenv('OTP_EXPIRE_MINUTES', '5'))
OTP_MAX_ATTEMPTS = int(os.getenv('OTP_MAX_ATTEMPTS', '3'))
OTP_RATE_LIMIT_MINUTES = int(os.getenv('OTP_RATE_LIMIT_MINUTES', '15'))
OTP_RATE_LIMIT_ATTEMPTS = int(os.getenv('OTP_RATE_LIMIT_ATTEMPTS', '5'))

# Logging Configuration
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'file': {
            'level': 'INFO',
            'class': 'logging.FileHandler',
            'filename': BASE_DIR / 'logs' / 'django.log',
            'formatter': 'verbose',
        },
        'console': {
            'level': 'DEBUG' if DEBUG else 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'simple',
        },
    },
    'root': {
        'handlers': ['console', 'file'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': False,
        },
        'apps.accounts': {
            'handlers': ['console', 'file'],
            'level': 'DEBUG' if DEBUG else 'INFO',
            'propagate': False,
        },
    },
}


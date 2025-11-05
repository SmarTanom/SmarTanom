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
	or ""
).split(",")

# In development, allow all hosts to support LAN IP access (e.g., 192.168.x.x)
if DEBUG:
	ALLOWED_HOSTS = ["*"]
else:
	# In production (including Render), ensure proper host configuration
	# Always include the public Render hostname
	render_host = os.getenv("RENDER_EXTERNAL_URL")
	if render_host:
		domain = render_host.replace("https://", "").split("/")[0]
		if domain and domain not in ALLOWED_HOSTS:
			ALLOWED_HOSTS.append(domain)
	# Explicitly include the canonical hostname as requested
	if "smartanom.onrender.com" not in ALLOWED_HOSTS:
		ALLOWED_HOSTS.append("smartanom.onrender.com")


# Application definition

INSTALLED_APPS = [
	"daphne",  # Must be first for Channels to work properly
	"django.contrib.admin",
	"django.contrib.auth",
	"django.contrib.contenttypes",
	"django.contrib.sessions",
	"django.contrib.messages",
	"django.contrib.staticfiles",
	# Third-party
	"channels",  # WebSocket support
	"corsheaders",
	"rest_framework",
	"rest_framework.authtoken",
	"rest_framework_simplejwt",  # JWT authentication
	"django_filters",
	# Local apps
	"apps.accounts",
	"apps.common",
	"apps.devices",
	"apps.notifications",
	"apps.sensors",
	"apps.reservoirs",
]

MIDDLEWARE = [
	"django.middleware.security.SecurityMiddleware",
	"whitenoise.middleware.WhiteNoiseMiddleware",  # Serve static files in production
	"corsheaders.middleware.CorsMiddleware",
	"django.contrib.sessions.middleware.SessionMiddleware",
	"django.middleware.common.CommonMiddleware",
	"django.middleware.csrf.CsrfViewMiddleware",
	"django.contrib.auth.middleware.AuthenticationMiddleware",
	"django.contrib.messages.middleware.MessageMiddleware",
	"django.middleware.clickjacking.XFrameOptionsMiddleware",
]

# Add development auto-login middleware in DEBUG mode
if DEBUG:
	MIDDLEWARE.append("apps.common.middleware.DevAutoLoginMiddleware")

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

# Timezone Configuration
# Set to Singapore timezone (detected from your system) or override with DJANGO_TIME_ZONE env var
TIME_ZONE = os.getenv("DJANGO_TIME_ZONE") or "Asia/Singapore"

USE_I18N = True
USE_TZ = True


STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_DIRS = [BASE_DIR / "static"] if (BASE_DIR / "static").exists() else []

# WhiteNoise configuration for efficient static file serving in production
STORAGES = {
	"default": {
		"BACKEND": "django.core.files.storage.FileSystemStorage",
	},
	"staticfiles": {
		"BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
	},
}

# Media files (uploads)
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

# Ensure media directory exists
MEDIA_ROOT.mkdir(exist_ok=True)

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# CORS Configuration
if DEBUG:
	# Development: permissive CORS
	CORS_ALLOW_ALL_ORIGINS = True
	CORS_ALLOW_CREDENTIALS = True
else:
	# Production: restrict CORS to specific origins
	def _normalize_origin(origin: str) -> str | None:
		"""Ensure origin has scheme. Returns https://<host> if scheme missing.

		django-cors-headers requires fully-qualified origins, e.g., https://example.com
		"""
		if not origin:
			return None
		o = origin.strip()
		if not o:
			return None
		if o.startswith("http://") or o.startswith("https://"):
			return o
		# Default to https for bare hostnames
		return f"https://{o}"

	raw_origins = [o.strip() for o in os.getenv("CORS_ALLOWED_ORIGINS", "").split(",") if o.strip()]
	CORS_ALLOWED_ORIGINS: list[str] = []
	for o in raw_origins:
		no = _normalize_origin(o)
		if no and no not in CORS_ALLOWED_ORIGINS:
			CORS_ALLOWED_ORIGINS.append(no)

	# Include common env-provided frontend URLs if set
	for extra_env in ("FRONTEND_URL", "NETLIFY_URL"):
		val = os.getenv(extra_env, "").strip()
		no = _normalize_origin(val)
		if no and no not in CORS_ALLOWED_ORIGINS:
			CORS_ALLOWED_ORIGINS.append(no)

	# Ensure canonical backend origin is present (rarely needed for CORS but harmless)
	if "https://smartanom.onrender.com" not in CORS_ALLOWED_ORIGINS:
		CORS_ALLOWED_ORIGINS.append("https://smartanom.onrender.com")
	CORS_ALLOW_CREDENTIALS = True

CORS_ALLOW_HEADERS = [
	'accept',
	'accept-encoding',
	'authorization',
	'content-type',
	'dnt',
	'origin',
	'user-agent',
	'x-csrftoken',
	'x-requested-with',
]
CORS_ALLOW_METHODS = [
	'DELETE',
	'GET',
	'OPTIONS',
	'PATCH',
	'POST',
	'PUT',
]


# Django REST Framework configuration
REST_FRAMEWORK = {
	"DEFAULT_PERMISSION_CLASSES": [
		"rest_framework.permissions.IsAuthenticated",
	],
	"DEFAULT_AUTHENTICATION_CLASSES": [
		"rest_framework_simplejwt.authentication.JWTAuthentication",  # JWT (primary)
		"rest_framework.authentication.TokenAuthentication",          # OTP Token (fallback)
		"rest_framework.authentication.SessionAuthentication",        # Session (fallback)
		"rest_framework.authentication.BasicAuthentication",          # Basic (dev/testing)
	],
	"DEFAULT_FILTER_BACKENDS": [
		"django_filters.rest_framework.DjangoFilterBackend",
		"rest_framework.filters.SearchFilter",
		"rest_framework.filters.OrderingFilter",
	],
	"DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
	"PAGE_SIZE": 50,
	# Throttling configuration
	"DEFAULT_THROTTLE_CLASSES": [
		"rest_framework.throttling.UserRateThrottle",
		"rest_framework.throttling.AnonRateThrottle",
	],
	"DEFAULT_THROTTLE_RATES": {
		"user": os.getenv("DRF_USER_THROTTLE", "100000/day"),  # Increased for development
		"anon": os.getenv("DRF_ANON_THROTTLE", "10000/day"),   # Increased for development
		# OTP-specific throttling
		"otp_request": os.getenv("OTP_REQUEST_THROTTLE", "100/hour"),  # Increased for development
		"otp_verify": os.getenv("OTP_VERIFY_THROTTLE", "200/hour"),    # Increased for development
		"login_attempt": os.getenv("LOGIN_ATTEMPT_THROTTLE", "300/hour"), # Increased for development
		# Device provisioning throttling
		"device_provision": os.getenv("DEVICE_PROVISION_THROTTLE_RATE", "10/hour"),
	},
}

# Simple user auth redirect defaults
LOGIN_URL = "/admin/login/"
LOGIN_REDIRECT_URL = "/admin/"

# Security settings (applied based on DEBUG mode)
if not DEBUG:
	# Production security settings
	# Tell Django to trust the X-Forwarded-Proto header from Render's proxy
	SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

	SESSION_COOKIE_SECURE = True
	CSRF_COOKIE_SECURE = True
	SESSION_COOKIE_SAMESITE = os.getenv("SESSION_COOKIE_SAMESITE", "Lax")
	CSRF_COOKIE_SAMESITE = os.getenv("CSRF_COOKIE_SAMESITE", "Lax")
	SECURE_BROWSER_XSS_FILTER = True
	SECURE_CONTENT_TYPE_NOSNIFF = True
	X_FRAME_OPTIONS = "DENY"
	SECURE_SSL_REDIRECT = os.getenv("SECURE_SSL_REDIRECT", "true").lower() == "true"
	SECURE_REFERRER_POLICY = "strict-origin-when-cross-origin"

	# HSTS (HTTP Strict Transport Security)
	SECURE_HSTS_SECONDS = int(os.getenv("SECURE_HSTS_SECONDS", "31536000"))  # 1 year
	SECURE_HSTS_INCLUDE_SUBDOMAINS = True
	SECURE_HSTS_PRELOAD = True

	# CSRF trusted origins for production
	_csrf_origins = os.getenv("CSRF_TRUSTED_ORIGINS", "")
	def _norm_csrf(o: str) -> str | None:
		o = (o or "").strip()
		if not o:
			return None
		if o.startswith("http://") or o.startswith("https://"):
			return o
		return f"https://{o}"
	if _csrf_origins:
		CSRF_TRUSTED_ORIGINS = []
		for o in _csrf_origins.split(","):
			no = _norm_csrf(o)
			if no and no not in CSRF_TRUSTED_ORIGINS:
				CSRF_TRUSTED_ORIGINS.append(no)
	else:
		CSRF_TRUSTED_ORIGINS = []
	# Ensure canonical origin is present
	if "https://smartanom.onrender.com" not in CSRF_TRUSTED_ORIGINS:
		CSRF_TRUSTED_ORIGINS.append("https://smartanom.onrender.com")
else:
	# Development: More permissive settings
	SESSION_COOKIE_SECURE = False
	CSRF_COOKIE_SECURE = False
	SECURE_SSL_REDIRECT = False

# Simple optional admin path obfuscation (override via env)
ADMIN_URL = os.getenv("ADMIN_URL", "admin/")


# Custom User Model
AUTH_USER_MODEL = 'accounts.User'

"""
Email configuration (Brevo SMTP by default)

Environment variables supported:
  - SMTP_HOST (e.g., smtp-relay.brevo.com)
  - SMTP_PORT (e.g., 587)
  - SMTP_USER (Brevo SMTP username)
  - SMTP_PASS (Brevo SMTP password)
  - EMAIL_USE_TLS (true/false; defaults true)
  - DEFAULT_FROM_EMAIL (e.g., SmarTanom <noreply@yourdomain.com>)

Backwards-compatibility:
  If EMAIL_HOST/EMAIL_PORT/EMAIL_HOST_USER/EMAIL_HOST_PASSWORD are set, they are used as fallback.
"""

# Resolve SMTP host/port/user/pass from new Brevo-style envs, with legacy fallbacks
SMTP_HOST = os.getenv('SMTP_HOST') or os.getenv('EMAIL_HOST', '')
SMTP_PORT = os.getenv('SMTP_PORT') or os.getenv('EMAIL_PORT', '')
SMTP_USER = os.getenv('SMTP_USER') or os.getenv('EMAIL_HOST_USER', '')
SMTP_PASS = os.getenv('SMTP_PASS') or os.getenv('EMAIL_HOST_PASSWORD', '')
EMAIL_USE_TLS = os.getenv('EMAIL_USE_TLS', 'true').lower() == 'true'

# Choose email backend: allow explicit override via EMAIL_BACKEND env var
_env_email_backend = os.getenv('EMAIL_BACKEND', '').strip()
if _env_email_backend:
	EMAIL_BACKEND = _env_email_backend
else:
	# Default logic: use SMTP when SMTP_HOST provided, else console in dev
	if SMTP_HOST:
		EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
	else:
		EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# Map to Django email settings if SMTP is configured
if EMAIL_BACKEND.endswith('smtp.EmailBackend'):
	EMAIL_HOST = SMTP_HOST
	EMAIL_PORT = int(SMTP_PORT or '587')
	EMAIL_HOST_USER = SMTP_USER
	EMAIL_HOST_PASSWORD = SMTP_PASS
	# TLS is recommended for Brevo on 587
	# EMAIL_USE_TLS already computed above

# Optional transport override: 'smtp' (default) or 'brevo_api'
EMAIL_TRANSPORT = os.getenv('EMAIL_TRANSPORT', 'smtp').strip().lower()

# Brevo API key for HTTP transport (no SMTP ports needed)
BREVO_API_KEY = os.getenv('BREVO_API_KEY', '').strip()

# From email (should be verified in Brevo)
DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL', 'SmarTanom <no-reply@smartanom.com>')

# OTP Configuration
OTP_EXPIRE_MINUTES = int(os.getenv('OTP_EXPIRE_MINUTES', '5'))
OTP_MAX_ATTEMPTS = int(os.getenv('OTP_MAX_ATTEMPTS', '10'))  # Increased for development
OTP_RATE_LIMIT_MINUTES = int(os.getenv('OTP_RATE_LIMIT_MINUTES', '15'))
OTP_RATE_LIMIT_ATTEMPTS = int(os.getenv('OTP_RATE_LIMIT_ATTEMPTS', '50'))  # Increased for development

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
		# Reduce verbosity from Django's internal development server (basehttp)
		# which logs "- Broken pipe from ..." at INFO. In development this is
		# usually harmless (clients disconnecting / polling). Set to WARNING to
		# avoid noisy logs while keeping errors visible.
		'django.server': {
			'handlers': ['console', 'file'],
			'level': 'WARNING',
			'propagate': False,
		},
        'apps.accounts': {
            'handlers': ['console', 'file'],
            'level': 'DEBUG' if DEBUG else 'INFO',
            'propagate': False,
        },
        'apps.notifications': {
            'handlers': ['console', 'file'],
            'level': 'DEBUG' if DEBUG else 'INFO',
            'propagate': False,
        },
    },
}

# =============================================
# Web Push Notifications (VAPID)
# =============================================
# Generate keys with: python manage.py generate_vapid_keys
VAPID_PUBLIC_KEY = os.getenv('VAPID_PUBLIC_KEY', '')
VAPID_PRIVATE_KEY = os.getenv('VAPID_PRIVATE_KEY', '')
VAPID_ADMIN_EMAIL = os.getenv('VAPID_ADMIN_EMAIL', 'admin@smartanom.com')
VAPID_CLAIMS = {
    'sub': f'mailto:{VAPID_ADMIN_EMAIL}'
}

# =============================================
# Django Channels & WebSocket Configuration
# =============================================
ASGI_APPLICATION = 'smartanom.asgi.application'
USE_X_FORWARDED_HOST = True

# Channel Layers for WebSocket communication
REDIS_URL = os.getenv('REDIS_URL', '').strip()
# Pub/Sub channel for streaming sensor readings (ESP32 -> Upstash -> Backend)
REDIS_PUBSUB_CHANNEL = os.getenv('REDIS_PUBSUB_CHANNEL', 'smartanom:sensors').strip()

# Optional Upstash REST credentials (used by publishers like ESP32; backend does not need the REST token)
UPSTASH_REDIS_REST_URL = os.getenv('UPSTASH_REDIS_REST_URL', '').strip()
UPSTASH_REDIS_REST_TOKEN = os.getenv('UPSTASH_REDIS_REST_TOKEN', '').strip()

use_redis_layer = False
# Toggle global broadcast usage to save Redis commands on free tiers
# Default: enabled in DEBUG, disabled in production unless explicitly set true
WS_GLOBAL_BROADCAST = os.getenv('WS_GLOBAL_BROADCAST', 'true' if DEBUG else 'false').lower() == 'true'
if REDIS_URL:
	# Validate and normalize REDIS_URL (auto-upgrade to TLS for providers like Upstash)
	from urllib.parse import urlparse as _urlparse, urlunparse as _urlunparse

	try:
		parsed = _urlparse(REDIS_URL)
		scheme = (parsed.scheme or '').lower()
		host = parsed.hostname
		port = parsed.port  # may be None (defaults to 6379)

		if scheme in ("redis", "rediss") and host:
			# Heuristic: If connecting to a TLS-required host (e.g., *.upstash.io) on 6379 without TLS,
			# transparently upgrade to rediss:// to prevent server-side connection closes.
			force_tls_env = os.getenv('REDIS_FORCE_TLS', '').lower() == 'true'
			is_upstash = (host or '').endswith('upstash.io')
			default_redis_port = (port is None) or (int(port) == 6379)
			if scheme == 'redis' and (force_tls_env or is_upstash and default_redis_port):
				parsed = parsed._replace(scheme='rediss')
				REDIS_URL = _urlunparse(parsed)
				scheme = 'rediss'
				print("[Channels] NOTE: Upgraded Redis URL to TLS (rediss) based on host/port heuristics.")

			# Build a channels_redis config. When using TLS, be explicit.
			netloc = parsed.netloc or ''
			safe_host = f"{scheme}://{netloc.split('@')[-1]}"
			print(f"[Channels] Using Redis channel layer: {safe_host}")

			if scheme == 'rediss':
				# For TLS, prefer passing a rediss:// URL only. Avoid 'ssl': True,
				# which is incompatible with newer redis-py asyncio (TypeError on 'ssl').
				hosts = [REDIS_URL]
			else:
				hosts = [REDIS_URL]

			redis_config = {
				'hosts': hosts,
				'capacity': 1500,
				'expiry': 10,
				'group_expiry': 60,
			}
			# Add brpop_timeout only if supported by installed channels_redis
			try:
				import inspect  # noqa: F401
				from channels_redis.core import RedisChannelLayer  # type: ignore
				params = set(inspect.signature(RedisChannelLayer.__init__).parameters.keys())
				if 'brpop_timeout' in params:
					redis_config['brpop_timeout'] = int(os.getenv('CHANNELS_REDIS_BRPOP_TIMEOUT', '120'))
				else:
					print("[Channels] INFO: Installed channels_redis does not support brpop_timeout; skipping.")
			except Exception as _sig_e:
				print(f"[Channels] INFO: Could not inspect channels_redis for brpop_timeout support: {_sig_e}")
			CHANNEL_LAYERS = {
				'default': {
					'BACKEND': 'channels_redis.core.RedisChannelLayer',
					'CONFIG': redis_config,
				},
			}
			use_redis_layer = True
		else:
			print(f"[Channels] WARNING: Invalid REDIS_URL '{REDIS_URL}'. Expected redis[s]://<host>[:port]. Falling back to in-memory channel layer.")
	except Exception as _e:
		print(f"[Channels] WARNING: Failed to parse REDIS_URL '{REDIS_URL}': {_e}. Falling back to in-memory channel layer.")

if not use_redis_layer:
	# Development or misconfigured production: Use in-memory channel layer (single-worker only)
	if not DEBUG:
		print("[Channels] WARNING: Using in-memory channel layer (REDIS_URL unset/invalid). This is NOT recommended for production.")
	else:
		print("[Channels] Using in-memory channel layer (dev mode)")
	CHANNEL_LAYERS = {
		'default': {
			'BACKEND': 'channels.layers.InMemoryChannelLayer',
		},
	}

# =============================================
# JWT Authentication (Simple JWT)
# =============================================
from datetime import timedelta

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),  # Short-lived access tokens
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),     # Long-lived refresh tokens
    'ROTATE_REFRESH_TOKENS': True,                   # Issue new refresh token on refresh
    'BLACKLIST_AFTER_ROTATION': False,               # Don't blacklist old tokens (no blacklist app)
    'UPDATE_LAST_LOGIN': True,                       # Update last_login on token refresh

    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'VERIFYING_KEY': None,
    'AUDIENCE': None,
    'ISSUER': None,

    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',

    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
    'TOKEN_TYPE_CLAIM': 'token_type',

    'JTI_CLAIM': 'jti',
}

# =============================================
# Frontend URLs (for CORS)
# =============================================
FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:5173')
# Support multiple frontend URLs for different environments
FRONTEND_URLS = [
    'http://localhost:5173',      # Vite dev server
    'http://localhost:5174',      # Alternative port
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
]

# Add production frontend URL from environment
netlify_url = os.getenv('NETLIFY_URL')
if netlify_url and netlify_url not in FRONTEND_URLS:
    FRONTEND_URLS.append(netlify_url)

# Allow additional frontend hosts provided via env (CSV)
extra_frontend = os.getenv('FRONTEND_URLS', '')
if extra_frontend:
	for u in extra_frontend.split(','):
		u = u.strip()
		if u and u not in FRONTEND_URLS:
			FRONTEND_URLS.append(u)

# CORS and CSRF trusted origins
if DEBUG:
	CORS_ALLOW_ALL_ORIGINS = True
	CORS_ALLOW_CREDENTIALS = True
	CSRF_TRUSTED_ORIGINS = [
		'http://localhost:5173',
		'http://192.168.56.1:5173',
		'http://192.168.1.12:5173',
	]
else:
	# Production: accept Render and provided frontend origins
	CORS_ALLOW_ALL_ORIGINS = os.getenv('CORS_ALLOW_ALL_ORIGINS', 'false').lower() == 'true'
	CORS_ALLOW_CREDENTIALS = True
	_csrf = os.getenv('CSRF_TRUSTED_ORIGINS', '')
	def _norm_csrf2(o: str) -> str | None:
		o = (o or '').strip()
		if not o:
			return None
		if o.startswith('http://') or o.startswith('https://'):
			return o
		return f'https://{o}'
	CSRF_TRUSTED_ORIGINS = []
	for o in [p for p in _csrf.split(',') if p.strip()]:
		no = _norm_csrf2(o)
		if no and no not in CSRF_TRUSTED_ORIGINS:
			CSRF_TRUSTED_ORIGINS.append(no)
	# Include common frontend envs
	for extra_env in ('FRONTEND_URL', 'NETLIFY_URL'):
		val = os.getenv(extra_env, '').strip()
		no = _norm_csrf2(val)
		if no and no not in CSRF_TRUSTED_ORIGINS:
			CSRF_TRUSTED_ORIGINS.append(no)
	# Always include Render external URL if available
	render_external = os.getenv('RENDER_EXTERNAL_URL')
	if render_external:
		domain = render_external.replace('https://', '').split('/')[0]
		if domain and domain not in CSRF_TRUSTED_ORIGINS:
			CSRF_TRUSTED_ORIGINS.append(f'https://{domain}')

# Ensure ALLOWED_HOSTS covers frontend dev hosts when DEBUG
if DEBUG:
	for u in ['localhost', '127.0.0.1', '192.168.56.1', '192.168.1.12']:
		if u not in ALLOWED_HOSTS:
			ALLOWED_HOSTS.append(u)


# =============================================
# Device Provisioning Settings
# =============================================
# API key for device provisioning authentication (X-Device-Auth header)
# In production, devices must provide this key to provision
DEVICE_PROVISION_API_KEY = os.getenv('DEVICE_PROVISION_API_KEY', 'dev-insecure-device-key')

# Auto-create device on first provision attempt if device serial not found
AUTO_CREATE_DEVICE_ON_FIRST_CONNECT = os.getenv('AUTO_CREATE_DEVICE_ON_FIRST_CONNECT', 'true').lower() == 'true'

# Device provisioning throttle rate (separate from general API throttling)
DEVICE_PROVISION_THROTTLE_RATE = os.getenv('DEVICE_PROVISION_THROTTLE_RATE', '10/hour')

# =============================================
# Alerts & Notifications
# =============================================
# Cooldown window (in minutes) to suppress duplicate alerts of the same or lower
# severity for the same sensor+metric. Escalations (e.g., warning -> critical)
# are allowed within the window.
ALERT_COOLDOWN_MINUTES = int(os.getenv('ALERT_COOLDOWN_MINUTES', '30'))


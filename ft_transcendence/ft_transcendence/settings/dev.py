from .base import *

DEBUG = True
ALLOWED_HOSTS = ['localhost', '127.0.0.1']

# Dev does not redirect HTTP to HTTPS
SECURE_SSL_REDIRECT = False

# Helpful when behind proxies in dev setups (like docker, ngnix dev)
USE_X_FORWARDED_HOST = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'http')

# CSRF Settings for localhost dev
CSRF_TRUSTED_ORIGINS = [
    'http://localhost:8000',
    'http://127.0.0.1:8000',
    'http://localhost',
    'http://127.0.0.1',
]

# Make CSRF more permissive for development but keep it enabled
CSRF_COOKIE_SECURE = False
CSRF_USE_SESSIONS = False
CSRF_COOKIE_HTTPONLY = False
CSRF_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_DOMAIN = None

# Disable referer checking in development
CSRF_TRUSTED_REFERERS = None

# Force Django to treat requests as insecure in development
SECURE_SSL_REDIRECT = False
SECURE_PROXY_SSL_HEADER = None

# Override database settings for local development
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

# Override Redis settings for local development
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels.layers.InMemoryChannelLayer',
    },
}

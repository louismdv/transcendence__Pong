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
    'http://127.0.0.1',
]

CSRF_COOKIE_SECURE = False
CSRF_USE_SESSIONS = False
CSRF_COOKIE_HTTPONLY = False
CSRF_COOKIE_SAMESITE = None

# You can disable referer checking if needed during dev
CSRF_TRUSTED_REFERERS = None
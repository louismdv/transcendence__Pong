from .base import *

DEBUG = False

ALLOWED_HOSTS = ['louismdv.works', 'www.louismdv.works']

# Enforce HTTPS in production
SECURE_SSL_REDIRECT = True
CSRF_COOKIE_SECURE = True
SESSION_COOKIE_SECURE = True

# Trust proxy header set by your load balancer / nginx
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# CSRF trusted origins for production domain
CSRF_TRUSTED_ORIGINS = [
    'https://louismdv.works',
    'https://www.louismdv.works',
]

# You can customize other production-only security settings here
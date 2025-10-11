from pathlib import Path
import os
from decouple import config
from django.contrib.messages import constants as messages

BASE_DIR = Path(__file__).resolve().parent.parent.parent

SECRET_KEY = config('SECRET_KEY', default='unsafe-secret-key-for-dev')

DEBUG = False  # Default to False, override in dev.py

ALLOWED_HOSTS = []  # Override in dev.py and prod.py

MESSAGE_TAGS = {
    messages.DEBUG: 'debug',
    messages.INFO: 'info',
    messages.SUCCESS: 'success',
    messages.WARNING: 'warning',
    messages.ERROR: 'error',
}

INSTALLED_APPS = [
    'channels',
    'channels_redis',
    'online_game',
    'livechat',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework.authtoken',
    'dj_rest_auth',
    'dj_rest_auth.registration',
    'allauth',
    'allauth.account',
    'allauth.socialaccount',
    'ft_transcendence',
]

AUTHENTICATION_BACKENDS = (
    'django.contrib.auth.backends.ModelBackend',
    'allauth.account.auth_backends.AuthenticationBackend',
)

SITE_ID = 1

REST_USE_JWT = True

ACCOUNT_EMAIL_REQUIRED = True
ACCOUNT_USERNAME_REQUIRED = True
ACCOUNT_AUTHENTICATION_METHOD = 'username'
ACCOUNT_EMAIL_VERIFICATION = 'optional'

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.locale.LocaleMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'ft_transcendence.middleware.UserLanguageMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'allauth.account.middleware.AccountMiddleware',
    'ft_transcendence.middleware.UserActivityMiddleware',
]

X_FRAME_OPTIONS = 'SAMEORIGIN'
ROOT_URLCONF = 'ft_transcendence.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / "templates"],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'ft_transcendence.wsgi.application'
ASGI_APPLICATION = 'ft_transcendence.asgi.application'

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': config('POSTGRES_DB', default='ft_ficello'),
        'USER': config('POSTGRES_USER', default='latranscenderie'),
        'PASSWORD': config('POSTGRES_PASSWORD', default='lazigouingouinerie42'),
        'HOST': config('POSTGRES_HOST', default='db'),
        'PORT': config('POSTGRES_PORT', default='5432'),
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator', },
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator', },
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator', },
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator', },
]

LOGIN_URL = '/login'
LOGIN_REDIRECT_URL = '/'

TIME_ZONE = 'UTC'
USE_TZ = True
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

STATIC_URL = '/static/'
STATICFILES_DIRS = [
    os.path.join(BASE_DIR, "static"),
]

STATIC_ROOT = os.path.join(BASE_DIR.parent, 'staticfiles')

# Whitenoise config (serve static files efficiently)
WHITENOISE_MIDDLEWARE = ['whitenoise.middleware.WhiteNoiseMiddleware']
MIDDLEWARE = WHITENOISE_MIDDLEWARE + MIDDLEWARE
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

FILE_UPLOAD_PERMISSIONS = 0o644
FILE_UPLOAD_MAX_MEMORY_SIZE = 5242880

AVATAR_MAX_SIZE = 2 * 1024 * 1024  # 2MB
AVATAR_ALLOWED_FILE_EXTS = ('.jpg', '.jpeg', '.png', '.gif')

CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            "hosts": [os.environ.get('REDIS_URL', 'redis://redis:6379/0')],
        },
    },
}

# Internationalization / translation
USE_I18N = True
LANGUAGE_CODE = 'en'
LANGUAGES = [
    ('en', 'English'),
    ('fr', 'French'),
    ('es', 'Spanish'),
]
LOCALE_PATHS = [os.path.join(BASE_DIR, 'locale')]

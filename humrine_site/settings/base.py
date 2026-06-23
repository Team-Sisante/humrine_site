# humrine_site/humrine_site/settings/base.py

"""
Django settings for humrine_site project.
"""

import os
from pathlib import Path
from django.core.exceptions import ImproperlyConfigured

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Helper function to get environment variables strictly from OS
def get_env_variable(var_name, default=None):
    # Check if variable is already in os.environ (e.g., from container environment)
    if var_name in os.environ:
        return os.environ[var_name]

    # If not, return default if provided
    if default is not None:
        return default

    # If neither, raise error
    raise ImproperlyConfigured(f"Set the {var_name} environment variable")

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = get_env_variable('SECRET_KEY')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = get_env_variable('DEBUG', 'False').lower() == 'true'

ALLOWED_HOSTS = get_env_variable('ALLOWED_HOSTS', '').split(',')

# Dynamically trust cloudshell.dev in development
if DEBUG:
    ALLOWED_HOSTS.append('.cloudshell.dev')

CSRF_TRUSTED_ORIGINS = [f"https://{host}" for host in ALLOWED_HOSTS if host]
if DEBUG:
    CSRF_TRUSTED_ORIGINS.append('https://*.cloudshell.dev')

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django_bootstrap5',
    'home',
    'pages',
    'affiliate',
    'toons',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'humrine_site.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'humrine_site.wsgi.application'


# Database
# Using environment variable for database URL or default to SQLite
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': os.environ.get('DB_PATH', BASE_DIR / 'db.sqlite3'),
    }
}

# Password validation
# https://docs.djangoproject.com/en/6.0/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Internationalization
# https://docs.djangoproject.com/en/6.0/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/6.0/howto/static-files/

STATIC_URL = 'static/'

# Default primary key field type
# https://docs.djangoproject.com/en/6.0/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ---- Email / Poste.io configuration ----
# POSTE_ADMIN_PASSWORD is the single source of truth for the admin
# mailbox password. Django derives both EMAIL_HOST_PASSWORD (SMTP auth)
# and POSTE_API_PASSWORD (API auth) from it.
EMAIL_HOST = get_env_variable('EMAIL_HOST', 'mail-production')
EMAIL_PORT = int(get_env_variable('EMAIL_PORT', '465'))
EMAIL_HOST_USER = get_env_variable('EMAIL_HOST_USER', 'admin@humrine.com')
POSTE_ADMIN_PASSWORD = get_env_variable('POSTE_ADMIN_PASSWORD')
EMAIL_HOST_PASSWORD = POSTE_ADMIN_PASSWORD
EMAIL_USE_SSL = get_env_variable('EMAIL_USE_SSL', 'True').lower() == 'true'
if EMAIL_USE_SSL:
    EMAIL_USE_TLS = False
else:
    EMAIL_USE_TLS = get_env_variable('EMAIL_USE_TLS', 'False').lower() == 'true'
DEFAULT_FROM_EMAIL = get_env_variable('DEFAULT_FROM_EMAIL', 'admin@humrine.com')

# Involve API key
INVOLVE_API_KEY = os.environ.get('INVOLVE_API_KEY', '')

# CSRF trusted origins for production
CSRF_TRUSTED_ORIGINS += [
    'https://humrine.com',
    'https://www.humrine.com',
    'https://staging.humrine.com',
    'https://www.staging.humrine.com',
    'https://app.humrine.com',
]

# If behind a reverse proxy (like Nginx), uncomment the line below
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# Production security settings
if not DEBUG:
    SECURE_SSL_REDIRECT = get_env_variable('SECURE_SSL_REDIRECT', 'True').lower() == 'true'
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = int(get_env_variable('SECURE_HSTS_SECONDS', '31536000'))  # 1 year
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True

MEDIA_URL = '/media/'
MEDIA_ROOT = os.environ.get('MEDIA_ROOT', BASE_DIR / 'media')    
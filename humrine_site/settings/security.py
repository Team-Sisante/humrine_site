# humrine_site/settings/security.py

"""
Security-related settings: SECRET_KEY, DEBUG, ENVIRONMENT, ALLOWED_HOSTS, CSRF, HSTS, etc.
"""

import os
from django.core.exceptions import ImproperlyConfigured
from .base import require_env

# ---- ENVIRONMENT detection ----
if os.getenv('PYINSTALLER_BUILD') == 'true':
    ENVIRONMENT = 'development'
else:
    ENVIRONMENT = os.environ.get('ENVIRONMENT')
    if not ENVIRONMENT or not ENVIRONMENT.strip():
        raise ImproperlyConfigured(
            "CRITICAL CONFIGURATION ERROR: The 'ENVIRONMENT' environment variable "
            "is missing or blank. Application startup aborted.\n"
            "Set it to one of: development, docker, staging, production"
        )
    ENVIRONMENT = ENVIRONMENT.strip().lower()

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = require_env('SECRET_KEY')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = require_env('DEBUG', 'False').lower() == 'true'

ALLOWED_HOSTS = require_env('ALLOWED_HOSTS', '').split(',')
if DEBUG:
    ALLOWED_HOSTS.append('.cloudshell.dev')

CSRF_TRUSTED_ORIGINS = [f"https://{host}" for host in ALLOWED_HOSTS if host]
if DEBUG:
    CSRF_TRUSTED_ORIGINS.append('https://*.cloudshell.dev')

CSRF_TRUSTED_ORIGINS += [
    'https://humrine.com',
    'https://www.humrine.com',
    'https://staging.humrine.com',
    'https://www.staging.humrine.com',
    'https://app.humrine.com',
]

SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

if not DEBUG:
    SECURE_SSL_REDIRECT = require_env('SECURE_SSL_REDIRECT', 'True').lower() == 'true'
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = int(require_env('SECURE_HSTS_SECONDS', '31536000'))
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
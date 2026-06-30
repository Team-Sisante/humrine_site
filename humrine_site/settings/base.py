# humrine_site/settings/base.py
# Note: This file is shared between dev and production settings, so it should only contain settings that are common to both environments.  Environment-specific settings (like database configuration) should be placed in the respective dev.py and prod.py files.
# For secrets management, we use a get_secret function that can fetch from environment variables or a secrets manager, depending on the deployment environment.  This allows us to keep sensitive information out of the codebase and manage it securely in production.
# The settings are organized into sections with clear comments, and we use environment variables for all configurable values to ensure that the application can be easily configured for different environments without changing the code.
# This file should not contain any environment-specific logic (like checking if DEBUG is True) except for loading the appropriate .env file at the beginning.  All other settings should be defined in a way that they work in both development and production environments, with the actual values coming from environment variables or secrets management.
# This base settings file is designed to be as environment-agnostic as possible, with all environment-specific details (like database configuration, allowed hosts, etc.) being defined in the dev.py and prod.py files that extend this base configuration.
# Do not include default values for settings that must be explicitly set in production (like SECRET_KEY, database credentials, etc.) to avoid accidentally using insecure defaults in a production environment.  Instead, use the get_secret function to fetch these values and raise an error if they are not set.
"""
Base Django settings
"""

from pathlib import Path
from urllib.parse import urlparse
import os
from django.core.exceptions import ImproperlyConfigured

def require_env(var_name, default=None):
    """
    Fetches an environment variable. 
    If default is provided, returns it if the variable is missing/blank.
    Otherwise, raises ImproperlyConfigured.
    During PyInstaller analysis, returns a safe dummy so Django can be imported.
    """
    if os.getenv('PYINSTALLER_BUILD') == 'true':
        # Return the provided default, or a harmless placeholder that won't crash
        # int() or other conversions (e.g., '0' works for int, False for booleans).
        return default if default is not None else '0'

    value = os.getenv(var_name)
    
    # Check if value is missing or blank
    if value is None or str(value).strip() == '':
        if default is not None:
            return default
        raise ImproperlyConfigured(
            f"CRITICAL CONFIGURATION ERROR: The required environment variable "
            f"'{var_name}' is missing or blank. Application startup aborted."
        )
    return value.strip()

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Helper function to get environment variables strictly from OS
def get_env_variable(var_name, default=None):
    if var_name in os.environ:
        return os.environ[var_name]
    if default is not None:
        return default
    raise ImproperlyConfigured(f"Set the {var_name} environment variable")

# ============================================================
# STRICT VALIDATION — no silent defaults (per Roadmap #52)
# If ENVIRONMENT is missing or blank, fail immediately with a clear error.
# ============================================================
if os.getenv('PYINSTALLER_BUILD') == 'true':
    ENVIRONMENT = 'development'  
else:
    ENVIRONMENT = os.environ.get('ENVIRONMENT')
    if not ENVIRONMENT or not ENVIRONMENT.strip():
        raise ImproperlyConfigured(
            "CRITICAL CONFIGURATION ERROR: The 'ENVIRONMENT' environment variable "
            "is missing or blank. Application startup aborted.\n"
            "Set it to one of: development, docker, staging, production\n"
            "Example: ENVIRONMENT=development python manage.py runserver\n"
            "Silent defaults are forbidden per Roadmap #52."
        )
    ENVIRONMENT = ENVIRONMENT.strip().lower()

    ALLOWED_ENVIRONMENTS = ['development', 'docker', 'staging', 'production']
    if ENVIRONMENT not in ALLOWED_ENVIRONMENTS:
        raise ImproperlyConfigured(
            f"CRITICAL CONFIGURATION ERROR: Unknown ENVIRONMENT '{ENVIRONMENT}'.\n"
            f"Allowed values: {', '.join(ALLOWED_ENVIRONMENTS)}\n"
            "Silent defaults are forbidden per Roadmap #52."
        )

# Load the appropriate .env file based on ENVIRONMENT
if ENVIRONMENT == 'docker':
    env_file = '.env.docker'
elif ENVIRONMENT == 'staging':
    env_file = '.env.staging'
elif ENVIRONMENT == 'production':
    env_file = '.env.production'
else:  # development
    env_file = '.env.dev'

# Load environment variables from the selected .env file
# It is important to override existing environment variables to ensure that the .env file takes precedence in development and staging environments, while allowing production secrets to be managed through environment variables or a secrets manager without being overridden by a .env file.
from dotenv import load_dotenv

# Load common variables first
load_dotenv(BASE_DIR / '.env.common', override=True)

# Then load the environment‑specific file (its values take precedence)
load_dotenv(BASE_DIR / env_file, override=True)

from ..secrets import get_secret
GCP_PROJECT_ID = require_env('GCP_PROJECT_ID')

# Site branding
SITE_HEADER = require_env('SITE_HEADER')
SITE_TITLE = require_env('SITE_TITLE')
SITE_INDEX_TITLE = require_env('SITE_INDEX_TITLE')

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = get_secret('SECRET_KEY', project_id=GCP_PROJECT_ID, default='django-insecure-your-secret-key-here')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = require_env('DEBUG', 'False').lower() == 'true'

# Get the base components
APP_PROTOCOL = require_env('APP_PROTOCOL')
APP_DOMAIN = require_env('APP_DOMAIN')
APP_PORT = require_env('APP_PORT')

# After the env loading section
# FORCE_SCRIPT_NAME tells Django it's mounted behind a path-based reverse proxy
# (e.g. humrine.com/court-staging/). Always define it — even if empty — so other
# settings modules can safely import it without AttributeError.
DOMAIN_PREFIX = require_env('DOMAIN_PREFIX', default='')
FORCE_SCRIPT_NAME = DOMAIN_PREFIX  # '' when not behind a subpath, '/court-staging' when it is

# When behind a reverse proxy, trust forwarded headers so request.is_secure(),
# request.get_host(), and URL building all work correctly.
USE_X_FORWARDED_HOST = True
USE_X_FORWARDED_PORT = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# Build derived values
if not str(APP_DOMAIN).startswith('http'):
    APP_DOMAIN = f"{APP_PROTOCOL}://{APP_DOMAIN}"
APP_FULL_URL = f"{APP_DOMAIN}:{APP_PORT}"

# Hosts configuration
allowed_hosts_str = require_env('ALLOWED_HOSTS')
ALLOWED_HOSTS = [host.strip() for host in allowed_hosts_str.split(',')]

# Add testserver only when running tests or in DEBUG mode
if DEBUG or os.environ.get('RUNNING_TESTS') == 'true':
    ALLOWED_HOSTS.append('testserver')

# Add ngrok domain patterns as a fallback for free tier
ngrok_domains = ['.ngrok-free.dev', '.ngrok-free.app', '.ngrok.io']
for domain in ngrok_domains:
    if domain not in ALLOWED_HOSTS:
        ALLOWED_HOSTS.append(domain)

# Dynamically trust cloudshell.dev in development
if DEBUG:
    if '.cloudshell.dev' not in ALLOWED_HOSTS:
        ALLOWED_HOSTS.append('.cloudshell.dev')

csrf_trusted_origins_env = os.getenv('CSRF_TRUSTED_ORIGINS')
CSRF_TRUSTED_ORIGINS = [
    origin.strip()
    for origin in csrf_trusted_origins_env.split(',')
    if origin.strip()
] if csrf_trusted_origins_env else [
    'http://localhost:8000',
    'http://127.0.0.1:8000',
    'http://localhost:8443',
    'http://127.0.0.1:8443',    
]

# Dynamically trust cloudshell.dev in development
if DEBUG:
    cloudshell_origin = 'https://*.cloudshell.dev'
    if cloudshell_origin not in CSRF_TRUSTED_ORIGINS:
        CSRF_TRUSTED_ORIGINS.append(cloudshell_origin)

TUNNEL_ENABLED = os.environ.get('TUNNEL_ENABLED', 'false').lower() == 'true'

if TUNNEL_ENABLED:
    tunnel_url = require_env('TUNNEL_URL')
    if tunnel_url:
        parsed = urlparse(tunnel_url)
        tunnel_host = parsed.netloc
        origin = f"{parsed.scheme}://{parsed.netloc}"
        
        if tunnel_host and tunnel_host not in ALLOWED_HOSTS:
            ALLOWED_HOSTS.append(tunnel_host)
            print(f"Added {tunnel_host} to ALLOWED_HOSTS")
        
        if origin not in CSRF_TRUSTED_ORIGINS:
            CSRF_TRUSTED_ORIGINS.append(origin)
            print(f"Added {origin} to CSRF_TRUSTED_ORIGINS")

# Application definition
INSTALLED_APPS = [
    # Django core apps
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.sites',
    
    # Third-party apps
    'django_bootstrap5',  
    'django_celery_beat',
    'django_celery_results',
    'allauth',
    'allauth.account',
    'allauth.socialaccount',
    'allauth.socialaccount.providers.google',
    'allauth.socialaccount.providers.facebook',
    'allauth.socialaccount.providers.twitter',

    # Local apps
    'home',
    'pages',
    'affiliate',
    'toons',
    'blog',
    'ckeditor',
    'ckeditor_uploader',
    'engagement',
    'core',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'allauth.account.middleware.AccountMiddleware',
]

# In development, force CSRF cookie + allow tests to bypass CSRF
if DEBUG:
    # Disable CSRF entirely in development.
    # Cypress's cy.origin() sandbox doesn't reliably share the browser's
    # cookie jar with form submissions, causing "CSRF cookie not set" errors
    # that aren't fixable from the Cypress side. For dev/test, CSRF adds no
    # value — it's a production security feature. Tests verify user flows,
    # not CSRF enforcement.
    MIDDLEWARE = [m for m in MIDDLEWARE if m != 'django.middleware.csrf.CsrfViewMiddleware']

ROOT_URLCONF = 'humrine_site.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
                'humrine_site.context_processors.app_settings', 
                'humrine_site.context_processors.profile_completion_check',
            ],
        },
    },
]

WSGI_APPLICATION = 'humrine_site.wsgi.application'

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = '/static/'
# ------------------------------------

STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATICFILES_DIRS = [
    BASE_DIR / 'static',
]

# Media files (uploads)
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Site Configuration
SITE_ID = 1

# ---- Email / Poste.io configuration ----
# POSTE_ADMIN_PASSWORD is the single source of truth for the Poste.io admin
# mailbox password. It is used for both SMTP authentication and Poste.io API
# authentication.  
EMAIL_HOST = require_env('EMAIL_HOST')
EMAIL_PORT = require_env('EMAIL_PORT')
EMAIL_HOST_USER = require_env('EMAIL_HOST_USER')
POSTE_ADMIN_PASSWORD = require_env('POSTE_ADMIN_PASSWORD')
EMAIL_HOST_PASSWORD = POSTE_ADMIN_PASSWORD
EMAIL_USE_SSL = os.getenv('EMAIL_USE_SSL', 'False').lower() == 'true'
if EMAIL_USE_SSL:
    EMAIL_USE_TLS = False
else:
    EMAIL_USE_TLS = os.getenv('EMAIL_USE_TLS', 'False').lower() == 'true'
DEFAULT_FROM_EMAIL = require_env('DEFAULT_FROM_EMAIL')

# Poste.io API settings
POSTE_PROTOCOL = require_env('POSTE_PROTOCOL')
POSTE_HOSTNAME = require_env('POSTE_HOSTNAME')
POSTE_PORT = require_env('POSTE_PORT')

# Construct the full API host URL
POSTE_API_HOST = f"{POSTE_PROTOCOL}://{POSTE_HOSTNAME}:{POSTE_PORT}"
POSTE_API_USER = require_env('POSTE_API_USER')
POSTE_DOMAIN = require_env('POSTE_DOMAIN')

# Poste.io database connection settings (used by management commands)
POSTEIO_DB_HOST     = require_env('POSTEIO_DB_HOST')
POSTEIO_DB_PORT     = require_env('POSTEIO_DB_PORT')
POSTEIO_DB_NAME     = require_env('POSTEIO_DB_NAME')
POSTEIO_DB_USER     = require_env('POSTEIO_DB_USER')
POSTEIO_DB_PASSWORD = require_env('POSTEIO_DB_PASSWORD')

# Admin user password (for Django admin, not Poste.io)
ADMIN_PASSWORD = require_env('ADMIN_PASSWORD')
PASSWORD_RESET_TIMEOUT = int(require_env('PASSWORD_RESET_TIMEOUT', '86400'))

# Support contact (used by context processor)
SUPPORT_EMAIL = require_env('SUPPORT_EMAIL')

CSRF_COOKIE_PATH = '/'
SESSION_COOKIE_PATH = '/'
CSRF_COOKIE_NAME = 'django_csrftoken'
SESSION_COOKIE_NAME = 'django_sessionid'
SOCIALACCOUNT_AUTO_SIGNUP = True
# humrine_site/settings/social_auth.py

"""
Social authentication (django-allauth) configuration
"""

import os
from .base import require_env

# Check if we're running tests
is_running_tests = (
    os.getenv('CYPRESS', 'false') == 'true' or
    (require_env('ENVIRONMENT') == 'docker' and require_env('CYPRESS'))
)

if is_running_tests:
    # Test configuration
    ACCOUNT_EMAIL_VERIFICATION = 'none'  # Temporarily disable email verification
    print("TESTS DETECTED: Email verification disabled for testing")
else:
    # Production/development settings
    ACCOUNT_EMAIL_VERIFICATION = 'mandatory'

# Django Allauth Configuration
ACCOUNT_LOGIN_METHODS = {'email'}  # Allow login with email only
ACCOUNT_SIGNUP_FIELDS = ['email*', 'password1*', 'password2*']  # Required fields for signup
ACCOUNT_UNIQUE_EMAIL = True
ACCOUNT_PREVENT_ENUMERATION = False
ACCOUNT_EMAIL_CONFIRMATION_EXPIRE_DAYS = 7 
ACCOUNT_EMAIL_CONFIRMATION_HMAC = False
ACCOUNT_EMAIL_CONFIRMATION_COOLDOWN_SECONDS = 0

# -------------------------------------------------------------------
# Prefix all auth-related URLs with FORCE_SCRIPT_NAME so the browser
# lands on the correct mount point (e.g. /court-staging/accounts/login/
# instead of /accounts/login/ which would fall through to the wrong
# vhost on a path-based reverse proxy).
#
# When FORCE_SCRIPT_NAME is empty (dev environment, no subpath), the
# prefix reduces to '' and the URLs are unprefixed — no behavior change.
# -------------------------------------------------------------------
from .base import FORCE_SCRIPT_NAME
SCRIPT_NAME = FORCE_SCRIPT_NAME or ''

ACCOUNT_EMAIL_CONFIRMATION_ANONYMOUS_REDIRECT_URL = f'{SCRIPT_NAME}/accounts/login/'
ACCOUNT_EMAIL_CONFIRMATION_AUTHENTICATED_REDIRECT_URL = f'{SCRIPT_NAME}/'

ACCOUNT_USERNAME_BLACKLIST = ['admin', 'staff', 'root']
ACCOUNT_LOGIN_ON_EMAIL_CONFIRMATION = True

LOGIN_REDIRECT_URL = f'{SCRIPT_NAME}/dashboard/'  # Redirect to dashboard after login
LOGOUT_REDIRECT_URL = f'{SCRIPT_NAME}/accounts/login/'  # Redirect to login after logout
LOGIN_URL = f'{SCRIPT_NAME}/accounts/login/'  # Used by @login_required decorator

SOCIALACCOUNT_LOGIN_ON_GET = True
SOCIALACCOUNT_EMAIL_VERIFICATION = True
SOCIALACCOUNT_EMAIL_REQUIRED = True
SOCIALACCOUNT_STORE_TOKENS = False

# Custom adapter
ACCOUNT_ADAPTER = 'core.management.adapters.CustomEmailAdapter'
SOCIALACCOUNT_ADAPTER = 'core.management.adapters.CustomSocialAccountAdapter'

# Social Media Credentials
GOOGLE_CLIENT_ID = require_env('GOOGLE_CLIENT_ID', '')
GOOGLE_CLIENT_SECRET = require_env('GOOGLE_CLIENT_SECRET', '')
FACEBOOK_CLIENT_ID = require_env('FACEBOOK_CLIENT_ID', '')
FACEBOOK_CLIENT_SECRET = require_env('FACEBOOK_CLIENT_SECRET', '')
TWITTER_CLIENT_ID = require_env('TWITTER_CLIENT_ID', '')
TWITTER_CLIENT_SECRET = require_env('TWITTER_CLIENT_SECRET', '')

# Social Media Provider Configuration
SOCIALACCOUNT_PROVIDERS = {
    'google': {
        'SCOPE': [
            'profile',
            'email',
        ],
        'AUTH_PARAMS': {
            'access_type': 'online',
        }
    },
    'facebook': {
        'METHOD': 'oauth2',
        'SCOPE': ['email', 'public_profile'],
        'AUTH_PARAMS': {'auth_type': 'reauthenticate'},
        'INITIAL_PARAMS': {'cookie': True},
        'FIELDS': [
            'id',
            'email',
            'name',
            'first_name',
            'last_name',
            'verified',
            'locale',
            'timezone',
            'link',
            'gender',
            'updated_time',
        ],
        'VERIFIED_EMAIL': False,
    },
    'twitter': {
        'APP': {
            'client_id': TWITTER_CLIENT_ID,
            'secret': TWITTER_CLIENT_SECRET,
            'key': '',
        },
        'SCOPE': ['tweet.read', 'users.read'],
        'METHOD': 'oauth2',
        'OAUTH_PKCE_ENABLED': True,
    }
}
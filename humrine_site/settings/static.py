# humrine_site/settings/static.py

"""
Static and media files configuration
"""

import os
from .base import BASE_DIR, ENVIRONMENT

STATIC_URL = 'static/'

# ---- STATIC_ROOT based on ENVIRONMENT ----
if ENVIRONMENT in ['staging', 'production']:
    STATIC_ROOT = '/app/staticfiles'
else:
    STATIC_ROOT = BASE_DIR / 'staticfiles_local'

STATICFILES_DIRS = [
    BASE_DIR / 'static',
]

MEDIA_URL = '/media/'
MEDIA_ROOT = os.environ.get('MEDIA_ROOT', BASE_DIR / 'media')
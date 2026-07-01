# humrine_site/settings/email.py

"""
Email / Poste.io configuration
"""

import os
from .base import require_env

EMAIL_HOST = require_env('EMAIL_HOST')
EMAIL_PORT = int(require_env('EMAIL_PORT'))
EMAIL_HOST_USER = require_env('EMAIL_HOST_USER')
POSTE_ADMIN_PASSWORD = require_env('POSTE_ADMIN_PASSWORD')
EMAIL_HOST_PASSWORD = POSTE_ADMIN_PASSWORD
EMAIL_USE_SSL = require_env('EMAIL_USE_SSL').lower() == 'true'
if EMAIL_USE_SSL:
    EMAIL_USE_TLS = False
else:
    EMAIL_USE_TLS = require_env('EMAIL_USE_TLS').lower() == 'true'
DEFAULT_FROM_EMAIL = require_env('DEFAULT_FROM_EMAIL')
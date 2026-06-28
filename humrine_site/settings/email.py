# humrine_site/settings/email.py

"""
Email / Poste.io configuration
"""

import os
from .base import get_env_variable

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
# humrine_site/settings/database.py

"""
Database configuration
"""

import os
from .base import BASE_DIR

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': os.environ.get('DB_PATH', BASE_DIR / 'db.sqlite3'),
    }
}
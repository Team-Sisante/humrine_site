# humrine_site/settings/__init__.py

"""
Main settings module that imports all other settings
"""

# Import all settings modules in order
from .base import *
from .security import *
from .database import *
from .auth import *
from .email import *
from .social_auth import *
from .static import *
from .ckeditor import *

# ---- Temporary override for migrations ----

# SSL Certificate Configuration (for Windows compatibility)
import os
try:
    import certifi
    os.environ['REQUESTS_CA_BUNDLE'] = certifi.where()
    os.environ['SSL_CERT_FILE'] = certifi.where()
except ImportError:
    # certifi not installed, will use system certificates
    pass

# PyInstaller build – disable logging configuration
if os.getenv('PYINSTALLER_BUILD') == 'true':
    LOGGING_CONFIG = None
    LOGGING = None
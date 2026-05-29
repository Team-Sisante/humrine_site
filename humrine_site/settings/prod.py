import os
from django.core.exceptions import ImproperlyConfigured
from .base import *

# Production settings: Fail fast if required variables are missing
DEBUG = False

# This will raise a KeyError if SECRET_KEY is not set in the environment
SECRET_KEY = os.environ['SECRET_KEY']

# Strict enforcement for hosts
ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', '').split(',')
if not ALLOWED_HOSTS or ALLOWED_HOSTS == ['']:
    raise ImproperlyConfigured("ALLOWED_HOSTS environment variable is not set or empty.")

# badminton_court/secrets.py
# This module provides a helper function to retrieve secrets from GCP Secret Manager.

import os
from google.cloud import secretmanager
from google.api_core import exceptions

def get_secret(secret_id, project_id=None, default=None):
    """
    Get secret from GCP Secret Manager.
    If not found or offline, returns the default (likely from os.environ).
    """
    # 1. Always check environment variables first (this includes .env file values)
    val = os.environ.get(secret_id)
    if val:
        return val

    # 2. If not in environment, try fetching from GCP Secret Manager
    if not project_id:
        project_id = os.environ.get('GCP_PROJECT_ID')
    
    if not project_id:
        return default

    try:
        client = secretmanager.SecretManagerServiceClient()
        name = f"projects/{project_id}/secrets/{secret_id}/versions/latest"
        response = client.access_secret_version(request={"name": name})
        return response.payload.data.decode("UTF-8")
    except Exception:
        # Fallback to default if offline, permission denied, or secret not found
        return default

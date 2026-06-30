# badminton_court/social_pipeline.py

from django.contrib.auth import login
from django.contrib.auth.models import User
from django.shortcuts import redirect
from social_core.exceptions import AuthAlreadyAssociated

def auto_login_existing_user(strategy, backend, user=None, *args, **kwargs):
    """
    If the user already exists (via email), log them in instead of raising an error.
    """
    if user:
        # User already exists and is associated – nothing to do.
        return

    # Get the email from the backend's response
    email = kwargs.get('email') or kwargs.get('details', {}).get('email')
    if not email:
        return

    # Check if a user with this email exists (but not yet associated with this social account)
    try:
        existing_user = User.objects.get(email=email)
        # If the user exists, log them in and redirect to the dashboard
        login(strategy.request, existing_user)
        # Return a flag that we've logged in so the pipeline can stop
        return {'user': existing_user, 'is_new': False}
    except User.DoesNotExist:
        # No user found – continue the normal signup flow
        return
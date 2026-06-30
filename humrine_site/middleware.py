"""
Project-level Django middleware.
"""

from django.conf import settings
from django.middleware.csrf import get_token


class ForceCSRFCookie:
    """Force-set CSRF cookie on every response (dev only)."""
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        token = get_token(request)
        if token and not response.cookies.get('django_csrftoken'):
            response.set_cookie(
                'django_csrftoken', token,
                max_age=31449600, path='/',
                secure=False, httponly=False, samesite='Lax',
            )
        return response


class DisableCSRFForTests:
    """Disable CSRF checks when X-Disable-CSRF=true header is present (dev/test only)."""
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if settings.DEBUG and request.headers.get('X-Disable-CSRF') == 'true':
            setattr(request, '_dont_enforce_csrf_checks', True)
        return self.get_response(request)
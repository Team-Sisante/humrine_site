# badminton_court/context_processors.py
from django.conf import settings
from django.urls import reverse

def app_settings(request):
    """
    Adds application settings to the template context
    """
    return {
        'APP_FULL_URL': settings.APP_FULL_URL,
        'APP_PROTOCOL': settings.APP_PROTOCOL,
        'APP_DOMAIN': settings.APP_DOMAIN,
        'APP_PORT': settings.APP_PORT,
        'SUPPORT_EMAIL': settings.SUPPORT_EMAIL,
    }

def profile_completion_check(request):
    """
    Checks if the authenticated user has a complete profile.
    If not, adds variables to show a warning alert.
    """
    context = {}
    if request.user.is_authenticated:
        # Get the user's profile (assuming OneToOne relation)
        profile = getattr(request.user, 'profile', None)
        # Check if profile exists and is complete (define is_complete() method on your Profile model)
        if profile and hasattr(profile, 'is_complete') and not profile.is_complete():
            context['requires_profile_completion'] = True
            context['profile_edit_url'] = reverse('account_profile')  # name of your profile edit view
        else:
            context['requires_profile_completion'] = False
    else:
        context['requires_profile_completion'] = False
    return context
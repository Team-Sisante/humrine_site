# profiles/decorators.py
"""
Mirrors badminton_court's @require_completed_profile decorator. There it
gates creating a booking; here it's meant to gate the equivalent
core-value-add actions in humrine_site — posting a comment, leaving a
reaction (wired up in Phase 2, not this file).

Uses get_or_create rather than assuming the signup signal already made a
Profile — covers superusers and any pre-existing users created outside
the normal allauth signup flow (createsuperuser, fixtures, etc.).
"""

from functools import wraps

from django.shortcuts import redirect

from .models import Profile


def require_completed_profile(view_func):
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        if request.user.is_authenticated:
            profile, _ = Profile.objects.get_or_create(user=request.user)
            if not profile.profile_complete:
                request.session['profile_next'] = request.get_full_path()
                return redirect('profiles:complete_profile')
        return view_func(request, *args, **kwargs)
    return wrapper

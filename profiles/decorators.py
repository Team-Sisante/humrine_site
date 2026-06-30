# profiles/decorators.py
"""
Mirrors badminton_court's @require_completed_profile decorator. There it
gates creating a booking; here it gates engagement's add_comment and
toggle_reaction (see engagement/views.py).

Uses get_or_create rather than assuming the signup signal already made a
Profile — covers superusers and any pre-existing users created outside
the normal allauth signup flow (createsuperuser, fixtures, etc.).

Two things this version handles that a naive port of badminton_court's
decorator wouldn't (found while wiring this into engagement's POST-only
AJAX endpoints in Phase 2, not needed for badminton_court's original
page-view use case):

1. Redirect-back target: engagement's gated views are POST-only API
   endpoints (`add_comment`, `toggle_reaction`), not GET-able pages.
   Stashing request.get_full_path() for a POST to e.g.
   /engagement/react/blog/post/3/ would mean the post-completion redirect
   tries to GET that same URL — which 405s, since it's @require_POST-only.
   So: GET requests stash the current path (it IS the destination, same
   as badminton_court's original case); non-GET requests stash the
   Referer instead (the actual page the action was fired from), falling
   back to the current path only if Referer is missing.

2. AJAX requests: a plain redirect() returns a 302, which fetch() follows
   silently and transparently — the caller would receive the complete-
   profile page's HTML where it expected JSON, and res.json() throws,
   producing a silent, uncaught promise rejection (no visible feedback
   to the user at all). For AJAX requests we instead return JSON with a
   `profile_incomplete` flag and a `redirect` URL, so the calling JS can
   navigate the browser there explicitly. See engagement.js.
"""

from functools import wraps

from django.http import JsonResponse
from django.shortcuts import redirect
from django.urls import reverse

from .models import Profile


def _is_ajax(request):
    return request.headers.get('X-Requested-With') == 'XMLHttpRequest'


def require_completed_profile(view_func):
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        if request.user.is_authenticated:
            profile, _ = Profile.objects.get_or_create(user=request.user)
            if not profile.profile_complete:
                if request.method == 'GET':
                    next_url = request.get_full_path()
                else:
                    next_url = request.META.get('HTTP_REFERER') or request.get_full_path()
                request.session['profile_next'] = next_url

                if _is_ajax(request):
                    return JsonResponse({
                        'ok': False,
                        'profile_incomplete': True,
                        'redirect': reverse('profiles:complete_profile'),
                    }, status=403)
                return redirect('profiles:complete_profile')
        return view_func(request, *args, **kwargs)
    return wrapper

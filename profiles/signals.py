# profiles/signals.py
"""
Auto-create a Profile the moment a user signs up — regular email signup
OR social signup, deliberately not special-cased like badminton_court's
version (see task doc for why).

display_name is deliberately left BLANK here, even though `user.username`
exists (allauth auto-generates one from the email since the signup form
only collects email/password1/password2 — see settings/social_auth.py's
ACCOUNT_SIGNUP_FIELDS). Pre-filling display_name from that auto-generated
username would make every profile "complete" immediately and defeat the
actual point of asking for one.
"""

from allauth.account.signals import user_signed_up
from django.dispatch import receiver

from .models import Profile


@receiver(user_signed_up)
def create_profile_on_signup(request, user, **kwargs):
    Profile.objects.get_or_create(user=user)

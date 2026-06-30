# core/management/adapters.py

from allauth.account.adapter import DefaultAccountAdapter
from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from django.conf import settings
from django.contrib.sites.models import Site
from django.contrib import messages
from django.contrib.auth import get_user_model
from django.urls import reverse

User = get_user_model()

class CustomEmailAdapter(DefaultAccountAdapter):
    def format_email_subject(self, subject):
        # Replace any instance of example.com with our domain
        subject = subject.replace('example.com', 'aeropace.com')
        subject = subject.replace('Example.com', 'Aeropace Badminton Court')
        return super().format_email_subject(subject)

    def render_mail(self, template_prefix, email, context, headers=None):
        # Completely override the email rendering
        subject = "[Aeropace Badminton Court] Please Confirm Your Email Address"
        message = f"""Hello from Aeropace Badminton Court!

You're receiving this email because user {context.get('user', '')} has given your email address to register an account on aeropace.com.

To confirm this is correct, go to {context.get('activate_url', '')}

Thank you for using Aeropace Badminton Court!
aeropace.com"""
        return self._render_mail(subject, message, email, headers)

    def _render_mail(self, subject, message, email, headers):
        from django.core.mail import EmailMessage
        return EmailMessage(subject, message, settings.DEFAULT_FROM_EMAIL, [email], headers=headers)

    def _check_profile_completion(self, request, url):
        """
        Previously called by CustomSocialAccountAdapter.get_login_redirect_url
        but didn't exist — every social login redirect would have raised
        AttributeError. Added as part of the profiles app (see profiles/
        models.py for what "complete" means).

        No `profile_next` is set here deliberately: this only fires right
        after login, when there's no specific action-in-progress to return
        to afterward (unlike profiles.decorators.require_completed_profile,
        which guards a specific action and does set it). complete_profile
        falls back to the dashboard on its own when profile_next is absent.
        """
        if not request.user.is_authenticated:
            return url

        from profiles.models import Profile
        profile, _ = Profile.objects.get_or_create(user=request.user)
        if not profile.profile_complete:
            from django.urls import reverse
            return reverse('profiles:complete_profile')
        return url


class CustomSocialAccountAdapter(DefaultSocialAccountAdapter):
    def pre_social_login(self, request, sociallogin):
        """
        If the social login email already exists in the system, connect the
        social account to the existing user and log them in automatically.
        This prevents the "AuthAlreadyAssociated" error dialog.
        """
        # If the user is already logged in or the social account is already
        # connected, do nothing.
        if sociallogin.is_existing or request.user.is_authenticated:
            return

        email = sociallogin.user.email
        if not email:
            return

        try:
            existing_user = User.objects.get(email=email)
            # Connect the social account to the existing user
            sociallogin.connect(request, existing_user)
            # Set the user on the sociallogin so the flow continues with this user
            sociallogin.user = existing_user
            # The social login flow will now log the user in automatically
        except User.DoesNotExist:
            # No existing user – continue with normal signup flow
            pass
    def pre_social_login(self, request, sociallogin):
        """Connect social account to existing user if email is already registered."""
        if sociallogin.is_existing:
            return

        email = sociallogin.user.email
        if email:
            try:
                existing_user = User.objects.get(email=email)
                # Connect the social account to the existing user instead of creating a new one.
                sociallogin.connect(request, existing_user)
            except User.DoesNotExist:
                pass

    def get_login_redirect_url(self, request):
        """After social login, redirect to profile completion if needed."""
        url = super().get_login_redirect_url(request)
        return CustomEmailAdapter._check_profile_completion(self, request, url)
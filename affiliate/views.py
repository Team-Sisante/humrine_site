# affiliate/views.py

from django.shortcuts import get_object_or_404, redirect
from .models import TrackedAffiliateLink, AffiliateClick

def affiliate_redirect(request, slug):
    link = get_object_or_404(TrackedAffiliateLink, slug=slug)

    # Log the click
    AffiliateClick.objects.create(
        link=link,
        user=request.user if request.user.is_authenticated else None,
        ip_address=request.META.get('REMOTE_ADDR'),
        user_agent=request.META.get('HTTP_USER_AGENT', ''),
        referer=request.META.get('HTTP_REFERER', ''),
    )

    return redirect(link.original_url)
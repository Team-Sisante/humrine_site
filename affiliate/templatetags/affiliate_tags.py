# affiliate/templatetags/affiliate_tags.py

from django import template
from django.urls import reverse
from ..models import TrackedAffiliateLink

register = template.Library()

@register.simple_tag
def affiliate_url(slug):
    """
    Returns the cloaked affiliate URL for a given slug.
    Usage: {% affiliate_url 'test-mouse' %}
    Output: /out/test-mouse/
    """
    try:
        link = TrackedAffiliateLink.objects.get(slug=slug)
        return reverse('affiliate_redirect', kwargs={'slug': slug})
    except TrackedAffiliateLink.DoesNotExist:
        return '#'
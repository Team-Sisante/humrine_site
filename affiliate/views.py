# affiliate/views.py

from datetime import date

from django.contrib.admin.views.decorators import staff_member_required
from django.db.models import Count
from django.db.models.functions import TruncDate
from django.shortcuts import get_object_or_404, redirect, render

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


@staff_member_required
def affiliate_stats(request):
    # Total clicks per link
    clicks_per_link = TrackedAffiliateLink.objects.annotate(
        click_count=Count('clicks')
    ).order_by('-click_count')

    # Clicks per day (last 30 days)
    clicks_per_day = (
        AffiliateClick.objects
        .annotate(day=TruncDate('clicked_at'))
        .values('day')
        .annotate(count=Count('id'))
        .order_by('-day')[:30]
    )

    context = {
        'clicks_per_link': clicks_per_link,
        'clicks_per_day': clicks_per_day,
        'total_clicks': AffiliateClick.objects.count(),
        'today': date.today(),
    }
    return render(request, 'affiliate/stats.html', context)
# affiliate/views.py

# affiliate/views.py (complete file, updated dynamic_deals)
import csv
from datetime import date, datetime, timedelta

from django.contrib.admin.views.decorators import staff_member_required
from django.db.models import Count, Q
from django.db.models.functions import TruncDate
from django.http import HttpResponse, HttpResponseNotFound
from django.shortcuts import get_object_or_404, redirect, render
from django.views.generic import ListView

from .models import TrackedAffiliateLink, AffiliateClick
from .involve_api import InvolveAPI


def affiliate_redirect(request, slug):
    link = get_object_or_404(TrackedAffiliateLink, slug=slug)

    raw_ip = request.META.get('REMOTE_ADDR')
    anon_ip = '.'.join(raw_ip.split('.')[:3]) + '.0' if raw_ip else None

    AffiliateClick.objects.create(
        link=link,
        user=request.user if request.user.is_authenticated else None,
        ip_address=anon_ip,
        user_agent=request.META.get('HTTP_USER_AGENT', ''),
        referer=request.META.get('HTTP_REFERER', ''),
    )

    return redirect(link.original_url)


@staff_member_required
def affiliate_stats(request):
    start_str = request.GET.get('start_date', '')
    end_str = request.GET.get('end_date', '')
    export_csv = request.GET.get('export', '') == 'csv'

    if start_str and end_str:
        try:
            start_date = datetime.strptime(start_str, '%Y-%m-%d').date()
            end_date = datetime.strptime(end_str, '%Y-%m-%d').date()
        except ValueError:
            start_date = date.today() - timedelta(days=30)
            end_date = date.today()
    else:
        start_date = date.today() - timedelta(days=30)
        end_date = date.today()

    clicks_in_range = AffiliateClick.objects.filter(
        clicked_at__date__gte=start_date,
        clicked_at__date__lte=end_date,
    )

    clicks_per_link = TrackedAffiliateLink.objects.annotate(
        click_count=Count('clicks', filter=Q(clicks__in=clicks_in_range))
    ).order_by('-click_count')

    clicks_per_day = (
        clicks_in_range
        .annotate(day=TruncDate('clicked_at'))
        .values('day')
        .annotate(count=Count('id'))
        .order_by('-day')
    )

    if export_csv:
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="affiliate_clicks_{start_date}_{end_date}.csv"'
        writer = csv.writer(response)
        writer.writerow(['Date', 'Link', 'Merchant', 'IP', 'User Agent', 'Referer'])
        for click in clicks_in_range.select_related('link'):
            writer.writerow([
                click.clicked_at.strftime('%Y-%m-%d %H:%M'),
                click.link.title if click.link else 'Dynamic',
                click.link.merchant if click.link else '',
                click.ip_address,
                click.user_agent,
                click.referer,
            ])
        return response

    context = {
        'clicks_per_link': clicks_per_link,
        'clicks_per_day': clicks_per_day,
        'total_clicks': clicks_in_range.count(),
        'today': date.today(),
        'start_date': start_date,
        'end_date': end_date,
    }
    return render(request, 'affiliate/stats.html', context)


class DealListView(ListView):
    model = TrackedAffiliateLink
    template_name = 'affiliate/deal_list.html'
    context_object_name = 'links'


def affiliate_involve_redirect(request, offer_id):
    try:
        result = InvolveAPI.generate_deep_link(offer_id)
        deep_link = result.get('data', {}).get('deep_link')
        if not deep_link:
            return HttpResponseNotFound("Deep link not available")
    except Exception:
        return HttpResponseNotFound("Failed to retrieve link")

    raw_ip = request.META.get('REMOTE_ADDR')
    anon_ip = '.'.join(raw_ip.split('.')[:3]) + '.0' if raw_ip else None

    AffiliateClick.objects.create(
        link=None,
        user=request.user if request.user.is_authenticated else None,
        ip_address=anon_ip,
        user_agent=request.META.get('HTTP_USER_AGENT', ''),
        referer=request.META.get('HTTP_REFERER', ''),
    )
    return redirect(deep_link)


def dynamic_deals(request):
    offers = []
    api_failed = False
    try:
        offers_response = InvolveAPI.get_offers(limit=20, page=1)
        offers = offers_response.get('data', [])
    except Exception:
        api_failed = True

    # If no offers from API (or API failed), fall back to database links
    fallback_links = []
    if not offers:
        fallback_links = TrackedAffiliateLink.objects.exclude(image_url='').order_by('-created_at')[:20]

    context = {
        'offers': offers,
        'api_failed': api_failed,
        'fallback_links': fallback_links,
    }
    return render(request, 'affiliate/dynamic_deals.html', context)

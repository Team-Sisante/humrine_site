# affiliate/views.py

import csv
from datetime import date, datetime, timedelta

from django.contrib.admin.views.decorators import staff_member_required
from django.db.models import Count, Q
from django.db.models.functions import TruncDate
from django.http import HttpResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.views.generic import ListView

from .models import TrackedAffiliateLink, AffiliateClick


def affiliate_redirect(request, slug):
    link = get_object_or_404(TrackedAffiliateLink, slug=slug)

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
                click.link.title or click.link.slug,
                click.link.merchant,
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
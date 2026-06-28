# humrine_site/urls.py

"""
URL configuration for humrine_site project.
"""
import sys
from django.contrib import admin
from django.urls import path, include
from django.views.generic import TemplateView
from django.contrib.sitemaps.views import sitemap
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse
from django.views import View

from .sitemaps import StaticViewSitemap
from pages.views import (
    AboutView, ContactView, FeedbackView,
    PrivacyPolicyView, TermsOfServiceView
)

sitemaps = {'static': StaticViewSitemap}


# ---- Health check endpoint ----
class HealthCheckView(View):
    def get(self, request):
        return JsonResponse({"status": "ok"})


# ---- Base URL patterns (no affiliate or deals during migrations) ----
urlpatterns = [
    path('about/', AboutView.as_view(), name='about'),
    path('contact/', ContactView.as_view(), name='contact'),
    path('feedback/', FeedbackView.as_view(), name='feedback'),
    path('privacy-policy/', PrivacyPolicyView.as_view(), name='privacy_policy'),
    path('terms-of-service/', TermsOfServiceView.as_view(), name='terms_of_service'),
    path('sitemap.xml', sitemap, {'sitemaps': sitemaps}, name='django.contrib.sitemaps.views.sitemap'),
    path('robots.txt', TemplateView.as_view(template_name='robots.txt', content_type='text/plain')),
    path('ads.txt', TemplateView.as_view(template_name='ads.txt', content_type='text/plain')),
    # path('toons/', include('toons.urls')),
    path('blog/', include('blog.urls')),
    # path('ckeditor/', include('ckeditor_uploader.urls')),
    path('health/', HealthCheckView.as_view(), name='health_check'),
    # path('accounts/', include('allauth.urls')),
]

# ---- Conditionally add affiliate/deals (skip during migrations) ----
is_migration = any('makemigrations' in arg or 'migrate' in arg for arg in sys.argv)
if not is_migration:
    # These imports are only evaluated when the server is running
    from . import urls_affiliate  # optional: but we'll just inline
    # Actually, we need a lazy way. We'll use a function.
    def get_deal_list_view():
        from affiliate.views import DealListView
        return DealListView.as_view()

    urlpatterns += [
        path('', include('affiliate.urls')),
        path('deals/', get_deal_list_view(), name='deals'),
    ]

# ---- Conditionally add admin (also skip during migrations) ----
if not is_migration:
    urlpatterns += [
        path('admin/', admin.site.urls),
    ]

# ---- Serve media and static files in development ----
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
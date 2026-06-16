# affiliate/urls.py

from django.urls import path
from . import views

urlpatterns = [
    path('out/<slug:slug>/', views.affiliate_redirect, name='affiliate_redirect'),
    path('stats/', views.affiliate_stats, name='affiliate_stats'),
    path('out/involve/<str:offer_id>/', views.affiliate_involve_redirect, name='affiliate_involve_redirect'),
    path('dynamic-deals/', views.dynamic_deals, name='dynamic_deals'),
]
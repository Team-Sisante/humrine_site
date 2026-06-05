# affiliate/urls.py

from django.urls import path
from . import views

urlpatterns = [
    path('out/<slug:slug>/', views.affiliate_redirect, name='affiliate_redirect'),
]
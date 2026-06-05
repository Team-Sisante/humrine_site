# home/urls.py

from django.urls import path, include
from . import views
from .views import HomeView
from django.views.generic import TemplateView

app_name = 'home'

urlpatterns = [
    path('', HomeView.as_view(), name='home'),
    path('health/', views.health_check, name='health-check'),
    path('', include('affiliate.urls')),
]

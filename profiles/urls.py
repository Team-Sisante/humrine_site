# profiles/urls.py

from django.urls import path

from . import views

app_name = 'profiles'

urlpatterns = [
    path('dashboard/', views.dashboard, name='dashboard'),
    path('profile/complete/', views.complete_profile, name='complete_profile'),
]

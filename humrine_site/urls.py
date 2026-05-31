"""
URL configuration for humrine_site project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include

# Import the static page views
from pages.views import (
    AboutView, ContactView, FeedbackView,
    PrivacyPolicyView, TermsOfServiceView
)

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # Existing home app – DO NOT CHANGE
    path('', include('home.urls')),
    
    # New static pages
    path('about/',       AboutView.as_view(),          name='about'),
    path('contact/',     ContactView.as_view(),        name='contact'),
    path('feedback/',    FeedbackView.as_view(),       name='feedback'),
    path('privacy-policy/',  PrivacyPolicyView.as_view(),  name='privacy_policy'),
    path('terms-of-service/', TermsOfServiceView.as_view(), name='terms_of_service'),
]

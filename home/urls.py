from django.urls import path
from .views import HomeView
from django.views.generic import TemplateView

app_name = 'home'

urlpatterns = [
    path('', HomeView.as_view(), name='home'),

    
    # Legal Routes
    path('privacy-policy/', TemplateView.as_view(template_name='legal/privacy_policy.html'), name='privacy_policy'),
    path('terms-of-service/', TemplateView.as_view(template_name='legal/terms_of_service.html'), name='terms_of_service'),
]

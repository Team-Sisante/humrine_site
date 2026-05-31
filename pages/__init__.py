from django.shortcuts import render
from django.views.generic import TemplateView

class HomeView(TemplateView):
    template_name = 'home.html'

class AboutView(TemplateView):
    template_name = 'about.html'

class ContactView(TemplateView):
    template_name = 'contact.html'

class FeedbackView(TemplateView):
    template_name = 'feedback.html'

class PrivacyPolicyView(TemplateView):
    template_name = 'privacy_policy.html'

class TermsOfServiceView(TemplateView):
    template_name = 'terms_of_service.html'
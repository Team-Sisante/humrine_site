# home/views.py 
from django.views.generic import TemplateView
from django.http import HttpResponse

def health_check(request):
    return HttpResponse("OK")

class HomeView(TemplateView):
    template_name = 'home/home.html'

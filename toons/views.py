from django.views.generic import ListView, DetailView
from .models import ToonStory

class StoryListView(ListView):
    model = ToonStory
    template_name = 'toons/story_list.html'
    context_object_name = 'stories'

class StoryDetailView(DetailView):
    model = ToonStory
    template_name = 'toons/story_detail.html'
    context_object_name = 'story'
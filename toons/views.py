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

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        # Get current story
        current = self.get_object()
        # Get previous and next stories (ordered by created_at)
        context['prev_story'] = ToonStory.objects.filter(
            created_at__lt=current.created_at
        ).order_by('-created_at').first()
        context['next_story'] = ToonStory.objects.filter(
            created_at__gt=current.created_at
        ).order_by('created_at').first()
        return context
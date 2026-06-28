# toons/views.py

from django.views.generic import ListView, DetailView
from django.shortcuts import get_object_or_404

class StoryListView(ListView):
    template_name = 'toons/story_list.html'
    context_object_name = 'stories'

    def get_queryset(self):
        from .models import ToonStory
        return ToonStory.objects.all().order_by('-created_at')


class StoryDetailView(DetailView):
    template_name = 'toons/story_detail.html'
    context_object_name = 'story'

    def get_object(self, queryset=None):
        from .models import ToonStory
        return get_object_or_404(ToonStory, slug=self.kwargs['slug'])

    def get_context_data(self, **kwargs):
        from .models import ToonStory, StoryRating, PanelReaction
        context = super().get_context_data(**kwargs)
        story = self.get_object()
        user = self.request.user

        # User's rating (if any)
        if user.is_authenticated:
            try:
                context['user_rating'] = StoryRating.objects.get(user=user, story=story).rating
            except StoryRating.DoesNotExist:
                context['user_rating'] = None
        else:
            context['user_rating'] = None

        # For each panel, get reaction counts
        panels = story.panels.all()
        for panel in panels:
            reactions = panel.reactions.all()
            panel.reaction_counts = {}
            for rt, _ in PanelReaction.REACTION_TYPES:
                panel.reaction_counts[rt] = reactions.filter(reaction_type=rt).count()
            if user.is_authenticated:
                panel.user_reaction = reactions.filter(user=user).first()
            else:
                panel.user_reaction = None

        context['panels'] = panels
        return context
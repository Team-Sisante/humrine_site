# engagement/mixins.py

from django.contrib.contenttypes.models import ContentType

from .forms import CommentForm
from .models import Comment, Reaction


class EngagementContextMixin:
    """
    Mix into any DetailView to inject comments + reaction data for the
    page's object into the template context.

    Adds: comments, comment_form, reaction_counts, reaction_choices,
    user_reaction, engagement_app_label, engagement_model_name,
    engagement_object_id.
    """

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        obj = context.get(self.context_object_name) or self.object
        content_type = ContentType.objects.get_for_model(obj)

        context['comments'] = Comment.objects.filter(
            content_type=content_type, object_id=obj.pk, is_hidden=False,
        ).select_related('author')
        context['comment_form'] = CommentForm()

        context['engagement_app_label'] = content_type.app_label
        context['engagement_model_name'] = content_type.model
        context['engagement_object_id'] = obj.pk
        context['reaction_choices'] = Reaction.REACTION_CHOICES

        context['reaction_counts'] = {
            choice: Reaction.objects.filter(
                content_type=content_type, object_id=obj.pk, reaction_type=choice,
            ).count()
            for choice, _ in Reaction.REACTION_CHOICES
        }

        user = self.request.user
        if user.is_authenticated:
            existing = Reaction.objects.filter(
                content_type=content_type, object_id=obj.pk, user=user,
            ).first()
            context['user_reaction'] = existing.reaction_type if existing else None
        else:
            context['user_reaction'] = None

        return context

from django import template
from django.contrib.contenttypes.models import ContentType

register = template.Library()


@register.filter
def get_item(dictionary, key):
    """Usage: {{ reaction_counts|get_item:code }} — dict lookup with a variable key."""
    return dictionary.get(key, 0)


@register.inclusion_tag('engagement/_reactions_only.html', takes_context=True)
def render_reactions(context, obj):
    """
    Renders a lightweight reaction-only bar for any model instance.
    Usage in templates: {% render_reactions img %}
    Used for per-image reactions inside the blog gallery loop, where the
    full comments+reactions widget is overkill and would be confusing (one
    comments section per image would be excessive).
    """
    from engagement.models import Reaction

    content_type = ContentType.objects.get_for_model(obj)
    request = context.get('request')

    counts = {
        choice: Reaction.objects.filter(
            content_type=content_type, object_id=obj.pk, reaction_type=choice,
        ).count()
        for choice, _ in Reaction.REACTION_CHOICES
    }

    user_reaction = None
    if request and request.user.is_authenticated:
        existing = Reaction.objects.filter(
            content_type=content_type, object_id=obj.pk, user=request.user,
        ).first()
        user_reaction = existing.reaction_type if existing else None

    return {
        'request': request,
        'engagement_app_label': content_type.app_label,
        'engagement_model_name': content_type.model,
        'engagement_object_id': obj.pk,
        'reaction_choices': Reaction.REACTION_CHOICES,
        'reaction_counts': counts,
        'user_reaction': user_reaction,
    }

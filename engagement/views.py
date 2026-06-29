# engagement/views.py

from django.contrib.auth.decorators import login_required
from django.contrib.contenttypes.models import ContentType
from django.http import HttpResponseBadRequest, JsonResponse
from django.shortcuts import get_object_or_404, redirect
from django.views.decorators.http import require_POST

from .forms import CommentForm
from .models import Reaction


def _is_ajax(request):
    return request.headers.get('X-Requested-With') == 'XMLHttpRequest'


def _get_target(app_label, model_name, object_id):
    content_type = get_object_or_404(ContentType, app_label=app_label, model=model_name)
    model_class = content_type.model_class()
    if model_class is None:
        return HttpResponseBadRequest('Unknown content type')
    obj = get_object_or_404(model_class, pk=object_id)
    return content_type, obj


@login_required
@require_POST
def add_comment(request, app_label, model_name, object_id):
    content_type, obj = _get_target(app_label, model_name, object_id)

    form = CommentForm(request.POST)
    if form.is_valid():
        comment = form.save(commit=False)
        comment.author = request.user
        comment.content_type = content_type
        comment.object_id = obj.pk
        comment.save()

        if _is_ajax(request):
            return JsonResponse({
                'ok': True,
                'comment': {
                    'id': comment.id,
                    'author': str(comment.author),
                    'body': comment.body,
                    'created_at': comment.created_at.strftime('%b %d, %Y %I:%M %p'),
                },
            })
    elif _is_ajax(request):
        return JsonResponse({'ok': False, 'errors': form.errors}, status=400)

    return redirect(request.META.get('HTTP_REFERER', '/'))


@login_required
@require_POST
def toggle_reaction(request, app_label, model_name, object_id):
    content_type, obj = _get_target(app_label, model_name, object_id)

    reaction_type = request.POST.get('reaction_type')
    valid_types = dict(Reaction.REACTION_CHOICES)
    if reaction_type not in valid_types:
        return HttpResponseBadRequest('Invalid reaction_type')

    existing = Reaction.objects.filter(
        user=request.user, content_type=content_type, object_id=obj.pk,
    ).first()

    if existing and existing.reaction_type == reaction_type:
        # Clicking the same reaction again removes it.
        existing.delete()
        user_reaction = None
    elif existing:
        existing.reaction_type = reaction_type
        existing.save(update_fields=['reaction_type'])
        user_reaction = reaction_type
    else:
        Reaction.objects.create(
            user=request.user,
            content_type=content_type,
            object_id=obj.pk,
            reaction_type=reaction_type,
        )
        user_reaction = reaction_type

    counts = {
        choice: Reaction.objects.filter(
            content_type=content_type, object_id=obj.pk, reaction_type=choice,
        ).count()
        for choice, _ in Reaction.REACTION_CHOICES
    }

    if _is_ajax(request):
        return JsonResponse({'ok': True, 'user_reaction': user_reaction, 'counts': counts})

    return redirect(request.META.get('HTTP_REFERER', '/'))

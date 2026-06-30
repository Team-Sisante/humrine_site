# profiles/views.py

from django.contrib.auth.decorators import login_required
from django.shortcuts import redirect, render

from .forms import ProfileForm
from .models import Profile


@login_required
def dashboard(request):
    """
    "My Activity" — the registered-user home base. Shows your own
    comments and reactions across blog + toons, with a nudge to complete
    your profile if you haven't yet. Deliberately NOT gated by
    @require_completed_profile itself — it's the page that link points
    AT, gating it would create a redirect loop.
    """
    profile, _ = Profile.objects.get_or_create(user=request.user)

    comments = (
        request.user.engagement_comments
        .filter(is_hidden=False)
        .select_related('content_type')
        .order_by('-created_at')[:20]
    )
    reactions = (
        request.user.engagement_reactions
        .select_related('content_type')
        .order_by('-created_at')[:20]
    )

    # GenericForeignKey doesn't cascade-delete — if the underlying Post/
    # ToonStory was removed, content_object resolves to None. Filter those
    # out so the template doesn't have to special-case missing content.
    comments = [c for c in comments if c.content_object is not None]
    reactions = [r for r in reactions if r.content_object is not None]

    context = {
        'profile': profile,
        'comments': comments,
        'reactions': reactions,
        'comment_count': request.user.engagement_comments.filter(is_hidden=False).count(),
        'reaction_count': request.user.engagement_reactions.count(),
    }
    return render(request, 'profiles/dashboard.html', context)


@login_required
def complete_profile(request):
    profile, _ = Profile.objects.get_or_create(user=request.user)

    if request.method == 'POST':
        form = ProfileForm(request.POST, request.FILES, instance=profile)
        if form.is_valid():
            form.save()
            next_url = request.session.pop('profile_next', None)
            return redirect(next_url or 'profiles:dashboard')
    else:
        form = ProfileForm(instance=profile)

    return render(request, 'profiles/complete_profile.html', {
        'form': form,
        'profile': profile,
    })

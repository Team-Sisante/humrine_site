# profiles/models.py
"""
Profile model: the thing a user fills in to unlock posting comments and
leaving reactions (see profiles/decorators.py). Deliberately lightweight
compared to badminton_court's Customer model — no phone/address, since
those don't mean anything for a content site. Avatar reuses the same
resize-on-save helper already used by blog/toons images.
"""

from django.conf import settings
from django.db import models

from humrine_site.image_utils import resize_image_field


class Profile(models.Model):
    AVATAR_MAX_WIDTH = 400  # square-ish avatar, doesn't need blog/toon-sized resolution

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='profile',
    )
    display_name = models.CharField(max_length=80, blank=True)
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    bio = models.CharField(max_length=280, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    @property
    def profile_complete(self):
        """
        Profile counts as complete once a display name is set. Avatar/bio
        stay optional — display_name is the one piece every "who said
        this" UI (comments, reactions, dashboard) actually needs.
        """
        return bool(self.display_name.strip())

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        resize_image_field(self.avatar, self.AVATAR_MAX_WIDTH)

    def __str__(self):
        return self.display_name or f'Profile({self.user})'

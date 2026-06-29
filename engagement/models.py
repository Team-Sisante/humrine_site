# engagement/models.py
"""
Reusable comment + reaction models.

These attach to ANY model via a GenericForeignKey (blog.Post, blog.PostImage,
toons.ToonStory, toons.ToonPanel, ...), so blog and toons share one
implementation instead of each rolling their own comment/reaction tables.
"""

from django.conf import settings
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.db import models


class Comment(models.Model):
    """A comment left by an authenticated reader on any commentable object."""

    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='engagement_comments',
    )
    body = models.TextField(max_length=2000)
    created_at = models.DateTimeField(auto_now_add=True)
    is_hidden = models.BooleanField(
        default=False,
        help_text='Hide without deleting (e.g. for moderation).',
    )

    # Generic relation: works for Post, ToonStory, ToonPanel, PostImage, etc.
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    content_object = GenericForeignKey('content_type', 'object_id')

    class Meta:
        ordering = ['created_at']
        indexes = [models.Index(fields=['content_type', 'object_id'])]

    def __str__(self):
        return f'{self.author} on {self.content_object}: {self.body[:40]}'


class Reaction(models.Model):
    """
    A like/heart/emoji reaction left by an authenticated reader.

    Design choice: ONE reaction per user per object (Facebook-style) —
    picking a new reaction type replaces the old one rather than stacking.
    If you'd rather allow a user to leave multiple different reactions on
    the same object at once, drop `reaction_type` from `unique_together`.
    """

    LIKE = 'LIKE'
    HEART = 'HEART'
    LAUGH = 'LAUGH'
    WOW = 'WOW'
    SAD = 'SAD'
    ANGRY = 'ANGRY'

    REACTION_CHOICES = [
        (LIKE, '👍'),
        (HEART, '❤️'),
        (LAUGH, '😂'),
        (WOW, '😮'),
        (SAD, '😢'),
        (ANGRY, '😡'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='engagement_reactions',
    )
    reaction_type = models.CharField(max_length=10, choices=REACTION_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)

    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    content_object = GenericForeignKey('content_type', 'object_id')

    class Meta:
        unique_together = ('user', 'content_type', 'object_id')
        indexes = [models.Index(fields=['content_type', 'object_id'])]

    def __str__(self):
        return f'{self.user} {self.get_reaction_type_display()} on {self.content_object}'

# toons/models.py

from django.db import models
from django.conf import settings  # <-- use this instead of User import
from django.utils.text import slugify
# from ckeditor.fields import RichTextField

from humrine_site.image_utils import resize_image_field

class ToonStory(models.Model):
    title = models.CharField(max_length=200)
    slug = models.SlugField(unique=True, max_length=200, blank=True)
    description = models.TextField(blank=True)  
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.title)
        super().save(*args, **kwargs)

    def get_absolute_url(self):
        from django.urls import reverse
        return reverse('story_detail', kwargs={'slug': self.slug})

    def __str__(self):
        return self.title

    @property
    def average_rating(self):
        ratings = self.ratings.all()
        if not ratings:
            return 0
        return round(sum(r.rating for r in ratings) / ratings.count(), 1)

    @property
    def rating_count(self):
        return self.ratings.count()


class ToonPanel(models.Model):
    IMAGE_MAX_WIDTH = 800  # see task notes: standard webtoon panel width

    story = models.ForeignKey(ToonStory, on_delete=models.CASCADE, related_name='panels')
    image = models.ImageField(upload_to='toons/')
    order = models.PositiveSmallIntegerField(default=0)
    caption = models.CharField(max_length=300, blank=True)

    class Meta:
        ordering = ['order']

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        resize_image_field(self.image, self.IMAGE_MAX_WIDTH)

    def __str__(self):
        return f"{self.story.title} - Panel {self.order}"


# ---- Ratings ----
class StoryRating(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)  # <-- changed
    story = models.ForeignKey(ToonStory, on_delete=models.CASCADE, related_name='ratings')
    rating = models.PositiveSmallIntegerField(choices=[(i, i) for i in range(1, 6)])
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'story')

    def __str__(self):
        return f"{self.user.username} - {self.story.title} - {self.rating}⭐"


# ---- Reactions on Panels ----
class PanelReaction(models.Model):
    REACTION_TYPES = [
        ('LIKE', '👍 Like'),
        ('LOVE', '❤️ Love'),
        ('SAD', '😢 Sad'),
        ('PRAY', '🙏 Pray'),
        ('LAUGH', '😂 Laugh'),
        ('WOW', '😮 Wow'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)  # <-- changed
    panel = models.ForeignKey(ToonPanel, on_delete=models.CASCADE, related_name='reactions')
    reaction_type = models.CharField(max_length=10, choices=REACTION_TYPES)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'panel', 'reaction_type')

    def __str__(self):
        return f"{self.user.username} - {self.panel.story.title} Panel {self.panel.order} - {self.get_reaction_type_display()}"
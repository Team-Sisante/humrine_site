# toons/models.py

from django.db import models
from django.utils.text import slugify
from ckeditor.fields import RichTextField

class ToonStory(models.Model):
    title = models.CharField(max_length=200)
    slug = models.SlugField(unique=True, max_length=200, blank=True)
    description = RichTextField(blank=True, config_name='toons')
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.title)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.title

class ToonPanel(models.Model):
    story = models.ForeignKey(ToonStory, on_delete=models.CASCADE, related_name='panels')
    image = models.ImageField(upload_to='toons/')
    order = models.PositiveIntegerField(default=0)
    caption = models.CharField(max_length=300, blank=True)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"{self.story.title} - Panel {self.order}"
# blog/models.py

from django.db import models
from django.utils.text import slugify
from django.urls import reverse
from ckeditor.fields import RichTextField

from humrine_site.image_utils import resize_image_field

class Post(models.Model):
    IMAGE_MAX_WIDTH = 1200  # see task notes: standard width for blog content images

    title = models.CharField(max_length=200)
    slug = models.SlugField(unique=True, max_length=200, blank=True)
    body = RichTextField(blank=True, config_name='blog')
    image = models.ImageField(upload_to='blog/', blank=True, null=True)
    published = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.title)
        super().save(*args, **kwargs)
        resize_image_field(self.image, self.IMAGE_MAX_WIDTH)

    def get_absolute_url(self):
        return reverse('blog_detail', kwargs={'slug': self.slug})

    def __str__(self):
        return self.title
    
class PostImage(models.Model):
    IMAGE_MAX_WIDTH = 1200

    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to='blog/')
    caption = models.CharField(max_length=200, blank=True)

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        resize_image_field(self.image, self.IMAGE_MAX_WIDTH)

    def __str__(self):
        return f"Image for {self.post.title}"    

    
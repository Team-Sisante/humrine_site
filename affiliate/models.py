# affiliate/models.py

from django.db import models
from django.contrib.auth.models import User  # optional, for logged‑in users

class TrackedAffiliateLink(models.Model):
    original_url = models.URLField(max_length=2000)
    slug = models.SlugField(unique=True, max_length=100)
    title = models.CharField(max_length=255, blank=True)
    merchant = models.CharField(
        max_length=50,
        choices=[
            ('lazada', 'Lazada'),
            ('shopee', 'Shopee'),
            ('involve', 'Involve Asia'),
            ('other', 'Other'),
        ],
        default='other',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title or self.slug} ({self.merchant})"


class AffiliateClick(models.Model):
    link = models.ForeignKey(
        TrackedAffiliateLink,
        on_delete=models.CASCADE,
        related_name='clicks'
    )
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    referer = models.URLField(blank=True)
    clicked_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Click on {self.link.slug} at {self.clicked_at}"
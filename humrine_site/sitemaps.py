# humrine_site/sitemaps.py

from django.contrib.sitemaps import Sitemap
from django.urls import reverse

class StaticViewSitemap(Sitemap):
    changefreq = "weekly"
    priority = 0.8

    def items(self):
        return ['home', 'about', 'contact', 'deals', 'privacy_policy', 'terms_of_service']

    def location(self, item):
        return reverse(item)
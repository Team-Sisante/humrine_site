# affiliate/admin.py

from django.contrib import admin
from .models import TrackedAffiliateLink, AffiliateClick

@admin.register(TrackedAffiliateLink)
class TrackedAffiliateLinkAdmin(admin.ModelAdmin):
    list_display = ['title', 'slug', 'merchant', 'created_at']
    search_fields = ['title', 'slug', 'original_url']
    prepopulated_fields = {'slug': ('title',)}   # auto-fills slug when typing title

@admin.register(AffiliateClick)
class AffiliateClickAdmin(admin.ModelAdmin):
    list_display = ['link', 'clicked_at', 'ip_address', 'user_agent_short']
    list_filter = ['link', 'clicked_at']
    search_fields = ['ip_address', 'referer']
    readonly_fields = ['link', 'user', 'ip_address', 'user_agent', 'referer', 'clicked_at']
    date_hierarchy = 'clicked_at'

    @admin.display(description='User Agent')
    def user_agent_short(self, obj):
        return obj.user_agent[:80] if obj.user_agent else ''
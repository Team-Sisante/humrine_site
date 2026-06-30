# profiles/admin.py

from django.contrib import admin

from .models import Profile


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'display_name', 'profile_complete', 'created_at']
    search_fields = ['display_name', 'user__username', 'user__email']

# toons/admin.py

from django.contrib import admin
from .models import ToonStory, ToonPanel

class ToonPanelInline(admin.TabularInline):
    model = ToonPanel
    extra = 1
    ordering = ['order']

@admin.register(ToonStory)
class ToonStoryAdmin(admin.ModelAdmin):
    list_display = ['title', 'created_at']
    prepopulated_fields = {'slug': ('title',)}
    inlines = [ToonPanelInline]
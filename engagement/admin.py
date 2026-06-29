# engagement/admin.py

from django.contrib import admin

from .models import Comment, Reaction


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ['author', 'content_type', 'object_id', 'created_at', 'is_hidden']
    list_filter = ['content_type', 'is_hidden']
    search_fields = ['body', 'author__username', 'author__email']
    actions = ['hide_comments', 'unhide_comments']

    def hide_comments(self, request, queryset):
        queryset.update(is_hidden=True)
    hide_comments.short_description = 'Hide selected comments'

    def unhide_comments(self, request, queryset):
        queryset.update(is_hidden=False)
    unhide_comments.short_description = 'Unhide selected comments'


@admin.register(Reaction)
class ReactionAdmin(admin.ModelAdmin):
    list_display = ['user', 'reaction_type', 'content_type', 'object_id', 'created_at']
    list_filter = ['reaction_type', 'content_type']
    search_fields = ['user__username', 'user__email']

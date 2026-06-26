# blog/admin.py
from django.contrib import admin
from .models import Post, PostImage

class PostImageInline(admin.TabularInline):
    model = PostImage
    extra = 1
    readonly_fields = ('image_preview', 'image_url')

    def image_preview(self, obj):
        if obj.image:
            return f'<img src="{obj.image.url}" style="max-height:50px;" />'
        return ''
    image_preview.allow_tags = True

    def image_url(self, obj):
        return obj.image.url if obj.image else ''
    image_url.short_description = 'Image URL'

@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ['title', 'published']
    prepopulated_fields = {'slug': ('title',)}
    inlines = [PostImageInline]

@admin.register(PostImage)
class PostImageAdmin(admin.ModelAdmin):
    list_display = ['id', 'post', 'image', 'caption', 'image_url']
    list_filter = ['post']
    search_fields = ['post__title', 'caption']
    readonly_fields = ('image_url',)
    actions = ['delete_selected']   # built‑in bulk delete

    def image_url(self, obj):
        return obj.image.url if obj.image else ''
    image_url.short_description = 'Image URL'
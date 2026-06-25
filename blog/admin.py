from django.contrib import admin
from .models import Post, PostImage

class PostImageInline(admin.TabularInline):
    model = PostImage
    extra = 1

@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ['title', 'published']
    prepopulated_fields = {'slug': ('title',)}
    inlines = [PostImageInline]    
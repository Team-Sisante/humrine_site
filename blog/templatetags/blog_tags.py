from django import template
from blog.models import Post

register = template.Library()

@register.inclusion_tag('blog/latest_posts.html')
def latest_posts(count=3):
    posts = Post.objects.order_by('-published')[:count]
    return {'posts': posts}
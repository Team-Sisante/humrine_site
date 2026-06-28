# blog/views.py

from django.views.generic import ListView, DetailView
from django.shortcuts import get_object_or_404

class PostListView(ListView):
    template_name = 'blog/post_list.html'
    context_object_name = 'posts'

    def get_queryset(self):
        from .models import Post
        return Post.objects.all().order_by('-published')


class PostDetailView(DetailView):
    template_name = 'blog/post_detail.html'
    context_object_name = 'post'

    def get_object(self, queryset=None):
        from .models import Post
        return get_object_or_404(Post, slug=self.kwargs['slug'])
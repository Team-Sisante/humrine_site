# blog/urls.py

from django.urls import path
from . import views

urlpatterns = [
    path('', views.PostListView.as_view(), name='blog_list'),
    path('<slug:slug>/', views.PostDetailView.as_view(), name='blog_detail'),
    path('ckeditor/', include('ckeditor_uploader.urls')),
]
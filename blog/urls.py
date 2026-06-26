# blog/urls.py

from django.urls import path, include
from . import views

urlpatterns = [
    path('', views.PostListView.as_view(), name='blog_list'),
    path('<slug:slug>/', views.PostDetailView.as_view(), name='blog_detail'),
]
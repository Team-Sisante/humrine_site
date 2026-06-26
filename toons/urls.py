# toons/urls.py

from django.urls import path
from . import views

urlpatterns = [
    path('', views.StoryListView.as_view(), name='story_list'),
    path('<slug:slug>/', views.StoryDetailView.as_view(), name='story_detail'),
]
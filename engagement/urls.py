# engagement/urls.py

from django.urls import path

from . import views

app_name = 'engagement'

urlpatterns = [
    path('comment/<str:app_label>/<str:model_name>/<int:object_id>/',
         views.add_comment, name='add_comment'),
    path('react/<str:app_label>/<str:model_name>/<int:object_id>/',
         views.toggle_reaction, name='toggle_reaction'),
]

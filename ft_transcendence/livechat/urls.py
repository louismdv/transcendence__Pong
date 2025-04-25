# chat/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path('load_messages/<int:user_id>/', views.load_messages, name='load_messages'),
]

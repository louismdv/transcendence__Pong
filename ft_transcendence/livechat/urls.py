# chat/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path('#chat/<int:chat_id>', views.get_messages, name='get_messages'),
]

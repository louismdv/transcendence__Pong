# chat/urls.py
from django.urls import path
from . import views

urlpatterns = [
    # path('load_sender_messages/<int:user_id>/', views.load_sender_messages, name='load_messages'),
    # path('load_receiver_messages/<int:user_id>/', views.load_receiver_messages, name='load_messages'),
    path('load_chat_log/<int:user_id>/', views.load_chat_log, name='load_chat_log'),
]

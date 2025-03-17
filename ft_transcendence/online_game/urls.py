# urls.py
from django.urls import path
from . import views

urlpatterns = [
    path('lobby/', views.lobby, name='lobby'),  # Lobby page to join or create rooms
    path('<str:room_name>/', views.gameroom, name='gameroom'),  # Room where players will play
] 
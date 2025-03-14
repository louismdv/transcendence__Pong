# urls.py
from django.urls import path
from . import views

urlpatterns = [
    path('lobby/', views.lobby, name='lobby'),  # Lobby page to join or create rooms
    path('game_room/<str:room_name>/', views.game_room, name='game_room'),  # Room where players will play
] 
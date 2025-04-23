# urls.py
from django.urls import path
from . import views
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('lobby/', views.lobby, name='lobby'),  # Lobby page to join or create rooms
    path('#game/<str:room_name>', views.gameroom, name='gameroom'),  # Room where players will play
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT) # enables loading media and statics
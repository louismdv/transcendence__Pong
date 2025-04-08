from django.contrib import admin
from django.urls import path, include
from . import views
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('', views.home, name='home'),
    path('online-game/', include('online_game.urls')),
    path('login/', views.login_view, name='login'),
    path('register/', views.register, name='register'),
    path('livechat/', views.livechat, name='livechat'),
    path('local-game/', views.localgame, name='localgame'),
    path('friendspage/', views.friendspage, name='friendspage'),
    path('settingspage/', views.settingspage, name='settingspage'),
    path('tournament/', views.tournament, name='tournament'),
    path('tournament/join/', views.tournament_join, name='tournament_join'),
    path('tournament/leave/', views.tournament_leave, name='tournament_leave'),
    path('tournament/ready/', views.tournament_ready, name='tournament_ready'),
    path('settingspage/update-profile/', views.settingspage, name='update_profile'),
    path('settingspage/update-account/', views.settingspage, name='update_account'),
    path('settingspage/update-preferences/', views.settingspage, name='update_preferences'),
    path('settingspage/delete-account/', views.settingspage, name='delete_account'),
    path('api/auth/', include('dj_rest_auth.urls')),
    path('api/auth/registration/', include('dj_rest_auth.registration.urls')),
    path('home/', views.home, name='home')  
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
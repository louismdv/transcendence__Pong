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
    path('api/friends/', views.get_friends, name='get_friends'),
    path('api/friends/requests/', views.get_friend_requests, name='get_friend_requests'),
     path('api/users/search/', views.search_users, name='search_users'),
    path('api/friends/request/<int:user_id>/', views.send_friend_request, name='send_friend_request'),
    path('api/friends/request/handle/<int:request_id>/', views.handle_friend_request, name='handle_friend_request'),
    path('api/friends/<int:friend_id>/remove/', views.remove_friend, name='remove_friend'),
    path('api/friends/<int:user_id>/block/', views.block_user, name='block_user'),
    
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
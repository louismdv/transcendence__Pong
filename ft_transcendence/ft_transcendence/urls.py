from django.contrib import admin
from django.urls import path, include
from . import views
from django.conf import settings
from django.urls import path, re_path
from django.conf.urls.static import static

urlpatterns = [
    path('', views.home, name='home'),
    path('online-game/', include('online_game.urls')),
    path('login/', views.login_view, name='login'),
    path('chatpage/', views.chatpage, name='chatpage'),
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
    path('auth/login/', views.login_42, name='login_42'),
    path('auth/callback/', views.callback_42, name='callback_42'),
    path('api/friends/', views.get_friends, name='get_friends'),
    path('api/friends/requests/', views.get_friend_requests, name='get_friend_requests'),
    path('api/users/search/', views.search_users, name='search_users'),
    path('api/friends/request/<int:user_id>/', views.send_friend_request, name='send_friend_request'),
    path('api/friends/request/handle/<int:request_id>/', views.handle_friend_request, name='handle_friend_request'),
    path('api/friends/<int:friend_id>/remove/', views.remove_friend, name='remove_friend'),
    path('api/friends/<int:user_id>/block/', views.block_user, name='block_user'),
    path('api/friends/blocked/', views.get_blocked_users, name='get_blocked_users'),
    path('api/friends/<int:user_id>/unblock/', views.unblock_user, name='unblock_user'),
    path('api/friends/status/', views.get_friend_statuses, name='get_friend_statuses'),
    path('api/update-online-status/', views.update_online_status, name='update_online_status'),
    path('api/dashboard-data/', views.dashboard_data, name='dashboard_data'),
    path('api/game/invite/<int:user_id>/', views.invite_to_game, name='invite_to_game'),
    path('profile/<int:user_id>/', views.user_profile, name='user_profile'),
    path('chat/<int:user_id>/', views.chat_with_user, name='chat_with_user'),
    path('tournament/', views.tournament, name='tournament'),
    path('tournament_game/', views.tournament_game, name='tournament_game'),
    re_path(r'^tournament/?$', views.tournament, name='tournament'),
    path('livechat/', include('livechat.urls')),
    
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
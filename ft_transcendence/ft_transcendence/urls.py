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
    path('api/auth/', include('dj_rest_auth.urls')),
    path('api/auth/registration/', include('dj_rest_auth.registration.urls')),
    path('home/', views.home, name='home'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

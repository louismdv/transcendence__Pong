from django.urls import path, include
from . import views

from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('', views.home2, name='home'),  # Accueil
    path('login/', views.login_view, name='login'),  # Page de login
    path('register/', views.register, name='register'),  # Page d'inscription
    path('api/auth/', include('dj_rest_auth.urls')),  # API d'authentification
    path('api/auth/registration/', include('dj_rest_auth.registration.urls')),  # API d'inscription
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
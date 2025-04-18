from django.shortcuts import render, redirect
from django.views.decorators.csrf import csrf_protect
from django.contrib.auth.decorators import login_required
from django.contrib.auth import login, authenticate
from django.contrib.auth.forms import UserCreationForm, AuthenticationForm
from django.contrib import messages
from django.http import JsonResponse
from django.core.files.storage import default_storage
from .models import UserProfile, UserPreferences
from django.conf import settings
import os
import json
from django.utils import translation


import requests
from django.contrib.auth.models import User

# Step 1: Redirect to 42
def login_42(request):
    auth_url = (
        f"https://api.intra.42.fr/oauth/authorize?"
        f"client_id={settings.FT_CLIENT_ID}&"
        f"redirect_uri={settings.FT_REDIRECT_URI}&"
        f"response_type=code"
    )
    return redirect(auth_url)

# Step 2: Handle callback

from urllib.request import urlopen
from django.core.files.base import ContentFile
import os

def callback_42(request):
    code = request.GET.get("code")
    if not code:
        return render(request, "error.html", {"message": "No code provided."})

    # Step 1: Get access token
    token_response = requests.post("https://api.intra.42.fr/oauth/token", data={
        "grant_type": "authorization_code",
        "client_id": settings.FT_CLIENT_ID,
        "client_secret": settings.FT_CLIENT_SECRET,
        "code": code,
        "redirect_uri": settings.FT_REDIRECT_URI,
    })
    token_json = token_response.json()
    access_token = token_json.get("access_token")

    if not access_token:
        return render(request, "error.html", {"message": "Could not get access token."})

    # Step 2: Get user info
    user_info_response = requests.get("https://api.intra.42.fr/v2/me", headers={
        "Authorization": f"Bearer {access_token}"
    })
    user_info = user_info_response.json()

    username = user_info.get("login")
    email = user_info.get("email")
    profile_pic_url = user_info.get("image", {}).get("link")

    if not username:
        return render(request, "error.html", {"message": "Missing username from 42 API response."})

    # Step 3: Get or create Django user
    user, created = User.objects.get_or_create(username=username, defaults={"email": email})
    user.backend = 'django.contrib.auth.backends.ModelBackend'

    # Step 4: Save 42 avatar to UserProfile
    if profile_pic_url:
        try:
            image_data = urlopen(profile_pic_url).read()
            filename = os.path.basename(profile_pic_url)

            if not hasattr(user, 'userprofile'):
                from .models import UserProfile
                UserProfile.objects.create(user=user)

            user.userprofile.avatar.save(filename, ContentFile(image_data), save=True)
        except Exception as e:
            print(f"[42 Avatar Error] Could not save avatar: {e}")

    # Step 5: Log in user
    login(request, user)
    return redirect("/")




def main(request):
    return render(request, 'main.html')

@login_required(login_url='/login')
def home(request):
    return render(request, 'home.html')

def livechat(request):
    return render(request, 'livechat.html')

@login_required(login_url='/login')
def localgame(request):
    return render(request, 'localgame.html')

@login_required(login_url='/login')
@csrf_protect
def settingspage(request):
    try:
        if not hasattr(request.user, 'userprofile'):
            UserProfile.objects.create(user=request.user)
        if not hasattr(request.user, 'preferences'):
            UserPreferences.objects.create(user=request.user)
    except Exception as e:
        messages.error(request, "Erreur lors de l'initialisation des paramètres utilisateur")
        return redirect('home')

    if request.method == 'POST':
        try:
            content_type = request.headers.get('Content-Type', '')
            data = json.loads(request.body) if 'application/json' in content_type else request.POST
            action = data.get('action')

            if not action:
                return JsonResponse({'status': 'error', 'message': 'Action non spécifiée'})

            if action == 'update_profile':
                username = data.get('username')
                if not username:
                    return JsonResponse({'status': 'error', 'message': "Nom d'utilisateur requis"})

                avatar_url = None
                if request.FILES.get('avatar'):
                    avatar = request.FILES['avatar']
                    if avatar.size > settings.AVATAR_MAX_SIZE:
                        return JsonResponse({'status': 'error', 'message': "Image trop volumineuse"})
                    if not any(avatar.name.lower().endswith(ext) for ext in settings.AVATAR_ALLOWED_FILE_EXTS):
                        return JsonResponse({'status': 'error', 'message': "Format non supporté"})

                    old_avatar_path = request.user.userprofile.avatar.path if request.user.userprofile.avatar.name != 'avatars/default.png' else None
                    if old_avatar_path and os.path.exists(old_avatar_path):
                        os.remove(old_avatar_path)

                    request.user.userprofile.avatar = avatar
                    request.user.userprofile.save()
                    avatar_url = request.user.userprofile.avatar.url

                request.user.username = username
                request.user.save()

                return JsonResponse({
                    'status': 'success',
                    'message': 'Profil mis à jour',
                    'username': request.user.username,
                    'avatar_url': avatar_url or request.user.userprofile.avatar.url
                })

            elif action == 'update_account':
                email = data.get('email')
                current_password = data.get('current_password')
                new_password = data.get('new_password')
                confirm_password = data.get('confirm_password')

                if current_password and not request.user.check_password(current_password):
                    return JsonResponse({'status': 'error', 'message': 'Mot de passe incorrect'})

                if new_password:
                    if new_password != confirm_password:
                        return JsonResponse({'status': 'error', 'message': 'Les mots de passe ne correspondent pas'})
                    if len(new_password) < 8:
                        return JsonResponse({'status': 'error', 'message': 'Mot de passe trop court'})
                    request.user.set_password(new_password)

                if email:
                    request.user.email = email

                request.user.save()
                return JsonResponse({'status': 'success', 'message': 'Compte mis à jour', 'email': request.user.email})

            elif action == 'update_preferences':
                prefs = request.user.preferences
                for field, choices in [('time_format', UserPreferences.TIME_FORMAT_CHOICES),
                                       ('timezone', UserPreferences.TIMEZONE_CHOICES),
                                       ('language', UserPreferences.LANGUAGE_CHOICES)]:
                    value = data.get(field)
                    if value and value in dict(choices):
                        setattr(prefs, field, value)
                prefs.save()
                return JsonResponse({'status': 'success', 'message': 'Préférences mises à jour', 'preferences': {
                    'time_format': prefs.time_format,
                    'timezone': prefs.timezone,
                    'language': prefs.language,
                }})

            elif action == 'delete_account':
                if data.get('confirm_deletion') != 'true':
                    return JsonResponse({'status': 'error', 'message': 'Confirmation requise'})
                username = request.user.username
                request.user.delete()
                return JsonResponse({'status': 'success', 'message': f'Compte {username} supprimé', 'redirect': '/login'})

            return JsonResponse({'status': 'error', 'message': 'Action inconnue'})

        except json.JSONDecodeError:
            return JsonResponse({'status': 'error', 'message': 'JSON invalide'})
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)})

    try:
        user_data = {
            'username': request.user.username,
            'email': request.user.email,
            'avatar': request.user.userprofile.avatar.url if request.user.userprofile.avatar else None,
            'preferences': {
                'time_format': request.user.preferences.time_format,
                'timezone': request.user.preferences.timezone,
                'language': request.user.preferences.language,
            }
        }
        if request.headers.get('Accept') == 'application/json':
            return JsonResponse({'user_data': user_data})
        return render(request, 'settings.html')
    except Exception as e:
        messages.error(request, f"Erreur chargement paramètres: {str(e)}")
        return redirect('home')

@login_required(login_url='/login')
def friendspage(request):
    return render(request, 'friendspage.html')

def register(request):
    if request.method == 'POST':
        form = UserCreationForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user, backend='django.contrib.auth.backends.ModelBackend')
            messages.success(request, 'Inscription réussie')
            return redirect('login')
        else:
            for field, errors in form.errors.items():
                for error in errors:
                    messages.error(request, f"{field}: {error}")
    else:
        form = UserCreationForm()
    return render(request, 'register.html', {'form': form})

@csrf_protect
def login_view(request):
    if request.method == 'POST':
        form = AuthenticationForm(request, data=request.POST)
        if form.is_valid():
            login(request, form.get_user())
            return redirect('home')
        else:
            messages.error(request, 'Identifiants incorrects')
    else:
        form = AuthenticationForm()
    return render(request, 'login.html', {'form': form})

@login_required(login_url='/login')
def tournament(request):
    if not hasattr(request.user, 'userprofile'):
        UserProfile.objects.create(user=request.user)
    return render(request, 'tournament.html')

@login_required(login_url='/login')
@csrf_protect
def tournament_join(request):
    if request.method == 'POST':
        return JsonResponse({
            'status': 'success',
            'message': 'Tournoi rejoint',
            'player_id': str(request.user.id),
            'username': request.user.username
        })
    return JsonResponse({'status': 'error', 'message': 'Méthode non autorisée'})

@login_required(login_url='/login')
@csrf_protect
def tournament_leave(request):
    if request.method == 'POST':
        return JsonResponse({'status': 'success', 'message': 'Tournoi quitté'})
    return JsonResponse({'status': 'error', 'message': 'Méthode non autorisée'})

@login_required(login_url='/login')
@csrf_protect
def tournament_ready(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            ready = data.get('ready', False)
            return JsonResponse({'status': 'success', 'message': 'Prêt mis à jour', 'ready': ready})
        except json.JSONDecodeError:
            return JsonResponse({'status': 'error', 'message': 'JSON invalide'})
    return JsonResponse({'status': 'error', 'message': 'Méthode non autorisée'})

@login_required
def set_language_ajax(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        lang = data.get('language')
        if lang in ['en', 'fr', 'es']:
            # Set language in session
            request.session[translation.LANGUAGE_SESSION_KEY] = lang
            translation.activate(lang)
            return JsonResponse({'status': 'ok'})
    return JsonResponse({'status': 'error'}, status=400)

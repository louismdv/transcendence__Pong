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
    # Ensure user has profile and preferences
    try:
        if not hasattr(request.user, 'userprofile'):
            print("Debug: Creating user profile")
            UserProfile.objects.create(user=request.user)
        if not hasattr(request.user, 'preferences'):
            print("Debug: Creating user preferences")
            UserPreferences.objects.create(user=request.user)
    except Exception as e:
        print(f"Error creating user profile/preferences: {str(e)}")
        messages.error(request, "Erreur lors de l'initialisation des paramètres utilisateur")
        return redirect('home')

    if request.method == 'POST':
        try:
            if request.headers.get('Content-Type') == 'application/json':
                data = json.loads(request.body)
                action = data.get('action')
            else:
                action = request.POST.get('action')
                data = request.POST

            if not action:
                return JsonResponse({'status': 'error', 'message': 'Action non spécifiée'})

            if action == 'update_profile':
                user = request.user
                username = data.get('username')
                
                if not username:
                    return JsonResponse({'status': 'error', 'message': "Nom d'utilisateur requis"})
                
                avatar_url = None
                if request.FILES.get('avatar'):
                    avatar = request.FILES['avatar']
                    if avatar.size > settings.AVATAR_MAX_SIZE:
                        return JsonResponse({'status': 'error', 'message': "L'image est trop volumineuse"})
                    if not any(avatar.name.lower().endswith(ext) for ext in settings.AVATAR_ALLOWED_FILE_EXTS):
                        return JsonResponse({'status': 'error', 'message': 'Format de fichier non supporté'})
                    
                    # Supprimer l'ancien avatar s'il existe et n'est pas l'avatar par défaut
                    if user.userprofile.avatar and user.userprofile.avatar.name != 'avatars/default.png':
                        try:
                            old_avatar_path = user.userprofile.avatar.path
                            if os.path.exists(old_avatar_path):
                                os.remove(old_avatar_path)
                        except Exception as e:
                            print(f"Error deleting old avatar: {str(e)}")
                    
                    user.userprofile.avatar = avatar
                    user.userprofile.save()
                    avatar_url = user.userprofile.avatar.url
                
                user.username = username
                user.save()
                
                return JsonResponse({
                    'status': 'success',
                    'message': 'Profil mis à jour avec succès',
                    'avatar_url': avatar_url or (user.userprofile.avatar.url if user.userprofile.avatar else None),
                    'username': user.username
                })

            elif action == 'update_account':
                user = request.user
                email = data.get('email')
                current_password = data.get('current_password')
                new_password = data.get('new_password')
                confirm_password = data.get('confirm_password')

                if current_password and not user.check_password(current_password):
                    return JsonResponse({'status': 'error', 'message': 'Mot de passe incorrect'})

                if new_password:
                    if new_password != confirm_password:
                        return JsonResponse({'status': 'error', 'message': 'Les mots de passe ne correspondent pas'})
                    if len(new_password) < 8:
                        return JsonResponse({'status': 'error', 'message': 'Le mot de passe doit contenir au moins 8 caractères'})
                    user.set_password(new_password)

                if email:
                    user.email = email

                user.save()
                return JsonResponse({
                    'status': 'success',
                    'message': 'Compte mis à jour avec succès',
                    'email': user.email
                })

            elif action == 'update_preferences':
                preferences = request.user.preferences
                time_format = data.get('time_format')
                timezone = data.get('timezone')
                language = data.get('language')

                if time_format and time_format in dict(UserPreferences.TIME_FORMAT_CHOICES):
                    preferences.time_format = time_format
                if timezone and timezone in dict(UserPreferences.TIMEZONE_CHOICES):
                    preferences.timezone = timezone
                if language and language in dict(UserPreferences.LANGUAGE_CHOICES):
                    preferences.language = language

                preferences.save()
                return JsonResponse({
                    'status': 'success',
                    'message': 'Préférences mises à jour avec succès',
                    'preferences': {
                        'time_format': preferences.time_format,
                        'timezone': preferences.timezone,
                        'language': preferences.language
                    }
                })

            elif action == 'delete_account':
                if not data.get('confirm_deletion') == 'true':
                    return JsonResponse({'status': 'error', 'message': 'Confirmation requise'})
                
                username = request.user.username
                request.user.delete()
                return JsonResponse({
                    'status': 'success',
                    'message': f'Compte {username} supprimé avec succès',
                    'redirect': '/login'
                })

            return JsonResponse({'status': 'error', 'message': 'Action non reconnue'})

        except json.JSONDecodeError:
            return JsonResponse({'status': 'error', 'message': 'Format JSON invalide'})
        except Exception as e:
            print(f"Error in POST request: {str(e)}")
            return JsonResponse({'status': 'error', 'message': str(e)})

    # GET request
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
        return render(request, 'settingspage.html', {
            'user_data': user_data,
            'avatar_max_size': settings.AVATAR_MAX_SIZE,
            'avatar_allowed_exts': settings.AVATAR_ALLOWED_FILE_EXTS
        })
    except Exception as e:
        print(f"Error in GET request: {str(e)}")
        messages.error(request, f"Erreur lors du chargement des paramètres: {str(e)}")
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

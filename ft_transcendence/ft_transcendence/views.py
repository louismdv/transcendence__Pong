from django.shortcuts import render, redirect
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from django.contrib.auth.decorators import login_required
from django.contrib.auth import login, authenticate
from django.contrib.auth.forms import UserCreationForm, AuthenticationForm
from django.contrib import messages
from django.http import JsonResponse
from django.core.files.storage import default_storage
from .models import UserProfile, UserPreferences
from django.conf import settings
from django.views.decorators.http import require_POST
from django.contrib.auth.models import User
from .models import Friendship
from django.utils import timezone
from datetime import timedelta
from django.db import models
from .models import Friendship, UserProfile
import os
import json
from django.utils import translation
from django.http import HttpResponseForbidden
import requests
from django.contrib.auth.models import User

# Step 1: Redirect to 42
@ensure_csrf_cookie
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

@ensure_csrf_cookie
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

@ensure_csrf_cookie
def main(request):
    return render(request, 'main.html')

@ensure_csrf_cookie
@login_required(login_url='/login')
def home(request):
    return render(request, 'home.html')

@ensure_csrf_cookie
def livechat(request):
    return render(request, 'livechat.html')

@ensure_csrf_cookie
@login_required(login_url='/login')
def localgame(request):
    return render(request, 'localgame.html')

@ensure_csrf_cookie
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

@ensure_csrf_cookie
@login_required(login_url='/login')
def friendspage(request):
    return render(request, 'friendspage.html')

@ensure_csrf_cookie
@csrf_protect
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

@ensure_csrf_cookie
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

@ensure_csrf_cookie
@login_required(login_url='/login')
def tournament(request):
    if not hasattr(request.user, 'userprofile'):
        UserProfile.objects.create(user=request.user)
    return render(request, 'tournament.html')

@ensure_csrf_cookie
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

@ensure_csrf_cookie
@login_required(login_url='/login')
@csrf_protect
def tournament_leave(request):
    if request.method == 'POST':
        return JsonResponse({'status': 'success', 'message': 'Tournoi quitté'})
    return JsonResponse({'status': 'error', 'message': 'Méthode non autorisée'})

@ensure_csrf_cookie
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

@ensure_csrf_cookie
@login_required
def get_friends(request):
    # Récupérer les amis (statut "accepted")
    friends_sent = Friendship.objects.filter(sender=request.user, status='accepted')
    friends_received = Friendship.objects.filter(receiver=request.user, status='accepted')
    
    friends_data = []
    
    for friendship in friends_sent:
        friend = friendship.receiver
        friends_data.append({
            'id': friend.id,
            'username': friend.username,
            'avatar': friend.userprofile.avatar.url if hasattr(friend, 'userprofile') and friend.userprofile.avatar else None,
            'online': hasattr(friend, 'userprofile') and getattr(friend.userprofile, 'is_online', False),
        })
    
    for friendship in friends_received:
        friend = friendship.sender
        friends_data.append({
            'id': friend.id,
            'username': friend.username,
            'avatar': friend.userprofile.avatar.url if hasattr(friend, 'userprofile') and friend.userprofile.avatar else None,
            'online': hasattr(friend, 'userprofile') and getattr(friend.userprofile, 'is_online', False),
        })
    
    return JsonResponse({'friends': friends_data})

@ensure_csrf_cookie
@login_required
def get_friend_requests(request):
    # Récupérer les demandes d'amis reçues (statut "pending")
    requests = Friendship.objects.filter(receiver=request.user, status='pending')
    
    requests_data = []
    for req in requests:
        requests_data.append({
            'id': req.id,
            'username': req.sender.username,
            'avatar': req.sender.userprofile.avatar.url if hasattr(req.sender, 'userprofile') and req.sender.userprofile.avatar else None,
            'created_at': req.created_at.isoformat(),
        })
    
    return JsonResponse({'requests': requests_data})

@ensure_csrf_cookie
@login_required
def search_users(request):
    query = request.GET.get('q', '')
    if len(query) < 3:
        return JsonResponse({'users': []})
    
    users = User.objects.filter(username__icontains=query).exclude(id=request.user.id)[:10]
    
    users_data = []
    for user in users:
        # Vérifier si une relation d'amitié existe déjà
        friendship_sent = Friendship.objects.filter(sender=request.user, receiver=user).first()
        friendship_received = Friendship.objects.filter(sender=user, receiver=request.user).first()
        
        status = None
        is_sender = False
        request_id = None
        
        if friendship_sent:
            status = friendship_sent.status
            is_sender = True
            request_id = friendship_sent.id
        elif friendship_received:
            status = friendship_received.status
            is_sender = False
            request_id = friendship_received.id
        
        users_data.append({
            'id': user.id,
            'username': user.username,
            'avatar': user.userprofile.avatar.url if hasattr(user, 'userprofile') and user.userprofile.avatar else None,
            'status': status,
            'is_sender': is_sender,
            'request_id': request_id,
        })
    
    return JsonResponse({'users': users_data})

@ensure_csrf_cookie
@login_required
@require_POST
def send_friend_request(request, user_id):
    try:
        receiver = User.objects.get(id=user_id)
        
        # Vérifier si une demande existe déjà
        if Friendship.objects.filter(
            (models.Q(sender=request.user) & models.Q(receiver=receiver)) | 
            (models.Q(sender=receiver) & models.Q(receiver=request.user))
        ).exists():
            return JsonResponse({'success': False, 'message': 'Une relation existe déjà avec cet utilisateur'})
        
        # Créer la demande d'ami
        friendship = Friendship(sender=request.user, receiver=receiver, status='pending')
        friendship.save()
        
        return JsonResponse({'success': True})
    except User.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Utilisateur non trouvé'})

@ensure_csrf_cookie
@login_required
@require_POST
def handle_friend_request(request, request_id):
    try:
        data = json.loads(request.body)
        action = data.get('action')
        
        friendship = Friendship.objects.get(id=request_id, receiver=request.user, status='pending')
        
        if action == 'accept':
            friendship.status = 'accepted'
            friendship.save()
            return JsonResponse({'success': True})
        elif action == 'reject':
            friendship.status = 'rejected'
            friendship.save()
            return JsonResponse({'success': True})
        else:
            return JsonResponse({'success': False, 'message': 'Action non reconnue'})
    except Friendship.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Demande non trouvée'})
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'message': 'Données invalides'})

@ensure_csrf_cookie
@login_required
@require_POST
def remove_friend(request, friend_id):
    # Supprimer la relation d'amitié dans les deux sens
    count = 0
    try:
        friendship1 = Friendship.objects.filter(sender=request.user, receiver_id=friend_id, status='accepted')
        friendship2 = Friendship.objects.filter(sender_id=friend_id, receiver=request.user, status='accepted')
        
        count += friendship1.delete()[0]
        count += friendship2.delete()[0]
        
        return JsonResponse({'success': True if count > 0 else False})
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)})

@ensure_csrf_cookie
@login_required
@require_POST
def block_user(request, user_id):
    try:
        user_to_block = User.objects.get(id=user_id)
        
        # Supprimer les relations existantes
        Friendship.objects.filter(
            (models.Q(sender=request.user) & models.Q(receiver=user_to_block)) | 
            (models.Q(sender=user_to_block) & models.Q(receiver=request.user))
        ).delete()
        
        # Créer la relation de blocage
        friendship = Friendship(sender=request.user, receiver=user_to_block, status='blocked')
        friendship.save()
        
        return JsonResponse({'success': True})
    except User.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Utilisateur non trouvé'})

@ensure_csrf_cookie
def update_online_status(request):
    """Met à jour automatiquement les statuts des utilisateurs inactifs"""
    # Définir le délai après lequel un utilisateur est considéré comme hors ligne (10s)
    offline_threshold = timezone.now() - timedelta(seconds=10)
    
    updated_count = UserProfile.objects.filter(
        last_activity__lt=offline_threshold, 
        is_online=True
    ).update(is_online=False)
    
    return JsonResponse({'success': True, 'updated': updated_count})

@ensure_csrf_cookie
@login_required
def get_friend_statuses(request):
    # Récupérer les amis (statut "accepted")
    friends_sent = Friendship.objects.filter(sender=request.user, status='accepted')
    friends_received = Friendship.objects.filter(receiver=request.user, status='accepted')
    
    friend_statuses = []
    
    for friendship in friends_sent:
        friend = friendship.receiver
        friend_statuses.append({
            'id': friend.id,
            'username': friend.username,
            'online': hasattr(friend, 'userprofile') and friend.userprofile.is_online
        })
    
    for friendship in friends_received:
        friend = friendship.sender
        friend_statuses.append({
            'id': friend.id,
            'username': friend.username,
            'online': hasattr(friend, 'userprofile') and friend.userprofile.is_online
        })
    
    return JsonResponse({'friends': friend_statuses})

@ensure_csrf_cookie
@login_required
@require_POST
def remove_friend(request, friend_id):
    """Supprime une relation d'amitié."""
    try:
        # Supprimer la relation d'amitié dans les deux sens
        friendship1 = Friendship.objects.filter(
            sender=request.user, 
            receiver_id=friend_id, 
            status='accepted'
        )
        friendship2 = Friendship.objects.filter(
            sender_id=friend_id, 
            receiver=request.user, 
            status='accepted'
        )
        
        count = friendship1.delete()[0] + friendship2.delete()[0]
        
        return JsonResponse({'success': count > 0})
            
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)})

@ensure_csrf_cookie
@login_required
@require_POST
def block_user(request, user_id):
    """Bloque un utilisateur."""
    try:
        user_to_block = User.objects.get(id=user_id)
        
        # Supprimer les relations existantes
        Friendship.objects.filter(
            (models.Q(sender=request.user) & models.Q(receiver=user_to_block)) | 
            (models.Q(sender=user_to_block) & models.Q(receiver=request.user))
        ).delete()
        
        # Créer la relation de blocage
        friendship = Friendship(
            sender=request.user,
            receiver=user_to_block,
            status='blocked'
        )
        friendship.save()
        
        return JsonResponse({'success': True})
    except User.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Utilisateur non trouvé'})
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)})

@ensure_csrf_cookie
@login_required
@require_POST
def invite_to_game(request, user_id):
    """Invite un utilisateur à jouer."""
    try:
        user_to_invite = User.objects.get(id=user_id)
        
        # Vérifier si l'utilisateur est un ami
        is_friend = Friendship.objects.filter(
            (models.Q(sender=request.user) & models.Q(receiver=user_to_invite) & models.Q(status='accepted')) |
            (models.Q(sender=user_to_invite) & models.Q(receiver=request.user) & models.Q(status='accepted'))
        ).exists()
        
        if not is_friend:
            return JsonResponse({'success': False, 'message': 'Vous ne pouvez inviter que vos amis à jouer'})
        
        # Ici, vous pourriez implémenter la logique d'envoi d'invitation au jeu
        # Par exemple, via des notifications WebSocket ou en sauvegardant dans la base de données
        
        return JsonResponse({'success': True, 'message': 'Invitation envoyée !'})
    except User.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Utilisateur non trouvé'})
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)})

@ensure_csrf_cookie
@login_required
def user_profile(request, user_id):
    """Affiche le profil d'un utilisateur."""
    try:
        user = User.objects.get(id=user_id)
        
        # Vérifier si l'utilisateur est bloqué
        is_blocked = Friendship.objects.filter(
            sender=request.user,
            receiver=user,
            status='blocked'
        ).exists()
        
        # Vérifier si l'utilisateur est un ami
        is_friend = Friendship.objects.filter(
            (models.Q(sender=request.user) & models.Q(receiver=user) & models.Q(status='accepted')) |
            (models.Q(sender=user) & models.Q(receiver=request.user) & models.Q(status='accepted'))
        ).exists()
        
        context = {
            'profile_user': user,
            'is_friend': is_friend,
            'is_blocked': is_blocked,
        }
        
        return render(request, 'profile.html', context)
    except User.DoesNotExist:
        messages.error(request, "Utilisateur non trouvé.")
        return redirect('friends')

@ensure_csrf_cookie
@login_required
def chat_with_user(request, user_id):
    """Affiche ou crée une conversation avec un utilisateur."""
    try:
        other_user = User.objects.get(id=user_id)
        
        # Vérifier si l'utilisateur est un ami
        is_friend = Friendship.objects.filter(
            (models.Q(sender=request.user) & models.Q(receiver=other_user) & models.Q(status='accepted')) |
            (models.Q(sender=other_user) & models.Q(receiver=request.user) & models.Q(status='accepted'))
        ).exists()
        
        if not is_friend:
            messages.warning(request, "Vous ne pouvez discuter qu'avec vos amis.")
            return redirect('friends')
        
        # Récupérer ou créer une conversation
        # Cette partie dépend de votre implémentation du système de chat
        
        context = {
            'other_user': other_user,
        }
        
        return render(request, 'chat.html', context)
    except User.DoesNotExist:
        messages.error(request, "Utilisateur non trouvé.")
        return redirect('friends')

@ensure_csrf_cookie
@login_required
def get_blocked_users(request):
    """Récupère la liste des utilisateurs bloqués par l'utilisateur connecté."""
    try:
        # Récupérer les relations de blocage (ajustez selon votre modèle)
        blocked_relations = Friendship.objects.filter(
            sender=request.user,
            status='blocked'
        ).select_related('receiver')
        
        blocked_users = []
        for relation in blocked_relations:
            # Adapter les champs selon votre modèle
            user_info = {
                'id': relation.receiver.id,
                'username': relation.receiver.username,
                'blocked_date': relation.created_at.isoformat()
            }
            
            # Gérer l'avatar selon votre logique
            if hasattr(relation.receiver, 'userprofile') and relation.receiver.userprofile.avatar:
                user_info['avatar'] = relation.receiver.userprofile.avatar.url
            else:
                user_info['avatar'] = None
            
            blocked_users.append(user_info)
        
        return JsonResponse({'blocked_users': blocked_users})
    
    except Exception as e:
        # Logger l'erreur pour le débogage
        print(f"Error in get_blocked_users: {e}")
        return JsonResponse({'blocked_users': [], 'error': str(e)})

@ensure_csrf_cookie
@login_required
@require_POST
def unblock_user(request, user_id):
    """Débloque un utilisateur."""
    try:
        user_to_unblock = User.objects.get(id=user_id)
        
        # Trouver et supprimer la relation de blocage
        blocked_relation = Friendship.objects.filter(
            sender=request.user,
            receiver=user_to_unblock,
            status='blocked'
        )
        
        if not blocked_relation.exists():
            return JsonResponse({
                'success': False, 
                'message': 'Cet utilisateur n\'est pas bloqué.'
            })
        
        blocked_relation.delete()
        return JsonResponse({'success': True})
    
    except User.DoesNotExist:
        return JsonResponse({
            'success': False, 
            'message': 'Utilisateur non trouvé.'
        })
    
    except Exception as e:
        print(f"Error in unblock_user: {e}")
        return JsonResponse({
            'success': False, 
            'message': f'Une erreur est survenue: {str(e)}'
        })

@ensure_csrf_cookie
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

@ensure_csrf_cookie
@login_required
def chatpage(request):
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return render(request, 'chatpage.html')
    return redirect('home')

@ensure_csrf_cookie
def dashboard_data(request):
    # Get the current user
    user = request.user.userprofile
    
    # Example data - replace with your actual data retrieval logic
    user_stats = {
        'local_wins': user.local_wins,
        'local_losses': user.local_losses,
        'local_total_games': user.total_local_games,
        
        'online_wins': user.online_wins,
        'online_losses': user.online_losses,
        'online_total_games': user.total_online_games,
        
        'totalGames': user.total_online_games,
        'tournamentsWon': 3,
        'recentGames': [
            {
                'date': '2023-05-15',
                'opponent': 'Joueur2',
                'result': 'Victoire',
                'score': '10-7',
                'duration': '3:24'
            },
            {
                'date': '2023-05-14',
                'opponent': 'Joueur3',
                'result': 'Défaite',
                'score': '5-10',
                'duration': '4:12'
            },
            {
                'date': '2023-05-12',
                'opponent': 'Joueur1',
                'result': 'Victoire',
                'score': '10-3',
                'duration': '2:45'
            },
            {
                'date': '2023-05-10',
                'opponent': 'Joueur4',
                'result': 'Victoire',
                'score': '10-8',
                'duration': '5:30'
            },
            {
                'date': '2023-05-08',
                'opponent': 'Joueur5',
                'result': 'Défaite',
                'score': '8-10',
                'duration': '4:50'
            }
        ],
        'tournaments': [
            {
                'date': '2023-05-20',
                'name': 'Tournoi du weekend',
                'placement': '1ère Place',
                'players': 4
            },
            {
                'date': '2023-05-13',
                'name': 'Tournoi du vendredi',
                'placement': '2ème Place',
                'players': 4
            },
            {
                'date': '2023-05-06',
                'name': 'Défi hebdomadaire',
                'placement': '1ère Place',
                'players': 4
            }
        ]
    }
    
    return JsonResponse(user_stats)


@ensure_csrf_cookie
@login_required(login_url='/login')
def tournament_game(request):
    """Vue pour afficher la page du jeu en tournoi."""
    # Récupérer les paramètres de l'URL
    player1 = request.GET.get('player1', 'Player 1')
    player2 = request.GET.get('player2', 'Player 2')
    match_type = request.GET.get('match', 'Match')
    
    context = {
        'player1': player1,
        'player2': player2,
        'match_type': match_type
    }
    
    return render(request, 'tournament_game.html', context)
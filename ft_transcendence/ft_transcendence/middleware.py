from django.utils import timezone

class UserActivityMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        
        if request.user.is_authenticated:
            # Mettre à jour le statut de l'utilisateur
            try:
                profile = request.user.userprofile
                profile.is_online = True
                profile.last_activity = timezone.now()
                profile.save(update_fields=['is_online', 'last_activity'])
            except Exception as e:
                print(f"Error updating user online status: {e}")
                
        return response
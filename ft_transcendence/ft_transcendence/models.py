from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.core.exceptions import ObjectDoesNotExist
from django.utils import timezone

class UserProfile(models.Model):
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='userprofile'
    )
    avatar = models.ImageField(
        upload_to='avatars/',
        null=True,
        blank=True,
        default='../static/assets/default.png'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_online = models.BooleanField(default=False)
    last_activity = models.DateTimeField(default=timezone.now)

    # 🏆 Game history fields
    online_wins = models.PositiveIntegerField(default=0)
    online_losses = models.PositiveIntegerField(default=0)
    total_online_games = models.PositiveIntegerField(default=0)
    
    local_wins = models.PositiveIntegerField(default=0)
    local_losses = models.PositiveIntegerField(default=0)
    total_local_games = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name = 'User Profile'
        verbose_name_plural = 'User Profiles'

    def __str__(self):
        return f"{self.user.username}'s profile"


class UserPreferences(models.Model):
    TIME_FORMAT_CHOICES = [
        ('12h', '12 heures'),
        ('24h', '24 heures'),
    ]
    
    LANGUAGE_CHOICES = [
        ('fr', 'Français'),
        ('en', 'English'),
        ('es', 'Spanish'),
    ]

    TIMEZONE_CHOICES = [
        ('Europe/Paris', 'Paris (UTC+1)'),
        ('Europe/London', 'London (UTC+0)'),
        ('America/New_York', 'New York (UTC-5)'),
        ('Asia/Tokyo', 'Tokyo (UTC+9)'),
    ]

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='preferences'
    )
    time_format = models.CharField(
        max_length=3,
        choices=TIME_FORMAT_CHOICES,
        default='24h'
    )
    timezone = models.CharField(
        max_length=50,
        choices=TIMEZONE_CHOICES,
        default='Europe/Paris'
    )
    language = models.CharField(
        max_length=2,
        choices=LANGUAGE_CHOICES,
        default='fr'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'User Preferences'
        verbose_name_plural = 'User Preferences'

    def __str__(self):
        return f"{self.user.username}'s preferences"

@receiver(post_save, sender=User)
def create_user_profile_and_preferences(sender, instance, created, **kwargs):
    if created:
        try:
            UserProfile.objects.create(user=instance)
        except Exception as e:
            print(f"Error creating UserProfile: {e}")

        try:
            UserPreferences.objects.create(user=instance)
        except Exception as e:
            print(f"Error creating UserPreferences: {e}")

@receiver(post_save, sender=User)
def save_user_profile_and_preferences(sender, instance, **kwargs):

    try:
        if not hasattr(instance, 'userprofile'):
            UserProfile.objects.create(user=instance)
        else:
            instance.userprofile.save()
    except Exception as e:
        print(f"Error saving UserProfile: {e}")

    try:
        if not hasattr(instance, 'preferences'):
            UserPreferences.objects.create(user=instance)
        else:
            instance.preferences.save()
    except Exception as e:
        print(f"Error saving UserPreferences: {e}")

class Friendship(models.Model):
    STATUS_CHOICES = (
        ('pending', 'En attente'),
        ('accepted', 'Accepté'),
        ('rejected', 'Rejeté'),
        ('blocked', 'Bloqué'),
    )
    
    sender = models.ForeignKey(User, related_name='friendship_requests_sent', on_delete=models.CASCADE)
    receiver = models.ForeignKey(User, related_name='friendship_requests_received', on_delete=models.CASCADE)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ('sender', 'receiver')

class GameRoom(models.Model):
    user = models.ForeignKey(User, related_name='game_rooms', on_delete=models.CASCADE)
    opponent = models.ForeignKey(User, related_name='opponent_rooms', on_delete=models.CASCADE, null=True, blank=True)
    winner = models.ForeignKey(User, related_name='games_won', on_delete=models.CASCADE, null=True, blank=True)
    room_name = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)
    score = models.CharField(max_length=10, default='0-0')
    duration = models.DurationField(null=True, blank=True)

    def __str__(self):
            return self.room_name
    
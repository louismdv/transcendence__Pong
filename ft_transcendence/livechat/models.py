
from django.db import models
from django.contrib.auth import get_user_model

class Message(models.Model):
    User = get_user_model()
    id = models.AutoField(primary_key=True)  # This is the default for Django primary keys
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name="sent_messages")
    receiver = models.ForeignKey(User, on_delete=models.CASCADE, related_name="received_messages")
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.sender.username} -> {self.receiver.username}: {self.text}"
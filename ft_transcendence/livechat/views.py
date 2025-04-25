from django.http import JsonResponse
from .models import Message
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth import get_user_model
import json

def load_messages(request, user_id):
    # Get the receiver user
    print("DD")
    try:
        print("ENTEREDDDDDDDD")
        receiver = get_user_model().objects.get(id=user_id)
    except get_user_model().DoesNotExist:
        return JsonResponse({'error': 'User not found'}, status=404)

    # Get all messages for this receiver
    messages = Message.objects.filter(receiver=receiver).order_by('created_at')

    # Prepare the message data
    message_data = []
    for message in messages:
        message_data.append({
            'sender': message.sender.username,
            'text': message.text,
            'time': message.created_at.strftime('%H:%M'),
        })

    return JsonResponse({'messages': message_data})
from django.http import JsonResponse
from .models import Message
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth import get_user_model
import json

@login_required
def load_chat_log(request, user_id):  # Accept 'user_id' here
    try:
        me = request.user  # Get the logged-in user
        User = get_user_model()  # Get the user model
        receiver = User.objects.get(id=user_id)  # Fetch the receiver by their user ID

        # Fetch messages where either the sender or receiver matches the current or other user
        messages = Message.objects.filter(
            sender__in=[me, receiver],
            receiver__in=[me, receiver]
        ).order_by('created_at')

        # Prepare the data to return as JSON
        message_data = [
            {
                'sender': message.sender.username,
                'receiver': message.receiver.username,
                'text': message.text,
                'time': message.created_at.strftime('%H:%M'),
            }
            for message in messages
        ]
        return JsonResponse({'messages': message_data})

    except Exception as e:
        print(f"Error in loading messages: {e}")
        return JsonResponse({'error': 'An error occurred while fetching messages.'}, status=500)
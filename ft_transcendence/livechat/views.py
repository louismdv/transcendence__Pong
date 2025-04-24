from django.http import JsonResponse
from .models import Chat, Message
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt
import json

@login_required
def get_messages(request, chat_id):
    try:
        chat = Chat.objects.get(id=chat_id)
        if request.user not in [chat.user1, chat.user2]:
            return JsonResponse({'error': 'Not authorized'}, status=403)
        
        messages = chat.messages.order_by('timestamp').values(
            'sender__username', 'content', 'timestamp'
        )
        return JsonResponse(list(messages), safe=False)
    except Chat.DoesNotExist:
        return JsonResponse({'error': 'Chat not found'}, status=404)
    
@csrf_exempt
@login_required
def send_message(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        chat_id = data.get('chat_id')
        content = data.get('content')

        try:
            chat = Chat.objects.get(id=chat_id)
            if request.user not in [chat.user1, chat.user2]:
                return JsonResponse({'error': 'Not authorized'}, status=403)

            msg = Message.objects.create(
                chat=chat, sender=request.user, content=content
            )
            return JsonResponse({
                'status': 'ok',
                'timestamp': msg.timestamp
            })
        except Chat.DoesNotExist:
            return JsonResponse({'error': 'Chat not found'}, status=404)
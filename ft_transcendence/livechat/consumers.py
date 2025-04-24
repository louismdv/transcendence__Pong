# chat/consumers.py
import json
from channels.generic.websocket import AsyncWebsocketConsumer

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_name = self.scope['url_route']['kwargs']['room_name']
        self.room_group_name = f'chat_{self.room_name}'

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

     # Receive a message from WebSocket (from the client)
    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        message = text_data_json['message']
        sender = text_data_json['sender']  # You can get the sender info here
        
        # Save the new message to the database
        new_message = Message.objects.create(
            chat_id=self.chat_id,
            sender=sender,
            text=message
        )
        
        # Serialize the message and send it to the group
        message_data = MessageSerializer(new_message).data

        # Send the message to the WebSocket (to all clients in the room)
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'message': message_data
            }
        )

    # Receive a message from the room group (broadcast to all clients in the chat)
    async def chat_message(self, event):
        message = event['message']
        
        # Send the message to WebSocket
        await self.send(text_data=json.dumps({
            'message': message
        }))

import json
from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.contrib.auth import get_user_model
from .models import Message
import logging

# Set up logging
logger = logging.getLogger(__name__)


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

    async def receive(self, text_data):
        try:
            # Parse the incoming JSON
            text_data_json = json.loads(text_data)
            print(text_data_json)
            # Ensure 'message' and 'sender' fields are present in the JSON
            if 'text' not in text_data_json or 'sender' not in text_data_json or 'receiver' not in text_data_json:
                await self.send(text_data=json.dumps({'error': 'Missing required fields: "message" or "sender" or "receiver"'}))
                return

            message = text_data_json['text']
            sender_username = text_data_json['sender']
            receiver_username = text_data_json['receiver']

            # Check if message or sender is empty or invalid
            if not message or not sender_username or not receiver_username:
                await self.send(text_data=json.dumps({'error': 'Invalid message or sender'}))
                return
            
            print("message and sender_username passed")
            # Attempt to retrieve the sender user
            sender = await self.get_user(sender_username)
            # If no sender is found, return an error message
            if not sender:
                await self.send(text_data=json.dumps({'error': 'Invalid sender'}))
                return
            print(f'sender {sender}')
            receiver = await self.get_user(receiver_username)
            if not receiver:
                await self.send(text_data=json.dumps({'error': 'Invalid reciever'}))
                return
            print(f'reciever {receiver}')

            # Attempt to create the new message
            new_message = await self.create_message(sender, receiver, message)
            # If the message creation failed (i.e., new_message is None or invalid), return an error
            if not new_message or not hasattr(new_message, 'text'):
                await self.send(text_data=json.dumps({'error': 'Message creation failed'}))
                return
            print(f'new_message: {new_message}')

            # Send the message to the group
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat.message',
                    'message': {
                        'text': new_message.text,
                        'sender': sender.username,
                        'receiver': receiver.username,
                        'time': new_message.created_at.strftime('%H:%M'),
                    }
                }
            )
        except json.JSONDecodeError:
            # Handle invalid JSON format
            logger.error("Invalid JSON received: %s", text_data)
            await self.send(text_data=json.dumps({'error': 'Invalid JSON format'}))
        except Exception as e:
            # Catch any other exceptions and log them
            logger.exception("An error occurred while processing the message")
            await self.send(text_data=json.dumps({'error': 'An error occurred while processing your message'}))
            
    @database_sync_to_async
    def get_user(self, username):
        User = get_user_model()
        try:
            return User.objects.get(username=username)
        except User.DoesNotExist:
            return None

    @database_sync_to_async
    # Update to accept both sender and receiver as arguments
    def create_message(self, sender, receiver, text):
        return Message.objects.create(sender=sender, receiver=receiver, text=text)

    async def chat_message(self, event):
        await self.send(text_data=json.dumps(event['message']))
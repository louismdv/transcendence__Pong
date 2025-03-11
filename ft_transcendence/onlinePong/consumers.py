import json
from channels.generic.websocket import AsyncWebsocketConsumer

class PongConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_group_name = 'pong_game'
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        data = json.loads(text_data)
        # Handle incoming data (e.g., player movements)
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'game_update',
                'data': data
            }
        )

    async def game_update(self, event):
        data = event['data']
        await self.send(text_data=json.dumps(data))

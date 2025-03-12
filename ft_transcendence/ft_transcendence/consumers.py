# consumers.py
import json
from channels.generic.websocket import AsyncWebsocketConsumer
import asyncio

class PongGameConsumer(AsyncWebsocketConsumer):
    # Store game rooms and their states
    game_rooms = {}
    
    async def connect(self):
        self.room_code = self.scope['url_route']['kwargs']['room_code']
        self.room_group_name = f'pong_game_{self.room_code}'
        
        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        # Accept the connection
        await self.accept()
        
        # Initialize game room if it doesn't exist
        if self.room_group_name not in self.game_rooms:
            self.game_rooms[self.room_group_name] = {
                'players': 0,
                'player_positions': {'player1': 50, 'player2': 50},  # Middle of screen (%)
                'ball_position': {'x': 50, 'y': 50},  # Middle of screen (%)
                'ball_velocity': {'x': 2, 'y': 2},
                'scores': {'player1': 0, 'player2': 0},
                'game_started': False
            }
        
        # Assign player number (1 or 2)
        room = self.game_rooms[self.room_group_name]
        room['players'] += 1
        
        if room['players'] <= 2:
            self.player_num = room['players']
            self.player_id = f'player{self.player_num}'
            
            # Notify client of their player number
            await self.send(text_data=json.dumps({
                'type': 'player_assignment',
                'player': self.player_id
            }))
            
            # Start the game if we have 2 players
            if room['players'] == 2:
                room['game_started'] = True
                
                # Send initial game state to both players
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'game_state',
                        'game_state': room
                    }
                )
                
                # Start game loop
                asyncio.create_task(self.game_loop())
        else:
            # Room is full
            await self.send(text_data=json.dumps({
                'type': 'room_full'
            }))
            await self.close()
    
    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
        
        # Update player count and possibly end the game
        if hasattr(self, 'player_id') and self.room_group_name in self.game_rooms:
            room = self.game_rooms[self.room_group_name]
            room['players'] -= 1
            room['game_started'] = False
            
            # Notify remaining player
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'player_disconnected',
                    'player': self.player_id
                }
            )
            
            # Remove the room if empty
            if room['players'] == 0:
                del self.game_rooms[self.room_group_name]
    
    async def receive(self, text_data):
        data = json.loads(text_data)
        message_type = data.get('type', '')
        
        if message_type == 'paddle_move':
            position = data.get('position', 50)  # Default to middle
            
            # Update paddle position
            if hasattr(self, 'player_id') and self.room_group_name in self.game_rooms:
                room = self.game_rooms[self.room_group_name]
                room['player_positions'][self.player_id] = position
                
                # Broadcast the updated position
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'paddle_update',
                        'player': self.player_id,
                        'position': position
                    }
                )
    
    async def game_loop(self):
        """Game loop to update ball position and check for collisions"""
        room = self.game_rooms[self.room_group_name]
        
        while room['game_started'] and room['players'] == 2:
            # Update ball position
            ball = room['ball_position']
            velocity = room['ball_velocity']
            ball['x'] += velocity['x']
            ball['y'] += velocity['y']
            
            # Ball collision with top/bottom walls
            if ball['y'] <= 0 or ball['y'] >= 100:
                velocity['y'] = -velocity['y']
            
            # Ball collision with paddles
            if ball['x'] <= 5:  # Left paddle area
                if (abs(ball['y'] - room['player_positions']['player1']) < 10):
                    velocity['x'] = -velocity['x']  # Bounce
                else:
                    # Player 2 scores
                    room['scores']['player2'] += 1
                    self.reset_ball(room)
            
            if ball['x'] >= 95:  # Right paddle area
                if (abs(ball['y'] - room['player_positions']['player2']) < 10):
                    velocity['x'] = -velocity['x']  # Bounce
                else:
                    # Player 1 scores
                    room['scores']['player1'] += 1
                    self.reset_ball(room)
            
            # Send updated game state
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'game_state',
                    'game_state': room
                }
            )
            
            # Sleep to control game speed
            await asyncio.sleep(0.05)  # 20 FPS
    
    def reset_ball(self, room):
        """Reset ball to center after scoring"""
        room['ball_position'] = {'x': 50, 'y': 50}
        # Randomize direction a bit
        if room['ball_velocity']['x'] > 0:
            room['ball_velocity']['x'] = -2
        else:
            room['ball_velocity']['x'] = 2
    
    async def game_state(self, event):
        """Send game state to clients"""
        await self.send(text_data=json.dumps({
            'type': 'game_state',
            'game_state': event['game_state']
        }))
    
    async def paddle_update(self, event):
        """Send paddle update to clients"""
        await self.send(text_data=json.dumps({
            'type': 'paddle_update',
            'player': event['player'],
            'position': event['position']
        }))
    
    async def player_disconnected(self, event):
        """Notify clients about disconnected player"""
        await self.send(text_data=json.dumps({
            'type': 'player_disconnected',
            'player': event['player']
        }))
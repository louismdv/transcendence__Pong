# consumers.py
import json
import redis
import uuid
from asgiref.sync import sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer

# creating a redis connection for storing the game room data shared among all consumer instances
redis_client = redis.Redis(host='redis', port=6379, db=0, decode_responses=True)

# each client connection to the server using websockets creates a GameConsumer instance
# Player1 and Player2 each have their own instance with data stored in the redis db
class GameConsumer(AsyncWebsocketConsumer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.player_id = None
    
    async def connect(self):
        print("GameConsumer: Trying to connect...", flush=True)
        self.room_name = self.scope['url_route']['kwargs']['room_name']
        self.room_group_name = f"online_game_{self.room_name}" # all clients connected to the same GAME room
    
        # Create redis_client hash structure if it doesn't exist
        if not redis_client.exists(f"room:{self.room_name}"):
            redis_client.hset(f"room:{self.room_name}", mapping={
                "playerL": json.dumps({"id": "", "y": None, "score": None, "type": "left"}),
                "playerR": json.dumps({"id": "", "y": None, "score": None, "type": "right"}),
                "ball": json.dumps({"x": None, "y": None, "speed": None, "direction": {"xFac": None, "yFac": None}}),
                "player_count": 0,
                "game_status": "waiting"
            })
            print(redis_client.hgetall(f"room:{self.room_name}"))
            
        # Retrieve the current player count
        player_count = redis_client.hget(f"room:{self.room_name}", "player_count")
        self.player_count = int(player_count) if player_count is not None else 0

        if self.player_count >= 2:
            await self.accept()
            #accept connection to send error message close it asap
            await self.send(text_data=json.dumps({
                "type": "error",
                "message": "Game is full"
            }))
            await self.close(code=1000)  # 1000 is a normal closure status code
            print("Connection refused: Maximum number of players reached.")
            return

        await self.accept()
        print(f"WebSocket connected: {self.room_name}")

            
        # Increment player count
        redis_client.hincrby(f"room:{self.room_name}", "player_count", 1)
        self.player_count += 1
        print(f"after player_count: {self.player_count}")
        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name, #group to which the channel should be added
            self.channel_name #unique identifier created by channels for each websocket connection
        )
        if (self.player_count == 2):
            # Set game status to playing
            redis_client.hset(f"room:{self.room_name}", "game_status", "playing")
            await self.start_game()

    async def disconnect(self, close_code):
        # Leave room group
        if (self.channel_name not in self.channel_layer.groups.get(self.room_group_name, set())):
            return
        redis_client.hincrby(f"room:{self.room_name}", "player_count", -1)
        self.player_count -= 1
        print(f"after disconnect player_count: {self.player_count}")
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
    
    async def receive(self, text_data):
    
        # Parse the incoming JSON message
        data = json.loads(text_data)
        print(f"data recieved type: {data.get('type')}")
        print(f"data recieved: {data}")
        # Check the type of message
        if data.get('type') == 'initial_message':
            username = data.get('data')
            self.player_id = username

            # Determine which player to update based on player_count
            # Update players with the their player_id
            if self.player_count == 1:
                playerL_json = redis_client.hget(f"room:{self.room_name}", "playerL")
                playerL_data = json.loads(playerL_json)
                playerL_data['id'] = self.player_id
                redis_client.hset(f"room:{self.room_name}", "playerL", json.dumps(playerL_data))
            elif self.player_count == 2:
                playerR_json = redis_client.hget(f"room:{self.room_name}", "playerR")
                playerR_data = json.loads(playerR_json)
                playerR_data['id'] = self.player_id
                redis_client.hset(f"room:{self.room_name}", "playerR", json.dumps(playerR_data))

            # Optionally, log or print the updated player_id
            print(f"Updated id for player_count {self.player_count}: {username}")
            print(redis_client.hgetall(f"room:{self.room_name}"))

        elif data.get('type') == 'game_state':
            # DATA EXTRACTION player and ball data from the received message
            playerR = data.get("playerR")
            playerL = data.get("playerL")
            ball = data.get("ball")

            # REDIS UPDATING game state in Redis
            if playerL:
                redis_client.hset(f"room:{self.room_name}", "playerL", json.dumps(playerL))
            if playerR:
                redis_client.hset(f"room:{self.room_name}", "playerR", json.dumps(playerR))
            if ball:
                redis_client.hset(f"room:{self.room_name}", "ball", json.dumps(ball))

            # Retrieve the entire game state from Redis
            game_state = redis_client.hgetall(f"room:{self.room_name}")

            # BROADCASTING update to consumers in the room group
            await self.channel_layer.group_send( 
                self.room_group_name,
                {
                    'type': 'update.game', #type key specifies method to be called on each consumer receiving message
                    'game_state': game_state
                }
            )
            
        else:
            # Handle other message types if needed
            print(f"Received message of type: {data.get('type')}")

    async def start_game(self):        
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "game.start",
                "message": "start",
            }
        )
        
    async def game_start(self, event):
        """Send game start signal to clients"""
        await self.send(text_data=json.dumps({"type": "start_game"}))

    # Is called as soon as a consumer recieves a message
    # Sends the updated game state to the client
    async def update_game(self, event):
        await self.send(text_data=json.dumps(event['game_state']))


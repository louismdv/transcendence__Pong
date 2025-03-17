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
    async def connect(self):
        print("GameConsumer: Trying to connect...")
        self.room_name = self.scope['url_route']['kwargs']['room_name'] # used to identiy the specfic group
        self.room_group_name = f"online_game_{self.room_name}" # all clients connected to the same GAME room
        self.player_id = str(uuid.uuid4())

        print(f"WebSocket connected: {self.room_name}")
        await self.accept()

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name, #group to which the channel should be added
            self.channel_name #unique identifier created by channels for each websocket connection
        )
        
        # create redis_client hash structure
        if not redis_client.exists(f"room:{self.room_name}"):
            redis_client.hset(f"room:{self.room_name}", mapping={
                "left_player": json.dumps({"y": 0, "score": 0, "player_type": "left"}),
                "right_player": json.dumps({"y": 0, "score": 0, "player_type": "right"}),
                "ball": json.dumps({"x": 100, "y": 50, "speed": 5, "direction": {"xFac": 1, "yFac": 1}}),
        })
    
        # Assign player side
        redis_client.incr(f"room:{self.room_name}:player_count")
        player_count = int(redis_client.get(f"room:{self.room_name}:player_count"))
        print("player_count")
        if player_count == 1:
            redis_client.sadd(f"room:{self.room_name}:left_player:player_id", self.player_id)
        elif player_count == 2:
            redis_client.sadd(f"room:{self.room_name}:right_player:player_id", self.player_id)
        else:
            await self.close()
            return

    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
    
    async def receive(self, text_data):
        data = json.loads(text_data) #converting JSON to dict

        # DATA EXTRACTION player and ball data from the received message
        right_player_data = data.get("right_player")
        left_player_data = data.get("left_player")
        ball_data = data.get("ball")

        # REDIS UPDATING game state in Redis
        
        if right_player_data:
            redis_client.hset(f"room:{self.room_name}", "right_player", json.dumps(right_player_data))
        if left_player_data:
            redis_client.hset(f"room:{self.room_name}", "left_player", json.dumps(left_player_data))
        if ball_data:
            redis_client.hset(f"room:{self.room_name}", "ball", json.dumps(ball_data))

        # Retrieve the entire game state from Redis
        game_state = redis_client.hgetall(f"room:{self.room_name}")

        # BROADCASTING update to consumers in the room group
        await self.channel_layer.group_send( 
            self.room_group_name,
            {
                'type': 'update_game', #type key specifies method to be called on each consumer receiving message
                'game_state': game_state
            }
        )

    # Is called as soon as a conumer recieves a message
    # Sends the updated game state to the client
    async def update_game(self, event):
        await self.send(text_data=json.dumps(event['game_state']))

    
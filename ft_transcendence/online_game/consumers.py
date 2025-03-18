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
        self.player_id = None
    
    async def connect(self):
        print("GameConsumer: Trying to connect...", flush=True)
        self.room_name = self.scope['url_route']['kwargs']['room_name']
        self.room_group_name = f"online_game_{self.room_name}" # all clients connected to the same GAME room
    
        # Create redis_client hash structure if it doesn't exist
        if not redis_client.exists(f"room:{self.room_name}"):
            redis_client.hset(f"room:{self.room_name}", mapping={
                "left_player": json.dumps({"player_id": "", "y": 0, "score": 0, "player_type": "left"}),
                "right_player": json.dumps({"player_id": "", "y": 0, "score": 0, "player_type": "right"}),
                "ball": json.dumps({"x": 100, "y": 50, "speed": 5, "direction": {"xFac": 1, "yFac": 1}}),
                "player_count": 0
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
        print(f"bef player_count: {self.player_count}")
        redis_client.hincrby(f"room:{self.room_name}", "player_count", 1)
        self.player_count += 1
        print(f"after player_count: {self.player_count}")
        
        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name, #group to which the channel should be added
            self.channel_name #unique identifier created by channels for each websocket connection
        )

    async def disconnect(self, close_code):
        # Leave room group
        redis_client.hincrby(f"room:{self.room_name}", "player_count", -1)
        self.player_count -= 1
        print(f"player_count: {self.player_count}")
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
    
    async def receive(self, text_data):
    
        # Parse the incoming JSON message
        message = json.loads(text_data)
        print("message recieved")
        # Check the type of message
        if message.get('type') == 'initial_message':
            username = message.get('data')
            self.player_id = username

            # Determine which player to update based on player_count
            # Update players with the their player_id
            if self.player_count == 1:
                left_player_json = redis_client.hget(f"room:{self.room_name}", "left_player")
                left_player_data = json.loads(left_player_json)
                left_player_data['player_id'] = self.player_id
                redis_client.hset(f"room:{self.room_name}", "left_player", json.dumps(left_player_data))
            elif self.player_count == 2:
                right_player_json = redis_client.hget(f"room:{self.room_name}", "right_player")
                right_player_data = json.loads(right_player_json)
                right_player_data['player_id'] = self.player_id
                redis_client.hset(f"room:{self.room_name}", "right_player", json.dumps(right_player_data))

            # Optionally, log or print the updated player_id
            print(f"Updated player_id for player_count {self.player_count}: {username}")
        else:
            # Handle other message types if needed
            print(f"Received message of type: {message.get('type')}")


    #     # DATA EXTRACTION player and ball data from the received message
    #     right_player_data = data.get("right_player")
    #     left_player_data = data.get("left_player")
    #     ball_data = data.get("ball")

    #     # REDIS UPDATING game state in Redis
        
    #     if right_player_data:
    #         redis_client.hset(f"room:{self.room_name}", "right_player", json.dumps(right_player_data))
    #     if left_player_data:
    #         redis_client.hset(f"room:{self.room_name}", "left_player", json.dumps(left_player_data))
    #     if ball_data:
    #         redis_client.hset(f"room:{self.room_name}", "ball", json.dumps(ball_data))

    #     # Retrieve the entire game state from Redis
    #     game_state = redis_client.hgetall(f"room:{self.room_name}")

    #     # BROADCASTING update to consumers in the room group
    #     await self.channel_layer.group_send( 
    #         self.room_group_name,
    #         {
    #             'type': 'update_game', #type key specifies method to be called on each consumer receiving message
    #             'game_state': game_state
    #         }
    #     )

    # # Is called as soon as a conumer recieves a message
    # # Sends the updated game state to the client
    # async def update_game(self, event):
    #     await self.send(text_data=json.dumps(event['game_state']))

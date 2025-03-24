# consumers.py
import json
import redis
import random
import asyncio

from asgiref.sync import sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from .game import Player, Ball
from .game import WIN_W, WIN_H

# creating a redis connection for storing the game room data shared among all consumer instances
redis_client = redis.Redis(host='redis', port=6379, db=0, decode_responses=True)

# each client connection to the server using websockets creates a GameConsumer instance
# Player1 and Player2 each have their own instance with data stored in the redis db
class GameConsumer(AsyncWebsocketConsumer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
    
    async def connect(self):
        print("GameConsumer: Trying to connect...")
        self.room_name = self.scope['url_route']['kwargs']['room_name']
        self.room_group_name = f"online_game_{self.room_name}" # all clients connected to the same GAME room
    
        # Create redis_client hash structure if it doesn't exist
        if not redis_client.exists(self.room_name):
            redis_client.hset(self.room_name, mapping={
                "playerL": json.dumps({"id": None, "x": 50, "y": WIN_H / 2 - 175 / 2, "score": 0, "type": "PlayerL"}),
                "playerR": json.dumps({"id": None, "x": WIN_W - 50 - 30, "y": WIN_H / 2 - 175 / 2, "score": 0, "type": "PlayerR"}),
                "ball": json.dumps({"x": WIN_W / 2, "y": WIN_H / 2, "speed": 5, "direction": {"xFac": 1, "yFac": 1}}),
                "player_count": 0,
                "game_status": "waiting"
            })
            print(redis_client.hgetall(self.room_name))
            
        # Retrieve the current player count
        player_count = redis_client.hget(self.room_name, "player_count")
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
        redis_client.hincrby(self.room_name, "player_count", 1)
        self.player_count += 1
        print(f"after player_count: {self.player_count}")
        
        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name, #group to which the channel should be added
            self.channel_name #unique identifier created by channels for each websocket connection
        )


    async def disconnect(self, close_code):
        # Leave room group
        if self.room_group_name:
            await self.channel_layer.group_discard(self.room_group_name, self.channel_name)
        redis_client.hincrby(self.room_name, "player_count", -1)
        self.player_count -= 1
        print(f"after disconnect player_count: {self.player_count}")
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
    
    async def receive(self, text_data):
    
        # Parse the incoming JSON message
        data = json.loads(text_data)
        # Check the type of message
        print(f"data recieved type: {data.get('type')}")
        
        match data.get('type'):
            case 'move_up' | 'move_down':
                player_data = data.get("data")  # Extract "data" object

                if not player_data:
                    print("No player data received.")
                    return
                
                # Determine if the player is playerL or playerR dynamically
                player_side = list(player_data.keys())[0]
                
                # Fetch current player state from Redis
                player_redis_data = redis_client.hget(self.room_name, player_side)
                # print(f"PLAYER_REDIS_DATA: {player_redis_data}")
                if player_redis_data:
                    self.update_redis_dict(player_side, "y", player_data[player_side]["y"])
                    player_state = json.loads(player_redis_data)  # Convert from JSON to dict
                    player_state["y"] += -20 if data["type"] == "move_up" else 15  # Adjust Y position
                    redis_client.hset(self.room_name, player_side, json.dumps(player_state))  # Save back

                    # print(f"{player_side} moved {'up' if data['type'] == 'move_up' else 'down'}")
                    
                # Broadcast updated game state
                game_state = redis_client.hgetall(self.room_name)
                print(game_state)
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        "type": "update.game",
                        "game_state": game_state
                    }
                )
            case 'initial_message':
                username = data.get('data')

                # update redis players dict with player id
                if self.player_count == 1:
                    self.playerL = Player(50, WIN_H / 2 - 175 / 2, "red")
                    self.playerL.id = username
                    await self.assign_player_to_redis("playerL", self.playerL)
                
                elif self.player_count == 2:
                    self.playerR = Player(WIN_W - 50 - 30, WIN_H / 2 - 175 / 2, "blue")
                    self.playerR.id = username
                    await self.assign_player_to_redis("playerR", self.playerR)
                    ball = {
                        "x": WIN_W / 2,
                        "y": WIN_H / 2,
                        "xFac": 1 if random.choice([True, False]) else -1,  # Random direction
                        "yFac": 1 if random.choice([True, False]) else -1,
                        "speed": 5
                    }
                    redis_client.hset(self.room_name, "ball", json.dumps(ball))
                    
                    # Broadcast a start_game message with the initial game state
                    redis_client.hset(self.room_name, "game_status", "playing")
                    game_state = redis_client.hgetall(self.room_name)
                    await self.channel_layer.group_send(
                        self.room_group_name,  # Send to all connected players in this game room
                        {
                            "type": "start.game",  # Type of message for the consumers to handle
                            "game_state": game_state  # Send the game state to start the game
                        }
                    )
                    asyncio.create_task(self.game_loop())  # Run the ball movement loop
                # Optionally, log or print the updated player_id
                game_state = redis_client.hgetall(self.room_name)
                print(game_state)    
            case 'game_state':

                # DATA EXTRACTION player and ball data from the received message
                playerL = data.get("playerL")
                print("playerL", playerL)
                playerR = data.get("playerR")
                print("playerR", playerR)
                # ball = data.get("ball")
                
                # REDIS UPDATING game state in Redis
                if playerL:
                    redis_client.hset(self.room_name, "playerL", json.dumps(playerL))
                if playerR:
                    redis_client.hset(self.room_name, "playerR", json.dumps(playerR))
                # if ball:
                #     redis_client.hset(self.room_name, "ball", json.dumps(ball))

                # Retrieve the entire game state from Redis
                game_state = redis_client.hgetall(self.room_name)

                # BROADCASTING update to consumers in the room group
                await self.channel_layer.group_send( 
                    self.room_group_name, { 'type': 'update.game', 'game_state': game_state }
                )
            case _:
                # Handle other message types if needed
                print(f"Received message of type: {data.get('type')}")

    async def start_game(self, event):
        game_state = event['game_state']
        print(f"Game started! Initial game state: {game_state}")
        # You can now update the game view (player positions, ball, scores, etc.) based on the game state
        await self.send(text_data=json.dumps({
            'type': 'start_game',
            'game_state': game_state
        }))
        
    async def update_game(self, event):
        game_state = event['game_state']
        print(f"Player_moved: {game_state}")
        # You can now update the game view (player positions, ball, scores, etc.) based on the game state
        await self.send(text_data=json.dumps({
            'type': 'update_game',
            'game_state': game_state
        }))
        
    async def game_loop(self):
        while True:
            await asyncio.sleep(0.03)  # 30ms per frame (~33 FPS)

            ball_data = redis_client.hget(self.room_name, "ball")
            playerL_data = redis_client.hget(self.room_name, "playerL")
            playerR_data = redis_client.hget(self.room_name, "playerR")

            if not ball_data or not playerL_data or not playerR_data:
                continue  # Skip if any data is missing

            ball = json.loads(ball_data)
            playerL = json.loads(playerL_data)
            playerR = json.loads(playerR_data)

            # Update Ball Position
            ball["x"] += ball["xFac"] * ball["speed"]
            ball["y"] += ball["yFac"] * ball["speed"]

            # Wall Collision (Top/Bottom)
            if ball["y"] <= 0 or ball["y"] >= WIN_H:
                ball["yFac"] *= -1  # Reverse Y direction

            # Paddle Collision (Player L)
            if (ball["x"] <= playerL["x"] + 30 and 
                playerL["y"] <= ball["y"] <= playerL["y"] + 175):
                ball["xFac"] *= -1  # Reverse X direction

            # Paddle Collision (Player R)
            if (ball["x"] >= playerR["x"] - 30 and 
                playerR["y"] <= ball["y"] <= playerR["y"] + 175):
                ball["xFac"] *= -1  # Reverse X direction

            # Update Ball in Redis
            redis_client.hset(self.room_name, "ball", json.dumps(ball))

            # Broadcast Updated Game State
            game_state = redis_client.hgetall(self.room_name)
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "update.game",
                    "game_state": game_state
                }
            )
        
    async def assign_player_to_redis(self, player_key, player_obj):
        """ Store player object in Redis """
        print("Assigning playerL to Redis...")
        redis_client.hset(self.room_name, player_key, json.dumps({
            "id": player_obj.id,  # Assigns player ID
            "x": player_obj.x,
            "y": player_obj.y,
            "score": player_obj.score,
            "type": player_key
        }))
        print(f"{player_key} stored in Redis:", redis_client.hget(self.room_name, player_key))

    # fn to update a specific key inside a dictionary stored in Redis
    async def update_redis_dict(self, player, dict_key, new_value):
        """
        Updates a specific key inside a dictionary stored in Redis.
        :param player: the name of the player to update: playerL, playerR
        :param dict_key: The key inside the dictionary to update: id, x, y, score, type
        :param new_value: The new value to set.
        """
        # Retrieve the dictionary from Redis
        obj_data = redis_client.hget(self.room_name, player)

        if obj_data:
            json_data = json.loads(obj_data)
            json_data[dict_key] = new_value
            redis_client.hset(self.room_name, player, json.dumps(json_data))
            print(f"Updated {dict_key} to {new_value} in {self.room_name}")
        else:
            print(f"Redis key {self.room_name} not found.")
            return

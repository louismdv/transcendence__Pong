import json
import redis
import random
import asyncio

from asgiref.sync import sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from .game import Player, Ball, WIN_W, WIN_H, PLAYER_W, PLAYER_H, MARGIN

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
            redis_client.hset(self.room_name, "player_count", 0)
            
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
            self.disconnect(1000)
            await self.close(code=1000)  # 1000 is a normal closure status code
            print("Connection refused: Maximum number of players reached.")
            return

        await self.accept()
        print(f"WebSocket connected: {self.room_name}")

        # Increment player count
        redis_client.hincrby(self.room_name, "player_count", 1)
        self.player_count += 1
        print(f"updated player_count: {self.player_count}")
        
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
    
        data = json.loads(text_data)
        print(f"data recieved type: {data.get('type')}")
        
        match data.get('type'):
            case 'move_up' | 'move_down':
                await self.handle_move(data)
            case 'initial_message':
                await self.handle_initial_message(data)
            case _:
                print(f"Received message of type: {data.get('type')}")

## **************** HANDLERs **************** ##

    async def start_game(self, event):
        game_state = event['game_state']
        print(f"Game started! Initial game state: {game_state}")
      
        await self.send(text_data=json.dumps({
            'type': 'start_game',
            'game_state': game_state
        }))
        
    async def update_player(self, event):
        player_side = event["player_side"]
        new_y = event["new_y"]

        await self.send(text_data=json.dumps({
            "type": "update_player",
            "player_side": player_side,
            "new_y": new_y
        }))

    async def update_ball(self, event):


        await self.send(text_data=json.dumps({
            "type": "update_player",
            "player_side": player_side,
            "new_y": new_y
        }))

    async def handle_initial_message(self, data):
        id = data.get('username')

        # update redis players dict with player id
        if self.player_count == 1:
            self.playerL = Player(MARGIN, WIN_H / 2 - PLAYER_H / 2, id)
            await self.assign_player_to_redis("playerL", self.playerL)
        
        elif self.player_count == 2:
            self.playerR = Player(WIN_W - MARGIN - PLAYER_W, WIN_H / 2 - PLAYER_H / 2, id)
            await self.assign_player_to_redis("playerR", self.playerR)
            
            # change game status to 'playing'
            redis_client.hset(self.room_name, "game_status", "playing")

            # Get initial game state and broadcast it to all players
            game_state = redis_client.hgetall(self.room_name)
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "start.game",
                    "game_state": game_state
                }
            )
            asyncio.create_task(self.game_loop())  # Run the ball movement loop


## **************** UTILS Fn **************** ##

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

            if (ball["left"] <= playerL["x"] + playerL["width"]
                and ball["y"] >= playerL["y"] and ball["y"] <= playerL["y"] + playerL["height"]): # ball hit playerL
                ball["x"] = ball["x"] + playerL["width"] / 2
                handleCollision(ball, playerL, playerR, false)

            elif (ball["right"] >= playerR["x"]
                and ball["y"] >= playerR["y"] and ball["y"] <= playerR["y"] + playerR["height"]): # ball hit playerR
                ball["x"] = ball["x"] - playerR["width"] / 2
                handleCollision(ball, playerL, playerR, true)
                
            
            # Check if ball hits top or bottom wall
            ball.update()

            # Paddle Collision (Player L)
            if (ball["x"] <= playerL["x"] + PLAYER_W / 2 and 
                playerL["y"] <= ball["y"] <= playerL["y"] + PLAYER_H):
                ball["xFac"] *= -1  # Reverse X direction

            # Paddle Collision (Player R)
            if (ball["x"] >= playerR["x"] - PLAYER_W / 2 and 
                playerR["y"] <= ball["y"] <= playerR["y"] + PLAYER_H):
                ball["xFac"] *= -1  # Reverse X direction

            # Update Ball in Redis
            redis_client.hset(self.room_name, "ball", json.dumps(ball))

            # Broadcast Updated Game State
            ball_state = redis_client.hget(self.room_name, "ball")
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "update.ball",
                    "ball_state": ball_state
                }
            )

    # fn to assign a player object to a specific key in Redis using id
    async def assign_player_to_redis(self, player_key, player_obj):
        """ Store player object in Redis """

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
        else:
            print(f"Redis key {self.room_name} not found.")
            return

    async def handle_move(self, data):
        """Handles player movement updates."""
        
        player_to_update = data.get("data")  # Extract player side (e.g., "left" or "right")
        if not player_to_update:
            print("No player data received.")
            return
        
        print(player_to_update)
        # Fetch player data from Redis
        player_data = redis_client.hget(self.room_name, player_to_update)
        
        if not player_data:
            print(f"Player {side_to_update} not found in Redis.")
            return

        # Convert JSON data from Redis
        player_state = json.loads(player_data)

        # Update Y position based on move type
        move_type = data.get("type")
        y_offset = -20 if move_type == "move_up" else 20
        player_state["y"] += y_offset

        # Save updated state back to Redis
        redis_client.hset(self.room_name, player_to_update, json.dumps(player_state))

        # Broadcast the updated player y value. Sending player_state to update_player handler
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "update.player",
                "player_side": player_to_update,
                "new_y": player_state["y"]
            }
        )

    async def handle_collision(self, ball, playerL, playerR, isPlayerR):
        
        const paddleThird = PLAYER_H / 3
        
        if ball["y"] >= player["y"] and ball["y"] <= player["y"] + paddleThird:
            ball["randAngle"] = random.uniform(20, 45) if side else random.uniform(-45, -20)   # Top third
            ball.hit()
        elif ball["y"] > player["y"] + paddleThird and ball["y"] < player["y"] + 2 * paddleThird:
            ball["randAngle"] = random.uniform(-10, 10);                                       # Middle third
            ball.hit()
        elif ball["y"] >= player["y"] + 2 * paddleThird and ball["y"] <= player["y"] + playerL["height"]:
            ball["randAngle"] = = random.uniform(-45, -20) if side else random.uniform(45, 20) # Bottom third
            ball.hit()
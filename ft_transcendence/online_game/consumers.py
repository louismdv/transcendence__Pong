import json
import redis
import random
import asyncio
import time

from asgiref.sync import sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from .game import Ball, WIN_W, WIN_H, PLAYER_W, PLAYER_H, MARGIN

# creating a redis connection for storing the game room data shared among all consumer instances
redis_client = redis.Redis(host='redis', port=6379, db=0, decode_responses=True)

rooms = {}  # Dictionary to keep track of rooms and their clients

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
        """Handles client disconnection and cleans up room if empty."""
        
        if self.room_group_name:
            await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

        try:
            redis_client.hincrby(self.room_name, "player_count", -1)  # Decrease player count
            self.player_count -= 1
            print(f"after disconnect player_count: {self.player_count}")

            # If no players are left, remove the room from Redis
            if self.player_count <= 0:
                redis_client.delete(self.room_name)  # Remove room data
                print(f"Room {self.room_name} deleted from Redis")
        
        except Exception as e:
            print(f"Error updating Redis player count: {e}")
            
    def on_client_disconnect(room_name, client_id):
        if room_name in rooms:
            rooms[room_name].remove(client_id)  # Remove client from room
            if len(rooms[room_name]) == 0:  # If no clients left
                del rooms[room_name]  # Remove room to free up name

    async def receive(self, text_data):
    
        data = json.loads(text_data)
        # print(f"data recieved type: {data.get('type')}")
        
        match data.get('type'):
            case 'initial_message':
                await self.handle_initial_message(data)
            case 'ready':
                await self.update_redis_dict(data.get("player_side"), "confirmed_ready", True)
                await self.handle_waiting_room(data)
            case 'move_up' | 'move_down':
                await self.handle_move(data)
            case 'game_over':
                redis_client.hset(self.room_name, "game_status", "game_over")
                print("Game over message received.")    
            case _:
                print(f"Received message of type: {data.get('type')}")

## **************** GAME LOOP **************** ##

    async def game_loop(self):
            
        await asyncio.sleep(4)

        while True:
            game_status = redis_client.hget(self.room_name, "game_status")

            if game_status != "playing":
                print("Game status is not 'playing'. Exiting loop.")
                break
            await asyncio.sleep(0.03)  # 30ms per frame (~33 FPS)

            # Update ball movement and store winner
            await self.ball.update()

            # Retrieve players from Redis
            playerL_data = redis_client.hget(self.room_name, "playerL")
            playerR_data = redis_client.hget(self.room_name, "playerR")

            if not playerL_data or not playerR_data:
                print("playerL_data or playerR_data missing.")
                continue  # Skip this loop iteration if any player data is missing
            
            playerL = json.loads(playerL_data)
            playerR = json.loads(playerR_data)
            
            # Check for collision with paddles
                # Ball hit PlayerL paddle
            if (self.ball.left <= playerL["x"] + PLAYER_W and playerL["y"] <= self.ball.y <= playerL["y"] + PLAYER_H):
                print("Ball hit PlayerL paddle")
                self.ball.x = self.ball.x + PLAYER_W
                await self.handle_collision(self.ball, playerL, False)
                # Ball hit PlayerR paddle
            elif (self.ball.right >= playerR["x"] and playerR["y"] <= self.ball.y <= playerR["y"] + PLAYER_H):
                print("Ball hit PlayerR paddle")
                self.ball.x = self.ball.x - PLAYER_W
                await self.handle_collision(self.ball, playerR, True)

            # Update ball state in Redis
            redis_client.hset(self.room_name, "ball", json.dumps(self.ball.to_dict()))

            # Broadcast updated game state
            ball_state = redis_client.hget(self.room_name, "ball")
            
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "update.ball",
                    "ball_state": ball_state
                }
            )
            # reset if ball hits left or right side
            if self.ball.point_win:
                await self.ball.reset()

    async def handle_collision(self, ball, player, side):
        
        paddleThird = PLAYER_H / 3
        
        if ball.y >= player["y"] and ball.y <= player["y"] + paddleThird:
            ball.randAngle = random.uniform(20, 45) if side else random.uniform(-45, -20)   # Top third
            self.ball.hit()
        elif ball.y > player["y"] + paddleThird and ball.y < player["y"] + 2 * paddleThird:
            ball.randAngle = random.uniform(-10, 10);                                       # Middle third
            self.ball.hit()
        elif ball.y >= player["y"] + 2 * paddleThird and ball.y <= player["y"] + PLAYER_H:
            ball.randAngle = random.uniform(-45, -20) if side else random.uniform(45, 20) # Bottom third
            self.ball.hit()
            

## **************** HANDLERs **************** ##

    async def start_game(self, event):
        game_state = event['game_state']
        print(f"Game started! Initial game state: {game_state}")
      
        await self.send(text_data=json.dumps({
            'type': 'start_game',
            'game_state': game_state
        }))        
    async def update_player(self, event):
        player_side = event['player_side']
        new_y = event['new_y']

        await self.send(text_data=json.dumps({
            'type': 'update_player',
            'player_side': player_side,
            'new_y': new_y,
        }))
    async def update_ball(self, event):
        ball_state = event['ball_state']
      
        await self.send(text_data=json.dumps({
            'type': 'update_ball',
            'ball_state': ball_state,
        }))
    async def load_player_info(self, event):
        left_id = event['playerL_id']
        right_id = event['playerR_id']
        ball = event['ball']
        
        await self.send(text_data=json.dumps({
            'type': 'load_player_info',
            'playerL_id': left_id,
            'playerR_id': right_id,
            'ball': ball,
        }))
    

    # initiate players in redis and clients
    async def handle_initial_message(self, data):
        id = data.get('username')

        # update redis players dict with player id
        if self.player_count == 1:
            await self.create_redis_player("playerL", id),
            await self.send(text_data=json.dumps({'type': 'load_player_info', 'playerL_id' : id}))
        elif self.player_count == 2:
            await self.create_redis_player("playerR", id),
            
            # create a ball obj instance and save to redis
            self.ball = Ball(WIN_W / 2, WIN_H / 2)
            redis_client.hset(self.room_name, "ball", json.dumps(self.ball.to_dict()))
            
            # change game status to 'playing'
            redis_client.hset(self.room_name, "game_status", "waiting_for_confirmation")
            
            # Send a single message with both players' data
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "load.player.info",
                    'playerL_id': await self.get_value_from_player("playerL", "id"),
                    'playerR_id': id,
                    'ball': self.ball.to_dict()
                }
            )
            print(f"waiting for players to confirm")
            



## **************** UTILS Fn **************** ##

    # fn to assign a player object to a specific key in Redis using id
    async def create_redis_player(self, player_key, id):
        """ Store player object in Redis """

        if (player_key == "playerL"):
            redis_client.hset(self.room_name, player_key, json.dumps({
                "type": player_key,
                "id": id,
                "x": MARGIN,
                "y": WIN_H / 2 - PLAYER_H / 2,
                "score": 0,
                "confirmed_ready": False
            }))
        elif (player_key == "playerR"):
                        redis_client.hset(self.room_name, player_key, json.dumps({
                "type": player_key,
                "id": id,
                "x": WIN_W - MARGIN - PLAYER_W,
                "y": WIN_H / 2 - PLAYER_H / 2,
                "score": 0,
                "confirmed_ready": False
            }))
        print(f"{player_key} stored in Redis:", redis_client.hget(self.room_name, player_key))

    async def get_value_from_player(self, player, key):
        """
        Retrieve a specific key's value from a player object stored in Redis.
        :param player: the name of the player to update: playerL, playerR
        :param key: The key inside the dictionary to retrieve: id, x, y, score, type
        :return: The value associated with the specified key.
        """
        # Retrieve the dictionary from Redis
        obj_data = redis_client.hget(self.room_name, player)

        if obj_data:
            json_data = json.loads(obj_data)
            return json_data.get(key)
        else:
            print(f"Redis key {self.room_name} not found.")
            return None

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
        
        player_to_update = data.get("side")  # Extract player side (e.g., "playerL" or "playerR")
        if not player_to_update:
            print("No player data received.")
            return
        
        # Fetch player data from Redis
        player_data = redis_client.hget(self.room_name, player_to_update)
        
        if not player_data:
            print(f"Player {player_data} not found in Redis.")
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

    async def handle_waiting_room(self, data):
        """Handles the waiting room state."""
        
        # Retrieve the value from Redis
        playerL_json = redis_client.hget(self.room_name, "playerL")
        playerL = json.loads(playerL_json)
        playerR_json = redis_client.hget(self.room_name, "playerR")
        playerR = json.loads(playerR_json)
                
        if redis_client.hget(self.room_name, "game_status") == "waiting_for_confirmation" and playerL["confirmed_ready"] == True and playerR["confirmed_ready"] == True:
            # Get initial game state and broadcast it to all players
            
            # Create shared ball object
            self.ball = Ball(WIN_W / 2, WIN_H / 2)
            redis_client.hset(self.room_name, "ball", json.dumps(self.ball.to_dict()))
            
            redis_client.hset(self.room_name, "game_status", "playing")
            game_state = redis_client.hgetall(self.room_name)
            print(f"Initial game state: {game_state}")
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "start.game",
                    "game_state": redis_client.hgetall(self.room_name)
                }
            )
            asyncio.create_task(self.game_loop())  # Run the ball movement loop



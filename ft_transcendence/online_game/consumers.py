import json
import redis
import random
import asyncio
import time

import base64
from io import BytesIO
from django.core.files.base import ContentFile
from django.core.exceptions import ObjectDoesNotExist
from django.db import connection
from django.conf import settings
from asgiref.sync import sync_to_async
from django.contrib.auth import get_user_model
import os

from channels.generic.websocket import AsyncWebsocketConsumer
from .game import Ball, WIN_W, WIN_H, PLAYER_W, PLAYER_H, MARGIN

# creating a redis connection for storing the game room data shared among all consumer instances
redis_client = redis.Redis(host='redis', port=6379, db=0, decode_responses=True)

# each client connection to the server using websockets creates a GameConsumer instance
# Player1 and Player2 each have their own instance with data stored in the redis db


class GameConsumer(AsyncWebsocketConsumer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

    async def connect(self):
        print("New player trying to connect...")
        self.room_name = self.scope['url_route']['kwargs']['room_name']
        self.room_group_name = f"online_game_{self.room_name}"

        # Create redis_client hash structure if it doesn't exist
        if not redis_client.exists(self.room_name):
            redis_client.hset(self.room_name, "player_count", 0)
            redis_client.sadd("active_game_rooms", self.room_name)

        # Retrieve the current player count
        self.player_count = int(redis_client.hget(self.room_name, "player_count"))
        print(f"[connection] Current player_count: {self.player_count}")

        await self.accept()
        print(f"[connection] New ws connection accepted: {self.room_name}")


## **************** DISCONNECTION MGNT **************** ##

    async def disconnect(self, code=1000):

        gameStatus = redis_client.hget(self.room_name, "game_status")
        print(f"[disconnect] GameStatus: {gameStatus}")
        
        playerL_id = await self.get_value_from_player("playerL", "id")
        playerR_id = await self.get_value_from_player("playerR", "id")

        if (self.id == playerL_id):
            redis_client.hincrby(self.room_name, "player_count", -1)
            redis_client.hdel(self.room_name, "playerL")
        elif (self.id == playerR_id):
            redis_client.hincrby(self.room_name, "player_count", -1)
            redis_client.hdel(self.room_name, "playerR")

        # Update local count
        self.player_count = int(redis_client.hget(self.room_name, "player_count") or 0)
        print(f"[disconnect] Updated player_count: {self.player_count}")

        # Clean up if no one is left
        if self.player_count <= 0:
            print(f"[disconnect] No players left. Cleaning up room {self.room_name}")
            redis_client.delete(self.room_name)
            redis_client.srem("active_game_rooms", self.room_name)
            
        elif self.player_count == 1 and gameStatus == "game_over":
            print(f"[disconnect] Game over. Cleaning up room {self.room_name}")
            redis_client.delete(self.room_name)
            redis_client.srem("active_game_rooms", self.room_name)
            
        elif (playerL_id or playerR_id) and self.player_count == 1:
            print(f"[disconnect] Pausing game for room {self.room_name}")
            redis_client.hset(self.room_name, "game_status", "paused")
            redis_client.hdel(self.room_name, "interrupted_game_state")
            game_state = redis_client.hgetall(self.room_name)
            redis_client.hset(self.room_name, "interrupted_game_state", json.dumps(game_state))
            print(f"[disconnect] Game state saved for room {self.room_name}")

        # Leave the room group
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)
        if self.id == playerL_id:
            print(f"[disconnect] WebSocket disconnected: {playerR_id} : {self.room_name}")
        elif self.id == playerR_id:
            print(f"[disconnect] WebSocket disconnected: {playerL_id} : {self.room_name}")


    async def receive(self, text_data):
        data = json.loads(text_data)

        match data.get('type'):
            case 'player_left_game_section':
                await self.disconnect()
            case 'initial_message':
                await self.handle_initial_message(data)
            case 'ready':
                await self.update_redis_dict(data.get("player_side"), "confirmed_ready", True)
                await self.handle_waiting_room(data)
            case 'move_up' | 'move_down':
                await self.handle_move(data)
            case 'game_over':
                await self.handle_gameover(data)
            case _:
                print(f"Received message of type: {data.get('type')}")

## **************** GAME LOOP **************** ##

    async def game_loop(self):

        await asyncio.sleep(4)

        while True:
            game_status = redis_client.hget(self.room_name, "game_status")
            print(f"Game status: {game_status}")
            if game_status != "playing":
                print("Game status is not 'playing'. Exiting loop.")
                break
            await asyncio.sleep(0.0166)  # 66ms per frame (~60 FPS)

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
                self.ball.x = self.ball.x + PLAYER_W
                await self.handle_collision(self.ball, playerL, False)
                # Ball hit PlayerR paddle
            elif (self.ball.right >= playerR["x"] and playerR["y"] <= self.ball.y <= playerR["y"] + PLAYER_H):
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
            if self.ball.point_win == True:
                await self.ball.reset()

    async def handle_collision(self, ball, player, side):

        paddleThird = PLAYER_H / 3

        if ball.y >= player["y"] and ball.y <= player["y"] + paddleThird:
            ball.randAngle = random.uniform(20, 45) if side else random.uniform(-45, -20)   # Top third
            self.ball.hit()
        elif ball.y > player["y"] + paddleThird and ball.y < player["y"] + 2 * paddleThird:
            # Middle third
            ball.randAngle = random.uniform(-10, 10)
            self.ball.hit()
        elif ball.y >= player["y"] + 2 * paddleThird and ball.y <= player["y"] + PLAYER_H:
            # Bottom third
            ball.randAngle = random.uniform(-45, -20) if side else random.uniform(45, 20)
            self.ball.hit()


## **************** HANDLERs **************** ##

    async def start_game(self, event):
        game_state = event['game_state']
        print(f"Game started! Initial game state: {game_state}")

        await self.send(text_data=json.dumps({
            'type': 'start_game',
            'game_state': game_state
        }))

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
        old_y = event['old_y']

        await self.send(text_data=json.dumps({
            'type': 'update_player',
            'player_side': player_side,
            'new_y': new_y,
            'old_y': old_y,
        }))

    async def update_ball(self, event):
        try:
            ball_state = event['ball_state']

            await self.send(text_data=json.dumps({
                'type': 'update_ball',
                'ball_state': ball_state,
            }))
        except Exception as e:
            print(f"[update_ball] Error while sending: {str(e)}")
            
    async def load_player_info(self, event):

        await self.send(text_data=json.dumps({
            'type': 'load_player_info',
            'playerL_name': event['playerL_name'],
            'playerL_id': event['playerL_id'],
            'playerR_name': event['playerR_name'],
            'playerR_id': event['playerR_id'],
            'ball': event['ball'],
        }))

    async def load_player_avatar(self, event):
        playerL_picture_base64 = event['playerL_picture']
        playerR_picture_base64 = event['playerR_picture']

        await self.send(text_data=json.dumps({
            'type': 'load_player_avatar',
            'playerL_picture': playerL_picture_base64,
            'playerR_picture': playerR_picture_base64,
        }))

    async def handle_initial_message(self, data):
        self.id = data.get('userid')
        self.username = data.get('username')
        print(
            f"[handle_initial_message] Player {self.id} attempting to connect to room {self.room_name}")

        # Get current game state
        game_status = redis_client.hget(self.room_name, "game_status")

        playerL_id = await self.get_value_from_player("playerL", "id")
        playerR_id = await self.get_value_from_player("playerR", "id")
        current_player_count = int(redis_client.hget(self.room_name, "player_count") or 0)

        print(f"playerL_id: {playerL_id}, playerR_id: {playerR_id}")
        print(f"game_status: {game_status}, player_count: {current_player_count}")

        # Validate connection
        connection_allowed = False

        # Allowed if reconnecting as existing player
        if self.id == playerL_id or self.id == playerR_id:
            connection_allowed = True
        # Allowed if room has space and you're a new player
        elif current_player_count < 2:
            connection_allowed = True
        else:
            rejection_message = "Game is full or in progress. You are not part of this room."
        # If connection is not allowed, reject it
        if not connection_allowed:
            await self.send(text_data=json.dumps({
                "type": "connection_rejected",
                "message": rejection_message
            }))
            print(f"Connection refused for player {self.id}: {rejection_message}")
            # Close the connection with a normal closure status code
            await self.close(1000)
            return

        # --- Proceed with connection ---
        # Add player to room group
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)

        redis_client.hincrby(self.room_name, "player_count", 1)
        self.player_count = int(redis_client.hget(self.room_name, "player_count") or 0)

        print(f"[handle_initial_message] Connection accepted. Updated player_count: {self.player_count}")

        # either restore player state in room else create own player in room
        if game_status == "paused" and (self.id == playerL_id or self.id == playerR_id):
            if await self.restore_game_state():
                print(f"Player {self.id} has reconnected to interrupted game")
        else:
            await self.create_redis_players()


    async def handle_gameover(self, data):
        """Handles game over state."""
        print("Game over message received.")

        print(f"[SAVEING]: data.get('winner')={data.get('winner')}, data.get('me_id')={data.get('me_id')}, data.get('opponent_id')={data.get('opponent_id')}, data.get('score')={data.get('score')}")
        await self.save_game_info(data.get("winner"), data.get("me_id"), data.get("opponent_id"), data.get("score"))
        game_status = redis_client.hget(self.room_name, "game_status")
        was_set = redis_client.set(self.room_name + ":game_over_lock", "1", nx=True)

        if not was_set:
            if game_status != "game_over":
                redis_client.hset(self.room_name, "game_status", "game_over")
            print("End game already handled, ignoring...")
            await self.close()
            return
        winner = data.get("winner")
        if game_status != "game_over":
            redis_client.hset(self.room_name, "game_status", "game_over")
        await sync_to_async(redis_client.hset)(self.room_name, "winner", winner)

        playerL_id = await self.get_value_from_player("playerL", "id")
        playerR_id = await self.get_value_from_player("playerR", "id")

        if winner and playerL_id and playerR_id:
            await self.update_wins_and_losses(playerL_id, playerR_id, winner)

        await self.close()

    @sync_to_async
    def update_wins_and_losses(self, playerL_id, playerR_id, winner):
        """This runs in sync mode, safe for DB operations."""
        with connection.cursor() as cursor:
            if winner == playerL_id:
                # Increment wins for playerL and losses for playerR
                cursor.execute("UPDATE ft_transcendence_userprofile SET online_wins = online_wins + 1 WHERE user_id = %s", [playerL_id])
                cursor.execute("UPDATE ft_transcendence_userprofile SET total_online_games = total_online_games + 1 WHERE user_id = %s", [playerL_id])
                cursor.execute("UPDATE ft_transcendence_userprofile SET online_losses = online_losses + 1 WHERE user_id = %s", [playerR_id])
                cursor.execute("UPDATE ft_transcendence_userprofile SET total_online_games = total_online_games + 1 WHERE user_id = %s", [playerR_id])
            if winner == playerR_id:
                # Increment wins for playerR and losses for playerL
                cursor.execute("UPDATE ft_transcendence_userprofile SET online_wins = online_wins + 1 WHERE user_id = %s", [playerR_id])
                cursor.execute("UPDATE ft_transcendence_userprofile SET total_online_games = total_online_games + 1 WHERE user_id = %s", [playerR_id])
                cursor.execute("UPDATE ft_transcendence_userprofile SET online_losses = online_losses + 1 WHERE user_id = %s", [playerL_id])
                cursor.execute("UPDATE ft_transcendence_userprofile SET total_online_games = total_online_games + 1 WHERE user_id = %s", [playerL_id])

    @sync_to_async
    def save_game_info(self, winner, me_id, opponent_id, score):
        """Save finished game into the GameRoom table."""
        from ft_transcendence.models import GameRoom  # import inside the function to avoid circular imports
        from django.contrib.auth import get_user_model

        print(f"[SAVE] saving game info: winner={winner}, me_id={me_id}, opponent_id={opponent_id}, score={score}")

        User = get_user_model()  # Get the user model

        # Fetch User objects based on their IDs
        me_user = User.objects.get(id=me_id)
        opponent_user = User.objects.get(id=opponent_id)

        # Create and save the GameRoom record
        game_room = GameRoom.objects.create(
            user=me_user,                  # owner
            opponent=opponent_user,         # opponent
            room_name=self.room_name,       # reuse existing room name
            score=score,
            duration=None,                  # can add later
        )

        print(f"GameRoom created: {game_room.id} with score {score}")

## **************** UTILS Fn **************** ##

    # fn to assign a player object to a specific key in Redis using id
    async def create_redis_player(self, player_key):
        """ Store player object in Redis """

        if (player_key == "playerL"):
            redis_client.hset(self.room_name, player_key, json.dumps({
                "type": player_key,
                "id": self.id,
                "username": self.username,
                "x": MARGIN,
                "y": WIN_H / 2 - PLAYER_H / 2,
                "old_y": None,
                "confirmed_ready": False,
            }))
        elif (player_key == "playerR"):
            redis_client.hset(self.room_name, player_key, json.dumps({
                "type": player_key,
                "id": self.id,
                "username": self.username,
                "x": WIN_W - MARGIN - PLAYER_W,
                "y": WIN_H / 2 - PLAYER_H / 2,
                "old_y": None,
                "confirmed_ready": False,
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

        # Extract player side (e.g., "playerL" or "playerR")
        player_to_update = data.get("side")
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

        player_state["old_y"] = player_state["y"]

        if move_type == "move_up" and player_state["y"] - 60 > 0:
            player_state["y"] -= 60
        elif move_type == "move_up" and player_state["y"] - 60 <= 0:
            player_state["y"] = 0
        elif move_type == "move_down" and player_state["y"] + PLAYER_H + 60 < WIN_H:
            player_state["y"] += 60
        elif move_type == "move_down" and player_state["y"] + PLAYER_H + 60 >= WIN_H:
            player_state["y"] = WIN_H - PLAYER_H

        # Save updated state back to Redis
        redis_client.hset(self.room_name, player_to_update, json.dumps(player_state))

        # Broadcast the updated player y value. Sending player_state to update_player handler
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "update.player",
                "player_side": player_to_update,
                "new_y": player_state["y"],
                "old_y": player_state["old_y"]
            }
        )

    async def handle_waiting_room(self, data):
        """Handles the waiting room state."""

        # Retrieve the values from Redis
        playerL_json = redis_client.hget(self.room_name, "playerL")
        playerL = json.loads(playerL_json)
        playerR_json = redis_client.hget(self.room_name, "playerR")
        playerR = json.loads(playerR_json)
        game_status = redis_client.hget(self.room_name, "game_status")

        if (game_status == "waiting_for_confirmation" or game_status == "paused") and playerL["confirmed_ready"] == True and playerR["confirmed_ready"] == True:
            # Check if there's an interrupted game state
            interrupted_game_state_json_str = redis_client.hget(self.room_name, "interrupted_game_state")
            # print(f"interrupted_game_state_json: {interrupted_game_state_json_str}")
            if interrupted_game_state_json_str:
                # Parse the interrupted game state
                interrupted_game_state = json.loads(interrupted_game_state_json_str)
                ball_data_str = interrupted_game_state["ball"]
                ball_data = json.loads(ball_data_str)

                print(f"ball_data: {ball_data}")
                # The interrupted_game_state IS the ball data
                print("Restoring ball data from interrupted game")

                # Create ball from the interrupted game state (which contains ball properties)
                self.ball = Ball(int(ball_data.get("x")), int(ball_data.get("y")))
                self.ball.xFac = ball_data.get("xFac")
                self.ball.yFac = ball_data.get("yFac")
                self.ball.speed = ball_data.get("speed")
                self.ball.point_win = ball_data.get("point_win")
                self.ball.playerL_points = ball_data.get("playerL_points")
                self.ball.playerR_points = ball_data.get("playerR_points")

            else:
                # No interrupted game state, create a new ball
                print("Creating new ball")
                self.ball = Ball(WIN_W / 2, WIN_H / 2)

            # Update game status and start the game
            redis_client.hset(self.room_name, "game_status", "playing")

            # Send start game message to all clients
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "start.game",
                    "game_state": redis_client.hgetall(self.room_name)
                }
            )
            # Start the game loop
            asyncio.create_task(self.game_loop())  # Run the ball movement loop

    async def restore_game_state(self):
        playerL_id = await self.get_value_from_player("playerL", "id")
        playerR_id = await self.get_value_from_player("playerR", "id")

        if playerL_id == self.id or playerR_id == self.id:
            game_state_json = redis_client.hget(self.room_name, "interrupted_game_state")

            if game_state_json is None:
                print(f"No interrupted game state found for room {self.room_name}")
                await self.send(text_data=json.dumps({
                    'type': 'no_game_to_restore',
                    'message': 'No interrupted game found'
                }))
                return False

            game_state = json.loads(game_state_json)
            print(f"Player {self.id} is reconnecting.")
            await self.send(text_data=json.dumps({
                'type': 'restore_game',
                'game_state': game_state,
            }))
            if (self.id == playerL_id):
                await self.send_profile_picture(self.id, await self.get_value_from_player("playerR", "id"))
            elif (self.id == playerR_id):
                await self.send_profile_picture(await self.get_value_from_player("playerL", "id"), self.id)
            print(f"sent game_state to player {self.id}")
            return True
        return False

    async def create_redis_players(self):
        """Creates player objects in Redis."""

        # update redis players dict with player id
        if self.player_count == 1:
            await self.create_redis_player("playerL"),
            await self.send(text_data=json.dumps({'type': 'load_player_info', 'playerL_name': self.username}))
        elif self.player_count == 2:
            await self.create_redis_player("playerR"),
            await self.send_profile_picture(await self.get_value_from_player("playerL", "id"), self.id)

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
                    'playerL_name': await self.get_value_from_player("playerL", "username"),
                    'playerL_id': await self.get_value_from_player("playerL", "id"),
                    'playerR_name': self.username,
                    'playerR_id': self.id,
                    'ball': self.ball.to_dict()
                }
            )
            print(f"waiting for players to confirm")

    # profile pictures

    def encode_image_to_base64(self, image_path):
        """Convert an image file to a base64-encoded string."""
        try:
            with open(image_path, "rb") as image_file:
                encoded_image = base64.b64encode(image_file.read()).decode('utf-8')
                return encoded_image
        except FileNotFoundError:
            return None

    def get_profile_picture_by_username(self, id):
        """Fetch the profile picture of the user from PostgreSQL using their username."""
        with connection.cursor() as cursor:
            # Use raw SQL to fetch the profile picture URL or binary data using the username
            cursor.execute(
                "SELECT avatar FROM ft_transcendence_userprofile WHERE user_id = %s", [id])
            row = cursor.fetchone()
            if row:
                # row[0] will contain the file path or URL to the profile picture
                return row[0]
        return None

    # Wrap the synchronous function call in sync_to_async
    async def send_profile_picture(self, playerL, playerR):
        """Send both players' profile pictures (base64 encoded) through WebSocket."""
        # Use sync_to_async to run the synchronous database query in a separate thread
        playerL_picture_path = await sync_to_async(self.get_profile_picture_by_username)(playerL)
        playerR_picture_path = await sync_to_async(self.get_profile_picture_by_username)(playerR)

        if playerL_picture_path and playerR_picture_path:
            # Combine the file path with the MEDIA_URL to get the full image path
            playerL_picture_full_path = os.path.join(settings.MEDIA_ROOT, playerL_picture_path)
            playerR_picture_full_path = os.path.join(settings.MEDIA_ROOT, playerR_picture_path)

            # Convert image files to base64
            playerL_picture_base64 = self.encode_image_to_base64(playerL_picture_full_path)
            playerR_picture_base64 = self.encode_image_to_base64(playerR_picture_full_path)

            if playerL_picture_base64 and playerR_picture_base64:
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'load.player.avatar',
                        'playerL_picture': playerL_picture_base64,
                        'playerR_picture': playerR_picture_base64,
                    }
                )

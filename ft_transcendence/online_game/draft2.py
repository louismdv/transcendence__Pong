import json
import asyncio
from channels.generic.websocket import AsyncWebsocketConsumer
from .game import Player, Ball  # Import the Player and Ball classes
from .game import WIN_W, WIN_H

class GameConsumer(AsyncWebsocketConsumer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.room_name = None
        self.room_group_name = None
        self.player_count = 0
        self.playerL = None
        self.playerR = None
        self.ball = None
    
    async def connect(self):
        print("[connect] GameConsumer: Trying to connect...", flush=True)
        self.room_name = self.scope['url_route']['kwargs']['room_name']
        self.room_group_name = f"online_game_{self.room_name}"

        if self.player_count >= 2:
            await self.accept()
            await self.send(text_data=json.dumps({"type": "error", "message": "Game is full"}))
            await self.close()
            return

        await self.accept()
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)

        # Increment player count and create player objects
        # if player_count == 2, launch game_loop
        self.player_count += 1
        print(f"Player count: {self.player_count}")

        if self.player_count == 1:
            self.playerL = Player(50, WIN_H / 2 - 175 / 2, "red")
            self.ball = Ball(WIN_W / 2, WIN_H / 2)
        elif self.player_count == 2:
            self.playerR = Player(WIN_W - 50 - 30, WIN_H / 2 - 175 / 2, "blue")
            asyncio.create_task(self.game_loop())

    async def game_loop(self):
        """ Main game loop to handle updates """
        print("[game_loop] Starting game loop...")
        while True:
            if self.ball:
                self.ball.update_position()
                await self.broadcast_game_state()
            await asyncio.sleep(0.1)

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)
        self.player_count -= 1
        print(f"Player disconnected, remaining count: {self.player_count}")

    async def receive(self, text_data):
        data = json.loads(text_data)
        print(f"[receive] Received type: {data.get('type')}")

        type = data.get('type')

        if type == "assign_player_id":
            await self.handle_player_id_assignment(data)
        elif type == "game_state":
            print("entered game_state")
            await self.handle_game_state(data)                
        elif type == "move_playerL" and self.playerL:
            # direction = data.get('data')
            self.playerL.move(data.data)
            print("playerL move: ", self.playerL.y)
        elif type == "move_playerR" and self.playerR:
            # direction = data.get('data')
            self.playerR.move(data.data)
            print("playerR move: ", self.playerR.y)
        else:
            print(f"Received message of type: {data.get('type')}")
        await self.broadcast_game_state()

    async def broadcast_game_state(self):
        game_state = {
            "playerL": self.playerL.to_dict() if self.playerL else None,
            "playerR": self.playerR.to_dict() if self.playerR else None,
            "ball": self.ball.to_dict() if self.ball else None,
            "player_count": self.player_count,
        }
        await self.channel_layer.group_send(
            self.room_group_name,
            {"type": "update_game", "message": game_state}
        )

    async def update_game(self, event):
        await self.send(text_data=json.dumps({"type": "game_update", "game_state": event['message']}))


    # ********* HANDLERS FUNCTIONS *********

    async def handle_player_id_assignment(self, data):
        """Handle player ID assignment - async version"""
        clientname = data.get('data')
        self.id = clientname
        
        print("received player_id: ", self.id)

        # Determine which player to update based on player_count
        if self.player_count == 1:
            await self.update_redis_dict("playerL", "id")
        elif self.player_count == 2:
            await self.update_redis_dict("playerR", "id")

        if self.player_count == 2:
            # Set game status to playing and get game_state
            await self.redis.hset(f"room:{self.room_name}", "game_status", "playing")
            game_state = await self.get_game_state()
            
            print("game_state: ", game_state)
            
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "start_game",
                    "message": game_state
                }
            )

    async def handle_game_state(self, data):
        """Handle game state updates - async version"""
        # Data extraction
        playerR = data.get("playerR")
        playerL = data.get("playerL")
        ball = data.get("ball")

        # Update redis with the new game state
        update_tasks = []
        for key, value in {"playerL": playerL, "playerR": playerR, "ball": ball}.items():
            if value:
                update_tasks.append(self.redis.hset(f"room:{self.room_name}", key, json.dumps(value)))
        
        # Wait for all updates to complete
        if update_tasks:
            await asyncio.gather(*update_tasks)

        # Get updated game state
        game_state = await self.get_game_state()

        # Broadcast to all clients
        await self.channel_layer.group_send( 
            self.room_group_name,
            {
                'type': 'update_game',
                'message': game_state
            }
        )

    async def handle_collision(self, ball, player, side):
        """Handle ball collision with paddles"""
        paddle_third = player.height / 3
        
        import random
        def rand_num_btw(min_val, max_val):
            return random.random() * (max_val - min_val) + min_val
            
        if ball.y >= player.y and ball.y <= player.y + paddle_third:
            # Top third
            ball.rand_angle = rand_num_btw(20, 45) if side else rand_num_btw(-20, -45)
            ball.hit()
        elif ball.y > player.y + paddle_third and ball.y < player.y + 2 * paddle_third:
            # Middle third
            ball.rand_angle = rand_num_btw(-10, 10)
            ball.hit()
        elif ball.y >= player.y + 2 * paddle_third and ball.y <= player.y + player.height:
            # Bottom third
            ball.rand_angle = rand_num_btw(-45, -20) if side else rand_num_btw(45, 20)
            ball.hit()
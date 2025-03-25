import math
import random

# Player and Ball classes used in the consumer.py game logic

SPEED = 15
BALL_SIZE = 30
BALL_RADIUS = BALL_SIZE // 2
PLAYER_W, PLAYER_H = 30, 175
WIN_H, WIN_W = 720, 1080
MARGIN = 50

class Player:
    def __init__(self, x, y, id):
        self.id = id  # Unique identifier for the player
        self.x = x
        self.y = y
        self.score = 0
        self.width = PLAYER_W
        self.height = PLAYER_H
        self.direction = {'up': False, 'down': False}
        self.movetype = None

    async def move(self, direction):
        if direction == 'up':
            self.y -= SPEED
        if direction == 'down':
            self.y += SPEED
        if self.y < 0:
            self.y = 0
        if self.y + self.height > WIN_H:
            self.y = WIN_H - self.height


class Ball:
    def __init__(self, x, y, speed=5, direction=None):
        if direction is None:
            direction = {"x": 1, "y": 1}
        self.x = x
        self.y = y
        self.xFac = -1 if random.random() < 0.5 else 1
        self.yFac = random.random() * 2 - 1
        self.speed = speed
        self.radius = BALL_RADIUS
        self.left = self.x - self.radius
        self.right = self.x + self.radius
        self.top = self.y - self.radius
        self.bottom = self.y + self.radius
        self.randAngle = 0
        self.deceleration = 0.998 #deceleration factor
        self.minSpeed = 5
        self.hitCount = 0
        
    async def update(self):
        # Apply deceleration
        self.speed *= self.deceleration
        if self.speed < self.minSpeed :
            self.speed = self.minSpeed
        self.x += self.speed * self.xFac
        self.y += self.speed * self.yFac

        # update pos in obj
        self.left = self.x - self.radius
        self.right = self.x + self.radius
        self.top = self.y - self.radius
        self.bottom = self.y + self.radius

        # check ball colision with top/bottom edges
        if self.top <= 0 or self.bottom >= WIN_H:
            self.yFac *= -1
            if self.top <= 0:
                self.top = BALL_SIZE + 1
            elif self.bottom >= WIN_H:
                self.bottom = WIN_H - BALL_SIZE + 1
    
    async def hit(self):
        self.xFac *= -1
        tanAngle = math.tan(self.randAngle * math.PI / 180) * self.xFac
        self.yFac = tanAngle # Update yFac based on the angle
        self.speed = 8 * (1 + random.random() * 0.5)

        self.hitCount += 1
    
    async def reset(self):
        self.x = WIN_W / 2
        self.y = WIN_H / 2
        self.speed = 5
        self.xFac *= -1
        self.yFac = -1 if random.random() < 0.5 else 1
        self.randAngle = 0
        self.left = self.x - self.radius
        self.right = self.x + self.radius
        self.top = self.y - self.radius
        self.bottom = self.y + self.radius

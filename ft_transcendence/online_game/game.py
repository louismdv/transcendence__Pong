import math
import random

# Player and Ball classes used in the consumer.py game logic

SPEED = 15
BALL_SIZE = 30
BALL_RADIUS = BALL_SIZE // 2
PLAYER_W, PLAYER_H = 30, 175
WIN_H, WIN_W = 720, 1080
MARGIN = 50


class Ball:
    def __init__(self, x, y):
        self.x = x
        self.y = y
        self.xFac = -1 if random.random() < 0.5 else 1
        self.yFac = random.random() * 2 - 1
        self.speed = 8
        self.radius = BALL_RADIUS
        self.width = self.radius * 2  # Diameter of the ball
        self.height = self.radius * 2  # Diameter of the ball
        self.left = self.x - self.radius
        self.right = self.x + self.radius
        self.top = self.y - self.radius
        self.bottom = self.y + self.radius
        self.randAngle = 0
        self.deceleration = 0.998  # deceleration factor
        self.minSpeed = 7
        self.playerL_points = 0
        self.playerR_points = 0
        self.point_win = False

    async def update(self):
        # Apply deceleration
        self.speed *= self.deceleration
        if self.speed < self.minSpeed:
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

        # check ball colision with right/left sides
        if self.right >= WIN_W:
            self.playerL_points += 1
            self.point_win = True
            print("point_win", self.point_win)
        elif self.left <= 0:
            self.playerR_points += 1
            self.point_win = True
            print("point_win", self.point_win)

    def hit(self, paddle_y, paddle_height):
        # Calculate hit position: -1 (top), 0 (center), 1 (bottom)
        relative_intersect = ((self.y - paddle_y) -
                              paddle_height / 2) / (paddle_height / 2)
        # Clamp to [-1, 1]
        relative_intersect = max(-1, min(1, relative_intersect))
        # Max bounce angle (in radians), e.g., 60 degrees
        max_bounce_angle = math.radians(60)
        bounce_angle = relative_intersect * max_bounce_angle

        # Reverse x direction
        self.xFac *= -1
        # Set new direction based on bounce angle
        self.yFac = math.sin(bounce_angle)
        self.xFac = math.copysign(math.cos(bounce_angle), self.xFac)

        # Increase speed, but clamp to a max
        self.speed = min(self.speed * 1.05, 15)

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
        self.point_win = None

    def to_dict(self):
        """Convert Ball object to a dictionary."""
        return {
            "x": self.x,
            "y": self.y,
            "speed": self.speed,
            "xFac": self.xFac,
            "yFac": self.yFac,
            "point_win": self.point_win,
            "playerL_points": self.playerL_points,
            "playerR_points": self.playerR_points,
        }

    @classmethod
    def from_dict(cls, data):
        """Create a Ball object from a dictionary."""
        return cls(**data)

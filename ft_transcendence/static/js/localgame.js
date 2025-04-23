
(() => {

document.getElementById('page-title').textContent = "Local Game Mode";
const canvas = document.getElementById('localgameCanvas');
const ctx = canvas.getContext('2d');

let msPrev = window.performance.now();

// CONSTANTS
    // COLORS
const RED = '#ff0000';
const GREY = '#1c1c1c';
const BLUE = '#0000ff';
const WHITE = '#ffffff';
const BLACK = '#000000';
const YELLOW = '#ffff00';
const ORANGE = '#ffa500';
    // SETTINGS
const FPS = 60;
const WINNING_SCORE = 5;
const msPerFrame = 1000 / FPS; // Time required for one frame to complete
const WIN_H = 720, WIN_W = 1080;
const PLAYER_W = 30, PLAYER_H = 175;
const BALL_SIZE = 30, BALL_RADIUS = BALL_SIZE / 2;
const FONT_SIZE_XL = 500, FONT_SIZE_L = 200, FONT_SIZE_M = 50;

// VARIABLES
let isMuted = false;
let gameRunning = false;
let playerL, playerR, ball, keysPressed = {};

// CLASSES: Player and Ball
class Player {
    constructor(x, y, color, upKey, downKey) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.upKey = upKey;
        this.downKey = downKey;
        this.speed = 15;
        this.score = 0;
        this.width = PLAYER_W;
        this.height = PLAYER_H;
    }

    draw() {
        // Draw player
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }

    update() {
        // Move player based on key input
        if (keysPressed[this.upKey]) {
            this.y -= this.speed;
        }
        if (keysPressed[this.downKey]) {
            this.y += this.speed;
        }
        // Prevent the player from moving out of bounds
        if (this.y < 0) {
            this.y = 0;
        }
        if (this.y + this.height > WIN_H) {
            this.y = WIN_H - this.height;
        }
    }
}

class Ball {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.xFac = Math.random() < 0.5 ? -1 : 1; // Random direction for X
        this.yFac = Math.random() * 2 - 1; // Random direction for Y
        this.speed = 5;
        this.radius = BALL_RADIUS;
        this.left = this.x - this.radius
        this.right = this.x + this.radius
        this.top = this.y - this.radius
        this.bottom = this.y + this.radius
        this.randAngle = 0;
        this.deceleration = 0.998; // Deceleration factor
        this.minSpeed = 5; // Minimum speed
        this.hitCount = 0;
    }

    draw() {
        // Draw ball
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.closePath();
    }

    update() {
        // Apply deceleration
        this.speed *= this.deceleration;

        if (this.speed < this.minSpeed) {
            this.speed = this.minSpeed;
        }
        this.x += this.speed * this.xFac;
        this.y += this.speed * this.yFac;

        // Update ball position in the object
        this.left = this.x - this.radius
        this.right = this.x + this.radius
        this.top = this.y - this.radius
        this.bottom = this.y + this.radius

        // Check for ball collision with top/bottom edges
        if (this.top <= 0 || this.bottom >= WIN_H) {
            this.yFac *= -1; // Reverse direction
            if (this.top <= 0) {
                this.top = BALL_SIZE + 1;
            } else if (this.bottom >= WIN_H) {
                this.bottom = WIN_H - BALL_SIZE + 1;
            }
        }

        // Check for ball collision with right/left sides
        if (this.right >= WIN_W) {
            return 1; // Point scored for left player
        } else if (this.left <= 0) {
            return -1; // Point scored for right player
        }
        return 0;
    }

    hit() {
        // Reverse X direction on hit and calculate random angle
        this.xFac *= -1;
        const tanAngle = Math.tan(this.randAngle * Math.PI / 180) * this.xFac;
        this.yFac = tanAngle; // Update Y direction based on the angle
        this.speed = 8 * (1 + Math.random() * 0.5); // Increase speed after hit

        this.hitCount++;
        const hitSound = document.getElementById(this.hitCount % 2 === 0 ? 'hitSoundL' : 'hitSoundR');
        hitSound.currentTime = 0; // Reset sound to start
        hitSound.playbackRate = 1; // Set playback speed
        hitSound.play().catch(error => {
            console.error("Error attempting to play", error);
        });
    }

    reset() {
        // Reset ball to center
        this.x = WIN_W / 2;
        this.y = WIN_H / 2;
        this.speed = 5;
        this.xFac *= -1;
        this.yFac = Math.random() < 0.5 ? -1 : 1;
        this.randAngle = 0;
        this.left = this.x - this.radius;
        this.right = this.x + this.radius;
        this.top = this.y - this.radius;
        this.bottom = this.y + this.radius;
    }
}

// FUNCTIONS
function setupEventListeners() {
    // Set up event listeners for controls
    muteButton.addEventListener('click', (event) => {
        toggleMute();
    });
    document.addEventListener('keydown', (event) => {
        keysPressed[event.code] = true;
        if (event.code === 'Space' && !gameRunning) {
            resetGame();
            gameLoop();
        }
        if (event.code == 'KeyM') {
            toggleMute();
        }
        if (event.code === 'Escape') {
            resetGame();
            pregameLoop();
        }
    });
    document.addEventListener('keyup', (event) => {
        keysPressed[event.code] = false;
    });
}

function toggleMute() {
    // Toggle mute status and update button
    isMuted = !isMuted;
    hitSoundL.muted = !hitSoundL.muted;
    hitSoundR.muted = !hitSoundR.muted;
    muteButton.textContent = isMuted ? "volume_mute" : "volume_off";
}

function drawScores() {
    // Draw player scores
    ctx.fillStyle = WHITE;
    ctx.font = `${FONT_SIZE_M}px 'Pixelify Sans', sans-serif`;
    ctx.fillText(playerL.score, WIN_W / 4, WIN_H / 2);
    ctx.fillText(playerR.score, WIN_W / 4 * 3, WIN_H / 2);
}

function drawDottedLine() {
    // Draw a dotted line in the middle of the screen
    ctx.beginPath();
    ctx.setLineDash([10, 10]); // Pattern: 10px dash, 10px gap
    ctx.lineWidth = 10; // Line width
    ctx.strokeStyle = 'grey'; // Line color

    // Start and end points for the line
    ctx.moveTo(WIN_W / 2, 0); // Start at the top center
    ctx.lineTo(WIN_W / 2, WIN_H); // End at the bottom center

    ctx.stroke(); // Draw the line
}

function pregameLoop() {
    // Show the pre-game screen
    ctx.fillStyle = GREY;
    ctx.fillRect(0, 0, WIN_W, WIN_H);
    ctx.fillStyle = WHITE;
    ctx.font = `${FONT_SIZE_M}px 'Pixelify Sans', sans-serif`;
    const text = "Press space bar to start!";
    const textWidth = ctx.measureText(text).width;
    ctx.fillText(text, (WIN_W - textWidth) / 2, WIN_H / 2);

    requestAnimationFrame(pregameLoop);
}

function drawCanvas() {
    // Draw the game canvas
    ctx.fillStyle = GREY;
    ctx.fillRect(0, 0, WIN_W, WIN_H);
    // Draw the scores
    color = WHITE;
    drawScores();
    // Draw the central line
    drawDottedLine();
    // Draw the players and ball
    playerL.draw();
    playerR.draw();
    ball.draw();
}

function resetGame() {
    // Reset the game state
    gameRunning = false;

    playerL = new Player(50, WIN_H / 2 - 175 / 2, 'orange', 'KeyA', 'KeyD');
    playerR = new Player(WIN_W - 50 - 30, WIN_H / 2 - 175 / 2, 'red', 'ArrowRight', 'ArrowLeft');
    ball    = new Ball(WIN_W / 2, WIN_H / 2, 'blue');
}

function randNumBtw(min, max) {
    // Return a random number between min and max
    return Math.random() * (max - min) + min;
}

function handleCollision(ball, player, side) {
    // Handle collision between ball and player
    const paddleThird = player.height / 3;

    if (ball.y >= player.y && ball.y <= player.y + paddleThird) {
        ball.randAngle = side ? randNumBtw(20, 45) : randNumBtw(-20, -45); // Top third
        ball.hit();
    } else if (ball.y > player.y + paddleThird && ball.y < player.y + 2 * paddleThird) {
        ball.randAngle = randNumBtw(-10, 10); // Middle third
        ball.hit();
    } else if (ball.y >= player.y + 2 * paddleThird && ball.y <= player.y + player.height) {
        ball.randAngle = side ? randNumBtw(-45, -20) : randNumBtw(45, 20); // Bottom third
        ball.hit();
    }
}

// Start the pregame
pregameLoop();
setupEventListeners();

// Game loop
function gameLoop() {
    // Ensure FPS <= 60
    let msNow = window.performance.now();
    let msPassed = msNow - msPrev;

    gameRunning = true;

    function updateGame() {
        if (!gameRunning || (msPassed < msPerFrame))
            return;

        // Update game state
        playerL.update();
        playerR.update();
        let point = ball.update();

        // Check missed balls for scoring
        if (point === 1) {
            playerL.score += 1;
            ball.reset();
        } else if (point === -1) {
            playerR.score += 1;
            ball.reset();
        }

        // Check end game conditions
        if (playerL.score >= WINNING_SCORE || playerR.score >= WINNING_SCORE) {
            resetGame();
            return;
        }

        // Collision detection and response
        if (ball.left <= playerL.x + playerL.width
            && ball.y >= playerL.y && ball.y <= playerL.y + playerL.height) {
            ball.x = ball.x + playerL.width / 2;
            handleCollision(ball, playerL, false);
        } else if (ball.right >= playerR.x
            && ball.y >= playerR.y && ball.y <= playerR.y + playerR.height) {
            ball.x = ball.x - playerR.width / 2;
            handleCollision(ball, playerR, true);
        }
        // Draw the canvas
        drawCanvas();

        let excessTime = msPassed % msPerFrame;
        msPrev = msNow - excessTime;
        requestAnimationFrame(updateGame);
    }
    requestAnimationFrame(updateGame);
}

})();
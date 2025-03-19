
// ************ SETUP ************ //

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
const msPerFrame = 1000 / FPS; // time required for one frame to complete
const WIN_H = 720, WIN_W = 1080;
const PLAYER_W = 30, PLAYER_H = 175;
const BALL_SIZE = 30, BALL_RADIUS = BALL_SIZE / 2;
const FONT_SIZE_XL = 500, FONT_SIZE_L = 200, FONT_SIZE_M = 50;

// VARIABLES
let isMuted = false;
let gameRunning = false;
let playerL, playerR, ball, keysPressed = {};
let point = 0;

const canvas = document.getElementById('onlinegameCanvas');
const ctx = canvas.getContext('2d');

let msPrev = window.performance.now();
const hitSoundL = document.getElementById('hitSoundL');
const hitSoundR = document.getElementById('hitSoundR');
const muteButton = document.getElementById('muteButton');
const players = { me: null, opponent: null };

// ************ WEBSOCKETS ************ //


    const gameSocket = new WebSocket(`ws://${window.location.host}/ws/online-game/${roomName}/`);

    // Event handler for when the connection is successfully opened
    gameSocket.onopen = function(event) {
        console.log("WebSocket is open now.");
        sendMessage({ type: 'initial_message', data: clientName });
    };
    // Event handler for receiving messages from the server
    gameSocket.onmessage = function(event) {
        const data = JSON.parse(event.data);
        // console.log("Message from server:", data);

        if (data.type === "start_game") {
            console.log("Starting game via ws!");
            resetGame();
            setupEventListeners();
            gameLoop();
        }
        else if (data.type === "update_game") {
            console.log("Updating game via ws!");
            pullGameState(data);
        }
        else
            console.log("Unknown message type:", data.type);
    };
    gameSocket.onclose = function(event) {
        console.log("WebSocket closed:", event.code, event.reason);
    };
    gameSocket.onerror = function(event) {
        console.error("WebSocket error observed:", event);
    };
    function sendMessage(data) {
        if (gameSocket.readyState === WebSocket.OPEN) {
            gameSocket.send(JSON.stringify(data));
        } else {
            console.warn("WebSocket not ready, retrying...");
            setTimeout(() => sendMessage(data), 500); // Retry after 500ms
        }
    }
    // Abstracted code for both players. Each user gets a player obj and an opponent obj
    function pullGameState(data) {
        if (clientName === data.playerL.id || clientName === data.playerR.id) {

            // define me and opponent references to local playerR and playerL player objects
            players.me = clientName === data.playerL.id ? playerL : playerR;
            players.opponent = clientName === data.playerL.id ? playerL : playerR;

            players.me.update();
            // ball.update();

            // pulling opponent data from Redis
            players.opponent.y = clientName === data.playerL.id ? data.playerR.y : data.playerL.y;
            players.opponent.score = clientName === data.playerL.id ? data.playerR.score : data.playerL.score;

            // ball.x = data.ball.x;
            // ball.y = data.ball.y;
            // ball.speed = data.ball.speed;
            // ball.xFac = data.ball.direction.xFac;
            // ball.yFac = data.ball.direction.yFac;
        }
    }
    function pushGameState() {
        if (gameSocket.readyState === WebSocket.OPEN) {
            sendMessage({
                type: 'game_state',
                data: {
                    playerL: {
                        id: players.me === playerL ? players.me.id : players.opponent.id,
                        y: playerL.y,
                        score: playerL.score
                    },
                    playerR: {
                        id: players.me === playerR ? players.me.id : players.opponent.id,
                        y: playerR.y,
                        score: playerR.score
                    },
                    ball: {
                        x: ball.x,
                        y: ball.y,
                        speed: ball.speed,
                        direction: {
                            xFac: ball.xFac,
                            yFac: ball.yFac
                        }
                    }
                }
            });
        }
    };

// ************ GAME ************ //

// CLASSES: Player and Ball
class Player {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.upKey = 'ArrowUp';
        this.downKey = 'ArrowDown';
        this.speed = 15;
        this.score = 0;
        this.width = PLAYER_W;
        this.height = PLAYER_H;
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }

    update() {
        if (keysPressed[this.upKey]) {
            this.y -= this.speed;
        }
        if (keysPressed[this.downKey]) {
            this.y += this.speed;
        }
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
        this.xFac = Math.random() < 0.5 ? -1 : 1;
        this.yFac = Math.random() * 2 - 1;
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

        // update pos in obj
        this.left = this.x - this.radius
        this.right = this.x + this.radius
        this.top = this.y - this.radius
        this.bottom = this.y + this.radius

        // check ball colision with top/bottom edges
        if (this.top <= 0 || this.bottom >= WIN_H) {
            this.yFac *= -1;
            if (this.top <= 0) {
                this.top = BALL_SIZE + 1;
            } else if (this.bottom >= WIN_H) {
                this.bottom = WIN_H - BALL_SIZE + 1;
            }
        }

        // check ball colision with right/left sides
        if (this.right >= WIN_W) {
            return 1;
        } else if (this.left <= 0) {
            return -1;
        }
        return 0;
    }

    hit() {
        this.xFac *= -1;
        const tanAngle = Math.tan(this.randAngle * Math.PI / 180) * this.xFac;
        this.yFac = tanAngle; // Update yFac based on the angle
        this.speed = 8 * (1 + Math.random() * 0.5);

        this.hitCount++;
        const hitSound = document.getElementById(this.hitCount % 2 === 0 ? 'hitSoundL' : 'hitSoundR');
        hitSound.currentTime = 0; // Reset sound to start
        hitSound.playbackRate = 1; // Double the playback speed
        hitSound.play().catch(error => {
            console.error("Error attempting to play", error);
        });
    }

    reset() {
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
    muteButton.addEventListener('click', (event) => {
        toggleMute();
    });
    gameSocket.onmessage = function(event) {
        const data = JSON.parse(event.data);
        if (data && data.type === "game_state") {
            console.log("Received game state data:", data);
            pullGameState(data.data);  // Pass the data part to pullGameState
        }
    }
    document.addEventListener('keydown', (event) => {
        keysPressed[event.code] = true;
        if (event.code === 'ArrowUp' || event.code === 'ArrowDown') {
            pushGameState();
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
    isMuted = !isMuted;
    hitSoundL.muted = !hitSoundL.muted;
    hitSoundR.muted = !hitSoundR.muted;
    muteButton.textContent = isMuted ? 'Unmute 🔉' : 'Mute 🔇';
}
function drawScores() {

    ctx.fillStyle = WHITE;
    ctx.font = `${FONT_SIZE_M}px PixelifySans`;
    ctx.fillText(playerL.score, WIN_W / 4, WIN_H / 2);
    ctx.fillText(playerR.score, WIN_W / 4 * 3, WIN_H / 2);
}
function drawDottedLine() {
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

    ctx.fillStyle = GREY;
    ctx.fillRect(0, 0, WIN_W, WIN_H);
    ctx.fillStyle = WHITE;
    ctx.font = `${FONT_SIZE_M}px PixelifySans`;
    const text = "Press space bar to start!";
    const textWidth = ctx.measureText(text).width;
    ctx.fillText(text,  (WIN_W - textWidth) / 2, WIN_H / 2);

    requestAnimationFrame(pregameLoop);
}
function drawCanvas() {
    // draw window 
    ctx.fillStyle = GREY;
    ctx.fillRect(0, 0, WIN_W, WIN_H);
    // draw scores
    color = WHITE
    drawScores();
    // draw central line
    drawDottedLine();
    // draw players and ball
    playerL.draw();
    playerR.draw();
    ball.draw();
}
function resetGame() {
    gameRunning = false;
        
    playerL = new Player(50, WIN_H / 2 - 175 / 2, 'orange');
    playerR = new Player(WIN_W - 50 - 30, WIN_H / 2 - 175 / 2, 'red');
    ball    = new Ball(WIN_W / 2, WIN_H / 2, 'blue');
}
function randNumBtw(min, max) {
    return Math.random() * (max - min) + min;
}
function handleCollision(ball, player, side) {
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


// Game loop
function gameLoop() {

    // make sure fps <= 60
    let msNow = window.performance.now();
    let msPassed = msNow - msPrev;
    
    gameRunning = true;

    function updateGame() {
        if (!gameRunning || (msPassed < msPerFrame))
            return;

        // check missed balls for scoring
        // if (point === 1) {
        //     playerL.score += 1;
        //     ball.reset();
        // } else if (point === -1) {
        //     playerR.score += 1;
        //     ball.reset();
        // }

        // check end game conditions
        // if (playerL.score >= WINNING_SCORE || playerR.score >= WINNING_SCORE){
        //     resetGame();
        //     return;
        // }

        // Collision detection and response
        // if (ball.left <= playerL.x + playerL.width
        //     && ball.y >= playerL.y && ball.y <= playerL.y + playerL.height) {
        //     ball.x = ball.x + playerL.width/2;
        //     handleCollision(ball, playerL, false);
        // } else if (ball.right >= playerR.x
        //     && ball.y >= playerR.y && ball.y <= playerR.y + playerR.height) {
        //     ball.x = ball.x - playerR.width/2;
        //     handleCollision(ball, playerR, true);
        // }
        // Draw the canvas
        drawCanvas();

        // Push the updated game state to the server
        
        let excessTime = msPassed % msPerFrame;
        msPrev = msNow - excessTime;
        requestAnimationFrame(updateGame);
    }
    requestAnimationFrame(updateGame);
}
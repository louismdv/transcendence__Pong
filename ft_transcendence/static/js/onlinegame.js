
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
const WINNING_SCORE = 5;
const WIN_H = 720, WIN_W = 1080;
const PLAYER_W = 30, PLAYER_H = 175;
const BALL_SIZE = 30, BALL_RADIUS = BALL_SIZE / 2;
const FONT_SIZE_XL = 500, FONT_SIZE_L = 200, FONT_SIZE_M = 50;

// VARIABLES
let playerL, playerR, ball, keysPressed = {}, point = 0, isMuted = false;

const canvas = document.getElementById('onlinegameCanvas');
const ctx = canvas.getContext('2d');

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
            // Check if game_state is present
        if (data.game_state) {
            // Parse the individual fields in game_state if they are strings
            if (typeof data.game_state.playerL === "string") {
                data.game_state.playerL = JSON.parse(data.game_state.playerL);
            }
            if (typeof data.game_state.playerR === "string") {
                data.game_state.playerR = JSON.parse(data.game_state.playerR);
            }
            if (typeof data.game_state.ball === "string") {
                data.game_state.ball = JSON.parse(data.game_state.ball);
            }
        }
        switch (data.type) {
            case 'start_game':
                console.log("Starting game via ws!");
                pullGameState(data.game_state, true);
                setupEventListeners();
                gameLoop();
                break;
            case 'update_game':
                console.log("Received game state:", data);
                pullGameState(data.game_state, false);
                break;
            default:
                console.log("Unknown message type:", data.type);
        }
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
    function pullGameState(data, start_game = false) {

        console.log(data)
            // creating in-memory player object with pulled game_state
        if (start_game === true) {
            if (clientName === data.playerL.id) {
                players.me = new Player(50, WIN_H / 2 - 175 / 2, 'orange', clientName, 'playerL');
                players.opponent = new Player(WIN_W - 50 - 30, WIN_H / 2 - 175 / 2, 'red', data.playerR.id, 'playerR');
            }
            else if (clientName === data.playerR.id) {
                players.me = new Player(WIN_W - 50 - 30, WIN_H / 2 - 175 / 2, 'red', clientName, 'playerR');
                players.opponent = new Player(50, WIN_H / 2 - 175 / 2, 'orange', data.playerL.id, 'playerL');
            }
            // ball    = new Ball(WIN_W / 2, WIN_H / 2, 'blue');
        }
            // updating aleady existing in-memory player object with game_state
        else if (players.me.id === data.playerL.id || players.me.id === data.playerR.id) {

            Object.assign(players.me, players.me.id === data.playerL.id ? data.playerL : data.playerR);
            Object.assign(players.opponent, players.me.id === data.playerL.id ? data.playerR : data.playerL);

            // ball.x = data.ball.x;
            // ball.y = data.ball.y;
            // ball.speed = data.ball.speed;
            // ball.xFac = data.ball.direction.xFac;
            // ball.yFac = data.ball.direction.yFac;
        }
    }
function pushMove(type) {
    if (gameSocket.readyState === WebSocket.OPEN) {
        sendMessage({
            type: type,
            data: {
                [players.me.side]: { y: players.me.y }
            }
        });
    }
};

// ************ GAME ************ //

// CLASSES: Player and Ball
class Player {
    constructor(x, y, color, id, side) {
        this.x = x;
        this.y = y;
        this.id = id;
        this.side = side,
        this.color = color;
        this.score = 0;
        this.width = PLAYER_W;
        this.height = PLAYER_H;
    }
    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}
class Ball {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.xFac = 1;
        this.yFac = 1;
        this.speed = 5;
        this.radius = BALL_RADIUS;
        this.hitCount = 0;
    }
    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.closePath();
    }
}

// FUNCTIONS
function setupEventListeners() {
    document.addEventListener('keydown', (event) => {
        keysPressed[event.code] = true;
        switch (event.code) {
            case 'ArrowUp':
                return pushMove('move_up');
            case 'ArrowDown':
                return pushMove('move_down');
            case 'KeyM':
                return toggleMute();
            case 'Escape':
                resetGame();
                pregameLoop();
        }
    });
    document.addEventListener('keyup', (event) => {
        keysPressed[event.code] = false;
    });
    muteButton.addEventListener('click', (event) => {
        toggleMute();
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
    ctx.fillText(players.me.score, WIN_W / 4, WIN_H / 2);
    ctx.fillText(players.opponent.score, WIN_W / 4 * 3, WIN_H / 2);
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
    players.me.draw();
    players.opponent.draw();
    // ball.draw();
}
// function resetGame() {
        
//     playerL = new Player(50, WIN_H / 2 - 175 / 2, 'orange');
//     playerR = new Player(WIN_W - 50 - 30, WIN_H / 2 - 175 / 2, 'red');
//     ball    = new Ball(WIN_W / 2, WIN_H / 2, 'blue');
// }
function randNumBtw(min, max) {
    return Math.random() * (max - min) + min;
}



// Game loop
function gameLoop() {

    function updateGame() {

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

        // Draw the canvas
        drawCanvas();

        // Push the updated game state to the server

        requestAnimationFrame(updateGame);
    }
    requestAnimationFrame(updateGame);
}








// function handleCollision(ball, player, side) {
//     const paddleThird = player.height / 3;

//     if (ball.y >= player.y && ball.y <= player.y + paddleThird) {
//         ball.randAngle = side ? randNumBtw(20, 45) : randNumBtw(-20, -45); // Top third
//         ball.hit();
//     } else if (ball.y > player.y + paddleThird && ball.y < player.y + 2 * paddleThird) {
//         ball.randAngle = randNumBtw(-10, 10); // Middle third
//         ball.hit();
//     } else if (ball.y >= player.y + 2 * paddleThird && ball.y <= player.y + player.height) {
//         ball.randAngle = side ? randNumBtw(-45, -20) : randNumBtw(45, 20); // Bottom third
//         ball.hit();
//     }
// }
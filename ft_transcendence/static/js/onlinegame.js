
// ************ SETUP ************ //

// COLORS
const COLORS = {
    RED: '#ff0000',
    GREY: '#1c1c1c',
    BLUE: '#0000ff',
    WHITE: '#ffffff',
    BLACK: '#000000',
    YELLOW: '#ffff00',
    ORANGE: '#ffa500',
  };
  

// SETTINGS
const WINNING_SCORE = 5;
const WIN_H = 720, WIN_W = 1080;
const PLAYER_W = 30, PLAYER_H = 175;
const BALL_SIZE = 40, BALL_RADIUS = BALL_SIZE / 2;
const FONT_SIZE_XL = 500, FONT_SIZE_L = 200, FONT_SIZE_M = 50;

// VARIABLES
let ball, keysPressed = {}, point = 0;

document.getElementById('page-title').textContent = "Online Game Mode";
const canvas = document.getElementById('onlinegameCanvas');
const ctx = canvas.getContext('2d');
let loadingAnimation = writeLoadingText(ORANGE);

const players = { me: null, opponent: null };
let downcounting = false;
let winner = null;

// ************ WEBSOCKETS ************ //
const hash = window.location.hash; 
const roomName = hash.split('/')[1];
const gameSocket = new WebSocket(`ws://${window.location.host}/ws/online-game/${roomName}/`);

gameSocket.onclose = function(event) {
    console.log("WebSocket closed:", event.code, event.reason);
};
gameSocket.onerror = function(event) {
    console.error("WebSocket error observed:", event);
};
const clientName = "{{ request.user.username|escapejs }}";

// Event handler for when the connection is successfully opened
gameSocket.onopen = function(event) {
    console.log("WebSocket is open now.");
    sendMessage({ type: 'initial_message', username: clientName });
};
// Event handler for receiving messages from the server
gameSocket.onmessage = function(event) {
    const data = JSON.parse(event.data);

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
        if (typeof data.game_state === "string") {
            data.game_state = JSON.parse(data.game_state);
        }
    }
    // console.log("Received type:", data.type);

    switch (data.type) {
        case 'load_player_info':
            document.getElementById('username-playerL').textContent = data.playerL_id;
            startSearch();
            if (data.playerR_id) {
                document.getElementById('username-playerR').textContent = data.playerR_id;
                clearInterval(loadingAnimation);
                opponentFound();
                setupGame(data);
                writeToCanvas("Press space bar when you are ready!", WHITE, WIN_W / 2, WIN_H / 2);
            }
            break;
        case 'load_player_avatar':
            if (data.playerL_picture) {
                document.getElementById("playerL_picture").src = `data:image/jpeg;base64,${data.playerL_picture}`;
            }
            if (data.playerR_picture) {
                document.getElementById("playerR_picture").src = `data:image/jpeg;base64,${data.playerR_picture}`;
            }
            break;
        case 'room_full':
        case 'connection_rejected':
            window.location.pathname = '/online-game/lobby/';
            break;
        case 'no_game_to_restore':
            console.log("No game to restore.");
            writeToCanvas("No game to restore. Waiting for challenger...", WHITE, WIN_W / 2, WIN_H / 2);
            break;
        case 'restore_game':
            console.log("CASE Restoring game state:", data.game_state);
            handle_restore_game(data.game_state);
            break;
        case 'start_game':
            clearInterval(loadingAnimation);
            countdown(3, gameLoop);
            break;
        case 'update_player':
            pullPlayerState(data.player_side, data.new_y, data.old_y);
            break;
        case 'update_ball':
            pullBallState(data.ball_state);
            break;
        default:
            console.log("Unknown message type:", data.type);
    }
};

// ************ HELPER WEBSOCKETS FUNCTIONS ************ //

function sendMessage(data) {
    if (gameSocket.readyState === WebSocket.OPEN) {
        gameSocket.send(JSON.stringify(data));
    } else {
        console.warn("WebSocket not ready, retrying...");
        setTimeout(() => sendMessage(data), 500); // Retry after 500ms
    }
}
// Abstracted code for both players. Each user gets a player obj and an opponent obj
function setupGame(data) {

    // creating in-memory player object with pulled game_state
    if (clientName === data.playerL_id) {
        players.me = new Player(50, WIN_H / 2 - 175 / 2, 'orange', clientName, 'playerL');
        players.opponent = new Player(WIN_W - 50 - 30, WIN_H / 2 - 175 / 2, 'red', data.playerR_id, 'playerR');
    }
    else if (clientName === data.playerR_id) {
        players.me = new Player(WIN_W - 50 - 30, WIN_H / 2 - 175 / 2, 'red', clientName, 'playerR');
        players.opponent = new Player(50, WIN_H / 2 - 175 / 2, 'orange', data.playerL_id, 'playerL');
    }
    ball = new Ball(WIN_W / 2, WIN_H / 2, 'blue');
    ball.x = data.ball.x;
    ball.y = data.ball.y;
    ball.speed = data.ball.speed;
    ball.xFac = data.ball.xFac;
    ball.yFac = data.ball.yFac;
    ball.point_win = data.ball.point_win;
}
function pullPlayerState(player_side, new_y, old_y) {
    if (players.me.side === player_side) {
        players.me.y = new_y;
        players.me.old_y = old_y;
    } else if (players.opponent.side === player_side) {
        players.opponent.y = new_y;
        players.opponent.old_y = old_y;
    }
}
function pullBallState(ball_state) {
    // Check if ball is initialized
    
    if (typeof ball_state === "string") {
        ball_state = JSON.parse(ball_state);
    }
    ball.x = ball_state.x;
    ball.y = ball_state.y;
    ball.speed = ball_state.speed;
    ball.xFac = ball_state.xFac;   
    ball.yFac = ball_state.yFac;
    ball.point_win = ball_state.point_win;
    if (players.me.side === 'playerL') {
        players.me.score = ball_state.playerL_points;
        players.opponent.score = ball_state.playerR_points;
    }
    else {
        players.opponent.score = ball_state.playerL_points;
        players.me.score = ball_state.playerR_points;
    }
}
function pushMove(type) {
    if (gameSocket.readyState === WebSocket.OPEN) {
        sendMessage({
            type: type,
            side: players.me.side,
        });
    }
};
function handle_restore_game(gameState) {

    console.log("Restoring game state:", gameState);    

    if (clientName === gameState.playerL.id) {
        console.log("RESTORED playerL");
        players.me = new Player(gameState.playerL.x, gameState.playerL.y, 'orange', clientName, 'playerL');
        players.opponent = new Player(gameState.playerR.x, gameState.playerR.y, 'red', gameState.playerR.id, 'playerR');
    }
    else if (clientName === gameState.playerR.id) {
        console.log("RESTORED playerR");
        players.me = new Player(gameState.playerR.x, gameState.playerR.y, 'red', gameState.playerR.id, 'playerR');
        players.opponent = new Player(gameState.playerL.x, gameState.playerL.y, 'orange', clientName, 'playerL');
    }
    document.getElementById('username-playerL').textContent = gameState.playerL.id;
    document.getElementById('username-playerR').textContent = gameState.playerR.id;

    // Restore the ball properties
    if (gameState.ball) {
        console.log("RESTORED ball");
        ball = new Ball(WIN_W / 2, WIN_H / 2, 'blue');
        ball.x = gameState.ball.x;
        ball.y = gameState.ball.y;
        ball.speed = gameState.ball.speed;
        ball.xFac = gameState.ball.xFac;
        ball.yFac = gameState.ball.yFac;
        ball.point_win = gameState.ball.point_win;

        if (players.me.side === 'playerL') {
            players.me.score = gameState.ball.playerL_points
            players.opponent.score = gameState.ball.playerR_points;
        }
        else if (players.me.side === 'playerR') {
            players.opponent.score = gameState.ball.playerL_points;
            players.me.score = gameState.ball.playerR_points;
        }
    }
    sendMessage({ type: 'ready', player_side: players.me.side });
    console.log("Game state restored successfully: ", players.me, players.opponent, ball);
}

// ************ OBJECT CLASSES ************ //

class Player {
    constructor(x, y, color, id, side) {
        this.x = x;
        this.y = y;
        this.old_y = y;
        this.id = id;
        this.side = side,
        this.color = color;
        this.score = 0;
        this.width = PLAYER_W;
        this.height = PLAYER_H;
    }
    draw() {
        // Interpolate between old y and new y
        this.old_y += (this.y - this.old_y) * 0.3;

        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.old_y, this.width, this.height);
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

// ************ GAME ************ //
setupEventListeners();
function gameLoop() {
    disableScrolling();

    gameRunning = true;

    function updateGame() {

        if (!gameRunning || downcounting) {
            return;
        }
        if (players.me.score >= WINNING_SCORE)
            winner = players.me.id;
        else if (players.opponent.score >= WINNING_SCORE)
            winner = players.opponent.id;
        if (winner) {
            gameRunning = false;
            sendMessage({ type: 'game_over', winner: winner });
            winnerAnnouce();
            return;
        }

        drawCanvas();

        requestAnimationFrame(updateGame);
    }
    requestAnimationFrame(updateGame);
}

// ************ LISTENERS ************ //

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
            case 'Space':
                console.log("Space bar pressed");
                writeToCanvas("Opponent isn't ready yet...", WHITE, WIN_W / 2, WIN_H / 2);
                return sendMessage({ type: 'ready', player_side: players.me.side });
        }
    });
    document.addEventListener('keyup', (event) => {
        keysPressed[event.code] = false;
    });
}
function preventDefault(e) {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
    }
}

function disableScrolling() {
    document.addEventListener('keydown', preventDefault);
}

function enableScrolling() {
    document.removeEventListener('keydown', preventDefault);
}

function drawCanvas() {
    ctx.fillStyle = GREY;
    ctx.fillRect(0, 0, WIN_W, WIN_H);
    COLORS = WHITE
    drawScores();
    drawDottedLine();
    players.me.draw();
    players.opponent.draw();
    ball.draw();
}

////// HELPER FUNCTIONS //////

function writeToCanvas(text, color, x=null, y=null) {

    ctx.fillStyle = color;
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear canvas
    ctx.font = `${FONT_SIZE_M}px 'Pixelify Sans', sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    if (x && y) {
        ctx.fillText(text, x, y);
        return;
    }
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
}
function writeLoadingText(color, x = null, y = null, interval = 500) {
    const text = "Waiting for challenger";
    const maxDots = 3; // Maximum number of dots
    let dotCount = 0;

    ctx.fillStyle = color;
    ctx.font = `${FONT_SIZE_M}px 'Pixelify Sans', sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    x = x ?? canvas.width / 2;
    y = y ?? canvas.height / 2;

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear canvas

        // Create a fixed-width text by always printing three spaces for the dots
        const dots = ".".repeat(dotCount) + " ".repeat(maxDots - dotCount);
        ctx.fillText(text + dots, x, y);

        dotCount = (dotCount + 1) % (maxDots + 1); // Cycle dots from 0 to 3
    }

    return setInterval(draw, interval); // Store interval ID to clear later
}
function drawScores() {

    ctx.fillStyle = WHITE;
    ctx.font = `${FONT_SIZE_M}px 'Pixelify Sans', sans-serif`;
    if (players.me.side == 'playerL') {
        ctx.fillText(players.me.score, WIN_W / 4, WIN_H / 2);
        ctx.fillText(players.opponent.score, WIN_W / 4 * 3, WIN_H / 2);
    }
    else {
        ctx.fillText(players.opponent.score, WIN_W / 4, WIN_H / 2);
        ctx.fillText(players.me.score, WIN_W / 4 * 3, WIN_H / 2);
    }
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

function winnerAnnouce() {

    ctx.fillStyle = GREY;
    ctx.fillRect(0, 0, WIN_W, WIN_H);
    ctx.fillStyle = WHITE;
    ctx.font = `${FONT_SIZE_M}px PixelifySans`;
    winner_name = `${winner} wins!`;
    writeToCanvas(`GAME OVER: ${winner_name}`, YELLOW); // Fixed line

    requestAnimationFrame(winnerAnnouce);
}
// Loading animation: When starting to search for an opponent
function startSearch() {
    document.querySelector('.avatar-container').classList.add('searching');
}
// Loading animation: When opponent is found
function opponentFound() {
    document.querySelector('.avatar-container').classList.remove('searching');
}

function copyRoomCode() {
    const roomCode = document.getElementById("roomCode");
    roomCode.setSelectionRange(0, 99999); // For mobile devices
    navigator.clipboard.writeText(roomCode.value);
    const tooltip = document.getElementById("tooltip-text");
    tooltip.innerHTML = "Copied!";
}

function countdown(start, callback) {
    if (start > 0) {
        downcounting = true;
        ctx.clearRect(0, 0, WIN_W, WIN_H);
        writeToCanvas(start.toString(), WHITE, WIN_W / 2, WIN_H / 2);
        setTimeout(() => countdown(start - 1, callback), 1000);
    } else {
        downcounting = false;
        ctx.clearRect(0, 0, WIN_W, WIN_H);
        writeToCanvas("Go", WHITE, WIN_W / 2, WIN_H / 2);
        setTimeout(callback, 1000); // Start the game after "Go!" is displayed
    }
}



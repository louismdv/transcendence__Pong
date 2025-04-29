
(() => {

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
const WINNING_SCORE = 2;
const WIN_H = 720, WIN_W = 1080;
const PLAYER_W = 30, PLAYER_H = 175;
const BALL_SIZE = 40, BALL_RADIUS = BALL_SIZE / 2;
const FONT_SIZE_XL = 500, FONT_SIZE_L = 200, FONT_SIZE_M = 50;

// VARIABLES
let ball, keysPressed = {}, point = 0;
document.getElementById('page-title').textContent = "Online Game Mode";
canvas = document.getElementById('onlinegameCanvas');
ctx = canvas.getContext("2d");

const hash = window.location.hash;
console.log('hash: [', hash, ']');
const roomName = window.location.hash.replace('#', '').split('/')[1];
console.log('roomname: [', roomName, ']');
const clientName = currentUsername;
console.log('clientname: [', clientName, ']');
const userId = currentUserId;
console.log('userId: [', userId, ']');

const players = { me: null, opponent: null };
let downcounting = false;
let loadingAnimation;
let winner_id = null;
let gameSocket;
let animationId;
loadingAnimation = writeLoadingText("orange");


function initGame() {
    console.log("Initializing game...");

    // 1. Get canvas and context
    // document.getElementById('page-title').textContent = "Online Game Mode";
    canvas = document.getElementById('onlinegameCanvas');
    ctx = canvas.getContext("2d");

    // 2. Clear everything visually
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 3. Stop any loops
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
    clearInterval(loadingAnimation);

    gameRunning = false;

    // 5. Setup socket and listeners
    initializeWebSocket();
    setupEventListeners();

    const playerLPic = document.getElementById('playerL_picture');
    const avatarUrl = playerLPic.dataset.avatar;
    console.log("Avatar URL from data attribute:", avatarUrl);

    // 6. Reset UI
    document.getElementById('username-playerL').textContent = clientName;
    document.getElementById('username-playerR').textContent = 'Loading...';
    document.getElementById("playerL_picture").src = avatarUrl;
    document.getElementById("playerR_picture").src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAQABAACAUwAOw";
}

// ************ WEBSOCKETS ************ //
function setupNewSocket(roomName, clientName, userId) {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    gameSocket = new WebSocket(`${wsProtocol}//${window.location.host}/ws/game/${roomName}/`);

    gameSocket.onopen = () => { console.log("✅ WebSocket open: handshake sent to server");
        console.log("userId:", userId);
        console.log("username:", clientName);
        sendMessage({ type: 'initial_message', username: clientName, userid: userId });
    };
    gameSocket.onerror = (err) => { console.error("❌ WebSocket error", err); };
    gameSocket.onclose = (event) => {
        console.log("🔌 WebSocket closed", event.code, event.reason); 
    };
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
        console.log("Received type:", data.type);

        switch (data.type) {
            case 'load_player_info':
                document.getElementById('username-playerL').textContent = data.playerL_name;
                startSearch();
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                clearInterval(loadingAnimation);
                loadingAnimation = writeLoadingText("orange");
                if (data.playerR_id) {
                    document.getElementById('username-playerR').textContent = data.playerR_name;
                    clearInterval(loadingAnimation);
                    opponentFound();
                    setupGame(data);
                    writeToCanvas("Press space bar when you are ready!", WHITE, WIN_W / 2, WIN_H / 2);
                }
                break;
            case 'load_player_avatar':
                if (data.playerL_picture)
                    document.getElementById("playerL_picture").src = `data:image/jpeg;base64,${data.playerL_picture}`;
                if (data.playerR_picture)
                    document.getElementById("playerR_picture").src = `data:image/jpeg;base64,${data.playerR_picture}`;
                break;
            case 'room_full':
            case 'connection_rejected':
                window.location.href = '/#onlinegame';
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
                // clearInterval(loadingAnimation);
                countdown(3, gameLoop);
                break;
            case 'update_player':
                pullPlayerState(data.player_side, data.new_y, data.old_y);
                break;
            case 'update_ball':
                if (ball)
                    pullBallState(data.ball_state);
                break;
            default:
                console.log("Unknown message type:", data.type);
        }
    };
}
function initializeWebSocket() {
    if (gameSocket && gameSocket.readyState !== WebSocket.CLOSED) {
        gameSocket.close();
        gameSocket.onclose = () => {
            console.log("Old socket closed. Creating new one...");
            setupNewSocket(roomName, clientName, userId);
        };
    } else {
        setupNewSocket(roomName, clientName, userId);
    }
}

// ************ HELPER WEBSOCKETS FUNCTIONS ************ //
// function sendMessage(message, retryCount = 5) {
//     if (!gameSocket || gameSocket.readyState === WebSocket.CLOSING || gameSocket.readyState === WebSocket.CLOSED) {
//         console.warn("WebSocket is not available.");
//         return;
//     }
//     if (gameSocket.readyState === WebSocket.OPEN) {
//         gameSocket.send(JSON.stringify(message));
//     } else if (retryCount > 0) {
//         console.log("WebSocket not ready, retrying...");
//         setTimeout(() => sendMessage(message, retryCount - 1), 500);
//     } else {
//         console.error("WebSocket failed to open after retries.");
//     }
// }
function sendMessage(message) {
    // if (!gameSocket || gameSocket.readyState === WebSocket.CLOSING || gameSocket.readyState === WebSocket.CLOSED) {
    //     console.warn("WebSocket is not available.");
    //     return;
    // }
    if (gameSocket.readyState === WebSocket.OPEN) {
        gameSocket.send(JSON.stringify(message));
    } else {
        console.error("WebSocket failed to open after retries.");
    }
}
function setupGame(data) {
// Abstracted code for both players. Each user gets a player obj and an opponent obj

    // creating in-memory player object with pulled game_state
    if (userId === data.playerL_id) {
        players.me = new Player(50, WIN_H / 2 - 175 / 2, 'orange', userId, clientName, 'playerL');
        players.opponent = new Player(WIN_W - 50 - 30, WIN_H / 2 - 175 / 2, 'red', data.playerR_id, data.playerR_name, 'playerR');
    }
    else if (userId === data.playerR_id) {
        players.me = new Player(WIN_W - 50 - 30, WIN_H / 2 - 175 / 2, 'red', userId, clientName, 'playerR');
        players.opponent = new Player(50, WIN_H / 2 - 175 / 2, 'orange', data.playerL_id, data.playerL_name, 'playerL');
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

    if (userId === gameState.playerL.id) {
        console.log("RESTORED playerL");
        players.me = new Player(gameState.playerL.x, gameState.playerL.y, 'orange', userId, gameState.playerL.username, 'playerL');
        players.opponent = new Player(gameState.playerR.x, gameState.playerR.y, 'red', gameState.playerR.id, gameState.playerR.username, 'playerR');
    }
    else if (userId === gameState.playerR.id) {
        console.log("RESTORED playerR");
        players.me = new Player(gameState.playerR.x, gameState.playerR.y, 'red', userId, gameState.playerR.username, 'playerR');
        players.opponent = new Player(gameState.playerL.x, gameState.playerL.y, 'orange', gameState.playerR.id, gameState.playerL.username, 'playerL');
    }
    document.getElementById('username-playerL').textContent = gameState.playerL.username;
    document.getElementById('username-playerR').textContent = gameState.playerR.username;

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
    console.log("sidddddddeeeee:", players.me.side);
    sendMessage({ type: 'ready', player_side: players.me.side });
    console.log("Game state restored successfully: ", players.me, players.opponent, ball);
}

// ************ OBJECT CLASSES ************ //
class Player {
    constructor(x, y, color, id, username, side) {
        this.id = id;
        this.username = username;
        this.x = x;
        this.y = y;
        this.old_y = y;
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
function gameLoop() {
    disableScrolling();

    gameRunning = true;

    function updateGame() {

        if (!gameRunning || downcounting) {
            return;
        }
        if (players.me.score >= WINNING_SCORE)
            winner_id = players.me.id;
        else if (players.opponent.score >= WINNING_SCORE)
            winner_id = players.opponent.id;
        if (winner_id) {
            gameRunning = false;
            final_score = (winner_id === players.me.id ? players.me.score : players.opponent.score) + " - " + (winner_id === players.me.id ? players.opponent.score : players.me.score);
            if (winner_id === players.me.id) winnerAnnouce(players.me.username); 
            else winnerAnnouce(players.opponent.username);
            console.log("Game over. Winner:", winner_id, "Final score:", final_score, "Game state:", players.me.id, players.opponent.id,);
            sendMessage({ type: 'game_over', winner: winner_id, me_id: players.me.id, opponent_id: players.opponent.id, score: final_score});
            updateDashboardData();
            return;
        }
        drawCanvas();
        animationId = requestAnimationFrame(updateGame);
    }
    animationId = requestAnimationFrame(updateGame);
}

// ************ LISTENERS ************ //
function setupEventListeners() {
    window.addEventListener("hashchange", () => {
        let gamePart = window.location.hash.split("/")[0];

        if (gamePart === "#game" && gameSocket && gameSocket.readyState === WebSocket.OPEN) {
            console.log(gamePart)
            console.log("WebSocket is now reopened.");
            sendMessage({ type: 'initial_message', username: clientName, userid: userId });
        } else if (gameSocket && gameSocket.readyState === WebSocket.OPEN) {
            sendMessage({ type: "player_left_game_section" });
        }
    });
    document.addEventListener('keydown', (event) => {

        keysPressed[event.code] = true;
        switch (event.code) {
            case 'ArrowUp':
                return pushMove('move_up');
            case 'ArrowDown':
                return pushMove('move_down');
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
function drawCanvas() {
    ctx.fillStyle = GREY;
    ctx.fillRect(0, 0, WIN_W, WIN_H);
    COLORS = WHITE;
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
function winnerAnnouce(winner_name) {

    console.log("announcing winner");
    ctx.fillStyle = GREY;
    ctx.fillRect(0, 0, WIN_W, WIN_H);
    ctx.fillStyle = WHITE;
    ctx.font = `${FONT_SIZE_M}px PixelifySans`;
    writeToCanvas(`GAME OVER: ${winner_name} wins!`, YELLOW);
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
} window.copyRoomCode = copyRoomCode;
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

function main() {
    console.log("Running game main()");
    initGame();
}
main();

})();
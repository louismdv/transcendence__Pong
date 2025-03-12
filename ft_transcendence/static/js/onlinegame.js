// static/js/pong.js
document.addEventListener('DOMContentLoaded', function() {
    const gameCanvas = document.getElementById('gameCanvas');
    const ctx = gameCanvas.getContext('2d');
    const roomCode = document.getElementById('roomCode').textContent;
    
    // Set canvas dimensions
    gameCanvas.width = 800;
    gameCanvas.height = 400;
    
    // Game variables
    let player = null;
    let gameState = {
        player_positions: {player1: 50, player2: 50},
        ball_position: {x: 50, y: 50},
        scores: {player1: 0, player2: 0}
    };
    
    // Connect to WebSocket
    const socket = new WebSocket(
        'ws://' + window.location.host + '/ws/pong/' + roomCode + '/'
    );
    
    socket.onopen = function(e) {
        console.log('WebSocket connection established');
    };
    
    socket.onmessage = function(e) {
        const data = JSON.parse(e.data);
        console.log('Message received:', data);
        
        if (data.type === 'player_assignment') {
            player = data.player;
            updateStatus(`You are ${player}`);
        } 
        else if (data.type === 'game_state') {
            gameState = data.game_state;
            drawGame();
        } 
        else if (data.type === 'paddle_update') {
            gameState.player_positions[data.player] = data.position;
            drawGame();
        } 
        else if (data.type === 'player_disconnected') {
            updateStatus(`${data.player} disconnected. Waiting for players...`);
        } 
        else if (data.type === 'room_full') {
            updateStatus('Room is full. Please try another room.');
        }
    };
    
    socket.onclose = function(e) {
        console.log('WebSocket connection closed');
        updateStatus('Connection closed. Please refresh.');
    };
    
    // Mouse movement to control paddle
    gameCanvas.addEventListener('mousemove', function(e) {
        if (!player) return;
        
        // Calculate mouse position as percentage of canvas height
        const rect = gameCanvas.getBoundingClientRect();
        const mouseY = e.clientY - rect.top;
        const position = (mouseY / rect.height) * 100;
        
        // Send paddle position to server
        socket.send(JSON.stringify({
            'type': 'paddle_move',
            'position': position
        }));
    });
    
    // Draw game elements
    function drawGame() {
        // Clear canvas
        ctx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);
        
        // Draw paddles
        drawPaddle(5, gameState.player_positions.player1); // Left paddle
        drawPaddle(gameCanvas.width - 15, gameState.player_positions.player2); // Right paddle
        
        // Draw ball
        const ballX = (gameState.ball_position.x / 100) * gameCanvas.width;
        const ballY = (gameState.ball_position.y / 100) * gameCanvas.height;
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(ballX, ballY, 10, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw scores
        ctx.font = '30px Arial';
        ctx.fillText(gameState.scores.player1, gameCanvas.width / 4, 50);
        ctx.fillText(gameState.scores.player2, 3 * gameCanvas.width / 4, 50);
        
        // Draw center line
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(gameCanvas.width / 2, 0);
        ctx.lineTo(gameCanvas.width / 2, gameCanvas.height);
        ctx.stroke();
        ctx.setLineDash([]);
    }
    
    function drawPaddle(x, yPercent) {
        const paddleHeight = 80;
        const paddleWidth = 10;
        const y = (yPercent / 100) * gameCanvas.height - (paddleHeight / 2);
        
        ctx.fillStyle = 'white';
        ctx.fillRect(x, y, paddleWidth, paddleHeight);
    }
    
    function updateStatus(message) {
        document.getElementById('gameStatus').textContent = message;
    }
    
    // Initial draw
    drawGame();
});
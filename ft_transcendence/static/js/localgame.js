(function() {
    // Vérifier si l'élément existe avant d'y accéder
    const pageTitle = document.getElementById('page-title');
    if (pageTitle) {
        pageTitle.textContent = "Local Game Mode";
    }
    
    // On déclare les variables canvas et ctx mais on les initialise plus tard
    let canvas, ctx;
    
    // Fonction pour initialiser le canvas avec sécurité
    function initCanvas() {
        canvas = document.getElementById('localgameCanvas');
        if (!canvas) {
            console.error("[Game] Canvas 'localgameCanvas' introuvable !");
            return false;
        }
        ctx = canvas.getContext('2d');
        if (!ctx) {
            console.error("[Game] Contexte 2D du canvas indisponible !");
            return false;
        }
        console.log("[Game] Canvas et contexte 2D initialisés avec succès !");
        return true;
    }
    
    // Première initialisation
    initCanvas();
    
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
    // Tournament integration
    let isTournamentMode = false;
    let tournamentPlayer1 = null;
    let tournamentPlayer2 = null;
    
    // IMPORTANT: Exposer la fonction pour le tournoi de manière globale
    window.startTournamentGame = function(player1Name, player2Name) {
        console.log("[Game] startTournamentGame appelé:", player1Name, "vs", player2Name);
    
        if (!initCanvas()) {
            console.error("[Game] Impossible d'initialiser le canvas. Match annulé.");
            return false;
        }
    
        // Continue normalement après
        isTournamentMode = true;
        tournamentPlayer1 = player1Name;
        tournamentPlayer2 = player2Name;
        gameRunning = true;
    
        resetGame();
        displayTournamentPlayerNames();
        gameLoop();
    
        return true;
    };
    
    
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
            if (!ctx) return;
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
            if (!ctx) return;
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
            if (hitSound) {
                hitSound.currentTime = 0; // Reset sound to start
                hitSound.playbackRate = 1; // Set playback speed
                hitSound.play().catch(error => {
                    console.error("Error attempting to play", error);
                });
            }
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
    
    // Tournament integration functions
    document.addEventListener('start-tournament-match', function(e) {
        console.log("Événement de tournoi reçu", e.detail);
        
        // S'assurer que le canvas est correctement initialisé
        if (!initCanvas()) {
            console.error("Impossible d'initialiser le canvas pour le tournoi");
            return;
        }
        
        console.log("Canvas trouvé et initialisé:", canvas);
        console.log("Game container trouvé?", document.getElementById('game-container'));
        
        isTournamentMode = true;
        tournamentPlayer1 = e.detail.player1;
        tournamentPlayer2 = e.detail.player2;
        
        // Réinitialiser explicitement le jeu
        gameRunning = true;
        resetGame();
        
        // Display player names
        displayTournamentPlayerNames();
        
        // Forcer l'affichage immédiat
        drawCanvas();
        
        // Start the tournament game avec un petit délai pour être sûr
        setTimeout(() => {
            if (canvas && ctx) {
                console.log("Démarrage du jeu de tournoi...");
                gameLoop();
            } else {
                console.error("Canvas ou contexte manquant pour le jeu de tournoi");
            }
        }, 100);
    });
    
    function displayTournamentPlayerNames() {
        // Remove any existing displays
        document.querySelectorAll('.tournament-player-name').forEach(el => el.remove());
        
        const player1Display = document.createElement('div');
        player1Display.className = 'tournament-player-name';
        player1Display.textContent = tournamentPlayer1;
        player1Display.style.position = 'absolute';
        player1Display.style.left = '50px';
        player1Display.style.top = '20px';
        player1Display.style.color = 'white';
        player1Display.style.fontSize = '20px';
        player1Display.style.fontWeight = 'bold';
        player1Display.style.zIndex = '10000';
        
        const player2Display = document.createElement('div');
        player2Display.className = 'tournament-player-name';
        player2Display.textContent = tournamentPlayer2;
        player2Display.style.position = 'absolute';
        player2Display.style.right = '50px';
        player2Display.style.top = '20px';
        player2Display.style.color = 'white';
        player2Display.style.fontSize = '20px';
        player2Display.style.fontWeight = 'bold';
        player2Display.style.zIndex = '10000';
        
        // Add to game container instead of canvas
        const gameContainer = document.getElementById('game-container');
        if (gameContainer) {
            gameContainer.appendChild(player1Display);
            gameContainer.appendChild(player2Display);
        } else if (canvas && canvas.parentElement) {
            canvas.parentElement.appendChild(player1Display);
            canvas.parentElement.appendChild(player2Display);
        }
    }
    
    // FUNCTIONS
    function setupEventListeners() {
        // Set up event listeners for controls
        const muteButton = document.getElementById('muteButton');
        
        // Vérifier si le bouton existe avant d'ajouter l'écouteur d'événements
        if (muteButton) {
            muteButton.addEventListener('click', (event) => {
                toggleMute();
            });
        }
        
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
                // Si nous sommes en mode tournoi, retourner au tournoi
                if (isTournamentMode) {
                    const gameCompletedEvent = new CustomEvent('game-completed', {
                        detail: {
                            player1Score: playerL.score,
                            player2Score: playerR.score
                        }
                    });
                    // Envoyer l'événement à la fois à window et document pour être sûr
                    window.dispatchEvent(gameCompletedEvent);
                    document.dispatchEvent(gameCompletedEvent);
                    
                    console.log("[Game] Événement game-completed envoyé avec les scores:", playerL.score, "-", playerR.score);
                    
                    isTournamentMode = false;
                    tournamentPlayer1 = null;
                    tournamentPlayer2 = null;
                    
                    document.querySelectorAll('.tournament-player-name').forEach(el => el.remove());
                } else {
                    resetGame();
                    pregameLoop();
                }
            }
        });
        document.addEventListener('keyup', (event) => {
            keysPressed[event.code] = false;
        });
    }
    
    function toggleMute() {
        // Toggle mute status
        isMuted = !isMuted;
        
        // Sécuriser l'accès aux éléments audio
        const hitSoundL = document.getElementById('hitSoundL');
        const hitSoundR = document.getElementById('hitSoundR');
        const muteButton = document.getElementById('muteButton');
        
        if (hitSoundL) hitSoundL.muted = isMuted;
        if (hitSoundR) hitSoundR.muted = isMuted;
        
        if (muteButton) {
            muteButton.textContent = isMuted ? "volume_mute" : "volume_off";
        }
    }
    
    function drawScores() {
        // Draw player scores
        if (!ctx) return;
        ctx.fillStyle = WHITE;
        ctx.font = `${FONT_SIZE_M}px 'Pixelify Sans', sans-serif`;
        ctx.fillText(playerL.score, WIN_W / 4, WIN_H / 2);
        ctx.fillText(playerR.score, WIN_W / 4 * 3, WIN_H / 2);
    }
    
    function drawDottedLine() {
        // Draw a dotted line in the middle of the screen
        if (!ctx) return;
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
        // S'assurer que le canvas est initialisé
        if (!initCanvas()) return;
        
        // Show the pre-game screen
        ctx.fillStyle = GREY;
        ctx.fillRect(0, 0, WIN_W, WIN_H);
        ctx.fillStyle = WHITE;
        ctx.font = `${FONT_SIZE_M}px 'Pixelify Sans', sans-serif`;
        const text = "Press space bar to start!";
        const textWidth = ctx.measureText(text).width;
        ctx.fillText(text, (WIN_W - textWidth) / 2, WIN_H / 2);
    
        // Si en mode tournoi, ne pas boucler
        if (!isTournamentMode) {
            requestAnimationFrame(pregameLoop);
        }
    }
    
    function drawCanvas() {
        // S'assurer que le canvas est initialisé
        if (!initCanvas()) return;
        
        // Draw the game canvas
        ctx.fillStyle = GREY;
        ctx.fillRect(0, 0, WIN_W, WIN_H);
        // Draw the scores
        drawScores();
        // Draw the central line
        drawDottedLine();
        // Draw the players and ball
        if (playerL) playerL.draw();
        if (playerR) playerR.draw();
        if (ball) ball.draw();
    }
    
    function resetGame() {
        // S'assurer que le canvas est initialisé
        initCanvas();
        
        // Reset the game state
        gameRunning = false;
    
        playerL = new Player(50, WIN_H / 2 - 175 / 2, 'orange', 'KeyA', 'KeyD');
        playerR = new Player(WIN_W - 50 - 30, WIN_H / 2 - 175 / 2, 'red', 'ArrowLeft', 'ArrowRight');
        ball    = new Ball(WIN_W / 2, WIN_H / 2, 'blue');
        
        // Redisplay player names if in tournament mode
        if (isTournamentMode) {
            displayTournamentPlayerNames();
        }
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
    
    // Game loop
    function gameLoop() {
        // S'assurer que le canvas est initialisé
        if (!initCanvas()) {
            console.error("Canvas non trouvé dans gameLoop");
            return;
        }
        
        // Ensure FPS <= 60
        let msNow = window.performance.now();
        let msPassed = msNow - msPrev;
    
        gameRunning = true;
    
        function updateGame() {
            if (!gameRunning) return;
            
            if (!canvas || !ctx) {
                console.error("Canvas ou contexte perdu dans updateGame");
                return;
            }
            
            if (msPassed < msPerFrame) {
                requestAnimationFrame(updateGame);
                return;
            }
    
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
                if (isTournamentMode) {
                    console.log("Match de tournoi terminé:", playerL.score, "-", playerR.score);
                    
                    // Report scores back to tournament system - envoyer à window ET document
                    const gameCompletedEvent = new CustomEvent('game-completed', {
                        detail: {
                            player1Score: playerL.score,
                            player2Score: playerR.score
                        }
                    });
                    window.dispatchEvent(gameCompletedEvent);
                    document.dispatchEvent(gameCompletedEvent);
                    
                    console.log("[Game] Événement game-completed envoyé avec les scores:", playerL.score, "-", playerR.score);
                    
                    // Reset tournament mode
                    isTournamentMode = false;
                    tournamentPlayer1 = null;
                    tournamentPlayer2 = null;
                    
                    // Clean up player name displays
                    document.querySelectorAll('.tournament-player-name').forEach(el => el.remove());
                }
                
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
        
        // Démarrage explicite
        requestAnimationFrame(updateGame);
    }
    
    // Initialize the game
    resetGame();
    setupEventListeners();
    
    // Only start pregame loop if not in tournament mode
    if (!isTournamentMode) {
        pregameLoop();
    }
})(); // Notez le changement ici: utilisez une fonction anonyme standard au lieu d'une fonction fléchée
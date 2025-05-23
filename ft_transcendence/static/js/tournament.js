document.addEventListener('DOMContentLoaded', function() {
    // Initialisation normale
    initTournament();
});

function initTournament(restoredState = null, player1Score = 0, player2Score = 0) {
    console.log("[Tournament] Initialisation du tournoi");
    const savedState = localStorage.getItem('tournamentState');
    if (savedState && !restoredState) {
        try {
            restoredState = JSON.parse(savedState);
            console.log("[Tournament] État restauré depuis le stockage local");
        } catch (e) {
            console.error("[Tournament] Erreur lors de la restauration de l'état:", e);
        }
    }
    // DOM Elements
    const tournamentStatusText = document.getElementById('tournament-status-text');
    const playerCount = document.getElementById('player-count');
    const playersList = document.getElementById('players-list');
    const joinTournamentBtn = document.getElementById('join-tournament-btn');
    const leaveTournamentBtn = document.getElementById('leave-tournament-btn');
    const readyBtn = document.getElementById('ready-btn');
    const tournamentContainer = document.querySelector('.tournament-container');
    const gameContainer = document.getElementById('tournament-game-container');
    const gameFrame = document.getElementById('tournament-game-frame');
    const closeGameBtn = document.getElementById('close-game-btn');
    
    // Create tournament results section if it doesn't exist
    let tournamentResults = document.querySelector('.tournament-results');
    if (!tournamentResults) {
        tournamentResults = document.createElement('div');
        tournamentResults.className = 'tournament-results card';
        tournamentResults.style.display = 'none';
        tournamentResults.innerHTML = `
            <h4>Tournament Results</h4>
            <div class="tournament-podium">
                <div class="podium-position">
                    <span class="position-label">1st Place:</span>
                    <span id="first-place" class="position-name">-</span>
                </div>
                <div class="podium-position">
                    <span class="position-label">2nd Place:</span>
                    <span id="second-place" class="position-name">-</span>
                </div>
                <div class="podium-position">
                    <span class="position-label">3rd Place:</span>
                    <span id="third-place" class="position-name">-</span>
                </div>
                <div class="podium-position">
                    <span class="position-label">4th Place:</span>
                    <span id="fourth-place" class="position-name">-</span>
                </div>
            </div>
            <button id="new-tournament-btn" class="glow-on-hover">
                ${gettext("New Tournament")}
                <span class="material-symbols-outlined">refresh</span>
            </button>
        `;
        tournamentContainer.appendChild(tournamentResults);
    }
    
    // Create tournament bracket elements if they don't exist
    const bracketContent = document.querySelector('.bracket-content');
    if (bracketContent) {
        bracketContent.innerHTML = `
            <h4>${gettext("Tournament Bracket")}</h4>
            <div class="bracket-container">
                <div class="bracket-row semifinals">
                    <div id="match-a" class="match-container">
                        <div class="match-player">
                            <span class="player-name">Waiting...</span>
                            <span class="player-score">0</span>
                        </div>
                        <div class="match-vs">VS</div>
                        <div class="match-player">
                            <span class="player-name">Waiting...</span>
                            <span class="player-score">0</span>
                        </div>
                    </div>
                    <div id="match-b" class="match-container">
                        <div class="match-player">
                            <span class="player-name">Waiting...</span>
                            <span class="player-score">0</span>
                        </div>
                        <div class="match-vs">VS</div>
                        <div class="match-player">
                            <span class="player-name">Waiting...</span>
                            <span class="player-score">0</span>
                        </div>
                    </div>
                </div>
                <div class="bracket-row finals">
                    <div id="match-final" class="match-container">
                        <div class="match-player">
                            <span class="player-name">Waiting...</span>
                            <span class="player-score">0</span>
                        </div>
                        <div class="match-vs">VS</div>
                        <div class="match-player">
                            <span class="player-name">Waiting...</span>
                            <span class="player-score">0</span>
                        </div>
                    </div>
                </div>
                <div class="bracket-row third-place">
                    <div id="match-losers" class="match-container">
                        <div class="match-player">
                            <span class="player-name">Waiting...</span>
                            <span class="player-score">0</span>
                        </div>
                        <div class="match-vs">VS</div>
                        <div class="match-player">
                            <span class="player-name">Waiting...</span>
                            <span class="player-score">0</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // Reference bracket elements
    const matchA = document.getElementById('match-a');
    const matchB = document.getElementById('match-b');
    const matchLosers = document.getElementById('match-losers');
    const matchFinal = document.getElementById('match-final');
    const newTournamentBtn = document.getElementById('new-tournament-btn');
    
    // Tournament state
    let tournamentState = restoredState || {
        localMode: true,
        players: [],
        matchA: { player1: null, player2: null, winner: null, loser: null, score: [0, 0] },
        matchB: { player1: null, player2: null, winner: null, loser: null, score: [0, 0] },
        matchLosers: { player1: null, player2: null, winner: null, loser: null, score: [0, 0] },
        matchFinal: { player1: null, player2: null, winner: null, loser: null, score: [0, 0] },
        status: 'setup',
        currentMatch: null
    };

    // Add local tournament setup
    const localSetupDiv = document.createElement('div');
    localSetupDiv.className = 'tournament-local-setup card';
    localSetupDiv.innerHTML = `
        <h4>${gettext("Local Tournament Setup")}</h4>
        <div class="local-players-form">
            <div class="player-input">
                <label>Player 1:</label>
                <input type="text" class="local-player-name" placeholder="Player 1" maxlength="12">
            </div>
            <div class="player-input">
                <label>Player 2:</label>
                <input type="text" class="local-player-name" placeholder="Player 2" maxlength="12">
            </div>
            <div class="player-input">
                <label>Player 3:</label>
                <input type="text" class="local-player-name" placeholder="Player 3" maxlength="12">
            </div>
            <div class="player-input">
                <label>Player 4:</label>
                <input type="text" class="local-player-name" placeholder="Player 4" maxlength="12">
            </div>
            <button id="start-local-tournament" class="glow-on-hover">
                ${gettext("Start Local Tournament")}
                <span class="material-symbols-outlined">sports_esports</span>
            </button>
        </div>
    `;
    
    // Insert at the top of tournament container
    if (tournamentContainer.firstChild) {
        tournamentContainer.insertBefore(localSetupDiv, tournamentContainer.firstChild);
    } else {
        tournamentContainer.appendChild(localSetupDiv);
    }
    
    // Reference to local tournament button
    const startLocalTournamentBtn = document.getElementById('start-local-tournament');
    
    // Hide online tournament controls for local mode
    const statusContainer = document.querySelector('.tournament-status-container');
    if (statusContainer) {
        statusContainer.style.display = 'none';
    }
    
    // Add CSS styles
    const styleElement = document.createElement('style');
    styleElement.textContent = `
        .tournament-local-setup {
            margin-bottom: 20px;
            padding: 20px;
        }
        
        .local-players-form {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-top: 20px;
        }
        
        .player-input {
            display: flex;
            flex-direction: column;
        }
        
        .player-input label {
            margin-bottom: 5px;
        }
        
        .match-announcement-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.85);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        }
        
        .match-announcement {
            width: 400px;
            padding: 20px;
        }
        
        .match-players {
            display: flex;
            justify-content: space-around;
            align-items: center;
            margin: 20px 0;
        }
        
        .match-player {
            font-size: 18px;
            font-weight: bold;
        }
        
        .match-vs {
            color: #ff5722;
            font-weight: bold;
            font-size: 24px;
        }
        
        .controls-reminder {
            margin: 20px 0;
            color: #aaa;
            font-style: italic;
        }
        
        .tournament-podium {
            margin: 20px 0;
        }
        
        .podium-position {
            background: #333;
            margin: 10px 0;
            padding: 10px;
            border-radius: 4px;
        }
        
        .position-label {
            font-weight: bold;
            margin-right: 10px;
        }
        
        .bracket-row {
            display: flex;
            justify-content: space-around;
            margin: 20px 0;
        }
        
        .match-container {
            border: 1px solid #444;
            padding: 15px;
            border-radius: 4px;
            background: #333;
            min-width: 250px;
            position: relative;
        }
        
        .match-container.completed {
            border-color: #4CAF50;
        }
        
        .match-player {
            display: flex;
            justify-content: space-between;
            padding: 5px 0;
        }
        
        .match-player.winner {
            color: #4CAF50;
            font-weight: bold;
        }
        
        .player-score {
            font-weight: bold;
            margin-left: 10px;
        }
        
        .begin-match-btn {
            display: block;
            width: 100%;
            margin-top: 10px;
            padding: 8px;
            background: #8e44ad;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
        }
        
        .begin-match-btn:hover {
            background: #9b59b6;
        }
    `;
    document.head.appendChild(styleElement);
    
    // ----------------------------------------------------
    // Tournament Functions
    // ----------------------------------------------------
    
    // Traiter les résultats de match éventuels
    if (restoredState && player1Score && player2Score) {
        processMatchResults(player1Score, player2Score);
    }
    
    // Configurer les écouteurs d'événements pour l'iframe
    configureGameListeners();
    
    // Start local tournament
    function startLocalTournament() {
        const playerInputs = document.querySelectorAll('.local-player-name');
        const playerNames = Array.from(playerInputs).map(input => input.value.trim() || input.placeholder);
    
        
        // Set up tournament with local players
        tournamentState.players = playerNames.map((name, index) => ({
            id: index + 1,
            name: name,
            ready: true
        }));
        
        // Set up initial matches
        tournamentState.matchA.player1 = tournamentState.players[0];
        tournamentState.matchA.player2 = tournamentState.players[1];
        tournamentState.matchB.player1 = tournamentState.players[2];
        tournamentState.matchB.player2 = tournamentState.players[3];
        
        // Update player count
        if (playerCount) {
            playerCount.textContent = '4';
        }
        
        // Hide setup, show bracket
        localSetupDiv.style.display = 'none';
        
        // Update status
        if (tournamentStatusText) {
            tournamentStatusText.textContent = gettext('Tournament starting...');
        }
        
        // Update UI
        updateBracket();
        
        // Add Begin Match buttons to each match if they don't exist
        addBeginMatchButtons();
        
        // Start first match
        tournamentState.status = 'matchA';
        startMatch('matchA');
    }
    
    // Add Begin Match buttons to match containers
    function addBeginMatchButtons() {
        const containers = document.querySelectorAll('.match-container');
        
        containers.forEach(container => {
            // Check if button already exists
            if (!container.querySelector('.begin-match-btn')) {
                const button = document.createElement('button');
                button.textContent = 'Begin Match';
                button.className = 'begin-match-btn glow-on-hover';
                
                // Add click event
                button.addEventListener('click', function() {
                    const matchId = container.id;
                    let match;
                    
                    switch (matchId) {
                        case 'match-a':
                            tournamentState.currentMatch = 'matchA';
                            match = tournamentState.matchA;
                            break;
                        case 'match-b':
                            tournamentState.currentMatch = 'matchB';
                            match = tournamentState.matchB;
                            break;
                        case 'match-losers':
                            // Vérifier si les perdants sont définis
                            if (!tournamentState.matchLosers.player1 || !tournamentState.matchLosers.player2) {
                                tournamentState.matchLosers.player1 = tournamentState.matchA.loser || {name: "Loser 1"};
                                tournamentState.matchLosers.player2 = tournamentState.matchB.loser || {name: "Loser 2"};
                            }
                            tournamentState.currentMatch = 'matchLosers';
                            match = tournamentState.matchLosers;
                            break;
                        case 'match-final':
                            // Vérifier si les gagnants sont définis
                            if (!tournamentState.matchFinal.player1 || !tournamentState.matchFinal.player2) {
                                tournamentState.matchFinal.player1 = tournamentState.matchA.winner || {name: "Winner 1"};
                                tournamentState.matchFinal.player2 = tournamentState.matchB.winner || {name: "Winner 2"};
                            }
                            tournamentState.currentMatch = 'matchFinal';
                            match = tournamentState.matchFinal;
                            break;
                    }
                    
                    // Lancer le jeu avec les joueurs définitifs
                    if (match && match.player1 && match.player2) {
                        launchLocalGame(match.player1.name, match.player2.name);
                    } else {
                        console.error("[Tournament] Match ou joueurs non définis");
                    }
                });
                
                container.appendChild(button);
            }
        });
    }
    
    // Update bracket display with current match data
    function updateBracket() {
        // Update each match if the elements exist
        if (matchA && tournamentState.matchA.player1 && tournamentState.matchA.player2) {
            updateMatchDisplay(matchA, tournamentState.matchA);
        }
        
        if (matchB && tournamentState.matchB.player1 && tournamentState.matchB.player2) {
            updateMatchDisplay(matchB, tournamentState.matchB);
        }
        
        if (matchLosers && tournamentState.matchLosers.player1 && tournamentState.matchLosers.player2) {
            updateMatchDisplay(matchLosers, tournamentState.matchLosers);
        }
        
        if (matchFinal && tournamentState.matchFinal.player1 && tournamentState.matchFinal.player2) {
            updateMatchDisplay(matchFinal, tournamentState.matchFinal);
        }
    }
    
    // Update individual match display
    function updateMatchDisplay(matchElement, matchData) {
        if (!matchElement) return;
        
        const playerElements = matchElement.querySelectorAll('.match-player');
        const nameElements = matchElement.querySelectorAll('.player-name');
        const scoreElements = matchElement.querySelectorAll('.player-score');
        
        if (nameElements.length >= 2) {
            nameElements[0].textContent = matchData.player1.name;
            nameElements[1].textContent = matchData.player2.name;
        }
        
        if (scoreElements.length >= 2) {
            scoreElements[0].textContent = matchData.score[0];
            scoreElements[1].textContent = matchData.score[1];
        }
        
        // Highlight winner if match is completed
        if (matchData.winner) {
            playerElements.forEach(element => element.classList.remove('winner'));
            
            if (matchData.winner === matchData.player1) {
                playerElements[0].classList.add('winner');
            } else {
                playerElements[1].classList.add('winner');
            }
            
            matchElement.classList.add('completed');
        }
    }
    
    // Start a specific match
    function startMatch(matchType) {
        let match;
        let statusText = '';
        
        switch (matchType) {
            case 'matchA':
                match = tournamentState.matchA;
                statusText = `Semi-final 1: ${match.player1.name} vs ${match.player2.name}`;
                break;
            case 'matchB':
                match = tournamentState.matchB;
                statusText = `Semi-final 2: ${match.player1.name} vs ${match.player2.name}`;
                break;
            case 'matchLosers':
                match = tournamentState.matchLosers;
                statusText = `3rd Place Match: ${match.player1.name} vs ${match.player2.name}`;
                break;
            case 'matchFinal':
                match = tournamentState.matchFinal;
                statusText = `Final: ${match.player1.name} vs ${match.player2.name}`;
                break;
        }
        
        tournamentState.currentMatch = matchType;
        
        // Update status text
        if (tournamentStatusText) {
            tournamentStatusText.textContent = statusText;
        }
        
        // Show announcement and launch game
        showMatchAnnouncement(match.player1.name, match.player2.name, () => {
            launchLocalGame(match.player1.name, match.player2.name);
        });
    }
    
    // Show match announcement overlay
    function showMatchAnnouncement(player1, player2, callback) {
        // Créer l'élément overlay
        const overlay = document.createElement('div');
        overlay.className = 'match-announcement-overlay';
        
        overlay.innerHTML = `
            <div class="match-announcement card">
                <h4>Next Match</h4>
                <div class="match-players">
                    <div class="match-player">
                        <span class="player-name">${player1}</span>
                    </div>
                    <div class="match-vs">VS</div>
                    <div class="match-player">
                        <span class="player-name">${player2}</span>
                    </div>
                </div>
                <p class="controls-reminder">
                    Player 1 (${player1}): A/D to move<br>
                    Player 2 (${player2}): Left/Right Arrow to move
                </p>
                <button class="glow-on-hover" id="begin-match-btn">
                    Begin Match
                    <span class="material-symbols-outlined">play_arrow</span>
                </button>
            </div>
        `;
        document.body.appendChild(overlay);
        
        document.getElementById('begin-match-btn').addEventListener('click', function() {
            overlay.remove();
            if (callback) callback();
        });
    }
    
    // Configure game event listeners for iframe communication
    function configureGameListeners() {
        // Close game button handler
        if (closeGameBtn) {
            closeGameBtn.addEventListener('click', function() {
                // Hide the game container
                if (gameContainer) gameContainer.style.display = 'none';
                
                // Try to get scores from iframe
                try {
                    if (gameFrame && gameFrame.contentWindow && gameFrame.contentWindow.getGameScores) {
                        const scores = gameFrame.contentWindow.getGameScores();
                        if (scores) {
                            console.log("[Tournament] Scores récupérés du jeu:", scores.player1Score, scores.player2Score);
                            processMatchResults(scores.player1Score, scores.player2Score);
                        }
                    }
                } catch (e) {
                    console.error("[Tournament] Erreur lors de la récupération des scores:", e);
                }
                
                // Reset iframe source
                if (gameFrame) gameFrame.src = 'about:blank';
            });
        }
        
        // Listen for iframe messages
        window.addEventListener('message', function(event) {
            if (event.data && event.data.type === 'tournament_match_completed') {
                console.log("[Tournament] Message reçu du jeu:", event.data);
                
                // Hide game container
                if (gameContainer) gameContainer.style.display = 'none';
                
                // Process match results
                processMatchResults(event.data.player1Score, event.data.player2Score);
                
                // Reset iframe
                if (gameFrame) gameFrame.src = 'about:blank';
            }
        });
    }

    function resetGameContainer() {
        console.log("[Tournament] Réinitialisation du conteneur de jeu");
    
        if (gameContainer) {
            gameContainer.innerHTML = ''; // Supprime tout le contenu précédent
            gameContainer.style.display = 'none'; // Masque le conteneur
            gameContainer.classList.remove('active'); // Supprime la classe active
        }
    
        if (gameFrame) {
            gameFrame.src = 'about:blank'; // Réinitialise l'iframe
        }
    }
    
    // Launch the local game in iframe
    function launchLocalGame(player1Name, player2Name) {
        console.log("[Tournament] Lancement du jeu:", player1Name, "vs", player2Name);
        
        // Update iframe header information
        document.getElementById('iframe-match-type').textContent = 
            tournamentState.currentMatch.replace('match', 'Match');
        document.getElementById('iframe-player1-name').textContent = player1Name;
        document.getElementById('iframe-player2-name').textContent = player2Name;
        
        // Prepare iframe URL
        const gameUrl = `/tournament_game/?player1=${encodeURIComponent(player1Name)}&player2=${encodeURIComponent(player2Name)}&match=${encodeURIComponent(tournamentState.currentMatch)}`;
        
        // Load iframe
        if (gameFrame) {
            gameFrame.src = gameUrl;
        }
        
        // Show game container
        if (gameContainer) {
            gameContainer.style.display = 'block';
        }
        
        
    }
    window.addEventListener('message', function(event) {
        if (event.data && event.data.type === 'tournament_match_completed') {
            console.log("[Tournament] Match terminé, scores:", event.data);
            
            // Hide game container
            if (gameContainer) gameContainer.style.display = 'none';
            
            // Process match results
            processMatchResults(event.data.player1Score, event.data.player2Score);
            
            // Reset iframe
            if (gameFrame) gameFrame.src = 'about:blank';
        }
        // Ajoutez cette condition pour gérer le retour sans terminer le match
        else if (event.data && event.data.type === 'tournament_return_only') {
            console.log("[Tournament] Retour au tournoi sans terminer le match");
            
            // Hide game container without processing results
            if (gameContainer) gameContainer.style.display = 'none';
            
            // Optionally reset iframe
            if (gameFrame) gameFrame.src = 'about:blank';
        }
    });
    
    // Process match results
    function processMatchResults(player1Score, player2Score) {
        console.log("[Tournament] Traitement des résultats:", player1Score, "-", player2Score);
        
        let match;
        
        switch (tournamentState.currentMatch) {
            case 'matchA':
                match = tournamentState.matchA;
                break;
            case 'matchB':
                match = tournamentState.matchB;
                break;
            case 'matchLosers':
                match = tournamentState.matchLosers;
                break;
            case 'matchFinal':
                match = tournamentState.matchFinal;
                break;
            default:
                console.error("[Tournament] Match inconnu:", tournamentState.currentMatch);
                return;
        }
        
        // Vérifier que les joueurs sont définis
        if (!match.player1 || !match.player2) {
            console.error("[Tournament] Joueurs non définis pour ce match");
            return;
        }
        
        // Update scores
        match.score = [player1Score, player2Score];
        
        // Determine winner and loser
        if (player1Score > player2Score) {
            match.winner = match.player1;
            match.loser = match.player2;
        } else {
            match.winner = match.player2;
            match.loser = match.player1;
        }
        
        console.log(`[Tournament] Vainqueur: ${match.winner.name}, Perdant: ${match.loser.name}`);
        
        // Sauvegarder l'état du tournoi dans le stockage local pour persistance
        localStorage.setItem('tournamentState', JSON.stringify(tournamentState));
        
        // Update bracket display
        updateBracket();
        
        // Continue to next match if appropriate
        if (tournamentState.status !== 'completed') {
            continueTournament();
        }
    }
    
    // Continue tournament after match completion
    function continueTournament() {
        console.log("[Tournament] Progression du tournoi, match actuel:", tournamentState.currentMatch);
        
        switch (tournamentState.currentMatch) {
            case 'matchA':
                tournamentState.status = 'matchB';
                startMatch('matchB');
                break;
                
            case 'matchB':
                // Set up losers match
                tournamentState.matchLosers.player1 = tournamentState.matchA.loser;
                tournamentState.matchLosers.player2 = tournamentState.matchB.loser;
                tournamentState.status = 'matchLosers';
                startMatch('matchLosers');
                break;
                
            case 'matchLosers':
                // Set up final match
                tournamentState.matchFinal.player1 = tournamentState.matchA.winner;
                tournamentState.matchFinal.player2 = tournamentState.matchB.winner;
                tournamentState.status = 'matchFinal';
                startMatch('matchFinal');
                break;
                
            case 'matchFinal':
                tournamentState.status = 'completed';
                showTournamentResults();
                break;
        }
    }
    
    
    // Show tournament results
    function showTournamentResults() {
        console.log("[Tournament] Affichage des résultats finaux");
        
        // Make sure elements exist
        const firstPlace = document.getElementById('first-place');
        const secondPlace = document.getElementById('second-place');
        const thirdPlace = document.getElementById('third-place');
        const fourthPlace = document.getElementById('fourth-place');
        
        // Vérifier que les gagnants et perdants sont définis
        const winner1 = tournamentState.matchFinal.winner ? tournamentState.matchFinal.winner.name : "À déterminer";
        const loser1 = tournamentState.matchFinal.loser ? tournamentState.matchFinal.loser.name : "À déterminer";
        const winner3 = tournamentState.matchLosers.winner ? tournamentState.matchLosers.winner.name : "À déterminer";
        const loser3 = tournamentState.matchLosers.loser ? tournamentState.matchLosers.loser.name : "À déterminer";
        
        console.log("1er :", winner1);
        console.log("2e :", loser1);
        console.log("3e :", winner3);
        console.log("4e :", loser3);
        
        if (firstPlace) firstPlace.textContent = winner1;
        if (secondPlace) secondPlace.textContent = loser1;
        if (thirdPlace) thirdPlace.textContent = winner3;
        if (fourthPlace) fourthPlace.textContent = loser3;
        
        // Show results section
        if (tournamentResults) {
            tournamentResults.style.display = 'block';
        }
        
        // Update status text
        if (tournamentStatusText) {
            tournamentStatusText.textContent = 'Tournament Completed';
        }
        
        tournamentState.status = 'completed';
    }
    
    // Reset tournament
    function resetTournament() {
        console.log("[Tournament] Réinitialisation du tournoi");
        
        // Reset tournament state
        tournamentState = {
            localMode: true,
            players: [],
            matchA: { player1: null, player2: null, winner: null, loser: null, score: [0, 0] },
            matchB: { player1: null, player2: null, winner: null, loser: null, score: [0, 0] },
            matchLosers: { player1: null, player2: null, winner: null, loser: null, score: [0, 0] },
            matchFinal: { player1: null, player2: null, winner: null, loser: null, score: [0, 0] },
            status: 'setup',
            currentMatch: null
        };
        
        // Reset UI
        document.querySelectorAll('.match-container').forEach(match => {
            match.classList.remove('completed');
            const playerElements = match.querySelectorAll('.match-player');
            playerElements.forEach(elem => elem.classList.remove('winner'));
        });
        
        // Reset match displays
        document.querySelectorAll('.player-name').forEach(elem => {
            if (!elem.closest('.match-announcement-overlay')) {
                elem.textContent = 'Waiting...';
            }
        });
        
        document.querySelectorAll('.player-score').forEach(elem => {
            elem.textContent = '0';
        });
        
        // Clear player inputs
        document.querySelectorAll('.local-player-name').forEach(input => {
            input.value = '';
        });
        
        // Show setup, hide results
        localSetupDiv.style.display = 'none';
        if (tournamentResults) {
            tournamentResults.style.display = 'none';
        }
        
        // Reset status
        if (tournamentStatusText) {
            tournamentStatusText.textContent = 'Waiting for players...';
        }
        
        // Reset player count
        if (playerCount) {
            playerCount.textContent = '0';
        }
    }
    
    // Start local tournament button
    if (startLocalTournamentBtn) {
        startLocalTournamentBtn.addEventListener('click', startLocalTournament);
    }
    
    // New tournament button
    if (newTournamentBtn) {
        newTournamentBtn.addEventListener('click', resetTournament);
    }
}
document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const tournamentStatusText = document.getElementById('tournament-status-text');
    const playerCount = document.getElementById('player-count');
    const playersList = document.getElementById('players-list');
    const joinTournamentBtn = document.getElementById('join-tournament-btn');
    const leaveTournamentBtn = document.getElementById('leave-tournament-btn');
    const readyBtn = document.getElementById('ready-btn');
    const tournamentContainer = document.querySelector('.tournament-container');
    
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
                New Tournament
                <span class="material-symbols-outlined">refresh</span>
            </button>
        `;
        tournamentContainer.appendChild(tournamentResults);
    }
    
    // Create tournament bracket elements if they don't exist
    const bracketContent = document.querySelector('.bracket-content');
    if (bracketContent) {
        bracketContent.innerHTML = `
            <h4>Tournament Bracket</h4>
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
    let tournamentState = {
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
        <h4>Local Tournament Setup</h4>
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
                Start Local Tournament
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
    `;
    document.head.appendChild(styleElement);
    
    // ----------------------------------------------------
    // Tournament Functions
    // ----------------------------------------------------
    
    // Start local tournament
    function startLocalTournament() {
        const playerInputs = document.querySelectorAll('.local-player-name');
        const playerNames = Array.from(playerInputs).map(input => input.value.trim() || input.placeholder);
        
        // Validate player names
        if (new Set(playerNames).size !== 4) {
            alert('All player names must be unique');
            return;
        }
        
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
            tournamentStatusText.textContent = 'Tournament starting...';
        }
        
        // Update UI
        updateBracket();
        
        // Start first match
        tournamentState.status = 'matchA';
        startMatch('matchA');
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
    
    // Launch the local game
    function launchLocalGame(player1Name, player2Name) {
        console.log("Lancement du jeu:", player1Name, "vs", player2Name);
        
        // Hide tournament page
        const tournamentPage = document.getElementById('tournamentpage');
        if (tournamentPage) {
            tournamentPage.style.display = 'none';
        }
        
        // Show game container
        const gameContainer = document.getElementById('game-container');
        if (gameContainer) {
            // Forcer l'affichage avec style en ligne
            gameContainer.setAttribute('style', 'display: flex !important; position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 9999; background-color: black;');
            console.log("Game container affiché:", gameContainer);
        } else {
            console.error("Game container introuvable!");
        }
        
        // Créer l'événement avec un petit délai pour s'assurer que le DOM est prêt
        setTimeout(() => {
            const event = new CustomEvent('start-tournament-match', {
                detail: {
                    player1: player1Name,
                    player2: player2Name
                }
            });
            document.dispatchEvent(event);
        }, 100);
    }
    
    // Process match results
    function processMatchResults(player1Score, player2Score) {
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
        
        // Update bracket display
        updateBracket();
        
        // Continue to next match
        continueTournament();
    }
    
    // Continue tournament after match completion
    function continueTournament() {
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
        // Make sure elements exist
        const firstPlace = document.getElementById('first-place');
        const secondPlace = document.getElementById('second-place');
        const thirdPlace = document.getElementById('third-place');
        const fourthPlace = document.getElementById('fourth-place');
        
        if (firstPlace && tournamentState.matchFinal.winner) {
            firstPlace.textContent = tournamentState.matchFinal.winner.name;
        }
        
        if (secondPlace && tournamentState.matchFinal.loser) {
            secondPlace.textContent = tournamentState.matchFinal.loser.name;
        }
        
        if (thirdPlace && tournamentState.matchLosers.winner) {
            thirdPlace.textContent = tournamentState.matchLosers.winner.name;
        }
        
        if (fourthPlace && tournamentState.matchLosers.loser) {
            fourthPlace.textContent = tournamentState.matchLosers.loser.name;
        }
        
        // Show results section
        if (tournamentResults) {
            tournamentResults.style.display = 'block';
        }
        
        // Update status text
        if (tournamentStatusText) {
            tournamentStatusText.textContent = 'Tournament Completed';
        }
    }
    
    // Reset tournament
    function resetTournament() {
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
        localSetupDiv.style.display = 'block';
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
        
        // Show tournament page, hide game
        const tournamentPage = document.getElementById('tournamentpage');
        if (tournamentPage) {
            tournamentPage.style.display = 'block';
        }
        
        const gameContainer = document.getElementById('game-container');
        if (gameContainer) {
            gameContainer.style.display = 'none';
        }
    }
    
    // ----------------------------------------------------
    // Event Listeners
    // ----------------------------------------------------
    
    // Listen for game completion event from localgame.js
    window.addEventListener('game-completed', function(event) {
        const { player1Score, player2Score } = event.detail;
        
        // Show tournament page again
        const tournamentPage = document.getElementById('tournamentpage');
        if (tournamentPage) {
            tournamentPage.style.display = 'block';
        }
        
        // Hide game container
        const gameContainer = document.getElementById('game-container');
        if (gameContainer) {
            gameContainer.style.display = 'none';
        }
        
        // Process match results
        processMatchResults(player1Score, player2Score);
    });
    

    // Start local tournament button
    if (startLocalTournamentBtn) {
        startLocalTournamentBtn.addEventListener('click', startLocalTournament);
    }
    
    // New tournament button
    if (newTournamentBtn) {
        newTournamentBtn.addEventListener('click', resetTournament);
    }
});
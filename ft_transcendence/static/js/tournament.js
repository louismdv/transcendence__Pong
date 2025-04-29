document.addEventListener('DOMContentLoaded', function() {
    // Éléments du DOM
    const tournamentStatus = document.getElementById('tournament-status-text');
    const playerCount = document.getElementById('player-count');
    const playersList = document.getElementById('players-list');
    const joinTournamentBtn = document.getElementById('join-tournament-btn');
    const leaveTournamentBtn = document.getElementById('leave-tournament-btn');
    const readyBtn = document.getElementById('ready-btn');
    const tournamentResults = document.querySelector('.tournament-results');
    const newTournamentBtn = document.getElementById('new-tournament-btn');
    
    // État du tournoi
    let tournamentState = {
        players: [],
        currentPlayer: null,
        isPlayerReady: false,
        matchA: { player1: null, player2: null, winner: null, loser: null, score: [0, 0] },
        matchB: { player1: null, player2: null, winner: null, loser: null, score: [0, 0] },
        matchLosers: { player1: null, player2: null, winner: null, loser: null, score: [0, 0] },
        matchFinal: { player1: null, player2: null, winner: null, loser: null, score: [0, 0] },
        status: 'waiting', // waiting, matchA, matchB, matchLosers, matchFinal, completed
        results: []
    };
    
    // Fonction pour obtenir le token CSRF
    function getCsrfToken() {
        return document.querySelector('[name=csrfmiddlewaretoken]').value;
    }
    
    // Fonction pour mettre à jour l'affichage
    function updateUI() {
        // Mettre à jour le nombre de joueurs
        playerCount.textContent = tournamentState.players.length;
        
        // Mettre à jour la liste des joueurs
        updatePlayersList();
        
        // Mettre à jour le statut du tournoi
        updateTournamentStatus();
        
        // Mettre à jour les boutons
        updateButtons();
        
        // Mettre à jour le bracket
        updateBracket();
    }
    
    // Mettre à jour la liste des joueurs
    function updatePlayersList() {
        playersList.innerHTML = '';
        
        for (let i = 0; i < 4; i++) {
            const player = tournamentState.players[i] || null;
            const playerSlot = document.createElement('div');
            playerSlot.className = player ? 'player-slot' : 'player-slot empty';
            
            if (player) {
                const isCurrentPlayer = player.id === tournamentState.currentPlayer?.id;
                const isReady = player.ready;
                
                playerSlot.innerHTML = `
                    <span class="material-symbols-outlined">person</span>
                    <span class="player-name">${player.username} ${isCurrentPlayer ? '(You)' : ''}</span>
                    <span class="player-ready-indicator ${isReady ? 'ready' : 'not-ready'}" 
                          title="${isReady ? 'Ready' : 'Not Ready'}"></span>
                `;
            } else {
                playerSlot.innerHTML = `
                    <span class="material-symbols-outlined">person</span>
                    <span class="player-name">Waiting...</span>
                `;
            }
            
            playersList.appendChild(playerSlot);
        }
    }
    
    // Mettre à jour le statut du tournoi
    function updateTournamentStatus() {
        switch (tournamentState.status) {
            case 'waiting':
                tournamentStatus.textContent = 'Waiting for players...';
                break;
            case 'matchA':
                tournamentStatus.textContent = 'Match A in progress';
                break;
            case 'matchB':
                tournamentStatus.textContent = 'Match B in progress';
                break;
            case 'matchLosers':
                tournamentStatus.textContent = '3rd place match in progress';
                break;
            case 'matchFinal':
                tournamentStatus.textContent = 'Final match in progress';
                break;
            case 'completed':
                tournamentStatus.textContent = 'Tournament completed';
                break;
        }
    }
    
    // Mettre à jour les boutons
    function updateButtons() {
        const isPlayerInTournament = tournamentState.players.some(p => p.id === tournamentState.currentPlayer?.id);
        
        // Bouton rejoindre/quitter
        if (isPlayerInTournament) {
            joinTournamentBtn.style.display = 'none';
            leaveTournamentBtn.style.display = 'flex';
            
            // Bouton prêt (seulement si le tournoi n'a pas commencé)
            if (tournamentState.status === 'waiting') {
                readyBtn.style.display = 'flex';
                readyBtn.innerHTML = tournamentState.isPlayerReady ? 
                    'Not Ready <span class="material-symbols-outlined">cancel</span>' : 
                    'Ready <span class="material-symbols-outlined">check_circle</span>';
                readyBtn.classList.toggle('success', !tournamentState.isPlayerReady);
                readyBtn.classList.toggle('danger', tournamentState.isPlayerReady);
            } else {
                readyBtn.style.display = 'none';
            }
        } else {
            joinTournamentBtn.style.display = tournamentState.players.length < 4 ? 'flex' : 'none';
            leaveTournamentBtn.style.display = 'none';
            readyBtn.style.display = 'none';
        }
        
        // Afficher les résultats si le tournoi est terminé
        tournamentResults.style.display = tournamentState.status === 'completed' ? 'block' : 'none';
    }
    
    // Mettre à jour le bracket
    function updateBracket() {
        // Match A
        updateMatch('match-a', tournamentState.matchA);
        
        // Match B
        updateMatch('match-b', tournamentState.matchB);
        
        // Match des perdants
        updateMatch('match-losers', tournamentState.matchLosers);
        
        // Finale
        updateMatch('match-final', tournamentState.matchFinal);
        
        // Résultats
        if (tournamentState.status === 'completed') {
            document.getElementById('first-place').textContent = tournamentState.matchFinal.winner?.username || '-';
            document.getElementById('second-place').textContent = tournamentState.matchFinal.loser?.username || '-';
            document.getElementById('third-place').textContent = tournamentState.matchLosers.winner?.username || '-';
            document.getElementById('fourth-place').textContent = tournamentState.matchLosers.loser?.username || '-';
        }
    }
    
    // Mettre à jour un match
    function updateMatch(matchId, matchData) {
        const matchElement = document.getElementById(matchId);
        const players = matchElement.querySelectorAll('.match-player');
        const player1Element = players[0];
        const player2Element = players[1];
        
        // Noms des joueurs
        player1Element.querySelector('.player-name').textContent = matchData.player1?.username || 'Waiting...';
        player2Element.querySelector('.player-name').textContent = matchData.player2?.username || 'Waiting...';
        
        // Scores
        player1Element.querySelector('.player-score').textContent = matchData.score[0];
        player2Element.querySelector('.player-score').textContent = matchData.score[1];
        
        // Styles pour le gagnant/perdant
        player1Element.classList.remove('winner', 'loser');
        player2Element.classList.remove('winner', 'loser');
        
        if (matchData.winner && matchData.loser) {
            if (matchData.winner.id === matchData.player1?.id) {
                player1Element.classList.add('winner');
                player2Element.classList.add('loser');
            } else {
                player1Element.classList.add('loser');
                player2Element.classList.add('winner');
            }
        }
    }
    
    // Fonction pour rejoindre le tournoi
    async function joinTournament() {
        try {
            const response = await fetch('/tournament/join/', {
                method: 'POST',
                headers: {
                    'X-CSRFToken': getCsrfToken(),
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            
            if (data.status === 'success') {
                // Simuler l'ajout du joueur (à remplacer par les données réelles)
                tournamentState.currentPlayer = {
                    id: data.player_id || Math.random().toString(36).substr(2, 9),
                    username: data.username || 'Player ' + (tournamentState.players.length + 1),
                    ready: false
                };
                
                tournamentState.players.push(tournamentState.currentPlayer);
                tournamentState.isPlayerReady = false;
                
                updateUI();
                
                // Si 4 joueurs, démarrer automatiquement le tournoi
                if (tournamentState.players.length === 4 && tournamentState.players.every(p => p.ready)) {
                    startTournament();
                }
            } 
        } catch (error) {
            console.error('Error:', error);
        }
    }
    
    // Fonction pour quitter le tournoi
    async function leaveTournament() {
        try {
            const response = await fetch('/tournament/leave/', {
                method: 'POST',
                headers: {
                    'X-CSRFToken': getCsrfToken(),
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            
            if (data.status === 'success') {
                // Simuler le retrait du joueur (à remplacer par les données réelles)
                tournamentState.players = tournamentState.players.filter(p => p.id !== tournamentState.currentPlayer?.id);
                tournamentState.isPlayerReady = false;
                
                updateUI();
            } 
        } catch (error) {
            console.error('Error:', error);
        }
    }
    
    // Fonction pour indiquer que le joueur est prêt
    async function toggleReady() {
        try {
            const newReadyState = !tournamentState.isPlayerReady;
            
            const response = await fetch('/tournament/ready/', {
                method: 'POST',
                headers: {
                    'X-CSRFToken': getCsrfToken(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ ready: newReadyState })
            });
            
            const data = await response.json();
            
            if (data.status === 'success') {
                // Mettre à jour l'état du joueur
                tournamentState.isPlayerReady = newReadyState;
                
                // Mettre à jour l'état du joueur dans la liste
                const playerIndex = tournamentState.players.findIndex(p => p.id === tournamentState.currentPlayer?.id);
                if (playerIndex !== -1) {
                    tournamentState.players[playerIndex].ready = newReadyState;
                }
                
                updateUI();
                
                // Si 4 joueurs et tous prêts, démarrer le tournoi
                if (tournamentState.players.length === 4 && tournamentState.players.every(p => p.ready)) {
                    startTournament();
                }
            }
        } catch (error) {
            console.error('Error:', error);
        }
    }
    
    // Fonction pour démarrer le tournoi
    function startTournament() {
        // Configurer les matchs initiaux
        tournamentState.matchA.player1 = tournamentState.players[0];
        tournamentState.matchA.player2 = tournamentState.players[1];
        tournamentState.matchB.player1 = tournamentState.players[2];
        tournamentState.matchB.player2 = tournamentState.players[3];
        
        // Mettre à jour le statut
        tournamentState.status = 'matchA';
        
        // Simuler le match A (à remplacer par le vrai jeu)
        simulateMatch('matchA');
        
        updateUI();
    }
    
    // Fonction pour simuler un match (pour démonstration)
    function simulateMatch(matchType) {
        let match;
        let nextStatus;
        let delay = 2000; // 2 secondes
        
        switch (matchType) {
            case 'matchA':
                match = tournamentState.matchA;
                nextStatus = 'matchB';
                break;
            case 'matchB':
                match = tournamentState.matchB;
                nextStatus = 'matchLosers';
                break;
            case 'matchLosers':
                match = tournamentState.matchLosers;
                nextStatus = 'matchFinal';
                break;
            case 'matchFinal':
                match = tournamentState.matchFinal;
                nextStatus = 'completed';
                break;
        }
        
        // Simuler un score aléatoire
        const score1 = Math.floor(Math.random() * 10) + 1;
        const score2 = Math.floor(Math.random() * 10) + 1;
        
        // Déterminer le gagnant et le perdant
        if (score1 > score2) {
            match.winner = match.player1;
            match.loser = match.player2;
            match.score = [score1, score2];
        } else {
            match.winner = match.player2;
            match.loser = match.player1;
            match.score = [score1, score2];
        }
        
        // Mettre à jour l'UI
        updateUI();
        
        // Passer au match suivant
        setTimeout(() => {
            tournamentState.status = nextStatus;
            
            if (nextStatus === 'matchB') {
                simulateMatch('matchB');
            } else if (nextStatus === 'matchLosers') {
                // Configurer le match des perdants
                tournamentState.matchLosers.player1 = tournamentState.matchA.loser;
                tournamentState.matchLosers.player2 = tournamentState.matchB.loser;
                simulateMatch('matchLosers');
            } else if (nextStatus === 'matchFinal') {
                // Configurer la finale
                tournamentState.matchFinal.player1 = tournamentState.matchA.winner;
                tournamentState.matchFinal.player2 = tournamentState.matchB.winner;
                simulateMatch('matchFinal');
            } else if (nextStatus === 'completed') {
                // Tournoi terminé
                updateUI();
            }
        }, delay);
    }
    
    // Fonction pour démarrer un nouveau tournoi
    function resetTournament() {
        tournamentState = {
            players: [],
            currentPlayer: null,
            isPlayerReady: false,
            matchA: { player1: null, player2: null, winner: null, loser: null, score: [0, 0] },
            matchB: { player1: null, player2: null, winner: null, loser: null, score: [0, 0] },
            matchLosers: { player1: null, player2: null, winner: null, loser: null, score: [0, 0] },
            matchFinal: { player1: null, player2: null, winner: null, loser: null, score: [0, 0] },
            status: 'waiting',
            results: []
        };
        
        updateUI();
    }
    
    // Événements
    joinTournamentBtn.addEventListener('click', joinTournament);
    leaveTournamentBtn.addEventListener('click', leaveTournament);
    readyBtn.addEventListener('click', toggleReady);
    newTournamentBtn.addEventListener('click', resetTournament);
    
    // Initialisation
    updateUI();
    
    // Pour la démonstration, simuler l'ajout de joueurs
    // À remplacer par la vraie logique de connexion au serveur
    setTimeout(() => {
        // Simuler l'ajout du joueur actuel
        tournamentState.currentPlayer = {
            id: 'current-player',
            username: 'You',
            ready: false
        };
        tournamentState.players.push(tournamentState.currentPlayer);
        updateUI();
        
        // Simuler l'ajout d'autres joueurs
        setTimeout(() => {
            tournamentState.players.push({
                id: 'player2',
                username: 'Player 2',
                ready: true
            });
            updateUI();
            
            setTimeout(() => {
                tournamentState.players.push({
                    id: 'player3',
                    username: 'Player 3',
                    ready: true
                });
                updateUI();
                
                setTimeout(() => {
                    tournamentState.players.push({
                        id: 'player4',
                        username: 'Player 4',
                        ready: true
                    });
                    updateUI();
                }, 1000);
            }, 1000);
        }, 1000);
    }, 1000);
});
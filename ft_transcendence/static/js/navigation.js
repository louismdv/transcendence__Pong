document.addEventListener('DOMContentLoaded', function() {
    // Sélection des éléments de navigation et des sections
    const homeLink = document.getElementById('homeLink');
    const friendsLink = document.getElementById('friendsLink');
    const settingsBtn = document.getElementById('settings-btn');
    const openTournamentLink = document.getElementById('openTournamentLink');
    const boardLink = document.getElementById('boardLink');
    // Ces variables représentent les sections de ton SPA
    const gameSection = document.querySelector('.main-grid');
    const settingsSection = document.getElementById('settings-section');
    const tournamentSection = document.getElementById('tournament-section');
    const friendsSection = document.getElementById('friendspage');
    const boardSection = document.getElementById('board-section');
    const pageTitle = document.getElementById('page-title');
    const localGameSection = document.getElementById("localgame-section");
    const joinRoomBtn = document.getElementById('room-name-submit');
    const roomNameInput = document.getElementById('room-name-input');
    const onlineGameSection = document.getElementById("onlinegame-section");
    const gameRoomSection = document.getElementById("game-room-section");
    const localGameBtn = document.getElementById("localGameBtn");
    const onlineGameBtn = document.getElementById("onlineGameBtn");


    // Fonction pour masquer toutes les sections
    function hideAllSections() {
        gameSection.style.display = "none";
        settingsSection.style.display = "none";
        tournamentSection.style.display = "none";
        friendsSection.style.display = "none";
        localGameSection.style.display = "none";
        onlineGameSection.style.display = "none";
        gameRoomSection.style.display = "none";
        if (boardSection) boardSection.style.display = "none"; 
    }
    
    function updateActiveLink(activeElement) {
        document.querySelectorAll('.sidebar-links li a').forEach(link => {
            link.classList.remove('active');
        });
        if (activeElement) {
            activeElement.classList.add('active');
        }
    }
    function navigateToHome() {
        hideAllSections();
        if (gameSection) gameSection.style.display = 'grid';
        pageTitle.textContent = "Home"; // Replace with localized string if needed
        pageTitle.className = 'page-index';
        updateActiveLink(homeLink); 
        window.location.hash = '#home';
    }
    
    function navigateToFriends() {
        hideAllSections();
        if (friendsSection) friendsSection.style.display = 'block';
        pageTitle.textContent = 'Friends';
        pageTitle.className = 'page-friends';
        updateActiveLink(friendsLink);
        window.location.hash = '#friends';
    }
    
    function navigateToSettings() {
        hideAllSections();
        if (settingsSection) settingsSection.style.display = 'block';
        pageTitle.textContent = 'Settings';
        pageTitle.className = 'page-settings';
        updateActiveLink(settingsBtn);
        window.location.hash = '#settings';
    }
    
    function navigateToTournament() {
        hideAllSections();
        if (tournamentSection) tournamentSection.style.display = 'block';
        pageTitle.textContent = 'Tournament';
        pageTitle.className = 'page-tournament';
        updateActiveLink(openTournamentLink);
        window.location.hash = '#tournament';
    }
    
    function navigateToBoard() {
        hideAllSections();
        if (boardSection) boardSection.style.display = 'block';
        pageTitle.textContent = 'Leaderboard';
        pageTitle.className = 'page-board';
        updateActiveLink(boardLink);
        window.location.hash = '#board';
    }
    function navigateToLocalGame() {
        hideAllSections(); 
        if (localGameSection) {
            localGameSection.style.display = 'block';
        }
        window.location.hash = '#localgame';
    }
    function navigateToGameRoom(roomName) {
        hideAllSections();
        if (gameRoomSection) {
            gameRoomSection.style.display = 'block';
        }
        pageTitle.textContent = 'Online Game';
        window.location.hash = `#game/${roomName}`;
        document.getElementById('roomCode').value = roomName;
    }
    
    function navigateToOnlineGameLobby() {
        hideAllSections();
        if (onlineGameSection) {
            onlineGameSection.style.display = 'block';
        }
        pageTitle.className = 'page-online';
        window.location.hash = '#onlinegame';
    }
    
    if (joinRoomBtn) {
        joinRoomBtn.addEventListener('click', function(e) {
            e.preventDefault();
            const roomName = roomNameInput.value.trim();
            if (roomName) {
                navigateToGameRoom(roomName);
            } else {
                alert("Veuillez entrer un nom de room valide.");
            }
        });
    }
    if (homeLink) {
        homeLink.addEventListener('click', function(e) {
            e.preventDefault();
            navigateToHome();
        });
    }
    if (friendsLink) {
        friendsLink.addEventListener('click', function(e) {
            e.preventDefault();
            navigateToFriends();
        });
    }
    if (settingsBtn) {
        settingsBtn.addEventListener('click', function(e) {
            e.preventDefault();
            navigateToSettings();
        });
    }
    if (openTournamentLink) {
        openTournamentLink.addEventListener('click', function(e) {
            e.preventDefault();
            navigateToTournament();
        });
    }
    if (boardLink) {
        boardLink.addEventListener('click', function(e) {
            e.preventDefault();
            navigateToBoard();
        });
    }
    if (localGameBtn) {
        localGameBtn.addEventListener("click", function (e) {
            e.preventDefault();
            navigateToLocalGame();
        });
    }
    if (onlineGameBtn) {
        onlineGameBtn.addEventListener("click", function (e) {
            e.preventDefault();
            navigateToOnlineGameLobby();
        });
    }
    
    function handleHashChange() {
        const hash = window.location.hash;
        const match = hash.match(/^#game\/(.+)$/); // Capturer le nom de la room dans l'URL

        if (!hash || hash === '#home') {
            navigateToHome();
        } else if (hash === '#friends') {
            navigateToFriends();
        } else if (hash === '#settings') {
            navigateToSettings();
        } else if (hash === '#tournament') {
            navigateToTournament();
        } else if (hash === '#board') {
            navigateToBoard();
        } else if (hash === '#localgame') {
            navigateToLocalGame();
        } else if (hash === '#onlinegame') {
            navigateToOnlineGameLobby();
        }
        else if (match) {
            const roomName = match[1];
            navigateToGameRoom(roomName); // Rediriger vers la game room avec le nom
            document.getElementById('roomCode').value = roomName;
        } else {
            navigateToHome();
        }
    }
    
    // Initialiser à partir du hash
    handleHashChange();
    
    // Écoute des changements du hash
    window.addEventListener('hashchange', handleHashChange);
});

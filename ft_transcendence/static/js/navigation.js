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
    const onlineGameSection = document.getElementById("localgame-section");


    // Fonction pour masquer toutes les sections
    function hideAllSections() {
        if (gameSection) gameSection.style.display = 'none';
        if (settingsSection) settingsSection.style.display = 'none';
        if (tournamentSection) tournamentSection.style.display = 'none';
        if (friendsSection) friendsSection.style.display = 'none';
        if (boardSection) boardSection.style.display = 'none';
        if (localGameSection) localGameSection.style.display = 'none';
        if (onlineGameSection) onlineGameSection.style.display = 'none';


    }
    
    // Fonction pour mettre à jour la classe active
    function updateActiveLink(activeElement) {
        document.querySelectorAll('.sidebar-links li a').forEach(link => {
            link.classList.remove('active');
        });
        if (activeElement) {
            activeElement.classList.add('active');
        }
    }

    // Navigation vers les différentes sections en utilisant le hash
    function navigateToHome() {
        hideAllSections();
        if (gameSection) gameSection.style.display = 'grid';
        pageTitle.textContent = 'Home';
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
        hideAllSections(); // Masque toutes les sections
        const localGameSection = document.getElementById('localgame-section');
        if (localGameSection) {
            localGameSection.style.display = 'block'; // Affiche la section du jeu local
        }
        // Met à jour l'URL sans recharger la page pour garder la navigation fluide
        window.location.hash = '#localgame';
    }
        function navigateToOnlineGame() {
            hideAllSections(); // Masque toutes les sections
            const onlineGameSection = document.getElementById('onlinegame-section');
            if (onlineGameSection) {
                onlineGameSection.style.display = 'block'; // Affiche la section du jeu local
            }
            // Met à jour l'URL sans recharger la page pour garder la navigation fluide
            window.location.hash = '#onlinegame';
    }
    // Gestionnaires d'événements sur les liens
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
            navigateToOnlineGame();
        });
    }
    // Fonction pour gérer le hash actuel
    function handleHashChange() {
        const hash = window.location.hash;
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
        } 
        else if (hash === '#localgame') {
            navigateToLocalGame();
        }
        else if (hash === '#onlinegame') {
            navigateToOnlineGame();
        }else {
            navigateToHome();
        }
    }
    
    // Initialiser à partir du hash
    handleHashChange();
    
    // Écoute des changements du hash
    window.addEventListener('hashchange', handleHashChange);
});

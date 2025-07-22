/**
 * Friends Page JavaScript
 * Gère toutes les interactions avec la page d'amis
 */


document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded - Initializing friends page');
    
    // Check if the friends count badge exists
    const friendsCountBadge = document.getElementById('friendsCount');
    console.log('Initial friends count badge check:', friendsCountBadge);
    
    // Initialiser la page
    loadFriends();
    loadFriendRequests();
    loadBlockedUsers(); // Ajout de cette fonction
    setupUserSearch();
    
    // Configuration de la recherche d'amis
    // const searchInput = document.getElementById('friendSearch');
    // if (searchInput) {
    //     searchInput.addEventListener('input', function() {
    //         const searchTerm = this.value.toLowerCase();
    //         filterFriends(searchTerm);
    //     });
    // }
    
    // Initialisation des statuts en ligne
    updateOnlineStatus();
    
    // Actualiser les statuts toutes les 30 secondes
    setInterval(updateOnlineStatus, 5000);
    
    // Ajouter des écouteurs pour les onglets
    document.querySelectorAll('.nav-link').forEach(tab => {
        tab.addEventListener('click', function() {
            const target = this.getAttribute('data-bs-target') || this.getAttribute('href');
            if (target === '#blocked') {
                loadBlockedUsers();
            } else if (target === '#friends') {
                loadFriends();
            } else if (target === '#requests') {
                loadFriendRequests();
            }
        });
    });
});

/**
 * GESTION DES AMIS
 */

// Charger la liste des amis depuis l'API
function loadFriends() {
    const friendsContainer = document.getElementById('friendsContainer');
    if (!friendsContainer) return;
    
    // Afficher un spinner pendant le chargement
    friendsContainer.innerHTML = `
        <div class="d-flex justify-content-center">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Chargement...</span>
            </div>
        </div>
    `;
    
    fetch('/api/friends/')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(async data => {
            // Update the friends count badge
            updateFriendsCountBadge(data.friends.length);

            if (data.friends.length === 0) {
                friendsContainer.innerHTML = `
                    <div class="empty-state">
                        <span class="text-muted-custom">${gettext("Search for users to add them to your friends list.")}</span>
                    </div>
                `;
                updateFriendCounter();
                return;
            }

            // Wait for all friend cards to be built
            const friendCards = await Promise.all(
                data.friends.map(friend => createFriendCardHTML(friend))
            );

            friendsContainer.innerHTML = friendCards.join('');
            updateFriendCounter();
        })
        .catch(error => {
            console.error('Error loading friends:', error);
            friendsContainer.innerHTML = `
                <div class="alert alert-danger" role="alert">
                    <i class="bi bi-exclamation-triangle-fill me-2"></i>
                    ${gettext("Error while loading friends. Please try again.")}
                </div>
            `;
        });
}


// Créer le HTML pour une carte ami avec menu personnalisé
async function createFriendCardHTML(friend) {
    let wins = 0;
    let losses = 0;

    try {
        const response = await fetch(`/api/friends/${friend.id}/stats/`);
        if (response.ok) {
            const data = await response.json();
            wins = data.wins || 0;
            losses = data.losses || 0;
        } else {
            console.error(`Error fetching stats for friend ${friend.id}: ${response.status}`);
        }
    } catch (err) {
        console.error("Error fetching stats:", err);
        const data = await response.json();
        console.log(data); // Dev check
    }

    return `
        <div class="friend-card" data-friend-id="${friend.id}">
            <div class="friend-avatar">
                <img src="${friend.avatar || '/media/avatars/default.png'}" alt="${friend.username}">
                <span class="status-indicators ${friend.online ? gettext('online') : gettext('offline')}"></span>
            </div>
            <div class="friend-info">
                <h6 class="friend-name">${friend.username}</h6>
                <div class="friend-stats">${gettext('Wins')}: ${wins} | ${gettext('Losses')}: ${losses}</div>
                <div class="friend-status">${friend.online ? gettext('online') : gettext('offline')}</div>
            </div>
            <div class="friend-actions">
                <button class="btn btn-sm btn-outline-secondary action-toggle" 
                        type="button" 
                        onclick="toggleActionMenu('${friend.id}')">
                    ${gettext('Actions')}
                </button>
                <div id="action-menu-${friend.id}" class="custom-action-menu">
                    <div class="action-option" onclick="openChat('${friend.id}', '${friend.username}')">
                        <i class="bi bi-chat-dots me-2"></i>
                        <span>${gettext('Private Message')}</span>
                    </div>
                    <div class="action-option" onclick="window.inviteFriendToGame('${friend.id}', '${friend.username}')">
                        <i class="bi bi-controller me-2"></i>
                        <span>${gettext('Invite to Play')}</span>
                    </div>
                    <div class="action-divider"></div>
                    <div class="action-option text-warning" onclick="removeFriend('${friend.id}')">
                        <i class="bi bi-person-dash me-2"></i>
                        <span>${gettext('Remove')}</span>
                    </div>
                    <div class="action-option text-danger" onclick="blockFriend('${friend.id}')">
                        <i class="bi bi-slash-circle me-2"></i>
                        <span>${gettext('Block')}</span>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function toggleActionMenu(friendId) {
    console.log("Menu toggled for friend ID:", friendId);
    
    // Fermer tous les menus ouverts
    document.querySelectorAll('.custom-action-menu.show').forEach(menu => {
        if (menu.id !== `action-menu-${friendId}`) {
            menu.classList.remove('show');
        }
    });
    
    // Basculer l'état du menu actuel
    const menu = document.getElementById(`action-menu-${friendId}`);
    if (menu) {
        menu.classList.toggle('show');
        
        // Ajouter un gestionnaire d'événement pour fermer lors d'un clic ailleurs
        if (menu.classList.contains('show')) {
            // Gestionnaire d'événement pour fermer les menus quand on clique ailleurs
            function closeOnClickOutside(e) {
                if (!e.target.closest(`#action-menu-${friendId}`) && 
                    !e.target.closest(`[onclick="toggleActionMenu('${friendId}')"]`)) {
                    menu.classList.remove('show');
                    document.removeEventListener('click', closeOnClickOutside);
                }
            }
            
            // Utiliser setTimeout pour éviter que l'événement actuel ne ferme immédiatement le menu
            setTimeout(() => {
                document.addEventListener('click', closeOnClickOutside);
            }, 0);
        }
    }
}

// Filtrer les amis en fonction du terme de recherche
function filterFriends(searchTerm) {
    const friendCards = document.querySelectorAll('.friend-card');
    let visibleCount = 0;
    
    friendCards.forEach(card => {
        const friendName = card.querySelector('.friend-name').textContent.toLowerCase();
        
        if (friendName.includes(searchTerm)) {
            card.style.display = '';
            visibleCount++;
        } else {
            card.style.display = 'none';
        }
    });
    
    // Mettre à jour le compteur
    updateFriendsCountBadge(visibleCount);
    
    // Afficher un message si aucun résultat
    const friendsContainer = document.getElementById('friendsContainer');
    if (friendsContainer && visibleCount === 0 && searchTerm) {
        const noResults = document.querySelector('.no-results');
        if (!noResults) {
            const message = document.createElement('div');
            message.className = 'no-results text-center py-3';
            message.innerHTML = `
                <p class="text-muted-custom">${gettext('No result for ')}"${searchTerm}"</p>
            `;
            friendsContainer.appendChild(message);
        }
    } else {
        const noResults = document.querySelector('.no-results');
        if (noResults) {
            noResults.remove();
        }
    }
}

// Inviter un ami à jouer
function inviteToGame(friendId) {
    // Envoyer une invitation de jeu
    fetch(`/api/game/invite/${friendId}/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken')
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showToast(gettext('Invite sent successfully!'), 'success');
        } else {
            showToast(data.message || gettext('Error while sending invite.'), 'error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showToast(gettext('An error has occurred.'), 'error');
    });
}

// Supprimer un ami
function removeFriend(friendId) {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet ami ?')) {
        fetch(`/api/friends/${friendId}/remove/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Animation de suppression
                const friendCard = document.querySelector(`.friend-card[data-friend-id="${friendId}"]`);
                if (friendCard) {
                    friendCard.style.opacity = '0';
                    friendCard.style.transform = 'scale(0.8)';
                    
                    setTimeout(() => {
                        friendCard.remove();
                        updateFriendCounter();
                    }, 300);
                }
                
                showToast('Ami supprimé avec succès!', 'success');
            } else {
                showToast(data.message || 'Erreur lors de la suppression de l\'ami.', 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showToast(gettext('An error has occurred.'), 'error');
        });
    }
}

// Bloquer un utilisateur
function blockFriend(friendId) {
    if (confirm('Êtes-vous sûr de vouloir bloquer cet utilisateur? Vous ne recevrez plus aucun message ni invitation de sa part.')) {
        fetch(`/api/friends/${friendId}/block/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Animation de suppression
                const friendCard = document.querySelector(`.friend-card[data-friend-id="${friendId}"]`);
                if (friendCard) {
                    friendCard.style.opacity = '0';
                    friendCard.style.transform = 'scale(0.8)';
                    
                    setTimeout(() => {
                        friendCard.remove();
                        updateFriendCounter();
                    }, 300);
                }
                
                showToast('Utilisateur bloqué avec succès!', 'success');
                // Recharger la liste des utilisateurs bloqués
                loadBlockedUsers();
            } else {
                showToast(data.message || 'Erreur lors du blocage de l\'utilisateur.', 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showToast(gettext('An error has occurred.'), 'error');
        });
    }
}

/**
 * GESTION DES UTILISATEURS BLOQUÉS
 */

// Fonction pour charger les utilisateurs bloqués
function loadBlockedUsers() {
    const blockedContainer = document.getElementById('blockedUsersContainer');
    if (!blockedContainer) return;
    
    // Afficher un spinner pendant le chargement
    blockedContainer.innerHTML = `
        <div class="d-flex justify-content-center">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Chargement...</span>
            </div>
        </div>
    `;
    
    fetch('/api/friends/blocked/')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.blocked_users.length === 0) {
                blockedContainer.innerHTML = `
                    <span class="text-muted-custom">Vous n'avez bloqué personne pour le moment.</span>
                `;
                
                // Mettre à jour le badge
                const badge = document.getElementById('blockedCount');
                if (badge) {
                    badge.textContent = "0";
                }
                
                return;
            }
            
            let blockedHTML = '';
            data.blocked_users.forEach(user => {
                blockedHTML += createBlockedUserCardHTML(user);
            });
            
            blockedContainer.innerHTML = blockedHTML;
            
            // Mettre à jour le badge
            const badge = document.getElementById('blockedCount');
            if (badge) {
                badge.textContent = data.blocked_users.length;
            }
        })
        .catch(error => {
            console.error('Error loading blocked users:', error);
            blockedContainer.innerHTML = `
                <div class="alert alert-danger" role="alert">
                    <i class="bi bi-exclamation-triangle-fill me-2"></i>
                    Erreur lors du chargement des utilisateurs bloqués. Veuillez réessayer.
                </div>
            `;
        });
}

// Créer le HTML pour une carte d'utilisateur bloqué
function createBlockedUserCardHTML(user) {
    return `
        <div class="blocked-user-card" data-user-id="${user.id}">
            <div class="d-flex align-items-center p-3 border-bottom">
                <div class="user-avatar me-3">
                    <img src="${user.avatar || '/media/avatars/default.png'}" alt="${user.username}" class="avatar-sm">
                </div>
                <div class="user-info flex-grow-1">
                    <h6 class="mb-0">${user.username}</h6>
                    <small class="text-muted-custom">Bloqué ${formatDate(user.blocked_date)}</small>
                </div>
                <div class="actions">
                    <button class="btn btn-sm btn-outline-primary" onclick="unblockUser('${user.id}')">
                        <i class="bi bi-unlock me-1"></i>
                        Débloquer
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Fonction pour débloquer un utilisateur
function unblockUser(userId) {
    if (confirm('Voulez-vous vraiment débloquer cet utilisateur ?')) {
        fetch(`/api/friends/${userId}/unblock/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Animation de suppression
                const userCard = document.querySelector(`.blocked-user-card[data-user-id="${userId}"]`);
                if (userCard) {
                    userCard.style.opacity = '0';
                    userCard.style.transform = 'scale(0.8)';
                    
                    setTimeout(() => {
                        userCard.remove();
                        updateBlockedCounter();
                    }, 300);
                }
                
                showToast('Utilisateur débloqué avec succès!', 'success');
            } else {
                showToast(data.message || 'Erreur lors du déblocage de l\'utilisateur.', 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showToast(gettext('An error has occurred.'), 'error');
        });
    }
}

// Fonction pour mettre à jour le compteur d'utilisateurs bloqués
function updateBlockedCounter() {
    const blockedContainer = document.getElementById('blockedUsersContainer');
    const badge = document.getElementById('blockedCount');
    
    if (blockedContainer && badge) {
        const blockedCount = blockedContainer.querySelectorAll('.blocked-user-card').length;
        badge.textContent = blockedCount;
        
        // Afficher l'état vide si aucun utilisateur bloqué
        if (blockedCount === 0) {
            blockedContainer.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">
                        <i class="bi bi-shield-check"></i>
                    </div>
                    <h6>${gettext('No blocked users.')}</h6>
                    <p class="text-muted-custom">Vous n'avez bloqué personne pour le moment.</p>
                </div>
            `;
        }
    }
}

/**
 * RECHERCHE D'UTILISATEURS
 */

const searchTimeout = {
    timer: null
};

// Configuration de la recherche d'utilisateurs
function setupUserSearch() {
    const searchInput = document.getElementById('userSearch');
    const searchResults = document.getElementById('searchResults');
    const searchResultsHeader = document.getElementById('searchResultsHeader');
    
    if (searchInput && searchResults) {
        searchInput.addEventListener('input', function() {
            const query = this.value.trim();
            
            // Effacer le timer précédent
            clearTimeout(searchTimeout.timer);
            
            if (query.length < 3) {
                searchResultsHeader.style.display = 'none';
                searchResults.innerHTML = '<p class="text-muted-custom">Entrez au moins 3 caractères</p>';
                return;
            }
            
            // Hide header and show loading indicator
            searchResultsHeader.style.display = 'none';
            searchResults.innerHTML = `
                <div class="d-flex justify-content-center py-2">
                    <div class="spinner-border spinner-border-sm text-primary" role="status">
                        <span class="visually-hidden">Recherche en cours...</span>
                    </div>
                </div>
            `;
            
            // Définir un nouveau timer pour éviter trop de requêtes
            searchTimeout.timer = setTimeout(() => {
                fetch(`/api/users/search/?q=${encodeURIComponent(query)}`)
                    .then(response => response.json())
                    .then(data => {
                        if (data.users.length === 0) {
                            searchResultsHeader.style.display = 'none';
                            searchResults.innerHTML = '<p class="text-muted-custom">Aucun utilisateur trouvé</p>';
                            return;
                        }
                        
                        // Show and populate the results header
                        const timestamp = new Date().toLocaleTimeString();
                        searchResultsHeader.innerHTML = `
                            <div class="search-results-header">
                                <div class="d-flex justify-content-between align-items-center">
                                    <span class="text-muted-custom">
                                        <i class="bi bi-search me-1"></i>
                                        ${data.users.length} résultat${data.users.length > 1 ? 's' : ''} trouvé${data.users.length > 1 ? 's' : ''}
                                    </span>
                                    <small class="text-muted-custom">
                                        <i class="bi bi-clock me-1"></i>
                                        ${timestamp}
                                    </small>
                                </div>
                            </div>
                        `;
                        searchResultsHeader.style.display = 'block';
                        
                        // Build user results
                        let usersHTML = '';
                        data.users.forEach(user => {
                            let actionButton = '';
                            
                            if (user.status === 'accepted') {
                                actionButton = `<button class="btn btn-sm btn-success" disabled>${gettext('Friends')}</button>`;
                            } else if (user.status === 'pending' && user.is_sender) {
                                actionButton = `<button class="btn btn-sm btn-secondary" disabled>${gettext('Request sent')}</button>`;
                            } else if (user.status === 'pending' && !user.is_sender) {
                                actionButton = `
                                    <button class="btn btn-sm btn-success me-1" onclick="acceptFriendRequest('${user.request_id}')">${gettext('Accept')}</button>
                                    <button class="btn btn-sm btn-danger" onclick="rejectFriendRequest('${user.request_id}')">${gettext('Refuse')}</button>
                                `;
                            } else if (user.status === 'blocked') {
                                actionButton = `<button class="btn btn-sm btn-danger" disabled>${gettext('Blocked')}</button>`;
                            } else {
                                actionButton = `<button class="btn btn-sm btn-primary" onclick="sendFriendRequest('${user.id}')">${gettext('Add')}</button>`;
                            }
                            
                            usersHTML += `
                                <div class="user-item d-flex align-items-center p-2 border-bottom" data-user-id="${user.id}">
                                    <div class="user-avatar me-3">
                                        <img src="${user.avatar || '/media/avatars/default.png'}" alt="${user.username}" class="avatar-sm">
                                    </div>
                                    <div class="user-info flex-grow-1">
                                        <h6 class="mb-0">${user.username}</h6>
                                    </div>
                                    <div class="user-actions">
                                        ${actionButton}
                                    </div>
                                </div>
                            `;
                        });
                        
                        searchResults.innerHTML = usersHTML;
                    })
                    .catch(error => {
                        console.error('Error searching users:', error);
                        searchResults.innerHTML = `<p class="text-danger">${gettext('Error while searching')}</p>`;
                    });
            }, 300);
        });
    }
}

// Envoyer une demande d'ami
function sendFriendRequest(userId) {
    fetch(`/api/friends/request/${userId}/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken')
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showToast(gettext('Friend request sent successfully!'), 'success');
            // Mettre à jour le bouton
            const button = document.querySelector(`.user-item[data-user-id="${userId}"] .user-actions button`);
            if (button) {
                button.textContent = gettext('Request sent');
                button.classList.replace('btn-primary', 'btn-secondary');
                button.disabled = true;
                button.onclick = null;
            }
        } else {
            showToast(data.message || gettext('Error while sending request.'), 'error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showToast(gettext('An error has occured.'), 'error');
    });
}

/**
 * DEMANDES D'AMIS
 */

// Charger les demandes d'amis
function loadFriendRequests() {
    const requestsContainer = document.getElementById('friendRequestsContainer');
    if (!requestsContainer) return;
    
    fetch('/api/friends/requests/')
        .then(response => response.json())
        .then(data => {
            // Mettre à jour le badge
            const badge = document.getElementById('requestCount');
            if (badge) {
                badge.textContent = data.requests.length;
            }
            
            if (data.requests.length === 0) {
                requestsContainer.innerHTML = '<span class="text-muted-custom">' + gettext('No invitations for the moment.') + '</span>';
                return;
            }
            
            let requestsHTML = '';
            data.requests.forEach(request => {
                requestsHTML += `
                    <div class="request-item d-flex align-items-center w-500 p-2 mb-2 border rounded-3" data-request-id="${request.id}">
                        <div class="user-avatar me-3">
                            <img src="${request.avatar || '/media/avatars/default.png'}" alt="${request.username}" class="avatar-sm">
                        </div>
                        <div class="user-info flex-grow-1">
                            <h6 class="mb-0">${request.username}</h6>
                            <small class="text-muted-custom" style="margin-right: 10px">${formatDate(request.created_at)}</small>
                        </div>
                        <div class="request-actions">
                            <button class="btn btn-sm btn-success me-1" onclick="acceptFriendRequest('${request.id}')">
                                <i class="bi bi-check-lg"></i>
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="rejectFriendRequest('${request.id}')">
                                <i class="bi bi-x-lg"></i>
                            </button>
                        </div>
                    </div>
                `;
            });
            
            requestsContainer.innerHTML = requestsHTML;
        })
        .catch(error => {
            console.error('Error loading friend requests:', error);
            requestsContainer.innerHTML = '<p class="text-danger">' + gettext('Error while loading invitations.') + '</p>';
        });
}

// Accepter une demande d'ami
function acceptFriendRequest(requestId) {
    if (!requestId) {
        showToast(gettext('Request ID invalide'), 'error');
        return;
    }
    
    fetch(`/api/friends/request/handle/${requestId}/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken')
        },
        body: JSON.stringify({ action: 'accept' })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Animation de suppression
            const requestItem = document.querySelector(`.request-item[data-request-id="${requestId}"]`);
            if (requestItem) {
                requestItem.style.opacity = '0';
                requestItem.style.height = '0';
                
                setTimeout(() => {
                    requestItem.remove();
                    updateRequestCounter();
                }, 300);
            }
            
            showToast(gettext('Friend request accepted!'), 'success');
            // Recharger la liste d'amis
            loadFriends();
        } else {
            showToast(data.message || gettext('Error while accepting friend request.'), 'error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showToast(gettext('An error has occurred.'), 'error');
    });
}

// Refuser une demande d'ami
function rejectFriendRequest(requestId) {
    if (!requestId) {
        showToast(gettext('Request ID invalide'), 'error');
        return;
    }
    
    fetch(`/api/friends/request/handle/${requestId}/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken')
        },
        body: JSON.stringify({ action: 'reject' })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Animation de suppression
            const requestItem = document.querySelector(`.request-item[data-request-id="${requestId}"]`);
            if (requestItem) {
                requestItem.style.opacity = '0';
                requestItem.style.height = '0';
                
                setTimeout(() => {
                    requestItem.remove();
                    updateRequestCounter();
                }, 300);
            }
            
            showToast(gettext('Friend request refused.'), 'warning');
        } else {
            showToast(data.message || gettext('Error while rejecting the request.'), 'error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showToast(gettext('An error has occurred.'), 'error');
    });
}

// Mettre à jour le compteur de demandes
function updateRequestCounter() {
    const requestsContainer = document.getElementById('friendRequestsContainer');
    const badge = document.getElementById('requestCount');
    
    if (requestsContainer && badge) {
        const requestCount = requestsContainer.querySelectorAll('.request-item').length;
        badge.textContent = requestCount;
        
        if (requestCount === 0) {
            requestsContainer.innerHTML = '<p class="text-muted-custom">' + gettext('No requests at the moment.') + '</p>';
        }
    }
}

/**
 * STATUT EN LIGNE
 */

// Fonction pour mettre à jour les statuts des utilisateurs inactifs
function updateOnlineStatus() {
    // Appeler l'API pour mettre à jour les statuts des utilisateurs inactifs
    fetch('/api/update-online-status/')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // console.log(`${data.updated} utilisateurs marqués comme hors ligne`);
                // Recharger les statuts des amis
                updateFriendStatuses();
            }
        })
        .catch(error => console.error('Erreur lors de la mise à jour des statuts:', error));
}

// Fonction pour mettre à jour visuellement les statuts des amis
function updateFriendStatuses() {
    fetch('/api/friends/status/')
        .then(response => response.json())
        .then(data => {
            data.friends.forEach(friend => {
                const statusIndicator = document.querySelector(`.friend-card[data-friend-id="${friend.id}"] .status-indicators`);
                const statusText = document.querySelector(`.friend-card[data-friend-id="${friend.id}"] .friend-status`);
                
                if (statusIndicator && statusText) {
                    if (friend.online) {
                        statusIndicator.classList.remove('offline');
                        statusIndicator.classList.add('online');
                        statusText.textContent = gettext('online');
                    } else {
                        statusIndicator.classList.remove('online');
                        statusIndicator.classList.add('offline');
                        statusText.textContent = gettext('offline');
                    }
                }
            });
        })
        .catch(error => console.error('Erreur lors de la récupération des statuts:', error));
}

/**
 * UTILITAIRES
 */

// Function to update the friends count badge
function updateFriendsCountBadge(count) {
    const friendsCountBadge = document.getElementById('friendsCount');
    console.log('updateFriendsCountBadge called with count:', count);
    console.log('Friends count badge element:', friendsCountBadge);
    
    if (friendsCountBadge) {
        friendsCountBadge.textContent = count;
        console.log('Successfully updated friends count badge to:', count);
    } else {
        console.error('Friends count badge not found! Trying again in 100ms...');
        // Retry after a short delay in case DOM isn't ready
        setTimeout(() => {
            const retryBadge = document.getElementById('friendsCount');
            if (retryBadge) {
                retryBadge.textContent = count;
                console.log('Successfully updated friends count badge on retry to:', count);
            } else {
                console.error('Friends count badge still not found after retry!');
            }
        }, 100);
    }
}

// Mettre à jour le compteur d'amis
function updateFriendCounter() {
    const friendsContainer = document.getElementById('friendsContainer');
    
    console.log('updateFriendCounter called');
    console.log('Friends container:', friendsContainer);
    
    if (friendsContainer) {
        const friendCount = friendsContainer.querySelectorAll('.friend-card:not([style*="display: none"])').length;
        console.log('Calculated friend count:', friendCount);
        updateFriendsCountBadge(friendCount);
        
        // Afficher l'état vide si aucun ami
        if (friendCount === 0 && !document.querySelector('.empty-state')) {
            friendsContainer.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">
                        <i class="bi bi-people"></i>
                    </div>
                    <h6>${gettext('No friends at the moment.')}</h6>
                    <p class="text-muted-custom">${gettext('Search for users to add to your friends list.')}</p>
                </div>
            `;
        }
    }
}

// Formater une date
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
        return gettext('Today');
    } else if (diffDays === 1) {
        return gettext('Yesterday');
    } else if (diffDays < 7) {
        return `${diffDays} ${gettext('days ago')}`;
    } else {
        return date.toLocaleDateString();
    }
}

// Afficher une notification toast
function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer') || createToastContainer();
    
    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-white bg-${type === 'error' ? 'danger' : type}`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
    `;
    
    toastContainer.appendChild(toast);
    
    // Initialize Bootstrap Toast
    const bsToast = new bootstrap.Toast(toast, {
        autohide: true,
        delay: 3000
    });
    bsToast.show();
    
    // Supprimer le toast après qu'il soit caché
    toast.addEventListener('hidden.bs.toast', function() {
        toast.remove();
    });
}

// Créer un conteneur pour les toasts s'il n'existe pas
function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
    document.body.appendChild(container);
    return container;
}

// Récupérer le token CSRF
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

// Cette fonction garantit le bon fonctionnement des dropdowns
document.addEventListener('DOMContentLoaded', function() {
    // Fonction pour initialiser manuellement les dropdowns
    function initializeDropdowns() {
        document.querySelectorAll('.friend-card').forEach(card => {
            const dropdownToggle = card.querySelector('.dropdown-toggle');
            const dropdownMenu = card.querySelector('.dropdown-menu');
            
            if (dropdownToggle && dropdownMenu) {
                // Empêcher la propagation du clic dans le menu dropdown
                dropdownMenu.addEventListener('click', function(e) {
                    e.stopPropagation();
                });
                
                // Assurer que le menu s'affiche correctement
                dropdownToggle.addEventListener('click', function(e) {
                    e.stopPropagation();
                    e.preventDefault();
                    
                    // Fermer tous les autres dropdowns
                    document.querySelectorAll('.dropdown-menu.show').forEach(menu => {
                        if (menu !== dropdownMenu) {
                            menu.classList.remove('show');
                        }
                    });
                    
                    // Basculer l'état du dropdown actuel
                    dropdownMenu.classList.toggle('show');
                    
                    // Positionner correctement le menu
                    const rect = dropdownMenu.getBoundingClientRect();
                    if (rect.right > window.innerWidth) {
                        dropdownMenu.style.left = 'auto';
                        dropdownMenu.style.right = '0';
                    }
                    
                    // S'assurer que le menu reste dans la vue
                    if (rect.bottom > window.innerHeight) {
                        dropdownMenu.style.top = 'auto';
                        dropdownMenu.style.bottom = '100%';
                    }
                });
            }
        });
        
        // Fermer les dropdowns lorsqu'on clique ailleurs
        document.addEventListener('click', function(e) {
            if (!e.target.closest('.dropdown-menu') && !e.target.closest('.dropdown-toggle')) {
                document.querySelectorAll('.dropdown-menu.show').forEach(menu => {
                    menu.classList.remove('show');
                });
            }
        });
    }
    
    // Observer les changements dans le DOM pour initialiser les nouveaux dropdowns
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.addedNodes.length) {
                initializeDropdowns();
            }
        });
    });
    
    // Observer le conteneur des amis
    const friendsContainer = document.getElementById('friendsContainer');
    if (friendsContainer) {
        observer.observe(friendsContainer, { childList: true });
        
        // Initialiser les dropdowns existants
        initializeDropdowns();
    }
});
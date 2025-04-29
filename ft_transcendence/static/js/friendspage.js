/**
 * Friends Page JavaScript
 * Gère toutes les interactions avec la page d'amis
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialiser la page
    loadFriends();
    loadFriendRequests();
    loadBlockedUsers(); // Ajout de cette fonction
    setupUserSearch();
    
    // Configuration de la recherche d'amis
    const searchInput = document.getElementById('friendSearch');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            filterFriends(searchTerm);
        });
    }
    
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
        .then(data => {
            if (data.friends.length === 0) {
                friendsContainer.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">
                            <i class="bi bi-people"></i>
                        </div>
                        <h6>Aucun ami pour le moment</h6>
                        <p class="text-muted">Recherchez des utilisateurs pour les ajouter à votre liste d'amis.</p>
                    </div>
                `;
                updateFriendCounter();
                return;
            }
            
            let friendsHTML = '';
            data.friends.forEach(friend => {
                friendsHTML += createFriendCardHTML(friend);
            });
            
            friendsContainer.innerHTML = friendsHTML;
            updateFriendCounter();
        })
        .catch(error => {
            console.error('Error loading friends:', error);
            friendsContainer.innerHTML = `
                <div class="alert alert-danger" role="alert">
                    <i class="bi bi-exclamation-triangle-fill me-2"></i>
                    Erreur lors du chargement des amis. Veuillez réessayer.
                </div>
            `;
        });
}

// Créer le HTML pour une carte ami avec menu personnalisé
function createFriendCardHTML(friend) {
    return `
        <div class="friend-card" data-friend-id="${friend.id}">
            <div class="friend-avatar">
                <img src="${friend.avatar || '/media/avatars/default.png'}" alt="${friend.username}">
                <span class="status-indicators ${friend.online ? 'online' : 'offline'}"></span>
            </div>
            <div class="friend-info">
                <h6 class="friend-name">${friend.username}</h6>
                <div class="friend-status">${friend.online ? 'En ligne' : 'Hors ligne'}</div>
            </div>
            <div class="friend-actions">
                <button class="btn btn-sm btn-outline-secondary action-toggle" 
                        type="button" 
                        onclick="toggleActionMenu('${friend.id}')">
                    Actions
                </button>
                <div id="action-menu-${friend.id}" class="custom-action-menu">
                    <div class="action-option" onclick="openChat('${friend.id}', '${friend.username}')">
                        <i class="bi bi-chat-dots me-2"></i>
                        <span>Message privé</span>
                    </div>
                    <div class="action-option" onclick="window.inviteFriendToGame('${friend.id}', '${friend.username}')">
                        <i class="bi bi-controller me-2"></i>
                        <span>Inviter à jouer</span>
                    </div>
                    <div class="action-option" onclick="window.location.href='/profile/${friend.id}'">
                        <i class="bi bi-person me-2"></i>
                        <span>Voir le profil</span>
                    </div>
                    <div class="action-divider"></div>
                    <div class="action-option text-warning" onclick="removeFriend('${friend.id}')">
                        <i class="bi bi-person-dash me-2"></i>
                        <span>Supprimer</span>
                    </div>
                    <div class="action-option text-danger" onclick="blockFriend('${friend.id}')">
                        <i class="bi bi-slash-circle me-2"></i>
                        <span>Bloquer</span>
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
    const badge = document.querySelector('.card-title .badge');
    if (badge) {
        badge.textContent = visibleCount;
    }
    
    // Afficher un message si aucun résultat
    const friendsContainer = document.getElementById('friendsContainer');
    if (friendsContainer && visibleCount === 0 && searchTerm) {
        const noResults = document.querySelector('.no-results');
        if (!noResults) {
            const message = document.createElement('div');
            message.className = 'no-results text-center py-3';
            message.innerHTML = `
                <p class="text-muted">Aucun résultat pour "${searchTerm}"</p>
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
            showToast('Invitation envoyée avec succès!', 'success');
        } else {
            showToast(data.message || 'Erreur lors de l\'envoi de l\'invitation.', 'error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showToast('Une erreur est survenue.', 'error');
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
            showToast('Une erreur est survenue.', 'error');
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
            showToast('Une erreur est survenue.', 'error');
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
                    <div class="empty-state">
                        <div class="empty-icon">
                            <i class="bi bi-shield-check"></i>
                        </div>
                        <h6>Aucun utilisateur bloqué</h6>
                        <p class="text-muted">Vous n'avez bloqué personne pour le moment.</p>
                    </div>
                `;
                
                // Mettre à jour le badge
                const badge = document.querySelector('#blocked-tab .badge');
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
            const badge = document.querySelector('#blocked-tab .badge');
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
                    <small class="text-muted">Bloqué ${formatDate(user.blocked_date)}</small>
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
            showToast('Une erreur est survenue.', 'error');
        });
    }
}

// Fonction pour mettre à jour le compteur d'utilisateurs bloqués
function updateBlockedCounter() {
    const blockedContainer = document.getElementById('blockedUsersContainer');
    const badge = document.querySelector('#blocked-tab .badge');
    
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
                    <h6>Aucun utilisateur bloqué</h6>
                    <p class="text-muted">Vous n'avez bloqué personne pour le moment.</p>
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
    
    if (searchInput && searchResults) {
        searchInput.addEventListener('input', function() {
            const query = this.value.trim();
            
            // Effacer le timer précédent
            clearTimeout(searchTimeout.timer);
            
            if (query.length < 3) {
                searchResults.innerHTML = '<p class="text-muted">Entrez au moins 3 caractères</p>';
                return;
            }
            
            // Afficher un indicateur de chargement
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
                            searchResults.innerHTML = '<p class="text-muted">Aucun utilisateur trouvé</p>';
                            return;
                        }
                        
                        let usersHTML = '';
                        data.users.forEach(user => {
                            let actionButton = '';
                            
                            if (user.status === 'accepted') {
                                actionButton = `<button class="btn btn-sm btn-success" disabled>Amis</button>`;
                            } else if (user.status === 'pending' && user.is_sender) {
                                actionButton = `<button class="btn btn-sm btn-secondary" disabled>Demande envoyée</button>`;
                            } else if (user.status === 'pending' && !user.is_sender) {
                                actionButton = `
                                    <button class="btn btn-sm btn-success me-1" onclick="acceptFriendRequest('${user.request_id}')">Accepter</button>
                                    <button class="btn btn-sm btn-danger" onclick="rejectFriendRequest('${user.request_id}')">Refuser</button>
                                `;
                            } else if (user.status === 'blocked') {
                                actionButton = `<button class="btn btn-sm btn-danger" disabled>Bloqué</button>`;
                            } else {
                                actionButton = `<button class="btn btn-sm btn-primary" onclick="sendFriendRequest('${user.id}')">Ajouter</button>`;
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
                        searchResults.innerHTML = '<p class="text-danger">Erreur lors de la recherche</p>';
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
            showToast('Demande d\'ami envoyée avec succès!', 'success');
            // Mettre à jour le bouton
            const button = document.querySelector(`.user-item[data-user-id="${userId}"] .user-actions button`);
            if (button) {
                button.textContent = 'Demande envoyée';
                button.classList.replace('btn-primary', 'btn-secondary');
                button.disabled = true;
                button.onclick = null;
            }
        } else {
            showToast(data.message || 'Erreur lors de l\'envoi de la demande.', 'error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showToast('Une erreur est survenue.', 'error');
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
                requestsContainer.innerHTML = '<p class="text-muted">Aucune demande pour le moment</p>';
                return;
            }
            
            let requestsHTML = '';
            data.requests.forEach(request => {
                requestsHTML += `
                    <div class="request-item d-flex align-items-center p-2 mb-2 border-bottom" data-request-id="${request.id}">
                        <div class="user-avatar me-3">
                            <img src="${request.avatar || '/media/avatars/default.png'}" alt="${request.username}" class="avatar-sm">
                        </div>
                        <div class="user-info flex-grow-1">
                            <h6 class="mb-0">${request.username}</h6>
                            <small class="text-muted">${formatDate(request.created_at)}</small>
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
            requestsContainer.innerHTML = '<p class="text-danger">Erreur lors du chargement des demandes</p>';
        });
}

// Accepter une demande d'ami
function acceptFriendRequest(requestId) {
    if (!requestId) {
        showToast('ID de demande invalide', 'error');
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
            
            showToast('Demande d\'ami acceptée!', 'success');
            // Recharger la liste d'amis
            loadFriends();
        } else {
            showToast(data.message || 'Erreur lors de l\'acceptation de la demande.', 'error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showToast('Une erreur est survenue.', 'error');
    });
}

// Refuser une demande d'ami
function rejectFriendRequest(requestId) {
    if (!requestId) {
        showToast('ID de demande invalide', 'error');
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
            
            showToast('Demande d\'ami refusée.', 'warning');
        } else {
            showToast(data.message || 'Erreur lors du refus de la demande.', 'error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showToast('Une erreur est survenue.', 'error');
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
            requestsContainer.innerHTML = '<p class="text-muted">Aucune demande pour le moment</p>';
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
                        statusText.textContent = 'En ligne';
                    } else {
                        statusIndicator.classList.remove('online');
                        statusIndicator.classList.add('offline');
                        statusText.textContent = 'Hors ligne';
                    }
                }
            });
        })
        .catch(error => console.error('Erreur lors de la récupération des statuts:', error));
}

/**
 * UTILITAIRES
 */

// Mettre à jour le compteur d'amis
function updateFriendCounter() {
    const friendsContainer = document.getElementById('friendsContainer');
    const badge = document.querySelector('.card-title .badge');
    
    if (friendsContainer && badge) {
        const friendCount = friendsContainer.querySelectorAll('.friend-card:not([style*="display: none"])').length;
        badge.textContent = friendCount;
        
        // Afficher l'état vide si aucun ami
        if (friendCount === 0 && !document.querySelector('.empty-state')) {
            friendsContainer.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">
                        <i class="bi bi-people"></i>
                    </div>
                    <h6>Aucun ami pour le moment</h6>
                    <p class="text-muted">Recherchez des utilisateurs pour les ajouter à votre liste d'amis.</p>
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
        return "Aujourd'hui";
    } else if (diffDays === 1) {
        return "Hier";
    } else if (diffDays < 7) {
        return `Il y a ${diffDays} jours`;
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
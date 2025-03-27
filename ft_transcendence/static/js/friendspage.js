// Fonction de recherche d'amis
console.log('test');
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('friendSearch');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            filterFriends(searchTerm);
        });
    }
});

// Filtrer les amis en fonction du terme de recherche
function filterFriends(searchTerm) {
    const friendCards = document.querySelectorAll('.friend-card');
    
    friendCards.forEach(card => {
        const friendName = card.querySelector('.friend-name').textContent.toLowerCase();
        
        if (friendName.includes(searchTerm)) {
            card.style.display = '';
        } else {
            card.style.display = 'none';
        }
    });
}

// Fonctions pour les actions sur les amis
function openChat(friendId) {
    // Rediriger vers la conversation ou ouvrir une modal de chat
    console.log('Ouvrir le chat avec', friendId);
    // window.location.href = `/chat/${friendId}/`;
}

function inviteToGame(friendId) {
    // Envoyer une invitation à jouer
    console.log('Inviter à jouer', friendId);
    
    // Exemple d'appel API
    fetch(`/api/friends/${friendId}/invite-game/`, {
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
            showToast('Erreur lors de l\'envoi de l\'invitation.', 'error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showToast('Une erreur est survenue.', 'error');
    });
}

function removeFriend(friendId) {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet ami?')) {
        // Exemple d'appel API
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
                friendCard.style.opacity = '0';
                friendCard.style.transform = 'scale(0.8)';
                
                setTimeout(() => {
                    friendCard.remove();
                    updateFriendCounter();
                }, 300);
                
                showToast('Ami supprimé avec succès!', 'success');
            } else {
                showToast('Erreur lors de la suppression de l\'ami.', 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showToast('Une erreur est survenue.', 'error');
        });
    }
}

function blockFriend(friendId) {
    if (confirm('Êtes-vous sûr de vouloir bloquer cet utilisateur?')) {
        // Exemple d'appel API
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
                friendCard.style.opacity = '0';
                friendCard.style.transform = 'scale(0.8)';
                
                setTimeout(() => {
                    friendCard.remove();
                    updateFriendCounter();
                }, 300);
                
                showToast('Utilisateur bloqué avec succès!', 'success');
            } else {
                showToast('Erreur lors du blocage de l\'utilisateur.', 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showToast('Une erreur est survenue.', 'error');
        });
    }
}

// Mettre à jour le compteur d'amis
function updateFriendCounter() {
    const friendsContainer = document.getElementById('friendsContainer');
    const badge = document.querySelector('.card-title .badge');
    
    if (friendsContainer && badge) {
        const friendCount = friendsContainer.querySelectorAll('.friend-card:not([style*="display: none"])').length;
        badge.textContent = friendCount;
        
        // Afficher l'état vide si aucun ami
        if (friendCount === 0) {
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

// Fonction pour afficher des notifications
function showToast(message, type = 'info') {
    // Vous pouvez adapter cette fonction à votre système de notifications
    // Exemple avec Bootstrap Toast
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
    const bsToast = new bootstrap.Toast(toast);
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

// Fonction pour récupérer le token CSRF
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
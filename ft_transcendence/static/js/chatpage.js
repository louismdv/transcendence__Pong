
// chatpage.js - Afficher tous les friends online/offline 
//               pour pouvoir envoyer un message via le boutton: class=action-button message-button



document.addEventListener('DOMContentLoaded', function() {
    console.log("ChatPage.js chargé");

    //Initiate the page
    loadChatCards("online");
    loadChatCards("offline");

    
    // // Fonction pour ajouter un message au chat
    // function addMessageToChat(sender, text, time, type) {
    //     const messagesContainer = chatArea.querySelector('.chat-messages');
    //     if (!messagesContainer) return;
        
    //     const messageElement = document.createElement('div');
    //     messageElement.className = `chat-message ${type}`;
    //     messageElement.innerHTML = `
    //         <div class="message-content">
    //             <div class="message-sender">${sender}</div>
    //             <div class="message-text">${text}</div>
    //             <div class="message-time">${time || getCurrentTime()}</div>
    //         </div>
    //     `;
        
    //     messagesContainer.appendChild(messageElement);
        
    //     // Faire défiler vers le bas
    //     messagesContainer.scrollTop = messagesContainer.scrollHeight;
    // }
    

    // Fonction utilitaire pour obtenir l'heure actuelle
    function getCurrentTime() {
        const now = new Date();
        return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    }
    
    
    // Exposer les fonctions pour une utilisation externe
    // window.chatPageSystem = {
    //     selectContact: selectContact,
    //     receiveMessage: receiveMessage
    // };
});

function loadChatCards(status) {

    let chatContainer;

    // Get the correct container based on status (online or offline)
    if (status === "online")
        chatContainer = document.getElementById('online-chats-grid');
    else if (status === "offline")
        chatContainer = document.getElementById('offline-chats-grid');
    
    if (!chatContainer) return;  // If container not found, exit

    // Show a loading spinner while the data is being fetched
    chatContainer.innerHTML = `
        <div class="d-flex justify-content-center">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Chargement...</span>
            </div>
        </div>
    `;

    // Fetch data from the server
    fetch('/api/friends/')
        .then(response => {
            console.log('Response received:', response);  // Log the response object
            // Check if the response status is OK
            if (!response.ok) {
                console.error(`HTTP error! Status: ${response.status}`);
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();  // Parse the JSON response
        })
        .then(data => {
            console.log('Data received:', data);  // Log the received data
            // Filter the friends based on online/offline status
            const chats = data.friends.filter(friend =>
                status === "online" ? friend.online : !friend.online
            );

            // Handle the case when no friends are found
            if (chats.length === 0) {
                chatContainer.innerHTML = `
                    <div class="empty-state">
                        <h6>Aucun ami ${status === "online" ? 'en ligne' : 'hors ligne'} pour le moment.</h6>
                        <p class="text-muted">Veuillez revenir plus tard.</p>
                    </div>
                `;
                return 0;  // Return 0 if no friends are found
            }

            // Create the HTML for all friends
            let friendsHTML = '';
            let nbFriends = 0;
            chats.forEach(friend => {
                friendsHTML += createFriendChatCardHTML(friend);  // Assuming createFriendChatCardHTML is a function
                nbFriends++;
            });

            // Insert the generated HTML into the container
            chatContainer.innerHTML = friendsHTML;

            // Return the number of friends
            return nbFriends;
        })
        .then(result => {
            console.log('Number of friends:', result);  // Log the number of friends
            // Use the result (number of friends) to update the user count
            if (status === "online") {
                const badge = document.querySelector('.contacts-group-header .badge.bg-success');
                if (badge) {
                    badge.textContent = result;
                }
            } else if (status === "offline") {
                const badge = document.querySelector('.contacts-group-header .badge.bg-secondary');
                if (badge) {
                    badge.textContent = result;
                }
            }
        })
        .catch(error => {
            // Log the error to understand what went wrong
            console.error('Error in fetching or processing friends:', error);

            // Show a user-friendly error message in the chatContainer
            chatContainer.innerHTML = `
                <div class="alert alert-danger" role="alert">
                    <i class="bi bi-exclamation-triangle-fill me-2"></i>
                    Erreur lors du chargement des amis. Veuillez réessayer.
                </div>
            `;
        });
}
// Créer le HTML pour une carte ami avec menu personnalisé
function createFriendChatCardHTML(friend) {
    return `
        <div class="contact-item" data-user-id=${friend.id} data-username=${friend.username}>
            <div class="contact-avatar">
                <img src="${friend.avatar || '/media/avatars/default.png'}" alt="${friend.username}">
                <span class="status-indicator ${friend.online ? 'online' : 'offline'}"></span>
            </div>
            <div class="contact-info">
                <h6 class="contact-name">${friend.username}</h6>
                <p class="contact-status">${friend.online ? 'online' : 'offline'}</p>
            </div>
            <div class="contact-actions">
                <button class="action-button message-button">
                    <span class="material-symbols-outlined">chat</span>
                </button>
                <button class="action-button invite-button">
                    <span class="material-symbols-outlined">sports_esports</span>
                </button>
            </div>
        </div>
    `;
}
/**
 * chatpage.js - Gestion de la page de chat dédiée
 * Version améliorée avec gestion d'erreurs et vérifications
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log("ChatPage.js chargé");
    
    // Éléments de la page de chat
    let chatSection = document.getElementById('chatpage');
    let chatList = document.querySelector('.chat-list');
    let chatArea = document.querySelector('.chat-area');
    let messageInput = document.querySelector('.message-input');
    let sendButton = document.querySelector('.send-button');
    let userSearch = document.querySelector('.user-search');
    
    // Variables d'état
    let currentContact = null;
    let contacts = [];
    let messages = {};
    
    // Initialisation de la page de chat
    function initializeChatPage() {
        console.log("Initialisation de la page de chat");
        
        // Vérifier si les éléments existent
        chatSection = document.getElementById('chatpage');
        
        if (!chatSection) {
            console.error("Section de chat introuvable");
            return;
        }
        
        // Récupérer les éléments à l'intérieur de la section
        chatList = chatSection.querySelector('.chat-list');
        chatArea = chatSection.querySelector('.chat-area');
        messageInput = chatSection.querySelector('.message-input');
        sendButton = chatSection.querySelector('.send-button');
        userSearch = chatSection.querySelector('.user-search');
        
        // Vérifier si les éléments existent
        if (!chatList || !chatArea || !messageInput || !sendButton) {
            console.error("Éléments de la page de chat manquants");
            return;
        }
        
        // Ajouter les gestionnaires d'événements
        if (sendButton) {
            sendButton.addEventListener('click', sendMessage);
        }
        
        if (messageInput) {
            messageInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    sendMessage();
                }
            });
        }
        
        if (userSearch) {
            userSearch.addEventListener('input', searchUsers);
        }
        
        // Charger les contacts (à remplacer par la logique réelle)
        loadContacts();
        
        console.log("Initialisation de la page de chat terminée");
    }
    
    // Fonction pour charger les contacts
    function loadContacts() {
        console.log("Chargement des contacts");
        
        // Simuler des contacts (à remplacer par la logique réelle)
        contacts = [
            { id: 1, name: 'Alice', status: 'online', avatar: '/placeholder.svg?height=40&width=40' },
            { id: 2, name: 'Bob', status: 'offline', avatar: '/placeholder.svg?height=40&width=40' },
            { id: 3, name: 'Charlie', status: 'online', avatar: '/placeholder.svg?height=40&width=40' },
            { id: 4, name: 'David', status: 'away', avatar: '/placeholder.svg?height=40&width=40' }
        ];
        
        // Afficher les contacts
        renderContacts();
    }
    
    // Fonction pour afficher les contacts
    function renderContacts(filteredContacts = null) {
        if (!chatList) return;
        
        // Utiliser les contacts filtrés ou tous les contacts
        const contactsToRender = filteredContacts || contacts;
        
        // Vider la liste
        chatList.innerHTML = '';
        
        // Ajouter chaque contact
        contactsToRender.forEach(contact => {
            const contactElement = document.createElement('div');
            contactElement.className = `chat-contact ${contact.status}`;
            contactElement.dataset.userId = contact.id;
            
            contactElement.innerHTML = `
                <div class="contact-avatar">
                    <img src="${contact.avatar}" alt="${contact.name}">
                    <span class="status-indicator"></span>
                </div>
                <div class="contact-info">
                    <div class="contact-name">${contact.name}</div>
                    <div class="contact-status">${contact.status}</div>
                </div>
            `;
            
            // Ajouter le gestionnaire de clic
            contactElement.addEventListener('click', function() {
                selectContact(contact.id);
            });
            
            chatList.appendChild(contactElement);
        });
    }
    
    // Fonction pour sélectionner un contact
    function selectContact(userId) {
        console.log(`Sélection du contact: ${userId}`);
        
        // Trouver le contact
        const contact = contacts.find(c => c.id === userId);
        if (!contact) return;
        
        // Mettre à jour le contact actuel
        currentContact = contact;
        
        // Mettre à jour l'interface
        updateChatHeader();
        
        // Charger les messages
        loadMessages(userId);
        
        // Mettre en évidence le contact sélectionné
        const contactElements = document.querySelectorAll('.chat-contact');
        contactElements.forEach(el => {
            el.classList.remove('selected');
            if (parseInt(el.dataset.userId) === userId) {
                el.classList.add('selected');
            }
        });
    }
    
    // Fonction pour mettre à jour l'en-tête du chat
    function updateChatHeader() {
        if (!chatArea || !currentContact) return;
        
        const chatHeader = chatArea.querySelector('.chat-header');
        if (!chatHeader) {
            // Créer l'en-tête s'il n'existe pas
            const newHeader = document.createElement('div');
            newHeader.className = 'chat-header';
            newHeader.innerHTML = `
                <div class="contact-avatar">
                    <img src="${currentContact.avatar}" alt="${currentContact.name}">
                    <span class="status-indicator ${currentContact.status}"></span>
                </div>
                <div class="contact-info">
                    <div class="contact-name">${currentContact.name}</div>
                    <div class="contact-status">${currentContact.status}</div>
                </div>
            `;
            
            chatArea.insertBefore(newHeader, chatArea.firstChild);
        } else {
            // Mettre à jour l'en-tête existant
            chatHeader.innerHTML = `
                <div class="contact-avatar">
                    <img src="${currentContact.avatar}" alt="${currentContact.name}">
                    <span class="status-indicator ${currentContact.status}"></span>
                </div>
                <div class="contact-info">
                    <div class="contact-name">${currentContact.name}</div>
                    <div class="contact-status">${currentContact.status}</div>
                </div>
            `;
        }
    }
    
    // Fonction pour charger les messages
    function loadMessages(userId) {
        console.log(`Chargement des messages pour l'utilisateur: ${userId}`);
        
        // Vérifier si la zone de messages existe
        const messagesContainer = chatArea.querySelector('.chat-messages');
        if (!messagesContainer) {
            console.error("Conteneur de messages introuvable");
            return;
        }
        
        // Vider le conteneur
        messagesContainer.innerHTML = '';
        
        // Si pas de messages pour cet utilisateur, sortir
        if (!messages[userId]) {
            // Simuler quelques messages (à remplacer par la logique réelle)
            messages[userId] = [
                { sender: 'You', text: 'Hello!', time: '10:00', type: 'outgoing' },
                { sender: currentContact.name, text: 'Hi there!', time: '10:01', type: 'incoming' },
                { sender: 'You', text: 'How are you?', time: '10:02', type: 'outgoing' },
                { sender: currentContact.name, text: 'I\'m good, thanks!', time: '10:03', type: 'incoming' }
            ];
        }
        
        // Afficher les messages
        messages[userId].forEach(msg => {
            addMessageToChat(msg.sender, msg.text, msg.time, msg.type);
        });
        
        // Faire défiler vers le bas
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    // Fonction pour ajouter un message au chat
    function addMessageToChat(sender, text, time, type) {
        const messagesContainer = chatArea.querySelector('.chat-messages');
        if (!messagesContainer) return;
        
        const messageElement = document.createElement('div');
        messageElement.className = `chat-message ${type}`;
        messageElement.innerHTML = `
            <div class="message-content">
                <div class="message-sender">${sender}</div>
                <div class="message-text">${text}</div>
                <div class="message-time">${time || getCurrentTime()}</div>
            </div>
        `;
        
        messagesContainer.appendChild(messageElement);
        
        // Faire défiler vers le bas
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    // Fonction pour envoyer un message
    function sendMessage() {
        if (!messageInput || !currentContact) return;
        
        const text = messageInput.value.trim();
        if (text === '') return;
        
        console.log(`Envoi du message à ${currentContact.name}: ${text}`);
        
        // Ajouter le message à l'interface
        addMessageToChat('You', text, getCurrentTime(), 'outgoing');
        
        // Ajouter le message à l'historique
        if (!messages[currentContact.id]) {
            messages[currentContact.id] = [];
        }
        
        messages[currentContact.id].push({
            sender: 'You',
            text,
            time: getCurrentTime(),
            type: 'outgoing'
        });
        
        // Réinitialiser l'input
        messageInput.value = '';
        
        // Simuler une réponse (à remplacer par la logique réelle)
        setTimeout(() => {
            const response = `Response to: ${text}`;
            
            // Ajouter la réponse à l'interface
            addMessageToChat(currentContact.name, response, getCurrentTime(), 'incoming');
            
            // Ajouter la réponse à l'historique
            messages[currentContact.id].push({
                sender: currentContact.name,
                text: response,
                time: getCurrentTime(),
                type: 'incoming'
            });
        }, 1000);
    }
    
    // Fonction pour rechercher des utilisateurs
    function searchUsers() {
        if (!userSearch) return;
        
        const query = userSearch.value.toLowerCase();
        
        // Si la requête est vide, afficher tous les contacts
        if (query === '') {
            renderContacts();
            return;
        }
        
        // Filtrer les contacts
        const filteredContacts = contacts.filter(contact => 
            contact.name.toLowerCase().includes(query)
        );
        
        // Afficher les contacts filtrés
        renderContacts(filteredContacts);
    }
    
    // Fonction pour recevoir un message
    function receiveMessage(userId, text) {
        console.log(`Message reçu de l'utilisateur ${userId}: ${text}`);
        
        // Trouver le contact
        const contact = contacts.find(c => c.id === userId);
        if (!contact) return;
        
        // Ajouter le message à l'historique
        if (!messages[userId]) {
            messages[userId] = [];
        }
        
        messages[userId].push({
            sender: contact.name,
            text,
            time: getCurrentTime(),
            type: 'incoming'
        });
        
        // Si le contact est actuellement sélectionné, afficher le message
        if (currentContact && currentContact.id === userId) {
            addMessageToChat(contact.name, text, getCurrentTime(), 'incoming');
        } else {
            // Sinon, notifier l'utilisateur (à implémenter)
            notifyNewMessage(contact);
        }
    }
    
    // Fonction pour notifier d'un nouveau message
    function notifyNewMessage(contact) {
        console.log(`Notification de nouveau message de ${contact.name}`);
        
        // Mettre en évidence le contact dans la liste
        const contactElement = document.querySelector(`.chat-contact[data-user-id="${contact.id}"]`);
        if (contactElement) {
            contactElement.classList.add('has-new-message');
        }
        
        // Ajouter une notification (à implémenter selon vos besoins)
    }
    
    // Fonction utilitaire pour obtenir l'heure actuelle
    function getCurrentTime() {
        const now = new Date();
        return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    }
    
    // Initialiser la page de chat
    initializeChatPage();
    
    // Exposer les fonctions pour une utilisation externe
    window.chatPageSystem = {
        selectContact: selectContact,
        receiveMessage: receiveMessage
    };
});
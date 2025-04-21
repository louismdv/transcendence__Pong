// chat.js - Gestion du chat global
(function() {
  // État global du chat
  const chatState = {
      currentChat: null,
      minimized: false,
      conversations: {},
      activeChats: new Set() // Pour suivre les chats actifs
  };
// Dans la fonction initChat()

  // Initialisation du chat
  function initChat() {
      // Éléments DOM
      const contactItems = document.querySelectorAll('.contact-item');
      const chatWindow = document.getElementById('chatWindow');
      const chatUserName = document.getElementById('chatUserName');
      const chatUserAvatar = document.getElementById('chatUserAvatar');
      const chatUserStatus = document.getElementById('chatUserStatus');
      const chatUserStatusText = document.getElementById('chatUserStatusText');
      const chatMessages = document.getElementById('chatMessages');
      const chatInput = document.getElementById('chatInput');
      const sendMessageBtn = document.getElementById('sendMessageBtn');
      const minimizeChatBtn = document.getElementById('minimizeChatBtn');
      const closeChatBtn = document.getElementById('closeChatBtn');
      const inviteToGameBtn = document.getElementById('inviteToGameBtn');
      const chatSearch = document.getElementById('chatSearch');
      
      // Initialiser les conversations avec des données fictives
      initializeConversations();
      
      // Recherche dans les contacts
      if (chatSearch) {
          chatSearch.addEventListener('input', function() {
              const searchTerm = this.value.toLowerCase();
              filterContacts(searchTerm);
          });
      }
      
      // Ajouter des écouteurs d'événements aux contacts existants
      attachContactListeners();
      
      // Envoyer un message
      if (sendMessageBtn) {
          sendMessageBtn.addEventListener('click', sendMessage);
      }
      
      if (chatInput) {
          chatInput.addEventListener('keypress', function(e) {
              if (e.key === 'Enter') {
                  sendMessage();
              }
          });
      }
      
      // Minimiser la fenêtre de chat
      if (minimizeChatBtn) {
          minimizeChatBtn.addEventListener('click', function() {
              if (chatState.minimized) {
                  chatWindow.style.height = '450px';
                  chatState.minimized = false;
                  this.innerHTML = '<span class="material-symbols-outlined">minimize</span>';
              } else {
                  chatWindow.style.height = '40px';
                  chatState.minimized = true;
                  this.innerHTML = '<span class="material-symbols-outlined">expand_less</span>';
              }
          });
      }
      
      // Fermer la fenêtre de chat
      if (closeChatBtn) {
          closeChatBtn.addEventListener('click', function() {
              chatWindow.style.display = 'none';
              document.getElementById('chatFloatButton').style.display = 'flex';
              chatState.currentChat = null;
              chatState.activeChats.delete(chatState.currentChat?.userId);
          });
      }
      
      // Inviter à jouer
      if (inviteToGameBtn) {
          inviteToGameBtn.addEventListener('click', function() {
              if (chatState.currentChat) {
                  alert(`Invitation à jouer envoyée à ${chatState.currentChat.username}`);
              }
          });
      }
  }
  
  // Attacher des écouteurs d'événements aux contacts
  function attachContactListeners() {
      const contactItems = document.querySelectorAll('.contact-item');
      
      contactItems.forEach(item => {
          const messageBtn = item.querySelector('.message-button');
          if (messageBtn) {
              messageBtn.addEventListener('click', function(e) {
                  e.stopPropagation();
                  const userId = item.getAttribute('data-user-id');
                  const username = item.getAttribute('data-username');
                  openChat(userId, username);
              });
          }
      });
  }
  
  // Fonction pour initialiser les conversations
  function initializeConversations() {
      const contactItems = document.querySelectorAll('.contact-item');
      
      // Simuler des données de conversation pour chaque contact
      contactItems.forEach(item => {
          const userId = item.getAttribute('data-user-id');
          const username = item.getAttribute('data-username');
          
          chatState.conversations[userId] = {
              userId: userId,
              username: username,
              messages: [
                  // Messages fictifs pour la démonstration
                  {
                      sender: 'them',
                      text: 'Salut, tu veux faire une partie ?',
                      time: '10:45'
                  },
                  {
                      sender: 'me',
                      text: 'Oui, avec plaisir !',
                      time: '10:46'
                  },
                  {
                      sender: 'them',
                      text: 'Super ! Je t\'envoie une invitation.',
                      time: '10:47'
                  }
              ],
              unread: false
          };
      });
  }
  
  // Fonction pour filtrer les contacts
  function filterContacts(searchTerm) {
      const contactItems = document.querySelectorAll('.contact-item');
      
      // Filtrer les contacts
      contactItems.forEach(item => {
          const username = item.getAttribute('data-username').toLowerCase();
          
          if (username.includes(searchTerm)) {
              item.style.display = '';
          } else {
              item.style.display = 'none';
          }
      });
  }
  
  // Fonction pour ouvrir une conversation
  function openChat(userId, username) {
      const chatWindow = document.getElementById('chatWindow');
      const chatUserName = document.getElementById('chatUserName');
      const chatUserStatus = document.getElementById('chatUserStatus');
      const chatUserStatusText = document.getElementById('chatUserStatusText');
      const chatInput = document.getElementById('chatInput');
      
      // Mettre à jour l'état actuel
      chatState.currentChat = {
          userId: userId,
          username: username
      };
      
      // Ajouter à la liste des chats actifs
      chatState.activeChats.add(userId);
      
      // Mettre à jour l'interface de la fenêtre de chat
      chatUserName.textContent = username;
      
      // Trouver le statut de l'utilisateur
      const userItem = document.querySelector(`.contact-item[data-user-id="${userId}"]`);
      
      if (userItem) {
          const statusIndicator = userItem.querySelector('.status-indicator');
          if (statusIndicator) {
              // Mettre à jour l'indicateur de statut
              chatUserStatus.className = statusIndicator.className;
              
              // Mettre à jour le texte du statut
              if (statusIndicator.classList.contains('online')) {
                  chatUserStatusText.textContent = 'En ligne';
              } else if (statusIndicator.classList.contains('away')) {
                  chatUserStatusText.textContent = 'Absent';
              } else {
                  chatUserStatusText.textContent = 'Hors ligne';
              }
          }
      }
      
      // Charger les messages
      loadMessages(userId);
      
      // Afficher la fenêtre de chat
      chatWindow.style.display = 'flex';
      chatWindow.style.height = '450px';
      chatState.minimized = false;
      document.getElementById('chatFloatButton').style.display = 'none';

      // Focus sur l'input
      chatInput.focus();
  }
  
  // Fonction pour charger les messages d'une conversation
  function loadMessages(userId) {
      const chatMessages = document.getElementById('chatMessages');
      
      // Vider le conteneur de messages
      chatMessages.innerHTML = '';
      
      // Vérifier si la conversation existe
      if (chatState.conversations[userId]) {
          // Ajouter un séparateur de jour
          const daySeparator = document.createElement('div');
          daySeparator.className = 'chat-day-separator';
          daySeparator.innerHTML = '<span>Aujourd\'hui</span>';
          chatMessages.appendChild(daySeparator);
          
          // Ajouter les messages
          chatState.conversations[userId].messages.forEach(message => {
              const messageElement = document.createElement('div');
              messageElement.className = `chat-message ${message.sender === 'me' ? 'sent' : 'received'}`;
              
              messageElement.innerHTML = `
                  <div class="message-content">
                      <p>${message.text}</p>
                      <span class="message-time">${message.time}</span>
                  </div>
              `;
              
              chatMessages.appendChild(messageElement);
          });
          
          // Faire défiler jusqu'au dernier message
          chatMessages.scrollTop = chatMessages.scrollHeight;
      }
  }
  
  // Fonction pour envoyer un message
  function sendMessage() {
      const chatInput = document.getElementById('chatInput');
      const chatMessages = document.getElementById('chatMessages');
      const messageText = chatInput.value.trim();
      
      if (messageText && chatState.currentChat) {
          // Créer un nouvel objet message
          const now = new Date();
          const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
          
          const newMessage = {
              sender: 'me',
              text: messageText,
              time: time
          };
          
          // Ajouter le message à la conversation
          if (chatState.conversations[chatState.currentChat.userId]) {
              chatState.conversations[chatState.currentChat.userId].messages.push(newMessage);
          } else {
              chatState.conversations[chatState.currentChat.userId] = {
                  userId: chatState.currentChat.userId,
                  username: chatState.currentChat.username,
                  messages: [newMessage],
                  unread: false
              };
          }
          
          // Créer l'élément de message
          const messageElement = document.createElement('div');
          messageElement.className = 'chat-message sent';
          
          messageElement.innerHTML = `
              <div class="message-content">
                  <p>${messageText}</p>
                  <span class="message-time">${time}</span>
              </div>
          `;
          
          // Ajouter le message à la fenêtre de chat
          chatMessages.appendChild(messageElement);
          
          // Faire défiler jusqu'au dernier message
          chatMessages.scrollTop = chatMessages.scrollHeight;
          
          // Vider l'input
          chatInput.value = '';
          
          // Simuler une réponse après un délai aléatoire
          setTimeout(() => {
              simulateResponse(chatState.currentChat.userId);
          }, 1000 + Math.random() * 2000);
      }
  }
  
  // Fonction pour simuler une réponse
  function simulateResponse(userId) {
      if (!chatState.conversations[userId]) return;
      
      const responses = [
          'D\'accord !',
          'Pas de problème.',
          'Super !',
          'Je suis d\'accord.',
          'Bien sûr !',
          'Parfait !',
          'Je comprends.',
          'Intéressant...',
          'Merci !',
          'À plus tard !'
      ];
      
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      const now = new Date();
      const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      const newMessage = {
          sender: 'them',
          text: randomResponse,
          time: time
      };
      
      // Ajouter le message à la conversation
      chatState.conversations[userId].messages.push(newMessage);
      
      // Si cette conversation est actuellement ouverte, afficher le message
      if (chatState.currentChat && chatState.currentChat.userId === userId) {
          const chatMessages = document.getElementById('chatMessages');
          const messageElement = document.createElement('div');
          messageElement.className = 'chat-message received';
          
          messageElement.innerHTML = `
              <div class="message-content">
                  <p>${randomResponse}</p>
                  <span class="message-time">${time}</span>
              </div>
          `;
          
          // Ajouter le message à la fenêtre de chat
          chatMessages.appendChild(messageElement);
          
          // Faire défiler jusqu'au dernier message
          chatMessages.scrollTop = chatMessages.scrollHeight;
      } else {
          // Marquer comme non lu et mettre à jour l'interface si nécessaire
          chatState.conversations[userId].unread = true;
          
          // Vous pourriez ajouter ici un indicateur visuel pour montrer qu'il y a un nouveau message
          // Par exemple, une notification sur l'icône de chat dans la barre latérale
      }
  }
  
  // Fonction pour ouvrir le chat avec un utilisateur spécifique (exportée globalement)
  window.openChatWithUser = function(username) {
      // Trouver l'utilisateur par son nom
      const userItem = document.querySelector(`.contact-item[data-username="${username}"]`);
      
      if (userItem) {
          const userId = userItem.getAttribute('data-user-id');
          openChat(userId, username);
      } else {
          // Créer une nouvelle conversation
          const userId = 'new-' + Date.now();
          openChat(userId, username);
      }
  };
  
  // Initialiser le chat au chargement de la page
  document.addEventListener('DOMContentLoaded', initChat);
  
  // Réinitialiser les écouteurs d'événements lorsque le contenu de la page change
  // Cela est nécessaire si vous chargez dynamiquement le contenu de la page de chat
  function setupMutationObserver() {
      // Observer les changements dans le DOM pour réattacher les écouteurs d'événements si nécessaire
      const observer = new MutationObserver(function(mutations) {
          mutations.forEach(function(mutation) {
              if (mutation.addedNodes.length) {
                  // Si de nouveaux contacts sont ajoutés, attacher les écouteurs d'événements
                  attachContactListeners();
              }
          });
      });
      
      // Observer le contenu principal
      const mainContent = document.getElementById('main-content');
      if (mainContent) {
          observer.observe(mainContent, { childList: true, subtree: true });
      }
  }
  const chatFloatButton = document.getElementById('chatFloatButton');
  if (chatFloatButton) {
      chatFloatButton.addEventListener('click', function() {
          // Afficher la liste des conversations actives ou la dernière conversation
          if (chatState.activeChats.size > 0) {
              // Récupérer le dernier chat actif
              const lastChatId = Array.from(chatState.activeChats).pop();
              const lastChat = chatState.conversations[lastChatId];
              if (lastChat) {
                  openChat(lastChat.userId, lastChat.username);
              }
          } else {
              // Rediriger vers la page de contacts si aucun chat n'est actif
              window.location.hash = '#chat';
          }
      });
  }
  
  setupMutationObserver();
})();

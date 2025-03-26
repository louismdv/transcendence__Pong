document.addEventListener('DOMContentLoaded', function() {
    // Éléments du DOM
    const liveChat = document.getElementById('liveChat');
    const minimizeBtn = document.querySelector('.minimize-btn');
    const closeBtn = document.querySelector('.close-btn');
    const chatMessages = document.getElementById('chatMessages');
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');
    
    // Fonction pour faire défiler vers le bas
    function scrollToBottom() {
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    // Appel initial pour faire défiler vers le bas
    scrollToBottom();
    
    // Ouvrir le chat
    document.getElementById("openChatLink").addEventListener("click", function(event) {
      event.preventDefault();
      liveChat.style.display = "block";
      liveChat.classList.remove('minimized');
      scrollToBottom();
    });
    
    // Minimiser/maximiser le chat
    minimizeBtn.addEventListener('click', function() {
      liveChat.classList.toggle('minimized');
    });
    
    // Fermer le chat
    closeBtn.addEventListener('click', function() {
      liveChat.style.display = 'none';
    });
    
    // Envoyer un message
    function sendMessage() {
      const messageText = messageInput.value.trim();
      if (messageText === '') return;
      
      // Créer l'élément de message
      const messageElement = document.createElement('div');
      messageElement.className = 'message message-send';
      messageElement.innerHTML = `<div class="message-bubble">${messageText}</div>`;
      
      // Ajouter le message au chat
      chatMessages.appendChild(messageElement);
      
      // Effacer l'input
      messageInput.value = '';
      
      // Faire défiler vers le bas
      scrollToBottom();
      
      // Simuler une réponse après un délai
      setTimeout(function() {
        const responses = [
          "D'accord, je comprends.",
          "Merci pour votre message !",
          "Je vais vous aider avec ça.",
          "Avez-vous d'autres questions ?",
          "C'est noté !"
        ];
        
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        
        const responseElement = document.createElement('div');
        responseElement.className = 'message message-receive';
        responseElement.innerHTML = `<div class="message-bubble">${randomResponse}</div>`;
        
        chatMessages.appendChild(responseElement);
        scrollToBottom();
      }, 1000);
    }
    
    // Événement d'envoi de message
    sendButton.addEventListener('click', sendMessage);
    
    // Envoyer un message en appuyant sur Entrée
    messageInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        sendMessage();
      }
    });
  });
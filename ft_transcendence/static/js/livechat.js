// livechat.js — Espace de discussion privée en one-to-one via WebSockets
(function () {
    const chatState = {
        currentChat: null,
        minimized: false,
        conversations: {},
        activeChats: new Set(),
        sockets: {}
    };

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
    const chatFloatButton = document.getElementById('chatFloatButton');


    function openChat(userId, username) {

        console.log ("userID: ", userId, "username: ", username);

        if (!chatWindow || !chatUserName || !chatInput) return;

        chatState.currentChat = { userId, username };
        chatState.activeChats.add(userId);
        chatUserName.textContent = username;

        const userItem = document.querySelector(`.contact-item[data-user-id="${userId}"]`);
        updateUserAvatar(userItem, username);
        updateUserStatus(userItem);
        loadMessages(userId);

        if (!chatState.sockets[userId]) {
            const roomId = [currentUserId, userId].sort().join('_');
            const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const socket = new WebSocket(`${wsProtocol}//${window.location.host}/ws/chat/${roomId}/`);
            chatState.sockets[userId] = socket;

            socket.onopen = () => console.log(`WebSocket from ${currentUserId} ws: ${roomId}`);
            socket.onmessage = (event) => {
                try {
                    // Parse the incoming message data
                    const data = JSON.parse(event.data);
                    console.log('Received message:', data);

                    // Ensure data contains the expected structure
                    const { text, sender, receiver, time, error } = data;
                    console.log(data.sender);
                    console.log(data.receiver);

                    if (error) {
                        console.error('Error from server:', error);
                        return; // If there's an error, log and return
                    }

                    // Create a new message object
                    const newMessage = {
                        sender,
                        receiver,
                        text,
                        time
                    };
                    console.log(newMessage);
                    console.log(newMessage.receiver);

                    // adding ther messages to the cahat box according to sender or receiver
                    const msg = document.createElement('div');
                    msg.className = `chat-message ${newMessage.sender === currentUsername ? 'sent' : 'received'}`;
                    msg.innerHTML = `
                        <div class="message-content">
                            <p>${newMessage.text}</p>
                            <span class="message-time">${time}</span>
                        </div>
                    `;
                    chatMessages.appendChild(msg);
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                }
            };

            socket.onerror = e => console.error("WebSocket erreur:", e);
            socket.onclose = () => console.log(`WebSocket fermé pour ${userId}`);
        }

        chatWindow.style.display = 'flex';
        chatWindow.style.height = '450px';
        chatState.minimized = false;

        if (chatFloatButton) chatFloatButton.style.display = 'none';
        if (chatInput) chatInput.focus();
    }
    function sendMessage() {
        if (!chatInput || !chatMessages || !chatState.currentChat) return;

        const messageText = chatInput.value.trim();
        if (!messageText) return;

        const now = new Date();
        const time = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

        const newMessage = { 
            sender: 'me',  // This marks the sender as 'me' for the current user
            text: messageText,
            time
        };

        const userId = chatState.currentChat.userId;

        // Add the new message to the conversation state (no appending in the DOM here)
        const conversation = chatState.conversations[userId] ??= {
            userId, username: chatState.currentChat.username, messages: [], unread: false
        };
        conversation.messages.push(newMessage);

        // Clear the input field after sending the message
        chatInput.value = '';

        // 🚀 Send the message via WebSocket
        const socket = chatState.sockets[userId];
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
                text: messageText,
                sender: currentUsername, // Assuming `currentUsername` is defined elsewhere
                receiver: chatUserName.textContent, // Assuming this is the receiver's username
                time
            }));
        } else {
            console.warn("WebSocket non disponible pour l'utilisateur", userId);
        }
    }
    function updateUserAvatar(userItem, username) {
        if (!chatUserAvatar) return;

        let avatarUrl = 'images/default-avatar.png';
        if (userItem) {
            const contactAvatar = userItem.querySelector('.contact-avatar img');
            if (contactAvatar?.src) avatarUrl = contactAvatar.src;
            else avatarUrl = userItem.getAttribute('data-avatar') || avatarUrl;
        }

        chatUserAvatar.src = avatarUrl;
        chatUserAvatar.alt = `Avatar de ${username}`;
        chatUserAvatar.style.display = 'block';
    }
    function updateUserStatus(userItem) {
        if (!chatUserStatus || !chatUserStatusText) return;

        if (userItem) {
            const statusIndicator = userItem.querySelector('.status-indicator');
            if (statusIndicator) {
                chatUserStatus.className = statusIndicator.className;
                chatUserStatusText.textContent =
                    statusIndicator.classList.contains('online') ? 'En ligne' :
                    statusIndicator.classList.contains('away') ? 'Absent' : 'Hors ligne';
            }
        } else {
            chatUserStatus.className = 'status-indicator';
            chatUserStatusText.textContent = 'Statut inconnu';
        }
    }
    function attachContactListeners() {
        document.querySelectorAll('.contact-item').forEach(item => {
            const messageBtn = item.querySelector('.message-button');
            if (messageBtn) {
                messageBtn.addEventListener('click', e => {
                    e.stopPropagation();
                    openChat(item.dataset.userId, item.dataset.username);
                });
            }
        });
    }
    function loadMessages(userId) {
        if (!chatMessages) {
            console.error('Élément chatMessages manquant');
            return;
        }

        // Fetch messages from the backend
        fetch(`livechat/load_chat_log/${userId}/`)
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    console.error(data.error);
                    return;
                }

                const messages = data.messages;
                console.log(messages);
                chatMessages.innerHTML = ''; // Clear previous messages

                if (messages.length === 0) {
                    const noMessages = document.createElement('div');
                    noMessages.className = 'no-messages';
                    noMessages.innerHTML = 'No messages to display.';
                    chatMessages.appendChild(noMessages);
                    return;
                }

                // Append each message to the chat
                messages.forEach(({ sender, text, time }) => {
                    const msg = document.createElement('div');
                    // Use the correct variable 'sender' for comparison
                    msg.className = `chat-message ${sender === currentUsername ? 'sent' : 'received'}`;
                    msg.innerHTML = `
                        <div class="message-content">
                            <p>${text}</p> <!-- Use 'text' instead of 'messages.text' -->
                            <span class="message-time">${time}</span>
                        </div>
                    `;
                    chatMessages.appendChild(msg);
                });

                // Scroll to the bottom of the chat
                chatMessages.scrollTop = chatMessages.scrollHeight;
            })
            .catch(error => {
                console.error('Error loading messages:', error);
                response.text().then(text => {
                    console.error("Response text:", text); // Log the raw response text to see if it contains HTML or an error message
                });
            });
    }
//    function attachContactListeners() {
//         document.querySelectorAll('.contact-item').forEach(item => {
//             const messageBtn = item.querySelector('.message-button');
//             if (messageBtn) {
//                 messageBtn.addEventListener('click', e => {
//                     e.stopPropagation();
//                     openChat(item.dataset.userId, item.dataset.username);
//                 });
//             }
//         });
//     }
    function initChatListeners() {
        attachContactListeners();

        sendMessageBtn?.addEventListener('click', sendMessage);
        chatInput?.addEventListener('keypress', e => {
            if (e.key === 'Enter') sendMessage();
        });

        minimizeChatBtn?.addEventListener('click', function () {
            const isMinimized = chatState.minimized = !chatState.minimized;
            chatWindow.style.height = isMinimized ? '40px' : '450px';
            this.innerHTML = `<span class="material-symbols-outlined">${isMinimized ? 'expand_less' : 'minimize'}</span>`;
        });

        closeChatBtn?.addEventListener('click', () => {
            chatWindow.style.display = 'none';
            chatFloatButton.style.display = 'flex';
            const userId = chatState.currentChat?.userId;
            if (userId) {
                chatState.activeChats.delete(userId);
                chatState.currentChat = null;
            }
        });

        inviteToGameBtn?.addEventListener('click', () => {
            if (chatState.currentChat) {
                alert(`Invitation à jouer envoyée à ${chatState.currentChat.username}`);
            }
        });

        chatFloatButton?.addEventListener('click', () => {
            if (chatState.activeChats.size > 0) {
                const lastChatId = Array.from(chatState.activeChats).pop();
                const lastChat = chatState.conversations[lastChatId];
                if (lastChat) openChat(lastChat.userId, lastChat.username);
                else window.location.hash = '#chat';
            } else {
                window.location.hash = '#chat';
            }
        });
    }
    function setupMutationObserver() {
        const mainContent = document.getElementById('main-content');
        if (!mainContent) return;

        const observer = new MutationObserver(mutations => {
            for (const mutation of mutations) {
                if (mutation.addedNodes.length > 0) {
                    attachContactListeners();
                    break;
                }
            }
        });

        observer.observe(mainContent, { childList: true, subtree: true });
    }
    document.addEventListener('DOMContentLoaded', () => {
        initChatListeners();
        setupMutationObserver();
    });

    window.openChat = openChat; 
})();

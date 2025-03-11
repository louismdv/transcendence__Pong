document.getElementById("openChatLink").addEventListener("click", function(event) {
    event.preventDefault();  // Empêche la redirection
    var liveChat = document.getElementById("liveChat");
    if (liveChat.style.display === "none" || liveChat.style.display === "") {
        liveChat.style.display = "block";  // Affiche le chat
    } else {
        liveChat.style.display = "none";     // Cache le chat
    }
});

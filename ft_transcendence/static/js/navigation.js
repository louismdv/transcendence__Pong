document.addEventListener("DOMContentLoaded", () => {
    // Configuration des sections et de la navigation
    const navigationConfig = {
      home: {
        sectionSelector: ".main-grid",
        displayStyle: "grid",
        titleText: "Home",
        titleClass: "page-index",
        linkId: "homeLink",
      },
      friends: {
        sectionSelector: "#friends-section",
        displayStyle: "block",
        titleText: "Friends",
        titleClass: "page-friends",
        linkId: "friendsLink",
      },
      settings: {
        sectionSelector: "#settings-section",
        displayStyle: "block",
        titleText: "Settings",
        titleClass: "page-settings",
        linkId: "settings-btn",
      },
      tournament: {
        sectionSelector: "#tournament-section",
        displayStyle: "block",
        titleText: "Tournament",
        titleClass: "page-tournament",
        linkId: "openTournamentLink",
      },
      chat: {
        sectionSelector: "#chat-section",
        displayStyle: "block",
        titleText: "Chat",
        titleClass: "page-chat",
        linkId: "chatLink",
      },
      dashboard: {
        sectionSelector: "#dashboard-section",
        displayStyle: "block",
        titleText: "Tableau de bord",
        titleClass: "page-dashboard",
        linkId: "dashboardLink",
        onShow: () => {
          console.log("Dashboard section shown, initializing charts...")
          // Dispatch custom event that section was shown (for charts to initialize)
          const event = new CustomEvent("section-shown", {
            detail: { sectionId: "dashboard-section" },
          })
          document.dispatchEvent(event)
        },
      },
      localgame: {
        sectionSelector: "#localgame-section",
        displayStyle: "block",
        titleText: "Local Game",
        titleClass: "page-local",
        linkId: null,
      },
      onlinegame: {
        sectionSelector: "#onlinegame-section",
        displayStyle: "block",
        titleText: "Online Game",
        titleClass: "page-online",
        linkId: null,
      },
    }
  
    // Éléments DOM communs
    const gameRoomSection = document.getElementById("game-room-section")
    const joinRoomBtn = document.getElementById("room-name-submit")
    const roomNameInput = document.getElementById("room-name-input")
    const localGameBtn = document.getElementById("localGameBtn")
    const onlineGameBtn = document.getElementById("onlineGameBtn")
    const pageTitle = document.getElementById("page-title") // Adjust selector as needed
  
    // Fonction pour masquer toutes les sections
    function hideAllSections() {
    //   console.log("Hiding all sections")
      Object.values(navigationConfig).forEach((config) => {
        const section = document.querySelector(config.sectionSelector)
        if (section) {
          section.style.display = "none"
        //   console.log(`Hidden: ${config.sectionSelector}`)
        } else {
          console.warn(`Section not found: ${config.sectionSelector}`)
        }
      })
  
      // Masquer aussi la section game-room qui est gérée séparément
      if (gameRoomSection) {
        gameRoomSection.style.display = "none"
        // console.log("Hidden: game-room-section")
      }
    }
  
    // Fonction pour mettre à jour le lien actif
    function updateActiveLink(activeElementId) {
      document.querySelectorAll(".sidebar-links li a").forEach((link) => {
        link.classList.remove("active")
      })
  
      if (activeElementId) {
        const activeElement = document.getElementById(activeElementId)
        if (activeElement) {
          activeElement.classList.add("active")
        //   console.log(`Active link: ${activeElementId}`)
        } else {
          console.warn(`Active link element not found: ${activeElementId}`)
        }
      }
    }
  
    // Fonction générique pour naviguer vers une section
    function navigateTo(sectionKey) {
    //   console.log(`Navigating to: ${sectionKey}`)
  
      if (!navigationConfig[sectionKey]) {
        console.error(`Section configuration not found for: ${sectionKey}`)
        return
      }
  
      const config = navigationConfig[sectionKey]
  
      hideAllSections()
  
      const section = document.querySelector(config.sectionSelector)
      if (section) {
        section.style.display = config.displayStyle
        // console.log(`Showing section: ${config.sectionSelector} with display: ${config.displayStyle}`)
      } else {
        console.error(`Section not found: ${config.sectionSelector}`)
      }

      if (config.linkId) updateActiveLink(config.linkId)
  
      window.location.hash = "#" + sectionKey
  
      // Exécuter la fonction onShow si elle existe
      if (config.onShow && typeof config.onShow === "function") {
        // console.log(`Executing onShow function for: ${sectionKey}`)
        config.onShow()
      }
    }
  
    // Fonction pour naviguer vers la game room
    function navigateToGameRoom(roomName) {
    //   console.log(`Navigating to game room: ${roomName}`)
      hideAllSections()
      if (gameRoomSection) {
        gameRoomSection.style.display = "block"
        // console.log("Showing game room section")
      }
      pageTitle.textContent = "Online Game"
      document.getElementById("roomCode").value = roomName
    }
  
    // Ajouter les écouteurs d'événements pour les liens de navigation
    Object.entries(navigationConfig).forEach(([key, config]) => {
      if (config.linkId) {
        const link = document.getElementById(config.linkId)
        if (link) {
        //   console.log(`Adding click event listener for: ${config.linkId}`)
          link.addEventListener("click", (e) => {
            e.preventDefault()
            navigateTo(key)
          })
        } else {
          console.warn(`Link element not found: ${config.linkId}`)
        }
      }
    })
  
    // Écouteurs d'événements pour les boutons spécifiques
    if (localGameBtn) {
      localGameBtn.addEventListener("click", (e) => {
        e.preventDefault()
        navigateTo("localgame")
      })
    }
  
    if (onlineGameBtn) {
      onlineGameBtn.addEventListener("click", (e) => {
        e.preventDefault()
        navigateTo("onlinegame")
      })
    }
  
    if (joinRoomBtn && roomNameInput) {
      joinRoomBtn.addEventListener("click", (e) => {
        e.preventDefault()
        const roomName = roomNameInput.value.trim()
        if (roomName) {
          navigateToGameRoom(roomName)
        }
      })
    }
  
    // Gestion du changement de hash dans l'URL
    function handleHashChange() {
      const hash = window.location.hash
    //   console.log(`Hash changed to: ${hash}`)
  
      // Vérifier si c'est un hash de game room
      const gameMatch = hash.match(/^#game\/(.+)$/)
      if (gameMatch) {
        const roomName = gameMatch[1]
        navigateToGameRoom(roomName)
        return
      }
  
      // Extraire la clé de section du hash
      const sectionKey = hash.substring(1) // Enlever le #
  
      // Si la section existe dans notre configuration, y naviguer
      if (navigationConfig[sectionKey]) {
        navigateTo(sectionKey)
      } else if (!hash || hash === "#") {
        // Par défaut, aller à la page d'accueil
        navigateTo("home")
      } else {
        console.warn(`Unknown hash: ${hash}`)
      }
    }
  
    // Initialiser à partir du hash actuel
    // console.log("Initializing navigation from current hash")
    handleHashChange()
  
    // Écouter les changements de hash
    window.addEventListener("hashchange", handleHashChange)
  
  
    // document.body.appendChild(testButton)
  })
  
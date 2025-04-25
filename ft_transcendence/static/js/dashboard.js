console.log("Dashboard.js loaded!");

document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM loaded in dashboard.js");

  // Fetch dashboard data on load
  updateDashboardData();
});

// Function to update dashboard data from server
function updateDashboardData() {
  console.log("Fetching dashboard data");

  // Remplacez ceci par un appel AJAX réel pour récupérer les données depuis Django
  fetch("/api/dashboard-data/")
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      console.log("Dashboard data received:", data);

      // Met à jour les éléments de statistiques
      document.getElementById("user-wins").textContent = data.wins;
      document.getElementById("user-losses").textContent = data.losses;
      document.getElementById("win-rate").textContent = data.winRate + "%";
      document.getElementById("total-games").textContent = data.totalGames;
      document.getElementById("tournaments-won").textContent = data.tournamentsWon;

      // Met à jour l'historique des jeux
      const gameHistoryBody = document.getElementById("game-history-body");
      gameHistoryBody.innerHTML = "";

      data.recentGames.forEach((game) => {
        const row = document.createElement("tr");
        row.className = game.result === "Win" ? "game-win" : "game-loss";

        row.innerHTML = `
          <td>${game.date}</td>
          <td>${game.opponent}</td>
          <td>${game.result}</td>
          <td>${game.score}</td>
          <td>${game.duration}</td>
        `;

        gameHistoryBody.appendChild(row);
      });

      // Met à jour l'historique des tournois
      const tournamentHistoryBody = document.getElementById("tournament-history-body");
      tournamentHistoryBody.innerHTML = "";

      data.tournaments.forEach((tournament) => {
        const row = document.createElement("tr");

        row.innerHTML = `
          <td>${tournament.date}</td>
          <td>${tournament.name}</td>
          <td>${tournament.placement}</td>
          <td>${tournament.players}</td>
        `;

        tournamentHistoryBody.appendChild(row);
      });
    })
    .catch((error) => {
      console.error("Error fetching dashboard data:", error);
    });
}

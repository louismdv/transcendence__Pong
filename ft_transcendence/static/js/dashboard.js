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
            // LOCAL game data
            document.getElementById("user-wins-local").textContent = "local - " + (data.local_wins ?? 0);
            document.getElementById("user-losses-local").textContent = "local - " + (data.local_losses ?? 0);
            document.getElementById("total-local-games").textContent = "Total : " + (data.local_total_games ?? 0);

            // ONLINE game data
            document.getElementById("user-wins-online").textContent = "online - " + (data.online_wins ?? 0);
            document.getElementById("user-losses-online").textContent = "online - " + (data.online_losses ?? 0);
            document.getElementById("total-online-games").textContent = "Total : " + (data.online_total_games ?? 0);

            // document.getElementById("win-rate").textContent = ((data.wins / (data.losses + data.wins)) * 100).toFixed(2) + "%";

            if (data.totalLocalGames === null) {
                document.getElementById("total-local-games").textContent = 0;
            } else {
                document.getElementById("total-local-games").textContent = data.totalLocalGames;
            }
            document.getElementById("total-online-games").textContent = data.totalOnlineGames;

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

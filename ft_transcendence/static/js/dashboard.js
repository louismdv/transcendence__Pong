console.log("Dashboard.js loaded!");

// Variables globales
let statsPieChart;

// Au chargement du DOM
document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM loaded in dashboard.js");

    // Initialise le camembert
    initializePieChart();

    // Met à jour avec des données fictives
    updateDashboardData();
});

// Initialise un camembert vide
function initializePieChart() {
    const ctx = document.getElementById('statsPieChart').getContext('2d');
    statsPieChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Aucune donnée'],
            datasets: [{
                label: 'Statistiques du joueur',
                data: [1],
                backgroundColor: ['#e0e0e0'],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.label || '';
                            let value = context.raw || 0;
                            return `${label}: ${value}`;
                        }
                    }
                }
            }
        }
    });
}

// Met à jour les données du camembert
function updatePieChart( winsOnline, lossesOnline) {
    const total =  winsOnline + lossesOnline;

    if (total > 0) {
        statsPieChart.data.labels = ['Victoires Online', 'Défaites Online'];
        statsPieChart.data.datasets[0].data = [ winsOnline, lossesOnline];
        statsPieChart.data.datasets[0].backgroundColor = [
            '#4CAF50', // Vert
            '#F44336', // Rouge
        ];
    } else {
        statsPieChart.data.labels = ['Aucune donnée'];
        statsPieChart.data.datasets[0].data = [1];
        statsPieChart.data.datasets[0].backgroundColor = ['#e0e0e0'];
    }

    statsPieChart.update();
}


// Met à jour l'historique des parties
function updateGameHistory(games) {
    const gameHistoryBody = document.getElementById("game-history-body");
    gameHistoryBody.innerHTML = "";

    if (games.length === 0) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");
        cell.colSpan = 5;
        cell.textContent = "Aucune partie récente.";
        cell.style.textAlign = "center";
        row.appendChild(cell);
        gameHistoryBody.appendChild(row);
        return;
    }

    games.forEach((game) => {
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
}

// Met à jour l'historique des tournois
function updateTournamentHistory(tournaments) {
    const tournamentHistoryBody = document.getElementById("tournament-history-body");
    tournamentHistoryBody.innerHTML = "";

    if (tournaments.length === 0) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");
        cell.colSpan = 4;
        cell.textContent = "Aucun tournoi récent.";
        cell.style.textAlign = "center";
        row.appendChild(cell);
        tournamentHistoryBody.appendChild(row);
        return;
    }

    tournaments.forEach((tournament) => {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${tournament.date}</td>
            <td>${tournament.name}</td>
            <td>${tournament.placement}</td>
            <td>${tournament.players}</td>
        `;

        tournamentHistoryBody.appendChild(row);
    });
}


function updateDashboardData() {
    console.log("Fetching dashboard data");

    const fakeData = {
            recentGames: [
                { date: "2025-04-26", opponent: "Alice", result: "Win", score: "10-8", duration: "5:00" },
                { date: "2025-04-25", opponent: "Bob", result: "Loss", score: "7-10", duration: "4:20" }
            ],
            tournaments: [
                { date: "2025-04-20", name: "Spring Cup", placement: "1ère Place", players: 16 },
                { date: "2025-04-10", name: "Weekend Clash", placement: "Demi-finale", players: 8 }
            ]
        };

    fetch("/api/dashboard-data/")
        .then((response) => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then((data) => {
            console.log("Dashboard data received:", data);

            // ONLINE game data
            document.getElementById("user-wins").textContent = (data.online_wins ?? 0);
            document.getElementById("user-losses").textContent = (data.online_losses ?? 0);
            document.getElementById("total-games").textContent = (data.online_total_games ?? 0);
            document.getElementById("win-rate").textContent = (((data.online_wins + data.local_wins) / (data.local_total_games + data.online_total_games) || 0) * 100).toFixed(1) + "%";


            updatePieChart(
                data.online_wins,
                data.online_losses
            );

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

    // Historique des parties
    updateGameHistory(fakeData.recentGames);

    // Historique des tournois
    updateTournamentHistory(fakeData.tournaments);
}

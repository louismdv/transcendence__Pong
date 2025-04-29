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
            labels: [gettext('No data')],
            datasets: [{
                label: gettext('Player statistics'),
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
        statsPieChart.data.labels = [gettext('Online wins'), gettext('Online losses')];
        statsPieChart.data.datasets[0].data = [ winsOnline, lossesOnline];
        statsPieChart.data.datasets[0].backgroundColor = [
            '#4CAF50', // Vert
            '#F44336', // Rouge
        ];
    } else {
        statsPieChart.data.labels = [gettext('No data')];
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
        cell.textContent = gettext('No games played yet');
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
            <td>${game.room_name}</td>
            <td>${game.opponent}</td>
            <td>${game.result}</td>
            <td>${game.score}</td>
            <td>${game.duration}</td>
        `;

        gameHistoryBody.appendChild(row);
    });
}

function updateDashboardData() {
    console.log("Fetching dashboard data");

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
            document.getElementById("win-rate").textContent = (((data.online_wins ?? 0 + data.local_wins ?? 0) / (data.local_total_games ?? 0 + data.online_total_games ?? 0) || 0) * 100).toFixed(0) + "%";

            // Update pie chart
            updatePieChart(
                data.online_wins,
                data.online_losses
            );

            // Update game history
            updateGameHistory(data.recentGames);
        })
        .catch((error) => {
            console.error("Error fetching dashboard data:", error);
        });
}

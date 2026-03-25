document.addEventListener("DOMContentLoaded", async () => {
    const select = document.getElementById("year-select");
    const teamsPanel = document.getElementById("teams-panel");
    const teamsList = document.getElementById("teams-list");
    const rosterPanel = document.getElementById("roster-panel");
    const rosterTitle = document.getElementById("roster-title");
    const rosterList = document.getElementById("roster-list");

    try {
        const response = await fetch("/years");
        const years = await response.json();

        select.innerHTML = '<option value="">-- Choose a Year --</option>';
        years.forEach(year => {
            const option = document.createElement("option");
            option.value = year;
            option.textContent = year;
            select.appendChild(option);
        });
        select.disabled = false;
    } catch {
        select.innerHTML = '<option value="">Failed to load years</option>';
    }

    async function loadRoster(teamID, teamName, year) {
        rosterPanel.hidden = false;
        rosterTitle.textContent = `${teamName} ${year} Roster`;
        rosterList.innerHTML = "<li>Loading...</li>";

        try {
            const response = await fetch(`/players?teamID=${teamID}&yearID=${year}`);
            const players = await response.json();
            rosterList.innerHTML = "";
            players.forEach(p => {
                const li = document.createElement("li");
                li.textContent = `${p.nameFirst} ${p.nameLast}`;
                rosterList.appendChild(li);
            });
        } catch {
            rosterList.innerHTML = "<li>Failed to load roster</li>";
        }
    }

    select.addEventListener("change", async () => {
        const year = select.value;
        if (!year) {
            teamsPanel.hidden = true;
            rosterPanel.hidden = true;
            return;
        }

        rosterPanel.hidden = true;

        teamsList.innerHTML = "<p>Loading...</p>";
        teamsPanel.hidden = false;

        try {
            const response = await fetch(`/teams?year=${year}`);
            const teams = await response.json();

            teamsList.innerHTML = "";

            // Group teams by league, then by division
            const leagues = {};
            teams.forEach(team => {
                const lg = team.lgID || "Other";
                if (!leagues[lg]) leagues[lg] = {};
                const div = team.divID || "";
                if (!leagues[lg][div]) leagues[lg][div] = [];
                leagues[lg][div].push({ name: team.name, teamID: team.teamID });
            });

            const divNames = { E: "East", C: "Central", W: "West" };

            for (const [lg, divisions] of Object.entries(leagues).sort((a, b) => a[0].localeCompare(b[0]))) {
                const lgSection = document.createElement("div");
                lgSection.className = "league-group";

                const lgHeader = document.createElement("h3");
                lgHeader.className = "league-header";
                lgHeader.textContent = lg;
                lgSection.appendChild(lgHeader);

                const divKeys = Object.keys(divisions).sort();
                const hasDivisions = divKeys.some(d => d !== "");

                for (const div of divKeys) {
                    if (hasDivisions && div) {
                        const divHeader = document.createElement("h4");
                        divHeader.className = "division-header";
                        divHeader.textContent = divNames[div] || div;
                        lgSection.appendChild(divHeader);
                    }

                    const ul = document.createElement("ul");
                    divisions[div].sort((a, b) => a.name.localeCompare(b.name)).forEach(team => {
                        const li = document.createElement("li");
                        li.textContent = team.name;
                        li.classList.add("team-item");
                        li.addEventListener("click", () => loadRoster(team.teamID, team.name, year));
                        ul.appendChild(li);
                    });
                    lgSection.appendChild(ul);
                }

                teamsList.appendChild(lgSection);
            }
        } catch {
            teamsList.innerHTML = "<p>Failed to load teams</p>";
        }
    });
});

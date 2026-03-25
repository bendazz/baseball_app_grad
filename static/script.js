document.addEventListener("DOMContentLoaded", async () => {
    const select = document.getElementById("year-select");
    const teamsPanel = document.getElementById("teams-panel");
    const teamsList = document.getElementById("teams-list");
    const rosterPanel = document.getElementById("roster-panel");
    const rosterTitle = document.getElementById("roster-title");
    const rosterList = document.getElementById("roster-list");
    const playerPanel = document.getElementById("player-panel");
    const playerName = document.getElementById("player-name");
    const playerBio = document.getElementById("player-bio");
    const battingTable = document.getElementById("batting-table");

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
        playerPanel.hidden = true;
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
                li.classList.add("player-item");
                li.addEventListener("click", () => loadPlayer(p.playerID, p.nameFirst, p.nameLast));
                rosterList.appendChild(li);
            });
        } catch {
            rosterList.innerHTML = "<li>Failed to load roster</li>";
        }
    }

    async function loadPlayer(playerID, nameFirst, nameLast) {
        playerPanel.hidden = false;
        playerName.textContent = `${nameFirst} ${nameLast}`;
        playerBio.innerHTML = "Loading...";
        battingTable.querySelector("thead").innerHTML = "";
        battingTable.querySelector("tbody").innerHTML = "";

        try {
            const response = await fetch(`/player/${playerID}`);
            const data = await response.json();
            const bio = data.bio;

            const birthDate = [bio.birthMonth, bio.birthDay, bio.birthYear].filter(Boolean).join("/");
            const deathDate = [bio.deathMonth, bio.deathDay, bio.deathYear].filter(Boolean).join("/");
            const birthPlace = [bio.birthCity, bio.birthState, bio.birthCountry].filter(Boolean).join(", ");

            let bioHTML = `<p><strong>Full Name:</strong> ${bio.nameGiven || ""} ${bio.nameLast || ""}</p>`;
            if (birthDate) bioHTML += `<p><strong>Born:</strong> ${birthDate}${birthPlace ? " — " + birthPlace : ""}</p>`;
            if (deathDate) bioHTML += `<p><strong>Died:</strong> ${deathDate}</p>`;
            if (bio.height) bioHTML += `<p><strong>Height:</strong> ${Math.floor(bio.height / 12)}'${bio.height % 12}"</p>`;
            if (bio.weight) bioHTML += `<p><strong>Weight:</strong> ${bio.weight} lbs</p>`;
            if (bio.bats || bio.throws) bioHTML += `<p><strong>Bats/Throws:</strong> ${bio.bats || "?"}/${bio.throws || "?"}</p>`;
            if (bio.debut) bioHTML += `<p><strong>Debut:</strong> ${bio.debut}</p>`;
            if (bio.finalGame) bioHTML += `<p><strong>Final Game:</strong> ${bio.finalGame}</p>`;
            playerBio.innerHTML = bioHTML;

            const cols = ["yearID", "teamID", "G", "AB", "R", "H", "2B", "3B", "HR", "RBI", "SB", "BB", "SO", "AVG"];
            const headerRow = cols.map(c => `<th>${c}</th>`).join("");
            battingTable.querySelector("thead").innerHTML = `<tr>${headerRow}</tr>`;

            const tbody = battingTable.querySelector("tbody");
            data.batting.forEach(b => {
                const avg = (b.AB && b.AB > 0) ? (b.H / b.AB).toFixed(3).replace(/^0/, "") : "---";
                const row = [b.yearID, b.teamID, b.G, b.AB, b.R, b.H, b.double, b.triple, b.HR, b.RBI, b.SB, b.BB, b.SO, avg];
                const tr = document.createElement("tr");
                tr.innerHTML = row.map(v => `<td>${v ?? ""}</td>`).join("");
                tbody.appendChild(tr);
            });
        } catch {
            playerBio.innerHTML = "<p>Failed to load player data</p>";
        }
    }

    select.addEventListener("change", async () => {
        const year = select.value;
        if (!year) {
            teamsPanel.hidden = true;
            rosterPanel.hidden = true;
            playerPanel.hidden = true;
            return;
        }

        rosterPanel.hidden = true;
        playerPanel.hidden = true;

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

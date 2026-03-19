document.addEventListener("DOMContentLoaded", async () => {
    const select = document.getElementById("year-select");
    const teamsPanel = document.getElementById("teams-panel");
    const teamsList = document.getElementById("teams-list");

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

    select.addEventListener("change", async () => {
        const year = select.value;
        if (!year) {
            teamsPanel.hidden = true;
            return;
        }

        teamsList.innerHTML = "<li>Loading...</li>";
        teamsPanel.hidden = false;

        try {
            const response = await fetch(`/teams?year=${year}`);
            const teams = await response.json();

            teamsList.innerHTML = "";
            teams.forEach(name => {
                const li = document.createElement("li");
                li.textContent = name;
                teamsList.appendChild(li);
            });
        } catch {
            teamsList.innerHTML = "<li>Failed to load teams</li>";
        }
    });
});

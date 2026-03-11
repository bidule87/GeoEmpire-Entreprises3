// ===============================
//   PRESTIGE.JS – GEO EMPIRE
// ===============================

// Chargement du prestige depuis le localStorage
function loadPrestige() {
    return JSON.parse(localStorage.getItem("prestigeData")) || {
        niveau: 1,
        points: 0,
        prochainPalier: 100,
        recompenses: []
    };
}

// Sauvegarde du prestige
function savePrestige(data) {
    localStorage.setItem("prestigeData", JSON.stringify(data));
}

// Mise à jour de l'affichage
function updateUI() {
    const data = loadPrestige();

    // Niveau
    document.getElementById("prestige-niveau").innerHTML = `
        <p><strong>Niveau actuel :</strong> ${data.niveau}</p>
        <p><strong>Points :</strong> ${data.points}</p>
    `;

    // Récompenses
    if (data.recompenses.length === 0) {
        document.getElementById("prestige-recompenses").innerHTML = "<p>Aucune récompense débloquée.</p>";
    } else {
        document.getElementById("prestige-recompenses").innerHTML = `
            <ul>
                ${data.recompenses.map(r => `<li>${r}</li>`).join("")}
            </ul>
        `;
    }

    // Prochain palier
    document.getElementById("prestige-palier").innerHTML = `
        <p><strong>Prochain palier :</strong> ${data.prochainPalier} points</p>
    `;
}

// Ajout de points de prestige
export function ajouterPrestige(points) {
    const data = loadPrestige();
    data.points += points;

    // Vérification du palier
    if (data.points >= data.prochainPalier) {
        data.niveau++;
        data.points = 0;
        data.prochainPalier = Math.floor(data.prochainPalier * 1.5);

        data.recompenses.push(`Récompense du niveau ${data.niveau}`);
    }

    savePrestige(data);
    updateUI();
}

// Initialisation
document.addEventListener("DOMContentLoaded", () => {
    updateUI();
});

// ===============================
//  GEOEMPIRE 3 - BRAQUAGE
// ===============================

let ge_braquageCooldown = 0;

// Lancer un braquage
window.ge_lancerBraquage = function () {
    const zone = document.getElementById("braquage-zone");

    if (ge_braquageCooldown > Date.now()) {
        const reste = Math.ceil((ge_braquageCooldown - Date.now()) / 1000);
        zone.innerHTML = `<p>⏳ Attends encore ${reste}s avant de braquer.</p>`;
        return;
    }

    if (!entreprise.position) {
        zone.innerHTML = "<p>GPS indisponible.</p>";
        return;
    }

    // Gain aléatoire
    const gain = Math.floor(200 + Math.random() * 800);

    ge_ajouterArgent(gain);

    ge_braquageCooldown = Date.now() + 15000; // 15 sec cooldown

    zone.innerHTML = `
        <p>💥 Braquage réussi !</p>
        <p>Gain : <strong>${ge_formatArgent(gain)}</strong></p>
        <p>⏳ Prochain braquage dans 15s.</p>
    `;

    ge_notif("Braquage réussi ! +" + gain + " Ø", "success");
};

// Affichage automatique
window.ge_afficherBraquage = function () {
    const zone = document.getElementById("braquage-zone");
    if (!zone) return;

    zone.innerHTML = `
        <button onclick="ge_lancerBraquage()">🚨 Lancer un braquage</button>
    `;
};

window.addEventListener("load", ge_afficherBraquage);

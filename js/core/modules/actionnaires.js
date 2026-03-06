// ===============================
//  GEOEMPIRE 3 - ACTIONNAIRES
// ===============================

// Ajouter un actionnaire
window.ge_ajouterActionnaire = function (nom, pourcentage) {
    const a = {
        id: Date.now(),
        nom: ge_formatNom(nom),
        pourcentage: pourcentage
    };

    entreprise.actionnaires.push(a);
    ge_afficherActionnaires();
    ge_notif("Actionnaire ajouté", "success");
};

// Supprimer un actionnaire
window.ge_supprimerActionnaire = function (id) {
    entreprise.actionnaires = entreprise.actionnaires.filter(a => a.id !== id);
    ge_afficherActionnaires();
    ge_notif("Actionnaire supprimé", "error");
};

// Valeur totale des parts
window.ge_totalParts = function () {
    return entreprise.actionnaires.reduce((t, a) => t + a.pourcentage, 0);
};

// Affichage
window.ge_afficherActionnaires = function () {
    const zone = document.getElementById("contenu-actionnaires");
    if (!zone) return;

    if (entreprise.actionnaires.length === 0) {
        zone.innerHTML = "<p>Aucun actionnaire pour le moment.</p>";
        return;
    }

    let html = `<h2>ACTIONNAIRES</h2>`;
    html += `<p>Total des parts : <strong>${ge_formatPourcent(ge_totalParts())}</strong></p>`;

    html += `<div class="actionnaires-liste">`;

    entreprise.actionnaires.forEach(a => {
        html += `
            <div class="actionnaire-item">
                <div class="nom">${a.nom}</div>
                <div class="part">${ge_formatPourcent(a.pourcentage)}</div>
                <button onclick="ge_supprimerActionnaire(${a.id})">Supprimer</button>
            </div>
        `;
    });

    html += `</div>`;
    zone.innerHTML = html;
};

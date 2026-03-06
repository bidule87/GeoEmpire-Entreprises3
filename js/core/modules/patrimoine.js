// ===============================
//  GEOEMPIRE 3 - PATRIMOINE
// ===============================

// Ajouter une entreprise au patrimoine
window.ge_ajouterPatrimoine = function (nom, valeur) {
    const item = {
        id: Date.now(),
        nom: ge_formatNom(nom),
        valeur: valeur
    };

    entreprise.patrimoine.push(item);
    ge_afficherPatrimoine();
    ge_notif("Entreprise ajoutée au patrimoine", "success");
};

// Supprimer une entreprise
window.ge_supprimerPatrimoine = function (id) {
    entreprise.patrimoine = entreprise.patrimoine.filter(e => e.id !== id);
    ge_afficherPatrimoine();
    ge_notif("Entreprise supprimée", "error");
};

// Valeur totale du patrimoine
window.ge_valeurPatrimoine = function () {
    return entreprise.patrimoine.reduce((t, e) => t + e.valeur, 0);
};

// Affichage dans la page
window.ge_afficherPatrimoine = function () {
    const zone = document.getElementById("contenu-patrimoine");
    if (!zone) return;

    if (entreprise.patrimoine.length === 0) {
        zone.innerHTML = "<p>Aucune entreprise pour le moment.</p>";
        return;
    }

    let html = `<h2>PATRIMOINE</h2>`;
    html += `<p>Valeur totale : <strong>${ge_formatArgent(ge_valeurPatrimoine())}</strong></p>`;

    html += `<div class="patrimoine-liste">`;

    entreprise.patrimoine.forEach(e => {
        html += `
            <div class="patrimoine-item">
                <div class="nom">${e.nom}</div>
                <div class="valeur">${ge_formatArgent(e.valeur)}</div>
                <button onclick="ge_supprimerPatrimoine(${e.id})">Supprimer</button>
            </div>
        `;
    });

    html += `</div>`;

    zone.innerHTML = html;
};

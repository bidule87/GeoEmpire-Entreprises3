// =======================================
//  GEO EMPIRE — ACTIONNAIRES (NOUVEAU SYSTEME)
// =======================================

import { getEntreprise, sauvegarderEntreprise } from "../core/entrepriseCore.js";
import { getData, saveData } from "../geoData.js";

// ===============================
//  AJOUTER UN ACTIONNAIRE
// ===============================
window.ge_ajouterActionnaire = function (nom, pourcentage) {
    const data = getData();
    const e = data.entreprise;

    if (!e.actionnaires) e.actionnaires = [];

    const a = {
        id: Date.now(),
        nom: ge_formatNom(nom),
        pourcentage: pourcentage
    };

    e.actionnaires.push(a);

    sauvegarderEntreprise(e);
    saveData();

    ge_afficherActionnaires();
    ge_notif("Actionnaire ajouté", "success");
};

// ===============================
//  SUPPRIMER UN ACTIONNAIRE
// ===============================
window.ge_supprimerActionnaire = function (id) {
    const data = getData();
    const e = data.entreprise;

    e.actionnaires = e.actionnaires.filter(a => a.id !== id);

    sauvegarderEntreprise(e);
    saveData();

    ge_afficherActionnaires();
    ge_notif("Actionnaire supprimé", "error");
};

// ===============================
//  TOTAL DES PARTS
// ===============================
window.ge_totalParts = function () {
    const e = getEntreprise();
    if (!e.actionnaires) return 0;

    return e.actionnaires.reduce((t, a) => t + a.pourcentage, 0);
};

// ===============================
//  AFFICHAGE
// ===============================
window.ge_afficherActionnaires = function () {
    const zone = document.getElementById("contenu-actionnaires");
    if (!zone) return;

    const e = getEntreprise();
    if (!e.actionnaires || e.actionnaires.length === 0) {
        zone.innerHTML = "<p>Aucun actionnaire pour le moment.</p>";
        return;
    }

    let html = `<h2>ACTIONNAIRES</h2>`;
    html += `<p>Total des parts : <strong>${ge_formatPourcent(ge_totalParts())}</strong></p>`;

    html += `<div class="actionnaires-liste">`;

    e.actionnaires.forEach(a => {
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

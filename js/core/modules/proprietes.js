// =======================================
// GEO EMPIRE — MODULE PROPRIÉTÉS
// Compatible geoData + entrepriseCore
// =======================================

import { getEntreprise } from "../core/entrepriseCore.js";

export function initProprietes() {
    afficherProprietes();
}

/* ===========================
   PLACEHOLDERS POUR ÉVITER LES ERREURS
=========================== */

function afficherAssurance(bien) {
    return `
        <div class="assurance-placeholder">
            Assurance : ${bien.assure ? "Oui" : "Aucune"}
        </div>
    `;
}

function afficherRenovation(bien) {
    return `
        <div class="renovation-placeholder">
            Rénovation : ${bien.renovation ? bien.renovation.niveau : "Aucune"}
        </div>
    `;
}

/* ===========================
   AFFICHAGE DES PROPRIÉTÉS
=========================== */

function afficherProprietes() {
    const entreprise = getEntreprise();
    const container = document.getElementById("proprietes");
    container.innerHTML = "";

    for (const categorie in entreprise.biens) {
        const bloc = document.createElement("div");
        bloc.className = "categorie-bloc";
        bloc.innerHTML = `<h2>${categorie}</h2>`;

        for (const style in entreprise.biens[categorie]) {
            const bien = entreprise.biens[categorie][style];

            const bonus = bien.renovation ? bien.renovation.bonusValeur : 0;
            const valeurTotale = Math.floor(
                bien.prixAchatMoyen * bien.quantite * (1 + bonus)
            );

            const item = document.createElement("div");
            item.className = "bien-item";

            item.innerHTML = `
                <div class="bien-nom">${style}</div>

                <div class="bien-infos">
                    <div>Quantité : ${bien.quantite}</div>
                    <div>Prix moyen : ${bien.prixAchatMoyen.toLocaleString()} €</div>
                    <div>Valeur totale : ${valeurTotale.toLocaleString()} €</div>
                </div>

                <div class="bien-assurance">
                    ${afficherAssurance(bien)}
                </div>

                <div class="bien-renovation">
                    ${afficherRenovation(bien)}
                </div>

                <div class="bien-actions">
                    <!-- Aucun bouton, tout passe par les onglets -->
                </div>
            `;

            bloc.appendChild(item);
        }

        container.appendChild(bloc);
    }
}

// =======================================
// GEO EMPIRE — MODULE RENOVATION
// Compatible geoData + entrepriseCore
// =======================================

import { getData, saveData } from "../geoData.js";
import { refreshSiNecessaire } from "./immo-core.js";

export function initRenovation() {
    refreshSiNecessaire();

    const container = document.getElementById("renovation");
    container.innerHTML = "";

    const data = getData();
    const biens = data.entreprise.biens;

    // Aucun bien
    if (!biens || Object.keys(biens).length === 0) {
        container.innerHTML = `
            <p style="text-align:center; font-size:20px; color:#d9eaff;">
                Vous ne possédez aucun bien à rénover.
            </p>
        `;
        return;
    }

    // Parcours des catégories
    for (const categorie in biens) {
        const bloc = document.createElement("div");
        bloc.className = "renov-bloc";
        bloc.innerHTML = `<h2>${categorie}</h2>`;

        // Parcours des styles
        for (const style in biens[categorie]) {
            const bien = biens[categorie][style];

            // Niveau de rénovation (0 à 5)
            if (bien.renovation === null || bien.renovation === undefined) {
                bien.renovation = 0;
            }

            const item = document.createElement("div");
            item.className = "renov-item";

            item.innerHTML = `
                <div class="renov-niveau">
                    <strong>${style}</strong> — Niveau : 
                    <span style="color:#7ec8ff;">${bien.renovation}/5</span>
                </div>

                <button class="btn-renov-up">Améliorer</button>
                <button class="btn-renov-reset">Réinitialiser</button>
            `;

            // Bouton AMÉLIORER
            item.querySelector(".btn-renov-up").onclick = () => {
                if (bien.renovation < 5) {
                    bien.renovation++;
                    saveData();
                    initRenovation();
                }
            };

            // Bouton RÉINITIALISER
            item.querySelector(".btn-renov-reset").onclick = () => {
                bien.renovation = 0;
                saveData();
                initRenovation();
            };

            bloc.appendChild(item);
        }

        container.appendChild(bloc);
    }
}

window.initRenovation = initRenovation;

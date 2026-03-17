// =======================================
// GEO EMPIRE — MODULE ASSURANCES
// Compatible geoData + entrepriseCore
// =======================================

import { getData, saveData } from "../geoData.js";
import { immoState, refreshSiNecessaire } from "./immo-core.js";

export function initAssurances() {
    refreshSiNecessaire();

    const container = document.getElementById("assurances");
    container.innerHTML = "";

    const data = getData();
    const biens = data.entreprise.biens;

    // Si aucun bien
    if (!biens || Object.keys(biens).length === 0) {
        container.innerHTML = `
            <p style="text-align:center; font-size:20px; color:#d9eaff;">
                Vous ne possédez aucun bien à assurer.
            </p>
        `;
        return;
    }

    // Parcours des catégories
    for (const categorie in biens) {
        const bloc = document.createElement("div");
        bloc.className = "assurance-bloc";
        bloc.innerHTML = `<h2>${categorie}</h2>`;

        // Parcours des styles
        for (const style in biens[categorie]) {
            const bien = biens[categorie][style];

            const item = document.createElement("div");
            item.className = "assurance-item";

            const statut = bien.assurance ? 
                `<span style="color:#7ec8ff;">Assuré (${bien.assurance})</span>` :
                `<span style="color:#ff6b6b;">Non assuré</span>`;

            item.innerHTML = `
                <div class="assurance-statut">
                    <strong>${style}</strong> — ${statut}
                </div>

                <button class="btn-assurer">Assurer</button>
                <button class="btn-resilier">Résilier</button>
            `;

            // Bouton ASSURER
            item.querySelector(".btn-assurer").onclick = () => {
                bien.assurance = "Standard";
                saveData();
                initAssurances();
            };

            // Bouton RÉSILIER
            item.querySelector(".btn-resilier").onclick = () => {
                bien.assurance = null;
                saveData();
                initAssurances();
            };

            bloc.appendChild(item);
        }

        container.appendChild(bloc);
    }
}

window.initAssurances = initAssurances;

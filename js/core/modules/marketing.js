// ======================================================
//  GEO EMPIRE — MODULE MARKETING
//  Gestion des 6 clients, satisfaction, bonus cachés
// ======================================================

import { 
    getData, 
    saveData, 
    modifierSatisfaction 
} from "../geoData.js";

// ======================================================
//  INITIALISATION DE L'AFFICHAGE MARKETING
// ======================================================
export function initMarketing() {
    const zone = document.getElementById("marketing");
    const data = getData();
    const clients = data.entreprise.marketing.clients;

    zone.innerHTML = `
        <h2>Marketing</h2>

        <div class="clients-container">
            ${Object.entries(clients).map(([nom, c]) => `
                <div class="client-card" style="border-color:${c.couleur}">
                    <div class="client-header" style="background:${c.couleur}">
                        ${nom}
                    </div>

                    <div class="client-body">
                        <div class="client-color" style="background:${c.couleur}"></div>

                        <div class="client-actions">
                            <button class="btn-satisfaction" data-client="${nom}" data-val="1">+ Satisfaction</button>
                            <button class="btn-satisfaction" data-client="${nom}" data-val="-1">- Satisfaction</button>
                        </div>
                    </div>
                </div>
            `).join("")}
        </div>
    `;

    // Gestion des boutons satisfaction
    document.querySelectorAll(".btn-satisfaction").forEach(btn => {
        btn.onclick = () => {
            const client = btn.dataset.client;
            const val = Number(btn.dataset.val);

            modifierSatisfaction(client, val);
            initMarketing(); // rafraîchir
        };
    });
}

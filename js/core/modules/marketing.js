// ======================================================
//  GEO EMPIRE – MARKETING PREMIUM (VERSION CHAMP DE TEXTE)
// ======================================================

import { getData, saveData, modifierSatisfaction } from "../geoData.js";

// ======================================================
//  ACCÈS / SÉCURISATION DES DONNÉES
// ======================================================

function getMarketingRoot() {
    const data = getData();
    if (!data.entreprise) data.entreprise = {};
    if (!data.entreprise.marketing) data.entreprise.marketing = {};
    if (!data.entreprise.marketing.clients) data.entreprise.marketing.clients = {};

    return { data, entreprise: data.entreprise, marketing: data.entreprise.marketing };
}

// ======================================================
//  INITIALISATION MARKETING
// ======================================================

export function initMarketing() {
    const zone = document.getElementById("marketing");
    if (!zone) return;

    const { data, entreprise, marketing } = getMarketingRoot();

    // Si aucun client → on en crée 1
    if (Object.keys(marketing.clients).length === 0) {
        marketing.clients["client 1"] = {
            couleur: "rgb(120,180,255)",
            satisfaction: 0
        };
        saveData(data);
    }

    const clients = marketing.clients;

    zone.innerHTML = `
        <h2>Marketing</h2>

        <div class="clients-container">
            ${Object.entries(clients).map(([nom, c]) => `
                <div class="client-card" style="border-color:${c.couleur}">
                    <div class="client-header" style="background:${c.couleur}">
                        ${nom}
                    </div>

                    <div class="client-body">
                        <p>Satisfaction : <strong>${c.satisfaction ?? 0}</strong></p>

                        <div class="client-actions">
                            <button class="btn-satisfaction" data-client="${nom}" data-val="1">+ Satisfaction</button>
                            <button class="btn-satisfaction" data-client="${nom}" data-val="-1">- Satisfaction</button>
                        </div>

                        <div class="client-invest">
                            <input type="number" class="input-invest" data-client="${nom}" placeholder="Montant en GEO">
                            <button class="btn-invest" data-client="${nom}">Valider</button>
                        </div>
                    </div>
                </div>
            `).join("")}
        </div>
    `;

    // ======================================================
    //  BOUTONS SATISFACTION
    // ======================================================

    document.querySelectorAll(".btn-satisfaction").forEach(btn => {
        btn.onclick = () => {
            const client = btn.dataset.client;
            const val = Number(btn.dataset.val);
            modifierSatisfaction(client, val);
            initMarketing();
        };
    });

    // ======================================================
    //  BOUTON INVESTIR (CHAMP DE TEXTE)
// ======================================================

    document.querySelectorAll(".btn-invest").forEach(btn => {
        btn.onclick = () => {
            const client = btn.dataset.client;
            const input = document.querySelector(`.input-invest[data-client="${client}"]`);
            const montant = Number(input.value);

            const { data, entreprise } = getMarketingRoot();

            if (!montant || montant <= 0) {
                alert("Entre un montant valide.");
                return;
            }

            if (entreprise.argent < montant) {
                alert("Fonds insuffisants !");
                return;
            }

            // Débit
            entreprise.argent -= montant;

            // Bonus satisfaction invisible
            modifierSatisfaction(client, +1);

            saveData(data);
            initMarketing();
        };
    });
}

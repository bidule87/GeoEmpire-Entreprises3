// =======================================
//  GEO EMPIRE — BILAN COMPLET (NOUVEAU SYSTEME)
// =======================================

import { getData } from "../geoData.js";
import { calculerValeurEntreprise } from "../core/entrepriseCore.js";

// ===============================
//  TOTAL EMPIRE
// ===============================
window.ge_totalEmpire = function () {
    const data = getData();
    const e = data.entreprise;

    let total = 0;

    // Trésorerie
    total += e.argent;

    // Valeur totale de l'entreprise (biens + rénovations + bonus)
    total += calculerValeurEntreprise();

    // Tokens / Crowns si présents
    if (e.tokens) total += e.tokens;
    if (e.crowns) total += e.crowns;

    return total;
};

// ===============================
//  AFFICHAGE DU BILAN COMPLET
// ===============================
window.ge_afficherBilanComplet = function () {
    const zone = document.getElementById("bilan-complet");
    if (!zone) return;

    const data = getData();
    const e = data.entreprise;

    const total = ge_totalEmpire();

    // Valeur des biens (nouveau système)
    const valeurBiens = calculerValeurEntreprise();

    let html = `
        <h2>BILAN COMPLET</h2>

        <p><strong>Trésorerie :</strong> ${ge_formatArgent(e.argent)}</p>
        <p><strong>Tokens :</strong> ${ge_formatTokens(e.tokens || 0)}</p>
        <p><strong>Crowns :</strong> ${ge_formatCrowns(e.crowns || 0)}</p>

        <hr>

        <p><strong>Valeur totale des biens :</strong> ${ge_formatArgent(valeurBiens)}</p>

        <hr>

        <p><strong>VALEUR TOTALE DE L'EMPIRE :</strong> ${ge_formatArgent(total)}</p>
    `;

    zone.innerHTML = html;
};

// Auto-affichage si la zone existe
window.addEventListener("load", ge_afficherBilanComplet);

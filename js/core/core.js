// ===============================
//  GEOEMPIRE 3 - CORE SYSTEM (VERSION GEO DATA)
// ===============================

import { getData, addArgent, removeArgent } from "./geoData.js";

// ===============================
//  FORMATAGE
// ===============================

window.ge_formatArgent = n => n.toLocaleString("fr-FR") + " Ø";
window.ge_formatTokens = n => n + " GT";
window.ge_formatCrowns = n => n + " 👑";
window.ge_formatNom = n => n.charAt(0).toUpperCase() + n.slice(1);

// ===============================
//  ARGENT
// ===============================

window.ge_ajouterArgent = function (n) {
    addArgent(n);
    ge_afficherBilan();
};

window.ge_retirerArgent = function (n) {
    const e = getData().entreprise;
    if (e.argent < n) return false;

    removeArgent(n);
    ge_afficherBilan();
    return true;
};

// ===============================
//  NOTIFICATIONS
// ===============================

window.ge_notif = function (txt, type = "success") {
    const zone = document.getElementById("notif-zone");
    if (!zone) return;

    const div = document.createElement("div");
    div.className = "notif " + type;
    div.innerText = txt;

    zone.appendChild(div);

    setTimeout(() => div.remove(), 2500);
};

// ===============================
//  NAVIGATION
// ===============================

window.ouvrirPage = function (id) {
    document.querySelectorAll(".page").forEach(p => p.style.display = "none");

    const page = document.getElementById(id);
    if (page) page.style.display = "block";
};

// ===============================
//  BILAN RAPIDE (header)
// ===============================

window.ge_afficherBilan = function () {
    const e = getData().entreprise;
    const zone = document.getElementById("bilan-rapide");
    if (!zone) return;

    zone.innerHTML = `
        <p><strong>Ø</strong> ${ge_formatArgent(e.argent)}</p>
        <p><strong>GT</strong> ${ge_formatTokens(e.tokens || 0)}</p>
        <p><strong>👑</strong> ${ge_formatCrowns(e.crowns || 0)}</p>
    `;
};

// Auto-init
window.addEventListener("load", ge_afficherBilan);

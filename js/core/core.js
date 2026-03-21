// ===============================
//  GEOEMPIRE 3 - CORE SYSTEM (VERSION GEO DATA)
// ===============================

import { getData, addArgent, removeArgent, saveData } from "./geoData.js";

// ===============================
//  FORMATAGE
// ===============================

window.ge_formatArgent = n => n.toLocaleString("fr-FR") + " GEO";
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
//  BILAN RAPIDE (HUD)
// ===============================

window.ge_afficherBilan = function () {
    const e = getData().entreprise;
    const zone = document.getElementById("bilan-rapide");
    if (!zone) return;

    zone.innerHTML = `
        <p><strong>GEO</strong> ${ge_formatArgent(e.argent)}</p>
        <p><strong>GT</strong> ${ge_formatTokens(e.tokens || 0)}</p>
        <p><strong>👑</strong> ${ge_formatCrowns(e.crowns || 0)}</p>
    `;
};

// Auto-init
window.addEventListener("load", ge_afficherBilan);

// ===============================
// MODE CHEAT (sécurisé)
// ===============================

function ge_initCheat() {

    const cheatArgent = document.getElementById("btn-cheat-argent");
    if (cheatArgent) {
        cheatArgent.onclick = () => {
            addArgent(1000000);
            ge_afficherBilan();
            ge_notif("Cheat GEO +1.000.000", "success");
        };
    }

    const cheatTokens = document.getElementById("btn-cheat-tokens");
    if (cheatTokens) {
        cheatTokens.onclick = () => {
            const data = getData();
            data.entreprise.tokens = (data.entreprise.tokens || 0) + 100;
            saveData();
            ge_afficherBilan();
            ge_notif("Cheat GT +100", "success");
        };
    }

    const cheatCrowns = document.getElementById("btn-cheat-crowns");
    if (cheatCrowns) {
        cheatCrowns.onclick = () => {
            const data = getData();
            data.entreprise.crowns = (data.entreprise.crowns || 0) + 50;
            saveData();
            ge_afficherBilan();
            ge_notif("Cheat 👑 +50", "success");
        };
    }
}

window.addEventListener("load", ge_initCheat);

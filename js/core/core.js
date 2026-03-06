// ===============================
//  GEOEMPIRE 3 - CORE SYSTEM
// ===============================

// Données de l'entreprise
window.entreprise = {
    nom: "Mon Entreprise",
    tresorerie: 1000,
    tokens: 0,
    crowns: 0,
    patrimoine: [],
    immobilier: [],
    assurances: [],
    roles: [],
    actionnaires: [],
    position: null
};

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
    entreprise.tresorerie += n;
    ge_afficherBilan();
};

window.ge_retirerArgent = function (n) {
    if (entreprise.tresorerie < n) return false;
    entreprise.tresorerie -= n;
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
    const zone = document.getElementById("bilan-rapide");
    if (!zone) return;

    zone.innerHTML = `
        <p><strong>Ø</strong> ${ge_formatArgent(entreprise.tresorerie)}</p>
        <p><strong>GT</strong> ${ge_formatTokens(entreprise.tokens)}</p>
        <p><strong>👑</strong> ${ge_formatCrowns(entreprise.crowns)}</p>
    `;
};

// Auto-init
window.addEventListener("load", ge_afficherBilan);

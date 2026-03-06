// ===============================
//  GEOEMPIRE ENTREPRISES 3
//  SYSTEME CENTRAL
// ===============================

// Objet principal de l'entreprise
window.entreprise = {
    nom: "Empire",
    tresorerie: 5000,
    tokens: 0,
    crowns: 0,

    patrimoine: [],
    roles: [],
    actionnaires: [],

    position: null
};

// Mise à jour de la barre du haut
window.ge_afficherBilan = function () {
    document.getElementById("solde").innerText = entreprise.tresorerie.toLocaleString();
    document.getElementById("tokens").innerText = entreprise.tokens;
    document.getElementById("crowns").innerText = entreprise.crowns;
};

// Ajouter de l'argent
window.ge_ajouterArgent = function (montant) {
    entreprise.tresorerie += montant;
    ge_afficherBilan();
};

// Retirer de l'argent
window.ge_retirerArgent = function (montant) {
    if (entreprise.tresorerie < montant) return false;
    entreprise.tresorerie -= montant;
    ge_afficherBilan();
    return true;
};

// Initialisation globale
window.ge_initialiser = function () {
    ge_afficherBilan();
    console.log("GeoEmpire 3 initialisé.");
};

window.onload = ge_initialiser;

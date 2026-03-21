// ============================================
// GEO DATA — STOCKAGE GLOBAL DU JEU
// ============================================

let data = {
    entreprise: {
        capital: 0,
        argent: 0, // utilisé par acheter.js
        beneficeJournalier: 0,

        nom: "",
        logo: "",

        biens: {}, // { categorie: { style: { quantite, prixAchatMoyen } } }

        ventesEnAttente: [],
        locationsEnAttente: [],

        marketing: {
            totalInvestissements: 0,
            clients: {}
        },

        finances: {
            depensesMarketing: 0,
            revenusVentes: 0,
            revenusLocations: 0,
            primes: 0
        }
    }
};

// ============================================
// GETTER
// ============================================
export function getData() {
    return data;
}

// ============================================
// SAUVEGARDE
// ============================================
export function saveData() {
    localStorage.setItem("geoEmpireData", JSON.stringify(data));
}

// ============================================
// CHARGEMENT
// ============================================
export function loadData() {
    const saved = localStorage.getItem("geoEmpireData");
    if (saved) data = JSON.parse(saved);
}

// ============================================
// ARGENT
// ============================================
export function addArgent(montant) {
    data.entreprise.argent += montant;
    saveData();
}

export function removeArgent(montant) {
    data.entreprise.argent -= montant;
    if (data.entreprise.argent < 0) data.entreprise.argent = 0;
    saveData();
}

// ============================================
// NOM + LOGO
// ============================================
export function setNom(nouveauNom) {
    data.entreprise.nom = nouveauNom;
    saveData();
}

export function setLogo(url) {
    data.entreprise.logo = url;
    saveData();
}

// ============================================
// AJOUTER UN BIEN (VERSION COMPATIBLE ACHETER + GESTION)
// ============================================

export function addBien(categorie, style, prixAchat) {
    const e = data.entreprise;

    // Création catégorie si absente
    if (!e.biens[categorie]) {
        e.biens[categorie] = {};
    }

    // Création style si absent
    if (!e.biens[categorie][style]) {
        e.biens[categorie][style] = {
            quantite: 0,
            prixAchatMoyen: 0
        };
    }

    const bien = e.biens[categorie][style];

    // Mise à jour du prix moyen
    const totalAncien = bien.prixAchatMoyen * bien.quantite;
    const totalNouveau = totalAncien + prixAchat;

    bien.quantite += 1;
    bien.prixAchatMoyen = totalNouveau / bien.quantite;

    saveData();
}

// ============================================
// INITIALISATION
// ============================================
loadData();

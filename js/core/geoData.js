// ============================================
// GEO DATA — STOCKAGE GLOBAL DU JEU
// ============================================

let data = {
    entreprise: {
        capital: 0,
        beneficeJournalier: 0,

        logo: "",

        biens: {},
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
// AJOUT D'ARGENT (utilisé par core.js et systeme.js)
// ============================================
export function addArgent(montant) {
    data.entreprise.capital += montant;
    saveData();
}

// ============================================
// CHANGER LE LOGO (utilisé par entrepriseCore.js)
// ============================================
export function setLogo(url) {
    data.entreprise.logo = url;
    saveData();
}

// ============================================
// INITIALISATION
// ============================================
loadData();

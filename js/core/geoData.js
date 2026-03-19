// ============================================
// GEO DATA — STOCKAGE GLOBAL DU JEU
// ============================================

let data = {
    entreprise: {
        capital: 0,
        beneficeJournalier: 0,

        nom: "",
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
// AJOUT D'ARGENT
// ============================================
export function addArgent(montant) {
    data.entreprise.capital += montant;
    saveData();
}

// ============================================
// RETIRER DE L'ARGENT
// ============================================
export function removeArgent(montant) {
    data.entreprise.capital -= montant;
    if (data.entreprise.capital < 0) data.entreprise.capital = 0;
    saveData();
}

// ============================================
// CHANGER LE NOM DE L'ENTREPRISE
// ============================================
export function setNom(nouveauNom) {
    data.entreprise.nom = nouveauNom;
    saveData();
}

// ============================================
// CHANGER LE LOGO
// ============================================
export function setLogo(url) {
    data.entreprise.logo = url;
    saveData();
}

// ============================================
// INITIALISATION
// ============================================
loadData();

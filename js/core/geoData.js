// ============================================
// GEO DATA — STOCKAGE GLOBAL DU JEU
// ============================================

let data = {
    entreprise: {

        // CAPITAL DE L’ENTREPRISE
        capital: 0,

        // BÉNÉFICE JOURNALIER (pour les gros joueurs)
        beneficeJournalier: 0,

        // BIENS POSSEDÉS
        biens: {
            // Exemple :
            // "Maisons": {
            //     "Moderne": { quantite: 3, prixAchatMoyen: 120000 },
            // }
        },

        // VENTES EN ATTENTE
        ventesEnAttente: [],

        // LOCATIONS EN ATTENTE
        locationsEnAttente: [],

        // MARKETING
        marketing: {

            // Total investi par TOUS les joueurs (impact dynamique)
            totalInvestissements: 0,

            // Liste des clients marketing
            clients: {
                // Exemple :
                // "NOVA HABITAT": {
                //     couleur: "#FF4D4D",
                //     satisfaction: 0,
                //     bonus: 0,
                //     categorie: ["Maisons", "Appartements"],
                //     investissementInitial: 0
                // }
            }
        },

        // FINANCES
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
// MODIFIER SATISFACTION (MARKETING)
// ============================================
export function modifierSatisfaction(nom, valeur) {
    const client = data.entreprise.marketing.clients[nom];
    if (!client) return;

    client.satisfaction = Math.max(0, Math.min(30, client.satisfaction + valeur));
    saveData();
}

// ============================================
// INITIALISATION
// ============================================
loadData();

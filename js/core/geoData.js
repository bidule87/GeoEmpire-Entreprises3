// ============================================
// GEO DATA — STOCKAGE GLOBAL DU JEU (UNIFIÉ)
// ============================================

const SAVE_KEY = "geoEmpireData";

const defaultData = {
    entreprise: {
        capital: 50000,
        argent: 50000, // Argent disponible (Ø)
        tokens: 10,    // GeoTokens (GT)
        crowns: 0,     // Crowns (CRW)
        beneficeJournalier: 0,

        nom: "Mon Empire",
        logo: "",
        discord: "",
        description: "",

        // Biens immobiliers / stocks : { categorie: { style: { quantite, prixAchatMoyen } } }
        biens: {},

        // Commerces achetés via le GPS : [{ id, nom, type, lat, lng, prixAchat, revenuJour, directeur }]
        commercesGPS: [],

        // Équipe et joueurs gérants
        employes: [],
        actionnaires: [],

        // Protections contre les catastrophes / cambriolages
        assurances: {
            incendie: false,
            cambriolage: false,
            catastrophe: false
        },

        // Inventaire boutique (ex: cartes de téléportation)
        inventaire: {
            cartesTeleportation: 0
        },

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
            revenusCommerces: 0,
            primes: 0,
            pertesSinistres: 0
        },

        // Journal des actions et événements IA (cambriolages, incendies, achats...)
        historique: []
    }
};

// Clone profond pour éviter de modifier defaultData par référence
let data = JSON.parse(JSON.stringify(defaultData));

// ============================================
// GETTER
// ============================================
export function getData() {
    return data;
}

// ============================================
// SAUVEGARDE & HISTORIQUE
// ============================================
export function saveData() {
    try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch (e) {
        console.error("Erreur lors de la sauvegarde :", e);
    }
}

export function ajouterHistorique(message, type = "info") {
    data.entreprise.historique.unshift({
        date: new Date().toLocaleString("fr-FR"),
        message,
        type
    });
    // On garde les 100 derniers événements maximum
    if (data.entreprise.historique.length > 100) {
        data.entreprise.historique.pop();
    }
    saveData();
}

// ============================================
// CHARGEMENT (AVEC FUSION SÉCURISÉE)
// ============================================
export function loadData() {
    try {
        const saved = localStorage.getItem(SAVE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed && parsed.entreprise) {
                data.entreprise = {
                    ...defaultData.entreprise,
                    ...parsed.entreprise,
                    assurances: { ...defaultData.entreprise.assurances, ...(parsed.entreprise.assurances || {}) },
                    inventaire: { ...defaultData.entreprise.inventaire, ...(parsed.entreprise.inventaire || {}) },
                    marketing: { ...defaultData.entreprise.marketing, ...(parsed.entreprise.marketing || {}) },
                    finances: { ...defaultData.entreprise.finances, ...(parsed.entreprise.finances || {}) }
                };
            }
        }
    } catch (e) {
        console.error("Erreur lors du chargement :", e);
    }
}

export function resetData() {
    localStorage.removeItem(SAVE_KEY);
    data = JSON.parse(JSON.stringify(defaultData));
    saveData();
}

// ============================================
// ARGENT, TOKENS & CROWNS
// ============================================
export function addArgent(montant, raison = "") {
    data.entreprise.argent += montant;
    if (raison) ajouterHistorique(`+${montant.toLocaleString("fr-FR")} Ø : ${raison}`, "gain");
    else saveData();
}

export function removeArgent(montant, raison = "") {
    if (data.entreprise.argent < montant) {
        return false; // Fonds insuffisants
    }
    data.entreprise.argent -= montant;
    if (raison) ajouterHistorique(`-${montant.toLocaleString("fr-FR")} Ø : ${raison}`, "depense");
    else saveData();
    return true;
}

export function addTokens(n) {
    data.entreprise.tokens += n;
    saveData();
}

export function removeTokens(n) {
    if (data.entreprise.tokens < n) return false;
    data.entreprise.tokens -= n;
    saveData();
    return true;
}

export function addCrowns(n) {
    data.entreprise.crowns += n;
    saveData();
}

export function removeCrowns(n) {
    if (data.entreprise.crowns < n) return false;
    data.entreprise.crowns -= n;
    saveData();
    return true;
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
// AJOUTER UN BIEN (COMPATIBLE ACHETER + GESTION)
// ============================================
export function addBien(categorie, style, prixAchat) {
    const e = data.entreprise;

    if (!e.biens[categorie]) {
        e.biens[categorie] = {};
    }

    if (!e.biens[categorie][style]) {
        e.biens[categorie][style] = {
            quantite: 0,
            prixAchatMoyen: 0
        };
    }

    const bien = e.biens[categorie][style];

    const totalAncien = bien.prixAchatMoyen * bien.quantite;
    const totalNouveau = totalAncien + prixAchat;

    bien.quantite += 1;
    bien.prixAchatMoyen = totalNouveau / bien.quantite;

    ajouterHistorique(`Achat d'un bien (${categorie} - ${style}) pour ${prixAchat.toLocaleString("fr-FR")} Ø`, "achat");
}

// ============================================
// INITIALISATION
// ============================================
loadData();

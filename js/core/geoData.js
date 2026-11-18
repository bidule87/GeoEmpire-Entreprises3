// ============================================
// GEO DATA — STOCKAGE GLOBAL & HORLOGE MONDIALE
// Rythme : 24h réelles = 1 mois jeu | 12 jours = 1 an
// ============================================

const SAVE_KEY = "geoEmpireData";
const MS_PAR_MOIS_JEU = 24 * 60 * 60 * 1000; // 1 jour réel = 1 mois en jeu
const MOIS_PAR_AN_JEU = 12;                   // 12 jours réels = 1 an en jeu

const defaultData = {
    entreprise: {
        capital: 50000,
        argent: 50000, // Géo (Ø)
        tokens: 10,    // GeoTokens (GT)
        crowns: 0,     // Crowns (CRW)
        beneficeJournalier: 0,

        nom: "Mon Empire",
        pdg: "Fondateur",
        utilisateurActif: "Fondateur",
        logo: "",
        discord: "",
        description: "",

        prestigePack: false,
        betaTesteur: false,

        // Horloge mondiale persistante (UTC universel + fuseau local)
        tempsJeu: {
            debutTimestamp: Date.now(),
            dernierCalculTimestamp: Date.now(),
            moisEcoules: 0,
            fuseauJoueur: Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Paris"
        },

        // Biens immobiliers / stocks : { categorie: { style: { quantite, prixAchatMoyen, assurance } } }
        biens: {},

        // Entreprises achetées via le GPS
        commercesGPS: [],

        // Holding (débloquée à 10 entreprises)
        holding: {
            active: false,
            nom: "Ma Holding",
            dateCreation: null,
            bonusRevenus: 0.20,
            filialesIds: [],
            associes: []
        },

        employes: [],
        actionnaires: [],

        assurances: {
            incendie: false,
            cambriolage: false,
            catastrophe: false
        },

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

        historique: []
    }
};

let data = JSON.parse(JSON.stringify(defaultData));

export function getData() {
    return data;
}

export function saveData() {
    try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch (e) {
        console.error("Erreur lors de la sauvegarde :", e);
    }
}

export function ajouterHistorique(message, type = "info") {
    if (!Array.isArray(data.entreprise.historique)) {
        data.entreprise.historique = [];
    }
    data.entreprise.historique.unshift({
        date: new Date().toLocaleString("fr-FR"),
        message,
        type
    });
    if (data.entreprise.historique.length > 100) {
        data.entreprise.historique.pop();
    }
    saveData();
}

// ============================================
// HORLOGE MONDIALE & CALENDRIER DU JEU
// ============================================
export function getInfosTempsJeu() {
    const e = data.entreprise;
    if (!e.tempsJeu) {
        e.tempsJeu = {
            debutTimestamp: Date.now(),
            dernierCalculTimestamp: Date.now(),
            moisEcoules: 0,
            fuseauJoueur: Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Paris"
        };
    }

    const maintenant = Date.now();
    const totalMois = Math.floor((maintenant - e.tempsJeu.debutTimestamp) / MS_PAR_MOIS_JEU);
    const anneeJeu = Math.floor(totalMois / MOIS_PAR_AN_JEU) + 1;
    const moisDansAnnee = (totalMois % MOIS_PAR_AN_JEU) + 1;

    const fuseauLocal = Intl.DateTimeFormat().resolvedOptions().timeZone || "Local";
    const heureLocale = new Date().toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit"
    });

    return {
        anneeJeu,
        moisDansAnnee,
        totalMois,
        heureLocale,
        fuseauLocal
    };
}

export function traiterTempsEcoule() {
    const e = data.entreprise;
    if (!e.tempsJeu) return 0;

    const maintenant = Date.now();
    const diffMs = maintenant - e.tempsJeu.dernierCalculTimestamp;
    const nouveauxMois = Math.floor(diffMs / MS_PAR_MOIS_JEU);

    if (nouveauxMois <= 0) return 0;

    let revenuMensuelBase = 0;

    // 1. Revenus passifs des entreprises GPS détenues (1 500 Ø / mois par siège)
    const nbSieges = (e.commercesGPS || []).length;
    revenuMensuelBase += nbSieges * 1500;

    // 2. Revenus des biens en stock (1,5 % de leur valeur par mois)
    if (e.biens) {
        Object.values(e.biens).forEach(styles => {
            Object.values(styles).forEach(bien => {
                if ((bien.quantite || 0) > 0) {
                    revenuMensuelBase += Math.floor((bien.prixAchatMoyen || 0) * 0.015 * bien.quantite);
                }
            });
        });
    }

    // 3. Revenus des locations mises en attente avec ajustement de prix
    if (Array.isArray(e.locationsEnAttente)) {
        e.locationsEnAttente.forEach(loc => {
            const coef = 1 + ((loc.ajustement || 0) / 100);
            revenuMensuelBase += Math.floor((loc.prixAchatMoyen || 0) * 0.02 * (loc.quantite || 1) * coef);
        });
    }

    // Bonus Holding +20 % si active
    const multiplicateurHolding = e.holding?.active ? 1.20 : 1.0;
    const gainTotal = Math.floor(revenuMensuelBase * multiplicateurHolding * nouveauxMois);

    if (gainTotal > 0) {
        e.argent = (e.argent || 0) + gainTotal;
        e.finances.revenusLocations = (e.finances.revenusLocations || 0) + gainTotal;
        ajouterHistorique(
            `Bilan mensuel (${nouveauxMois} mois écoulé(s)) : +${gainTotal.toLocaleString("fr-FR")} Ø`,
            "gain"
        );
    }

    e.tempsJeu.dernierCalculTimestamp += nouveauxMois * MS_PAR_MOIS_JEU;
    e.tempsJeu.moisEcoules = (e.tempsJeu.moisEcoules || 0) + nouveauxMois;
    saveData();

    return nouveauxMois;
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
                    tempsJeu: { ...defaultData.entreprise.tempsJeu, ...(parsed.entreprise.tempsJeu || {}) },
                    holding: { ...defaultData.entreprise.holding, ...(parsed.entreprise.holding || {}) },
                    assurances: { ...defaultData.entreprise.assurances, ...(parsed.entreprise.assurances || {}) },
                    inventaire: { ...defaultData.entreprise.inventaire, ...(parsed.entreprise.inventaire || {}) },
                    marketing: { ...defaultData.entreprise.marketing, ...(parsed.entreprise.marketing || {}) },
                    finances: { ...defaultData.entreprise.finances, ...(parsed.entreprise.finances || {}) }
                };
            }
        }
        traiterTempsEcoule();
    } catch (e) {
        console.error("Erreur lors du chargement :", e);
    }
}

export function resetData() {
    localStorage.removeItem(SAVE_KEY);
    data = JSON.parse(JSON.stringify(defaultData));
    saveData();
}

export function addArgent(montant, raison = "") {
    data.entreprise.argent += montant;
    if (raison) ajouterHistorique(`+${montant.toLocaleString("fr-FR")} Ø : ${raison}`, "gain");
    else saveData();
}

export function removeArgent(montant, raison = "") {
    if (data.entreprise.argent < montant) {
        return false;
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

export function setNom(nouveauNom) {
    data.entreprise.nom = nouveauNom;
    saveData();
}

export function setLogo(url) {
    data.entreprise.logo = url;
    saveData();
}

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

loadData();

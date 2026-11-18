// ============================================
// GEO DATA — STOCKAGE GLOBAL, TRAÇABILITÉ & DOUBLE RYTHME
// Mode Normal : clôture à 00h00 locale (1 jour = 1 mois | 12 jours = 1 an)
// Mode Bêta   : clôture toutes les 1h réelles (pour tester rapidement)
// ============================================

const SAVE_KEY = "geoEmpireData";
const MS_PAR_HEURE = 60 * 60 * 1000;

function getCleJourLocal(dateObj = new Date()) {
    const annee = dateObj.getFullYear();
    const mois = String(dateObj.getMonth() + 1).padStart(2, "0");
    const jour = String(dateObj.getDate()).padStart(2, "0");
    return `${annee}-${mois}-${jour}`;
}

function calculerJoursEntreDatesLocales(cleDebut, cleFin) {
    const [y1, m1, d1] = cleDebut.split("-").map(Number);
    const [y2, m2, d2] = cleFin.split("-").map(Number);
    const utc1 = Date.UTC(y1, m1 - 1, d1);
    const utc2 = Date.UTC(y2, m2 - 1, d2);
    return Math.max(0, Math.floor((utc2 - utc1) / (24 * MS_PAR_HEURE)));
}

export function estModeBetaActif() {
    return (
        data?.entreprise?.betaTesteur === true ||
        localStorage.getItem("geoEmpireBeta") === "1"
    );
}

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
        caisseMairie: 0,

        tempsJeu: {
            dateDebutLocale: getCleJourLocal(),
            derniereClotureLocale: getCleJourLocal(),
            derniereClotureTimestamp: Date.now(),
            moisEcoules: 0,
            fuseauJoueur: Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Paris"
        },

        biens: {},
        commercesGPS: [],

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
            impotsVersesMairie: 0,
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

// ============================================
// JOURNAL HISTORIQUE AVEC TRAÇABILITÉ JOUEUR
// ============================================
export function ajouterHistorique(message, type = "info", auteurForce = null) {
    if (!Array.isArray(data.entreprise.historique)) {
        data.entreprise.historique = [];
    }
    const auteur = auteurForce || data.entreprise.utilisateurActif || data.entreprise.pdg || "Fondateur";
    data.entreprise.historique.unshift({
        date: new Date().toLocaleString("fr-FR"),
        auteur,
        message,
        type
    });
    if (data.entreprise.historique.length > 150) {
        data.entreprise.historique.pop();
    }
    saveData();
}

export function recalculerTotauxBiensGlobaux() {
    const e = data.entreprise;
    e.biens = {};
    (e.commercesGPS || []).forEach(siege => {
        if (!siege.biens) return;
        for (const [cat, styles] of Object.entries(siege.biens)) {
            for (const [style, info] of Object.entries(styles)) {
                if ((info.quantite || 0) <= 0) continue;
                if (!e.biens[cat]) e.biens[cat] = {};
                if (!e.biens[cat][style]) {
                    e.biens[cat][style] = { quantite: 0, prixAchatMoyen: info.prixAchatMoyen };
                }
                e.biens[cat][style].quantite += info.quantite;
            }
        }
    });
}

// ============================================
// HORLOGE MONDIALE & COMPTE À REBOURS
// ============================================
export function getInfosTempsJeu() {
    const e = data.entreprise;
    const aujourdHui = getCleJourLocal();
    if (!e.tempsJeu) {
        e.tempsJeu = {
            dateDebutLocale: aujourdHui,
            derniereClotureLocale: aujourdHui,
            derniereClotureTimestamp: Date.now(),
            moisEcoules: 0,
            fuseauJoueur: Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Paris"
        };
    }

    const totalMois = e.tempsJeu.moisEcoules || 0;
    const anneeJeu = Math.floor(totalMois / 12) + 1;
    const moisDansAnnee = (totalMois % 12) + 1;

    const maintenant = new Date();
    const modeBeta = estModeBetaActif();

    let diffMs = 0;
    if (modeBeta) {
        const dernierTs = e.tempsJeu.derniereClotureTimestamp || Date.now();
        diffMs = Math.max(0, (dernierTs + MS_PAR_HEURE) - maintenant.getTime());
    } else {
        const minuitProchain = new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate() + 1, 0, 0, 0);
        diffMs = Math.max(0, minuitProchain.getTime() - maintenant.getTime());
    }

    const heuresRestantes = Math.floor(diffMs / MS_PAR_HEURE);
    const minutesRestantes = Math.floor((diffMs % MS_PAR_HEURE) / (60 * 1000));
    const secondesRestantes = Math.floor((diffMs % (60 * 1000)) / 1000);

    return {
        modeBeta,
        anneeJeu,
        moisDansAnnee,
        totalMois,
        heureLocale: maintenant.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
        fuseauLocal: Intl.DateTimeFormat().resolvedOptions().timeZone || "Local",
        tempsAvantCloture: modeBeta
            ? `${minutesRestantes}min ${String(secondesRestantes).padStart(2, "0")}s`
            : `${heuresRestantes}h ${String(minutesRestantes).padStart(2, "0")}min`
    };
}

// ============================================
// CLÔTURE AUTOMATIQUE (1H EN BÊTA / 00H00 EN NORMAL)
// ============================================
export function traiterCloture() {
    const e = data.entreprise;
    const aujourdHui = getCleJourLocal();
    const maintenant = Date.now();

    if (!e.tempsJeu) {
        e.tempsJeu = {
            dateDebutLocale: aujourdHui,
            derniereClotureLocale: aujourdHui,
            derniereClotureTimestamp: maintenant,
            moisEcoules: 0,
            fuseauJoueur: Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Paris"
        };
        return 0;
    }

    const modeBeta = estModeBetaActif();
    let cyclesPasses = 0;

    if (modeBeta) {
        const dernierTs = e.tempsJeu.derniereClotureTimestamp || maintenant;
        cyclesPasses = Math.floor((maintenant - dernierTs) / MS_PAR_HEURE);
    } else {
        cyclesPasses = calculerJoursEntreDatesLocales(e.tempsJeu.derniereClotureLocale, aujourdHui);
    }

    if (cyclesPasses <= 0) return 0;

    const multiplicateurHolding = e.holding?.active ? 1.20 : 1.0;
    const tagCloture = modeBeta ? "Clôture Bêta (1h)" : "Clôture 00h00";
    let totalImpotsMairie = 0;

    // 1. Activation des locations mises en attente (le bien reste en stock et loué indéfiniment)
    if (Array.isArray(e.locationsEnAttente) && e.locationsEnAttente.length > 0) {
        e.locationsEnAttente.forEach(ordre => {
            const siege = (e.commercesGPS || []).find(s => String(s.id) === String(ordre.siegeId));
            const bien = siege?.biens?.[ordre.categorie]?.[ordre.style];
            if (bien && bien.quantite > 0) {
                bien.enLocation = Math.min(bien.quantite, ordre.quantite);
                bien.ajustementLoyer = ordre.ajustement || 0;
                bien.louePar = ordre.auteur || e.utilisateurActif;
                ajouterHistorique(
                    `${tagCloture} — Mise en location active : [${ordre.siegeNom}] ${bien.enLocation}× ${ordre.style} (demandé par ${bien.louePar})`,
                    "gain",
                    bien.louePar
                );
            }
        });
        e.locationsEnAttente = [];
    }

    // 2. Exécution des ventes mises en attente (le bien vendu quitte le stock)
    if (Array.isArray(e.ventesEnAttente) && e.ventesEnAttente.length > 0) {
        e.ventesEnAttente.forEach(ordre => {
            const siege = (e.commercesGPS || []).find(s => String(s.id) === String(ordre.siegeId));
            const bien = siege?.biens?.[ordre.categorie]?.[ordre.style];
            if (bien && bien.quantite > 0) {
                const qteVendue = Math.min(bien.quantite, ordre.quantite);
                const brut = Math.floor((bien.prixAchatMoyen || 15000) * 1.25 * (1 + (ordre.ajustement || 0) / 100) * qteVendue);
                const taxeMairie = Math.floor(brut * 0.10);
                const net = brut - taxeMairie;
                const vendeur = ordre.auteur || e.utilisateurActif;

                bien.quantite -= qteVendue;
                if ((bien.enLocation || 0) > bien.quantite) bien.enLocation = bien.quantite;

                e.argent = (e.argent || 0) + net;
                e.finances.revenusVentes = (e.finances.revenusVentes || 0) + net;
                totalImpotsMairie += taxeMairie;

                ajouterHistorique(
                    `${tagCloture} — Vente exécutée : [${ordre.siegeNom}] ${qteVendue}× ${ordre.style} → +${net.toLocaleString("fr-FR")} Ø (validé par ${vendeur})`,
                    "gain",
                    vendeur
                );
            }
        });
        e.ventesEnAttente = [];
        recalculerTotauxBiensGlobaux();
    }

    // 3. Encaissement des loyers récurrents (reconduits automatiquement à chaque cycle)
    let loyersBrutsCycle = 0;
    (e.commercesGPS || []).forEach(siege => {
        loyersBrutsCycle += 1500;
        if (!siege.biens) return;
        Object.values(siege.biens).forEach(styles => {
            Object.values(styles).forEach(bien => {
                // Les biens restent loués indéfiniment tant qu'ils ne sont pas vendus ou retirés
                const qteLoc = Math.min(bien.quantite || 0, bien.enLocation || 0);
                if (qteLoc > 0) {
                    const coef = 1 + ((bien.ajustementLoyer || 0) / 100);
                    loyersBrutsCycle += Math.floor((bien.prixAchatMoyen || 15000) * 0.02 * coef * qteLoc);
                }
            });
        });
    });

    if (loyersBrutsCycle > 0) {
        const brutTotal = Math.floor(loyersBrutsCycle * multiplicateurHolding * cyclesPasses);
        const charges = Math.floor(brutTotal * 0.10);
        const impots = Math.floor(brutTotal * 0.15);
        const netLoyers = brutTotal - charges - impots;

        totalImpotsMairie += impots;
        e.argent = (e.argent || 0) + netLoyers;
        e.finances.revenusLocations = (e.finances.revenusLocations || 0) + netLoyers;

        ajouterHistorique(
            `${tagCloture} (${cyclesPasses} cycle(s)) — Loyers mensuels encaissés : +${netLoyers.toLocaleString("fr-FR")} Ø`,
            "gain",
            "Système / Clôture"
        );
    }

    if (totalImpotsMairie > 0) {
        e.caisseMairie = (e.caisseMairie || 0) + totalImpotsMairie;
        e.finances.impotsVersesMairie = (e.finances.impotsVersesMairie || 0) + totalImpotsMairie;
    }

    if (modeBeta) {
        e.tempsJeu.derniereClotureTimestamp = (e.tempsJeu.derniereClotureTimestamp || maintenant) + cyclesPasses * MS_PAR_HEURE;
    }
    e.tempsJeu.derniereClotureLocale = aujourdHui;
    e.tempsJeu.moisEcoules = (e.tempsJeu.moisEcoules || 0) + cyclesPasses;
    saveData();

    return cyclesPasses;
}

// ============================================
// CHARGEMENT
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
        traiterCloture();
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
    if (data.entreprise.argent < montant) return false;
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

loadData();

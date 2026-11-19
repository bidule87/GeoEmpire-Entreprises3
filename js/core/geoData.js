// ============================================
// GEO DATA — STOCKAGE GLOBAL, MARCHÉ, BAUX & ÉVÉNEMENTS CLIMATIQUES
// Mode Normal : clôture à 00h00 locale (1 jour = 1 mois | 12 jours = 1 an)
// Mode Bêta   : clôture toutes les 1h réelles (pour tester rapidement)
// ============================================

import { getVisibilitePourCategorie, initialiserAgencesMarketing } from "./modules/marketing.js";

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

function genererDureeBailMarche() {
    const tirage = Math.random();
    if (tirage < 0.45) {
        const duree = Math.floor(Math.random() * 3) + 1;
        return { duree, libelle: "Court terme" };
    }
    if (tirage < 0.80) {
        const duree = Math.floor(Math.random() * 9) + 7;
        return { duree, libelle: "Moyen terme" };
    }
    const duree = Math.floor(Math.random() * 31) + 30;
    return { duree, libelle: "Long terme" };
}

function calculerTauxValidationMarche(visibilite, ajustementTarif = 0) {
    if (visibilite >= 75) return 1.0;
    let tauxBase = visibilite >= 35 ? 0.65 : 0.30;
    if (ajustementTarif > 20) tauxBase -= 0.10;
    else if (ajustementTarif < 0) tauxBase += 0.10;
    return Math.max(0.15, Math.min(1.0, tauxBase));
}

const defaultData = {
    entreprise: {
        capital: 50000,
        argent: 50000,
        tokens: 10,
        crowns: 0,
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
// CLÔTURE AUTOMATIQUE + MARCHÉ + BAUX + SINISTRES
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

    initialiserAgencesMarketing(e);
    const multiplicateurHolding = e.holding?.active ? 1.20 : 1.0;
    const tagCloture = modeBeta ? "Clôture Bêta (1h)" : "Clôture 00h00";
    let totalImpotsMairie = 0;

    // 1. Traitement des locations en attente
    if (Array.isArray(e.locationsEnAttente) && e.locationsEnAttente.length > 0) {
        const reliquatLocations = [];
        e.locationsEnAttente.forEach(ordre => {
            const siege = (e.commercesGPS || []).find(s => String(s.id) === String(ordre.siegeId));
            const bien = siege?.biens?.[ordre.categorie]?.[ordre.style];
            if (!bien || bien.quantite <= 0) return;

            const visibilite = getVisibilitePourCategorie(e, ordre.categorie);
            const taux = calculerTauxValidationMarche(visibilite, ordre.ajustement || 0);
            const qteLouee = Math.min(
                bien.quantite - (bien.enLocation || 0),
                Math.max(1, Math.round(ordre.quantite * taux))
            );
            const reste = ordre.quantite - qteLouee;

            if (qteLouee > 0) {
                const bailInfo = genererDureeBailMarche();
                bien.enLocation = (bien.enLocation || 0) + qteLouee;
                bien.ajustementLoyer = ordre.ajustement || 0;
                bien.cyclesRestantsBail = bailInfo.duree;
                bien.typeBail = bailInfo.libelle;
                bien.louePar = ordre.auteur || e.utilisateurActif;

                ajouterHistorique(
                    `${tagCloture} — Location validée : [${ordre.siegeNom}] ${qteLouee}× ${ordre.style} • Bail ${bailInfo.libelle} (${bailInfo.duree} cycle(s)) (par ${bien.louePar})`,
                    "gain",
                    bien.louePar
                );
            }

            if (reste > 0) {
                reliquatLocations.push({ ...ordre, quantite: reste });
            }
        });
        e.locationsEnAttente = reliquatLocations;
    }

    // 2. Traitement des ventes en attente
    if (Array.isArray(e.ventesEnAttente) && e.ventesEnAttente.length > 0) {
        const reliquatVentes = [];
        e.ventesEnAttente.forEach(ordre => {
            const siege = (e.commercesGPS || []).find(s => String(s.id) === String(ordre.siegeId));
            const bien = siege?.biens?.[ordre.categorie]?.[ordre.style];
            if (!bien || bien.quantite <= 0) return;

            const visibilite = getVisibilitePourCategorie(e, ordre.categorie);
            const taux = calculerTauxValidationMarche(visibilite, ordre.ajustement || 0);
            const qteVendue = Math.min(bien.quantite, Math.max(1, Math.round(ordre.quantite * taux)));
            const reste = ordre.quantite - qteVendue;

            if (qteVendue > 0) {
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
                    `${tagCloture} — Vente exécutée : [${ordre.siegeNom}] ${qteVendue}× ${ordre.style} → +${net.toLocaleString("fr-FR")} Ø (par ${vendeur})`,
                    "gain",
                    vendeur
                );
            }

            if (reste > 0) {
                const prixMoyen = bien.prixAchatMoyen || 15000;
                reliquatVentes.push({
                    ...ordre,
                    quantite: reste,
                    gainNetEstime: Math.floor(prixMoyen * 1.25 * (1 + (ordre.ajustement || 0) / 100) * 0.90 * reste)
                });
            }
        });
        e.ventesEnAttente = reliquatVentes;
        recalculerTotauxBiensGlobaux();
    }

    // 3. Encaissement des loyers actifs, événements climatiques & expiration des baux
    const CATASTROPHES = [
        { nom: "Tempête violente", degatsMin: 15, degatsMax: 35 },
        { nom: "Inondation locale", degatsMin: 20, degatsMax: 45 },
        { nom: "Incendie accidentel", degatsMin: 25, degatsMax: 55 },
        { nom: "Secousse sismique", degatsMin: 20, degatsMax: 50 }
    ];

    let loyersBrutsCycle = 0;
    const lotsExistants = [];

    (e.commercesGPS || []).forEach(siege => {
        loyersBrutsCycle += 1500;
        if (!siege.biens) return;
        Object.values(siege.biens).forEach(styles => {
            Object.entries(styles).forEach(([style, bien]) => {
                if ((bien.quantite || 0) > 0) {
                    if (typeof bien.etat !== "number") bien.etat = 100;
                    lotsExistants.push({ siege, style, bien });
                }

                const qteLoc = Math.min(bien.quantite || 0, bien.enLocation || 0);
                if (qteLoc > 0) {
                    const coefTarif = 1 + ((bien.ajustementLoyer || 0) / 100);
                    const coefStanding = 1 + (bien.renovation?.bonusValeur || 0);
                    const coefEtat = (typeof bien.etat === "number" ? bien.etat : 100) / 100;

                    loyersBrutsCycle += Math.floor((bien.prixAchatMoyen || 15000) * 0.02 * coefTarif * coefStanding * coefEtat * qteLoc);

                    if (typeof bien.cyclesRestantsBail === "number") {
                        bien.cyclesRestantsBail = Math.max(0, bien.cyclesRestantsBail - cyclesPasses);
                        if (bien.cyclesRestantsBail === 0) {
                            bien.enLocation = 0;
                            bien.typeBail = null;
                            ajouterHistorique(
                                `[${siege.nom}] Fin de bail sur ${style} : le bien est revenu disponible dans votre entreprise`,
                                "info",
                                "Système / Baux"
                            );
                        }
                    }
                }
            });
        });
    });

    // Événement naturel aléatoire (environ 22 % de risque par clôture si vous possédez des biens)
    if (lotsExistants.length > 0 && Math.random() < 0.22) {
        const cible = lotsExistants[Math.floor(Math.random() * lotsExistants.length)];
        const sinistre = CATASTROPHES[Math.floor(Math.random() * CATASTROPHES.length)];
        const degats = Math.floor(Math.random() * (sinistre.degatsMax - sinistre.degatsMin + 1)) + sinistre.degatsMin;

        cible.bien.etat = Math.max(10, (cible.bien.etat || 100) - degats);
        const valeurSinistre = Math.floor((cible.bien.prixAchatMoyen || 15000) * (cible.bien.quantite || 1) * 0.45 * (degats / 100));

        if (cible.bien.assurance) {
            const tauxCouv = (cible.bien.assurance.couverture || 0) / 100;
            const indemnite = Math.floor(valeurSinistre * tauxCouv);
            e.argent = (e.argent || 0) + indemnite;
            ajouterHistorique(
                `🌪️ ${sinistre.nom} sur [${cible.siege.nom}] ${cible.style} (-${degats} % état) • Assurance ${cible.bien.assurance.type} : +${indemnite.toLocaleString("fr-FR")} Ø versés`,
                "gain",
                "Assurance"
            );
        } else {
            e.finances.pertesSinistres = (e.finances.pertesSinistres || 0) + valeurSinistre;
            ajouterHistorique(
                `🌪️ ${sinistre.nom} sur [${cible.siege.nom}] ${cible.style} (-${degats} % état) • Non assuré (réparation requise dans Rénovation)`,
                "depense",
                "Sinistre"
            );
        }
    }

    if (loyersBrutsCycle > 0) {
        const brutTotal = Math.floor(loyersBrutsCycle * multiplicateurHolding * cyclesPasses);
        const charges = Math.floor(brutTotal * 0.10);
        const impots = Math.floor(brutTotal * 0.15);
        const netLoyers = brutTotal - charges - impots;

        totalImpotsMairie += impots;
        e.argent = (e.argent || 0) + netLoyers;
        e.finances.revenusLocations = (e.finances.revenusLocations || 0) + netLoyers;

        ajouterHistorique(
            `${tagCloture} (${cyclesPasses} cycle(s)) — Loyers encaissés : +${netLoyers.toLocaleString("fr-FR")} Ø`,
            "gain",
            "Système / Clôture"
        );
    }

    // 4. Usure naturelle de la visibilité marketing
    if (e.marketing?.clients) {
        Object.values(e.marketing.clients).forEach(ag => {
            if ((ag.cyclesMaintien || 0) > 0) {
                ag.cyclesMaintien = Math.max(0, ag.cyclesMaintien - cyclesPasses);
            } else {
                ag.visibilite = Math.max(10, (ag.visibilite || 20) - 6 * cyclesPasses);
            }
        });
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

if (typeof window !== "undefined") {
    window.addEventListener("storage", ev => {
        if (ev.key === SAVE_KEY) loadData();
    });
}

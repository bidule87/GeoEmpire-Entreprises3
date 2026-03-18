// ======================================================
//  GEO EMPIRE — MODULE MARKETING PREMIUM
//  6 clients, satisfaction, bonus cachés
//  + coût dynamique, saturation, nouveaux clients
//  + ventes / locations auto 24h
// ======================================================

import {
    getData,
    saveData,
    modifierSatisfaction
} from "../geoData.js";

// ======================================================
//  CONSTANTES
// ======================================================

const DEMANDE = {
    FAIBLE: "faible",
    MOYENNE: "moyenne",
    FORTE: "forte"
};

const DUREES_CONTRATS = [2, 6, 12]; // en cycles (mois jeu)
const SATIS_MAX = 5;
const JOURS_SATURATION = 5; // nb de cycles à satisfaction max avant saturation

// ======================================================
//  ACCÈS / SÉCURISATION DES DONNÉES
// ======================================================

function getMarketingRoot() {
    const data = getData();
    if (!data.entreprise) data.entreprise = {};
    if (!data.entreprise.marketing) data.entreprise.marketing = {};
    if (!data.entreprise.marketing.clients) data.entreprise.marketing.clients = {};
    if (!data.entreprise.marketing.marche) data.entreprise.marketing.marche = {};
    return { data, entreprise: data.entreprise, marketing: data.entreprise.marketing };
}

function getClientsArray(clients) {
    return Object.entries(clients || {}).map(([nom, c]) => ({
        nom,
        ...c
    }));
}

// ======================================================
//  STATS MARKETING (BONUS CACHÉS)
// ======================================================

function computeSatisfactionMoyenne(clients) {
    const arr = getClientsArray(clients);
    if (!arr.length) return 0;
    const total = arr.reduce((s, c) => s + (c.satisfaction || 0), 0);
    return total / arr.length;
}

function computeDemande(satMoy) {
    if (satMoy <= -1) return DEMANDE.FAIBLE;
    if (satMoy >= 2) return DEMANDE.FORTE;
    return DEMANDE.MOYENNE;
}

function computeTauxVente(clients, demande) {
    let base = 0.02;
    if (demande === DEMANDE.FORTE) base += 0.03;
    if (demande === DEMANDE.MOYENNE) base += 0.01;

    const arr = getClientsArray(clients);
    const bonus = arr.reduce((s, c) => {
        if ((c.satisfaction || 0) >= 3) return s + 0.005;
        return s;
    }, 0);

    return base + bonus;
}

function computeTauxLocation(clients, demande) {
    let base = 0.05;
    if (demande === DEMANDE.FORTE) base += 0.05;
    if (demande === DEMANDE.MOYENNE) base += 0.02;

    const arr = getClientsArray(clients);
    const bonus = arr.reduce((s, c) => {
        if ((c.satisfaction || 0) >= 2) return s + 0.005;
        return s;
    }, 0);

    return base + bonus;
}

function computeVisibilite(clients) {
    const arr = getClientsArray(clients);
    let mult = 1;
    arr.forEach(c => {
        const s = c.satisfaction || 0;
        if (s >= 3) mult += 0.1;
        if (s <= -2) mult -= 0.05;
    });
    if (mult < 0.5) mult = 0.5;
    return mult;
}

function computeRotation(clients) {
    const satMoy = computeSatisfactionMoyenne(clients);
    let rot = 0.1;
    if (satMoy >= 2) rot += 0.1;
    if (satMoy <= -1) rot -= 0.05;
    if (rot < 0.02) rot = 0.02;
    return rot;
}

function computeLatenceCycles(clients) {
    const satMoy = computeSatisfactionMoyenne(clients);
    if (satMoy >= 3) return 0;
    if (satMoy >= 1) return 1;
    return 2;
}

function pickContratDuree(clients) {
    const satMoy = computeSatisfactionMoyenne(clients);
    if (satMoy >= 3) return 12;
    if (satMoy >= 1) return 6;
    return 2;
}

// ======================================================
//  COÛT MARKETING DYNAMIQUE (5% à 30%)
//  A = CA du jour / capital / apport initial / argent
// ======================================================

function calculerBaseInvestissement(entreprise, satMoy) {
    const caJour = entreprise?.finances?.chiffreAffairesJour ?? 0;
    const capital = entreprise?.capital ?? 0;
    const apport = entreprise?.apportInitial ?? 0;
    const fallback = entreprise?.argent ?? 0;

    let baseSource = 0;
    if (caJour > 0) baseSource = caJour;
    else if (capital > 0) baseSource = capital;
    else if (apport > 0) baseSource = apport;
    else baseSource = fallback;

    // satMoy de -∞ à +∞ → on le ramène entre 0 et 1
    const satNorm = Math.max(0, Math.min(1, (satMoy + 2) / 6)); // approx
    const taux = 0.05 + (0.25 * satNorm); // entre 5% et 30%

    const montant = Math.round(baseSource * taux);
    return Math.max(100, montant); // minimum 100 pour éviter 0
}

// ======================================================
//  SATURATION & NOUVEAUX CLIENTS
// ======================================================

function ensureClientStructure(client) {
    if (typeof client.satisfaction !== "number") client.satisfaction = 0;
    if (typeof client.joursSaturation !== "number") client.joursSaturation = 0;
    if (typeof client.sature !== "boolean") client.sature = false;
}

function mettreAJourSaturationClients(marketing) {
    const clients = marketing.clients;
    Object.values(clients).forEach(c => {
        ensureClientStructure(c);
        if (c.satisfaction >= SATIS_MAX) {
            c.joursSaturation += 1;
            if (c.joursSaturation >= JOURS_SATURATION) {
                c.sature = true;
            }
        } else {
            c.joursSaturation = 0;
            c.sature = false;
        }
    });
}

function genererCouleurAleatoire() {
    const r = Math.floor(80 + Math.random() * 150);
    const g = Math.floor(80 + Math.random() * 150);
    const b = Math.floor(80 + Math.random() * 150);
    return `rgb(${r},${g},${b})`;
}

function genererNouveauClient(marketing) {
    const index = Object.keys(marketing.clients).length + 1;
    const nom = `Client ${index}`;
    marketing.clients[nom] = {
        couleur: genererCouleurAleatoire(),
        satisfaction: 0,
        joursSaturation: 0,
        sature: false
    };
}

function verifierEtGenererNouveauxClients(marketing) {
    const clients = marketing.clients;
    const arr = getClientsArray(clients);
    const nbSatures = arr.filter(c => c.sature).length;

    // Si au moins la moitié des clients sont saturés → on en ajoute un
    if (arr.length > 0 && nbSatures >= Math.ceil(arr.length / 2)) {
        genererNouveauClient(marketing);
    }
}

// ======================================================
//  STATS MARCHÉ (EXPOSÉES / STOCKÉES)
// ======================================================

export function getStatsMarche() {
    const { data, marketing } = getMarketingRoot();
    const clients = marketing.clients;

    const satisfactionMoyenne = computeSatisfactionMoyenne(clients);
    const demande = computeDemande(satisfactionMoyenne);
    const tauxVente = computeTauxVente(clients, demande);
    const tauxLocation = computeTauxLocation(clients, demande);
    const visibilite = computeVisibilite(clients);
    const rotation = computeRotation(clients);
    const latenceCycles = computeLatenceCycles(clients);
    const dureeContrat = pickContratDuree(clients);

    const stats = {
        satisfactionMoyenne,
        demande,
        tauxVente,
        tauxLocation,
        visibilite,
        rotation,
        latenceCycles,
        dureeContrat
    };

    marketing.marche = stats;
    saveData(data);
    return stats;
}

// ======================================================
//  OUTILS BIENS / CONTRATS
// ======================================================

function getAllBiens(entreprise) {
    const biens = entreprise?.biens || {};
    const liste = [];
    Object.entries(biens).forEach(([type, styles]) => {
        Object.entries(styles || {}).forEach(([id, bien]) => {
            liste.push({ type, id, ref: bien });
        });
    });
    return liste;
}

function ensureBienStructure(bien) {
    if (!bien.statut) bien.statut = "libre"; // libre / loue / en_vente / vendu
    if (!bien.dateAchat) bien.dateAchat = Date.now();
    if (bien.latenceRestante === undefined || bien.latenceRestante === null) {
        bien.latenceRestante = 0;
    }
    if (!bien.contrat) bien.contrat = null;
}

function filtrerBiensEligiblesVente(biens) {
    return biens.filter(b => {
        const bien = b.ref;
        ensureBienStructure(bien);
        if (bien.statut !== "libre" && bien.statut !== "en_vente") return false;
        if (bien.latenceRestante > 0) return false;
        return true;
    });
}

function filtrerBiensEligiblesLocation(biens) {
    return biens.filter(b => {
        const bien = b.ref;
        ensureBienStructure(bien);
        if (bien.statut !== "libre") return false;
        if (bien.latenceRestante > 0) return false;
        if (bien.contrat) return false;
        return true;
    });
}

function randomPick(array, maxCount) {
    if (array.length <= maxCount) return array;
    const copy = [...array];
    const result = [];
    while (result.length < maxCount && copy.length > 0) {
        const idx = Math.floor(Math.random() * copy.length);
        result.push(copy.splice(idx, 1)[0]);
    }
    return result;
}

function appliquerVentesAutomatiques(entreprise, stats) {
    const biens = getAllBiens(entreprise);
    const eligibles = filtrerBiensEligiblesVente(biens);

    const maxVentes = Math.max(1, Math.floor(eligibles.length * stats.tauxVente * stats.visibilite));
    const aVendre = randomPick(eligibles, maxVentes);

    aVendre.forEach(b => {
        const bien = b.ref;
        ensureBienStructure(bien);

        const prixAchat = bien.prixAchatMoyen || bien.prixAchat || 0;
        const plusValueBonus = 0.05 + (stats.rotation * 0.1);
        const prixVente = Math.round(prixAchat * (1 + plusValueBonus));

        entreprise.argent = (entreprise.argent || 0) + prixVente;

        bien.statut = "vendu";
        bien.contrat = null;
        bien.latenceRestante = 0;
        bien.prixVenteDernier = prixVente;
        bien.plusValueDerniere = prixVente - prixAchat;
    });
}

function appliquerLocationsAutomatiques(entreprise, stats) {
    const biens = getAllBiens(entreprise);
    const eligibles = filtrerBiensEligiblesLocation(biens);

    const maxLocations = Math.max(1, Math.floor(eligibles.length * stats.tauxLocation * stats.visibilite));
    const aLouer = randomPick(eligibles, maxLocations);

    aLouer.forEach(b => {
        const bien = b.ref;
        ensureBienStructure(bien);

        const duree = stats.dureeContrat;
        const loyer = bien.loyer || 0;

        bien.statut = "loue";
        bien.contrat = {
            type: "location",
            cyclesRestants: duree,
            loyer
        };
        bien.latenceRestante = 0;
    });
}

function appliquerContratsEnCours(entreprise) {
    const biens = getAllBiens(entreprise);
    biens.forEach(b => {
        const bien = b.ref;
        ensureBienStructure(bien);

        if (bien.contrat && bien.contrat.type === "location") {
            const loyer = bien.contrat.loyer || 0;
            entreprise.argent = (entreprise.argent || 0) + loyer;

            bien.contrat.cyclesRestants -= 1;
            if (bien.contrat.cyclesRestants <= 0) {
                bien.contrat = null;
                bien.statut = "libre";
                bien.latenceRestante = 1;
            }
        }
    });
}

function decrementerLatence(entreprise) {
    const biens = getAllBiens(entreprise);
    biens.forEach(b => {
        const bien = b.ref;
        ensureBienStructure(bien);
        if (bien.latenceRestante > 0) {
            bien.latenceRestante -= 1;
            if (bien.latenceRestante < 0) bien.latenceRestante = 0;
        }
    });
}

// ======================================================
//  CYCLE 24H — À APPELER PAR TON SYSTÈME GLOBAL
// ======================================================

export function appliquerCycleMarche24h() {
    const { data, entreprise, marketing } = getMarketingRoot();
    if (!entreprise) return;

    const stats = getStatsMarche();

    decrementerLatence(entreprise);
    appliquerContratsEnCours(entreprise);
    appliquerVentesAutomatiques(entreprise, stats);
    appliquerLocationsAutomatiques(entreprise, stats);

    mettreAJourSaturationClients(marketing);
    verifierEtGenererNouveauxClients(marketing);

    saveData(data);
}

// ======================================================
//  UI MARKETING — AVEC INVESTISSEMENT
// ======================================================

export function initMarketing() {
    const zone = document.getElementById("marketing");
    if (!zone) return;

    const { data, entreprise, marketing } = getMarketingRoot();
    const clients = marketing.clients;
    const stats = getStatsMarche();
    const satMoy = stats.satisfactionMoyenne;
    const coutBase = calculerBaseInvestissement(entreprise, satMoy);

    zone.innerHTML = `
        <h2>Marketing</h2>

        <div class="marketing-stats">
            <p>Demande du marché : <strong>${stats.demande}</strong></p>
            <p>Taux de vente : <strong>${(stats.tauxVente * 100).toFixed(1)}%</strong></p>
            <p>Taux de location : <strong>${((stats.tauxLocation) * 100).toFixed(1)}%</strong></p>
        </div>

        <div class="clients-container">
            ${Object.entries(clients).map(([nom, c]) => `
                <div class="client-card" style="border-color:${c.couleur}">
                    <div class="client-header" style="background:${c.couleur}">
                        ${nom} ${c.sature ? "(saturé)" : ""}
                    </div>

                    <div class="client-body">
                        <div class="client-color" style="background:${c.couleur}"></div>

                        <div class="client-info">
                            <p>Satisfaction : <strong>${c.satisfaction ?? 0}</strong></p>
                        </div>

                        <div class="client-actions">
                            <button class="btn-satisfaction" data-client="${nom}" data-val="1">+ Satisfaction</button>
                            <button class="btn-satisfaction" data-client="${nom}" data-val="-1">- Satisfaction</button>
                            <button class="btn-invest" data-client="${nom}">
                                Investir (coût estimé)
                            </button>
                        </div>
                    </div>
                </div>
            `).join("")}
        </div>
    `;

    document.querySelectorAll(".btn-satisfaction").forEach(btn => {
        btn.onclick = () => {
            const client = btn.dataset.client;
            const val = Number(btn.dataset.val);
            modifierSatisfaction(client, val);
            initMarketing();
        };
    });

    document.querySelectorAll(".btn-invest").forEach(btn => {
        btn.onclick = () => {
            const clientNom = btn.dataset.client;
            const { data: d2, entreprise: e2, marketing: m2 } = getMarketingRoot();
            const stats2 = getStatsMarche();
            const cout = calculerBaseInvestissement(e2, stats2.satisfactionMoyenne);

            if ((e2.argent || 0) < cout) {
                alert("Fonds insuffisants pour investir en marketing.");
                return;
            }

            e2.argent -= cout;
            modifierSatisfaction(clientNom, +1);

            // On marque un petit boost de rotation / visibilité indirect via stats recalculées
            saveData(d2);
            initMarketing();
        };
    });
}

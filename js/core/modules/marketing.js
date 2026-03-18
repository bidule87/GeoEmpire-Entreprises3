// ======================================================
//  GEO EMPIRE — MODULE MARKETING (PREMIUM)
//  Gestion des 6 clients, satisfaction, bonus cachés
//  + Logique marché : demande, ventes, locations, latence
// ======================================================

import {
    getData,
    saveData,
    modifierSatisfaction
} from "../geoData.js";

// ======================================================
//  CONSTANTES MARCHÉ (NE CASSENT RIEN, JUSTE DES BASES)
// ======================================================

const DEMANDE = {
    FAIBLE: "faible",
    MOYENNE: "moyenne",
    FORTE: "forte"
};

// Durées de contrats en "mois jeu" = cycles 24h
const DUREES_CONTRATS = [2, 6, 12]; // 2 mois, 6 mois, 1 an

// ======================================================
//  OUTILS INTERNES — CALCUL DES BONUS À PARTIR DES CLIENTS
// ======================================================

function getMarketingData() {
    const data = getData();
    if (!data.entreprise.marketing) {
        data.entreprise.marketing = {
            clients: {},
            marche: {}
        };
    }
    if (!data.entreprise.marketing.marche) {
        data.entreprise.marketing.marche = {};
    }
    return { data, marketing: data.entreprise.marketing };
}

function getClientsArray(clients) {
    return Object.entries(clients || {}).map(([nom, c]) => ({
        nom,
        ...c
    }));
}

function computeSatisfactionMoyenne(clients) {
    const arr = getClientsArray(clients);
    if (arr.length === 0) return 0;
    const total = arr.reduce((sum, c) => sum + (c.satisfaction || 0), 0);
    return total / arr.length;
}

function computeDemande(satisfactionMoyenne) {
    if (satisfactionMoyenne <= -1) return DEMANDE.FAIBLE;
    if (satisfactionMoyenne >= 2) return DEMANDE.FORTE;
    return DEMANDE.MOYENNE;
}

function computeTauxVente(clients, demande) {
    // Base très prudente
    let base = 0.02; // 2% du parc max par cycle

    if (demande === DEMANDE.FORTE) base += 0.03; // +3%
    if (demande === DEMANDE.MOYENNE) base += 0.01; // +1%

    // Bonus clients : chaque client très satisfait booste un peu
    const arr = getClientsArray(clients);
    const bonus = arr.reduce((sum, c) => {
        if ((c.satisfaction || 0) >= 3) return sum + 0.005; // +0.5% par client très content
        return sum;
    }, 0);

    return base + bonus;
}

function computeTauxLocation(clients, demande) {
    // Base plus élevée que la vente
    let base = 0.05; // 5% du parc max par cycle

    if (demande === DEMANDE.FORTE) base += 0.05; // +5%
    if (demande === DEMANDE.MOYENNE) base += 0.02; // +2%

    const arr = getClientsArray(clients);
    const bonus = arr.reduce((sum, c) => {
        if ((c.satisfaction || 0) >= 2) return sum + 0.005; // +0.5% par client content
        return sum;
    }, 0);

    return base + bonus;
}

function computeVisibilite(clients) {
    // Multiplicateur global
    const arr = getClientsArray(clients);
    let mult = 1;

    arr.forEach(c => {
        const s = c.satisfaction || 0;
        if (s >= 3) mult += 0.1;   // +10% visibilité
        if (s <= -2) mult -= 0.05; // -5% visibilité
    });

    if (mult < 0.5) mult = 0.5;
    return mult;
}

function computeRotation(clients) {
    // Vitesse du marché
    const satisfactionMoyenne = computeSatisfactionMoyenne(clients);
    let rotation = 0.1; // 10% base

    if (satisfactionMoyenne >= 2) rotation += 0.1;
    if (satisfactionMoyenne <= -1) rotation -= 0.05;

    if (rotation < 0.02) rotation = 0.02;
    return rotation;
}

function computeLatenceCycles(clients) {
    // Latence par défaut : 1 cycle
    const satisfactionMoyenne = computeSatisfactionMoyenne(clients);
    if (satisfactionMoyenne >= 3) return 0;   // marché ultra réactif
    if (satisfactionMoyenne >= 1) return 1;   // normal
    return 2;                                 // marché lent
}

function pickContratDuree(clients) {
    // Plus les clients sont contents, plus les contrats sont longs
    const satisfactionMoyenne = computeSatisfactionMoyenne(clients);
    if (satisfactionMoyenne >= 3) return 12; // 1 an jeu
    if (satisfactionMoyenne >= 1) return 6;  // 6 mois jeu
    return 2;                                // 2 mois jeu
}

// ======================================================
//  CALCUL GLOBAL DU MARCHÉ (BONUS CACHÉS)
// ======================================================

export function getStatsMarche() {
    const { data, marketing } = getMarketingData();
    const clients = marketing.clients || {};

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

    // On stocke dans data pour debug / futur affichage si tu veux
    marketing.marche = stats;
    saveData(data);

    return stats;
}

// ======================================================
//  LOGIQUE 24H — VENTES & LOCATIONS (NON INTRUSIVE)
// ======================================================

function getAllBiens(entreprise) {
    const biens = entreprise?.biens || {};
    const liste = [];

    Object.entries(biens).forEach(([type, styles]) => {
        Object.entries(styles || {}).forEach(([id, bien]) => {
            liste.push({
                type,
                id,
                ref: bien
            });
        });
    });

    return liste;
}

function ensureBienStructure(bienRef) {
    if (!bienRef.statut) bienRef.statut = "libre"; // libre / loue / en_vente / vendu
    if (!bienRef.dateAchat) bienRef.dateAchat = Date.now();
    if (!bienRef.latenceRestante && bienRef.latenceRestante !== 0) {
        bienRef.latenceRestante = 0;
    }
    if (!bienRef.contrat) {
        bienRef.contrat = null; // { type: "location", cyclesRestants: n, loyer: x }
    }
}

function filtrerBiensEligiblesVente(biens, stats) {
    return biens.filter(b => {
        const bien = b.ref;
        ensureBienStructure(bien);

        if (bien.statut !== "libre" && bien.statut !== "en_vente") return false;
        if (bien.latenceRestante > 0) return false;

        return true;
    });
}

function filtrerBiensEligiblesLocation(biens, stats) {
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
    const eligibles = filtrerBiensEligiblesVente(biens, stats);

    const maxVentes = Math.max(1, Math.floor(eligibles.length * stats.tauxVente * stats.visibilite));
    const aVendre = randomPick(eligibles, maxVentes);

    aVendre.forEach(b => {
        const bien = b.ref;
        ensureBienStructure(bien);

        // Prix de vente simple : prixAchatMoyen * (1 + petite plus-value)
        const prixAchat = bien.prixAchatMoyen || bien.prixAchat || 0;
        const plusValueBonus = 0.05 + (stats.rotation * 0.1); // 5% + bonus rotation
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
    const eligibles = filtrerBiensEligiblesLocation(biens, stats);

    const maxLocations = Math.max(1, Math.floor(eligibles.length * stats.tauxLocation * stats.visibilite));
    const aLouer = randomPick(eligibles, maxLocations);

    aLouer.forEach(b => {
        const bien = b.ref;
        ensureBienStructure(bien);

        const duree = stats.dureeContrat; // en cycles
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
            // Le loyer tombe
            const loyer = bien.contrat.loyer || 0;
            entreprise.argent = (entreprise.argent || 0) + loyer;

            // On réduit la durée
            bien.contrat.cyclesRestants -= 1;

            if (bien.contrat.cyclesRestants <= 0) {
                // Fin de contrat
                bien.contrat = null;
                bien.statut = "libre";
                // On peut remettre une petite latence avant prochaine location
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
//  FONCTION PRINCIPALE — À APPELER AU CYCLE 24H
// ======================================================

export function appliquerCycleMarche24h() {
    const { data } = getMarketingData();
    const entreprise = data.entreprise;

    if (!entreprise) return;

    const stats = getStatsMarche();

    // 1) Latence
    decrementerLatence(entreprise);

    // 2) Contrats en cours (loyers, fin de contrats)
    appliquerContratsEnCours(entreprise);

    // 3) Ventes automatiques
    appliquerVentesAutomatiques(entreprise, stats);

    // 4) Locations automatiques
    appliquerLocationsAutomatiques(entreprise, stats);

    saveData(data);
}

// ======================================================
//  INITIALISATION DE L'AFFICHAGE MARKETING (TON CODE)
//  — INTACT, JUSTE LÉGÈREMENT ENRICHI SI TU VEUX PLUS TARD
// ======================================================

export function initMarketing() {
    const zone = document.getElementById("marketing");
    if (!zone) return;

    const { data, marketing } = getMarketingData();
    const clients = marketing.clients;

    zone.innerHTML = `
        <h2>Marketing</h2>

        <div class="clients-container">
            ${Object.entries(clients).map(([nom, c]) => `
                <div class="client-card" style="border-color:${c.couleur}">
                    <div class="client-header" style="background:${c.couleur}">
                        ${nom}
                    </div>

                    <div class="client-body">
                        <div class="client-color" style="background:${c.couleur}"></div>

                        <div class="client-actions">
                            <button class="btn-satisfaction" data-client="${nom}" data-val="1">+ Satisfaction</button>
                            <button class="btn-satisfaction" data-client="${nom}" data-val="-1">- Satisfaction</button>
                        </div>
                    </div>
                </div>
            `).join("")}
        </div>
    `;

    // Gestion des boutons satisfaction
    document.querySelectorAll(".btn-satisfaction").forEach(btn => {
        btn.onclick = () => {
            const client = btn.dataset.client;
            const val = Number(btn.dataset.val);

            modifierSatisfaction(client, val);
            initMarketing(); // rafraîchir
        };
    });
}

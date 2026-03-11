// ===============================
//  MODULE IA IMMOBILIER PREMIUM
// ===============================

const NOMBRE_STYLES = 50;
const MIN_QUANTITE = 10000;
const MAX_QUANTITE = 100000;
const REFRESH_INTERVAL = 60 * 60 * 1000;

export const immoState = {
    styles: {},
    quantites: {},
    lastRefresh: 0
};

const STYLES_PAR_CATEGORIE = {
    "Appartements": [
        "Appartement F2 Luxe", "Appartement F3 Moderne", "Appartement Duplex",
        "Appartement Penthouse", "Appartement Studio Cosy", "Appartement Loft Industriel",
        "Appartement Haussmannien", "Appartement Vue Mer", "Appartement Horizon Bleu",
        "Appartement Résidence Premium", "Appartement SkyLine", "Appartement Urban Chic",
        "Appartement Panorama", "Appartement Royal", "Appartement Émeraude",
        "Appartement Quartz", "Appartement Nova", "Appartement Solaris",
        "Appartement Opaline", "Appartement Prestige"
    ],
    "Maisons": [
        "Maison Moderne", "Maison de Luxe", "Maison Familiale", "Maison Bord de Mer",
        "Villa Émeraude", "Villa Prestige", "Villa Horizon", "Maison des Cyprès",
        "Maison des Érables", "Maison du Lac"
    ],
    "Commerces": [
        "Boutique Luxe", "Galerie Royale", "Restaurant Gastronomique",
        "Café Moderne", "Marché du Centre", "Hall Solaris", "Boutique Nova"
    ],
    "Bureaux": [
        "Bureau Open Space", "Bureau Premium", "Tour Nova", "Centre Orion",
        "Pôle Horizon", "Atrium 7"
    ],
    "Entrepôts": [
        "Hangar Titan", "Stockage Orion", "Dépôt Alpha", "Entrepôt Nova",
        "Entrepôt Industriel"
    ],
    "Hôtels": [
        "Hôtel Royal", "Hôtel Solaris", "Hôtel Émeraude", "Hôtel Horizon",
        "Hôtel Panorama"
    ],
    "Restaurants": [
        "Le Gourmet Bleu", "La Table Royale", "Le Jardin d’Or",
        "Restaurant Nova", "Restaurant Prestige"
    ]
};

function quantiteAleatoire() {
    return Math.floor(Math.random() * (MAX_QUANTITE - MIN_QUANTITE)) + MIN_QUANTITE;
}

function initialiserStyles() {
    for (const categorie in STYLES_PAR_CATEGORIE) {
        const liste = STYLES_PAR_CATEGORIE[categorie];
        if (!immoState.styles[categorie]) {
            immoState.styles[categorie] = liste.slice(0, NOMBRE_STYLES);
        }
    }
}

function regenererQuantites() {
    for (const categorie in immoState.styles) {
        if (!immoState.quantites[categorie]) {
            immoState.quantites[categorie] = {};
        }
        immoState.styles[categorie].forEach(style => {
            immoState.quantites[categorie][style] = quantiteAleatoire();
        });
    }
    immoState.lastRefresh = Date.now();
    sauvegarderEtat();
}

function sauvegarderEtat() {
    localStorage.setItem("immoState", JSON.stringify(immoState));
}

function chargerEtat() {
    const data = localStorage.getItem("immoState");
    if (data) {
        const parsed = JSON.parse(data);
        immoState.styles = parsed.styles || {};
        immoState.quantites = parsed.quantites || {};
        immoState.lastRefresh = parsed.lastRefresh || 0;
    }
}

export function refreshSiNecessaire() {
    const maintenant = Date.now();
    if (maintenant - immoState.lastRefresh >= REFRESH_INTERVAL) {
        regenererQuantites();
    }
}

export function initImmoCore() {
    chargerEtat();
    initialiserStyles();
    refreshSiNecessaire();
}

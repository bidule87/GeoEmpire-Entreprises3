// =======================================
//  MODULE ENTREPRISES — VERSION ÉTENDUE
// =======================================

// 1 an de jeu = 1 mois réel
const DUREE_CESSION = 30 * 24 * 60 * 60 * 1000; // 30 jours en ms

const ENTREPRISE_PAR_DEFAUT = {
    nom: "Ma Première Entreprise",
    type: "Immobilier",

    // Photo modifiable
    logo: "images/default-logo.png",

    // Budget
    argent: 5000000,

    // Date de création (pour la cession)
    dateCreation: Date.now(),

    // Biens immobiliers
    biens: {}
};

// ===============================
//  CHARGEMENT / SAUVEGARDE
// ===============================

export function getEntreprise() {
    const data = localStorage.getItem("entreprise");
    if (data) return JSON.parse(data);

    localStorage.setItem("entreprise", JSON.stringify(ENTREPRISE_PAR_DEFAUT));
    return ENTREPRISE_PAR_DEFAUT;
}

export function sauvegarderEntreprise(entreprise) {
    localStorage.setItem("entreprise", JSON.stringify(entreprise));
}

// ===============================
//  MODIFICATION DU NOM
// ===============================

export function changerNomEntreprise(nouveauNom) {
    const entreprise = getEntreprise();
    entreprise.nom = nouveauNom;
    sauvegarderEntreprise(entreprise);
}

// ===============================
//  MODIFICATION DE LA PHOTO
// ===============================

export function changerPhotoEntreprise(base64) {
    const entreprise = getEntreprise();
    entreprise.logo = base64;
    sauvegarderEntreprise(entreprise);
}

// ===============================
//  AJOUT DE BIENS
// ===============================

export function ajouterBienEntreprise(categorie, style, quantite, prixUnitaire) {
    const entreprise = getEntreprise();
    const coutTotal = quantite * prixUnitaire;

    entreprise.argent -= coutTotal;

    if (!entreprise.biens[categorie]) {
        entreprise.biens[categorie] = {};
    }

    if (!entreprise.biens[categorie][style]) {
        entreprise.biens[categorie][style] = {
            quantite: 0,
            prixAchatMoyen: prixUnitaire
        };
    }

    const bien = entreprise.biens[categorie][style];
    const ancienneQuantite = bien.quantite;

    bien.quantite += quantite;

    bien.prixAchatMoyen = Math.floor(
        ((ancienneQuantite * bien.prixAchatMoyen) + (quantite * prixUnitaire)) /
        (ancienneQuantite + quantite)
    );

    sauvegarderEntreprise(entreprise);
}

// ===============================
//  RETRAIT DE BIENS
// ===============================

export function retirerBienEntreprise(categorie, style, quantite) {
    const entreprise = getEntreprise();

    if (!entreprise.biens[categorie] || !entreprise.biens[categorie][style]) return;

    const bien = entreprise.biens[categorie][style];
    bien.quantite -= quantite;

    if (bien.quantite <= 0) {
        delete entreprise.biens[categorie][style];
    }

    sauvegarderEntreprise(entreprise);
}

// ===============================
//  ARGENT
// ===============================

export function ajouterArgent(montant) {
    const entreprise = getEntreprise();
    entreprise.argent += montant;
    sauvegarderEntreprise(entreprise);
}

export function retirerArgent(montant) {
    const entreprise = getEntreprise();
    entreprise.argent = Math.max(0, entreprise.argent - montant);
    sauvegarderEntreprise(entreprise);
}

// ===============================
//  VALEUR TOTALE DE L’ENTREPRISE
// ===============================

export function calculerValeurEntreprise() {
    const entreprise = getEntreprise();
    let total = entreprise.argent;

    for (const categorie in entreprise.biens) {
        for (const style in entreprise.biens[categorie]) {
            const bien = entreprise.biens[categorie][style];
            total += bien.quantite * bien.prixAchatMoyen;
        }
    }

    return total;
}

// ===============================
//  CESSION / VENTE
// ===============================

export function peutCederEntreprise() {
    const entreprise = getEntreprise();
    const tempsPasse = Date.now() - entreprise.dateCreation;
    return tempsPasse >= DUREE_CESSION;
}

export function vendreEntreprise() {
    const entreprise = getEntreprise();
    const valeur = calculerValeurEntreprise();

    // Reset complet
    localStorage.removeItem("entreprise");

    // Nouvelle entreprise avec argent transféré
    const nouvelle = getEntreprise();
    nouvelle.argent = valeur;

    sauvegarderEntreprise(nouvelle);

    return valeur;
}

export function mettreEnCessation() {
    if (!peutCederEntreprise()) return false;

    localStorage.removeItem("entreprise");
    return true;
}

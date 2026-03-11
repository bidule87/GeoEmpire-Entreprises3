// =======================================
//  MODULE ENTREPRISES
// =======================================

const ENTREPRISE_PAR_DEFAUT = {
    nom: "Ma Première Entreprise",
    type: "Immobilier",
    logo: "images/default-logo.png",
    argent: 5000000,
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

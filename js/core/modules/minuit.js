// ======================================================
//  GEO EMPIRE — MODULE MINUIT (VERSION FINALE)
//  Exécution des ordres, loyers, primes, auto‑manager
// ======================================================

import { boutiqueState } from "./boutique.js";
import { patrimoineState, updatePatrimoine } from "./patrimoine.js";
import { empire } from "./empire.js"; 
// empire = { holding: {...}, filiales: {...}, biens: [...] }

// =====================
//  FONCTION PRINCIPALE
// =====================
export function executerMinuit() {

    console.log("=== MINUIT : Mise à jour journalière ===");

    // 1. Exécuter les ordres (vente / location)
    executerOrdres();

    // 2. Calculer les loyers
    calculerLoyers();

    // 3. Calculer les primes
    calculerPrimes();

    // 4. Mise à jour du patrimoine
    updatePatrimoine();

    // 5. Sauvegarde globale
    sauvegarderMinuit();

    console.log("=== MINUIT TERMINÉ ===");
}

// =====================
//  1. ORDRES DIFFÉRÉS
// =====================
function executerOrdres() {

    empire.biens.forEach(bien => {

        if (!bien.ordre) return;

        // Vente
        if (bien.ordre.type === "vente") {
            let prix = appliquerBonusVente(bien.valeur);
            ajouterCash(bien.proprietaire, prix);
            bien.estVendu = true;
        }

        // Location
        if (bien.ordre.type === "location") {
            bien.estLoue = true;
            bien.loyerActuel = appliquerBonusLocation(bien.loyerBase);
        }

        bien.ordre = null;
    });
}

// =====================
//  2. LOYERS
// =====================
function calculerLoyers() {

    empire.biens.forEach(bien => {
        if (bien.estLoue) {
            ajouterCash(bien.proprietaire, bien.loyerActuel);
        }
    });
}

// =====================
//  3. PRIMES (10%)
// =====================
function calculerPrimes() {

    let patrimoineBoosté = patrimoineState.patrimoineBoosté;

    let prime = patrimoineBoosté * 0.10;

    // Auto‑Manager → optimisation automatique
    if (boutiqueState.autoPrimes) {
        prime = optimiserPrime(prime);
    }

    // Débit entreprise → crédit joueur
    empire.holding.cash -= prime;
    patrimoineState.cashPersonnel += prime;
}

// =====================
//  BONUS PRESTIGE
// =====================
function appliquerBonusVente(prix) {
    if (boutiqueState.prestigeOwned) {
        return prix * 1.20; // +20%
    }
    return prix;
}

function appliquerBonusLocation(loyer) {
    if (boutiqueState.prestigeOwned) {
        return loyer * 1.15; // +15%
    }
    return loyer;
}

// =====================
//  AUTO‑MANAGER
// =====================
function optimiserPrime(prime) {
    return prime * 1.05; // +5% optimisation IA
}

// =====================
//  AJOUTER CASH
// =====================
function ajouterCash(entite, montant) {
    if (entite === "holding") {
        empire.holding.cash += montant;
    } else {
        empire.filiales[entite].cash += montant;
    }
}

// =====================
//  SAUVEGARDE
// =====================
function sauvegarderMinuit() {
    localStorage.setItem("geoEmpireMinuit", Date.now());
}

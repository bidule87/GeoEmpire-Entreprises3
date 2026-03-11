// ======================================================
//  GEO EMPIRE — MINUIT (VERSION FINALE)
//  Loyers réels, charges, impôts, primes, patrimoine
// ======================================================

import { getEntreprise, setEntreprise, entreprises } from "./entreprises.js";
import { joueurs } from "./finances_etape4.js";

// ======================================================
//  FONCTION PRINCIPALE
// ======================================================
export function executerMinuit() {

    console.log("=== MINUIT : Mise à jour journalière ===");

    // 1. Loyers réels des biens possédés
    appliquerLoyers();

    // 2. Charges + impôts des biens possédés
    appliquerChargesEtImpots();

    // 3. Primes PDG / DG / DC
    appliquerPrimesDirecteurs();

    // 4. Impôt sur le bénéfice (tous les dimanches)
    appliquerImpotsHebdomadaires();

    // 5. Mise à jour du patrimoine total
    mettreAJourPatrimoine();

    // 6. Sauvegarde
    setEntreprise(getEntreprise());

    console.log("=== MINUIT TERMINÉ ===");
}

// ======================================================
// 1. LOYERS RÉELS
// ======================================================
function appliquerLoyers() {
    const entreprise = getEntreprise();

    Object.values(entreprises).forEach(bien => {

        const revenuNet = (bien.loyer || 0) - (bien.charges || 0) - (bien.impots || 0);

        if (revenuNet > 0) {

            entreprise.patrimoine += revenuNet;

            // Historique
            entreprise.historique.push({
                date: Date.now(),
                type: "loyer",
                details: bien.nom,
                montant: revenuNet
            });
        }
    });

    setEntreprise(entreprise);
}

// ======================================================
// 2. CHARGES + IMPÔTS
// ======================================================
function appliquerChargesEtImpots() {
    const entreprise = getEntreprise();

    Object.values(entreprises).forEach(bien => {

        const charges = bien.charges || 0;
        const impots = bien.impots || 0;
        const total = charges + impots;

        if (total > 0) {

            entreprise.patrimoine -= total;

            // Historique
            entreprise.historique.push({
                date: Date.now(),
                type: "charge",
                details: bien.nom,
                montant: -total
            });
        }
    });

    setEntreprise(entreprise);
}

// ======================================================
// 3. PRIMES DIRECTEURS (PDG / DG / DC)
// ======================================================
function appliquerPrimesDirecteurs() {
    const entreprise = getEntreprise();
    const primes = entreprise.primes || { pdg: 0, dg: 0, dc: 0 };

    const primePDG = Number(primes.pdg) || 0;
    const primeDG  = Number(primes.dg)  || 0;
    const primeDC  = Number(primes.dc)  || 0;

    const total = primePDG + primeDG + primeDC;
    if (total <= 0) return;

    // Débiter l’entreprise
    entreprise.patrimoine -= total;

    // Créditer les comptes joueurs
    joueurs.pdg.tresorerie += primePDG;
    joueurs.dg.tresorerie  += primeDG;
    joueurs.dc.tresorerie  += primeDC;

    // Historique
    entreprise.historique.push({
        date: Date.now(),
        type: "prime",
        details: "Primes PDG / DG / DC",
        montant: -total
    });

    // Reset
    entreprise.primes = { pdg: 0, dg: 0, dc: 0 };

    setEntreprise(entreprise);
}

// ======================================================
// 4. IMPÔT SUR LE BÉNÉFICE (tous les dimanches minuit)
// ======================================================
function appliquerImpotsHebdomadaires() {
    const maintenant = new Date();
    const jour = maintenant.getDay(); // 0 = dimanche

    if (jour !== 0) return;

    const entreprise = getEntreprise();

    const benefice = entreprise.patrimoine;

    if (benefice <= 0) return;

    const impot = Math.floor(benefice * 0.20);

    entreprise.patrimoine -= impot;

    entreprise.historique.push({
        date: Date.now(),
        type: "impot",
        details: "Impôt hebdomadaire (20%)",
        montant: -impot
    });

    setEntreprise(entreprise);
}

// ======================================================
// 5. MISE À JOUR DU PATRIMOINE TOTAL
// ======================================================
function mettreAJourPatrimoine() {
    const entreprise = getEntreprise();

    let total = 0;

    Object.values(entreprises).forEach(bien => {
        total += bien.prixAchat || 0;
    });

    entreprise.patrimoine = total;

    setEntreprise(entreprise);
}

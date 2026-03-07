// =======================================
// GEO EMPIRE — IMMOBILIER (ÉTAPE 3 FINAL)
// Vente, location auto (1–12 jours réels),
// molette Prestige, attractivité, historique,
// fiche entreprise (nom, image, description,
// discord, postes).
// =======================================

import { entreprises } from "./entreprises.js";
import {
    getMalusEtat,
    calculPuissanceEconomique,
    calculSynergieLoyer,
    calculDiversificationBonus,
    calculMonopoleBonus,
    calculRevenuNet
} from "./immobilier.js";

// =====================
// OUTIL HISTORIQUE
// =====================
function ajouterHistorique(id, entree) {
    const b = entreprises[id];
    if (!b) return;
    if (!Array.isArray(b.historique)) b.historique = [];
    b.historique.push({
        date: Date.now(),
        ...entree
    });
}

// =====================
// FICHE ENTREPRISE
// =====================
export function changerNom(id, nom) {
    const b = entreprises[id];
    if (!b) return;
    b.nom = nom;
    ajouterHistorique(id, {
        type: "modification",
        details: `Changement de nom: ${nom}`
    });
}

export function changerImage(id, base64) {
    const b = entreprises[id];
    if (!b) return;
    b.image = base64;
    ajouterHistorique(id, {
        type: "modification",
        details: "Changement d'image de l'entreprise"
    });
}

export function changerDescription(id, texte) {
    const b = entreprises[id];
    if (!b) return;
    b.description = texte;
    ajouterHistorique(id, {
        type: "modification",
        details: "Description mise à jour"
    });
}

export function changerDiscord(id, url) {
    const b = entreprises[id];
    if (!b) return;
    b.discord = url;
    ajouterHistorique(id, {
        type: "modification",
        details: `Lien Discord mis à jour: ${url}`
    });
}

export function ajouterPoste(id, texte) {
    const b = entreprises[id];
    if (!b) return;
    if (!Array.isArray(b.postes)) b.postes = [];
    b.postes.push({
        texte,
        date: Date.now()
    });
    ajouterHistorique(id, {
        type: "poste",
        details: `Nouveau poste: ${texte}`
    });
}

export function supprimerPoste(id, index) {
    const b = entreprises[id];
    if (!b || !Array.isArray(b.postes)) return;
    const poste = b.postes[index];
    b.postes.splice(index, 1);
    ajouterHistorique(id, {
        type: "poste",
        details: `Suppression d'un poste: ${poste ? poste.texte : ""}`
    });
}

// =====================
// ATTRACTIVITÉ & DURÉE AUTO
// =====================
function calculAttractivite(bien, molette, prestigeOwned) {
    let score = 0;

    // Popularité (0–100)
    score += bien.popularite * 0.4; // poids fort

    // État
    if (bien.etat >= 90) score += 20;
    else if (bien.etat >= 70) score += 10;
    else if (bien.etat >= 40) score += 5;
    else score -= 50; // quasi impossible

    // Puissance économique
    const puissance = calculPuissanceEconomique().location;
    score += puissance * 100; // 0 → 10 pts max

    // Synergies
    const synergie = calculSynergieLoyer();
    score += synergie * 80; // 0 → 4 pts

    // Diversification
    const divers = calculDiversificationBonus();
    score += divers * 80; // 0 → 8 pts

    // Type de bien (exemple simple)
    switch (bien.type) {
        case "Résidentiel":
            score += 10;
            break;
        case "Luxe":
            score += 5;
            break;
        case "Industriel":
            score -= 5;
            break;
        default:
            break;
    }

    // Molette (Prestige)
    if (!prestigeOwned) molette = 0;
    if (molette > 0) score -= molette * 1.5; // plus cher → moins attractif
    if (molette < 0) score += Math.abs(molette) * 1.5; // moins cher → plus attractif

    return Math.max(0, Math.min(100, Math.floor(score)));
}

function calculDureeReelleDepuisAttractivite(attractivite) {
    // 1 jour réel = 1 mois jeu
    // max 12 jours réels = 12 mois jeu = 1 an
    if (attractivite >= 80) return 10 + Math.floor((attractivite - 80) / 5); // 10–12
    if (attractivite >= 50) return 6 + Math.floor((attractivite - 50) / 10); // 6–9
    if (attractivite >= 20) return 3 + Math.floor((attractivite - 20) / 15); // 3–5
    return 1 + Math.floor(attractivite / 20); // 1–2
}

// =====================
// PRIX DE VENTE FINAL
// =====================
export function calculPrixVenteFinal(bien, molette, prestigeOwned) {
    if (!prestigeOwned) molette = 0;

    const malus = getMalusEtat(bien).vente;
    const puissance = calculPuissanceEconomique().vente;
    const diversification = calculDiversificationBonus();
    const monopole = calculMonopoleBonus(bien.type);
    const popularite = bien.popularite / 200; // +0 → +0.5

    let prix = bien.prixVente;

    prix *= (1 + molette / 100);
    prix *= (1 + malus);
    prix *= (1 + puissance);
    prix *= (1 + diversification);
    prix *= (1 + monopole);
    prix *= (1 + popularite);

    return Math.max(0, Math.floor(prix));
}

// =====================
// TAUX D’ÉCOULEMENT (VENTE)
// =====================
export function calculTauxEcoulement(bien) {
    const malus = getMalusEtat(bien);
    const base = 0.60;

    let taux = base;

    taux += bien.popularite / 200;
    taux += calculPuissanceEconomique().vente;
    taux += calculDiversificationBonus();

    if (malus.vente === -0.25) taux -= 0.10;
    if (malus.vente === -0.50) taux -= 0.20;

    return Math.min(1, Math.max(0.10, taux));
}

// =====================
// VENTE
// =====================
export function vendreBiens(id, quantiteDemandee, molette, prestigeOwned, ajouterArgent) {
    const b = entreprises[id];
    if (!b) return { quantiteVendue: 0, total: 0 };

    const prixUnitaire = calculPrixVenteFinal(b, molette, prestigeOwned);
    const taux = calculTauxEcoulement(b);

    const quantiteVendue = Math.min(b.quantite, Math.floor(quantiteDemandee * taux));
    const total = prixUnitaire * quantiteVendue;

    if (total > 0) {
        ajouterArgent(total);
        b.quantite -= quantiteVendue;
    }

    ajouterHistorique(id, {
        type: "vente",
        quantite: quantiteVendue,
        prixUnitaire,
        prixTotal: total,
        molette,
        details: `Vente de ${quantiteVendue} biens avec molette ${molette}%`
    });

    return { quantiteVendue, total };
}

// =====================
// LOYER FINAL
// =====================
export function calculLoyerFinal(bien, molette, prestigeOwned) {
    if (!prestigeOwned) molette = 0;

    const malus = getMalusEtat(bien).location;
    const puissance = calculPuissanceEconomique().location;
    const synergie = calculSynergieLoyer();
    const popularite = bien.popularite / 150; // +0 → +0.66

    let loyer = bien.loyer;

    loyer *= (1 + molette / 100);
    loyer *= (1 + malus);
    loyer *= (1 + puissance);
    loyer *= (1 + synergie);
    loyer *= (1 + popularite);

    return Math.max(0, Math.floor(loyer));
}

// =====================
// LOCATION AUTOMATIQUE (1–12 JOURS RÉELS)
// =====================
export function louerBiensAuto(id, quantiteDemandee, molette, prestigeOwned, ajouterArgent) {
    const b = entreprises[id];
    if (!b) return {
        quantiteLouee: 0,
        total: 0,
        joursReels: 0,
        moisJeu: 0,
        attractivite: 0
    };

    const malus = getMalusEtat(b);
    if (!malus.locationPossible) {
        ajouterHistorique(id, {
            type: "location",
            quantite: 0,
            prixUnitaire: 0,
            prixTotal: 0,
            molette,
            details: "Location impossible (état trop faible)"
        });
        return {
            quantiteLouee: 0,
            total: 0,
            joursReels: 0,
            moisJeu: 0,
            attractivite: 0
        };
    }

    const attractivite = calculAttractivite(b, molette, prestigeOwned);
    const joursReels = calculDureeReelleDepuisAttractivite(attractivite);
    const moisJeu = joursReels; // 1 jour réel = 1 mois jeu

    const loyerFinal = calculLoyerFinal(b, molette, prestigeOwned);
    const revenuNetUnitaire = loyerFinal - b.charges - b.impots;

    const quantiteLouee = Math.min(b.quantite, quantiteDemandee);
    const total = revenuNetUnitaire * quantiteLouee * joursReels;

    if (total > 0) {
        ajouterArgent(total);
    }

    ajouterHistorique(id, {
        type: "location",
        quantite: quantiteLouee,
        prixUnitaire: loyerFinal,
        prixTotal: total,
        molette,
        dureeJoursReels: joursReels,
        dureeMoisJeu: moisJeu,
        attractivite,
        details: `Location auto de ${quantiteLouee} biens pour ${joursReels} jours réels (${moisJeu} mois jeu) avec molette ${molette}%`
    });

    return {
        quantiteLouee,
        total,
        joursReels,
        moisJeu,
        attractivite,
        loyerFinal,
        revenuNetUnitaire
    };
}

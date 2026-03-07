// =======================================
// GEO EMPIRE — ÉTAPE 4 (FINAL)
// Trésorerie, Bilan, Résultat,
// Prévision J+1, Export Excel-compatible.
// =======================================

import { entreprises } from "./entreprises.js";
import { calculRevenuNet } from "./immobilier.js";

// =====================
// OBJET JOUEUR / FINANCES
// =====================
export const joueur = {
    tresorerie: 0,
    primes: 0,
    gTokens: 0,
    prestigeOwned: false,

    tresorerieVue: {
        soldeActuel: 0,
        revenusDuMois: 0,
        soldeMoisProchain: 0,
        credits: {
            loyers: 0
        },
        debits: {
            primesDirecteurs: 0,
            chargesFoncieres: 0,
            impotFoncier: 0,
            impotPrimes: 0,
            assurances: 0,
            mensualitesPrets: 0,
            versementsEpargne: 0,
            dividendes: 0,
            fraisGestion: 0,
            agiosDecouvert: 0
        }
    },

    bilan: {
        actif: {
            immobilises: {
                immobilier: 0,
                travaux: 0,
                comptesEpargne: 0,
                totalImmobilises: 0
            },
            circulant: {
                loyers: 0,
                livretsI: 0,
                compteCourant: 0,
                interetAPayer: 0,
                totalCirculant: 0
            },
            totalActif: 0
        },
        passif: {
            capitauxPropres: {
                capital: 0,
                plusMoinsLatentesImmo: 0,
                plusMoinsLatentesStock: 0,
                beneficesPerteReportes: 0,
                totalCapitauxPropres: 0
            },
            dettes: {
                soldeRestantEmprunts: 0,
                mensualitesEmprunts: 0,
                detteExploitation: 0,
                autresDettes: 0,
                totalDettes: 0
            },
            totalPassif: 0
        }
    },

    resultat: {
        charges: {
            exploitation: 0,
            charges: 0,
            assurance: 0,
            financieres: 0,
            autres: 0,
            impotFoncier: 0,
            totalCharges: 0
        },
        produits: {
            exploitation: 0,
            financier: 0,
            autres: 0,
            totalProduits: 0
        },
        affectations: {
            produits: 0,
            charges: 0
        },
        resultatAvantImpots: 0,
        montantImposable: 0,
        resultatNet: 0,
        dividendesAvecTaxes: 0,
        beneficesOuPertes: 0
    }
};

// =====================
// TRÉSORERIE
// =====================
export function mettreAJourTresorerie() {
    const t = joueur.tresorerieVue;

    let loyers = 0;
    Object.values(entreprises).forEach(b => {
        const net = calculRevenuNet(b);
        if (net > 0) loyers += net;
    });
    t.credits.loyers = loyers;

    const d = t.debits;
    const totalDebits =
        d.primesDirecteurs +
        d.chargesFoncieres +
        d.impotFoncier +
        d.impotPrimes +
        d.assurances +
        d.mensualitesPrets +
        d.versementsEpargne +
        d.dividendes +
        d.fraisGestion +
        d.agiosDecouvert;

    const revenusDuMois = loyers - totalDebits;

    t.soldeActuel = joueur.tresorerie;
    t.revenusDuMois = revenusDuMois;
    t.soldeMoisProchain = t.soldeActuel + revenusDuMois;

    return t;
}

// =====================
// BILAN
// =====================
export function mettreAJourBilan() {
    const b = joueur.bilan;

    let immobilier = 0;
    let travaux = 0;

    Object.values(entreprises).forEach(e => {
        immobilier += e.prixAchat * e.quantite;
        travaux += e.travaux || 0;
    });

    b.actif.immobilises.immobilier = immobilier;
    b.actif.immobilises.travaux = travaux;
    b.actif.immobilises.comptesEpargne = 0;
    b.actif.immobilises.totalImmobilises =
        immobilier + travaux;

    b.actif.circulant.loyers = 0;
    b.actif.circulant.livretsI = 0;
    b.actif.circulant.compteCourant = joueur.tresorerie;
    b.actif.circulant.interetAPayer = 0;
    b.actif.circulant.totalCirculant =
        b.actif.circulant.compteCourant;

    b.actif.totalActif =
        b.actif.immobilises.totalImmobilises +
        b.actif.circulant.totalCirculant;

    const cp = b.passif.capitauxPropres;
    cp.capital = b.actif.totalActif;
    cp.plusMoinsLatentesImmo = 0;
    cp.plusMoinsLatentesStock = 0;
    cp.beneficesPerteReportes = joueur.resultat.resultatNet;
    cp.totalCapitauxPropres =
        cp.capital +
        cp.plusMoinsLatentesImmo +
        cp.plusMoinsLatentesStock +
        cp.beneficesPerteReportes;

    const dettes = b.passif.dettes;
    dettes.soldeRestantEmprunts = 0;
    dettes.mensualitesEmprunts = 0;
    dettes.detteExploitation = 0;
    dettes.autresDettes = 0;
    dettes.totalDettes = 0;

    b.passif.totalPassif = cp.totalCapitauxPropres;

    return b;
}

// =====================
// RÉSULTAT
// =====================
export function mettreAJourResultat() {
    const r = joueur.resultat;

    let totalCharges = 0;
    let totalProduits = 0;

    Object.values(entreprises).forEach(e => {
        const net = calculRevenuNet(e);
        if (net > 0) totalProduits += net;
        else totalCharges += Math.abs(net);
    });

    r.charges.exploitation = totalCharges;
    r.charges.totalCharges = totalCharges;

    r.produits.exploitation = totalProduits;
    r.produits.totalProduits = totalProduits;

    r.affectations.produits = totalProduits;
    r.affectations.charges = totalCharges;

    r.resultatAvantImpots = totalProduits - totalCharges;
    r.montantImposable = 0;
    r.resultatNet = r.resultatAvantImpots;
    r.dividendesAvecTaxes = 0;
    r.beneficesOuPertes = r.resultatNet;

    return r;
}

// =====================
// PRÉVISION J+1
// =====================
export function simulerComptesPrevisionnelsDemain() {
    const tresoDepart = joueur.tresorerie;

    let chargesJour = 0;
    let produitsJour = 0;

    Object.values(entreprises).forEach(e => {
        const net = calculRevenuNet(e);
        if (net > 0) produitsJour += net;
        else chargesJour += Math.abs(net);

        chargesJour += (e.charges || 0) + (e.impots || 0);
    });

    const tresoPrevue = tresoDepart + produitsJour - chargesJour;

    return {
        tresorerieActuelle: tresoDepart,
        produitsJour,
        chargesJour,
        tresoreriePrevueDemain: tresoPrevue
    };
}

// =====================
// EXPORT EXCEL (Prestige)
// =====================
export function genererDonneesExcel() {
    return {
        tresorerie: mettreAJourTresorerie(),
        bilan: mettreAJourBilan(),
        resultat: mettreAJourResultat(),
        prevision: simulerComptesPrevisionnelsDemain()
    };
}

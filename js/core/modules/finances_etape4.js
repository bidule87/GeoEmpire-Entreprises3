import { getData } from "../geoData.js";

/* ============================================================
   FONCTION INTERNE : calculRevenuNet
   (remplace totalement l'import de immobilier.js)
   ============================================================ */
function calculRevenuNet(bien) {
    return (bien.loyer || 0) - (bien.chargesSociales || 0) - (bien.impots || 0);
}

/* ============================================================
   ÉTAT DU JOUEUR
   ============================================================ */
export const joueur = {
    tresorerie: 0,

    tresorerieVue: {
        soldeActuel: 0,
        revenusDuMois: 0,
        soldeMoisProchain: 0,
        credits: { loyers: 0 },
        debits: {
            primesDirecteurs: 0,
            impotPrimes: 0,
            chargesFoncieres: 0,
            impotFoncier: 0,
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
                totalCirculant: 0
            },
            totalActif: 0
        },

        passif: {
            capitauxPropres: {
                capital: 0,
                beneficesPerteReportes: 0,
                totalCapitauxPropres: 0
            },
            dettes: {
                soldeRestantEmprunts: 0,
                totalDettes: 0
            },
            totalPassif: 0
        }
    },

    resultat: {
        charges: { exploitation: 0, totalCharges: 0 },
        produits: { exploitation: 0, totalProduits: 0 },
        resultatNet: 0,
        beneficesOuPertes: 0
    }
};

/* ============================================================
   TRÉSORERIE
   ============================================================ */
export function mettreAJourTresorerie() {
    const t = joueur.tresorerieVue;
    let loyers = 0;

    const data = getData();
    const biens = data.entreprise.biens;

    Object.values(biens).forEach(styles => {
        Object.values(styles).forEach(bien => {
            const net = calculRevenuNet(bien);
            if (net > 0) loyers += net;
        });
    });

    t.credits.loyers = loyers;
    t.debits.impotPrimes = t.debits.primesDirecteurs * 0.20;

    const totalDebits = Object.values(t.debits).reduce((a, b) => a + b, 0);

    t.soldeActuel = joueur.tresorerie;
    t.revenusDuMois = loyers - totalDebits;
    t.soldeMoisProchain = t.soldeActuel + t.revenusDuMois;

    return t;
}

/* ============================================================
   BILAN
   ============================================================ */
export function mettreAJourBilan() {
    const b = joueur.bilan;
    let immo = 0;

    const data = getData();
    const biens = data.entreprise.biens;

    Object.values(biens).forEach(styles => {
        Object.values(styles).forEach(bien => {
            immo += (bien.prixAchat * (bien.quantite || 1));
        });
    });

    b.actif.immobilises.immobilier = immo;
    b.actif.immobilises.totalImmobilises =
        immo +
        b.actif.immobilises.travaux +
        b.actif.immobilises.comptesEpargne;

    b.actif.circulant.compteCourant = joueur.tresorerie;

    b.actif.totalActif =
        b.actif.immobilises.totalImmobilises +
        b.actif.circulant.compteCourant;

    b.passif.capitauxPropres.capital = b.actif.totalActif;
    b.passif.totalPassif = b.actif.totalActif;

    return b;
}

/* ============================================================
   RÉSULTAT
   ============================================================ */
export function mettreAJourResultat() {
    const r = joueur.resultat;
    const t = mettreAJourTresorerie();

    r.produits.totalProduits = t.credits.loyers;
    r.charges.totalCharges = Object.values(t.debits).reduce((a, b) => a + b, 0);

    r.resultatNet = r.produits.totalProduits - r.charges.totalCharges;
    r.beneficesOuPertes = r.resultatNet;

    return r;
}

/* ============================================================
   PRÉVISIONNEL J+1
   ============================================================ */
export function simulerComptesPrevisionnelsDemain() {
    let produits = 0;
    let charges = 0;

    const data = getData();
    const biens = data.entreprise.biens;

    Object.values(biens).forEach(styles => {
        Object.values(styles).forEach(bien => {
            const net = calculRevenuNet(bien);
            if (net > 0) produits += net;
            else charges += Math.abs(net);
        });
    });

    return {
        tresorerieActuelle: joueur.tresorerie,
        produitsJour: produits,
        chargesJour: charges,
        tresoreriePrevueDemain: joueur.tresorerie + produits - charges
    };
}

/* ============================================================
   EXPORT EXCEL (CSV)
   ============================================================ */
export function genererDonneesExcel() {
    const lignes = [];

    lignes.push("Section;Libellé;Valeur");

    // Trésorerie
    lignes.push(`Trésorerie;Solde actuel;${joueur.tresorerieVue.soldeActuel}`);
    lignes.push(`Trésorerie;Revenus du mois;${joueur.tresorerieVue.revenusDuMois}`);
    lignes.push(`Trésorerie;Solde mois prochain;${joueur.tresorerieVue.soldeMoisProchain}`);
    lignes.push(`Trésorerie;Crédits loyers;${joueur.tresorerieVue.credits.loyers}`);

    Object.entries(joueur.tresorerieVue.debits).forEach(([cle, val]) => {
        lignes.push(`Trésorerie;Débit ${cle};${val}`);
    });

    // Bilan actif
    lignes.push(`Bilan actif;Immobilier;${joueur.bilan.actif.immobilises.immobilier}`);
    lignes.push(`Bilan actif;Travaux;${joueur.bilan.actif.immobilises.travaux}`);
    lignes.push(`Bilan actif;Comptes épargne;${joueur.bilan.actif.immobilises.comptesEpargne}`);
    lignes.push(`Bilan actif;Total immobilisés;${joueur.bilan.actif.immobilises.totalImmobilises}`);
    lignes.push(`Bilan actif;Compte courant;${joueur.bilan.actif.circulant.compteCourant}`);
    lignes.push(`Bilan actif;Total actif;${joueur.bilan.actif.totalActif}`);

    // Bilan passif
    lignes.push(`Bilan passif;Capital;${joueur.bilan.passif.capitauxPropres.capital}`);
    lignes.push(`Bilan passif;Bénéfices/pertes reportés;${joueur.bilan.passif.capitauxPropres.beneficesPerteReportes}`);
    lignes.push(`Bilan passif;Total capitaux propres;${joueur.bilan.passif.capitauxPropres.totalCapitauxPropres}`);
    lignes.push(`Bilan passif;Dettes emprunts;${joueur.bilan.passif.dettes.soldeRestantEmprunts}`);
    lignes.push(`Bilan passif;Total dettes;${joueur.bilan.passif.dettes.totalDettes}`);
    lignes.push(`Bilan passif;Total passif;${joueur.bilan.passif.totalPassif}`);

    // Résultat
    lignes.push(`Résultat;Produits d'exploitation;${joueur.resultat.produits.exploitation}`);
    lignes.push(`Résultat;Total produits;${joueur.resultat.produits.totalProduits}`);
    lignes.push(`Résultat;Charges d'exploitation;${joueur.resultat.charges.exploitation}`);
    lignes.push(`Résultat;Total charges;${joueur.resultat.charges.totalCharges}`);
    lignes.push(`Résultat;Résultat net;${joueur.resultat.resultatNet}`);
    lignes.push(`Résultat;Bénéfices ou pertes;${joueur.resultat.beneficesOuPertes}`);

    const csv = lignes.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "GeoEmpire_Finances.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

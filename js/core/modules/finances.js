import { getData } from "../geoData.js";

export function initFinances() {
    const zone = document.getElementById("finances");
    if (!zone) return;

    const data = getData();
    const biens = data.entreprise.biens;
    const joueur = data.joueur;

    /* ============================
       CALCULS
       ============================ */

    let loyers = 0;
    let chargesFoncieres = 0;
    let impotFoncier = 0;
    let primesDirecteurs = joueur.primesDirecteurs || 0;
    let impotPrimes = primesDirecteurs * 0.20;

    Object.values(biens).forEach(styles => {
        Object.values(styles).forEach(bien => {
            loyers += bien.loyer || 0;
            chargesFoncieres += bien.chargesFoncieres || 0;
            impotFoncier += bien.impotFoncier || 0;
        });
    });

    const totalDebits =
        primesDirecteurs +
        chargesFoncieres +
        impotFoncier +
        impotPrimes;

    const revenusDuMois = loyers - totalDebits;
    const soldeMoisProchain = joueur.tresorerie + revenusDuMois;

    /* ============================
       BILAN
       ============================ */

    let immobilier = 0;

    Object.values(biens).forEach(styles => {
        Object.values(styles).forEach(bien => {
            immobilier += (bien.prixAchat || 0);
        });
    });

    const totalImmobilises = immobilier;
    const totalCirculant = joueur.tresorerie;
    const totalActif = totalImmobilises + totalCirculant;

    const capitauxPropres = totalActif;
    const totalPassif = totalActif;

    /* ============================
       RENDU HTML
       ============================ */

    zone.innerHTML = `
        <div class="finances-premium-wrapper">
            <h2>Finances – Tableau Premium</h2>

            <table class="finances-table">

                <!-- TRÉSORERIE -->
                <tr><td colspan="2" class="finances-section-header">TRÉSORERIE</td></tr>
                <tr><td>Solde actuel</td><td>${joueur.tresorerie.toLocaleString()} Ø</td></tr>
                <tr><td>Crédits – Loyers</td><td>${loyers.toLocaleString()} Ø</td></tr>
                <tr><td>Débits – Primes des directeurs</td><td>${primesDirecteurs.toLocaleString()} Ø</td></tr>
                <tr><td>Débits – Impôt sur les primes</td><td>${impotPrimes.toLocaleString()} Ø</td></tr>
                <tr><td>Débits – Charges foncières</td><td>${chargesFoncieres.toLocaleString()} Ø</td></tr>
                <tr><td>Débits – Impôt foncier</td><td>${impotFoncier.toLocaleString()} Ø</td></tr>
                <tr><td>Total débits</td><td>${totalDebits.toLocaleString()} Ø</td></tr>
                <tr><td>Revenus du mois</td><td>${revenusDuMois.toLocaleString()} Ø</td></tr>
                <tr><td>Solde du mois prochain</td><td>${soldeMoisProchain.toLocaleString()} Ø</td></tr>

                <!-- RÉSULTAT -->
                <tr><td colspan="2" class="finances-section-header">RÉSULTAT</td></tr>
                <tr><td>Charges exploitation</td><td>${chargesFoncieres.toLocaleString()} Ø</td></tr>
                <tr><td>Charges – Impôt foncier</td><td>${impotFoncier.toLocaleString()} Ø</td></tr>
                <tr><td>Charges – Impôt sur primes</td><td>${impotPrimes.toLocaleString()} Ø</td></tr>
                <tr><td>Total charges</td><td>${totalDebits.toLocaleString()} Ø</td></tr>
                <tr><td>Total produits</td><td>${loyers.toLocaleString()} Ø</td></tr>
                <tr><td>Résultat net</td><td>${revenusDuMois.toLocaleString()} Ø</td></tr>

                <!-- BILAN -->
                <tr><td colspan="2" class="finances-section-header">BILAN</td></tr>
                <tr><td>Immobilisés – Immobilier</td><td>${immobilier.toLocaleString()} €</td></tr>
                <tr><td>Total immobilisés</td><td>${totalImmobilises.toLocaleString()} €</td></tr>
                <tr><td>Circulant – Compte courant</td><td>${joueur.tresorerie.toLocaleString()} €</td></tr>
                <tr><td>Total circulant</td><td>${totalCirculant.toLocaleString()} €</td></tr>
                <tr><td>Total actif</td><td>${totalActif.toLocaleString()} €</td></tr>
                <tr><td>Capitaux propres</td><td>${capitauxPropres.toLocaleString()} €</td></tr>
                <tr><td>Total passif</td><td>${totalPassif.toLocaleString()} €</td></tr>

            </table>
        </div>
    `;
}

window.initFinances = initFinances;

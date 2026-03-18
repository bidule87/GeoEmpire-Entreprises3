import { getData } from "../geoData.js";
import { joueur, mettreAJourTresorerie, mettreAJourBilan, mettreAJourResultat, simulerComptesPrevisionnelsDemain, genererDonneesExcel } from "./finances.js";

/* ============================================================
   INTERFACE PREMIUM
   ============================================================ */
export function initFinances() {
    const zone = document.getElementById("finances");
    if (!zone) return;

    // Mise à jour des données
    const t = mettreAJourTresorerie();
    const b = mettreAJourBilan();
    const r = mettreAJourResultat();
    const p = simulerComptesPrevisionnelsDemain();

    zone.innerHTML = `
        <div class="finances-premium">
            <h2>Finances – Tableau Premium</h2>

            <div class="finances-section-title">Trésorerie</div>
            <table class="finances-table">
                <tr><th>Libellé</th><th>Valeur</th></tr>
                <tr><td>Solde actuel</td><td>${t.soldeActuel.toLocaleString()} €</td></tr>
                <tr><td>Revenus du mois</td><td>${t.revenusDuMois.toLocaleString()} €</td></tr>
                <tr><td>Solde mois prochain</td><td>${t.soldeMoisProchain.toLocaleString()} €</td></tr>
                <tr><td>Loyers perçus</td><td>${t.credits.loyers.toLocaleString()} €</td></tr>
            </table>

            <div class="finances-section-title">Résultat</div>
            <table class="finances-table">
                <tr><th>Libellé</th><th>Valeur</th></tr>
                <tr><td>Total produits</td><td>${r.produits.totalProduits.toLocaleString()} €</td></tr>
                <tr><td>Total charges</td><td>${r.charges.totalCharges.toLocaleString()} €</td></tr>
                <tr class="finances-total"><td>Résultat net</td><td>${r.resultatNet.toLocaleString()} €</td></tr>
            </table>

            <div class="finances-section-title">Bilan</div>
            <table class="finances-table">
                <tr><th>Libellé</th><th>Valeur</th></tr>
                <tr><td>Immobilier</td><td>${b.actif.immobilises.immobilier.toLocaleString()} €</td></tr>
                <tr><td>Travaux</td><td>${b.actif.immobilises.travaux.toLocaleString()} €</td></tr>
                <tr><td>Comptes épargne</td><td>${b.actif.immobilises.comptesEpargne.toLocaleString()} €</td></tr>
                <tr class="finances-total"><td>Total immobilisés</td><td>${b.actif.immobilises.totalImmobilises.toLocaleString()} €</td></tr>
                <tr><td>Compte courant</td><td>${b.actif.circulant.compteCourant.toLocaleString()} €</td></tr>
                <tr class="finances-total"><td>Total actif</td><td>${b.actif.totalActif.toLocaleString()} €</td></tr>
            </table>

            <div class="finances-section-title">Prévisionnel J+1</div>
            <table class="finances-table">
                <tr><th>Libellé</th><th>Valeur</th></tr>
                <tr><td>Produits du jour</td><td>${p.produitsJour.toLocaleString()} €</td></tr>
                <tr><td>Charges du jour</td><td>${p.chargesJour.toLocaleString()} €</td></tr>
                <tr class="finances-total"><td>Trésorerie prévue demain</td><td>${p.tresoreriePrevueDemain.toLocaleString()} €</td></tr>
            </table>

            <button class="btn-export-premium" onclick="genererDonneesExcel()">Exporter (Excel / Sheets)</button>
        </div>
    `;
}

window.initFinances = initFinances;

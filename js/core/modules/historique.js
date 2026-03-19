// ============================================
// HISTORIQUE — MODULE ENTREPRISES
// ============================================

import { getData } from "../geoData.js";

window.initHistorique = function () {
    const zone = document.getElementById("historique-contenu");
    if (!zone) return;

    const data = getData();

    const ventes = data.entreprise.ventesEnAttente || [];
    const locations = data.entreprise.locationsEnAttente || [];
    const finances = data.entreprise.finances || {};

    zone.innerHTML = `
        <div class="historique-panel">

            <h2 class="historique-title">Historique des opérations</h2>

            <div class="historique-section">
                <h3>Ventes en attente</h3>
                ${ventes.length === 0 ? `
                    <p>Aucune vente en attente.</p>
                ` : `
                    <div class="historique-liste">
                        ${ventes.map(v => `
                            <div class="historique-item">
                                <div><strong>${v.categorie}</strong> — ${v.style}</div>
                                <div>Quantité : ${v.quantite}</div>
                                <div>Ajustement : ${v.ajustement > 0 ? "+" : ""}${v.ajustement}%</div>
                                <div>Prix moyen : ${Math.floor(v.prixAchatMoyen).toLocaleString("fr-FR")} €</div>
                                <div>Date : ${new Date(v.dateDemande).toLocaleString("fr-FR")}</div>
                            </div>
                        `).join("")}
                    </div>
                `}
            </div>

            <div class="historique-section">
                <h3>Locations en attente</h3>
                ${locations.length === 0 ? `
                    <p>Aucune location en attente.</p>
                ` : `
                    <div class="historique-liste">
                        ${locations.map(l => `
                            <div class="historique-item">
                                <div><strong>${l.categorie}</strong> — ${l.style}</div>
                                <div>Quantité : ${l.quantite}</div>
                                <div>Ajustement : ${l.ajustement > 0 ? "+" : ""}${l.ajustement}%</div>
                                <div>Prix moyen : ${Math.floor(l.prixAchatMoyen).toLocaleString("fr-FR")} €</div>
                                <div>Date : ${new Date(l.dateDemande).toLocaleString("fr-FR")}</div>
                            </div>
                        `).join("")}
                    </div>
                `}
            </div>

            <div class="historique-section">
                <h3>Finances</h3>
                <div class="historique-finances">
                    <div>Dépenses marketing : ${finances.depensesMarketing?.toLocaleString("fr-FR") || 0} €</div>
                    <div>Revenus ventes : ${finances.revenusVentes?.toLocaleString("fr-FR") || 0} €</div>
                    <div>Revenus locations : ${finances.revenusLocations?.toLocaleString("fr-FR") || 0} €</div>
                    <div>Primes : ${finances.primes?.toLocaleString("fr-FR") || 0} €</div>
                </div>
            </div>

        </div>
    `;
};

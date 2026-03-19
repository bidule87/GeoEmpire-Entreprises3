import { getData } from "../geoData.js";

export function initHistoriqueEntreprises() {
    const zone = document.getElementById("historique");
    const data = getData();

    if (!zone) return;

    const hist = data.entreprise.historique || [];

    zone.innerHTML = `
        <div class="premium-panel">
            <h2 class="premium-title">Historique — Entreprises</h2>

            <div class="premium-box historique-box">
                ${hist.length === 0 ? `
                    <p>Aucune action enregistrée pour le moment.</p>
                ` : `
                    <table class="historique-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Rôle</th>
                                <th>Action</th>
                                <th>Catégorie</th>
                                <th>Style</th>
                                <th>Qté</th>
                                <th>Ajust.</th>
                                <th>Montant</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${hist.slice().reverse().map(entry => `
                                <tr>
                                    <td>${new Date(entry.date).toLocaleString("fr-FR")}</td>
                                    <td>${entry.role || "-"}</td>
                                    <td>${entry.action}</td>
                                    <td>${entry.categorie}</td>
                                    <td>${entry.style}</td>
                                    <td>${entry.quantite}</td>
                                    <td>${entry.ajustement > 0 ? "+" : ""}${entry.ajustement}%</td>
                                    <td>${entry.montant ? entry.montant.toLocaleString("fr-FR") + " €" : "-"}</td>
                                </tr>
                            `).join("")}
                        </tbody>
                    </table>
                `}
            </div>
        </div>
    `;
}

window.initHistoriqueEntreprises = initHistoriqueEntreprises;

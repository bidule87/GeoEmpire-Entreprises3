// =======================================
// GEO EMPIRE — MODULE ASSURANCE
// Liste des biens non assurés + action Assurer
// =======================================

import { getEntreprise } from "./entreprises.js";

// =======================================
// INITIALISATION DU MODULE
// =======================================
window.initAssurance = function () {

    const container = document.getElementById("assurance");
    container.innerHTML = ""; // reset propre

    // ------------------------------
    // TITRE
    // ------------------------------
    const titre = document.createElement("h2");
    titre.textContent = "Assurance des biens";
    container.appendChild(titre);

    // ------------------------------
    // TABLEAU
    // ------------------------------
    const table = document.createElement("table");
    table.className = "biens-table";

    table.innerHTML = `
        <thead>
            <tr>
                <th>Bien</th>
                <th>Catégorie</th>
                <th>État</th>
                <th>Prix d'achat</th>
                <th>Assurance</th>
                <th>Action</th>
            </tr>
        </thead>
        <tbody id="assurance-tbody"></tbody>
    `;

    container.appendChild(table);

    const status = document.createElement("div");
    status.id = "assurance-status";
    status.className = "status";
    container.appendChild(status);

    const tbody = table.querySelector("#assurance-tbody");

    // ------------------------------
    // RÉCUPÉRATION DES BIENS NON ASSURÉS
    // ------------------------------
    const entreprise = getEntreprise();
    const biens = (entreprise.biens || []).filter(b => !b.assure);

    if (biens.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align:center; padding:20px; color:#94a3b8;">
                    Tous vos biens sont déjà assurés.
                </td>
            </tr>
        `;
        return;
    }

    // ------------------------------
    // AFFICHAGE DES BIENS NON ASSURÉS
    // ------------------------------
    biens.forEach(bien => {

        const prixAssurance = Math.round(bien.prixAchat * 0.05); // 5% du prix d'achat

        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${bien.nom}</td>
            <td>${bien.categorie}</td>
            <td>${bien.etat}%</td>
            <td>${bien.prixAchat.toLocaleString("fr-FR")} €</td>
            <td>${prixAssurance.toLocaleString("fr-FR")} €</td>
            <td>
                <button class="action-btn btn-acheter">Assurer</button>
            </td>
        `;

        // ------------------------------
        // ACTION : ASSURER
        // ------------------------------
        tr.querySelector(".btn-acheter").addEventListener("click", () => {
            bien.assure = true;
            showStatus(`Bien assuré : ${bien.nom}`);
            tr.remove();
        });

        tbody.appendChild(tr);
    });

    // ------------------------------
    // STATUS
    // ------------------------------
    function showStatus(msg) {
        status.textContent = msg;
        status.style.display = "block";
        setTimeout(() => status.style.display = "none", 2000);
    }
};

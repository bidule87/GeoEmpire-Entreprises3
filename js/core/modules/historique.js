import { getEntreprise } from "./entreprises.js";

document.addEventListener("DOMContentLoaded", () => {

    const tbody = document.getElementById("historique-tbody");

    function render() {
        const e = getEntreprise();
        const hist = e.historique || [];

        tbody.innerHTML = "";

        hist.slice().reverse().forEach(entry => {

            const date = new Date(entry.date).toLocaleString("fr-FR");

            const tr = document.createElement("tr");

            tr.innerHTML = `
                <td>${date}</td>
                <td>${entry.type}</td>
                <td>${entry.details || ""}</td>
                <td>${entry.montant ? entry.montant.toLocaleString("fr-FR") + " €" : ""}</td>
            `;

            tbody.appendChild(tr);
        });
    }

    render();
});

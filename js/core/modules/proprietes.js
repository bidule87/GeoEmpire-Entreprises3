import { getEntreprise } from "./entreprises.js";

export function initProprietes() {
    afficherProprietes();
}

function afficherProprietes() {
    const entreprise = getEntreprise();
    const container = document.getElementById("proprietes"); // ✔ corrigé
    container.innerHTML = "";

    for (const categorie in entreprise.biens) {
        const bloc = document.createElement("div");
        bloc.className = "categorie-bloc";
        bloc.innerHTML = `<h2>${categorie}</h2>`;

        for (const style in entreprise.biens[categorie]) {
            const bien = entreprise.biens[categorie][style];

            const bonus = bien.renovation ? bien.renovation.bonusValeur : 0;
            const valeurTotale = Math.floor(
                bien.prixAchatMoyen * bien.quantite * (1 + bonus)
            );

            const item = document.createElement("div");
            item.className = "bien-item";

            item.innerHTML = `
                <div class="bien-nom">${style}</div>

                <div class="bien-infos">
                    <div>Quantité : ${bien.quantite}</div>
                    <div>Prix moyen : ${bien.prixAchatMoyen.toLocaleString()} €</div>
                    <div>Valeur totale : ${valeurTotale.toLocaleString()} €</div>
                </div>

                <div class="bien-assurance">
                    ${afficherAssurance(bien)}
                </div>

                <div class="bien-renovation">
                    ${afficherRenovation(bien)}
                </div>

                <div class="bien-actions">
                    <button onclick="location.href='assurance.html'">Assurer</button>
                    <button onclick="location.href='renovation.html'">Rénover</button>
                </div>
            `;

            bloc.appendChild(item);
        }

        container.appendChild(bloc);
    }
}

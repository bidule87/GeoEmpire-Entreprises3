// ============================================
// MARKETING — MODULE PREMIUM BLEU
// ============================================

import { getData, saveData } from "../geoData.js";

// Conversion dynamique PRIX → %
// Basée sur : investissement initial, capital, bénéfice, bonus, autres joueurs
function calculerImpactMarketing(client, prixInvesti, data) {

    // Sécurité
    if (!client) return 0;

    const investissementInitial = client.investissementInitial || 0;
    const capitalEntreprise = data.entreprise.capital || 0;
    const beneficeJournalier = data.entreprise.beneficeJournalier || 0;
    const bonusInvisible = client.bonus || 0;

    // Impact des autres joueurs
    const totalInvestissements = data.entreprise.marketing.totalInvestissements || 0;
    const partJoueur = prixInvesti / Math.max(totalInvestissements, prixInvesti);

    // Conversion dynamique
    let pourcentage = 0;

    // 1. Base : prix → % (faible)
    pourcentage += prixInvesti / 10000; // 10 000 € = +1%

    // 2. Impact du capital (joueur moyen)
    pourcentage += (capitalEntreprise / 1_000_000) * 0.5;

    // 3. Impact du bénéfice (gros joueur)
    pourcentage += (beneficeJournalier / 100_000) * 0.5;

    // 4. Impact du bonus invisible
    pourcentage += bonusInvisible / 100;

    // 5. Impact des autres joueurs (équilibré)
    pourcentage *= partJoueur;

    // 6. Limite stricte : jamais plus de +30%
    const satisfactionActuelle = client.satisfaction || 0;
    const maxPossible = 30 - satisfactionActuelle;

    return Math.min(pourcentage, maxPossible);
}

window.initMarketing = function () {
    const zone = document.getElementById("marketing-contenu");
    if (!zone) return;

    const data = getData();
    const clients = data.entreprise.marketing.clients || {};

    zone.innerHTML = "";

    Object.entries(clients).forEach(([nom, client]) => {

        const bloc = document.createElement("div");
        bloc.className = "marketing-item";

        // Détection automatique de la classe couleur
        let couleurClass = "";
        const c = (client.couleur || "").toLowerCase();

        if (c.includes("ff4d4d")) couleurClass = "marketing-red";
        else if (c.includes("8c42") || c.includes("a64d")) couleurClass = "marketing-orange";
        else if (c.includes("d93d") || c.includes("e44d")) couleurClass = "marketing-yellow";
        else if (c.includes("4caf50") || c.includes("4dff88")) couleurClass = "marketing-green";
        else if (c.includes("2196f3") || c.includes("4da6ff")) couleurClass = "marketing-blue";
        else if (c.includes("9c27b0") || c.includes("b84dff")) couleurClass = "marketing-purple";

        bloc.classList.add(couleurClass);

        const categories = Array.isArray(client.categorie)
            ? client.categorie.join(", ")
            : client.categorie || "Non définie";

        bloc.innerHTML = `
            <div class="marketing-nom" style="color:${client.couleur}">
                ${nom}
            </div>

            <div class="marketing-categorie">
                Catégorie : <strong>${categories}</strong>
            </div>

            <div class="marketing-satisfaction">
                Satisfaction : <strong>${client.satisfaction}%</strong>
            </div>

            <div class="satisfaction-bar">
                <div class="satisfaction-fill" style="width:${client.satisfaction}%;"></div>
            </div>

            <div class="marketing-actions">
                <input type="number" class="marketing-input" placeholder="Montant (€)" value="0">
                <button class="marketing-btn">Investir</button>
            </div>
        `;

        const btn = bloc.querySelector(".marketing-btn");
        const input = bloc.querySelector(".marketing-input");

        btn.addEventListener("click", () => {
            const prix = parseInt(input.value);
            if (isNaN(prix) || prix <= 0) return;

            // Calcul dynamique
            const impact = calculerImpactMarketing(client, prix, data);

            // Mise à jour satisfaction
            client.satisfaction = Math.min(30, (client.satisfaction || 0) + impact);

            // Mise à jour bonus invisible
            client.bonus = (client.bonus || 0) + impact / 2;

            // Mise à jour total investissements
            data.entreprise.marketing.totalInvestissements =
                (data.entreprise.marketing.totalInvestissements || 0) + prix;

            // Envoi au tableau de finances
            data.entreprise.finances.depensesMarketing =
                (data.entreprise.finances.depensesMarketing || 0) + prix;

            saveData();
            initMarketing();
        });

        zone.appendChild(bloc);
    });
};

// ============================================
// MARKETING — MODULE PREMIUM BLEU
// ============================================

import { getData, modifierSatisfaction } from "../geoData.js";

// ⭐ Fonction interne (non attachée à window)
function initMarketing() {
    const zone = document.getElementById("marketing-contenu");
    const clients = getData().entreprise.marketing.clients;

    if (!zone) return;

    zone.innerHTML = "";

    Object.entries(clients).forEach(([nom, client]) => {
        const bloc = document.createElement("div");
        bloc.className = "marketing-item";

        // Détection automatique de la classe couleur
        let couleurClass = "";
        const c = client.couleur.toLowerCase();

        if (c.includes("ff4d4d")) couleurClass = "marketing-red";
        else if (c.includes("8c42") || c.includes("a64d")) couleurClass = "marketing-orange";
        else if (c.includes("d93d") || c.includes("e44d")) couleurClass = "marketing-yellow";
        else if (c.includes("4caf50") || c.includes("4dff88")) couleurClass = "marketing-green";
        else if (c.includes("2196f3") || c.includes("4da6ff")) couleurClass = "marketing-blue";
        else if (c.includes("9c27b0") || c.includes("b84dff")) couleurClass = "marketing-purple";

        bloc.classList.add(couleurClass);

        bloc.innerHTML = `
            <div class="marketing-nom" style="color:${client.couleur}">
                ${nom}
            </div>

            <div class="marketing-categorie">
                Catégorie : <strong>${Array.isArray(client.categorie) ? client.categorie.join(", ") : client.categorie}</strong>
            </div>

            <div class="marketing-satisfaction">
                Satisfaction : <strong>${client.satisfaction}%</strong>
            </div>

            <div class="satisfaction-bar">
                <div class="satisfaction-fill" style="width:${client.satisfaction}%;"></div>
            </div>

            <div class="marketing-actions">
                <input type="number" class="marketing-input" placeholder="+ / - %" value="0">
                <button class="marketing-btn">Appliquer</button>
            </div>
        `;

        const btn = bloc.querySelector(".marketing-btn");
        const input = bloc.querySelector(".marketing-input");

        btn.addEventListener("click", () => {
            const valeur = parseInt(input.value);
            if (isNaN(valeur)) return;

            modifierSatisfaction(nom, valeur);
            initMarketing(); // refresh visuel
        });

        zone.appendChild(bloc);
    });
}

// ⭐ REND LA FONCTION ACCESSIBLE AU SYSTÈME D’ONGLETS
window.initMarketing = initMarketing;

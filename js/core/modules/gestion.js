// ======================================================
//  GEO EMPIRE — MODULE GESTION (VENTE / LOCATION)
//  Compatible geoData.js + marketing.js
// ======================================================

import { 
    getData, 
    saveData, 
    removeBien 
} from "../geoData.js";

// ======================================================
//  INITIALISATION DE L'AFFICHAGE
// ======================================================
export function initGestion() {
    const zone = document.getElementById("gestion");
    const data = getData();
    const biens = data.entreprise.biens;

    zone.innerHTML = `
        <h2>Gestion — Vente / Location</h2>

        <div class="gestion-container">
            ${Object.entries(biens).map(([categorie, styles]) => `
                <div class="gestion-categorie">
                    <h3>${categorie}</h3>

                    ${Object.entries(styles).map(([style, bien]) => `
                        <div class="gestion-item">

                            <div class="gestion-nom">${style}</div>

                            <div class="gestion-infos">
                                <div>Quantité : ${bien.quantite}</div>
                                <div>Prix moyen : ${bien.prixAchatMoyen.toLocaleString()} €</div>
                            </div>

                            <div class="gestion-actions">

                                <label>Quantité :</label>
                                <input type="number" 
                                       class="input-quantite" 
                                       data-cat="${categorie}" 
                                       data-style="${style}" 
                                       min="1" 
                                       max="${bien.quantite}" 
                                       value="1">

                                <button class="btn-tous" 
                                        data-cat="${categorie}" 
                                        data-style="${style}" 
                                        data-max="${bien.quantite}">
                                    Tous
                                </button>

                                <label>Prix :</label>
                                <input type="range" 
                                       class="slider-prix" 
                                       data-cat="${categorie}" 
                                       data-style="${style}"
                                       min="-30" 
                                       max="30" 
                                       value="0">

                                <span class="prix-affiche" 
                                      id="prix-${categorie}-${style}">
                                      0%
                                </span>

                                <button class="btn-vendre" 
                                        data-cat="${categorie}" 
                                        data-style="${style}">
                                    Vendre
                                </button>

                            </div>

                        </div>
                    `).join("")}

                </div>
            `).join("")}
        </div>
    `;

    // ===============================
    //  BOUTON "TOUS"
    // ===============================
    document.querySelectorAll(".btn-tous").forEach(btn => {
        btn.onclick = () => {
            const cat = btn.dataset.cat;
            const style = btn.dataset.style;
            const max = Number(btn.dataset.max);

            const input = document.querySelector(
                `.input-quantite[data-cat="${cat}"][data-style="${style}"]`
            );

            input.value = max;
        };
    });

    // ===============================
    //  SLIDER PRIX
    // ===============================
    document.querySelectorAll(".slider-prix").forEach(slider => {
        slider.oninput = () => {
            const cat = slider.dataset.cat;
            const style = slider.dataset.style;

            const val = Number(slider.value);

            document.getElementById(`prix-${cat}-${style}`).textContent =
                (val > 0 ? "+" : "") + val + "%";
        };
    });

    // ===============================
    //  VENTE
    // ===============================
    document.querySelectorAll(".btn-vendre").forEach(btn => {
        btn.onclick = () => {
            const cat = btn.dataset.cat;
            const style = btn.dataset.style;

            const input = document.querySelector(
                `.input-quantite[data-cat="${cat}"][data-style="${style}"]`
            );

            const slider = document.querySelector(
                `.slider-prix[data-cat="${cat}"][data-style="${style}"]`
            );

            const quantite = Number(input.value);
            const ajustement = Number(slider.value);

            const data = getData();
            const bien = data.entreprise.biens[cat][style];

            if (!bien || quantite <= 0 || quantite > bien.quantite) return;

            // Prix final invisible pour le joueur
            const prixBase = bien.prixAchatMoyen;
            const prixFinal = Math.floor(prixBase * (1 + ajustement / 100));

            // Créditer l'entreprise
            data.entreprise.argent += prixFinal * quantite;

            // Retirer les biens
            removeBien(cat, style, quantite);

            saveData();
            initGestion();
        };
    });
}

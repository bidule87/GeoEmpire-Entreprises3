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
//  HELPERS
// ======================================================
function hasPrestigePack(data) {
    // Hook futur : pack prestige / espace SAPHIR
    // Tu pourras brancher ici ton vrai flag (ex: data.joueur.prestigeSaphir)
    return data.entreprise && data.entreprise.prestigePack === true;
}

function calculerPrixFinal(prixBase, ajustement) {
    return Math.floor(prixBase * (1 + ajustement / 100));
}

// ======================================================
//  INITIALISATION DE L'AFFICHAGE
// ======================================================
export function initGestion() {
    const zone = document.getElementById("gestion");
    const data = getData();
    const biens = data.entreprise.biens;

    zone.innerHTML = `
        <h2>Gestion — Location / Vente</h2>

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

                                <label>Ajustement :</label>
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

                                <div class="gestion-boutons-double">
                                    <button class="btn-louer"
                                            data-cat="${categorie}"
                                            data-style="${style}">
                                        Louer
                                    </button>

                                    <button class="btn-vendre"
                                            data-cat="${categorie}"
                                            data-style="${style}">
                                        Vendre
                                    </button>
                                </div>

                            </div>

                        </div>
                    `).join("")}

                </div>
            `).join("")}
        </div>

        <div class="gestion-info-prestige">
            ⭐ Dites adieu aux commissions : avec le Pack Prestige / espace SAPHIR,
            vos assistants sont 100% gratuits.
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
    //  SLIDER PRIX (-30% / +30%)
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
    //  LOUER (même interface, logique différée possible)
    // ===============================
    document.querySelectorAll(".btn-louer").forEach(btn => {
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

            // Hook futur : location traitée à minuit
            if (!data.entreprise.locationsEnAttente) {
                data.entreprise.locationsEnAttente = [];
            }

            data.entreprise.locationsEnAttente.push({
                categorie: cat,
                style,
                quantite,
                ajustement,
                dateDemande: Date.now()
            });

            saveData();
            initGestion();
        };
    });

    // ===============================
    //  VENTE (même interface, avec hook commission / prestige)
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

            const prixBase = bien.prixAchatMoyen;
            const prixFinal = calculerPrixFinal(prixBase, ajustement);

            const commissionTaux = hasPrestigePack(data) ? 0 : 0.02;
            const montantBrut = prixFinal * quantite;
            const montantNet = Math.floor(montantBrut * (1 - commissionTaux));

            data.entreprise.argent += montantNet;

            removeBien(cat, style, quantite);

            saveData();
            initGestion();
        };
    });
}
